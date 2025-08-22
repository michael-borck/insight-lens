/**
 * Shared types for promotion suggestions feature
 */

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

export interface SurveyData {
  year: number;
  semester: string;
  satisfaction: number;
  responseRate: number;
  responses: number;
  enrolments: number;
}

export interface BenchmarkComparison {
  facultyAverage: number;
  universityAverage: number;
  exceedsFaculty: boolean;
  exceedsUniversity: boolean;
  facultyDifference: number;
  universityDifference: number;
}

export interface CommentEvidence {
  comment: string;
  sentiment: number;
  keywords: string[];
  year: number;
  semester: string;
}

export interface ACFEvidence {
  category: 'teaching' | 'research' | 'engagement';
  criterion: string;
  evidence: string;
  metric?: number;
  source: 'survey' | 'comment' | 'trend' | 'benchmark';
  strength: 'strong' | 'moderate' | 'developing';
}

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

export interface EvidenceSection {
  title: string;
  summary: string;
  evidence: FormattedEvidence[];
}

export interface FormattedEvidence {
  criterion: string;
  statement: string;
  strength: 'strong' | 'moderate' | 'developing';
  supportingData?: string;
}

export interface MetricsSection {
  averageSatisfaction: number;
  averageResponseRate: number;
  trend: string;
  benchmarkPerformance: string;
  surveysAnalyzed: number;
  timespan: string;
}

export interface QualitativeSection {
  positiveComments: string[];
  themesIdentified: string[];
}

export interface HighPerformingUnit {
  unitCode: string;
  unitName: string;
  satisfaction: number;
}