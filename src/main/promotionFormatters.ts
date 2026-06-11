/**
 * Promotion Report Formatters
 * HTML and plain-text rendering of promotion reports and summaries
 */

import { PromotionReport, OverallSummaryReport } from './promotionGenerator';

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