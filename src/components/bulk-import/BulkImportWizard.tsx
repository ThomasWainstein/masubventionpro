/**
 * BulkImportWizard - Multi-step wizard for CSV/Excel import
 *
 * Steps:
 * 1. Upload file
 * 2. Select sheet (if Excel with multiple sheets)
 * 3. Map columns
 * 4. Preview & validate
 * 5. Import
 * 6. Results
 */

import { useState, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, TableProperties, Eye, Play, CheckCircle, AlertCircle, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ColumnMappingTable } from './ColumnMappingTable';
import {
  parseFile,
  mapRowToProfile,
  batchImportRows,
  autoDetectColumnMappings,
  buildColumnMapping,
  getSampleValues,
} from '@/services/bulkImportService';
import {
  enhanceMappingsWithContentDetection,
  analyzeAllColumns,
  getDetectionSummary,
  ContentAnalysis,
} from '@/services/smartColumnDetection';
import {
  RawImportRow,
  ProcessedImportRow,
  ExcelSheetInfo,
  ImportBatchStatus,
  ImportResult,
  ColumnMappingItem,
} from '@/types/bulkImport';

type WizardStep = 'upload' | 'sheet-select' | 'mapping' | 'preview' | 'import' | 'results';

interface BulkImportWizardProps {
  onComplete?: (result: ImportResult) => void;
  onCancel?: () => void;
}

export function BulkImportWizard({ onComplete, onCancel }: BulkImportWizardProps) {
  const { user } = useAuth();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<RawImportRow[]>([]);
  const [availableSheets, setAvailableSheets] = useState<ExcelSheetInfo[]>([]);
  const [_selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMappingItem[]>([]);
  const [processedRows, setProcessedRows] = useState<ProcessedImportRow[]>([]);
  const [importStatus, setImportStatus] = useState<ImportBatchStatus | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [contentAnalyses, setContentAnalyses] = useState<ContentAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Options
  const [enableSirenEnrichment, setEnableSirenEnrichment] = useState(true);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'create'>('skip');

  // Step navigation
  const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: 'upload', label: 'Fichier', icon: <Upload className="w-4 h-4" /> },
    { key: 'sheet-select', label: 'Feuille', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { key: 'mapping', label: 'Mapping', icon: <TableProperties className="w-4 h-4" /> },
    { key: 'preview', label: 'Aperçu', icon: <Eye className="w-4 h-4" /> },
    { key: 'import', label: 'Import', icon: <Play className="w-4 h-4" /> },
    { key: 'results', label: 'Résultats', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  // Get visible steps (skip sheet-select if not Excel with multiple sheets)
  const visibleSteps = useMemo(() => {
    if (availableSheets.length <= 1) {
      return steps.filter(s => s.key !== 'sheet-select');
    }
    return steps;
  }, [availableSheets]);

  // Handle file upload
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    setError(null);
    setIsLoading(true);

    try {
      // Validate file size (max 5MB)
      if (uploadedFile.size > 5 * 1024 * 1024) {
        throw new Error('Fichier trop volumineux (max 5 Mo)');
      }

      setFile(uploadedFile);

      const result = await parseFile(uploadedFile);

      if (result.isExcel && result.availableSheets && result.availableSheets.length > 1) {
        // Multiple sheets - need to select one
        setAvailableSheets(result.availableSheets);
        setCurrentStep('sheet-select');
      } else {
        // Single sheet or CSV - proceed to mapping
        setRawRows(result.rows);
        setAvailableSheets(result.availableSheets || []);
        setSelectedSheet(result.selectedSheet || null);

        // Auto-detect column mappings from headers
        const detectedHeaders = Object.keys(result.rows[0]?.rawData || {});
        let detectedMappings = autoDetectColumnMappings(detectedHeaders);

        // Add sample values
        detectedMappings.forEach(mapping => {
          mapping.sampleValues = getSampleValues(result.rows, mapping.sourceColumn, 3);
        });

        // Enhance mappings with SMART content-based detection
        const analyses = analyzeAllColumns(result.rows);
        setContentAnalyses(analyses);
        detectedMappings = enhanceMappingsWithContentDetection(detectedMappings, result.rows);

        setColumnMappings(detectedMappings);
        setCurrentStep('mapping');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la lecture du fichier');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle sheet selection
  const handleSheetSelect = useCallback(async (sheetName: string) => {
    if (!file) return;

    setError(null);
    setIsLoading(true);

    try {
      setSelectedSheet(sheetName);
      const result = await parseFile(file, sheetName);
      setRawRows(result.rows);

      // Auto-detect column mappings from headers
      const detectedHeaders = Object.keys(result.rows[0]?.rawData || {});
      let detectedMappings = autoDetectColumnMappings(detectedHeaders);

      // Add sample values
      detectedMappings.forEach(mapping => {
        mapping.sampleValues = getSampleValues(result.rows, mapping.sourceColumn, 3);
      });

      // Enhance mappings with SMART content-based detection
      const analyses = analyzeAllColumns(result.rows);
      setContentAnalyses(analyses);
      detectedMappings = enhanceMappingsWithContentDetection(detectedMappings, result.rows);

      setColumnMappings(detectedMappings);
      setCurrentStep('mapping');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la lecture de la feuille');
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  // Handle mapping update
  const handleMappingChange = useCallback((sourceColumn: string, targetField: string) => {
    setColumnMappings(prev =>
      prev.map(m =>
        m.sourceColumn === sourceColumn
          ? { ...m, targetField, confidence: 'high' as const }
          : m
      )
    );
  }, []);

  // Proceed to preview
  const handleProceedToPreview = useCallback(() => {
    // Check if company_name is mapped
    const hasCompanyName = columnMappings.some(m => m.targetField === 'company_name');
    if (!hasCompanyName) {
      setError('La colonne "Nom de l\'entreprise" doit être mappée');
      return;
    }

    setError(null);

    // Build column mapping and process rows
    const mapping = buildColumnMapping(columnMappings);
    const processed = rawRows.map(row => mapRowToProfile(row, mapping));
    setProcessedRows(processed);
    setCurrentStep('preview');
  }, [columnMappings, rawRows]);

  // Start import
  const handleStartImport = useCallback(async () => {
    if (!user) {
      setError('Vous devez être connecté pour importer');
      return;
    }

    setError(null);
    setCurrentStep('import');

    try {
      const result = await batchImportRows(processedRows, {
        userId: user.id,
        duplicateStrategy,
        enableSirenEnrichment,
        enableWebsiteAnalysis: false,
        skipEnrichmentOnError: true,
        batchSize: 10,
        delayBetweenRows: 100,
        onProgress: (status) => {
          setImportStatus({ ...status });
        },
      });

      setImportResult(result);
      setCurrentStep('results');
      onComplete?.(result);
    } catch (err: any) {
      setError(err.message || 'Erreur pendant l\'import');
    }
  }, [user, processedRows, duplicateStrategy, enableSirenEnrichment, onComplete]);

  // Reset wizard
  const handleReset = useCallback(() => {
    setCurrentStep('upload');
    setFile(null);
    setRawRows([]);
    setAvailableSheets([]);
    setSelectedSheet(null);
    setColumnMappings([]);
    setProcessedRows([]);
    setImportStatus(null);
    setImportResult(null);
    setContentAnalyses([]);
    setError(null);
  }, []);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="space-y-6">
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) handleFileUpload(droppedFile);
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileUpload(selectedFile);
                }}
              />
              <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-lg font-medium text-slate-700">
                Glissez-déposez votre fichier ici
              </p>
              <p className="text-sm text-slate-500 mt-2">
                ou cliquez pour sélectionner (CSV, Excel - max 5 Mo)
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Format attendu</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Colonne obligatoire : Nom de l'entreprise (raison sociale)</li>
                <li>• Colonnes recommandées : SIRET, SIREN (pour enrichissement automatique)</li>
                <li>• Colonnes optionnelles : Secteur, Région, Site web, Effectif...</li>
              </ul>
            </div>
          </div>
        );

      case 'sheet-select':
        return (
          <div className="space-y-4">
            <p className="text-slate-600">
              Ce fichier Excel contient plusieurs feuilles. Sélectionnez celle à importer :
            </p>
            <div className="grid gap-3">
              {availableSheets.map((sheet) => (
                <button
                  key={sheet.name}
                  onClick={() => handleSheetSelect(sheet.name)}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium">{sheet.name}</p>
                    <p className="text-sm text-slate-500">
                      {sheet.rowCount} lignes, {sheet.columnCount} colonnes
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        );

      case 'mapping':
        const detectionStats = getDetectionSummary(contentAnalyses);
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Mapping des colonnes</h3>
                <p className="text-sm text-slate-500">
                  Associez chaque colonne du fichier à un champ du profil
                </p>
              </div>
              <div className="text-sm text-slate-500">
                {rawRows.length} lignes à importer
              </div>
            </div>

            {/* Smart detection stats */}
            {detectionStats.autoDetected > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    Détection intelligente activée
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-green-700">
                  {detectionStats.emails > 0 && (
                    <span className="bg-green-100 px-2 py-1 rounded">
                      {detectionStats.emails} colonne{detectionStats.emails > 1 ? 's' : ''} email
                    </span>
                  )}
                  {detectionStats.websites > 0 && (
                    <span className="bg-green-100 px-2 py-1 rounded">
                      {detectionStats.websites} colonne{detectionStats.websites > 1 ? 's' : ''} site web
                    </span>
                  )}
                  {detectionStats.sirets > 0 && (
                    <span className="bg-green-100 px-2 py-1 rounded">
                      {detectionStats.sirets} colonne{detectionStats.sirets > 1 ? 's' : ''} SIRET/SIREN
                    </span>
                  )}
                  {detectionStats.phones > 0 && (
                    <span className="bg-green-100 px-2 py-1 rounded">
                      {detectionStats.phones} colonne{detectionStats.phones > 1 ? 's' : ''} téléphone
                    </span>
                  )}
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Types détectés automatiquement en analysant le contenu des cellules
                </p>
              </div>
            )}

            <ColumnMappingTable
              mappings={columnMappings}
              onMappingChange={handleMappingChange}
            />

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-slate-700">Options d'import</h4>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSirenEnrichment}
                  onChange={(e) => setEnableSirenEnrichment(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">
                  Enrichir automatiquement via SIREN/SIRET (données INSEE)
                </span>
              </label>

              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">En cas de doublon :</span>
                <select
                  value={duplicateStrategy}
                  onChange={(e) => setDuplicateStrategy(e.target.value as 'skip' | 'create')}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="skip">Ignorer la ligne</option>
                  <option value="create">Créer quand même</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Aperçu de l'import</h3>
                <p className="text-sm text-slate-500">
                  Vérifiez les données avant de lancer l'import
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">
                  {processedRows.filter(r => r.status === 'valid' || r.status === 'pending').length} valides
                </span>
                <span className="text-red-600">
                  {processedRows.filter(r => r.status === 'invalid').length} invalides
                </span>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Ligne</th>
                    <th className="text-left p-3 font-medium">Entreprise</th>
                    <th className="text-left p-3 font-medium">SIRET</th>
                    <th className="text-left p-3 font-medium">Région</th>
                    <th className="text-left p-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {processedRows.slice(0, 50).map((row) => (
                    <tr key={row.rowNumber} className="border-t">
                      <td className="p-3 text-slate-500">{row.rowNumber}</td>
                      <td className="p-3 font-medium">{row.profileData.company_name || '-'}</td>
                      <td className="p-3 font-mono text-xs">{row.profileData.siret || row.profileData.siren || '-'}</td>
                      <td className="p-3">{row.profileData.region || '-'}</td>
                      <td className="p-3">
                        {row.status === 'invalid' ? (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            {row.validationErrors[0]}
                          </span>
                        ) : row.validationWarnings.length > 0 ? (
                          <span className="text-amber-600">{row.validationWarnings[0]}</span>
                        ) : (
                          <span className="text-green-600">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {processedRows.length > 50 && (
                <div className="p-3 text-center text-sm text-slate-500 bg-slate-50">
                  ... et {processedRows.length - 50} autres lignes
                </div>
              )}
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="space-y-6 text-center py-8">
            <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
            <div>
              <h3 className="font-medium text-lg">{importStatus?.currentAction || 'Import en cours...'}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {importStatus?.processed || 0} / {importStatus?.totalRows || 0} profils traités
              </p>
            </div>

            {importStatus && (
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(importStatus.processed / importStatus.totalRows) * 100}%` }}
                />
              </div>
            )}

            <div className="flex justify-center gap-6 text-sm">
              <span className="text-green-600">{importStatus?.successful || 0} importés</span>
              <span className="text-amber-600">{importStatus?.skipped || 0} ignorés</span>
              <span className="text-red-600">{importStatus?.failed || 0} échoués</span>
            </div>
          </div>
        );

      case 'results':
        return (
          <div className="space-y-6">
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold">Import terminé</h3>
              <p className="text-slate-500 mt-1">
                {importResult?.batchStatus.successful || 0} profils importés avec succès
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResult?.successfulRows.length || 0}
                </div>
                <div className="text-sm text-green-700">Importés</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {importResult?.skippedRows.length || 0}
                </div>
                <div className="text-sm text-amber-700">Ignorés (doublons)</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {importResult?.failedRows.length || 0}
                </div>
                <div className="text-sm text-red-700">Échoués</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {importResult?.stats.enrichmentRate.toFixed(0) || 0}%
                </div>
                <div className="text-sm text-blue-700">Enrichis (SIREN)</div>
              </div>
            </div>

            {importResult && importResult.failedRows.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Lignes en erreur</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {importResult.failedRows.slice(0, 5).map((row) => (
                    <li key={row.rowNumber}>
                      Ligne {row.rowNumber}: {row.importError || row.validationErrors.join(', ')}
                    </li>
                  ))}
                  {importResult.failedRows.length > 5 && (
                    <li>... et {importResult.failedRows.length - 5} autres erreurs</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-xl font-semibold">Import CSV/Excel</h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2 p-4 bg-slate-50 overflow-x-auto">
        {visibleSteps.map((step, index) => {
          const stepIndex = visibleSteps.findIndex(s => s.key === currentStep);
          const isActive = step.key === currentStep;
          const isPast = visibleSteps.findIndex(s => s.key === step.key) < stepIndex;

          return (
            <div key={step.key} className="flex items-center">
              {index > 0 && (
                <div className={`w-8 h-0.5 ${isPast ? 'bg-blue-500' : 'bg-slate-300'}`} />
              )}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : isPast
                    ? 'text-blue-600'
                    : 'text-slate-400'
                }`}
              >
                {step.icon}
                <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
            <p className="text-slate-500 mt-4">Chargement...</p>
          </div>
        ) : (
          renderStepContent()
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t bg-slate-50">
        <Button
          variant="outline"
          onClick={() => {
            if (currentStep === 'upload') {
              onCancel?.();
            } else if (currentStep === 'results') {
              handleReset();
            } else {
              // Go back
              const currentIndex = visibleSteps.findIndex(s => s.key === currentStep);
              if (currentIndex > 0) {
                setCurrentStep(visibleSteps[currentIndex - 1].key);
              }
            }
          }}
          disabled={currentStep === 'import'}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {currentStep === 'results' ? 'Nouvel import' : 'Retour'}
        </Button>

        {currentStep === 'mapping' && (
          <Button onClick={handleProceedToPreview}>
            Aperçu
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {currentStep === 'preview' && (
          <Button onClick={handleStartImport}>
            Lancer l'import
            <Play className="w-4 h-4 ml-2" />
          </Button>
        )}

        {currentStep === 'results' && (
          <Button onClick={onCancel}>
            Terminer
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
