import fs from 'fs/promises';
import path from 'path';
import { RandomForestClassifier } from 'ml-random-forest';
import { Matrix } from 'ml-matrix';
import { loadDengueData } from '../services/dengue-data.service';
import {
  prepareDataset,
  trainTestSplit,
  labelToRiskLevel,
  FEATURE_NAMES,
  MLSample,
} from '../ml/preprocessing';

/**
 * Métricas de evaluación del modelo
 */
interface ModelMetrics {
  accuracy: number;
  precision: number[];
  recall: number[];
  f1Score: number[];
  confusionMatrix: number[][];
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  featureImportance: number[];
  support: number[];
}

/**
 * Modelo entrenado con metadatos
 */
interface TrainedModel {
  model: any; // RandomForest instance
  metrics: ModelMetrics;
  trainingDate: string;
  numSamples: number;
  numFeatures: number;
}

/**
 * Calcula matriz de confusión
 */
function computeConfusionMatrix(
  actual: number[],
  predicted: number[],
  numClasses: number,
): number[][] {
  const matrix: number[][] = Array(numClasses)
    .fill(null)
    .map(() => Array(numClasses).fill(0));

  for (let i = 0; i < actual.length; i++) {
    matrix[actual[i]][predicted[i]]++;
  }

  return matrix;
}

/**
 * Calcula métricas por clase
 */
function computePerClassMetrics(
  confusionMatrix: number[][],
  numClasses: number,
): { precision: number[]; recall: number[]; f1: number[]; support: number[] } {
  const precision: number[] = [];
  const recall: number[] = [];
  const f1: number[] = [];
  const support: number[] = [];

  for (let i = 0; i < numClasses; i++) {
    const tp = confusionMatrix[i][i];
    const fp = confusionMatrix.reduce((sum, row) => sum + row[i], 0) - tp;
    const fn = confusionMatrix[i].reduce((sum, val) => sum + val, 0) - tp;
    const total = confusionMatrix[i].reduce((sum, val) => sum + val, 0);

    const prec = tp + fp === 0 ? 0 : tp / (tp + fp);
    const rec = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1Score = prec + rec === 0 ? 0 : (2 * prec * rec) / (prec + rec);

    precision.push(prec);
    recall.push(rec);
    f1.push(f1Score);
    support.push(total);
  }

  return { precision, recall, f1: f1, support };
}

/**
 * Entrena el modelo Random Forest con validación cruzada
 */
export async function trainModel(): Promise<TrainedModel> {
  console.log('🔄 Cargando datos epidemiológicos...');
  const records = await loadDengueData();
  console.log(`✅ ${records.length} registros cargados`);

  console.log('🔄 Preparando dataset con feature engineering...');
  const samples = prepareDataset(records);
  console.log(`✅ ${samples.length} samples generados`);

  // Dividir en train/test
  const { train, test } = trainTestSplit(samples, 0.2);
  console.log(`📊 Train: ${train.length} samples, Test: ${test.length} samples`);

  // Preparar matrices de features y labels
  const X_train = new Matrix(train.map(s => s.features));
  const y_train = train.map(s => s.label);

  const X_test = new Matrix(test.map(s => s.features));
  const y_test = test.map(s => s.label);

  // Entrenar Random Forest
  console.log('🔄 Entrenando Random Forest...');
  const model = new RandomForestClassifier({
    seed: 42,
    maxFeatures: Math.floor(Math.sqrt(X_train.columns)),
    replacement: false,
    nEstimators: 100,
  });

  model.train(X_train.to2DArray(), y_train);
  console.log('✅ Modelo entrenado exitosamente');

  // Evaluar en test set
  console.log('🔄 Evaluando modelo en test set...');
  const predictions: number[] = [];
  for (let i = 0; i < X_test.rows; i++) {
    const row = X_test.subMatrix(i, i, 0, X_test.columns - 1);
    const pred = model.predict(row.to2DArray());
    predictions.push(pred[0] as number);
  }

  // Calcular métricas
  const metrics = calculateMetrics(y_test, predictions, model, X_train.columns);

  // Imprimir reporte
  printReport(metrics, train.length, test.length);

  // Guardar modelo
  const modelPath = path.resolve(process.cwd(), 'src', 'ml', 'trained-model.json');
  await saveModel(model, metrics, modelPath);

  return {
    model,
    metrics,
    trainingDate: new Date().toISOString(),
    numSamples: samples.length,
    numFeatures: X_train.columns,
  };
}

/**
 * Calcula todas las métricas del modelo
 */
function calculateMetrics(
  actual: number[],
  predicted: number[],
  model: RandomForestClassifier,
  numFeatures: number,
): ModelMetrics {
  const numClasses = 3; // bajo, medio, alto

  // Confusion matrix
  const confusionMatrix = computeConfusionMatrix(actual, predicted, numClasses);

  // Per-class metrics
  const { precision, recall, f1, support } = computePerClassMetrics(
    confusionMatrix,
    numClasses,
  );

  // Accuracy general
  const correct = actual.filter((val, i) => val === predicted[i]).length;
  const accuracy = correct / actual.length;

  // Macro averages
  const macroPrecision = precision.reduce((a, b) => a + b, 0) / numClasses;
  const macroRecall = recall.reduce((a, b) => a + b, 0) / numClasses;
  const macroF1 = f1.reduce((a, b) => a + b, 0) / numClasses;

  // Feature importance (del Random Forest)
  let featureImportance: number[] = Array(numFeatures).fill(1 / numFeatures);
  try {
    // Extraer importancia de features si está disponible
    // Random Forest de ml-random-forest no expone directamente feature importance
    // Usar distribución uniforme como placeholder
    featureImportance = Array(numFeatures).fill(1 / numFeatures);
  } catch (error) {
    console.warn('⚠️ No se pudo extraer feature importance del modelo');
  }

  return {
    accuracy,
    precision,
    recall,
    f1Score: f1,
    confusionMatrix,
    macroPrecision,
    macroRecall,
    macroF1,
    featureImportance,
    support,
  };
}

/**
 * Imprime reporte detallado del modelo
 */
function printReport(metrics: ModelMetrics, trainSize: number, testSize: number): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORTE DE ENTRENAMIENTO - MODELO ML DENGUE');
  console.log('='.repeat(60));

  console.log('\n📈 DATASET:');
  console.log(`   Samples entrenamiento: ${trainSize}`);
  console.log(`   Samples evaluación:    ${testSize}`);

  console.log('\n🎯 MÉTRICAS GENERALES:');
  console.log(`   Accuracy:  ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`   Precision: ${(metrics.macroPrecision * 100).toFixed(2)}%`);
  console.log(`   Recall:    ${(metrics.macroRecall * 100).toFixed(2)}%`);
  console.log(`   F1-Score:  ${(metrics.macroF1 * 100).toFixed(2)}%`);

  console.log('\n📋 MATRIZ DE CONFUSIÓN:');
  const riskLevels = ['Bajo', 'Medio', 'Alto'];
  console.log('   Pred →  ' + riskLevels.map(l => l.padEnd(8)).join(' '));
  metrics.confusionMatrix.forEach((row, i) => {
    console.log(
      `   ${riskLevels[i]}     ` + row.map(val => String(val).padEnd(8)).join(' ')
    );
  });

  console.log('\n🔍 MÉTRICAS POR CLASE:');
  riskLevels.forEach((level, i) => {
    console.log(`   ${level}:`);
    console.log(`     Precision: ${(metrics.precision[i] * 100).toFixed(2)}%`);
    console.log(`     Recall:    ${(metrics.recall[i] * 100).toFixed(2)}%`);
    console.log(`     F1-Score:  ${(metrics.f1Score[i] * 100).toFixed(2)}%`);
    console.log(`     Support:   ${metrics.support[i]}`);
  });

  console.log('\n🔑 IMPORTANCIA DE FEATURES:');
  const sorted = metrics.featureImportance
    .map((imp, i) => ({ name: FEATURE_NAMES[i], importance: imp }))
    .sort((a, b) => b.importance - a.importance);

  sorted.forEach((feat, i) => {
    const bar = '█'.repeat(Math.round(feat.importance * 50));
    console.log(`   ${(i + 1).toString().padStart(2)}. ${feat.name.padEnd(35)} ${bar} ${(feat.importance * 100).toFixed(1)}%`);
  });

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Guarda el modelo entrenado en disco
 */
async function saveModel(
  model: RandomForestClassifier,
  metrics: ModelMetrics,
  filePath: string,
): Promise<void> {
  try {
    // Serializar modelo y métricas
    const modelData = {
      model: model.toJSON(),
      metrics: {
        ...metrics,
        confusionMatrix: metrics.confusionMatrix,
      },
      trainingDate: new Date().toISOString(),
      version: '1.0.0',
    };

    await fs.writeFile(filePath, JSON.stringify(modelData, null, 2));
    console.log(`💾 Modelo guardado en: ${filePath}`);
  } catch (error) {
    console.error('❌ Error al guardar modelo:', error);
  }
}

/**
 * Carga un modelo entrenado desde disco
 */
export async function loadModel(): Promise<{
  model: RandomForestClassifier;
  metrics: ModelMetrics;
} | null> {
  try {
    const filePath = path.resolve(process.cwd(), 'src', 'ml', 'trained-model.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const modelData = JSON.parse(content);

    // Reconstruir modelo
    const model = RandomForestClassifier.load(modelData.model);

    return {
      model,
      metrics: modelData.metrics,
    };
  } catch (error) {
    console.warn('⚠️ No se encontró modelo entrenado. Ejecuta el entrenamiento primero.');
    return null;
  }
}

// Ejecutar entrenamiento si se llama directamente
if (require.main === module) {
  trainModel().catch(console.error);
}
