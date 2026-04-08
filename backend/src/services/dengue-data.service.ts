import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import { DengueWeeklyRecord } from "../types/dengue";

let cache: DengueWeeklyRecord[] | null = null;

function normalizeProvince(value: string): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

export async function loadDengueData(): Promise<DengueWeeklyRecord[]> {
  if (cache) return cache;

  const filePath = path.resolve(process.cwd(), "src", "data", "dengue_mock_weekly_2025_se01_24.csv");
  console.log("Loading CSV from:", filePath);
  
  const content = await fs.readFile(filePath, "utf-8");
  console.log("CSV content length:", content.length);

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log("Parsed rows:", rows.length);
  console.log("First row sample:", rows[0]);

  cache = rows
    .filter((row: any) => {
      const prov = row.province;
      if (!prov) return false;
      const trimmed = String(prov).trim();
      return trimmed.length > 0;
    })
    .map((row: any) => ({
      province: normalizeProvince(String(row.province)),
      year: Number(row.year) || 0,
      epi_week: Number(row.epi_week) || 0,
      cases: Number(row.cases) || 0,
      temp_mean_c_synthetic: Number(row.temp_mean_c_synthetic) || 0,
      precip_mm_synthetic: Number(row.precip_mm_synthetic) || 0,
      risk_level_rule_based: row.risk_level_rule_based || 'bajo',
    }));

  console.log("Loaded records:", cache.length);
  return cache;
}

export async function getProvinces(): Promise<string[]> {
  const data = await loadDengueData();
  return [...new Set(data.map((row) => row.province))].sort();
}

export async function getRecordByProvinceAndWeek(
  province: string,
  epiWeek: number,
): Promise<DengueWeeklyRecord | null> {
  const data = await loadDengueData();
  const provinceNormalized = normalizeProvince(province);

  return (
    data.find(
      (row) =>
        row.province === provinceNormalized &&
        row.epi_week === epiWeek &&
        row.year === 2025,
    ) || null
  );
}

export async function getRecordsByProvince(
  province: string,
): Promise<DengueWeeklyRecord[]> {
  const data = await loadDengueData();
  const provinceNormalized = normalizeProvince(province);

  return data
    .filter((row) => row.province === provinceNormalized)
    .sort((a, b) => a.epi_week - b.epi_week);
}

export async function getNationalWeeklyStats(): Promise<{
  epi_week: number;
  total_cases: number;
  avg_temperature: number;
  avg_precipitation: number;
  provinces_reporting: number;
}[]> {
  const data = await loadDengueData();
  
  const weeklyMap = new Map<number, {
    cases: number;
    temp: number;
    precip: number;
    count: number;
  }>();
  
  data.forEach(row => {
    const existing = weeklyMap.get(row.epi_week);
    if (existing) {
      existing.cases += row.cases;
      existing.temp += row.temp_mean_c_synthetic;
      existing.precip += row.precip_mm_synthetic;
      existing.count += 1;
    } else {
      weeklyMap.set(row.epi_week, {
        cases: row.cases,
        temp: row.temp_mean_c_synthetic,
        precip: row.precip_mm_synthetic,
        count: 1
      });
    }
  });
  
  return Array.from(weeklyMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, stats]) => ({
      epi_week: week,
      total_cases: stats.cases,
      avg_temperature: Math.round((stats.temp / stats.count) * 10) / 10,
      avg_precipitation: Math.round((stats.precip / stats.count) * 10) / 10,
      provinces_reporting: stats.count
    }));
}

export async function getHighRiskProvinces(epiWeek: number): Promise<string[]> {
  const data = await loadDengueData();
  const weekData = data.filter(row => row.epi_week === epi_week && row.risk_level_rule_based === 'alto');
  
  return [...new Set(weekData.map(row => row.province))].sort();
}
