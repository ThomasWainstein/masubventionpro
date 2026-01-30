/**
 * ColumnMappingTable - Interactive column mapping interface
 *
 * Displays source columns with auto-detected mappings and allows
 * manual override via dropdown selection
 */

import { useMemo } from 'react';
import { CheckCircle, AlertCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { ColumnMappingItem, TARGET_FIELDS } from '@/types/bulkImport';

interface ColumnMappingTableProps {
  mappings: ColumnMappingItem[];
  onMappingChange: (sourceColumn: string, targetField: string) => void;
}

export function ColumnMappingTable({ mappings, onMappingChange }: ColumnMappingTableProps) {
  // Group target fields by category
  const groupedTargetFields = useMemo(() => {
    const groups: Record<string, typeof TARGET_FIELDS[number][]> = {};
    for (const field of TARGET_FIELDS) {
      if (!groups[field.category]) {
        groups[field.category] = [];
      }
      groups[field.category].push(field);
    }
    return groups;
  }, []);

  // Category labels
  const categoryLabels: Record<string, string> = {
    identity: 'Identification',
    contact: 'Contact',
    location: 'Localisation',
    business: 'Activité',
    other: 'Autre',
  };

  // Stats
  const stats = useMemo(() => {
    const mapped = mappings.filter(m => m.targetField !== '_skip').length;
    const total = mappings.length;
    const hasRequired = mappings.some(m => m.targetField === 'company_name');
    const hasSiret = mappings.some(m => m.targetField === 'siret' || m.targetField === 'siren');
    return { mapped, total, hasRequired, hasSiret };
  }, [mappings]);

  // Get confidence indicator
  const getConfidenceIndicator = (confidence: 'high' | 'medium' | 'low', targetField: string) => {
    if (targetField === '_skip') {
      return <span className="text-slate-400">—</span>;
    }

    switch (confidence) {
      case 'high':
        return <span title="Confiance haute"><CheckCircle className="w-4 h-4 text-green-500" /></span>;
      case 'medium':
        return <span title="Confiance moyenne"><HelpCircle className="w-4 h-4 text-amber-500" /></span>;
      case 'low':
        return <span title="Confiance basse"><AlertCircle className="w-4 h-4 text-red-500" /></span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-600">
          {stats.mapped} / {stats.total} colonnes mappées
        </span>
        {stats.hasRequired ? (
          <span className="text-green-600 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Nom d'entreprise mappé
          </span>
        ) : (
          <span className="text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Nom d'entreprise requis
          </span>
        )}
        {stats.hasSiret && (
          <span className="text-blue-600 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Enrichissement SIREN disponible
          </span>
        )}
      </div>

      {/* Mapping table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3 font-medium w-8"></th>
              <th className="text-left p-3 font-medium">Colonne du fichier</th>
              <th className="text-left p-3 font-medium w-8">
                <ArrowRight className="w-4 h-4" />
              </th>
              <th className="text-left p-3 font-medium">Champ MaSubventionPro</th>
              <th className="text-left p-3 font-medium">Exemple de valeur</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping) => (
              <tr
                key={mapping.sourceColumn}
                className={`border-t ${
                  mapping.targetField === '_skip' ? 'bg-slate-50 text-slate-400' : ''
                }`}
              >
                <td className="p-3">
                  {getConfidenceIndicator(mapping.confidence, mapping.targetField)}
                </td>
                <td className="p-3 font-medium">
                  {mapping.sourceColumn}
                  {mapping.isRequired && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </td>
                <td className="p-3 text-slate-300">
                  <ArrowRight className="w-4 h-4" />
                </td>
                <td className="p-3">
                  <select
                    value={mapping.targetField}
                    onChange={(e) => onMappingChange(mapping.sourceColumn, e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      mapping.targetField === '_skip'
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-white'
                    }`}
                  >
                    {Object.entries(groupedTargetFields).map(([category, fields]) => (
                      <optgroup key={category} label={categoryLabels[category]}>
                        {fields.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                            {field.required && ' *'}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </td>
                <td className="p-3 text-slate-500 font-mono text-xs">
                  {mapping.sampleValues.length > 0 ? (
                    <div className="space-y-1">
                      {mapping.sampleValues.slice(0, 2).map((value, i) => (
                        <div key={i} className="truncate max-w-[200px]" title={value}>
                          {value || <span className="text-slate-300">—</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          Auto-détecté (confiance haute)
        </span>
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-amber-500" />
          Probable (confiance moyenne)
        </span>
        <span className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-red-500" />
          À vérifier (confiance basse)
        </span>
        <span className="text-red-500">* Champ obligatoire</span>
      </div>
    </div>
  );
}
