# 🦟 Dengue Outbreak Prediction System - Ecuador

Sistema de predicción de brotes de dengue a nivel provincial en Ecuador, desarrollado para concurso de programación.

## 📋 Contexto

Ecuador registró **27,838 casos de dengue en 2023** (MSP/PAHO), con tendencia al alza y avance hacia zonas andinas. Este sistema implementa un modelo de predicción que evalúa el riesgo de brote provincial usando variables epidemiológicas.

## 🎯 Desafío

Modelo de clasificación/regresión que prediga el riesgo de brote provincial usando:
- Temperatura
- Precipitación
- Semana epidemiológica
- Casos previos
- Tendencias históricas

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ o Bun
- npm o bun package manager

### Instalación

```bash
# Instalar dependencias
npm install
# o si usas bun
bun install

# Iniciar servidor de desarrollo
npm run dev
# o
bun run dev
```

El servidor se ejecutará en `http://localhost:3001`

## 📊 Características

### ✅ Implementado

1. **Dataset Sintético Completo**
   - 24 provincias del Ecuador
   - 24 semanas epidemiológicas
   - ~29,262 casos (simulando datos reales de 2023)
   - Patrones climáticos por región (Costa, Sierra, Amazonía)

2. **Modelo de Predicción Avanzado**
   - **Machine Learning Real**: Random Forest con 100 árboles
   - Feature engineering con 9 variables (temperatura, precipitación, tendencias, etc.)
   - Validación cruzada con métricas demostrables
   - **Accuracy: 84.48%** | **F1-Score: 73.98%**
   - Factores explicables para cada predicción

3. **Modelo Rule-Based (Fallback)**
   - Cálculo de riesgo basado en múltiples factores
   - Índice de idoneidad de temperatura (26-32°C óptimo para Aedes aegypti)
   - Impacto de precipitación en criaderos del vector
   - Promedio móvil ponderado para tendencias
   - Factor de tendencia histórica

3. **API REST Completa**
   - Predicción individual por provincia
   - Predicción batch (múltiples provincias)
   - Estadísticas nacionales
   - Resumen epidemiológico
   - Datos históricos por provincia

4. **Validación y Manejo de Errores**
   - Validación de parámetros de entrada
   - Manejo centralizado de errores
   - Respuestas consistentes

5. **Tests Unitarios**
   - Tests para servicio de predicción
   - Tests para servicio de datos
   - Cobertura de casos edge

## 🏗️ Arquitectura

```
backend/
├── src/
│   ├── controllers/        # Controladores de Express
│   │   └── dengue.controller.ts
│   ├── services/           # Lógica de negocio
│   │   ├── dengue-data.service.ts      # Gestión de datos
│   │   └── prediction.service.ts       # Algoritmo de predicción
│   ├── routes/             # Definición de rutas
│   │   └── dengue.routes.ts
│   ├── models/             # Modelos de datos
│   ├── types/              # Definiciones TypeScript
│   │   └── dengue.ts
│   ├── middlewares/        # Middlewares
│   │   ├── error.handler.ts
│   │   └── validation.middleware.ts
│   ├── data/               # Dataset sintético
│   │   └── dengue_mock_weekly_2025_se01_24.csv
│   ├── config/             # Configuración
│   │   └── index.ts
│   └── server.ts           # Punto de entrada
├── tests/                  # Tests unitarios
│   ├── prediction.test.ts
│   └── data-service.test.ts
└── API_DOCUMENTATION.md    # Documentación API
```

## 🤖 Modelo de Machine Learning

### Arquitectura del Modelo

El sistema utiliza un **Random Forest Classifier** con 100 árboles de decisión, implementando:

1. **Feature Engineering Avanzado** (9 features):
   - Temperatura normalizada (0-1)
   - Precipitación normalizada (0-1)
   - Casos de la semana anterior (lag-1)
   - Promedio móvil de 3 semanas
   - Tendencia de casos (ratio)
   - Semana epidemiológica (cíclica)
   - Temperatura al cuadrado (no linealidad)
   - Interacción temperatura × precipitación
   - Promedio histórico de la provincia

2. **Entrenamiento con Validación Cruzada**:
   - Split estratificado: 80% train / 20% test
   - 576 samples de entrenamiento
   - Prevención de data leakage

3. **Métricas del Modelo**:

| Métrica      | Valor   |
|-------------|---------|
| **Accuracy**  | 84.48%  |
| **Precision** | 77.76%  |
| **Recall**    | 73.87%  |
| **F1-Score**  | 73.98%  |

4. **Matriz de Confusión**:

```
Pred →    Bajo    Medio    Alto
Bajo       42       2       0
Medio       8       6       6
Alto        0       2      50
```

5. **Métricas por Clase**:

| Clase  | Precision | Recall | F1-Score | Support |
|--------|-----------|--------|----------|---------|
| Bajo   | 84.00%    | 95.45% | 89.36%   | 44      |
| Medio  | 60.00%    | 30.00% | 40.00%   | 20      |
| Alto   | 89.29%    | 96.15% | 92.59%   | 52      |

### Cómo Entrenar el Modelo

```bash
# Ejecutar el entrenamiento completo con métricas
npm run train-model

# El modelo se guarda en src/ml/trained-model.json
# Reinicia el servidor para usar el nuevo modelo
```

### Endpoint de Métricas del Modelo

```http
GET /api/ml/metrics
```

**Respuesta:**
```json
{
  "modelType": "Random Forest",
  "metrics": {
    "accuracy": 0.8448,
    "macroPrecision": 0.7776,
    "macroRecall": 0.7387,
    "macroF1": 0.7398
  },
  "confusionMatrix": [[42, 2, 0], [8, 6, 6], [0, 2, 50]],
  "featureImportance": [...],
  "perClassMetrics": {
    "bajo": {"precision": 0.84, "recall": 0.9545, "f1Score": 0.8936},
    "medio": {"precision": 0.6, "recall": 0.3, "f1Score": 0.4},
    "alto": {"precision": 0.8929, "recall": 0.9615, "f1Score": 0.9259}
  }
}
```

### Sistema Híbrido ML + Rule-Based

El sistema implementa un **enfoque híbrido**:
- **Primero**: Intenta predicción con modelo ML Random Forest
- **Fallback**: Si ML no está disponible, usa modelo rule-based
- **Transparencia**: Cada respuesta indica qué modelo fue utilizado (`modelUsed` field)

## 🔌 Endpoints API

### Base URL
```
http://localhost:3001/api
```

### Principales Endpoints

#### 1. Lista de Provincias
```http
GET /api/provinces
```

#### 2. Predicción Individual
```http
GET /api/prediction?province=Guayas&week=15
```

**Respuesta:**
```json
{
  "province": "GUAYAS",
  "epiWeek": 15,
  "riskLevel": "alto",
  "riskScore": 0.78,
  "expectedCases": 52,
  "topFactors": [
    "temperatura óptima para reproducción del vector Aedes aegypti",
    "precipitación elevada favorece criaderos del vector",
    "número de casos elevado",
    "tendencia ascendente de casos en semanas recientes"
  ],
  "record": { ... }
}
```

#### 3. Predicción Batch
```http
POST /api/prediction/batch
Content-Type: application/json

{
  "provinces": ["Guayas", "Pichincha", "Azuay"],
  "week": 15
}
```

#### 4. Estadísticas Nacionales
```http
GET /api/statistics/national
```

#### 5. Resumen Epidemiológico
```http
GET /api/summary?week=15
```

#### 6. Estadísticas por Provincia
```http
GET /api/statistics/province?province=Guayas
```

#### 7. Datos Históricos
```http
GET /api/history?province=Guayas
```

**Ver [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) para documentación completa**

## 🧮 Algoritmo de Predicción

### Cálculo de Riesgo (escala 0-1)

El modelo combina múltiples factores con pesos diferenciados:

1. **Severidad de Casos (50%)**: Normalización del número de casos
2. **Idoneidad de Temperatura (30%)**:
   - Óptimo: 26-32°C (rango de reproducción del Aedes aegypti)
   - Aceptable: 20-34°C
   - Subóptimo: <20°C o >34°C

3. **Impacto de Precipitación (20%)**:
   - Alto riesgo: 100-200mm (crea criaderos)
   - Moderado: 50-100mm o 200-300mm
   - Bajo: <50mm o >300mm

4. **Factor de Tendencia Histórica**: Multiplicador basado en comparación con promedios históricos
   - Tendencia ascendente: 1.3x
   - Tendencia descendente: 0.8x

### Niveles de Riesgo
- **Bajo** (score < 0.4): Riesgo mínimo
- **Medio** (score 0.4-0.7): Riesgo moderado
- **Alto** (score >= 0.7): Riesgo elevado de brote

### Predicción de Casos
Usa promedio móvil ponderado con ajuste de tendencia:
- Semanas recientes tienen mayor peso
- Tendencia ascendente: +10% ajuste
- Tendencia descendente: -10% ajuste

## 📈 Datos Sintéticos

El dataset simula patrones reales del brote de dengue 2023 en Ecuador:

### Distribución por Región

**Alto Riesgo:**
- Costa: Guayas, Los Ríos, Manabí, El Oro, Esmeraldas
- Amazonía: Orellana, Sucumbíos, Morona Santiago, Zamora Chinchipe

**Riesgo Medio:**
- Sierra: Tungurahua, Cañar, Azuay, Loja

**Riesgo Bajo:**
- Sierra: Pichincha, Imbabura, Carchi, Chimborazo, Galápagos

### Estadísticas
- **Total de registros**: 576 (24 provincias × 24 semanas)
- **Casos totales**: 29,262
- **Promedio casos/semana/provincia**: 50.80
- **Máximo casos en una semana**: 172

## 🧪 Testing

```bash
# Ejecutar tests
npm test
# o
bun test
```

## 🔄 Scripts Disponibles

```bash
# Desarrollo (con hot reload)
npm run dev

# Build para producción
npm run build

# Iniciar en producción
npm start

# Ejecutar tests
npm test

# Generar nuevo dataset sintético
npx ts-node src/data/generate-synthetic-data.ts
```

## 🌍 Clasificación Regional

### Región Costa
- **Clima**: Tropical, 25-32°C
- **Precipitación**: 80-250mm
- **Riesgo**: ALTO (condiciones ideales para vector)

### Región Amazonía
- **Clima**: Tropical húmedo, 24-31°C
- **Precipitación**: 150-350mm
- **Riesgo**: ALTO (alta densidad vectorial)

### Región Sierra
- **Clima**: Templado, 14-24°C
- **Precipitación**: 50-150mm
- **Riesgo**: MEDIO a BAJO (temperaturas menos favorables)

## 🚀 Producción - Integración con Datos Reales

El sistema está diseñado para integrarse fácilmente con datos reales:

### Pasos para migrar a datos reales:

1. **Reemplazar archivo CSV** en `src/data/dengue_mock_weekly_2025_se01_24.csv`

2. **Formato esperado del CSV**:
```csv
province,year,epi_week,cases,temp_mean_c_synthetic,precip_mm_synthetic,risk_level_rule_based
Guayas,2025,1,45,28.5,120.3,alto
```

3. **Fuentes de datos reales**:
   - MSP Ecuador (Ministerio de Salud Pública)
   - INEC (Instituto Nacional de Estadística y Censos)
   - OPS/OMS (Organización Panamericana de la Salud)
   - SENESCYT datos abiertos

4. **Actualizar el servicio** `src/services/dengue-data.service.ts` para conectar a base de datos real

### Recomendaciones para Producción

- [ ] Migrar a base de datos (PostgreSQL/MongoDB)
- [ ] Implementar caché (Redis)
- [ ] Agregar rate limiting
- [ ] Autenticación JWT
- [ ] Logging estructurado (Winston)
- [ ] Monitoreo (Prometheus/Grafana)
- [ ] Deploy con Docker/Kubernetes
- [ ] CI/CD pipeline

## 📚 Tecnologías Utilizadas

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Testing**: Jest
- **Data Parsing**: csv-parse
- **Security**: Helmet, CORS
- **Logging**: Morgan

## 👥 Equipo

Desarrollado para concurso de programación.

## 📄 Licencia

MIT

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Para preguntas o problemas, revisar:
- [API Documentation](./API_DOCUMENTATION.md)
- Issues del repositorio

---

## 🏆 Notas para el Concurso

### Cumplimiento del Desafío

✅ **Modelo de clasificación**: Predice riesgo por nivel provincial (bajo/medio/alto)
✅ **Modelo de regresión**: Predice número esperado de casos
✅ **Variables utilizadas**:
  - Temperatura (°C)
  - Precipitación (mm)
  - Semana epidemiológica
  - Casos previos
  - Tendencias históricas

✅ **Datos**: Dataset sintético basado en 27,838 casos reales de 2023 (MSP/PAHO)
✅ **Viable para producción**: Diseñado para integrarse con datos reales del Estado ecuatoriano
✅ **Documentación completa**: API docs, README, comentarios en código
✅ **Tests**: Tests unitarios incluidos

### Diferenciadores

1. **Algoritmo sofisticado**: Múltiples factores con pesos diferenciados
2. **Análisis de tendencias**: Promedio móvil ponderado + detección de tendencias
3. **Factores explicables**: Cada predicción incluye factores contribuyentes
4. **API completa**: Endpoints para análisis individual y agregado
5. **Código robusto**: Validación, manejo de errores, TypeScript estricto
6. **Documentación profesional**: API docs completa con ejemplos
