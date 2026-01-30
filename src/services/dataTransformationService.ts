/**
 * Data Transformation Service for Bulk Import
 *
 * Utilities for normalizing, validating, and transforming imported data
 */

import { FRENCH_REGIONS } from '@/types';

// ============================================================================
// SIRET / SIREN VALIDATION
// ============================================================================

/**
 * Normalize SIRET (remove spaces, dashes, dots)
 */
export function normalizeSIRET(value: any): string | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[\s\-\.]/g, '');
  if (cleaned.length === 14 && /^\d{14}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

/**
 * Normalize SIREN (remove spaces, dashes, dots)
 */
export function normalizeSIREN(value: any): string | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[\s\-\.]/g, '');
  if (cleaned.length === 9 && /^\d{9}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

/**
 * Extract SIREN from SIRET
 */
export function extractSIREN(siret: string): string {
  return siret.substring(0, 9);
}

/**
 * Validate SIRET with Luhn algorithm
 */
export function isValidSIRET(siret: string): boolean {
  if (!siret || siret.length !== 14 || !/^\d{14}$/.test(siret)) {
    return false;
  }

  // Luhn algorithm for SIRET
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(siret[i], 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Validate SIREN with Luhn algorithm
 */
export function isValidSIREN(siren: string): boolean {
  if (!siren || siren.length !== 9 || !/^\d{9}$/.test(siren)) {
    return false;
  }

  // Luhn algorithm for SIREN
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(siren[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// ============================================================================
// EMAIL / URL VALIDATION
// ============================================================================

/**
 * Validate and normalize email address
 */
export function validateEmail(value: any): string | null {
  if (!value) return null;
  const email = String(value).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : null;
}

/**
 * Validate and normalize URL
 */
export function validateUrl(value: any): string | null {
  if (!value) return null;
  let url = String(value).trim();

  // Add https:// if no protocol
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const parsed = new URL(url);
    return parsed.href;
  } catch {
    return null;
  }
}

// ============================================================================
// REGION / DEPARTMENT MAPPING
// ============================================================================

// Map department codes to regions
const DEPARTMENT_TO_REGION: Record<string, string> = {
  // Auvergne-Rhône-Alpes
  '01': 'Auvergne-Rhône-Alpes', '03': 'Auvergne-Rhône-Alpes', '07': 'Auvergne-Rhône-Alpes',
  '15': 'Auvergne-Rhône-Alpes', '26': 'Auvergne-Rhône-Alpes', '38': 'Auvergne-Rhône-Alpes',
  '42': 'Auvergne-Rhône-Alpes', '43': 'Auvergne-Rhône-Alpes', '63': 'Auvergne-Rhône-Alpes',
  '69': 'Auvergne-Rhône-Alpes', '73': 'Auvergne-Rhône-Alpes', '74': 'Auvergne-Rhône-Alpes',
  // Bourgogne-Franche-Comté
  '21': 'Bourgogne-Franche-Comté', '25': 'Bourgogne-Franche-Comté', '39': 'Bourgogne-Franche-Comté',
  '58': 'Bourgogne-Franche-Comté', '70': 'Bourgogne-Franche-Comté', '71': 'Bourgogne-Franche-Comté',
  '89': 'Bourgogne-Franche-Comté', '90': 'Bourgogne-Franche-Comté',
  // Bretagne
  '22': 'Bretagne', '29': 'Bretagne', '35': 'Bretagne', '56': 'Bretagne',
  // Centre-Val de Loire
  '18': 'Centre-Val de Loire', '28': 'Centre-Val de Loire', '36': 'Centre-Val de Loire',
  '37': 'Centre-Val de Loire', '41': 'Centre-Val de Loire', '45': 'Centre-Val de Loire',
  // Corse
  '2A': 'Corse', '2B': 'Corse', '20': 'Corse',
  // Grand Est
  '08': 'Grand Est', '10': 'Grand Est', '51': 'Grand Est', '52': 'Grand Est',
  '54': 'Grand Est', '55': 'Grand Est', '57': 'Grand Est', '67': 'Grand Est',
  '68': 'Grand Est', '88': 'Grand Est',
  // Guadeloupe
  '971': 'Guadeloupe',
  // Guyane
  '973': 'Guyane',
  // Hauts-de-France
  '02': 'Hauts-de-France', '59': 'Hauts-de-France', '60': 'Hauts-de-France',
  '62': 'Hauts-de-France', '80': 'Hauts-de-France',
  // Île-de-France
  '75': 'Île-de-France', '77': 'Île-de-France', '78': 'Île-de-France',
  '91': 'Île-de-France', '92': 'Île-de-France', '93': 'Île-de-France',
  '94': 'Île-de-France', '95': 'Île-de-France',
  // La Réunion
  '974': 'La Réunion',
  // Martinique
  '972': 'Martinique',
  // Mayotte
  '976': 'Mayotte',
  // Normandie
  '14': 'Normandie', '27': 'Normandie', '50': 'Normandie',
  '61': 'Normandie', '76': 'Normandie',
  // Nouvelle-Aquitaine
  '16': 'Nouvelle-Aquitaine', '17': 'Nouvelle-Aquitaine', '19': 'Nouvelle-Aquitaine',
  '23': 'Nouvelle-Aquitaine', '24': 'Nouvelle-Aquitaine', '33': 'Nouvelle-Aquitaine',
  '40': 'Nouvelle-Aquitaine', '47': 'Nouvelle-Aquitaine', '64': 'Nouvelle-Aquitaine',
  '79': 'Nouvelle-Aquitaine', '86': 'Nouvelle-Aquitaine', '87': 'Nouvelle-Aquitaine',
  // Occitanie
  '09': 'Occitanie', '11': 'Occitanie', '12': 'Occitanie', '30': 'Occitanie',
  '31': 'Occitanie', '32': 'Occitanie', '34': 'Occitanie', '46': 'Occitanie',
  '48': 'Occitanie', '65': 'Occitanie', '66': 'Occitanie', '81': 'Occitanie', '82': 'Occitanie',
  // Pays de la Loire
  '44': 'Pays de la Loire', '49': 'Pays de la Loire', '53': 'Pays de la Loire',
  '72': 'Pays de la Loire', '85': 'Pays de la Loire',
  // Provence-Alpes-Côte d'Azur
  '04': "Provence-Alpes-Côte d'Azur", '05': "Provence-Alpes-Côte d'Azur",
  '06': "Provence-Alpes-Côte d'Azur", '13': "Provence-Alpes-Côte d'Azur",
  '83': "Provence-Alpes-Côte d'Azur", '84': "Provence-Alpes-Côte d'Azur",
};

/**
 * Extract department code from postal code
 */
export function extractDepartment(postalCode: string | null): string | null {
  if (!postalCode) return null;
  const cleaned = String(postalCode).replace(/\s/g, '');

  // Overseas territories (3-digit)
  if (/^97\d/.test(cleaned)) {
    return cleaned.substring(0, 3);
  }

  // Corsica (2A, 2B)
  if (cleaned.startsWith('20')) {
    const prefix = parseInt(cleaned.substring(0, 3), 10);
    if (prefix >= 200 && prefix <= 201) return '2A';
    if (prefix >= 202 && prefix <= 209) return '2B';
    return '20';
  }

  // Metropolitan France (2-digit)
  if (/^\d{5}$/.test(cleaned)) {
    return cleaned.substring(0, 2);
  }

  return null;
}

/**
 * Get region from postal code
 */
export function getRegionFromPostalCode(postalCode: string | null): string | null {
  const dept = extractDepartment(postalCode);
  if (!dept) return null;
  return DEPARTMENT_TO_REGION[dept] || null;
}

/**
 * Standardize region name to match FRENCH_REGIONS
 */
export function standardizeRegion(value: any): string | null {
  if (!value) return null;
  const input = String(value).trim().toLowerCase();

  // Direct match (case-insensitive)
  const match = FRENCH_REGIONS.find(r => r.toLowerCase() === input);
  if (match) return match;

  // Common variations
  const variations: Record<string, string> = {
    'idf': 'Île-de-France',
    'ile de france': 'Île-de-France',
    'ile-de-france': 'Île-de-France',
    'paca': "Provence-Alpes-Côte d'Azur",
    'provence alpes cote d\'azur': "Provence-Alpes-Côte d'Azur",
    'provence-alpes-cote-d\'azur': "Provence-Alpes-Côte d'Azur",
    'aura': 'Auvergne-Rhône-Alpes',
    'rhone alpes': 'Auvergne-Rhône-Alpes',
    'auvergne': 'Auvergne-Rhône-Alpes',
    'grand-est': 'Grand Est',
    'alsace': 'Grand Est',
    'lorraine': 'Grand Est',
    'champagne': 'Grand Est',
    'hdf': 'Hauts-de-France',
    'hauts de france': 'Hauts-de-France',
    'nord pas de calais': 'Hauts-de-France',
    'picardie': 'Hauts-de-France',
    'bfc': 'Bourgogne-Franche-Comté',
    'bourgogne': 'Bourgogne-Franche-Comté',
    'franche comte': 'Bourgogne-Franche-Comté',
    'cvl': 'Centre-Val de Loire',
    'centre': 'Centre-Val de Loire',
    'pdl': 'Pays de la Loire',
    'pays de loire': 'Pays de la Loire',
    'na': 'Nouvelle-Aquitaine',
    'nouvelle aquitaine': 'Nouvelle-Aquitaine',
    'aquitaine': 'Nouvelle-Aquitaine',
    'limousin': 'Nouvelle-Aquitaine',
    'poitou charentes': 'Nouvelle-Aquitaine',
  };

  return variations[input] || null;
}

// ============================================================================
// SECTOR / NAF CODE MAPPING
// ============================================================================

// Map NAF sections to sectors
const NAF_TO_SECTOR: Record<string, string> = {
  'A': 'agriculture',
  'B': 'industrie',
  'C': 'industrie',
  'D': 'environnement',
  'E': 'environnement',
  'F': 'construction',
  'G': 'commerce',
  'H': 'transport',
  'I': 'tourisme',
  'J': 'tech',
  'K': 'finance',
  'L': 'immobilier',
  'M': 'services',
  'N': 'services',
  'O': 'services',
  'P': 'education',
  'Q': 'sante',
  'R': 'culture',
  'S': 'services',
};

/**
 * Get sector from NAF code
 */
export function getSectorFromNAF(nafCode: string | null): string | null {
  if (!nafCode) return null;
  const section = nafCode.charAt(0).toUpperCase();
  return NAF_TO_SECTOR[section] || null;
}

/**
 * Normalize NAF code format
 */
export function normalizeNAF(value: any): string | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[\s\-\.]/g, '').toUpperCase();
  // NAF codes are 4 digits + 1 letter (e.g., "6201Z")
  if (/^\d{4}[A-Z]$/.test(cleaned)) {
    return cleaned;
  }
  // Sometimes written as "62.01Z"
  if (/^\d{2}\.\d{2}[A-Z]$/.test(cleaned)) {
    return cleaned.replace('.', '');
  }
  return null;
}

// ============================================================================
// COMPANY SIZE CATEGORIZATION
// ============================================================================

/**
 * Calculate company size category from employee count
 */
export function calculateCompanySizeCategory(employees: any): 'TPE' | 'PME' | 'ETI' | 'GE' | null {
  if (!employees) return null;

  const value = String(employees).toLowerCase();

  // Parse range formats like "1-10", "11-50", etc.
  const rangeMatch = value.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) {
    const max = parseInt(rangeMatch[2], 10);
    if (max <= 10) return 'TPE';
    if (max <= 250) return 'PME';
    if (max <= 5000) return 'ETI';
    return 'GE';
  }

  // Parse single number
  const numMatch = value.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num <= 10) return 'TPE';
    if (num <= 250) return 'PME';
    if (num <= 5000) return 'ETI';
    return 'GE';
  }

  // Parse text descriptions
  if (value.includes('tpe') || value.includes('micro')) return 'TPE';
  if (value.includes('pme') || value.includes('petite')) return 'PME';
  if (value.includes('eti') || value.includes('intermédiaire')) return 'ETI';
  if (value.includes('grande') || value.includes('ge')) return 'GE';

  return null;
}

/**
 * Normalize employee count to standard format
 */
export function normalizeEmployeeCount(value: any): string | null {
  if (!value) return null;

  const str = String(value).toLowerCase().trim();

  // Map common formats to standard ranges
  const mappings: Record<string, string> = {
    '0': '1-10',
    '1': '1-10',
    '1-9': '1-10',
    '1-10': '1-10',
    '10-49': '11-50',
    '11-50': '11-50',
    '50-249': '51-250',
    '51-250': '51-250',
    '250-499': '250+',
    '250+': '250+',
    '500+': '250+',
  };

  // Try direct mapping
  for (const [key, result] of Object.entries(mappings)) {
    if (str === key || str.replace(/\s/g, '') === key) {
      return result;
    }
  }

  // Parse numeric value
  const num = parseInt(str.replace(/[^\d]/g, ''), 10);
  if (!isNaN(num)) {
    if (num <= 10) return '1-10';
    if (num <= 50) return '11-50';
    if (num <= 250) return '51-250';
    return '250+';
  }

  return null;
}

// ============================================================================
// LEGAL FORM MAPPING
// ============================================================================

/**
 * Standardize legal form to match LEGAL_FORMS values
 */
export function standardizeLegalForm(value: any): string | null {
  if (!value) return null;
  const input = String(value).toUpperCase().trim();

  // Direct matches
  const forms = ['SARL', 'SAS', 'SASU', 'EURL', 'SA', 'SCI', 'EI', 'MICRO', 'ASSO', 'COOP', 'FONDATION'];
  if (forms.includes(input)) return input;

  // Common variations
  const variations: Record<string, string> = {
    'SOCIETE A RESPONSABILITE LIMITEE': 'SARL',
    'SOCIÉTÉ À RESPONSABILITÉ LIMITÉE': 'SARL',
    'SOCIETE PAR ACTIONS SIMPLIFIEE': 'SAS',
    'SOCIÉTÉ PAR ACTIONS SIMPLIFIÉE': 'SAS',
    'SOCIETE PAR ACTIONS SIMPLIFIEE UNIPERSONNELLE': 'SASU',
    'SOCIÉTÉ PAR ACTIONS SIMPLIFIÉE UNIPERSONNELLE': 'SASU',
    'ENTREPRISE UNIPERSONNELLE A RESPONSABILITE LIMITEE': 'EURL',
    'SOCIETE ANONYME': 'SA',
    'SOCIETE CIVILE IMMOBILIERE': 'SCI',
    'ENTREPRISE INDIVIDUELLE': 'EI',
    'AUTO-ENTREPRENEUR': 'MICRO',
    'AUTOENTREPRENEUR': 'MICRO',
    'MICRO-ENTREPRISE': 'MICRO',
    'ASSOCIATION LOI 1901': 'ASSO',
    'ASSOCIATION': 'ASSO',
    'COOPERATIVE': 'COOP',
    'SCOP': 'COOP',
  };

  return variations[input] || 'OTHER';
}

// ============================================================================
// ARRAY PARSING
// ============================================================================

/**
 * Parse comma/semicolon separated values into array
 */
export function parseArrayValue(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);

  return String(value)
    .split(/[,;|]/)
    .map(v => v.trim())
    .filter(Boolean);
}

// ============================================================================
// NUMBER PARSING
// ============================================================================

/**
 * Parse turnover value (handles k€, M€, etc.)
 */
export function parseTurnover(value: any): number | null {
  if (!value) return null;
  const str = String(value).toLowerCase().replace(/\s/g, '');

  // Remove currency symbols
  const cleaned = str.replace(/[€$]/g, '');

  // Handle M€ / millions
  if (cleaned.includes('m') || cleaned.includes('million')) {
    const num = parseFloat(cleaned.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(num)) return num * 1000000;
  }

  // Handle k€ / thousands
  if (cleaned.includes('k') || cleaned.includes('000')) {
    const num = parseFloat(cleaned.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!isNaN(num)) return num * 1000;
  }

  // Plain number
  const num = parseFloat(cleaned.replace(/[^\d.,]/g, '').replace(',', '.'));
  return isNaN(num) ? null : num;
}

/**
 * Parse year value
 */
export function parseYear(value: any): number | null {
  if (!value) return null;
  const str = String(value).trim();

  // Extract 4-digit year
  const match = str.match(/\b(19|20)\d{2}\b/);
  if (match) {
    const year = parseInt(match[0], 10);
    if (year >= 1900 && year <= new Date().getFullYear()) {
      return year;
    }
  }

  return null;
}

// ============================================================================
// PHONE NUMBER NORMALIZATION
// ============================================================================

/**
 * Normalize French phone number
 */
export function normalizePhoneNumber(value: any): string | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[\s\-\.]/g, '');

  // French phone formats
  // 0612345678 -> 06 12 34 56 78
  // +33612345678 -> +33 6 12 34 56 78
  // 33612345678 -> +33 6 12 34 56 78

  if (/^0[1-9]\d{8}$/.test(cleaned)) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  if (/^\+33[1-9]\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  if (/^33[1-9]\d{8}$/.test(cleaned)) {
    return '+' + cleaned;
  }

  return cleaned; // Return as-is if format not recognized
}
