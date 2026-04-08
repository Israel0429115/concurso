export type RiskLevel = "bajo" | "medio" | "alto";

export interface DengueWeeklyRecord {
  province: string;
  year: number;
  epi_week: number;
  cases: number;
  temp_mean_c_synthetic: number;
  precip_mm_synthetic: number;
  risk_level_rule_based: RiskLevel;
}

export interface PredictionRequest {
  province: string;
  week: number;
}

export interface BatchPredictionRequest {
  provinces: string[];
  week: number;
}

export interface PredictionResponse {
  province: string;
  epiWeek: number;
  riskLevel: RiskLevel;
  riskScore: number;
  expectedCases: number;
  topFactors: string[];
  record: DengueWeeklyRecord | null;
  modelUsed?: 'ML-RandomForest' | 'Rule-Based';
}

export interface ProvinceStats {
  province: string;
  totalCases: number;
  avgCasesPerWeek: number;
  maxCasesInWeek: number;
  currentRiskLevel: RiskLevel;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface NationalWeeklyStats {
  epi_week: number;
  total_cases: number;
  avg_temperature: number;
  avg_precipitation: number;
  provinces_reporting: number;
}

export interface EpidemiologicalSummary {
  totalProvinces: number;
  totalWeeks: number;
  totalCases: number;
  highRiskProvinces: string[];
  mediumRiskProvinces: string[];
  lowRiskProvinces: string[];
  nationalTrend: 'increasing' | 'decreasing' | 'stable';
  peakWeek: number;
  peakCases: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  timestamp: string;
  statusCode: number;
}
