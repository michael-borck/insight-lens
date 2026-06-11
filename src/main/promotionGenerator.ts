/**
 * Promotion Report Generator
 * Generates formatted promotion evidence reports
 */

import { UnitPromotionData } from './promotionAnalyzer';
import { ACF_LEVELS, ACFEvidence } from './acfFramework';
import log from 'electron-log';

export interface PromotionReport {
  generatedDate: string;
  unitCode: string;
  unitName: string;
  suggestedLevel: string;
  levelDescription: string;
  executiveSummary: string;
  teachingEvidence: EvidenceSection;
  engagementEvidence: EvidenceSection;
  quantitativeMetrics: MetricsSection;
  qualitativeEvidence: QualitativeSection;
  recommendations: string[];
}

interface EvidenceSection {
  title: string;
  summary: string;
  evidence: FormattedEvidence[];
}

interface FormattedEvidence {
  criterion: string;
  statement: string;
  strength: 'strong' | 'moderate' | 'developing';
  supportingData?: string;
}

interface MetricsSection {
  averageSatisfaction: number;
  averageResponseRate: number;
  trend: string;
  benchmarkPerformance: string;
  surveysAnalyzed: number;
  timespan: string;
}

interface QualitativeSection {
  positiveComments: string[];
  themesIdentified: string[];
}

/**
 * Generate a complete promotion report for a unit
 */
export function generatePromotionReport(unitData: UnitPromotionData): PromotionReport {
  const level = ACF_LEVELS.find(l => l.level === unitData.suggestedLevel);
  
  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(unitData);
  
  // Organize evidence by category
  const teachingEvidence = organizeTeachingEvidence(unitData.evidence);
  const engagementEvidence = organizeEngagementEvidence(unitData.evidence);
  
  // Prepare quantitative metrics
  const metrics = prepareMetrics(unitData);
  
  // Prepare qualitative evidence
  const qualitative = prepareQualitative(unitData);
  
  // Generate recommendations
  const recommendations = generateRecommendations(unitData);
  
  return {
    generatedDate: new Date().toISOString(),
    unitCode: unitData.unitCode,
    unitName: unitData.unitName,
    suggestedLevel: level?.title || 'Level ' + unitData.suggestedLevel,
    levelDescription: level?.description || '',
    executiveSummary,
    teachingEvidence,
    engagementEvidence,
    quantitativeMetrics: metrics,
    qualitativeEvidence: qualitative,
    recommendations
  };
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(unitData: UnitPromotionData): string {
  const level = ACF_LEVELS.find(l => l.level === unitData.suggestedLevel);
  let summary = `Based on comprehensive analysis of survey data, ${unitData.unitCode} - ${unitData.unitName} `;
  
  if (unitData.averageSatisfaction >= 85) {
    summary += `demonstrates exceptional teaching performance with ${unitData.averageSatisfaction}% student satisfaction, `;
  } else if (unitData.averageSatisfaction >= 75) {
    summary += `shows strong teaching performance with ${unitData.averageSatisfaction}% student satisfaction, `;
  } else {
    summary += `maintains ${unitData.averageSatisfaction}% student satisfaction, `;
  }
  
  if (unitData.benchmarkComparison.exceedsUniversity) {
    summary += `exceeding university benchmarks by ${unitData.benchmarkComparison.universityDifference}%. `;
  } else if (unitData.benchmarkComparison.exceedsFaculty) {
    summary += `exceeding faculty benchmarks by ${unitData.benchmarkComparison.facultyDifference}%. `;
  }
  
  if (unitData.trend > 0) {
    summary += `The unit shows continuous improvement with a ${unitData.trend}% positive trend. `;
  }
  
  summary += `This performance aligns with ACF ${level?.level} (${level?.title}), `;
  summary += `indicating ${level?.level === 'E' || level?.level === 'D' ? 'readiness for promotion to senior academic positions.' : 
              level?.level === 'C' ? 'solid progress toward senior academic roles.' :
              'developing academic excellence with clear growth trajectory.'}`;
  
  return summary;
}

/**
 * Organize teaching evidence
 */
function organizeTeachingEvidence(evidence: ACFEvidence[]): EvidenceSection {
  const teachingEvidence = evidence.filter(e => e.category === 'teaching');
  
  const formattedEvidence: FormattedEvidence[] = teachingEvidence.map(e => ({
    criterion: e.criterion,
    statement: e.evidence,
    strength: e.strength,
    supportingData: e.metric ? `(${e.metric}%)` : undefined
  }));
  
  const summary = teachingEvidence.some(e => e.strength === 'strong')
    ? 'Strong evidence of teaching excellence across multiple criteria'
    : 'Solid teaching performance with opportunities for continued growth';
  
  return {
    title: 'Teaching Excellence',
    summary,
    evidence: formattedEvidence
  };
}

/**
 * Organize engagement evidence
 */
function organizeEngagementEvidence(evidence: ACFEvidence[]): EvidenceSection {
  const engagementEvidence = evidence.filter(e => e.category === 'engagement');
  
  // Add inferred engagement evidence based on comments
  const formattedEvidence: FormattedEvidence[] = engagementEvidence.map(e => ({
    criterion: e.criterion,
    statement: e.evidence,
    strength: e.strength
  }));
  
  // If no direct engagement evidence, infer from other data
  if (formattedEvidence.length === 0) {
    formattedEvidence.push({
      criterion: 'Student Engagement',
      statement: 'Evidence of student engagement through survey participation and feedback quality',
      strength: 'moderate'
    });
  }
  
  return {
    title: 'Engagement & Collaboration',
    summary: 'Demonstrated commitment to student engagement and academic community',
    evidence: formattedEvidence
  };
}

/**
 * Prepare quantitative metrics
 */
function prepareMetrics(unitData: UnitPromotionData): MetricsSection {
  const years = [...new Set(unitData.surveys.map(s => s.year))];
  const timespan = years.length > 1 
    ? `${Math.min(...years)} - ${Math.max(...years)}`
    : years[0].toString();
  
  let trendDescription = 'Stable performance';
  if (unitData.trend > 5) {
    trendDescription = `Strong positive trend (+${unitData.trend}%)`;
  } else if (unitData.trend > 0) {
    trendDescription = `Positive trend (+${unitData.trend}%)`;
  } else if (unitData.trend < -5) {
    trendDescription = `Declining trend (${unitData.trend}%)`;
  }
  
  let benchmarkDescription = 'Meeting standards';
  if (unitData.benchmarkComparison.exceedsUniversity) {
    benchmarkDescription = `Exceeds university average by ${unitData.benchmarkComparison.universityDifference}%`;
  } else if (unitData.benchmarkComparison.exceedsFaculty) {
    benchmarkDescription = `Exceeds faculty average by ${unitData.benchmarkComparison.facultyDifference}%`;
  }
  
  return {
    averageSatisfaction: unitData.averageSatisfaction,
    averageResponseRate: unitData.averageResponseRate,
    trend: trendDescription,
    benchmarkPerformance: benchmarkDescription,
    surveysAnalyzed: unitData.surveys.length,
    timespan
  };
}

/**
 * Prepare qualitative evidence
 */
function prepareQualitative(unitData: UnitPromotionData): QualitativeSection {
  // Extract top positive comments
  const positiveComments = unitData.positiveComments
    .slice(0, 5)
    .map(c => c.comment.length > 150 
      ? c.comment.substring(0, 150) + '...' 
      : c.comment);
  
  // Identify themes from keywords
  const allKeywords = unitData.positiveComments.flatMap(c => c.keywords);
  const themeCounts = new Map<string, number>();
  
  for (const keyword of allKeywords) {
    themeCounts.set(keyword, (themeCounts.get(keyword) || 0) + 1);
  }
  
  const themes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme);
  
  return {
    positiveComments,
    themesIdentified: themes
  };
}

/**
 * Generate recommendations for promotion application
 */
function generateRecommendations(unitData: UnitPromotionData): string[] {
  const recommendations: string[] = [];
  const level = unitData.suggestedLevel;
  
  // Strong points to highlight
  if (unitData.averageSatisfaction >= 85) {
    recommendations.push('Highlight exceptional student satisfaction scores as primary evidence of teaching excellence');
  }
  
  if (unitData.benchmarkComparison.exceedsUniversity) {
    recommendations.push('Emphasize performance above university benchmarks as evidence of sector-leading teaching');
  }
  
  if (unitData.trend > 5) {
    recommendations.push('Document continuous improvement trend as evidence of commitment to teaching enhancement');
  }
  
  if (unitData.positiveComments.some(c => c.keywords.includes('innovative'))) {
    recommendations.push('Include student feedback on innovative teaching methods as evidence of pedagogical leadership');
  }
  
  // Areas to address
  if (level === 'A' || level === 'B') {
    recommendations.push('Consider pursuing formal teaching qualifications to strengthen promotion case');
  }
  
  if (unitData.averageResponseRate < 30) {
    recommendations.push('Work on improving survey response rates to strengthen evidence base');
  }
  
  if (!unitData.benchmarkComparison.exceedsFaculty) {
    recommendations.push('Focus on strategies to exceed faculty benchmarks in upcoming semesters');
  }
  
  // Level-specific recommendations
  switch (level) {
    case 'C':
      recommendations.push('Position for promotion to Level D by demonstrating leadership in teaching innovation');
      break;
    case 'D':
      recommendations.push('Strengthen case for Level E by documenting national/international teaching recognition');
      break;
    case 'E':
      recommendations.push('Maintain excellence and consider applying for teaching awards or fellowships');
      break;
  }
  
  return recommendations;
}

/**
 * Generate overall summary report for multiple units
 */
export interface OverallSummaryReport {
  generatedDate: string;
  totalUnits: number;
  levelDistribution: Record<string, number>;
  topPerformers: UnitSummary[];
  risingStars: UnitSummary[];
  keyStrengths: string[];
  commonThemes: string[];
  overallMetrics: {
    averageSatisfaction: number;
    averageResponseRate: number;
    unitsExceedingBenchmarks: number;
    unitsWithPositiveTrend: number;
  };
  recommendations: string[];
}

interface UnitSummary {
  unitCode: string;
  unitName: string;
  satisfaction: number;
  level: string;
  keyStrength: string;
}

export function generateOverallSummaryReport(unitsData: UnitPromotionData[]): OverallSummaryReport {
  // Calculate level distribution
  const levelDistribution: Record<string, number> = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0 };
  unitsData.forEach(unit => {
    levelDistribution[unit.suggestedLevel] = (levelDistribution[unit.suggestedLevel] || 0) + 1;
  });
  
  // Identify top performers (Level D and E)
  const topPerformers = unitsData
    .filter(u => u.suggestedLevel === 'D' || u.suggestedLevel === 'E')
    .sort((a, b) => b.averageSatisfaction - a.averageSatisfaction)
    .slice(0, 5)
    .map(u => ({
      unitCode: u.unitCode,
      unitName: u.unitName,
      satisfaction: u.averageSatisfaction,
      level: u.suggestedLevel,
      keyStrength: u.benchmarkComparison.exceedsUniversity 
        ? 'Exceeds university benchmarks' 
        : u.benchmarkComparison.exceedsFaculty 
        ? 'Exceeds faculty benchmarks'
        : 'Strong student satisfaction'
    }));
  
  // Identify rising stars (positive trend > 5%)
  const risingStars = unitsData
    .filter(u => u.trend > 5)
    .sort((a, b) => b.trend - a.trend)
    .slice(0, 5)
    .map(u => ({
      unitCode: u.unitCode,
      unitName: u.unitName,
      satisfaction: u.averageSatisfaction,
      level: u.suggestedLevel,
      keyStrength: `+${u.trend}% improvement trend`
    }));
  
  // Extract common themes from all comments
  const allKeywords = unitsData
    .flatMap(u => u.positiveComments)
    .flatMap(c => c.keywords);
  
  const themeCounts = new Map<string, number>();
  allKeywords.forEach(keyword => {
    themeCounts.set(keyword, (themeCounts.get(keyword) || 0) + 1);
  });
  
  const commonThemes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([theme]) => theme);
  
  // Calculate overall metrics
  const totalSatisfaction = unitsData.reduce((sum, u) => sum + u.averageSatisfaction, 0);
  const totalResponseRate = unitsData.reduce((sum, u) => sum + u.averageResponseRate, 0);
  const unitsExceedingBenchmarks = unitsData.filter(u => 
    u.benchmarkComparison.exceedsFaculty || u.benchmarkComparison.exceedsUniversity
  ).length;
  const unitsWithPositiveTrend = unitsData.filter(u => u.trend > 0).length;
  
  // Identify key strengths across all units
  const keyStrengths: string[] = [];
  
  if (unitsExceedingBenchmarks > unitsData.length * 0.5) {
    keyStrengths.push(`${Math.round(unitsExceedingBenchmarks / unitsData.length * 100)}% of units exceed benchmarks`);
  }
  
  if (totalSatisfaction / unitsData.length > 80) {
    keyStrengths.push(`Overall satisfaction average of ${Math.round(totalSatisfaction / unitsData.length)}%`);
  }
  
  if (unitsWithPositiveTrend > unitsData.length * 0.6) {
    keyStrengths.push(`${Math.round(unitsWithPositiveTrend / unitsData.length * 100)}% show positive trends`);
  }
  
  if (levelDistribution['D'] + levelDistribution['E'] > 0) {
    keyStrengths.push(`${levelDistribution['D'] + levelDistribution['E']} units ready for senior positions`);
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (levelDistribution['E'] > 0) {
    recommendations.push(`${levelDistribution['E']} units demonstrate exceptional performance suitable for Professor level`);
  }
  
  if (levelDistribution['D'] > 0) {
    recommendations.push(`${levelDistribution['D']} units meet Associate Professor benchmarks`);
  }
  
  if (risingStars.length > 0) {
    recommendations.push(`Focus development support on ${risingStars.length} rising units showing strong improvement`);
  }
  
  if (levelDistribution['A'] + levelDistribution['B'] > unitsData.length * 0.3) {
    recommendations.push('Consider targeted professional development for early-career academics');
  }
  
  recommendations.push('Use individual unit reports for detailed promotion evidence');
  
  return {
    generatedDate: new Date().toISOString(),
    totalUnits: unitsData.length,
    levelDistribution,
    topPerformers,
    risingStars,
    keyStrengths,
    commonThemes,
    overallMetrics: {
      averageSatisfaction: Math.round(totalSatisfaction / unitsData.length * 10) / 10,
      averageResponseRate: Math.round(totalResponseRate / unitsData.length * 10) / 10,
      unitsExceedingBenchmarks,
      unitsWithPositiveTrend
    },
    recommendations
  };
}
