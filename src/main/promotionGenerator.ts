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
 * Format report as HTML for export
 */
export function formatReportAsHTML(report: PromotionReport): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Promotion Evidence Report - ${report.unitCode}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    h3 { color: #7f8c8d; }
    .metric { background: #ecf0f1; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .strong { color: #27ae60; font-weight: bold; }
    .moderate { color: #f39c12; font-weight: bold; }
    .developing { color: #e74c3c; font-weight: bold; }
    .summary { background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .recommendation { background: #fff3cd; padding: 10px; margin: 5px 0; border-left: 4px solid #ffc107; }
    .comment { font-style: italic; color: #555; margin: 10px 0; padding: 10px; background: #f8f9fa; }
  </style>
</head>
<body>
  <h1>Promotion Evidence Report</h1>
  <p><strong>Unit:</strong> ${report.unitCode} - ${report.unitName}</p>
  <p><strong>Generated:</strong> ${new Date(report.generatedDate).toLocaleDateString()}</p>
  <p><strong>Suggested Level:</strong> ${report.suggestedLevel}</p>
  
  <div class="summary">
    <h2>Executive Summary</h2>
    <p>${report.executiveSummary}</p>
  </div>
  
  <h2>Quantitative Metrics</h2>
  <div class="metric">
    <p><strong>Average Student Satisfaction:</strong> ${report.quantitativeMetrics.averageSatisfaction}%</p>
    <p><strong>Average Response Rate:</strong> ${report.quantitativeMetrics.averageResponseRate}%</p>
    <p><strong>Performance Trend:</strong> ${report.quantitativeMetrics.trend}</p>
    <p><strong>Benchmark Comparison:</strong> ${report.quantitativeMetrics.benchmarkPerformance}</p>
    <p><strong>Analysis Period:</strong> ${report.quantitativeMetrics.timespan} (${report.quantitativeMetrics.surveysAnalyzed} surveys)</p>
  </div>
  
  <h2>${report.teachingEvidence.title}</h2>
  <p>${report.teachingEvidence.summary}</p>
  ${report.teachingEvidence.evidence.map(e => `
    <div class="metric">
      <p><strong>${e.criterion}</strong> <span class="${e.strength}">[${e.strength}]</span></p>
      <p>${e.statement} ${e.supportingData || ''}</p>
    </div>
  `).join('')}
  
  <h2>Student Feedback Themes</h2>
  <p><strong>Key themes identified:</strong> ${report.qualitativeEvidence.themesIdentified.join(', ')}</p>
  
  <h3>Representative Positive Comments:</h3>
  ${report.qualitativeEvidence.positiveComments.map(c => `
    <div class="comment">"${c}"</div>
  `).join('')}
  
  <h2>Recommendations for Promotion Application</h2>
  ${report.recommendations.map(r => `
    <div class="recommendation">${r}</div>
  `).join('')}
</body>
</html>
  `;
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

/**
 * Format overall summary as HTML
 */
export function formatSummaryAsHTML(summary: OverallSummaryReport): string {
  const levelColors: Record<string, string> = {
    'E': '#8b5cf6',
    'D': '#3b82f6', 
    'C': '#10b981',
    'B': '#eab308',
    'A': '#6b7280'
  };
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Promotion Summary Report - ${new Date(summary.generatedDate).toLocaleDateString()}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; }
    .stat-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
    .stat-label { color: #7f8c8d; margin-top: 5px; }
    .level-distribution { display: flex; gap: 10px; margin: 20px 0; }
    .level-bar { flex: 1; text-align: center; padding: 10px; border-radius: 5px; color: white; }
    .unit-card { background: white; border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .unit-header { display: flex; justify-content: space-between; align-items: center; }
    .level-badge { padding: 2px 8px; border-radius: 3px; color: white; font-weight: bold; }
    .theme-tag { display: inline-block; background: #e3f2fd; color: #1976d2; padding: 5px 10px; margin: 5px; border-radius: 15px; font-size: 14px; }
    .strength { background: #d4edda; padding: 10px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #28a745; }
    .recommendation { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
    @media print { body { max-width: 100%; } }
  </style>
</head>
<body>
  <h1>Promotion Evidence Summary Report</h1>
  <p><strong>Generated:</strong> ${new Date(summary.generatedDate).toLocaleDateString()}</p>
  <p><strong>Total Units Analyzed:</strong> ${summary.totalUnits}</p>
  
  <h2>Overall Metrics</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${summary.overallMetrics.averageSatisfaction}%</div>
      <div class="stat-label">Average Satisfaction</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${summary.overallMetrics.averageResponseRate}%</div>
      <div class="stat-label">Average Response Rate</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${summary.overallMetrics.unitsExceedingBenchmarks}</div>
      <div class="stat-label">Units Exceeding Benchmarks</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${summary.overallMetrics.unitsWithPositiveTrend}</div>
      <div class="stat-label">Units with Positive Trend</div>
    </div>
  </div>
  
  <h2>ACF Level Distribution</h2>
  <div class="level-distribution">
    ${Object.entries(summary.levelDistribution).map(([level, count]) => `
      <div class="level-bar" style="background: ${levelColors[level]}">
        <div style="font-size: 20px; font-weight: bold;">${count}</div>
        <div>Level ${level}</div>
      </div>
    `).join('')}
  </div>
  
  <h2>Top Performers</h2>
  ${summary.topPerformers.map(unit => `
    <div class="unit-card">
      <div class="unit-header">
        <div>
          <strong>${unit.unitCode}</strong> - ${unit.unitName}
          <span class="level-badge" style="background: ${levelColors[unit.level]}">Level ${unit.level}</span>
        </div>
        <div>${unit.satisfaction}% satisfaction</div>
      </div>
      <div style="color: #28a745; margin-top: 5px;">✓ ${unit.keyStrength}</div>
    </div>
  `).join('')}
  
  ${summary.risingStars.length > 0 ? `
  <h2>Rising Stars (Strong Improvement Trends)</h2>
  ${summary.risingStars.map(unit => `
    <div class="unit-card">
      <div class="unit-header">
        <div>
          <strong>${unit.unitCode}</strong> - ${unit.unitName}
          <span class="level-badge" style="background: ${levelColors[unit.level]}">Level ${unit.level}</span>
        </div>
        <div>${unit.satisfaction}% satisfaction</div>
      </div>
      <div style="color: #28a745; margin-top: 5px;">📈 ${unit.keyStrength}</div>
    </div>
  `).join('')}
  ` : ''}
  
  <h2>Key Strengths Across All Units</h2>
  ${summary.keyStrengths.map(strength => `
    <div class="strength">${strength}</div>
  `).join('')}
  
  <h2>Common Themes in Student Feedback</h2>
  <div>
    ${summary.commonThemes.map(theme => `
      <span class="theme-tag">${theme}</span>
    `).join('')}
  </div>
  
  <h2>Recommendations</h2>
  ${summary.recommendations.map(rec => `
    <div class="recommendation">${rec}</div>
  `).join('')}
  
  <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 12px;">
    <p>This report was generated using InsightLens survey analysis aligned with Academic Capability Framework (ACF) 2025.</p>
    <p>Individual unit reports are available for detailed promotion evidence.</p>
  </footer>
</body>
</html>
  `;
}

/**
 * Format overall summary as text
 */
export function formatSummaryAsText(summary: OverallSummaryReport): string {
  return `PROMOTION EVIDENCE SUMMARY REPORT
=====================================

Generated: ${new Date(summary.generatedDate).toLocaleDateString()}
Total Units Analyzed: ${summary.totalUnits}

OVERALL METRICS
---------------
• Average Satisfaction: ${summary.overallMetrics.averageSatisfaction}%
• Average Response Rate: ${summary.overallMetrics.averageResponseRate}%
• Units Exceeding Benchmarks: ${summary.overallMetrics.unitsExceedingBenchmarks}
• Units with Positive Trend: ${summary.overallMetrics.unitsWithPositiveTrend}

ACF LEVEL DISTRIBUTION
----------------------
${Object.entries(summary.levelDistribution).map(([level, count]) => 
  `Level ${level}: ${count} units`
).join('\n')}

TOP PERFORMERS
--------------
${summary.topPerformers.map(unit => 
  `• ${unit.unitCode} - ${unit.unitName}
  Level ${unit.level} | ${unit.satisfaction}% satisfaction
  Key Strength: ${unit.keyStrength}`
).join('\n\n')}

${summary.risingStars.length > 0 ? `
RISING STARS (Strong Improvement)
----------------------------------
${summary.risingStars.map(unit => 
  `• ${unit.unitCode} - ${unit.unitName}
  Level ${unit.level} | ${unit.satisfaction}% satisfaction
  Improvement: ${unit.keyStrength}`
).join('\n\n')}
` : ''}

KEY STRENGTHS
-------------
${summary.keyStrengths.map(s => `• ${s}`).join('\n')}

COMMON THEMES IN FEEDBACK
-------------------------
${summary.commonThemes.join(', ')}

RECOMMENDATIONS
---------------
${summary.recommendations.map(r => `• ${r}`).join('\n')}

---
This report was generated using InsightLens survey analysis 
aligned with Academic Capability Framework (ACF) 2025.
Individual unit reports are available for detailed promotion evidence.
`;
}

/**
 * Format report as plain text for copying
 */
export function formatReportAsText(report: PromotionReport): string {
  let text = `PROMOTION EVIDENCE REPORT
========================

Unit: ${report.unitCode} - ${report.unitName}
Generated: ${new Date(report.generatedDate).toLocaleDateString()}
Suggested Level: ${report.suggestedLevel}

EXECUTIVE SUMMARY
-----------------
${report.executiveSummary}

QUANTITATIVE METRICS
--------------------
• Average Student Satisfaction: ${report.quantitativeMetrics.averageSatisfaction}%
• Average Response Rate: ${report.quantitativeMetrics.averageResponseRate}%
• Performance Trend: ${report.quantitativeMetrics.trend}
• Benchmark Comparison: ${report.quantitativeMetrics.benchmarkPerformance}
• Analysis Period: ${report.quantitativeMetrics.timespan} (${report.quantitativeMetrics.surveysAnalyzed} surveys)

${report.teachingEvidence.title.toUpperCase()}
${'-'.repeat(report.teachingEvidence.title.length)}
${report.teachingEvidence.summary}

${report.teachingEvidence.evidence.map(e => 
`• ${e.criterion} [${e.strength}]
  ${e.statement} ${e.supportingData || ''}`
).join('\n\n')}

STUDENT FEEDBACK THEMES
-----------------------
Key themes: ${report.qualitativeEvidence.themesIdentified.join(', ')}

Representative Comments:
${report.qualitativeEvidence.positiveComments.map(c => `• "${c}"`).join('\n')}

RECOMMENDATIONS
---------------
${report.recommendations.map(r => `• ${r}`).join('\n')}
`;
  
  return text;
}