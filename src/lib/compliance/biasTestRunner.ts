/**
 * Bias Testing Runner
 * EU AI Act Article 10 - Data and Data Governance
 *
 * Tests AI matching system for potential biases across:
 * - Geographic regions
 * - Company sizes
 * - Business sectors
 * - Company age
 */

import { supabase } from '@/lib/supabase';

// Synthetic company profiles for bias testing
export interface SyntheticCompany {
  id: string;
  name: string;
  region: string;
  sector: string;
  employees: string;
  annual_turnover?: number;
  company_age_years: number;
  certifications: string[];
  project_types: string[];
}

export interface BiasTestResult {
  test_id: string;
  test_name: string;
  test_date: string;
  passed: boolean;
  variance_score: number;
  flagged_biases: BiasFlag[];
  synthetic_companies: SyntheticCompany[];
  model_version: string;
  tester: string;
}

export interface BiasFlag {
  bias_type: 'geographic' | 'size' | 'sector' | 'age';
  dimension: string;
  expected_rate: number;
  actual_rate: number;
  deviation_percent: number;
  severity: 'low' | 'medium' | 'high';
}

export interface BiasTestConfig {
  test_name: string;
  subsidy_id?: string;
  variance_threshold?: number; // Default 0.15 (15%)
  tester: string;
}

// French regions for testing
const FRENCH_REGIONS = [
  'Île-de-France',
  'Auvergne-Rhône-Alpes',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Hauts-de-France',
  'Provence-Alpes-Côte d\'Azur',
  'Grand Est',
  'Pays de la Loire',
  'Bretagne',
  'Normandie',
  'Bourgogne-Franche-Comté',
  'Centre-Val de Loire',
  'Corse',
];

// Business sectors
const BUSINESS_SECTORS = [
  'Technology',
  'Manufacturing',
  'Services',
  'Agriculture',
  'Construction',
  'Retail',
  'Healthcare',
  'Energy',
  'Transport',
  'Tourism',
];

// Company sizes
const COMPANY_SIZES = [
  { label: '1-10', employees: '1-10', turnover: 500000 },
  { label: '11-50', employees: '11-50', turnover: 2000000 },
  { label: '51-250', employees: '51-250', turnover: 10000000 },
  { label: '251+', employees: '251+', turnover: 50000000 },
];

/**
 * Generate synthetic companies for bias testing
 */
export function generateSyntheticCompanies(count: number = 100): SyntheticCompany[] {
  const companies: SyntheticCompany[] = [];

  for (let i = 0; i < count; i++) {
    const sizeConfig = COMPANY_SIZES[i % COMPANY_SIZES.length];
    const region = FRENCH_REGIONS[i % FRENCH_REGIONS.length];
    const sector = BUSINESS_SECTORS[i % BUSINESS_SECTORS.length];

    companies.push({
      id: `synthetic-${i}`,
      name: `Test Company ${i + 1}`,
      region,
      sector,
      employees: sizeConfig.employees,
      annual_turnover: sizeConfig.turnover,
      company_age_years: (i % 20) + 1, // 1-20 years
      certifications: i % 3 === 0 ? ['ISO 9001'] : [],
      project_types: ['innovation', 'digital'].slice(0, (i % 2) + 1),
    });
  }

  return companies;
}

/**
 * Calculate match rates by dimension
 */
function calculateMatchRates(
  companies: SyntheticCompany[],
  matchResults: Map<string, number>,
  dimension: 'region' | 'sector' | 'employees'
): Map<string, { count: number; matches: number; rate: number }> {
  const rates = new Map<string, { count: number; matches: number; rate: number }>();

  for (const company of companies) {
    const key = company[dimension];
    const current = rates.get(key) || { count: 0, matches: 0, rate: 0 };
    current.count++;
    current.matches += matchResults.get(company.id) || 0;
    rates.set(key, current);
  }

  // Calculate rates
  for (const [key, data] of rates) {
    data.rate = data.count > 0 ? data.matches / data.count : 0;
    rates.set(key, data);
  }

  return rates;
}

/**
 * Detect biases in match rates
 */
function detectBiases(
  rates: Map<string, { count: number; matches: number; rate: number }>,
  biasType: 'geographic' | 'size' | 'sector' | 'age',
  threshold: number
): BiasFlag[] {
  const flags: BiasFlag[] = [];
  const allRates = Array.from(rates.values()).map(r => r.rate);

  if (allRates.length === 0) return flags;

  const meanRate = allRates.reduce((a, b) => a + b, 0) / allRates.length;

  for (const [dimension, data] of rates) {
    if (data.count < 3) continue; // Skip small samples

    const deviation = Math.abs(data.rate - meanRate) / (meanRate || 1);

    if (deviation > threshold) {
      flags.push({
        bias_type: biasType,
        dimension,
        expected_rate: meanRate,
        actual_rate: data.rate,
        deviation_percent: deviation * 100,
        severity: deviation > 0.3 ? 'high' : deviation > 0.2 ? 'medium' : 'low',
      });
    }
  }

  return flags;
}

/**
 * Run a complete bias test suite
 */
export async function runBiasTest(
  config: BiasTestConfig,
  matchFunction: (company: SyntheticCompany) => Promise<number>
): Promise<BiasTestResult> {
  const testId = crypto.randomUUID();
  const companies = generateSyntheticCompanies(100);
  const threshold = config.variance_threshold || 0.15;

  // Run matching for all synthetic companies
  const matchResults = new Map<string, number>();
  for (const company of companies) {
    try {
      const matchCount = await matchFunction(company);
      matchResults.set(company.id, matchCount);
    } catch (error) {
      console.error(`Match failed for ${company.id}:`, error);
      matchResults.set(company.id, 0);
    }
  }

  // Analyze by dimensions
  const regionalRates = calculateMatchRates(companies, matchResults, 'region');
  const sectorRates = calculateMatchRates(companies, matchResults, 'sector');
  const sizeRates = calculateMatchRates(companies, matchResults, 'employees');

  // Detect biases
  const flaggedBiases: BiasFlag[] = [
    ...detectBiases(regionalRates, 'geographic', threshold),
    ...detectBiases(sectorRates, 'sector', threshold),
    ...detectBiases(sizeRates, 'size', threshold),
  ];

  // Calculate overall variance score
  const allRates = [
    ...Array.from(regionalRates.values()),
    ...Array.from(sectorRates.values()),
    ...Array.from(sizeRates.values()),
  ].map(r => r.rate);

  const meanRate = allRates.reduce((a, b) => a + b, 0) / allRates.length;
  const variance = allRates.reduce((sum, rate) => sum + Math.pow(rate - meanRate, 2), 0) / allRates.length;
  const varianceScore = Math.sqrt(variance);

  const result: BiasTestResult = {
    test_id: testId,
    test_name: config.test_name,
    test_date: new Date().toISOString(),
    passed: flaggedBiases.filter(f => f.severity === 'high').length === 0,
    variance_score: varianceScore,
    flagged_biases: flaggedBiases,
    synthetic_companies: companies,
    model_version: 'mistral-small-latest',
    tester: config.tester,
  };

  // Store result in database
  try {
    await supabase.from('bias_test_results').insert({
      test_id: result.test_id,
      test_date: result.test_date,
      test_name: result.test_name,
      synthetic_companies: companies,
      subsidy_id: config.subsidy_id || null,
      passed: result.passed,
      variance_score: result.variance_score,
      flagged_biases: result.flagged_biases,
      model_version: result.model_version,
      tester: result.tester,
    });
  } catch (error) {
    console.error('Failed to store bias test result:', error);
  }

  return result;
}

/**
 * Get recent bias test results
 */
export async function getBiasTestResults(limit: number = 10): Promise<BiasTestResult[]> {
  const { data, error } = await supabase
    .from('bias_test_results')
    .select('*')
    .order('test_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch bias test results:', error);
    return [];
  }

  return data || [];
}

/**
 * Quick bias check - simplified version for regular monitoring
 */
export async function quickBiasCheck(): Promise<{
  status: 'pass' | 'warning' | 'fail';
  summary: string;
  lastTestDate?: string;
}> {
  const { data, error } = await supabase
    .from('bias_test_results')
    .select('test_date, passed, variance_score, flagged_biases')
    .order('test_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return {
      status: 'warning',
      summary: 'Aucun test de biais récent. Exécutez un test pour vérifier la conformité.',
    };
  }

  const daysSinceTest = Math.floor(
    (Date.now() - new Date(data.test_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceTest > 30) {
    return {
      status: 'warning',
      summary: `Dernier test il y a ${daysSinceTest} jours. Un nouveau test est recommandé.`,
      lastTestDate: data.test_date,
    };
  }

  if (!data.passed) {
    const highSeverity = (data.flagged_biases as BiasFlag[])?.filter(f => f.severity === 'high').length || 0;
    return {
      status: 'fail',
      summary: `${highSeverity} biais critiques détectés. Action corrective requise.`,
      lastTestDate: data.test_date,
    };
  }

  return {
    status: 'pass',
    summary: `Dernier test réussi (variance: ${(data.variance_score * 100).toFixed(1)}%)`,
    lastTestDate: data.test_date,
  };
}
