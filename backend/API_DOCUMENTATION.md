# API Documentation - Dengue Outbreak Prediction System

## Base URL
```
http://localhost:3001/api
```

## Overview
This API provides dengue outbreak prediction and epidemiological analysis for Ecuador. It uses synthetic data based on real patterns from the 2023 Ecuador dengue outbreak (27,838 cases reported by MSP/PAHO).

## Endpoints

### 1. Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-04-08T12:00:00.000Z"
}
```

---

### 2. List All Provinces
```http
GET /api/provinces
```

**Response:**
```json
{
  "provinces": [
    "AZUAY",
    "BOLIVAR",
    "CAÑAR",
    ...
  ]
}
```

---

### 3. Get Province Historical Data
```http
GET /api/history?province=Guayas
```

**Query Parameters:**
- `province` (required): Province name (case-insensitive)

**Response:**
```json
{
  "province": "GUAYAS",
  "records": [
    {
      "province": "GUAYAS",
      "year": 2025,
      "epi_week": 1,
      "cases": 45,
      "temp_mean_c_synthetic": 28.5,
      "precip_mm_synthetic": 120.3,
      "risk_level_rule_based": "alto"
    },
    ...
  ]
}
```

---

### 4. Get Single Prediction
```http
GET /api/prediction?province=Guayas&week=15
```

**Query Parameters:**
- `province` (required): Province name
- `week` (required): Epidemiological week (1-52)

**Response:**
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
  "record": {
    "province": "GUAYAS",
    "year": 2025,
    "epi_week": 15,
    "cases": 48,
    "temp_mean_c_synthetic": 28.5,
    "precip_mm_synthetic": 145.2,
    "risk_level_rule_based": "alto"
  }
}
```

**Risk Levels:**
- `bajo`: Low risk (score < 0.4)
- `medio`: Medium risk (score 0.4-0.7)
- `alto`: High risk (score >= 0.7)

---

### 5. Batch Prediction (Multiple Provinces)
```http
POST /api/prediction/batch
Content-Type: application/json

{
  "provinces": ["Guayas", "Pichincha", "Azuay"],
  "week": 15
}
```

**Request Body:**
- `provinces` (required): Array of province names (max 50)
- `week` (required): Epidemiological week (1-52)

**Response:**
```json
{
  "week": 15,
  "totalPredictions": 3,
  "predictions": [
    {
      "province": "GUAYAS",
      "epiWeek": 15,
      "riskLevel": "alto",
      "riskScore": 0.78,
      "expectedCases": 52,
      "topFactors": [...],
      "record": {...}
    },
    ...
  ]
}
```

*Note: Predictions are sorted by risk score (highest first)*

---

### 6. National Statistics
```http
GET /api/statistics/national
```

**Response:**
```json
{
  "statistics": [
    {
      "epi_week": 1,
      "total_cases": 1250,
      "avg_temperature": 24.5,
      "avg_precipitation": 110.3,
      "provinces_reporting": 24
    },
    ...
  ],
  "totalWeeks": 24,
  "totalCases": 29262
}
```

---

### 7. Epidemiological Summary
```http
GET /api/summary?week=15
```

**Query Parameters:**
- `week` (optional): Specific week to analyze (default: 15)

**Response:**
```json
{
  "totalProvinces": 24,
  "totalWeeks": 24,
  "totalCases": 29262,
  "highRiskProvinces": ["GUAYAS", "LOS RIOS", ...],
  "mediumRiskProvinces": ["AZUAY", "CAÑAR", ...],
  "lowRiskProvinces": ["PICHINCHA", "GALAPAGOS", ...],
  "nationalTrend": "increasing",
  "peakWeek": 12,
  "peakCases": 2450
}
```

---

### 8. Province Statistics
```http
GET /api/statistics/province?province=Guayas
```

**Query Parameters:**
- `province` (required): Province name

**Response:**
```json
{
  "province": "GUAYAS",
  "totalCases": 1250,
  "avgCasesPerWeek": 52.08,
  "maxCasesInWeek": 95,
  "currentRiskLevel": "alto",
  "trend": "increasing",
  "weeksReporting": 24
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-04-08T12:00:00.000Z",
  "statusCode": 400
}
```

**Common Status Codes:**
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (province doesn't exist)
- `500`: Internal Server Error

---

## Prediction Algorithm

The prediction model uses multiple factors:

### Risk Score Calculation (0-1 scale)
1. **Cases Severity (50% weight)**: Normalized case count
2. **Temperature Suitability (30% weight)**: 
   - Optimal: 26-32°C (Aedes aegypti breeding range)
   - Acceptable: 20-34°C
   - Suboptimal: <20°C or >34°C

3. **Precipitation Impact (20% weight)**:
   - High risk: 100-200mm (creates breeding sites)
   - Moderate: 50-100mm or 200-300mm
   - Low: <50mm or >300mm

4. **Historical Trend Factor**: Multiplier based on comparison with historical averages
   - Increasing trend: 1.3x
   - Decreasing trend: 0.8x

### Case Prediction
Uses weighted moving average from recent weeks with trend adjustment:
- Recent weeks have higher weight
- Increasing trend: +10% adjustment
- Decreasing trend: -10% adjustment

---

## Data Source

The system uses synthetic data simulating:
- **24 provinces** of Ecuador (Coast, Sierra, Amazon regions)
- **24 epidemiological weeks** (2025)
- **29,262 total cases** (matching 2023 real outbreak scale)
- Temperature and precipitation patterns by region
- Realistic seasonal outbreak curves

**Regional Classification:**
- **High Risk**: Guayas, Los Ríos, Manabí, El Oro, Esmeraldas, Orellana, Sucumbíos
- **Medium Risk**: Tungurahua, Cañar, Azuay, Loja
- **Low Risk**: Pichincha, Imbabura, Carchi, Chimborazo, Galápagos

---

## Rate Limiting

Currently no rate limiting is implemented. For production use, consider adding:
- Request rate limiting
- Caching for frequently accessed data
- Database integration for real-time data

---

## Examples

### JavaScript/TypeScript
```typescript
// Get prediction for a province
const response = await fetch('http://localhost:3001/api/prediction?province=Guayas&week=15');
const prediction = await response.json();

console.log(`Risk Level: ${prediction.riskLevel}`);
console.log(`Expected Cases: ${prediction.expectedCases}`);
```

### cURL
```bash
# Get all provinces
curl http://localhost:3001/api/provinces

# Get prediction
curl "http://localhost:3001/api/prediction?province=Guayas&week=15"

# Batch prediction
curl -X POST http://localhost:3001/api/prediction/batch \
  -H "Content-Type: application/json" \
  -d '{"provinces": ["Guayas", "Pichincha"], "week": 15}'
```

### Python
```python
import requests

# Get epidemiological summary
response = requests.get('http://localhost:3001/api/summary')
summary = response.json()

print(f"Total cases: {summary['totalCases']}")
print(f"High risk provinces: {summary['highRiskProvinces']}")
```

---

## Support

For questions or issues, please check the project README or contact the development team.
