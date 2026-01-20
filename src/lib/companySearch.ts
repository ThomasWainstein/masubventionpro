/**
 * Company Search Service
 * Uses the free public API "Recherche d'entreprises" from the French government
 * https://recherche-entreprises.api.gouv.fr
 */

import { detectInputType } from './validation/siret';

export interface CompanySearchResult {
  siren: string;
  siret: string;
  name: string;
  legalForm: string;
  nafCode: string;
  nafLabel: string;
  address: string;
  postalCode: string;
  city: string;
  region: string;
  department: string;
  employeeRange: string;
  creationDate: string;
  isActive: boolean;
  companyCategory: string;
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
  date_creation?: string;
  etat_administratif?: string;
  siege?: {
    siret?: string;
    adresse?: string;
    code_postal?: string;
    libelle_commune?: string;
    region?: string;
    departement?: string;
  };
  matching_etablissements?: Array<{
    siret?: string;
    adresse?: string;
    code_postal?: string;
    libelle_commune?: string;
  }>;
}

/**
 * Employee range codes to human-readable labels
 */
const EMPLOYEE_RANGES: Record<string, string> = {
  'NN': 'Non renseigne',
  '00': 'Pas de salarie',
  '01': '1-2 salaries',
  '02': '3-5 salaries',
  '03': '6-9 salaries',
  '11': '10-19 salaries',
  '12': '20-49 salaries',
  '21': '50-99 salaries',
  '22': '100-199 salaries',
  '31': '200-249 salaries',
  '32': '250-499 salaries',
  '41': '500-999 salaries',
  '42': '1000-1999 salaries',
  '51': '2000-4999 salaries',
  '52': '5000-9999 salaries',
  '53': '10000+ salaries'
};

/**
 * Convert API result to our CompanySearchResult format
 */
function transformResult(result: APIResult): CompanySearchResult {
  const siege = result.siege || {};
  const matching = result.matching_etablissements?.[0] || {};

  return {
    siren: result.siren,
    siret: siege.siret || matching.siret || `${result.siren}00000`,
    name: result.nom_complet || result.nom_raison_sociale || '',
    legalForm: result.nature_juridique || '',
    nafCode: result.activite_principale || '',
    nafLabel: result.libelle_activite_principale || '',
    address: siege.adresse || matching.adresse || '',
    postalCode: siege.code_postal || matching.code_postal || '',
    city: siege.libelle_commune || matching.libelle_commune || '',
    region: siege.region || '',
    department: siege.departement || '',
    employeeRange: EMPLOYEE_RANGES[result.tranche_effectif_salarie || 'NN'] || 'Non renseigne',
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
