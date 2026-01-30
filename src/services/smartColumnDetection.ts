/**
 * Smart Column Detection Service
 *
 * Detects column types by analyzing ACTUAL DATA CONTENT, not just headers.
 * This is much smarter than header-only matching.
 *
 * Detects: emails, websites, SIRET/SIREN, phone numbers, postal codes, dates, etc.
 */

import { RawImportRow, ColumnMappingItem } from '@/types/bulkImport';

export type DetectedDataType =
  | 'email'
  | 'website'
  | 'phone'
  | 'siret'
  | 'siren'
  | 'postal_code'
  | 'date'
  | 'number'
  | 'text'
  | 'unknown';

export interface ContentAnalysis {
  column: string;
  detectedType: DetectedDataType;
  confidence: number;
  suggestedField: string;
  matchedPatterns: string[];
  sampleMatches: string[];
}

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

const PATTERNS = {
  // Email: contains @ and domain
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,

  // Website: http/https, www, or domain pattern
  website: /^(https?:\/\/|www\.|[a-z0-9-]+\.(com|fr|org|net|io|eu|co|dev|app|tech|shop|store|online|site|pro))/i,

  // SIRET: exactly 14 digits (with optional spaces/dashes)
  siret: /^\s*\d[\d\s\-\.]{12,16}\d\s*$/,
  siret_clean: /^\d{14}$/,

  // SIREN: exactly 9 digits (with optional spaces/dashes)
  siren: /^\s*\d[\d\s\-\.]{7,10}\d\s*$/,
  siren_clean: /^\d{9}$/,

  // French phone: starts with 0, +33, or 33, followed by 9 digits
  phone_fr: /^(\+?33|0)\s*[1-9][\d\s\.\-]{7,14}$/,

  // French postal code: 5 digits, starts with 0-9 (not 00)
  postal_code_fr: /^(0[1-9]|[1-8]\d|9[0-5]|97[1-6])\d{3}$/,

  // Date: various formats
  date_iso: /^\d{4}[-/]\d{2}[-/]\d{2}$/,
  date_fr: /^\d{2}[-/]\d{2}[-/]\d{4}$/,
  date_year: /^(19|20)\d{2}$/,

  // Number/Currency
  number: /^-?[\d\s,\.]+[€$]?$/,
  currency: /^[\d\s,\.]+\s*(€|EUR|euros?|k€|M€)$/i,

  // NAF code: 4 digits + 1 letter
  naf: /^\d{2}\.?\d{2}[A-Z]$/i,

  // RNA (Association number): W + 9 digits
  rna: /^W\d{9}$/i,

  // LinkedIn URL
  linkedin: /linkedin\.com\/(in|company)\//i,
};

// ============================================================================
// CONTENT ANALYSIS
// ============================================================================

/**
 * Analyze a single value to detect its type
 */
function detectValueType(value: any): { type: DetectedDataType; pattern: string } | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Check each pattern in priority order

  // Email (high priority - very distinctive)
  if (PATTERNS.email.test(str)) {
    return { type: 'email', pattern: 'email' };
  }

  // Website (check before generic text)
  if (PATTERNS.website.test(str) || PATTERNS.linkedin.test(str)) {
    return { type: 'website', pattern: 'website' };
  }

  // SIRET (14 digits)
  const cleanedForSiret = str.replace(/[\s\-\.]/g, '');
  if (PATTERNS.siret_clean.test(cleanedForSiret)) {
    return { type: 'siret', pattern: 'siret_14_digits' };
  }

  // SIREN (9 digits) - only if exactly 9, not 14
  if (PATTERNS.siren_clean.test(cleanedForSiret) && cleanedForSiret.length === 9) {
    return { type: 'siren', pattern: 'siren_9_digits' };
  }

  // RNA (Association)
  if (PATTERNS.rna.test(str)) {
    return { type: 'text', pattern: 'rna_number' };
  }

  // NAF Code
  if (PATTERNS.naf.test(str.replace(/[\s\.]/g, ''))) {
    return { type: 'text', pattern: 'naf_code' };
  }

  // French phone number
  if (PATTERNS.phone_fr.test(str)) {
    return { type: 'phone', pattern: 'phone_fr' };
  }

  // French postal code (5 digits, valid range)
  if (PATTERNS.postal_code_fr.test(str)) {
    return { type: 'postal_code', pattern: 'postal_code_fr' };
  }

  // Dates
  if (PATTERNS.date_iso.test(str) || PATTERNS.date_fr.test(str)) {
    return { type: 'date', pattern: 'date' };
  }

  if (PATTERNS.date_year.test(str)) {
    return { type: 'date', pattern: 'year_only' };
  }

  // Numbers/Currency
  if (PATTERNS.currency.test(str)) {
    return { type: 'number', pattern: 'currency' };
  }

  if (PATTERNS.number.test(str) && !isNaN(parseFloat(str.replace(/[\s,]/g, '').replace(',', '.')))) {
    return { type: 'number', pattern: 'number' };
  }

  return { type: 'text', pattern: 'text' };
}

/**
 * Analyze a column by sampling its values
 */
export function analyzeColumnContent(
  columnName: string,
  values: any[],
  sampleSize: number = 20
): ContentAnalysis {
  // Sample values (skip empty)
  const nonEmptyValues = values
    .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
    .slice(0, sampleSize);

  if (nonEmptyValues.length === 0) {
    return {
      column: columnName,
      detectedType: 'unknown',
      confidence: 0,
      suggestedField: '_skip',
      matchedPatterns: [],
      sampleMatches: [],
    };
  }

  // Analyze each value
  const typeCount: Record<string, { count: number; samples: string[] }> = {};

  for (const value of nonEmptyValues) {
    const result = detectValueType(value);
    if (result) {
      const key = result.type;
      if (!typeCount[key]) {
        typeCount[key] = { count: 0, samples: [] };
      }
      typeCount[key].count++;
      if (typeCount[key].samples.length < 3) {
        typeCount[key].samples.push(String(value).substring(0, 50));
      }
    }
  }

  // Find dominant type
  let bestType: DetectedDataType = 'text';
  let bestCount = 0;
  let bestSamples: string[] = [];

  for (const [type, data] of Object.entries(typeCount)) {
    if (data.count > bestCount) {
      bestCount = data.count;
      bestType = type as DetectedDataType;
      bestSamples = data.samples;
    }
  }

  // Calculate confidence (% of values matching the type)
  const confidence = nonEmptyValues.length > 0 ? bestCount / nonEmptyValues.length : 0;

  // Map detected type to suggested field
  const suggestedField = mapTypeToField(bestType, columnName);

  return {
    column: columnName,
    detectedType: bestType,
    confidence,
    suggestedField,
    matchedPatterns: Object.keys(typeCount),
    sampleMatches: bestSamples,
  };
}

/**
 * Map detected data type to profile field
 */
function mapTypeToField(type: DetectedDataType, columnName: string): string {
  const nameLower = columnName.toLowerCase();

  switch (type) {
    case 'email':
      return 'email';

    case 'website':
      // Check if it's specifically LinkedIn
      if (nameLower.includes('linkedin')) {
        return '_skip'; // We don't have a LinkedIn field yet
      }
      return 'website_url';

    case 'phone':
      return 'phone';

    case 'siret':
      return 'siret';

    case 'siren':
      return 'siren';

    case 'postal_code':
      return 'postal_code';

    case 'date':
      // Try to guess from column name
      if (nameLower.includes('créa') || nameLower.includes('crea') || nameLower.includes('found')) {
        return 'year_created';
      }
      return '_skip';

    case 'number':
      // Try to guess from column name
      if (nameLower.includes('ca') || nameLower.includes('chiffre') || nameLower.includes('revenue')) {
        return 'annual_turnover';
      }
      if (nameLower.includes('effectif') || nameLower.includes('employe') || nameLower.includes('salar')) {
        return 'employees';
      }
      return '_skip';

    default:
      return '_skip';
  }
}

/**
 * Analyze all columns in the dataset
 */
export function analyzeAllColumns(rows: RawImportRow[]): ContentAnalysis[] {
  if (rows.length === 0) return [];

  const columns = Object.keys(rows[0].rawData);
  const analyses: ContentAnalysis[] = [];

  for (const column of columns) {
    const values = rows.map(row => row.rawData[column]);
    const analysis = analyzeColumnContent(column, values);
    analyses.push(analysis);
  }

  return analyses;
}

/**
 * Enhance column mappings with content-based detection
 * Combines header-based detection with content analysis
 */
export function enhanceMappingsWithContentDetection(
  headerMappings: ColumnMappingItem[],
  rows: RawImportRow[]
): ColumnMappingItem[] {
  const contentAnalyses = analyzeAllColumns(rows);
  const contentMap = new Map(contentAnalyses.map(a => [a.column, a]));

  return headerMappings.map(mapping => {
    const content = contentMap.get(mapping.sourceColumn);

    // If header detection failed or has low confidence, try content detection
    if (
      (mapping.targetField === '_skip' || mapping.confidence === 'low') &&
      content &&
      content.confidence >= 0.7 &&
      content.suggestedField !== '_skip'
    ) {
      return {
        ...mapping,
        targetField: content.suggestedField,
        confidence: content.confidence >= 0.9 ? 'high' : 'medium',
        sampleValues: content.sampleMatches,
      };
    }

    // If header says email/website but content disagrees, trust content
    if (
      content &&
      content.confidence >= 0.8 &&
      mapping.confidence !== 'high'
    ) {
      // Only override if content detection is very confident
      if (content.detectedType === 'email' && mapping.targetField !== 'email') {
        return {
          ...mapping,
          targetField: 'email',
          confidence: 'high',
          sampleValues: content.sampleMatches,
        };
      }
      if (content.detectedType === 'website' && mapping.targetField !== 'website_url') {
        return {
          ...mapping,
          targetField: 'website_url',
          confidence: 'high',
          sampleValues: content.sampleMatches,
        };
      }
      if (content.detectedType === 'siret' && mapping.targetField !== 'siret') {
        return {
          ...mapping,
          targetField: 'siret',
          confidence: 'high',
          sampleValues: content.sampleMatches,
        };
      }
      if (content.detectedType === 'siren' && mapping.targetField !== 'siren') {
        return {
          ...mapping,
          targetField: 'siren',
          confidence: 'high',
          sampleValues: content.sampleMatches,
        };
      }
      if (content.detectedType === 'phone' && mapping.targetField !== 'phone') {
        return {
          ...mapping,
          targetField: 'phone',
          confidence: 'medium',
          sampleValues: content.sampleMatches,
        };
      }
      if (content.detectedType === 'postal_code' && mapping.targetField !== 'postal_code') {
        return {
          ...mapping,
          targetField: 'postal_code',
          confidence: 'high',
          sampleValues: content.sampleMatches,
        };
      }
    }

    return mapping;
  });
}

/**
 * Get detection summary for display
 */
export function getDetectionSummary(analyses: ContentAnalysis[]): {
  autoDetected: number;
  emails: number;
  websites: number;
  sirets: number;
  phones: number;
} {
  return {
    autoDetected: analyses.filter(a => a.confidence >= 0.7 && a.detectedType !== 'text' && a.detectedType !== 'unknown').length,
    emails: analyses.filter(a => a.detectedType === 'email' && a.confidence >= 0.7).length,
    websites: analyses.filter(a => a.detectedType === 'website' && a.confidence >= 0.7).length,
    sirets: analyses.filter(a => (a.detectedType === 'siret' || a.detectedType === 'siren') && a.confidence >= 0.7).length,
    phones: analyses.filter(a => a.detectedType === 'phone' && a.confidence >= 0.7).length,
  };
}
