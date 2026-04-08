import { Router } from "express";
import {
  getPrediction,
  getProvinceHistory,
  listProvinces,
  getBatchPrediction,
  getNationalStatistics,
  getEpidemiologicalSummary,
  getProvinceStatistics,
} from "../controllers/dengue.controller";

const router = Router();

// Province listing
router.get("/provinces", listProvinces);

// Historical data
router.get("/history", getProvinceHistory);

// Single prediction
router.get("/prediction", getPrediction);

// Batch prediction (POST for multiple provinces)
router.post("/prediction/batch", getBatchPrediction);

// National statistics
router.get("/statistics/national", getNationalStatistics);

// Epidemiological summary
router.get("/summary", getEpidemiologicalSummary);

// Province statistics
router.get("/statistics/province", getProvinceStatistics);

export default router;
