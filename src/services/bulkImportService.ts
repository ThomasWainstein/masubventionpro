/**
 * Bulk Import Service for MaSubventionPro
 *
 * Orchestrates CSV/Excel parsing, SIREN enrichment, validation,
 * duplicate detection, and batch database imports
 */

import { parse } from 'csv-parse/browser/esm/sync';
import { supabase } from '@/lib/supabase';
import {
  RawImportRow,
  ProcessedImportRow,
  ColumnMapping,
  ImportOptions,
  ImportResult,
  ImportBatchStatus,
  ExcelSheetInfo,
  ParseFileResult,
  COLUMN_PATTERNS,
  ColumnMappingItem,
} from '@/types/bulkImport';
import {
  normalizeSIRET,
  normalizeSIREN,
  extractSIREN,
  isValidSIRET,
  isValidSIREN,
  validateUrl,
  standardizeRegion,
  extractDepartment,
  getRegionFromPostalCode,
  getSectorFromNAF,
  normalizeNAF,
  standardizeLegalForm,
  normalizeEmployeeCount,
  parseTurnover,
  parseYear,
} from './dataTransformationService';

// Rate limiting delays (ms)
const RATE_LIMITS = {
  INSEE_API: 500,
  WEBSITE_ANALYSIS: 1000,
  BETWEEN_ROWS: 100,
};

// ============================================================================
// FILE PARSING
// ============================================================================

/**
 * Get information about all sheets in an Excel file
 */
export async function getExcelSheetsInfo(file: File): Promise<ExcelSheetInfo[]> {
  // Dynamic import to reduce bundle size (~1MB saved)
  const ExcelJS = await import('exceljs');

  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sheetsInfo: ExcelSheetInfo[] = [];

  workbook.eachSheet((worksheet) => {
    const records: Record<string, any>[] = [];
    const headers: string[] = [];

    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      headers.push(cell.value?.toString() || '');
    });

    // Get all data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const record: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          record[header] = cell.value || '';
        }
      });
      records.push(record);
    });

    // Get preview rows (first 3 rows)
    const previewRows = records.slice(0, 3);

    sheetsInfo.push({
      name: worksheet.name,
      rowCount: records.length,
      columnCount: headers.length,
      previewRows,
    });
  });

  return sheetsInfo;
}

/**
 * Parse uploaded file (CSV or Excel) to JSON
 */
export async function parseFile(file: File, selectedSheet?: string): Promise<ParseFileResult> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();

  if (fileExtension === 'csv') {
    const rows = await parseCSVFile(file);
    return { rows, isExcel: false };
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    const availableSheets = await getExcelSheetsInfo(file);

    // If no sheet selected, return info about available sheets
    if (!selectedSheet && availableSheets.length > 1) {
      return {
        rows: [],
        isExcel: true,
        availableSheets,
      };
    }

    // Parse the selected sheet (or first sheet if only one)
    const sheetName = selectedSheet || availableSheets[0]?.name;
    const rows = await parseExcelFile(file, sheetName);
    return {
      rows,
      isExcel: true,
      availableSheets,
      selectedSheet: sheetName,
    };
  } else {
    throw new Error('Format de fichier non supporté. Utilisez CSV ou Excel (.xlsx).');
  }
}

/**
 * Parse CSV file
 */
async function parseCSVFile(file: File): Promise<RawImportRow[]> {
  const text = await file.text();

  if (!text || text.trim().length === 0) {
    throw new Error('Le fichier CSV est vide');
  }

  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relaxColumnCount: true,
  });

  if (!records || records.length === 0) {
    throw new Error('Le fichier CSV ne contient pas de données');
  }

  return records.map((record: any, index: number) => ({
    rowNumber: index + 2, // +2 because row 1 is headers
    rawData: record,
  }));
}

/**
 * Parse Excel file (specific sheet or first sheet)
 */
async function parseExcelFile(file: File, sheetName?: string): Promise<RawImportRow[]> {
  const ExcelJS = await import('exceljs');

  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  let worksheet: any;

  if (sheetName) {
    worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`Feuille "${sheetName}" non trouvée`);
    }
  } else {
    worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Aucune feuille trouvée dans le fichier');
    }
  }

  const records: RawImportRow[] = [];
  const headers: string[] = [];

  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell: any) => {
    headers.push(cell.value?.toString() || '');
  });

  // Get all data rows
  worksheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) return; // Skip header row

    const record: Record<string, any> = {};
    row.eachCell((cell: any, colNumber: number) => {
      const header = headers[colNumber - 1];
      if (header) {
        record[header] = cell.value || '';
      }
    });

    records.push({
      rowNumber: rowNumber,
      rawData: record,
    });
  });

  if (records.length === 0) {
    throw new Error('La feuille Excel ne contient pas de données');
  }

  return records;
}

// ============================================================================
// COLUMN MAPPING
// ============================================================================

/**
 * Auto-detect column mappings from headers
 */
export function autoDetectColumnMappings(headers: string[]): ColumnMappingItem[] {
  const mappings: ColumnMappingItem[] = [];

  for (const header of headers) {
    let bestMatch: { field: string; confidence: 'high' | 'medium' | 'low' } | null = null;

    // Check each pattern
    for (const [field, config] of Object.entries(COLUMN_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(header)) {
          if (!bestMatch || getConfidenceScore(config.confidence) > getConfidenceScore(bestMatch.confidence)) {
            bestMatch = { field, confidence: config.confidence };
          }
          break;
        }
      }
    }

    mappings.push({
      sourceColumn: header,
      targetField: bestMatch?.field || '_skip',
      confidence: bestMatch?.confidence || 'low',
      sampleValues: [], // Will be filled by caller
      isRequired: bestMatch?.field === 'company_name',
    });
  }

  return mappings;
}

function getConfidenceScore(confidence: 'high' | 'medium' | 'low'): number {
  return confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1;
}

/**
 * Build column mapping from detected mappings
 */
export function buildColumnMapping(mappings: ColumnMappingItem[]): ColumnMapping {
  const result: ColumnMapping = {
    confidence: 0,
    autoEnrichmentAvailable: false,
  };

  let totalConfidence = 0;
  let mappedFields = 0;

  for (const mapping of mappings) {
    if (mapping.targetField === '_skip') continue;

    mappedFields++;
    totalConfidence += getConfidenceScore(mapping.confidence);

    switch (mapping.targetField) {
      case 'company_name': result.companyNameColumn = mapping.sourceColumn; break;
      case 'siret': result.siretColumn = mapping.sourceColumn; break;
      case 'siren': result.sirenColumn = mapping.sourceColumn; break;
      case 'website_url': result.websiteColumn = mapping.sourceColumn; break;
      case 'email': result.emailColumn = mapping.sourceColumn; break;
      case 'phone': result.phoneColumn = mapping.sourceColumn; break;
      case 'naf_code': result.nafCodeColumn = mapping.sourceColumn; break;
      case 'region': result.regionColumn = mapping.sourceColumn; break;
      case 'sector': result.sectorColumn = mapping.sourceColumn; break;
      case 'employees': result.employeesColumn = mapping.sourceColumn; break;
      case 'annual_turnover': result.turnoverColumn = mapping.sourceColumn; break;
      case 'year_created': result.yearCreatedColumn = mapping.sourceColumn; break;
      case 'legal_form': result.legalFormColumn = mapping.sourceColumn; break;
      case 'description': result.descriptionColumn = mapping.sourceColumn; break;
      case 'address': result.addressColumn = mapping.sourceColumn; break;
      case 'postal_code': result.postalCodeColumn = mapping.sourceColumn; break;
      case 'city': result.cityColumn = mapping.sourceColumn; break;
    }
  }

  result.confidence = mappedFields > 0 ? totalConfidence / (mappedFields * 3) : 0;
  result.autoEnrichmentAvailable = !!(result.siretColumn || result.sirenColumn);

  return result;
}

// ============================================================================
// ROW MAPPING & TRANSFORMATION
// ============================================================================

/**
 * Extract value from raw row based on column name
 */
function extractValue(row: Record<string, any>, columnName?: string): any {
  if (!columnName) return null;
  return row[columnName] || null;
}

/**
 * Map raw row to profile data using column mapping
 */
export function mapRowToProfile(
  rawRow: RawImportRow,
  columnMapping: ColumnMapping
): ProcessedImportRow {
  const row: ProcessedImportRow = {
    rowNumber: rawRow.rowNumber,
    rawData: rawRow.rawData,
    profileData: {
      company_name: '',
    },
    status: 'pending',
    enrichmentStatus: 'none',
    validationErrors: [],
    validationWarnings: [],
  };

  try {
    // Extract SIRET/SIREN
    const siretRaw = extractValue(rawRow.rawData, columnMapping.siretColumn);
    const sirenRaw = extractValue(rawRow.rawData, columnMapping.sirenColumn);

    if (siretRaw) {
      const normalized = normalizeSIRET(siretRaw);
      if (normalized) {
        row.profileData.siret = normalized;
        row.profileData.siren = extractSIREN(normalized);
      }
    } else if (sirenRaw) {
      const normalized = normalizeSIREN(sirenRaw);
      if (normalized) {
        row.profileData.siren = normalized;
      }
    }

    // Extract company name
    const nameRaw = extractValue(rawRow.rawData, columnMapping.companyNameColumn);
    if (nameRaw) {
      row.profileData.company_name = String(nameRaw).trim();
    }

    // Extract website
    const websiteRaw = extractValue(rawRow.rawData, columnMapping.websiteColumn);
    if (websiteRaw) {
      const validated = validateUrl(websiteRaw);
      if (validated) row.profileData.website_url = validated;
    }

    // Extract NAF code
    const nafRaw = extractValue(rawRow.rawData, columnMapping.nafCodeColumn);
    if (nafRaw) {
      const normalized = normalizeNAF(nafRaw);
      if (normalized) {
        row.profileData.naf_code = normalized;
        // Derive sector from NAF if not provided
        if (!columnMapping.sectorColumn) {
          const sector = getSectorFromNAF(normalized);
          if (sector) row.profileData.sector = sector;
        }
      }
    }

    // Extract sector
    const sectorRaw = extractValue(rawRow.rawData, columnMapping.sectorColumn);
    if (sectorRaw) {
      row.profileData.sector = String(sectorRaw).trim();
    }

    // Extract location fields
    const addressRaw = extractValue(rawRow.rawData, columnMapping.addressColumn);
    if (addressRaw) row.profileData.address = String(addressRaw).trim();

    const postalCodeRaw = extractValue(rawRow.rawData, columnMapping.postalCodeColumn);
    if (postalCodeRaw) {
      const pc = String(postalCodeRaw).trim();
      row.profileData.postal_code = pc;
      // Derive region and department from postal code
      const dept = extractDepartment(pc);
      if (dept) row.profileData.department = dept;
      const region = getRegionFromPostalCode(pc);
      if (region && !row.profileData.region) row.profileData.region = region;
    }

    const cityRaw = extractValue(rawRow.rawData, columnMapping.cityColumn);
    if (cityRaw) row.profileData.city = String(cityRaw).trim();

    // Extract region (or use derived from postal code)
    const regionRaw = extractValue(rawRow.rawData, columnMapping.regionColumn);
    if (regionRaw) {
      const standardized = standardizeRegion(regionRaw);
      if (standardized) row.profileData.region = standardized;
    }

    // Extract employees
    const employeesRaw = extractValue(rawRow.rawData, columnMapping.employeesColumn);
    if (employeesRaw) {
      const normalized = normalizeEmployeeCount(employeesRaw);
      if (normalized) row.profileData.employees = normalized;
    }

    // Extract turnover
    const turnoverRaw = extractValue(rawRow.rawData, columnMapping.turnoverColumn);
    if (turnoverRaw) {
      const parsed = parseTurnover(turnoverRaw);
      if (parsed) row.profileData.annual_turnover = parsed;
    }

    // Extract year created
    const yearRaw = extractValue(rawRow.rawData, columnMapping.yearCreatedColumn);
    if (yearRaw) {
      const parsed = parseYear(yearRaw);
      if (parsed) row.profileData.year_created = parsed;
    }

    // Extract legal form
    const legalFormRaw = extractValue(rawRow.rawData, columnMapping.legalFormColumn);
    if (legalFormRaw) {
      const standardized = standardizeLegalForm(legalFormRaw);
      if (standardized) {
        row.profileData.legal_form = standardized;
        // Check if this is an association
        if (['ASSO', 'COOP', 'FONDATION'].includes(standardized)) {
          row.profileData.is_association = true;
        }
      }
    }

    // Extract description
    const descriptionRaw = extractValue(rawRow.rawData, columnMapping.descriptionColumn);
    if (descriptionRaw) {
      row.profileData.description = String(descriptionRaw).trim();
    }

  } catch (error) {
    row.validationErrors.push(`Erreur de mapping: ${error}`);
    row.status = 'invalid';
  }

  return row;
}

// ============================================================================
// SIREN ENRICHMENT
// ============================================================================

/**
 * Enrich row with SIREN API data via Edge Function
 */
export async function enrichRowWithSIREN(row: ProcessedImportRow): Promise<ProcessedImportRow> {
  const identifier = row.profileData.siret || row.profileData.siren;

  if (!identifier) {
    row.enrichmentStatus = 'none';
    return row;
  }

  row.enrichmentStatus = 'enriching';

  try {
    // Call the company-enricher Edge Function
    const { data, error } = await supabase.functions.invoke('company-enricher', {
      body: {
        siren: row.profileData.siren || extractSIREN(row.profileData.siret!),
        forceRefresh: false,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.success && data?.enrichment) {
      const enrichment = data.enrichment;
      const officialData = enrichment.official_data;

      // Store enriched data
      row.enrichedData = {
        siren: officialData.siren,
        siret: officialData.siege?.siret,
        companyName: officialData.nom_complet,
        legalForm: officialData.nature_juridique,
        nafCode: officialData.activite_principale,
        nafLabel: officialData.libelle_activite_principale || '',
        address: {
          street: officialData.siege?.adresse || '',
          postalCode: officialData.siege?.code_postal || '',
          city: officialData.siege?.commune || '',
          fullAddress: officialData.siege?.adresse_complete || '',
        },
        categoryEnterprise: officialData.categorie_entreprise,
        numberOfEstablishments: officialData.nombre_etablissements,
        directors: officialData.dirigeants?.map((d: any) => ({
          name: d.nom || d.denomination,
          firstName: d.prenoms,
          role: d.qualite,
        })),
        certifications: {
          isRGE: officialData.complements?.est_rge,
          isBio: officialData.complements?.est_bio,
          isQualiopi: officialData.complements?.est_qualiopi,
          isESS: officialData.complements?.est_ess,
        },
      };

      // Apply enriched data to profile (only if not already provided)
      if (!row.profileData.company_name) {
        row.profileData.company_name = officialData.nom_complet;
      }

      row.profileData.siren = officialData.siren;
      if (officialData.siege?.siret) {
        row.profileData.siret = officialData.siege.siret;
      }

      if (officialData.activite_principale && !row.profileData.naf_code) {
        row.profileData.naf_code = officialData.activite_principale;
        row.profileData.naf_label = officialData.libelle_activite_principale;
      }

      if (officialData.nature_juridique && !row.profileData.legal_form) {
        row.profileData.legal_form = standardizeLegalForm(officialData.nature_juridique) || undefined;
      }

      // Location data from siege
      if (officialData.siege) {
        if (!row.profileData.postal_code && officialData.siege.code_postal) {
          row.profileData.postal_code = officialData.siege.code_postal;
          row.profileData.department = extractDepartment(officialData.siege.code_postal) || undefined;
        }
        if (!row.profileData.city && officialData.siege.commune) {
          row.profileData.city = officialData.siege.commune;
        }
        if (!row.profileData.address && officialData.siege.adresse) {
          row.profileData.address = officialData.siege.adresse;
        }
        if (!row.profileData.region && officialData.siege.code_postal) {
          row.profileData.region = getRegionFromPostalCode(officialData.siege.code_postal) || undefined;
        }
      }

      // Employee count
      if (officialData.tranche_effectif_salarie && !row.profileData.employees) {
        row.profileData.employees = normalizeEmployeeCount(officialData.effectif_min + '-' + officialData.effectif_max) || undefined;
      }

      // Year created
      if (officialData.date_creation && !row.profileData.year_created) {
        row.profileData.year_created = parseYear(officialData.date_creation) || undefined;
      }

      // Derive sector from NAF
      if (officialData.activite_principale && !row.profileData.sector) {
        row.profileData.sector = getSectorFromNAF(officialData.activite_principale) || undefined;
      }

      row.enrichmentStatus = 'enriched';
      row.validationWarnings.push('✅ Données enrichies via SIREN');
    }
  } catch (error: any) {
    row.enrichmentStatus = 'failed';
    row.validationWarnings.push(`⚠️ Enrichissement SIREN échoué: ${error.message}`);
  }

  return row;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate processed row
 */
export function validateRow(row: ProcessedImportRow): ProcessedImportRow {
  const errors: string[] = [];
  const warnings: string[] = [...row.validationWarnings];

  // Mandatory: Company name
  if (!row.profileData.company_name || row.profileData.company_name.length < 2) {
    errors.push('Nom d\'entreprise requis (minimum 2 caractères)');
  }

  // Warning: No SIRET/SIREN
  if (!row.profileData.siret && !row.profileData.siren) {
    warnings.push('⚠️ Pas de SIRET/SIREN - le profil sera minimal');
  }

  // Validate SIRET if provided
  if (row.profileData.siret && !isValidSIRET(row.profileData.siret)) {
    warnings.push('⚠️ SIRET invalide (format ou checksum incorrect)');
  }

  // Validate SIREN if provided
  if (row.profileData.siren && !isValidSIREN(row.profileData.siren)) {
    warnings.push('⚠️ SIREN invalide (format ou checksum incorrect)');
  }

  row.validationErrors = errors;
  row.validationWarnings = warnings;
  row.status = errors.length > 0 ? 'invalid' : 'valid';

  return row;
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Check for duplicate profiles in database
 */
export async function checkDuplicate(
  row: ProcessedImportRow,
  userId: string
): Promise<ProcessedImportRow['duplicateMatch'] | null> {
  try {
    // Priority 1: Exact SIRET match
    if (row.profileData.siret && isValidSIRET(row.profileData.siret)) {
      const { data, error } = await supabase
        .from('masubventionpro_profiles')
        .select('id, company_name, siret, siren, created_at')
        .eq('siret', row.profileData.siret)
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          type: 'exact',
          existingProfile: data,
          confidence: 1.0,
          reason: `SIRET identique: ${row.profileData.siret}`,
        };
      }
    }

    // Priority 2: SIREN match
    if (row.profileData.siren && isValidSIREN(row.profileData.siren)) {
      const { data, error } = await supabase
        .from('masubventionpro_profiles')
        .select('id, company_name, siret, siren, created_at')
        .eq('siren', row.profileData.siren)
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          type: 'likely',
          existingProfile: data,
          confidence: 0.9,
          reason: `SIREN identique: ${row.profileData.siren}`,
        };
      }
    }

    // Priority 3: Company name match
    if (row.profileData.company_name) {
      const { data, error } = await supabase
        .from('masubventionpro_profiles')
        .select('id, company_name, siret, siren, created_at')
        .ilike('company_name', row.profileData.company_name)
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          type: 'possible',
          existingProfile: data,
          confidence: 0.7,
          reason: `Nom similaire: "${row.profileData.company_name}"`,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Erreur vérification doublon:', error);
    return null;
  }
}

// ============================================================================
// DATABASE IMPORT
// ============================================================================

/**
 * Import single row to database
 */
export async function importRowToDatabase(
  row: ProcessedImportRow,
  userId: string
): Promise<ProcessedImportRow> {
  try {
    const { data, error } = await supabase
      .from('masubventionpro_profiles')
      .insert({
        user_id: userId,
        company_name: row.profileData.company_name,
        siret: row.profileData.siret,
        siren: row.profileData.siren,
        naf_code: row.profileData.naf_code,
        naf_label: row.profileData.naf_label,
        sector: row.profileData.sector,
        sub_sector: row.profileData.sub_sector,
        region: row.profileData.region,
        department: row.profileData.department,
        city: row.profileData.city,
        postal_code: row.profileData.postal_code,
        address: row.profileData.address,
        employees: row.profileData.employees,
        annual_turnover: row.profileData.annual_turnover,
        year_created: row.profileData.year_created,
        legal_form: row.profileData.legal_form,
        company_category: row.profileData.company_category,
        website_url: row.profileData.website_url,
        description: row.profileData.description,
        certifications: row.profileData.certifications || [],
        project_types: row.profileData.project_types || [],
        is_association: row.profileData.is_association,
        association_type: row.profileData.association_type,
        rna_number: row.profileData.rna_number,
        member_count: row.profileData.member_count,
        budget_annual: row.profileData.budget_annual,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    row.importedProfileId = data.id;
    row.status = 'imported';
  } catch (error: any) {
    row.status = 'failed';
    row.importError = error.message;
    console.error('Import échoué:', error);
  }

  return row;
}

// ============================================================================
// BATCH IMPORT
// ============================================================================

/**
 * Batch import all rows
 */
export async function batchImportRows(
  rows: ProcessedImportRow[],
  options: ImportOptions
): Promise<ImportResult> {
  const batchStatus: ImportBatchStatus = {
    totalRows: rows.length,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    enriched: 0,
    startTime: new Date(),
  };

  const processedRows: ProcessedImportRow[] = [];

  // Helper to emit progress updates
  const emitProgress = (action: string, currentRow?: ProcessedImportRow) => {
    if (options.onProgress) {
      batchStatus.currentAction = action;
      options.onProgress(batchStatus, currentRow);
    }
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    batchStatus.currentRow = i + 1;

    try {
      // Step 1: Validation
      emitProgress(`Traitement ${i + 1}/${rows.length}: Validation...`, row);

      // Step 2: SIREN enrichment if enabled
      if (options.enableSirenEnrichment && (row.profileData.siret || row.profileData.siren)) {
        emitProgress(`Traitement ${i + 1}/${rows.length}: Enrichissement SIREN...`, row);
        await enrichRowWithSIREN(row);
        if (row.enrichmentStatus === 'enriched') {
          batchStatus.enriched++;
          options.onEnrichmentSuccess?.(row);
        }
        await sleep(RATE_LIMITS.INSEE_API);
      }

      // Step 3: Validate
      validateRow(row);

      if (row.status === 'invalid') {
        batchStatus.failed++;
        processedRows.push(row);
        batchStatus.processed++;
        continue;
      }

      // Step 4: Check duplicates
      emitProgress(`Traitement ${i + 1}/${rows.length}: Vérification doublons...`, row);
      const duplicate = await checkDuplicate(row, options.userId);

      if (duplicate) {
        row.duplicateMatch = duplicate;
        row.status = 'duplicate';

        if (options.duplicateStrategy === 'ask' && options.onDuplicateFound) {
          const action = await options.onDuplicateFound(row);
          row.duplicateAction = action;
        } else {
          row.duplicateAction = options.duplicateStrategy as any;
        }

        if (row.duplicateAction === 'skip') {
          batchStatus.skipped++;
          processedRows.push(row);
          batchStatus.processed++;
          continue;
        }
      }

      // Step 5: Import to database
      emitProgress(`Traitement ${i + 1}/${rows.length}: Enregistrement...`, row);
      await importRowToDatabase(row, options.userId);

      if (row.status === 'imported') {
        batchStatus.successful++;
      } else {
        batchStatus.failed++;
      }

    } catch (error: any) {
      row.status = 'failed';
      row.importError = error.message;
      batchStatus.failed++;
    }

    batchStatus.processed++;
    processedRows.push(row);

    // Progress update
    emitProgress(`Traitement ${i + 1}/${rows.length}: Terminé`, row);

    // Delay between rows
    if (options.delayBetweenRows && i < rows.length - 1) {
      await sleep(options.delayBetweenRows);
    }
  }

  batchStatus.endTime = new Date();
  batchStatus.durationMs = batchStatus.endTime.getTime() - batchStatus.startTime.getTime();

  // Categorize results
  const successfulRows = processedRows.filter(r => r.status === 'imported');
  const failedRows = processedRows.filter(r => r.status === 'failed' || r.status === 'invalid');
  const skippedRows = processedRows.filter(r => r.duplicateAction === 'skip');
  const duplicateRows = processedRows.filter(r => r.status === 'duplicate');

  return {
    batchStatus,
    rows: processedRows,
    successfulRows,
    failedRows,
    skippedRows,
    duplicateRows,
    stats: {
      avgFieldsPerProfile: calculateAvgFields(successfulRows),
      enrichmentRate: batchStatus.totalRows > 0 ? (batchStatus.enriched / batchStatus.totalRows) * 100 : 0,
      avgCompletionPercentage: calculateAvgCompletion(successfulRows),
      totalApiCalls: batchStatus.enriched,
      totalProcessingTimeMs: batchStatus.durationMs || 0,
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateAvgFields(rows: ProcessedImportRow[]): number {
  if (rows.length === 0) return 0;
  const total = rows.reduce((sum, row) => {
    return sum + Object.values(row.profileData).filter(v => v !== null && v !== undefined && v !== '').length;
  }, 0);
  return Math.round(total / rows.length);
}

function calculateAvgCompletion(rows: ProcessedImportRow[]): number {
  if (rows.length === 0) return 0;
  const total = rows.reduce((sum, row) => {
    // Count filled fields out of key fields
    const keyFields = [
      'company_name', 'siret', 'naf_code', 'sector', 'region',
      'employees', 'legal_form', 'website_url', 'address', 'postal_code',
    ];
    const filled = keyFields.filter(f => row.profileData[f as keyof typeof row.profileData]).length;
    return sum + (filled / keyFields.length) * 100;
  }, 0);
  return Math.round(total / rows.length);
}

/**
 * Get sample values for a column from raw rows
 */
export function getSampleValues(rows: RawImportRow[], column: string, limit: number = 3): string[] {
  const values: string[] = [];
  for (const row of rows) {
    const value = row.rawData[column];
    if (value && values.length < limit) {
      values.push(String(value).substring(0, 50));
    }
    if (values.length >= limit) break;
  }
  return values;
}
