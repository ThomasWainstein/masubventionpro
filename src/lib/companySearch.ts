/**
 * Company Search Service
 * Uses the free public API "Recherche d'entreprises" from the French government
 * https://recherche-entreprises.api.gouv.fr
 */

import { detectInputType } from './validation/siret';

export interface CompanyDirector {
  nom: string;
  prenoms: string;
  qualite: string;  // Role: Président, Directeur Général, etc.
  type: 'personne physique' | 'personne morale';
}

export interface CompanySearchResult {
  siren: string;
  siret: string;
  name: string;
  legalForm: string;
  nafCode: string;
  nafLabel: string;
  sector: string;  // Mapped from NAF code to our sector values
  address: string;
  postalCode: string;
  city: string;
  region: string;
  department: string;
  employeeRange: string;
  creationDate: string;
  isActive: boolean;
  companyCategory: string;
  // New fields
  conventionCollective: string[];  // IDCC codes (e.g., ["7024"])
  dirigeants: CompanyDirector[];   // Company directors/managers
  nombreEtablissements: number;    // Total number of establishments
  nombreEtablissementsOuverts: number;  // Number of active establishments
  capitalSocial?: number | null;   // Capital social in euros (fetched from Annuaire)
}

interface APIDirector {
  nom?: string;
  prenoms?: string;
  qualite?: string;
  type_dirigeant?: string;
}

interface APIResult {
  siren: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  nature_juridique?: string;
  activite_principale?: string;
  libelle_activite_principale?: string;
  categorie_entreprise?: string;
  tranche_effectif_salarie?: string;
  caractere_employeur?: string;  // "O" = has employees, "N" = no employees
  date_creation?: string;
  etat_administratif?: string;
  nombre_etablissements?: number;
  nombre_etablissements_ouverts?: number;
  dirigeants?: APIDirector[];
  siege?: {
    siret?: string;
    adresse?: string;
    code_postal?: string;
    libelle_commune?: string;
    region?: string;
    departement?: string;
    caractere_employeur?: string;  // "O" = has employees, "N" = no employees
    liste_idcc?: string[];
  };
  complements?: {
    liste_idcc?: string[];
  };
  matching_etablissements?: Array<{
    siret?: string;
    adresse?: string;
    code_postal?: string;
    libelle_commune?: string;
  }>;
}

/**
 * Map department codes (first 2 digits of postal code) to French regions
 * Based on the 2016 regional reform
 */
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
  // Hauts-de-France
  '02': 'Hauts-de-France', '59': 'Hauts-de-France', '60': 'Hauts-de-France',
  '62': 'Hauts-de-France', '80': 'Hauts-de-France',
  // Île-de-France
  '75': 'Île-de-France', '77': 'Île-de-France', '78': 'Île-de-France',
  '91': 'Île-de-France', '92': 'Île-de-France', '93': 'Île-de-France',
  '94': 'Île-de-France', '95': 'Île-de-France',
  // Normandie
  '14': 'Normandie', '27': 'Normandie', '50': 'Normandie', '61': 'Normandie', '76': 'Normandie',
  // Nouvelle-Aquitaine
  '16': 'Nouvelle-Aquitaine', '17': 'Nouvelle-Aquitaine', '19': 'Nouvelle-Aquitaine',
  '23': 'Nouvelle-Aquitaine', '24': 'Nouvelle-Aquitaine', '33': 'Nouvelle-Aquitaine',
  '40': 'Nouvelle-Aquitaine', '47': 'Nouvelle-Aquitaine', '64': 'Nouvelle-Aquitaine',
  '79': 'Nouvelle-Aquitaine', '86': 'Nouvelle-Aquitaine', '87': 'Nouvelle-Aquitaine',
  // Occitanie
  '09': 'Occitanie', '11': 'Occitanie', '12': 'Occitanie', '30': 'Occitanie',
  '31': 'Occitanie', '32': 'Occitanie', '34': 'Occitanie', '46': 'Occitanie',
  '48': 'Occitanie', '65': 'Occitanie', '66': 'Occitanie', '81': 'Occitanie',
  '82': 'Occitanie',
  // Pays de la Loire
  '44': 'Pays de la Loire', '49': 'Pays de la Loire', '53': 'Pays de la Loire',
  '72': 'Pays de la Loire', '85': 'Pays de la Loire',
  // Provence-Alpes-Côte d'Azur
  '04': "Provence-Alpes-Côte d'Azur", '05': "Provence-Alpes-Côte d'Azur",
  '06': "Provence-Alpes-Côte d'Azur", '13': "Provence-Alpes-Côte d'Azur",
  '83': "Provence-Alpes-Côte d'Azur", '84': "Provence-Alpes-Côte d'Azur",
  // DOM-TOM
  '971': 'Guadeloupe', '972': 'Martinique', '973': 'Guyane',
  '974': 'La Réunion', '976': 'Mayotte',
};

/**
 * Get region from postal code
 */
function getRegionFromPostalCode(postalCode: string): string {
  if (!postalCode) return '';

  // Handle DOM-TOM (3-digit department codes)
  if (postalCode.startsWith('97')) {
    const domCode = postalCode.substring(0, 3);
    return DEPARTMENT_TO_REGION[domCode] || '';
  }

  // Handle Corse
  if (postalCode.startsWith('20')) {
    // 20000-20199 is Corse-du-Sud (2A), 20200-20999 is Haute-Corse (2B)
    return 'Corse';
  }

  // Standard metropolitan France (2-digit department)
  const deptCode = postalCode.substring(0, 2);
  return DEPARTMENT_TO_REGION[deptCode] || '';
}

/**
 * Employee range codes mapped directly to our form values
 * These must match the EMPLOYEE_RANGES values in types/index.ts
 */
const EMPLOYEE_CODE_TO_VALUE: Record<string, string> = {
  'NN': '',           // Non renseigne
  '00': '1-10',       // Pas de salarie - default to smallest range
  '01': '1-10',       // 1-2 salaries
  '02': '1-10',       // 3-5 salaries
  '03': '1-10',       // 6-9 salaries
  '11': '11-50',      // 10-19 salaries
  '12': '11-50',      // 20-49 salaries
  '21': '51-250',     // 50-99 salaries
  '22': '51-250',     // 100-199 salaries
  '31': '51-250',     // 200-249 salaries
  '32': '250+',       // 250-499 salaries
  '41': '250+',       // 500-999 salaries
  '42': '250+',       // 1000-1999 salaries
  '51': '250+',       // 2000-4999 salaries
  '52': '250+',       // 5000-9999 salaries
  '53': '250+',       // 10000+ salaries
};

/**
 * Legal form codes (nature_juridique) mapped to our form values
 * INSEE codes: https://www.insee.fr/fr/information/2028129
 */
const LEGAL_FORM_CODE_TO_VALUE: Record<string, string> = {
  // Entrepreneur individuel
  '1000': 'EI',
  // EURL
  '5498': 'EURL',
  // SARL
  '5499': 'SARL',
  '5485': 'SARL',
  // SA
  '5505': 'SA',
  '5510': 'SA',
  '5515': 'SA',
  '5520': 'SA',
  '5522': 'SA',
  '5525': 'SA',
  '5530': 'SA',
  '5531': 'SA',
  '5532': 'SA',
  '5538': 'SA',
  '5539': 'SA',
  // SAS
  '5710': 'SAS',
  // SASU
  '5720': 'SASU',
  // SCI
  '6540': 'SCI',
  // Association
  '9210': 'ASSO',
  '9220': 'ASSO',
  '9221': 'ASSO',
  '9222': 'ASSO',
  '9223': 'ASSO',
  '9224': 'ASSO',
  '9230': 'ASSO',
  '9240': 'ASSO',
  // Auto-entrepreneur / Micro
  '1200': 'MICRO',
  '1300': 'MICRO',
};

/**
 * Get legal form value from INSEE code
 */
function getLegalFormValue(code: string): string {
  if (!code) return '';
  return LEGAL_FORM_CODE_TO_VALUE[code] || '';
}

/**
 * Get sector value from NAF code
 * NAF codes are in format like "4631Z" where first 2 digits indicate the division
 * Division numbers map to activity sectors (A-U)
 */
function getSectorFromNafCode(nafCode: string): string {
  if (!nafCode) return '';

  // Extract first two digits from NAF code (e.g., "4631Z" -> "46")
  const divisionMatch = nafCode.match(/^(\d{2})/);
  if (!divisionMatch) return '';

  const division = parseInt(divisionMatch[1], 10);

  // Map NAF divisions to our sector values
  // Based on INSEE NAF nomenclature
  if (division >= 1 && division <= 3) return 'agriculture';      // A - Agriculture
  if (division >= 5 && division <= 9) return 'industrie';        // B - Industries extractives
  if (division >= 10 && division <= 33) return 'industrie';      // C - Manufacturing
  if (division === 35) return 'environnement';                   // D - Electricity/gas
  if (division >= 36 && division <= 39) return 'environnement';  // E - Water/waste
  if (division >= 41 && division <= 43) return 'construction';   // F - Construction
  if (division >= 45 && division <= 47) return 'commerce';       // G - Commerce
  if (division >= 49 && division <= 53) return 'transport';      // H - Transport
  if (division >= 55 && division <= 56) return 'tourisme';       // I - Hospitality
  if (division >= 58 && division <= 63) return 'tech';           // J - Information/Comm
  if (division >= 64 && division <= 66) return 'finance';        // K - Finance
  if (division === 68) return 'immobilier';                      // L - Real estate
  if (division >= 69 && division <= 75) return 'services';       // M - Professional
  if (division >= 77 && division <= 82) return 'services';       // N - Administrative
  if (division === 84) return 'services';                        // O - Public admin
  if (division === 85) return 'education';                       // P - Education
  if (division >= 86 && division <= 88) return 'sante';          // Q - Health
  if (division >= 90 && division <= 93) return 'culture';        // R - Arts/Entertainment
  if (division >= 94 && division <= 96) return 'services';       // S - Other services
  if (division >= 97 && division <= 98) return 'services';       // T - Households
  if (division === 99) return 'services';                        // U - Extraterritorial

  return '';
}

/**
 * Convert API result to our CompanySearchResult format
 */
function transformResult(result: APIResult): CompanySearchResult {
  const siege = result.siege || {};
  const matching = result.matching_etablissements?.[0] || {};

  const postalCode = siege.code_postal || matching.code_postal || '';

  // Always derive region from postal code to get standardized names
  // The API's siege.region returns region codes (e.g., "76") not names
  const derivedRegion = getRegionFromPostalCode(postalCode);

  // Map employee code to our form values (1-10, 11-50, etc.)
  // Handle both string and number formats from API
  const rawEmployeeCode = result.tranche_effectif_salarie;
  const employeeCode = rawEmployeeCode !== undefined && rawEmployeeCode !== null
    ? String(rawEmployeeCode).padStart(2, '0')  // Ensure 2-digit format
    : 'NN';
  let employeeValue = EMPLOYEE_CODE_TO_VALUE[employeeCode] || '';

  // If employee range is unknown but company is an employer (caractere_employeur = "O"),
  // default to "1-10" since they have at least 1 employee
  if (!employeeValue) {
    const isEmployer = siege.caractere_employeur === 'O' || result.caractere_employeur === 'O';
    if (isEmployer) {
      employeeValue = '1-10';
    }
  }

  // Map legal form code to our form values (SAS, SARL, etc.)
  const legalFormCode = result.nature_juridique || '';
  const legalFormValue = getLegalFormValue(legalFormCode);

  // Map NAF code to sector value
  const nafCode = result.activite_principale || '';
  const sectorValue = getSectorFromNafCode(nafCode);

  // Get convention collective (IDCC) from siege or complements
  const conventionCollective = siege.liste_idcc || result.complements?.liste_idcc || [];

  // Map directors/managers
  const dirigeants: CompanySearchResult['dirigeants'] = (result.dirigeants || []).map(d => ({
    nom: d.nom || '',
    prenoms: d.prenoms || '',
    qualite: d.qualite || '',
    type: (d.type_dirigeant === 'personne morale' ? 'personne morale' : 'personne physique') as 'personne physique' | 'personne morale',
  }));

  return {
    siren: result.siren,
    siret: siege.siret || matching.siret || `${result.siren}00000`,
    name: result.nom_complet || result.nom_raison_sociale || '',
    legalForm: legalFormValue,
    nafCode,
    nafLabel: result.libelle_activite_principale || '',
    sector: sectorValue,
    address: siege.adresse || matching.adresse || '',
    postalCode,
    city: siege.libelle_commune || matching.libelle_commune || '',
    region: derivedRegion,
    department: siege.departement || postalCode.substring(0, 2) || '',
    employeeRange: employeeValue,
    conventionCollective,
    dirigeants,
    nombreEtablissements: result.nombre_etablissements || 0,
    nombreEtablissementsOuverts: result.nombre_etablissements_ouverts || 0,
    creationDate: result.date_creation || '',
    isActive: result.etat_administratif === 'A',
    companyCategory: result.categorie_entreprise || '',
  };
}

/**
 * Search for French companies using the public API
 *
 * @param query - Company name, SIREN, or SIRET
 * @param limit - Maximum number of results (default: 10)
 */
export async function searchCompanies(
  query: string,
  limit: number = 10
): Promise<CompanySearchResult[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  const trimmedQuery = query.trim();
  const inputType = detectInputType(trimmedQuery);

  try {
    // Build URL based on input type
    let url: string;

    if (inputType === 'siret') {
      // Search by SIRET - extract SIREN (first 9 digits)
      const siren = trimmedQuery.substring(0, 9);
      url = `https://recherche-entreprises.api.gouv.fr/search?q=${siren}&per_page=${limit}`;
    } else if (inputType === 'siren') {
      // Search by SIREN
      url = `https://recherche-entreprises.api.gouv.fr/search?q=${trimmedQuery}&per_page=${limit}`;
    } else {
      // Search by company name
      const encodedQuery = encodeURIComponent(trimmedQuery);
      url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodedQuery}&per_page=${limit}`;
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map(transformResult);
  } catch (error) {
    console.error('Company search failed:', error);
    throw error;
  }
}

/**
 * Get detailed company information by SIREN
 */
export async function getCompanyBySiren(siren: string): Promise<CompanySearchResult | null> {
  const cleanedSiren = siren.replace(/\s/g, '');

  if (cleanedSiren.length !== 9) {
    return null;
  }

  try {
    const results = await searchCompanies(cleanedSiren, 1);
    return results[0] || null;
  } catch (error) {
    console.error('Company lookup failed:', error);
    return null;
  }
}

/**
 * Get detailed company information by SIRET
 */
export async function getCompanyBySiret(siret: string): Promise<CompanySearchResult | null> {
  const cleanedSiret = siret.replace(/\s/g, '');

  if (cleanedSiret.length !== 14) {
    return null;
  }

  const siren = cleanedSiret.substring(0, 9);
  return getCompanyBySiren(siren);
}

/**
 * Fetch capital social for a company by SIREN
 * This calls a Supabase Edge Function that scrapes the Annuaire des Entreprises page
 * since the capital social data is not available in the free API
 *
 * @param siren - The 9-digit SIREN number
 * @returns The capital social in euros, or null if not found
 */
export async function fetchCapitalSocial(siren: string): Promise<number | null> {
  const cleanedSiren = siren.replace(/\s/g, '');

  if (!/^\d{9}$/.test(cleanedSiren)) {
    console.warn('[fetchCapitalSocial] Invalid SIREN format:', siren);
    return null;
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('[fetchCapitalSocial] Missing SUPABASE_URL');
      return null;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-company-capital`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ siren: cleanedSiren }),
    });

    if (!response.ok) {
      console.warn('[fetchCapitalSocial] Edge function returned:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.success && data.capitalSocial) {
      console.log(`[fetchCapitalSocial] Found capital social: ${data.capitalSocial}€`);
      return data.capitalSocial;
    }

    return null;
  } catch (error) {
    console.warn('[fetchCapitalSocial] Failed to fetch capital social:', error);
    return null;
  }
}
