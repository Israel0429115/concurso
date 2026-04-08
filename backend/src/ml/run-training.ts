/**
 * Script de entrenamiento del modelo ML
 * 
 * Este script entrena un modelo Random Forest con el dataset de dengue
 * y guarda el modelo entrenado con métricas de evaluación.
 * 
 * Uso:
 *   npm run train-model
 *   o
 *   npx ts-node src/ml/run-training.ts
 */

import { trainModel } from './train-model';

async function main() {
  console.log('🚀 Iniciando entrenamiento del modelo ML para predicción de dengue...\n');

  try {
    const result = await trainModel();

    console.log('\n✅ Entrenamiento completado exitosamente!');
    console.log('\n📝 Resumen:');
    console.log(`   - Modelo: Random Forest (100 árboles)`);
    console.log(`   - Samples: ${result.numSamples}`);
    console.log(`   - Features: ${result.numFeatures}`);
    console.log(`   - Accuracy: ${(result.metrics.accuracy * 100).toFixed(2)}%`);
    console.log(`   - F1-Score (macro): ${(result.metrics.macroF1 * 100).toFixed(2)}%`);
    console.log('\n💾 El modelo ha sido guardado en: src/ml/trained-model.json');
    console.log('\n🎯 Próximos pasos:');
    console.log('   1. Reinicia el servidor backend para cargar el nuevo modelo');
    console.log('   2. Las predicciones ahora usarán el modelo ML automáticamente');
    console.log('   3. Puedes ver las métricas en: GET /api/ml/metrics\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error durante el entrenamiento:', error);
    process.exit(1);
  }
}

main();
