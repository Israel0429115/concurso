import { Request, Response, NextFunction } from "express";

export function validatePredictionQuery(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { province, week } = req.query;

  if (!province || typeof province !== "string" || province.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "El parámetro 'province' es requerido",
      timestamp: new Date().toISOString(),
    });
  }

  const weekNum = Number(week);
  if (!week || Number.isNaN(weekNum) || weekNum < 1 || weekNum > 52) {
    return res.status(400).json({
      success: false,
      error: "El parámetro 'week' debe ser un número entre 1 y 52",
      timestamp: new Date().toISOString(),
    });
  }

  next();
}

export function validateBatchPrediction(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { provinces, week } = req.body;

  if (!provinces || !Array.isArray(provinces) || provinces.length === 0) {
    return res.status(400).json({
      success: false,
      error: "El campo 'provinces' debe ser un array no vacío",
      timestamp: new Date().toISOString(),
    });
  }

  if (provinces.length > 50) {
    return res.status(400).json({
      success: false,
      error: "No se pueden procesar más de 50 provincias en una solicitud",
      timestamp: new Date().toISOString(),
    });
  }

  const weekNum = Number(week);
  if (!week || Number.isNaN(weekNum) || weekNum < 1 || weekNum > 52) {
    return res.status(400).json({
      success: false,
      error: "El campo 'week' debe ser un número entre 1 y 52",
      timestamp: new Date().toISOString(),
    });
  }

  next();
}
