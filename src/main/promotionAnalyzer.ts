/**
 * Promotion Evidence Analyzer
 * Analyzes survey data to extract promotion-relevant evidence
 */

import { getDatabase } from './database';
import {
  ACFEvidence,
  ACF_TEACHING_CRITERIA,
  ACF_ENGAGEMENT_CRITERIA,
  calculateEvidenceStrength,
  determineACFLevel,
  extractACFKeywords,
  generateEvidenceStatement,
  formatCommentEvidence
} from './acfFramework';
import log from 'electron-log';

export interface PromotionAnalysisFilters {
  unitCodes?: string[];
  startYear?: number;
  endYear?: number;
  minSatisfaction?: number;
  includeComments?: boolean;
  includeBenchmarks?: boolean;
  includeTrends?: boolean;
}

export interface UnitPromotionData {
  unitCode: string;
  unitName: string;
  surveys: SurveyData[];
  averageSatisfaction: number;
  averageResponseRate: number;
  trend: number;
  benchmarkComparison: BenchmarkComparison;
  positiveComments: CommentEvidence[];
  suggestedLevel: 'A' | 'B' | 'C' | 'D' | 'E';
  evidence: ACFEvidence[];
}

interface SurveyData {
  year: number;
  semester: string;
  satisfaction: number;
  responseRate: number;
  responses: number;
  enrolments: number;
}

interface BenchmarkComparison {
  facultyAverage: number;
  universityAverage: number;
  exceedsFaculty: boolean;
  exceedsUniversity: boolean;
  facultyDifference: number;
  universityDifference: number;
}

interface CommentEvidence {
  comment: string;
  sentiment: number;
  keywords: string[];
  year: number;
  semester: string;
}

/**
 * Analyze units for promotion evidence
 */
export async function analyzeUnitsForPromotion(
  filters: PromotionAnalysisFilters = {}
): Promise<UnitPromotionData[]> {
  const db = getDatabase();
  const results: UnitPromotionData[] = [];
  
  try {
    // Build the base query
    let query = `
      SELECT DISTINCT
        u.unit_code,
        u.unit_name,
        us.survey_id,
        uo.year,
        uo.semester,
        us.overall_experience as satisfaction,
        us.response_rate,
        us.responses,
        us.enrolments
      FROM unit u
      JOIN unit_offering uo ON u.unit_code = uo.unit_code
      JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (filters.unitCodes?.length) {
      query += ` AND u.unit_code IN (${filters.unitCodes.map(() => '?').join(',')})`;
      params.push(...filters.unitCodes);
    }
    
    if (filters.startYear) {
      query += ` AND uo.year >= ?`;
      params.push(filters.startYear);
    }
    
    if (filters.endYear) {
      query += ` AND uo.year <= ?`;
      params.push(filters.endYear);
    }
    
    if (filters.minSatisfaction) {
      query += ` AND us.overall_experience >= ?`;
      params.push(filters.minSatisfaction);
    }
    
    query += ` ORDER BY u.unit_code, uo.year DESC, uo.semester DESC`;
    
    const surveyData = db.prepare(query).all(...params) as any[];
    
    // Group by unit
    const unitGroups = new Map<string, any[]>();
    for (const row of surveyData) {
      if (!unitGroups.has(row.unit_code)) {
        unitGroups.set(row.unit_code, []);
      }
      unitGroups.get(row.unit_code)!.push(row);
    }
    
    // Analyze each unit
    for (const [unitCode, surveys] of unitGroups) {
      const unitData = await analyzeUnit(
        unitCode,
        surveys[0].unit_name,
        surveys,
        filters
      );
      results.push(unitData);
    }
    
    // Sort by suggested level (E to A) and satisfaction
    results.sort((a, b) => {
      const levelOrder = { 'E': 5, 'D': 4, 'C': 3, 'B': 2, 'A': 1 };
      const levelDiff = levelOrder[b.suggestedLevel] - levelOrder[a.suggestedLevel];
      if (levelDiff !== 0) return levelDiff;
      return b.averageSatisfaction - a.averageSatisfaction;
    });
    
  } catch (error) {
    log.error('Error analyzing units for promotion:', error);
    throw error;
  }
  
  return results;
}

/**
 * Analyze individual unit for promotion evidence
 */
async function analyzeUnit(
  unitCode: string,
  unitName: string,
  surveys: any[],
  filters: PromotionAnalysisFilters
): Promise<UnitPromotionData> {
  const db = getDatabase();
  
  // Calculate averages
  const avgSatisfaction = surveys.reduce((sum, s) => sum + s.satisfaction, 0) / surveys.length;
  const avgResponseRate = surveys.reduce((sum, s) => sum + s.response_rate, 0) / surveys.length;
  
  // Calculate trend (if multiple years)
  let trend = 0;
  if (surveys.length >= 2) {
    const recent = surveys[0].satisfaction;
    const older = surveys[surveys.length - 1].satisfaction;
    trend = recent - older;
  }
  
  // Get benchmarks
  const benchmarks = await getBenchmarkComparison(unitCode, avgSatisfaction);
  
  // Get positive comments if requested
  let positiveComments: CommentEvidence[] = [];
  if (filters.includeComments) {
    positiveComments = await getPositiveComments(unitCode, filters);
  }
  
  // Determine suggested ACF level
  const suggestedLevel = determineACFLevel(
    avgSatisfaction,
    avgResponseRate,
    benchmarks.exceedsFaculty,
    trend
  );
  
  // Generate evidence
  const evidence = generateEvidence(
    unitCode,
    avgSatisfaction,
    avgResponseRate,
    trend,
    benchmarks,
    positiveComments
  );
  
  return {
    unitCode,
    unitName,
    surveys: surveys.map(s => ({
      year: s.year,
      semester: s.semester,
      satisfaction: s.satisfaction,
      responseRate: s.response_rate,
      responses: s.responses,
      enrolments: s.enrolments
    })),
    averageSatisfaction: Math.round(avgSatisfaction * 10) / 10,
    averageResponseRate: Math.round(avgResponseRate * 10) / 10,
    trend: Math.round(trend * 10) / 10,
    benchmarkComparison: benchmarks,
    positiveComments,
    suggestedLevel,
    evidence
  };
}

/**
 * Get benchmark comparisons for a unit
 */
async function getBenchmarkComparison(
  unitCode: string,
  unitSatisfaction: number
): Promise<BenchmarkComparison> {
  const db = getDatabase();
  
  try {
    // Get faculty average
    const facultyQuery = `
      SELECT AVG(us.overall_experience) as avg_satisfaction
      FROM unit_survey us
      JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
      JOIN unit u ON uo.unit_code = u.unit_code
      WHERE u.discipline_code = (
        SELECT discipline_code FROM unit WHERE unit_code = ?
      )
    `;
    const facultyResult = db.prepare(facultyQuery).get(unitCode) as any;
    const facultyAverage = facultyResult?.avg_satisfaction || 0;
    
    // Get university average
    const universityQuery = `
      SELECT AVG(overall_experience) as avg_satisfaction
      FROM unit_survey
    `;
    const universityResult = db.prepare(universityQuery).get() as any;
    const universityAverage = universityResult?.avg_satisfaction || 0;
    
    return {
      facultyAverage: Math.round(facultyAverage * 10) / 10,
      universityAverage: Math.round(universityAverage * 10) / 10,
      exceedsFaculty: unitSatisfaction > facultyAverage,
      exceedsUniversity: unitSatisfaction > universityAverage,
      facultyDifference: Math.round((unitSatisfaction - facultyAverage) * 10) / 10,
      universityDifference: Math.round((unitSatisfaction - universityAverage) * 10) / 10
    };
  } catch (error) {
    log.error('Error getting benchmark comparison:', error);
    return {
      facultyAverage: 0,
      universityAverage: 0,
      exceedsFaculty: false,
      exceedsUniversity: false,
      facultyDifference: 0,
      universityDifference: 0
    };
  }
}

/**
 * Get positive comments for evidence
 */
async function getPositiveComments(
  unitCode: string,
  filters: PromotionAnalysisFilters
): Promise<CommentEvidence[]> {
  const db = getDatabase();
  
  try {
    let query = `
      SELECT 
        c.comment_text,
        c.sentiment_score,
        uo.year,
        uo.semester
      FROM comment c
      JOIN unit_survey us ON c.survey_id = us.survey_id
      JOIN unit_offering uo ON us.unit_offering_id = uo.unit_offering_id
      WHERE uo.unit_code = ?
        AND c.sentiment_score > 0.3
    `;
    
    const params: any[] = [unitCode];
    
    if (filters.startYear) {
      query += ` AND uo.year >= ?`;
      params.push(filters.startYear);
    }
    
    if (filters.endYear) {
      query += ` AND uo.year <= ?`;
      params.push(filters.endYear);
    }
    
    query += ` ORDER BY c.sentiment_score DESC LIMIT 10`;
    
    const comments = db.prepare(query).all(...params) as any[];
    
    return comments.map(c => ({
      comment: c.comment_text,
      sentiment: c.sentiment_score,
      keywords: extractACFKeywords(c.comment_text),
      year: c.year,
      semester: c.semester
    }));
  } catch (error) {
    log.error('Error getting positive comments:', error);
    return [];
  }
}

/**
 * Generate ACF evidence from analyzed data
 */
function generateEvidence(
  unitCode: string,
  avgSatisfaction: number,
  avgResponseRate: number,
  trend: number,
  benchmarks: BenchmarkComparison,
  comments: CommentEvidence[]
): ACFEvidence[] {
  const evidence: ACFEvidence[] = [];
  
  // Student satisfaction evidence
  evidence.push({
    category: 'teaching',
    criterion: ACF_TEACHING_CRITERIA.studentSatisfaction.name,
    evidence: generateEvidenceStatement('student satisfaction', avgSatisfaction, 
      benchmarks.exceedsFaculty ? { type: 'faculty', difference: benchmarks.facultyDifference } : undefined),
    metric: avgSatisfaction,
    source: 'survey',
    strength: calculateEvidenceStrength(avgSatisfaction, 'satisfaction')
  });
  
  // Engagement evidence
  evidence.push({
    category: 'teaching',
    criterion: ACF_TEACHING_CRITERIA.engagement.name,
    evidence: `Maintained ${avgResponseRate}% response rate, indicating strong student engagement`,
    metric: avgResponseRate,
    source: 'survey',
    strength: calculateEvidenceStrength(avgResponseRate, 'response_rate')
  });
  
  // Trend evidence (if positive)
  if (trend > 0) {
    evidence.push({
      category: 'teaching',
      criterion: 'Continuous improvement',
      evidence: `Demonstrated ${trend}% improvement in student satisfaction over the period`,
      metric: trend,
      source: 'trend',
      strength: calculateEvidenceStrength(trend, 'trend')
    });
  }
  
  // Benchmark evidence
  if (benchmarks.exceedsUniversity) {
    evidence.push({
      category: 'teaching',
      criterion: 'Excellence relative to peers',
      evidence: `Exceeded university average by ${benchmarks.universityDifference}%, demonstrating sector-leading performance`,
      metric: benchmarks.universityDifference,
      source: 'benchmark',
      strength: 'strong'
    });
  }
  
  // Comment evidence (top 3 most relevant)
  const relevantComments = comments
    .filter(c => c.keywords.length > 0)
    .slice(0, 3);
  
  for (const comment of relevantComments) {
    const criterion = comment.keywords.includes('innovative') 
      ? ACF_TEACHING_CRITERIA.innovation.name
      : comment.keywords.includes('supportive')
      ? ACF_TEACHING_CRITERIA.engagement.name
      : ACF_TEACHING_CRITERIA.studentSatisfaction.name;
    
    evidence.push({
      category: 'teaching',
      criterion,
      evidence: formatCommentEvidence(comment.comment, comment.sentiment),
      source: 'comment',
      strength: comment.sentiment > 0.7 ? 'strong' : 'moderate'
    });
  }
  
  return evidence;
}

/**
 * Get high-performing units for quick selection
 */
export async function getHighPerformingUnits(
  minSatisfaction: number = 80
): Promise<{ unitCode: string; unitName: string; satisfaction: number }[]> {
  const db = getDatabase();
  
  try {
    const query = `
      SELECT 
        u.unit_code,
        u.unit_name,
        AVG(us.overall_experience) as avg_satisfaction
      FROM unit u
      JOIN unit_offering uo ON u.unit_code = uo.unit_code
      JOIN unit_survey us ON uo.unit_offering_id = us.unit_offering_id
      GROUP BY u.unit_code, u.unit_name
      HAVING AVG(us.overall_experience) >= ?
      ORDER BY avg_satisfaction DESC
    `;
    
    const results = db.prepare(query).all(minSatisfaction) as any[];
    
    return results.map(r => ({
      unitCode: r.unit_code,
      unitName: r.unit_name,
      satisfaction: Math.round(r.avg_satisfaction * 10) / 10
    }));
  } catch (error) {
    log.error('Error getting high performing units:', error);
    return [];
  }
}