import { PredictionResponse, RiskLevel, DengueWeeklyRecord } from "../types/dengue";
import { getRecordByProvinceAndWeek, getRecordsByProvince } from "./dengue-data.service";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Advanced risk score calculation using multiple factors:
 * - Cases trend (weighted moving average)
 * - Temperature suitability index (optimal 26-32°C for Aedes aegypti)
 * - Precipitation impact (breeding sites)
 * - Historical baseline comparison
 */
function calculateRiskScore(
  cases: number,
  temp: number,
  precip: number,
  historicalAvg?: number,
): number {
  // Temperature suitability index (0-1)
  // Aedes aegypti thrives between 20-34°C, optimal at 26-32°C
  const tempIndex = temp >= 26 && temp <= 32 ? 1.0 :
                    temp >= 20 && temp < 26 ? (temp - 20) / 6 :
                    temp > 32 && temp <= 34 ? (34 - temp) / 2 : 0.3;

  // Precipitation impact (0-1)
  // Moderate rainfall (100-200mm) creates breeding sites
  const precipIndex = precip >= 100 && precip <= 200 ? 1.0 :
                      precip > 200 && precip <= 300 ? 0.8 :
                      precip >= 50 && precip < 100 ? precip / 100 : 0.2;

  // Cases severity (0-1)
  const casesIndex = clamp(cases / 150, 0, 1);

  // Historical trend factor
  let trendFactor = 1.0;
  if (historicalAvg && historicalAvg > 0) {
    trendFactor = cases > historicalAvg ? 1.3 : 0.8;
  }

  // Weighted combination
  const raw = (casesIndex * 0.50 + tempIndex * 0.30 + precipIndex * 0.20) * trendFactor;

  return clamp(raw, 0, 1);
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 0.7) return "alto";
  if (score >= 0.4) return "medio";
  return "bajo";
}

function buildTopFactors(
  cases: number,
  temp: number,
  precip: number,
  trend?: 'increasing' | 'decreasing' | 'stable',
): string[] {
  const factors: string[] = [];

  // Temperature factors
  if (temp >= 26 && temp <= 32)
    factors.push("temperatura óptima para reproducción del vector Aedes aegypti");
  else if (temp >= 20 && temp < 26)
    factors.push("temperatura moderadamente favorable para el vector");
  else if (temp > 32)
    factors.push("temperatura elevada puede reducir ciclo de vida del mosquito");

  // Precipitation factors
  if (precip >= 150) factors.push("precipitación elevada favorece criaderos del vector");
  else if (precip >= 100) factors.push("precipitación moderada aumenta sitios de reproducción");
  else if (precip < 50) factors.push("precipitación baja reduce criaderos naturales");

  // Cases trend
  if (trend === 'increasing') factors.push("tendencia ascendente de casos en semanas recientes");
  else if (trend === 'decreasing') factors.push("tendencia descendente de casos en semanas recientes");
  
  if (cases >= 100) factors.push("número de casos muy elevado");
  else if (cases >= 50) factors.push("número de casos elevado");
  else if (cases >= 20) factors.push("casos moderados detectados");

  if (factors.length === 0)
    factors.push("condiciones epidemiológicas y climáticas relativamente estables");

  return factors.slice(0, 4); // Top 4 factors max
}

/**
 * Calculate trend based on recent weeks
 */
function calculateTrend(records: DengueWeeklyRecord[], currentWeek: number): 'increasing' | 'decreasing' | 'stable' {
  const recentWeeks = records
    .filter(r => r.epi_week >= currentWeek - 3 && r.epi_week < currentWeek)
    .sort((a, b) => a.epi_week - b.epi_week);

  if (recentWeeks.length < 2) return 'stable';

  const recentAvg = recentWeeks.slice(-2).reduce((sum, r) => sum + r.cases, 0) / 2;
  const olderAvg = recentWeeks.slice(0, -2).reduce((sum, r) => sum + r.cases, 0) / Math.max(1, recentWeeks.length - 2);

  if (recentAvg > olderAvg * 1.2) return 'increasing';
  if (recentAvg < olderAvg * 0.8) return 'decreasing';
  return 'stable';
}

/**
 * Predict next week cases using weighted moving average
 */
function predictNextWeekCases(records: DengueWeeklyRecord[], currentWeek: number): number {
  const recentRecords = records
    .filter(r => r.epi_week >= currentWeek - 4 && r.epi_week <= currentWeek)
    .sort((a, b) => a.epi_week - b.epi_week);

  if (recentRecords.length === 0) return 0;

  // Weighted moving average (more recent weeks have higher weight)
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < recentRecords.length; i++) {
    const weight = (i + 1); // Linear weighting
    weightedSum += recentRecords[i].cases * weight;
    totalWeight += weight;
  }

  const prediction = Math.round(weightedSum / totalWeight);
  
  // Add slight growth factor if trend is increasing (10% increase)
  const trend = calculateTrend(recentRecords, currentWeek);
  if (trend === 'increasing') {
    return Math.round(prediction * 1.1);
  } else if (trend === 'decreasing') {
    return Math.round(prediction * 0.9);
  }
  
  return prediction;
}

export async function predictProvinceWeek(
  province: string,
  epiWeek: number,
): Promise<PredictionResponse> {
  const record = await getRecordByProvinceAndWeek(province, epiWeek);

  if (!record) {
    return {
      province: province.toUpperCase(),
      epiWeek,
      riskLevel: "bajo",
      riskScore: 0,
      expectedCases: 0,
      topFactors: ["sin datos para esa provincia y semana"],
      record: null,
    };
  }

  // Get historical data for trend analysis
  const historicalRecords = await getRecordsByProvince(province);
  const trend = calculateTrend(historicalRecords, epiWeek);
  
  // Calculate historical average for same weeks
  const historicalAvg = historicalRecords.length > 0
    ? historicalRecords.reduce((sum, r) => sum + r.cases, 0) / historicalRecords.length
    : undefined;

  const riskScore = calculateRiskScore(
    record.cases,
    record.temp_mean_c_synthetic,
    record.precip_mm_synthetic,
    historicalAvg,
  );

  const riskLevel = riskLevelFromScore(riskScore);

  // Predict next week cases
  const expectedCases = predictNextWeekCases(historicalRecords, epiWeek);

  return {
    province: record.province,
    epiWeek: record.epi_week,
    riskLevel,
    riskScore: Number(riskScore.toFixed(2)),
    expectedCases,
    topFactors: buildTopFactors(
      record.cases,
      record.temp_mean_c_synthetic,
      record.precip_mm_synthetic,
      trend,
    ),
    record,
  };
}

/**
 * Predict multiple provinces at once
 */
export async function predictMultipleProvinces(
  provinces: string[],
  epiWeek: number,
): Promise<PredictionResponse[]> {
  const predictions = await Promise.all(
    provinces.map(province => predictProvinceWeek(province, epiWeek))
  );
  
  return predictions.sort((a, b) => b.riskScore - a.riskScore);
}
