/**
 * Script to generate comprehensive synthetic dengue data for all 24 Ecuadorian provinces
 * Based on real epidemiological patterns from 2023 Ecuador dengue outbreak (27,838 cases)
 * Sources: MSP/PAHO, INEC, OPS/OMS
 */

import fs from 'fs';
import path from 'path';

// All 24 provinces of Ecuador
const PROVINCES = [
  'Azuay', 'Bolivar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi',
  'El Oro', 'Esmeraldas', 'Galapagos', 'Guayas', 'Imbabura', 'Loja',
  'Los Rios', 'Manabi', 'Morona Santiago', 'Napo', 'Orellana', 'Pastaza',
  'Pichincha', 'Santa Elena', 'Santo Domingo', 'Sucumbios', 'Tungurahua', 'Zamora Chinchipe'
];

// Regional classification for realistic data generation
const REGION_PROVINCES: Record<string, {
  highRisk: string[];
  mediumRisk: string[];
  lowRisk: string[];
}> = {
  coast: {
    highRisk: ['Guayas', 'Los Rios', 'Manabi', 'El Oro', 'Esmeraldas', 'Santa Elena', 'Santo Domingo'],
    mediumRisk: [],
    lowRisk: []
  },
  amazon: {
    highRisk: ['Orellana', 'Sucumbios', 'Morona Santiago', 'Zamora Chinchipe', 'Napo', 'Pastaza'],
    mediumRisk: [],
    lowRisk: []
  },
  sierra: {
    highRisk: [],
    mediumRisk: ['Tungurahua', 'Cañar', 'Azuay', 'Loja'],
    lowRisk: ['Pichincha', 'Imbabura', 'Carchi', 'Chimborazo', 'Cotopaxi', 'Bolivar', 'Galapagos']
  }
};

// Temperature ranges by region (°C)
const TEMP_RANGES: Record<string, { min: number; max: number; optimal: number }> = {
  coast: { min: 25, max: 32, optimal: 28 },
  amazon: { min: 24, max: 31, optimal: 27 },
  sierra_high: { min: 18, max: 24, optimal: 21 },
  sierra_low: { min: 14, max: 20, optimal: 17 }
};

// Precipitation ranges by region (mm)
const PRECIP_RANGES: Record<string, { base: number; peak: number }> = {
  coast: { base: 80, peak: 250 },
  amazon: { base: 150, peak: 350 },
  sierra: { base: 50, peak: 150 }
};

// Base cases per week by risk level (reflecting 2023 outbreak patterns)
const BASE_CASES: Record<string, { low: number; medium: number; high: number }> = {
  low: { low: 2, medium: 8, high: 15 },
  medium: { low: 5, medium: 20, high: 45 },
  high: { low: 15, medium: 50, high: 120 }
};

function getRegion(province: string): string {
  if (REGION_PROVINCES.coast.highRisk.includes(province)) return 'coast';
  if (REGION_PROVINCES.amazon.highRisk.includes(province)) return 'amazon';
  if (REGION_PROVINCES.sierra.highRisk.includes(province)) return 'sierra_high';
  if (REGION_PROVINCES.sierra.mediumRisk.includes(province) || 
      REGION_PROVINCES.sierra.lowRisk.includes(province)) return 'sierra_low';
  return 'sierra_low';
}

function getRiskLevel(province: string): string {
  if (REGION_PROVINCES.coast.highRisk.includes(province) || 
      REGION_PROVINCES.amazon.highRisk.includes(province)) return 'high';
  if (REGION_PROVINCES.sierra.mediumRisk.includes(province)) return 'medium';
  return 'low';
}

// Seeded random for reproducibility
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateWeekData(
  province: string,
  year: number,
  week: number,
  rng: () => number
): {
  province: string;
  year: number;
  epi_week: number;
  cases: number;
  temp_mean_c_synthetic: number;
  precip_mm_synthetic: number;
  risk_level_rule_based: string;
} {
  const region = getRegion(province);
  const riskLevel = getRiskLevel(province);
  
  // Seasonal pattern: peaks during rainy season (weeks 1-20 in Ecuador)
  const seasonalFactor = week <= 20 ? 
    1 + 0.5 * Math.sin((week / 20) * Math.PI) : 
    1 - 0.3 * ((week - 20) / 32);
  
  // Temperature variation (warmer in early weeks)
  const tempBase = region.includes('sierra') ? 
    (region === 'sierra_high' ? TEMP_RANGES.sierra_high.optimal : TEMP_RANGES.sierra_low.optimal) :
    (region === 'coast' ? TEMP_RANGES.coast.optimal : TEMP_RANGES.amazon.optimal);
  
  const temp = tempBase + (rng() - 0.5) * 4 + 
    (week <= 20 ? 2 : -1); // Slightly warmer in first half
  
  // Precipitation pattern
  const precipBase = region.includes('sierra') ? PRECIP_RANGES.sierra.base :
                     region === 'coast' ? PRECIP_RANGES.coast.base : PRECIP_RANGES.amazon.base;
  
  const precipPeak = region.includes('sierra') ? PRECIP_RANGES.sierra.peak :
                     region === 'coast' ? PRECIP_RANGES.coast.peak : PRECIP_RANGES.amazon.peak;
  
  const precip = precipBase + (precipPeak - precipBase) * 
    Math.max(0, Math.sin((week / 26) * Math.PI)) + 
    (rng() - 0.5) * 50;
  
  // Case generation with realistic patterns
  const baseCases = BASE_CASES[riskLevel];
  let cases: number;
  
  if (week <= 10) {
    // Growing phase
    cases = baseCases.low + (baseCases.medium - baseCases.low) * (week / 10);
  } else if (week <= 20) {
    // Peak phase
    cases = baseCases.medium + (baseCases.high - baseCases.medium) * 
      Math.sin(((week - 10) / 10) * Math.PI / 2);
  } else {
    // Declining phase
    cases = baseCases.medium - (baseCases.medium - baseCases.low) * 
      ((week - 20) / 32);
  }
  
  cases = cases * seasonalFactor * (0.7 + rng() * 0.6); // Add randomness
  cases = Math.max(0, Math.round(cases));
  
  // Determine risk level based on cases and conditions
  let risk_level: string;
  if (cases >= 50 || (temp >= 26 && temp <= 32 && precip >= 100)) {
    risk_level = 'alto';
  } else if (cases >= 20 || (temp >= 24 && precip >= 80)) {
    risk_level = 'medio';
  } else {
    risk_level = 'bajo';
  }
  
  return {
    province,
    year,
    epi_week: week,
    cases,
    temp_mean_c_synthetic: Math.round(temp * 10) / 10,
    precip_mm_synthetic: Math.round(Math.max(0, precip) * 10) / 10,
    risk_level_rule_based: risk_level
  };
}

function main() {
  console.log('Generating comprehensive synthetic dengue dataset...');
  
  const dataDir = path.resolve(process.cwd(), 'src', 'data');
  const outputFile = path.join(dataDir, 'dengue_mock_weekly_2025_se01_24.csv');
  
  const allRecords: any[] = [];
  
  // Generate data for 24 weeks, year 2025
  const year = 2025;
  const numWeeks = 24;
  
  for (const province of PROVINCES) {
    const seed = province.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rng = seededRandom(seed * 1000 + year);
    
    for (let week = 1; week <= numWeeks; week++) {
      const record = generateWeekData(province, year, week, rng);
      allRecords.push(record);
    }
  }
  
  // Sort by province and week
  allRecords.sort((a, b) => {
    if (a.province < b.province) return -1;
    if (a.province > b.province) return 1;
    return a.epi_week - b.epi_week;
  });
  
  // Write to CSV
  const headers = ['province', 'year', 'epi_week', 'cases', 'temp_mean_c_synthetic', 
                   'precip_mm_synthetic', 'risk_level_rule_based'];
  const csvContent = [
    headers.join(','),
    ...allRecords.map(r => headers.map(h => r[h]).join(','))
  ].join('\n');
  
  fs.writeFileSync(outputFile, csvContent, 'utf-8');
  
  console.log(`Generated ${allRecords.length} records for ${PROVINCES.length} provinces`);
  console.log(`Output file: ${outputFile}`);
  
  // Generate summary statistics
  const totalCases = allRecords.reduce((sum, r) => sum + r.cases, 0);
  const avgCases = totalCases / allRecords.length;
  const maxCases = Math.max(...allRecords.map(r => r.cases));
  
  console.log(`\nSummary Statistics:`);
  console.log(`Total cases: ${totalCases}`);
  console.log(`Average cases per province/week: ${avgCases.toFixed(2)}`);
  console.log(`Maximum cases in a week: ${maxCases}`);
  
  // Risk level distribution
  const riskDist: Record<string, number> = {};
  allRecords.forEach(r => {
    riskDist[r.risk_level_rule_based] = (riskDist[r.risk_level_rule_based] || 0) + 1;
  });
  
  console.log(`\nRisk Level Distribution:`);
  Object.entries(riskDist).forEach(([level, count]) => {
    console.log(`  ${level}: ${count} records (${(count / allRecords.length * 100).toFixed(1)}%)`);
  });
}

main();
