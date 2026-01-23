import { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Play,
  Loader2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building2,
  Users,
  Calendar,
} from 'lucide-react';
import {
  quickBiasCheck,
  getBiasTestResults,
  type BiasTestResult,
  type BiasFlag,
} from '@/lib/compliance/biasTestRunner';

/**
 * Bias Test Panel Component
 * EU AI Act Article 10 - Data Governance compliance
 */
export function BiasTestPanel() {
  const [status, setStatus] = useState<{
    status: 'pass' | 'warning' | 'fail';
    summary: string;
    lastTestDate?: string;
  } | null>(null);
  const [results, setResults] = useState<BiasTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [checkResult, testResults] = await Promise.all([
        quickBiasCheck(),
        getBiasTestResults(5),
      ]);
      setStatus(checkResult);
      setResults(testResults);
    } catch (error) {
      console.error('Failed to load bias test data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (s: 'pass' | 'warning' | 'fail') => {
    switch (s) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusBg = (s: 'pass' | 'warning' | 'fail') => {
    switch (s) {
      case 'pass':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
    }
  };

  const getBiasIcon = (type: BiasFlag['bias_type']) => {
    switch (type) {
      case 'geographic':
        return <MapPin className="w-4 h-4" />;
      case 'sector':
        return <Building2 className="w-4 h-4" />;
      case 'size':
        return <Users className="w-4 h-4" />;
      case 'age':
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: BiasFlag['severity']) => {
    switch (severity) {
      case 'high':
        return 'text-red-700 bg-red-100';
      case 'medium':
        return 'text-amber-700 bg-amber-100';
      case 'low':
        return 'text-blue-700 bg-blue-100';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement des tests de biais...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Tests de Biais IA</h3>
            <p className="text-xs text-slate-500">Article 10 EU AI Act</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
        >
          <Play className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Current Status */}
      {status && (
        <div className={`p-4 border-b border-slate-200 ${getStatusBg(status.status)}`}>
          <div className="flex items-start gap-3">
            {getStatusIcon(status.status)}
            <div>
              <p className="font-medium text-slate-900">{status.summary}</p>
              {status.lastTestDate && (
                <p className="text-xs text-slate-500 mt-1">
                  Dernier test: {new Date(status.lastTestDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Historique des tests</h4>

        {results.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Aucun test de biais enregistré. Exécutez un test pour vérifier la conformité.
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((result) => (
              <div key={result.test_id} className="border border-slate-200 rounded-lg">
                {/* Test Summary */}
                <button
                  onClick={() => setExpandedTest(
                    expandedTest === result.test_id ? null : result.test_id
                  )}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {result.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div className="text-left">
                      <p className="font-medium text-slate-900">{result.test_name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(result.test_date).toLocaleDateString('fr-FR')} •
                        Variance: {(result.variance_score * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {expandedTest === result.test_id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {/* Expanded Details */}
                {expandedTest === result.test_id && (
                  <div className="p-3 border-t border-slate-200 bg-slate-50">
                    {result.flagged_biases && result.flagged_biases.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">
                          Biais détectés ({result.flagged_biases.length})
                        </p>
                        {result.flagged_biases.map((bias, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 p-2 bg-white rounded border border-slate-200"
                          >
                            <span className="text-slate-500">
                              {getBiasIcon(bias.bias_type)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800">
                                  {bias.dimension}
                                </span>
                                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getSeverityColor(bias.severity)}`}>
                                  {bias.severity === 'high' ? 'Critique' :
                                   bias.severity === 'medium' ? 'Modéré' : 'Faible'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Écart: {bias.deviation_percent.toFixed(1)}% •
                                Attendu: {(bias.expected_rate * 100).toFixed(1)}% •
                                Observé: {(bias.actual_rate * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-green-700">
                        ✓ Aucun biais significatif détecté
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        Testeur: {result.tester} • Modèle: {result.model_version}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-500">
          Les tests de biais vérifient que l'IA ne discrimine pas selon la région,
          le secteur d'activité ou la taille de l'entreprise.
          Tests recommandés: mensuel (régional), trimestriel (secteurs).
        </p>
      </div>
    </div>
  );
}

export default BiasTestPanel;
