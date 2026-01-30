/**
 * BulkImportPage - Page for importing multiple company profiles
 *
 * Part of Premium Groupe feature set
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BulkImportWizard } from '@/components/bulk-import';
import { ImportResult } from '@/types/bulkImport';

export default function BulkImportPage() {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const handleComplete = (result: ImportResult) => {
    setLastResult(result);
    setShowWizard(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/app')}
            className="text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Import en masse</h1>
            <p className="text-sm text-slate-500">Importez plusieurs entreprises depuis un fichier CSV ou Excel</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {showWizard ? (
          <BulkImportWizard
            onComplete={handleComplete}
            onCancel={() => setShowWizard(false)}
          />
        ) : (
          <div className="space-y-8">
            {/* Success message from last import */}
            {lastResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-800">Import réussi</h3>
                    <p className="text-green-700 mt-1">
                      {lastResult.successfulRows.length} profils ont été importés avec succès.
                      {lastResult.stats.enrichmentRate > 0 && (
                        <span className="ml-1">
                          {lastResult.stats.enrichmentRate.toFixed(0)}% ont été enrichis avec les données SIREN.
                        </span>
                      )}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setLastResult(null)}
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Main CTA */}
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <FileSpreadsheet className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Importez vos entreprises</h2>
              <p className="text-slate-600 max-w-lg mx-auto mb-6">
                Importez plusieurs entreprises en une seule fois depuis un fichier CSV ou Excel.
                Les données seront automatiquement enrichies via le registre SIREN.
              </p>
              <Button size="lg" onClick={() => setShowWizard(true)}>
                Démarrer l'import
              </Button>
            </div>

            {/* Instructions */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-4">
                  1
                </div>
                <h3 className="font-semibold mb-2">Préparez votre fichier</h3>
                <p className="text-sm text-slate-600">
                  Créez un fichier CSV ou Excel avec au minimum une colonne pour le nom de l'entreprise.
                  Ajoutez le SIRET pour un enrichissement automatique.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-4">
                  2
                </div>
                <h3 className="font-semibold mb-2">Mappez les colonnes</h3>
                <p className="text-sm text-slate-600">
                  L'assistant détecte automatiquement vos colonnes. Vérifiez et ajustez le mapping
                  si nécessaire avant de lancer l'import.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-4">
                  3
                </div>
                <h3 className="font-semibold mb-2">Enrichissement automatique</h3>
                <p className="text-sm text-slate-600">
                  Chaque entreprise avec un SIRET est automatiquement enrichie avec les données
                  officielles : NAF, forme juridique, adresse, effectif...
                </p>
              </div>
            </div>

            {/* Format template */}
            <div className="bg-slate-100 rounded-xl p-6">
              <h3 className="font-semibold mb-4">Format recommandé</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 border-b">Raison sociale</th>
                      <th className="text-left p-3 border-b">SIRET</th>
                      <th className="text-left p-3 border-b">Site web</th>
                      <th className="text-left p-3 border-b">Région</th>
                      <th className="text-left p-3 border-b">Secteur</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-slate-600">
                      <td className="p-3 border-b">Entreprise Exemple SARL</td>
                      <td className="p-3 border-b font-mono">12345678901234</td>
                      <td className="p-3 border-b">www.exemple.fr</td>
                      <td className="p-3 border-b">Île-de-France</td>
                      <td className="p-3 border-b">Tech / Numérique</td>
                    </tr>
                    <tr className="text-slate-600">
                      <td className="p-3">Innovation Corp SAS</td>
                      <td className="p-3 font-mono">98765432109876</td>
                      <td className="p-3">innovation-corp.com</td>
                      <td className="p-3">Bretagne</td>
                      <td className="p-3">Industrie</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Seule la colonne "Raison sociale" est obligatoire. Le SIRET permet l'enrichissement automatique.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
