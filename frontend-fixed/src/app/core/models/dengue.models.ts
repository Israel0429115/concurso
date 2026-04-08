export type RiskLevel = 'bajo' | 'medio' | 'alto';

export interface ProvincesResponse {
  provinces: string[];
}

export interface DengueWeeklyRecord {
  province: string;
  year: number;
  epi_week: number;
  cases: number;
  temp_mean_c_synthetic: number;
  precip_mm_synthetic: number;
  risk_level_rule_based: RiskLevel;
}

export interface PredictionResponse {
  province: string;
  epiWeek: number;
  riskLevel: RiskLevel;
  riskScore: number;
  expectedCases: number;
  topFactors: string[];
  record: DengueWeeklyRecord | null;
}

export interface HistoryResponse {
  province: string;
  records: DengueWeeklyRecord[];
}

export interface SummaryCard {
  label: string;
  value: string | number;
  hint?: string;
}
