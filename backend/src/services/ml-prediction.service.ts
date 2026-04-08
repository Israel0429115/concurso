import { Matrix } from 'ml-matrix';
import { RandomForestClassifier } from 'ml-random-forest';
import { loadDengueData } from '../services/dengue-data.service';
import { extractFeatures, labelToRiskLevel, FEATURE_NAMES } from '../ml/preprocessing';
import { loadModel } from '../ml/train-model';
import { DengueWeeklyRecord, PredictionResponse, RiskLevel } from '../types/dengue';

/**
 * Servicio de predicción usando modelo ML entrenado
 */

let cachedModel: RandomForestClassifier | null = null;
let cachedMetrics: any = null;

/**
 * Inicializa el modelo ML (carga desde disco si es necesario)
 */
async function initializeModel(): Promise<RandomForestClassifier | null> {
  if (!cachedModel) {
    const loaded = await loadModel();
    if (loaded) {
      cachedModel = loaded.model;
      cachedMetrics = loaded.metrics;
    }
  }
  return cachedModel;
}

/**
 * Predice el riesgo de dengue para una provincia y semana usando el modelo ML
 */
export async function predictWithML(
  province: string,
  epiWeek: number,
): Promise<PredictionResponse | null> {
  const model = await initializeModel();

  // Si no hay modelo ML, retornar null para usar el fallback rule-based
  if (!model) {
    return null;
  }

  try {
    // Cargar datos
    const allRecords = await loadDengueData();
    const record = allRecords.find(
      r => r.province === province.toUpperCase() && r.epi_week === epiWeek,
    );

    if (!record) {
      return null;
    }

    // Obtener histórico para feature engineering
    const historicalRecords = allRecords
      .filter(r => r.province === province.toUpperCase() && r.epi_week < epiWeek)
      .sort((a, b) => a.epi_week - b.epi_week);

    // Extraer features
    const features = extractFeatures(record, historicalRecords);

    // Predecir con el modelo
    const featureMatrix = new Matrix([features]);
    const prediction = model.predict(featureMatrix.to2DArray())[0] as number;

    // Calcular score basado en predicción
    let riskScore = 0;
    
    // Asignar score basado en la clase predicha
    switch (prediction) {
      case 0: // bajo
        riskScore = 0.2;
        break;
      case 1: // medio
        riskScore = 0.5;
        break;
      case 2: // alto
        riskScore = 0.85;
        break;
      default:
        riskScore = 0.2;
    }

    // Convertir predicción a nivel de riesgo
    const riskLevel = labelToRiskLevel(prediction);

    // Predecir casos esperados (usando modelo de regresión simple)
    const expectedCases = predictExpectedCases(historicalRecords, record);

    // Generar factores explicativos basados en feature importance
    const topFactors = generateExplanatoryFactors(features, record);

    return {
      province: record.province,
      epiWeek: record.epi_week,
      riskLevel,
      riskScore: Number(riskScore.toFixed(2)),
      expectedCases,
      topFactors,
      record,
      modelUsed: 'ML-RandomForest' as const,
    };
  } catch (error) {
    console.error('❌ Error en predicción ML:', error);
    return null; // Retornar null para usar fallback
  }
}

/**
 * Predice el número esperado de casos usando promedio ponderado
 */
function predictExpectedCases(
  historicalRecords: DengueWeeklyRecord[],
  currentRecord: DengueWeeklyRecord,
): number {
  if (historicalRecords.length === 0) {
    return currentRecord.cases;
  }

  // Usar las últimas 4 semanas para predicción
  const recentWeeks = historicalRecords.slice(-4);

  if (recentWeeks.length === 0) {
    return currentRecord.cases;
  }

  // Promedio ponderado con tendencia lineal
  const weights = recentWeeks.map((_, i) => i + 1);
  const weightedSum = recentWeeks.reduce(
    (sum, r, i) => sum + r.cases * weights[i],
    0,
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const basePrediction = Math.round(weightedSum / totalWeight);

  // Aplicar factor de tendencia
  if (recentWeeks.length >= 2) {
    const lastWeek = recentWeeks[recentWeeks.length - 1].cases;
    const secondLastWeek = recentWeeks[recentWeeks.length - 2].cases;

    if (secondLastWeek > 0) {
      const trend = lastWeek / secondLastWeek;
      if (trend > 1.1) {
        return Math.round(basePrediction * 1.1); // Tendencia ascendente
      } else if (trend < 0.9) {
        return Math.round(basePrediction * 0.9); // Tendencia descendente
      }
    }
  }

  return basePrediction;
}

/**
 * Genera factores explicativos basados en las features
 */
function generateExplanatoryFactors(
  features: number[],
  record: DengueWeeklyRecord,
): string[] {
  const factors: string[] = [];

  // Feature 0: Temperatura
  const temp = features[0];
  if (temp >= 0.5 && temp <= 0.85) {
    factors.push('temperatura en rango óptimo para reproducción del vector Aedes aegypti (modelo ML)');
  } else if (temp > 0.85) {
    factors.push('temperatura elevada acelera ciclo de vida del mosquito (modelo ML)');
  }

  // Feature 1: Precipitación
  const precip = features[1];
  if (precip > 0.5) {
    factors.push('precipitación significativa favorece criaderos del vector (modelo ML)');
  }

  // Feature 2: Casos semana anterior
  const prevCases = features[2];
  if (prevCases > 0.6) {
    factors.push('elevado número de casos en semana previa (modelo ML)');
  }

  // Feature 4: Tendencia
  const trend = features[4];
  if (trend > 1.2) {
    factors.push('tendencia ascendente detectada por el modelo ML');
  }

  // Agregar factor genérico si hay pocos factores
  if (factors.length < 2) {
    factors.push('patrón epidemiológico identificado por modelo de machine learning');
  }

  return factors.slice(0, 4);
}

/**
 * Obtiene métricas del modelo entrenado
 */
export async function getModelMetrics() {
  const model = await initializeModel();

  if (!model || !cachedMetrics) {
    return null;
  }

  return {
    modelType: 'Random Forest',
    numTrees: 100,
    accuracy: cachedMetrics.accuracy,
    macroPrecision: cachedMetrics.macroPrecision,
    macroRecall: cachedMetrics.macroRecall,
    macroF1: cachedMetrics.macroF1,
    confusionMatrix: cachedMetrics.confusionMatrix,
    featureImportance: cachedMetrics.featureImportance.map(
      (imp: number, i: number) => ({
        feature: FEATURE_NAMES[i],
        importance: imp,
      })
    ),
    perClassMetrics: {
      bajo: {
        precision: cachedMetrics.precision[0],
        recall: cachedMetrics.recall[0],
        f1Score: cachedMetrics.f1Score[0],
        support: cachedMetrics.support[0],
      },
      medio: {
        precision: cachedMetrics.precision[1],
        recall: cachedMetrics.recall[1],
        f1Score: cachedMetrics.f1Score[1],
        support: cachedMetrics.support[1],
      },
      alto: {
        precision: cachedMetrics.precision[2],
        recall: cachedMetrics.recall[2],
        f1Score: cachedMetrics.f1Score[2],
        support: cachedMetrics.support[2],
      },
    },
  };
}
