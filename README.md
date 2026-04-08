
Sistema de alerta temprana basado en inteligencia artificial para predecir el riesgo de brotes de dengue a nivel provincial en Ecuador.

---

## Descripción

Este proyecto implementa una plataforma web que combina datos epidemiológicos y variables climáticas para estimar el riesgo semanal de brote de dengue por provincia.

La solución permite:

- Predecir riesgo de brote (bajo, medio, alto)
- Estimar probabilidad asociada
- Analizar tendencias históricas
- Explicar los factores que influyen en el riesgo
- Simular escenarios de cambio (clima o casos)

---

## Problema

El dengue es una enfermedad vectorial con alta incidencia en Ecuador.

Según reportes oficiales:

- 2023: 27.838 casos
- 2024: 61.352 casos
- 2025 (SE 15): 15.814 casos

Esto evidencia la necesidad de herramientas que permitan anticipar brotes y apoyar decisiones de salud pública.

---

## Solución

Se propone un sistema de predicción basado en machine learning que:

1. Integra datos históricos por provincia y semana epidemiológica
2. Considera variables climáticas (temperatura, precipitación)
3. Genera un modelo de clasificación de riesgo
4. Expone resultados a través de una API
5. Visualiza resultados en una interfaz web interactiva

---

## Uso de Inteligencia Artificial

El sistema utiliza un modelo de clasificación entrenado con:

- Casos históricos de dengue
- Variables climáticas sintéticas/proxy
- Transformaciones temporales (estacionalidad)

Modelo:
- Random Forest Classifier (scikit-learn)

Salidas del modelo:
- Nivel de riesgo: bajo / medio / alto
- Probabilidad por clase
- Score de riesgo

Explicabilidad:
- Importancia de variables (feature importance)
- Factores clave que influyen en la predicción

---

## Arquitectura

Frontend (Angular)
        ↓
Backend (Node.js + Express)
        ↓
Salidas del modelo (JSON)
        ↑
ML (Python + scikit-learn)

---

## Estructura del proyecto

concurso/
│
├── backend/
├── frontend-fixed/
├── ml/
└── README.md

---

## Cómo ejecutar

### Backend

cd backend
bun install
bun run dev

---

### ML

cd ml
python -m venv .venv
pip install -r requirements.txt
python train_model.py

---

### Frontend

cd frontend-fixed
bun install
bun run start

---

## API

GET /api/model/prediction?province=GUAYAS&week=15
GET /api/model/metrics
GET /api/model/feature-importance
