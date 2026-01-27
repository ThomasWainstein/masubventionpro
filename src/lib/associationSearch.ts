/**
 * Association Search Service
 * Uses the RNA (Répertoire National des Associations) API
 * https://entreprise.data.gouv.fr/api/rna/v1/
 *
 * This API provides access to associations that may not have SIREN/SIRET numbers.
 * Rate limit: 10 calls/minute/IP
 */

const RNA_API_BASE = 'https://entreprise.data.gouv.fr/api/rna/v1';

/**
 * RNA API result structure
 */
interface RNAApiResult {
  association: {
    id: string;  // RNA number (W + 9 digits)
    id_ex?: string;  // Old format ID
    siret?: string;  // SIRET if registered
    numero_reconnaissance_utilite_publique?: string;
    id_correspondance?: string;

    // Identity
    titre: string;  // Association name
    titre_court?: string;  // Short name
    objet?: string;  // Purpose/mission
    objet_social1?: string;

    // Status
    date_creation?: string;  // Creation date
    date_declaration?: string;  // Declaration date
    date_publication?: string;  // Publication date in JO
    date_dissolution?: string;  // Dissolution date

    // Address
    adresse_siege?: string;
    adresse_numero_voie?: string;
    adresse_type_voie?: string;
    adresse_libelle_voie?: string;
    adresse_distribution?: string;
    adresse_code_postal?: string;
    adresse_code_insee?: string;
    adresse_libelle_commune?: string;

    // Classification
    groupement?: string;  // Type: Simple, Union, Fédération
    regime?: string;  // Legal regime
    nature?: string;  // Nature: D (déclarée), RUP (reconnue d'utilité publique)
    sous_nature?: string;

    // Affiliations
    federation?: string;
    union?: string;

    // Status
    position_activite?: string;  // A = active
    derniere_maj?: string;  // Last update date
  };
}

interface RNASearchResponse {
  total_results: number;
  total_pages: number;
  per_page: number;
  page: number;
  association: RNAApiResult['association'][];
}

/**
 * Mapped association result for our application
 */
export interface AssociationSearchResult {
  rna: string;  // RNA number (W + 9 digits)
  siret: string | null;  // SIRET if they have one
  siren: string | null;  // SIREN extracted from SIRET
  name: string;
  shortName: string | null;
  purpose: string | null;  // Objet de l'association
  creationDate: string | null;
  declarationDate: string | null;
  address: string;
  postalCode: string;
  city: string;
  region: string;
  department: string;
  groupType: string | null;  // Simple, Union, Fédération
  nature: string | null;  // D, RUP
  isRUP: boolean;  // Reconnue d'Utilité Publique
  isActive: boolean;
  lastUpdate: string | null;
  // Mapped to our form values
  legalForm: 'ASSO';
  sector: string;
  employeeRange: string;
}

/**
 * Map department codes to French regions
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
    return 'Corse';
  }

  // Standard metropolitan France (2-digit department)
  const deptCode = postalCode.substring(0, 2);
  return DEPARTMENT_TO_REGION[deptCode] || '';
}

/**
 * Detect sector from association purpose/objet
 */
function detectSectorFromPurpose(purpose: string | null): string {
  if (!purpose) return '';
  const purposeLower = purpose.toLowerCase();

  if (purposeLower.includes('sport') || purposeLower.includes('athlé') || purposeLower.includes('foot') ||
      purposeLower.includes('basket') || purposeLower.includes('tennis')) return 'services';
  if (purposeLower.includes('culture') || purposeLower.includes('musique') || purposeLower.includes('théâtre') ||
      purposeLower.includes('art') || purposeLower.includes('danse')) return 'culture';
  if (purposeLower.includes('éducation') || purposeLower.includes('formation') || purposeLower.includes('école') ||
      purposeLower.includes('enseignement')) return 'education';
  if (purposeLower.includes('santé') || purposeLower.includes('médical') || purposeLower.includes('soin')) return 'sante';
  if (purposeLower.includes('environnement') || purposeLower.includes('écologie') || purposeLower.includes('nature') ||
      purposeLower.includes('biodiversité')) return 'environnement';
  if (purposeLower.includes('social') || purposeLower.includes('humanitaire') || purposeLower.includes('solidarité') ||
      purposeLower.includes('aide')) return 'services';
  if (purposeLower.includes('tourisme') || purposeLower.includes('loisir')) return 'tourisme';
  if (purposeLower.includes('agricol') || purposeLower.includes('rural')) return 'agriculture';

  return '';  // Default - no specific sector
}

/**
 * Transform RNA API result to our AssociationSearchResult format
 */
function transformRNAResult(result: RNAApiResult['association']): AssociationSearchResult {
  const postalCode = result.adresse_code_postal || '';
  const region = getRegionFromPostalCode(postalCode);
  const deptCode = postalCode ? postalCode.substring(0, 2) : '';

  // Build full address
  const addressParts = [
    result.adresse_numero_voie,
    result.adresse_type_voie,
    result.adresse_libelle_voie,
  ].filter(Boolean);
  const address = result.adresse_siege || addressParts.join(' ') || '';

  // Check if RUP (Reconnue d'Utilité Publique)
  const isRUP = result.nature === 'RUP' || !!result.numero_reconnaissance_utilite_publique;

  // Extract SIREN from SIRET if available
  const siret = result.siret || null;
  const siren = siret ? siret.substring(0, 9) : null;

  return {
    rna: result.id,
    siret,
    siren,
    name: result.titre || '',
    shortName: result.titre_court || null,
    purpose: result.objet || result.objet_social1 || null,
    creationDate: result.date_creation || null,
    declarationDate: result.date_declaration || null,
    address,
    postalCode,
    city: result.adresse_libelle_commune || '',
    region,
    department: deptCode,
    groupType: result.groupement || null,
    nature: result.nature || null,
    isRUP,
    isActive: result.position_activite === 'A' && !result.date_dissolution,
    lastUpdate: result.derniere_maj || null,
    legalForm: 'ASSO',
    sector: detectSectorFromPurpose(result.objet || result.objet_social1 || null),
    employeeRange: '',  // RNA doesn't provide employee data
  };
}

/**
 * Check if a string is an RNA number (W + 9 digits)
 */
export function isRNANumber(value: string): boolean {
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  return /^W\d{9}$/.test(cleaned);
}

/**
 * Search associations by name using the RNA API
 *
 * @param query - Association name to search
 * @param limit - Maximum results (default 10)
 */
export async function searchAssociations(
  query: string,
  limit: number = 10
): Promise<AssociationSearchResult[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  const trimmedQuery = query.trim();

  try {
    const encodedQuery = encodeURIComponent(trimmedQuery);
    const url = `${RNA_API_BASE}/full_text/${encodedQuery}?per_page=${limit}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      if (response.status === 429) {
        console.warn('[RNA API] Rate limit exceeded (10 calls/minute)');
        throw new Error('Trop de requêtes - veuillez patienter quelques secondes');
      }
      throw new Error(`RNA API error: ${response.status}`);
    }

    const data: RNASearchResponse = await response.json();

    if (!data.association || !Array.isArray(data.association)) {
      return [];
    }

    return data.association.map(transformRNAResult);
  } catch (error) {
    console.error('[RNA API] Search failed:', error);
    throw error;
  }
}

/**
 * Get association details by RNA number
 *
 * @param rna - RNA number (W + 9 digits)
 */
export async function getAssociationByRNA(rna: string): Promise<AssociationSearchResult | null> {
  const cleanedRNA = rna.replace(/\s/g, '').toUpperCase();

  if (!isRNANumber(cleanedRNA)) {
    console.warn('[RNA API] Invalid RNA format:', rna);
    return null;
  }

  try {
    const url = `${RNA_API_BASE}/id/${cleanedRNA}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      if (response.status === 429) {
        console.warn('[RNA API] Rate limit exceeded');
        throw new Error('Trop de requêtes - veuillez patienter quelques secondes');
      }
      throw new Error(`RNA API error: ${response.status}`);
    }

    const data: RNAApiResult = await response.json();

    if (!data.association) {
      return null;
    }

    return transformRNAResult(data.association);
  } catch (error) {
    console.error('[RNA API] Lookup failed:', error);
    throw error;
  }
}

/**
 * Get association details by SIRET
 * Note: Not all associations have a SIRET
 *
 * @param siret - SIRET number (14 digits)
 */
export async function getAssociationBySIRET(siret: string): Promise<AssociationSearchResult | null> {
  const cleanedSIRET = siret.replace(/\s/g, '');

  if (!/^\d{14}$/.test(cleanedSIRET)) {
    console.warn('[RNA API] Invalid SIRET format:', siret);
    return null;
  }

  try {
    const url = `${RNA_API_BASE}/siret/${cleanedSIRET}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;  // Association not in RNA or doesn't have this SIRET
      }
      if (response.status === 429) {
        console.warn('[RNA API] Rate limit exceeded');
        throw new Error('Trop de requêtes - veuillez patienter quelques secondes');
      }
      throw new Error(`RNA API error: ${response.status}`);
    }

    const data: RNAApiResult = await response.json();

    if (!data.association) {
      return null;
    }

    return transformRNAResult(data.association);
  } catch (error) {
    console.error('[RNA API] SIRET lookup failed:', error);
    throw error;
  }
}
