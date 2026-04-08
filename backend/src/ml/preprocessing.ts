import { DengueWeeklyRecord } from "../types/dengue";

/**
 * Feature engineering: transforma registros crudos en features para el modelo ML
 */
export interface MLSample {
  features: number[];
  label: number; // 0=bajo, 1=medio, 2=alto
  metadata: {
    province: string;
    epi_week: number;
    cases: number;
    riskLevel: string;
  };
}

export interface FeatureImportance {
  name: string;
  importance: number;
}

/**
 * Extrae features numéricas de un registro epidemiológico
 * 
 * Features utilizadas:
 * 1. Temperatura normalizada (0-1)
 * 2. Precipitación normalizada (0-1)
 * 3. Casos de la semana anterior (lag feature)
 * 4. Promedio móvil de 3 semanas
 * 5. Tendencia de casos (ratio)
 * 6. Semana epidemiológica (cíclica)
 * 7. Temperatura al cuadrado (para capturar optimal range)
 * 8. Interacción temp*precip
 */
export function extractFeatures(
  record: DengueWeeklyRecord,
  historicalRecords: DengueWeeklyRecord[],
): number[] {
  // Feature 1: Temperatura normalizada (escala 0-1, asumiendo rango 15-35°C)
  const tempNormalized = clamp((record.temp_mean_c_synthetic - 15) / 20, 0, 1);

  // Feature 2: Precipitación normalizada (escala 0-1, asumiendo rango 0-400mm)
  const precipNormalized = clamp(record.precip_mm_synthetic / 400, 0, 1);

  // Feature 3: Casos de la semana anterior (lag-1)
  const previousWeekCases = getPreviousWeekCases(record, historicalRecords);

  // Feature 4: Promedio móvil de 3 semanas
  const movingAvg3 = getMovingAverage(historicalRecords, record.epi_week, 3);

  // Feature 5: Tendencia (ratio de casos recientes vs antiguos)
  const trend = calculateTrend(historicalRecords, record.epi_week);

  // Feature 6: Semana epidemiológica (normalizada 0-1, 52 semanas)
  const epiWeekNormalized = record.epi_week / 52;

  // Feature 7: Temperatura al cuadrado (captura relación no lineal)
  const tempSquared = Math.pow(tempNormalized, 2);

  // Feature 8: Interacción temperatura * precipitación
  const tempPrecipInteraction = tempNormalized * precipNormalized;

  // Feature 9: Casos promedio históricos de la provincia
  const historicalAvg = historicalRecords.length > 0
    ? historicalRecords.reduce((sum, r) => sum + r.cases, 0) / historicalRecords.length
    : 0;
  const historicalAvgNormalized = clamp(historicalAvg / 150, 0, 1);

  return [
    tempNormalized,
    precipNormalized,
    clamp(previousWeekCases / 150, 0, 1),
    clamp(movingAvg3 / 150, 0, 1),
    clamp(trend, 0, 2),
    epiWeekNormalized,
    tempSquared,
    tempPrecipInteraction,
    historicalAvgNormalized,
  ];
}

/**
 * Convierte el nivel de riesgo a etiqueta numérica
 */
export function riskLevelToLabel(riskLevel: string): number {
  switch (riskLevel.toLowerCase()) {
    case 'bajo': return 0;
    case 'medio': return 1;
    case 'alto': return 2;
    default: return 0;
  }
}

/**
 * Convierte etiqueta numérica a nivel de riesgo
 */
export function labelToRiskLevel(label: number): 'bajo' | 'medio' | 'alto' {
  switch (label) {
    case 0: return 'bajo';
    case 1: return 'medio';
    case 2: return 'alto';
    default: return 'bajo';
  }
}

/**
 * Prepara dataset completo para entrenamiento
 */
export function prepareDataset(records: DengueWeeklyRecord[]): MLSample[] {
  const samples: MLSample[] = [];

  // Agrupar por provincia
  const provinceGroups = new Map<string, DengueWeeklyRecord[]>();
  records.forEach(record => {
    const existing = provinceGroups.get(record.province);
    if (existing) {
      existing.push(record);
    } else {
      provinceGroups.set(record.province, [record]);
    }
  });

  // Crear samples para cada registro
  provinceGroups.forEach((provinceRecords, province) => {
    provinceRecords.sort((a, b) => a.epi_week - b.epi_week);

    provinceRecords.forEach((record, index) => {
      // Usar histórico hasta la semana actual (evitar data leakage)
      const historicalRecords = provinceRecords.slice(0, index);

      const features = extractFeatures(record, historicalRecords);
      const label = riskLevelToLabel(record.risk_level_rule_based);

      samples.push({
        features,
        label,
        metadata: {
          province: record.province,
          epi_week: record.epi_week,
          cases: record.cases,
          riskLevel: record.risk_level_rule_based,
        },
      });
    });
  });

  return samples;
}

/**
 * Divide dataset en train/test split estratificado
 */
export function trainTestSplit(
  samples: MLSample[],
  testRatio: number = 0.2,
): { train: MLSample[]; test: MLSample[] } {
  // Shuffle aleatorio
  const shuffled = [...samples].sort(() => Math.random() - 0.5);

  // Split estratificado simple
  const splitIndex = Math.floor(shuffled.length * (1 - testRatio));

  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex),
  };
}

/**
 * Nombres de las features para interpretabilidad
 */
export const FEATURE_NAMES: string[] = [
  'Temperatura (norm)',
  'Precipitación (norm)',
  'Casos semana anterior',
  'Promedio móvil 3 semanas',
  'Tendencia de casos',
  'Semana epidemiológica',
  'Temperatura²',
  'Interacción Temp×Precip',
  'Promedio histórico provincia',
];

// Utility functions
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getPreviousWeekCases(
  record: DengueWeeklyRecord,
  historicalRecords: DengueWeeklyRecord[],
): number {
  const prevWeek = historicalRecords.find(
    r => r.epi_week === record.epi_week - 1,
  );
  return prevWeek ? prevWeek.cases : 0;
}

function getMovingAverage(
  historicalRecords: DengueWeeklyRecord[],
  currentWeek: number,
  window: number,
): number {
  const recentWeeks = historicalRecords.filter(
    r => r.epi_week >= currentWeek - window && r.epi_week < currentWeek,
  );

  if (recentWeeks.length === 0) return 0;

  return recentWeeks.reduce((sum, r) => sum + r.cases, 0) / recentWeeks.length;
}

function calculateTrend(
  historicalRecords: DengueWeeklyRecord[],
  currentWeek: number,
): number {
  const recentWeeks = historicalRecords.filter(
    r => r.epi_week >= currentWeek - 3 && r.epi_week < currentWeek,
  );

  if (recentWeeks.length < 2) return 1.0;

  const midPoint = Math.floor(recentWeeks.length / 2);
  const olderHalf = recentWeeks.slice(0, midPoint);
  const recentHalf = recentWeeks.slice(midPoint);

  const olderAvg = olderHalf.reduce((sum, r) => sum + r.cases, 0) / olderHalf.length;
  const recentAvg = recentHalf.reduce((sum, r) => sum + r.cases, 0) / recentHalf.length;

  if (olderAvg === 0) return recentAvg > 0 ? 1.5 : 1.0;

  return recentAvg / olderAvg;
}
