/**
 * Bulk Import Types for MaSubventionPro
 *
 * Type definitions for importing multiple company profiles via CSV/Excel
 * with automatic SIREN enrichment and column mapping
 */

// Row processing statuses
export type ImportRowStatus = 'pending' | 'valid' | 'invalid' | 'enriching' | 'imported' | 'failed' | 'duplicate';

export type EnrichmentStatus = 'none' | 'enriching' | 'enriched' | 'failed' | 'partial';

export type DuplicateMatchType = 'exact' | 'likely' | 'possible';

export type ColumnConfidence = 'high' | 'medium' | 'low';

/**
 * Excel sheet information for multi-sheet files
 */
export interface ExcelSheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
  previewRows: Record<string, any>[];
}

/**
 * File parse result with sheet information
 */
export interface ParseFileResult {
  rows: RawImportRow[];
  isExcel: boolean;
  availableSheets?: ExcelSheetInfo[];
  selectedSheet?: string;
}

/**
 * Raw row from parsed CSV/Excel file
 */
export interface RawImportRow {
  rowNumber: number;
  rawData: Record<string, any>;
}

/**
 * Column mapping configuration
 */
export interface ColumnMapping {
  // Critical fields
  siretColumn?: string;
  sirenColumn?: string;
  companyNameColumn?: string;

  // Optional fields
  websiteColumn?: string;
  emailColumn?: string;
  phoneColumn?: string;
  nafCodeColumn?: string;
  regionColumn?: string;
  sectorColumn?: string;
  employeesColumn?: string;
  turnoverColumn?: string;
  yearCreatedColumn?: string;
  legalFormColumn?: string;
  descriptionColumn?: string;
  addressColumn?: string;
  postalCodeColumn?: string;
  cityColumn?: string;

  // Metadata
  confidence: number; // 0-1 scale
  autoEnrichmentAvailable: boolean;
}

/**
 * Individual column mapping with confidence
 */
export interface ColumnMappingItem {
  sourceColumn: string;
  targetField: string;
  confidence: ColumnConfidence;
  sampleValues: string[];
  isRequired: boolean;
}

/**
 * SIREN API enrichment data
 */
export interface EnrichedCompanyData {
  siren: string;
  siret?: string;
  companyName: string;
  legalForm: string;
  nafCode: string;
  nafLabel: string;
  address: {
    street: string;
    postalCode: string;
    city: string;
    fullAddress: string;
  };
  region?: string;
  department?: string;
  employeeCount?: string;
  companySizeCategory?: 'TPE' | 'PME' | 'ETI' | 'GE';
  creationDate?: string;
  tvaNumber?: string;
  // Enhanced data from company-enricher
  categoryEnterprise?: string;
  numberOfEstablishments?: number;
  directors?: Array<{
    name: string;
    firstName?: string;
    role: string;
    birthYear?: number;
  }>;
  finances?: {
    year: number;
    revenue?: number;
    profit?: number;
  };
  certifications?: {
    isRGE?: boolean;
    isBio?: boolean;
    isQualiopi?: boolean;
    isESS?: boolean;
  };
}

/**
 * Duplicate detection result
 */
export interface DuplicateMatch {
  type: DuplicateMatchType;
  existingProfile: {
    id: string;
    company_name: string;
    siret?: string;
    siren?: string;
    created_at: string;
  };
  confidence: number;
  reason: string;
}

/**
 * Processed import row with validation and enrichment
 */
export interface ProcessedImportRow {
  rowNumber: number;
  rawData: Record<string, any>;

  // Mapped profile data (matches MaSubventionProProfile columns)
  profileData: {
    company_name: string;
    siret?: string;
    siren?: string;
    naf_code?: string;
    naf_label?: string;
    sector?: string;
    sub_sector?: string;
    region?: string;
    department?: string;
    city?: string;
    postal_code?: string;
    address?: string;
    employees?: string;
    annual_turnover?: number;
    year_created?: number;
    legal_form?: string;
    company_category?: string;
    website_url?: string;
    description?: string;
    certifications?: string[];
    project_types?: string[];
    // Association fields
    is_association?: boolean;
    association_type?: string;
    rna_number?: string;
    member_count?: number;
    budget_annual?: number;
  };

  // Status tracking
  status: ImportRowStatus;
  enrichmentStatus: EnrichmentStatus;
  enrichedData?: EnrichedCompanyData;

  // Validation & errors
  validationErrors: string[];
  validationWarnings: string[];

  // Duplicate detection
  duplicateMatch?: DuplicateMatch;
  duplicateAction?: 'skip' | 'update' | 'create';

  // Import result
  importedProfileId?: string;
  importError?: string;
}

/**
 * Overall import batch status
 */
export interface ImportBatchStatus {
  totalRows: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  enriched: number;

  currentRow?: number;
  currentAction?: string;

  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

/**
 * Final import result summary
 */
export interface ImportResult {
  batchStatus: ImportBatchStatus;
  rows: ProcessedImportRow[];

  // Categorized results
  successfulRows: ProcessedImportRow[];
  failedRows: ProcessedImportRow[];
  skippedRows: ProcessedImportRow[];
  duplicateRows: ProcessedImportRow[];

  // Statistics
  stats: {
    avgFieldsPerProfile: number;
    enrichmentRate: number; // % of profiles enriched via SIREN
    avgCompletionPercentage: number;
    totalApiCalls: number;
    totalProcessingTimeMs: number;
  };
}

/**
 * Import configuration options
 */
export interface ImportOptions {
  userId: string;

  // Duplicate handling
  duplicateStrategy: 'ask' | 'skip' | 'update' | 'create';

  // Enrichment options
  enableSirenEnrichment: boolean;
  enableWebsiteAnalysis: boolean;
  skipEnrichmentOnError: boolean;

  // Batch processing
  batchSize: number;
  delayBetweenRows?: number; // ms

  // Callbacks
  onProgress?: (status: ImportBatchStatus, currentRow?: ProcessedImportRow) => void;
  onDuplicateFound?: (row: ProcessedImportRow) => Promise<'skip' | 'update' | 'create'>;
  onEnrichmentSuccess?: (row: ProcessedImportRow) => void;
  onEnrichmentError?: (row: ProcessedImportRow, error: Error) => void;
}

/**
 * Target fields available for mapping
 */
export const TARGET_FIELDS = [
  { value: 'company_name', label: 'Nom de l\'entreprise', required: true, category: 'identity' },
  { value: 'siret', label: 'SIRET', required: false, category: 'identity' },
  { value: 'siren', label: 'SIREN', required: false, category: 'identity' },
  { value: 'naf_code', label: 'Code NAF/APE', required: false, category: 'identity' },
  { value: 'legal_form', label: 'Forme juridique', required: false, category: 'identity' },
  { value: 'website_url', label: 'Site web', required: false, category: 'contact' },
  { value: 'email', label: 'Email', required: false, category: 'contact' },
  { value: 'phone', label: 'Téléphone', required: false, category: 'contact' },
  { value: 'address', label: 'Adresse', required: false, category: 'location' },
  { value: 'postal_code', label: 'Code postal', required: false, category: 'location' },
  { value: 'city', label: 'Ville', required: false, category: 'location' },
  { value: 'region', label: 'Région', required: false, category: 'location' },
  { value: 'sector', label: 'Secteur d\'activité', required: false, category: 'business' },
  { value: 'employees', label: 'Effectif', required: false, category: 'business' },
  { value: 'annual_turnover', label: 'Chiffre d\'affaires', required: false, category: 'business' },
  { value: 'year_created', label: 'Année de création', required: false, category: 'business' },
  { value: 'description', label: 'Description', required: false, category: 'business' },
  { value: 'rna_number', label: 'Numéro RNA (associations)', required: false, category: 'identity' },
  { value: '_skip', label: '-- Ignorer cette colonne --', required: false, category: 'other' },
] as const;

/**
 * Column name patterns for auto-detection
 */
export const COLUMN_PATTERNS: Record<string, { patterns: RegExp[]; confidence: ColumnConfidence }> = {
  company_name: {
    patterns: [/^(raison.?sociale|nom.*entreprise|company.*name|société|name|nom)$/i],
    confidence: 'high'
  },
  siret: {
    patterns: [/^siret$/i, /siret/i],
    confidence: 'high'
  },
  siren: {
    patterns: [/^siren$/i, /siren/i],
    confidence: 'high'
  },
  naf_code: {
    patterns: [/^(naf|ape|code.?naf|code.?ape)$/i],
    confidence: 'high'
  },
  website_url: {
    patterns: [/^(site.*web|website|url|www|web)$/i],
    confidence: 'high'
  },
  email: {
    patterns: [/^(email|mail|e-mail|courriel)$/i],
    confidence: 'high'
  },
  phone: {
    patterns: [/^(tel|telephone|téléphone|phone|mobile)$/i],
    confidence: 'high'
  },
  address: {
    patterns: [/^(adresse|address|rue|voie)$/i],
    confidence: 'medium'
  },
  postal_code: {
    patterns: [/^(code.?postal|cp|postal.*code|zip)$/i],
    confidence: 'high'
  },
  city: {
    patterns: [/^(ville|city|commune)$/i],
    confidence: 'high'
  },
  region: {
    patterns: [/^(region|région)$/i],
    confidence: 'high'
  },
  sector: {
    patterns: [/^(secteur|sector|activité|activity|domaine)$/i],
    confidence: 'medium'
  },
  employees: {
    patterns: [/^(effectif|employees|salariés|nb.*salari)$/i],
    confidence: 'medium'
  },
  annual_turnover: {
    patterns: [/^(ca|chiffre.*affaires|turnover|revenue)$/i],
    confidence: 'medium'
  },
  year_created: {
    patterns: [/^(date.*création|création|year.*created|founded|année)$/i],
    confidence: 'medium'
  },
  legal_form: {
    patterns: [/^(forme.*juridique|legal.*form|statut|type.*société)$/i],
    confidence: 'medium'
  },
  description: {
    patterns: [/^(description|activité|présentation|about)$/i],
    confidence: 'low'
  },
  rna_number: {
    patterns: [/^(rna|w\d{9}|numéro.*association)$/i],
    confidence: 'high'
  },
};
