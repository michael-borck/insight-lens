/**
 * Academic Capability Framework (ACF) 2025 Structure
 * Maps survey data to promotion evidence categories
 */

export interface ACFEvidence {
  category: 'teaching' | 'research' | 'engagement';
  criterion: string;
  evidence: string;
  metric?: number;
  source: 'survey' | 'comment' | 'trend' | 'benchmark';
  strength: 'strong' | 'moderate' | 'developing';
}

export interface ACFLevel {
  level: 'A' | 'B' | 'C' | 'D' | 'E';
  title: string;
  description: string;
  satisfactionThreshold: number;
  responseRateThreshold: number;
  benchmarkRequirement: string;
}

export const ACF_LEVELS: ACFLevel[] = [
  {
    level: 'A',
    title: 'Associate Lecturer, Research Associate',
    description: 'Oriented towards excellence benchmarks. Developing academic skills and expertise.',
    satisfactionThreshold: 60,
    responseRateThreshold: 20,
    benchmarkRequirement: 'Meeting minimum standards'
  },
  {
    level: 'B',
    title: 'Lecturer, Research Fellow',
    description: 'Progressing towards excellence benchmarks. Growing profile of academic achievement.',
    satisfactionThreshold: 70,
    responseRateThreshold: 30,
    benchmarkRequirement: 'Approaching faculty average'
  },
  {
    level: 'C',
    title: 'Senior Lecturer, Senior Research Fellow',
    description: 'Approaching and meeting excellence benchmarks. Established record of independent achievement.',
    satisfactionThreshold: 80,
    responseRateThreshold: 35,
    benchmarkRequirement: 'Meeting or exceeding faculty average'
  },
  {
    level: 'D',
    title: 'Associate Professor, Principal Research Fellow',
    description: 'Meeting excellence benchmarks. Continuous record of leadership and excellence.',
    satisfactionThreshold: 85,
    responseRateThreshold: 40,
    benchmarkRequirement: 'Exceeding faculty average, approaching university average'
  },
  {
    level: 'E',
    title: 'Professor, Senior Principal Research Fellow',
    description: 'Meeting and exceeding excellence benchmarks. Sustained exceptional performance and leadership.',
    satisfactionThreshold: 90,
    responseRateThreshold: 45,
    benchmarkRequirement: 'Exceeding university average, setting benchmarks'
  }
];

export const ACF_TEACHING_CRITERIA = {
  studentSatisfaction: {
    name: 'Positive student evaluation',
    description: 'Positive student evaluation with evidence of improvement over time',
    keywords: ['satisfaction', 'overall experience', 'positive feedback'],
    metricField: 'overall_experience'
  },
  engagement: {
    name: 'Student engagement and support',
    description: 'Improved student engagement, progression, retention and completion',
    keywords: ['engagement', 'support', 'helpful', 'responsive', 'accessible'],
    metricField: 'response_rate'
  },
  innovation: {
    name: 'Teaching innovation',
    description: 'Development and implementation of innovative approaches to learning and teaching',
    keywords: ['innovative', 'creative', 'technology', 'interactive', 'engaging methods'],
    metricField: null
  },
  curriculum: {
    name: 'Curriculum development',
    description: 'Development, review or renewal of high-quality curriculum and assessment',
    keywords: ['curriculum', 'assessment', 'content', 'materials', 'resources'],
    metricField: null
  },
  inclusivity: {
    name: 'Inclusive teaching',
    description: 'Effective strategies to address the needs of diverse groups of students',
    keywords: ['inclusive', 'diverse', 'supportive', 'accommodating', 'flexible'],
    metricField: null
  }
};

export const ACF_ENGAGEMENT_CRITERIA = {
  collegiality: {
    name: 'Collegial environment',
    description: 'Foster a positive and inclusive workplace environment',
    keywords: ['collaborative', 'teamwork', 'supportive environment', 'mentoring'],
    metricField: null
  },
  externalStakeholders: {
    name: 'External collaboration',
    description: 'Collaborate with external stakeholders',
    keywords: ['industry', 'practical', 'real-world', 'professional', 'workplace'],
    metricField: null
  },
  leadership: {
    name: 'Academic leadership',
    description: 'Leadership in teaching and academic activities',
    keywords: ['leadership', 'coordination', 'organization', 'initiative'],
    metricField: null
  }
};

/**
 * Map survey metrics to ACF evidence strength
 */
export function calculateEvidenceStrength(value: number, type: 'satisfaction' | 'response_rate' | 'trend'): 'strong' | 'moderate' | 'developing' {
  switch (type) {
    case 'satisfaction':
      if (value >= 85) return 'strong';
      if (value >= 75) return 'moderate';
      return 'developing';
    
    case 'response_rate':
      if (value >= 40) return 'strong';
      if (value >= 30) return 'moderate';
      return 'developing';
    
    case 'trend':
      if (value >= 5) return 'strong';
      if (value >= 2) return 'moderate';
      return 'developing';
    
    default:
      return 'developing';
  }
}

/**
 * Determine appropriate ACF level based on metrics
 */
export function determineACFLevel(
  satisfaction: number,
  responseRate: number,
  exceedsBenchmark: boolean,
  improvementTrend: number
): 'A' | 'B' | 'C' | 'D' | 'E' {
  // Level E: Exceptional performance
  if (satisfaction >= 90 && responseRate >= 45 && exceedsBenchmark && improvementTrend > 0) {
    return 'E';
  }
  
  // Level D: Excellence
  if (satisfaction >= 85 && responseRate >= 40 && exceedsBenchmark) {
    return 'D';
  }
  
  // Level C: Meeting benchmarks
  if (satisfaction >= 80 && responseRate >= 35) {
    return 'C';
  }
  
  // Level B: Progressing
  if (satisfaction >= 70 && responseRate >= 30) {
    return 'B';
  }
  
  // Level A: Developing
  return 'A';
}

/**
 * Extract keywords from text for ACF mapping
 */
export function extractACFKeywords(text: string): string[] {
  const allKeywords = [
    ...Object.values(ACF_TEACHING_CRITERIA).flatMap(c => c.keywords),
    ...Object.values(ACF_ENGAGEMENT_CRITERIA).flatMap(c => c.keywords)
  ];
  
  const foundKeywords: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of allKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }
  
  return [...new Set(foundKeywords)]; // Remove duplicates
}

/**
 * Generate evidence statement from metrics
 */
export function generateEvidenceStatement(
  metricName: string,
  value: number,
  comparison?: { type: 'faculty' | 'university' | 'previous'; difference: number }
): string {
  let statement = `Achieved ${value}% ${metricName}`;
  
  if (comparison) {
    const direction = comparison.difference > 0 ? 'exceeding' : 'below';
    const absValue = Math.abs(comparison.difference);
    
    switch (comparison.type) {
      case 'faculty':
        statement += `, ${direction} faculty average by ${absValue}%`;
        break;
      case 'university':
        statement += `, ${direction} university average by ${absValue}%`;
        break;
      case 'previous':
        statement += `, ${comparison.difference > 0 ? 'improving' : 'declining'} by ${absValue}% from previous year`;
        break;
    }
  }
  
  return statement;
}

/**
 * Format comment as evidence quote
 */
export function formatCommentEvidence(comment: string, sentiment: number): string {
  const sentimentLabel = sentiment > 0.5 ? 'highly positive' : 
                        sentiment > 0 ? 'positive' : 'neutral';
  
  // Truncate long comments
  const maxLength = 200;
  const truncated = comment.length > maxLength 
    ? comment.substring(0, maxLength) + '...' 
    : comment;
  
  return `Student feedback (${sentimentLabel}): "${truncated}"`;
}