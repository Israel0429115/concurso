import { Request, Response } from "express";
import {
  getProvinces,
  getRecordsByProvince,
  getNationalWeeklyStats,
  getHighRiskProvinces,
} from "../services/dengue-data.service";
import { predictProvinceWeek, predictMultipleProvinces } from "../services/prediction.service";
import { predictWithML, getModelMetrics } from "../services/ml-prediction.service";

export async function listProvinces(req: Request, res: Response) {
  try {
    const provinces = await getProvinces();
    res.json({ provinces });
  } catch (error) {
    console.error("Error detallado:", error);
    res.status(500).json({ message: "Error al obtener provincias", error: String(error) });
  }
}

export async function getProvinceHistory(req: Request, res: Response) {
  try {
    const province = String(req.query.province || "");
    if (!province) {
      return res.status(400).json({ message: "province es requerido" });
    }

    const records = await getRecordsByProvince(province);
    return res.json({ province: province.toUpperCase(), records });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener historial" });
  }
}

export async function getPrediction(req: Request, res: Response) {
  try {
    const province = String(req.query.province || "");
    const week = Number(req.query.week);

    if (!province) {
      return res.status(400).json({ message: "province es requerido" });
    }

    if (!week || Number.isNaN(week)) {
      return res.status(400).json({ message: "week debe ser numérico" });
    }

    // Intentar primero con modelo ML
    const mlPrediction = await predictWithML(province, week);
    
    if (mlPrediction) {
      // Usar predicción del modelo ML
      return res.json({
        ...mlPrediction,
        modelUsed: 'ML-RandomForest',
      });
    }
    
    // Fallback a modelo rule-based si ML no está disponible
    const prediction = await predictProvinceWeek(province, week);
    return res.json({
      ...prediction,
      modelUsed: 'Rule-Based',
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al generar predicción" });
  }
}

export async function getBatchPrediction(req: Request, res: Response) {
  try {
    const { provinces, week } = req.body;

    if (!provinces || !Array.isArray(provinces) || provinces.length === 0) {
      return res.status(400).json({ message: "provinces debe ser un array no vacío" });
    }

    if (!week || Number.isNaN(week)) {
      return res.status(400).json({ message: "week debe ser numérico" });
    }

    // Intentar con ML para cada provincia
    const predictions = await Promise.all(
      provinces.map(async (province: string) => {
        const mlPred = await predictWithML(province, week);
        if (mlPred) {
          return { ...mlPred, modelUsed: 'ML-RandomForest' };
        }
        const rulePred = await predictProvinceWeek(province, week);
        return { ...rulePred, modelUsed: 'Rule-Based' };
      })
    );

    // Ordenar por riskScore descendente
    predictions.sort((a, b) => b.riskScore - a.riskScore);

    return res.json({
      week,
      totalPredictions: predictions.length,
      predictions
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al generar predicciones batch" });
  }
}

export async function getMLMetrics(req: Request, res: Response) {
  try {
    const metrics = await getModelMetrics();
    
    if (!metrics) {
      return res.status(404).json({ 
        message: "No hay modelo ML entrenado. Ejecuta: npm run train-model" 
      });
    }

    return res.json({
      modelType: metrics.modelType,
      metrics: {
        accuracy: metrics.accuracy,
        macroPrecision: metrics.macroPrecision,
        macroRecall: metrics.macroRecall,
        macroF1: metrics.macroF1,
      },
      confusionMatrix: metrics.confusionMatrix,
      featureImportance: metrics.featureImportance,
      perClassMetrics: metrics.perClassMetrics,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener métricas del modelo ML" });
  }
}

export async function getNationalStatistics(req: Request, res: Response) {
  try {
    const stats = await getNationalWeeklyStats();
    return res.json({ 
      statistics: stats,
      totalWeeks: stats.length,
      totalCases: stats.reduce((sum, s) => sum + s.total_cases, 0)
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener estadísticas nacionales" });
  }
}

export async function getEpidemiologicalSummary(req: Request, res: Response) {
  try {
    const provinces = await getProvinces();
    const week = Number(req.query.week) || 15;
    
    const highRisk = await getHighRiskProvinces(week);
    const allRecords = await Promise.all(
      provinces.map(p => getRecordsByProvince(p))
    );

    // Calculate risk distribution
    const mediumRisk: string[] = [];
    const lowRisk: string[] = [];
    
    for (const records of allRecords) {
      if (records.length === 0) continue;
      
      const latestWeek = records[records.length - 1];
      const province = latestWeek.province;
      
      if (!highRisk.includes(province)) {
        if (latestWeek.risk_level_rule_based === 'medio') {
          mediumRisk.push(province);
        } else {
          lowRisk.push(province);
        }
      }
    }

    // Calculate national trend
    const totalCases = allRecords.flat().reduce((sum, r) => sum + r.cases, 0);
    const recentCases = allRecords.flat()
      .filter(r => r.epi_week >= week - 2)
      .reduce((sum, r) => sum + r.cases, 0);
    const olderCases = allRecords.flat()
      .filter(r => r.epi_week >= week - 5 && r.epi_week < week - 2)
      .reduce((sum, r) => sum + r.cases, 0);

    let nationalTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (olderCases > 0) {
      const ratio = recentCases / olderCases;
      if (ratio > 1.1) nationalTrend = 'increasing';
      else if (ratio < 0.9) nationalTrend = 'decreasing';
    }

    // Find peak week
    const weeklyTotals = new Map<number, number>();
    allRecords.flat().forEach(r => {
      weeklyTotals.set(r.epi_week, (weeklyTotals.get(r.epi_week) || 0) + r.cases);
    });
    
    let peakWeek = 1;
    let peakCases = 0;
    weeklyTotals.forEach((cases, week) => {
      if (cases > peakCases) {
        peakCases = cases;
        peakWeek = week;
      }
    });

    return res.json({
      totalProvinces: provinces.length,
      totalWeeks: Math.max(...allRecords.map(r => r.length)),
      totalCases,
      highRiskProvinces: highRisk,
      mediumRiskProvinces: mediumRisk,
      lowRiskProvinces: lowRisk,
      nationalTrend,
      peakWeek,
      peakCases
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener resumen epidemiológico" });
  }
}

export async function getProvinceStatistics(req: Request, res: Response) {
  try {
    const province = String(req.query.province || "");
    
    if (!province) {
      return res.status(400).json({ message: "province es requerido" });
    }

    const records = await getRecordsByProvince(province);
    
    if (records.length === 0) {
      return res.status(404).json({ message: "Provincia no encontrada" });
    }

    const totalCases = records.reduce((sum, r) => sum + r.cases, 0);
    const avgCasesPerWeek = totalCases / records.length;
    const maxCasesInWeek = Math.max(...records.map(r => r.cases));
    const latestWeek = records[records.length - 1];
    
    // Calculate trend
    const recentWeeks = records.slice(-3);
    const olderWeeks = records.slice(-6, -3);
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (olderWeeks.length > 0 && recentWeeks.length > 0) {
      const recentAvg = recentWeeks.reduce((sum, r) => sum + r.cases, 0) / recentWeeks.length;
      const olderAvg = olderWeeks.reduce((sum, r) => sum + r.cases, 0) / olderWeeks.length;
      
      if (olderAvg > 0) {
        const ratio = recentAvg / olderAvg;
        if (ratio > 1.1) trend = 'increasing';
        else if (ratio < 0.9) trend = 'decreasing';
      }
    }

    return res.json({
      province: latestWeek.province,
      totalCases,
      avgCasesPerWeek: Math.round(avgCasesPerWeek * 100) / 100,
      maxCasesInWeek,
      currentRiskLevel: latestWeek.risk_level_rule_based,
      trend,
      weeksReporting: records.length
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener estadísticas de provincia" });
  }
}
