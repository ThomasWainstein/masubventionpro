import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  BarChart3,
  Users,
  MessageSquare,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Clock,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  Shield,
  Activity,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BiasTestPanel } from '@/components/compliance/BiasTestPanel';
import { EUDatabaseReminder } from '@/components/compliance/EUDatabaseReminder';

interface DailyMetrics {
  metric_date: string;
  total_recommendations: number;
  total_chat_messages: number;
  unique_users: number;
  hallucination_reports: number;
  broken_link_reports: number;
  incorrect_eligibility_reports: number;
  positive_feedback_count: number;
  negative_feedback_count: number;
  error_count: number;
  avg_response_time_ms: number;
}

export default function ComplianceMetricsPage() {
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error: fetchError } = await supabase
        .from('compliance_metrics_daily')
        .select('*')
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: false });

      if (fetchError) throw fetchError;
      setMetrics(data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des metriques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  // Calculate totals
  const totals = metrics.reduce(
    (acc, m) => ({
      recommendations: acc.recommendations + (m.total_recommendations || 0),
      chatMessages: acc.chatMessages + (m.total_chat_messages || 0),
      uniqueUsers: acc.uniqueUsers + (m.unique_users || 0),
      hallucinationReports: acc.hallucinationReports + (m.hallucination_reports || 0),
      brokenLinkReports: acc.brokenLinkReports + (m.broken_link_reports || 0),
      incorrectEligibility: acc.incorrectEligibility + (m.incorrect_eligibility_reports || 0),
      positiveFeedback: acc.positiveFeedback + (m.positive_feedback_count || 0),
      negativeFeedback: acc.negativeFeedback + (m.negative_feedback_count || 0),
      errors: acc.errors + (m.error_count || 0),
    }),
    {
      recommendations: 0,
      chatMessages: 0,
      uniqueUsers: 0,
      hallucinationReports: 0,
      brokenLinkReports: 0,
      incorrectEligibility: 0,
      positiveFeedback: 0,
      negativeFeedback: 0,
      errors: 0,
    }
  );

  // Calculate averages
  const avgResponseTime = metrics.length
    ? metrics.reduce((sum, m) => sum + (m.avg_response_time_ms || 0), 0) / metrics.length
    : 0;

  const totalFeedback = totals.positiveFeedback + totals.negativeFeedback;
  const satisfactionRate = totalFeedback > 0
    ? Math.round((totals.positiveFeedback / totalFeedback) * 100)
    : 0;

  const totalQualityIssues = totals.hallucinationReports + totals.brokenLinkReports + totals.incorrectEligibility;
  const qualityRate = totals.recommendations > 0
    ? Math.round(((totals.recommendations - totalQualityIssues) / totals.recommendations) * 100)
    : 100;

  return (
    <>
      <Helmet>
        <title>Metriques de Conformite | MaSubventionPro</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  to="/app/settings"
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-600" />
                    Metriques de Conformite IA
                  </h1>
                  <p className="text-sm text-slate-500">
                    EU AI Act Articles 12 & 19 - Surveillance et journalisation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Date Range Selector */}
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                  {(['7d', '30d', '90d'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        dateRange === range
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {range === '7d' ? '7 jours' : range === '30d' ? '30 jours' : '90 jours'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={fetchMetrics}
                  disabled={loading}
                  className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* EU Database Registration Reminder */}
          <EUDatabaseReminder className="mb-6" />

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total AI Requests */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-xs text-slate-500">Article 19</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {(totals.recommendations + totals.chatMessages).toLocaleString('fr-FR')}
              </p>
              <p className="text-sm text-slate-500">Requetes IA totales</p>
              <div className="mt-2 text-xs text-slate-400">
                {totals.recommendations.toLocaleString('fr-FR')} recommandations |{' '}
                {totals.chatMessages.toLocaleString('fr-FR')} messages
              </div>
            </div>

            {/* Unique Users */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs text-slate-500">Usage</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {totals.uniqueUsers.toLocaleString('fr-FR')}
              </p>
              <p className="text-sm text-slate-500">Utilisateurs uniques</p>
              <div className="mt-2 text-xs text-slate-400">
                Sur les {dateRange === '7d' ? '7' : dateRange === '30d' ? '30' : '90'} derniers jours
              </div>
            </div>

            {/* Quality Rate */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${qualityRate >= 95 ? 'bg-green-100' : qualityRate >= 90 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                  <Activity className={`w-5 h-5 ${qualityRate >= 95 ? 'text-green-600' : qualityRate >= 90 ? 'text-yellow-600' : 'text-red-600'}`} />
                </div>
                <span className="text-xs text-slate-500">Qualite</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{qualityRate}%</p>
              <p className="text-sm text-slate-500">Taux de qualite</p>
              <div className="mt-2 text-xs text-slate-400">
                {totalQualityIssues} problemes signales
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-xs text-slate-500">Performance</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {avgResponseTime > 0 ? `${Math.round(avgResponseTime)}ms` : 'N/A'}
              </p>
              <p className="text-sm text-slate-500">Temps de reponse moyen</p>
              <div className="mt-2 text-xs text-slate-400">
                {totals.errors} erreurs systeme
              </div>
            </div>
          </div>

          {/* Quality Issues & Feedback */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Quality Issues */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Problemes de Qualite Signales
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Article 10 - Surveillance des biais et erreurs
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">Informations obsoletes</p>
                    <p className="text-sm text-slate-500">Hallucinations detectees</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    totals.hallucinationReports === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {totals.hallucinationReports}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">Liens casses</p>
                    <p className="text-sm text-slate-500">URLs non fonctionnelles</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    totals.brokenLinkReports === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {totals.brokenLinkReports}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">Eligibilite incorrecte</p>
                    <p className="text-sm text-slate-500">Criteres mal evalues</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    totals.incorrectEligibility === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {totals.incorrectEligibility}
                  </span>
                </div>
              </div>
            </div>

            {/* User Feedback */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Retours Utilisateurs
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Article 14 - Controle humain
                </p>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-8 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ThumbsUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{totals.positiveFeedback}</p>
                      <p className="text-sm text-slate-500">Positifs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <ThumbsDown className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{totals.negativeFeedback}</p>
                      <p className="text-sm text-slate-500">Negatifs</p>
                    </div>
                  </div>
                </div>

                {/* Satisfaction Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Taux de satisfaction</span>
                    <span className="text-sm font-bold text-slate-900">{satisfactionRate}%</span>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        satisfactionRate >= 80 ? 'bg-green-500' : satisfactionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${satisfactionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bias Testing Panel */}
          <div className="mb-8">
            <BiasTestPanel />
          </div>

          {/* Daily Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-500" />
                Detail Journalier
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Recomm.</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Messages</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Utilisateurs</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Erreurs</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Temps Rep.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {metrics.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        Aucune donnee pour cette periode
                      </td>
                    </tr>
                  )}
                  {metrics.map((m) => (
                    <tr key={m.metric_date} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {new Date(m.metric_date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-right">
                        {m.total_recommendations || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-right">
                        {m.total_chat_messages || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-right">
                        {m.unique_users || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={`${m.error_count > 0 ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                          {m.error_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-right">
                        {m.avg_response_time_ms ? `${Math.round(m.avg_response_time_ms)}ms` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compliance Note */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Conformité EU AI Act</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Ce tableau de bord répond aux exigences des Articles 12 (Journalisation) et 19 (Logs) du Règlement
                  EU 2024/1689. Les données sont conservées pendant 6 mois minimum et exportables sur demande des
                  autorités de contrôle.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
