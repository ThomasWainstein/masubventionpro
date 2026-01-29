import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSavedSubsidies } from '@/hooks/useSavedSubsidies';
import { useRecommendedSubsidies } from '@/hooks/useRecommendedSubsidies';
import { useProfile } from '@/contexts/ProfileContext';
import { getSubsidyTitle, SavedSubsidy } from '@/types';
import { SubsidyCard } from '@/components/search/SubsidyCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bookmark,
  Search,
  Loader2,
  Calendar,
  Euro,
  Building,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Save,
  Sparkles,
  Star,
  ArrowRight,
  ArrowLeft,
  Send,
  Check,
} from 'lucide-react';
import { SelectionToolbar } from '@/components/export/SelectionToolbar';
import { EmailComposerModal } from '@/components/export/EmailComposerModal';
import { exportSubsidiesToPDF } from '@/lib/pdfExport';

const STATUS_OPTIONS = [
  { value: 'saved', label: 'Sauvegardée', color: 'bg-slate-100 text-slate-700' },
  { value: 'interested', label: 'Intéressée', color: 'bg-blue-100 text-blue-700' },
  { value: 'applied', label: 'Candidature envoyée', color: 'bg-amber-100 text-amber-700' },
  { value: 'received', label: 'Obtenue', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'rejected', label: 'Refusée', color: 'bg-red-100 text-red-700' },
];

// Calculate days until deadline
function getDeadlineStatus(deadline: string | null): {
  daysLeft: number | null;
  urgency: 'expired' | 'urgent' | 'warning' | 'normal' | null;
  label: string | null;
} {
  if (!deadline) return { daysLeft: null, urgency: null, label: null };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { daysLeft, urgency: 'expired', label: 'Expirée' };
  } else if (daysLeft === 0) {
    return { daysLeft, urgency: 'urgent', label: "Aujourd'hui" };
  } else if (daysLeft <= 3) {
    return { daysLeft, urgency: 'urgent', label: `${daysLeft}j restant${daysLeft > 1 ? 's' : ''}` };
  } else if (daysLeft <= 7) {
    return { daysLeft, urgency: 'warning', label: `${daysLeft}j restants` };
  } else if (daysLeft <= 30) {
    return { daysLeft, urgency: 'normal', label: `${daysLeft}j restants` };
  }
  return { daysLeft, urgency: null, label: null };
}

export function SavedSubsidiesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { savedSubsidies, loading, unsaveSubsidy, updateStatus, updateNotes, isSaved, toggleSave } = useSavedSubsidies();
  const { profile, hasProfile } = useProfile();

  // V5 Hybrid Matcher - Profile-based recommendations
  const {
    recommendations,
    loading: loadingRecommendations,
    isAIScored,
  } = useRecommendedSubsidies(hasProfile ? profile : null, { limit: 50, useAIScoring: true });

  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string | null>(
    searchParams.get('status')
  );

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSubsidies, setSelectedSubsidies] = useState<Set<string>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Create a map of subsidy ID -> AI match data for quick lookup
  const aiScoresMap = useMemo(() => {
    const map = new Map<string, { matchScore?: number; matchReasons?: string[] }>();
    for (const rec of recommendations) {
      map.set(rec.id, {
        matchScore: rec.matchScore,
        matchReasons: rec.matchReasons,
      });
    }
    return map;
  }, [recommendations]);

  // Sync filter with URL params
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  // Update URL when filter changes
  const handleStatusFilterChange = (status: string | null) => {
    setStatusFilter(status);
    if (status) {
      setSearchParams({ status });
    } else {
      setSearchParams({});
    }
  };

  // Filter subsidies by status
  const filteredSubsidies = statusFilter
    ? savedSubsidies.filter((s) => s.status === statusFilter)
    : savedSubsidies;

  const toggleNotes = (savedId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(savedId)) {
        next.delete(savedId);
      } else {
        next.add(savedId);
      }
      return next;
    });
  };

  const handleRemove = async (subsidyId: string) => {
    if (window.confirm('Voulez-vous vraiment retirer cette aide de vos sauvegardes ?')) {
      try {
        await unsaveSubsidy(subsidyId);
      } catch (error) {
        console.error('Error removing saved subsidy:', error);
      }
    }
  };

  const handleStatusChange = async (savedId: string, status: SavedSubsidy['status']) => {
    try {
      await updateStatus(savedId, status);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleNotesChange = (savedId: string, value: string) => {
    setEditingNotes((prev) => ({ ...prev, [savedId]: value }));
  };

  const handleSaveNotes = async (savedId: string, currentNotes: string | null) => {
    const newNotes = editingNotes[savedId] ?? currentNotes ?? '';
    setSavingNotes((prev) => new Set(prev).add(savedId));
    try {
      await updateNotes(savedId, newNotes);
      setEditingNotes((prev) => {
        const next = { ...prev };
        delete next[savedId];
        return next;
      });
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setSavingNotes((prev) => {
        const next = new Set(prev);
        next.delete(savedId);
        return next;
      });
    }
  };

  // Format amount
  const formatAmount = (amount: number | null) => {
    if (amount === null) return null;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M€`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K€`;
    return `${amount}€`;
  };

  const getStatusOption = (status: string) => {
    return STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];
  };

  // Selection handlers
  const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedSubsidies(new Set());
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedSubsidies(new Set());
  };

  const handleToggleSelection = (subsidyId: string) => {
    setSelectedSubsidies((prev) => {
      const next = new Set(prev);
      if (next.has(subsidyId)) {
        next.delete(subsidyId);
      } else {
        next.add(subsidyId);
      }
      return next;
    });
  };

  // Get unsaved recommendations (not in saved list)
  const unsavedRecommendations = useMemo(() => {
    return recommendations.filter((rec) => !savedSubsidies.some((s) => s.subsidy_id === rec.id));
  }, [recommendations, savedSubsidies]);

  // Total count of all selectable items (saved + unsaved recommendations)
  const totalSelectableCount = filteredSubsidies.length + (hasProfile ? unsavedRecommendations.slice(0, 12).length : 0);

  const handleSelectAll = () => {
    const savedIds = filteredSubsidies.map((s) => s.subsidy_id);
    const recommendedIds = hasProfile ? unsavedRecommendations.slice(0, 12).map((s) => s.id) : [];
    setSelectedSubsidies(new Set([...savedIds, ...recommendedIds]));
  };

  const handleDeselectAll = () => {
    setSelectedSubsidies(new Set());
  };

  const handleExportPDF = async () => {
    // Get selected subsidies data from both saved and recommendations
    const fromSaved = filteredSubsidies
      .filter((s) => selectedSubsidies.has(s.subsidy_id))
      .map((s) => s.subsidy!)
      .filter(Boolean);
    const fromRecommended = unsavedRecommendations
      .filter((s) => selectedSubsidies.has(s.id));
    const selectedData = [...fromSaved, ...fromRecommended];

    if (selectedData.length === 0) return;

    // Export PDF with profile context (with logos)
    await exportSubsidiesToPDF(selectedData, {
      download: true,
      profile: hasProfile ? profile : null,
    });
  };

  const handleSendEmail = () => {
    // Get selected subsidies data
    const selectedData = filteredSubsidies
      .filter((s) => selectedSubsidies.has(s.subsidy_id))
      .map((s) => s.subsidy!)
      .filter(Boolean);

    if (selectedData.length === 0) return;

    // Open email composer modal
    setShowEmailModal(true);
  };

  // Get selected subsidies for email modal (from both saved and recommendations)
  const selectedSubsidiesData = useMemo(() => {
    const fromSaved = filteredSubsidies
      .filter((s) => selectedSubsidies.has(s.subsidy_id))
      .map((s) => s.subsidy!)
      .filter(Boolean);
    const fromRecommended = unsavedRecommendations
      .filter((s) => selectedSubsidies.has(s.id));
    return [...fromSaved, ...fromRecommended];
  }, [filteredSubsidies, unsavedRecommendations, selectedSubsidies]);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Mes subventions - MaSubventionPro</title>
      </Helmet>

      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/app')}
        className="-ml-2 text-slate-600"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour au tableau de bord
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes subventions</h1>
          <p className="text-slate-600 mt-1">
            Gérez les aides que vous avez sauvegardées
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(savedSubsidies.length > 0 || (hasProfile && recommendations.length > 0)) && !isSelectionMode && (
            <Button variant="outline" onClick={handleEnterSelectionMode}>
              <Send className="mr-2 h-4 w-4" />
              Transmettre
            </Button>
          )}
          {isSelectionMode && (
            <Button variant="ghost" onClick={handleExitSelectionMode}>
              Annuler
            </Button>
          )}
          <Link to="/app/search">
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Rechercher des aides
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats / Filter */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {STATUS_OPTIONS.map((status) => {
          const count = savedSubsidies.filter((s) => s.status === status.value).length;
          const isActive = statusFilter === status.value;
          return (
            <button
              key={status.value}
              onClick={() => handleStatusFilterChange(isActive ? null : status.value)}
              className={`rounded-lg border p-4 text-center transition-all ${
                isActive
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-sm text-slate-600">{status.label}</p>
            </button>
          );
        })}
      </div>

      {/* Active Filter Indicator */}
      {statusFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">
            Filtre actif: <span className="font-medium">{getStatusOption(statusFilter).label}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusFilterChange(null)}
            className="text-slate-500 h-7"
          >
            Effacer le filtre
          </Button>
        </div>
      )}

      {/* Urgent Deadlines Alert */}
      {(() => {
        const urgentSubsidies = savedSubsidies.filter((s) => {
          if (!s.subsidy?.deadline) return false;
          if (s.status === 'received' || s.status === 'rejected') return false;
          const status = getDeadlineStatus(s.subsidy.deadline);
          return status.urgency === 'urgent' || status.urgency === 'warning';
        });

        if (urgentSubsidies.length === 0) return null;

        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">
                  {urgentSubsidies.length} aide{urgentSubsidies.length > 1 ? 's' : ''} avec deadline proche
                </h3>
                <div className="mt-2 space-y-1">
                  {urgentSubsidies.slice(0, 3).map((s) => {
                    const status = getDeadlineStatus(s.subsidy?.deadline || null);
                    return (
                      <Link
                        key={s.id}
                        to={`/app/subsidy/${s.subsidy_id}`}
                        className="block text-sm text-amber-700 hover:text-amber-900"
                      >
                        <span className="font-medium">{status.label}</span>
                        {' - '}
                        {getSubsidyTitle(s.subsidy!)}
                      </Link>
                    );
                  })}
                  {urgentSubsidies.length > 3 && (
                    <p className="text-sm text-amber-600">
                      + {urgentSubsidies.length - 3} autre{urgentSubsidies.length - 3 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Saved Subsidies List - Now shown FIRST */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : savedSubsidies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4">
            <Bookmark className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Aucune aide sauvegardée</h3>
          <p className="text-slate-600 mt-2 max-w-md mx-auto">
            {hasProfile
              ? 'Sauvegardez des aides depuis les recommandations ci-dessous ou recherchez-en de nouvelles'
              : 'Commencez par rechercher des aides et sauvegardez celles qui vous intéressent'}
          </p>
          <Link to="/app/search">
            <Button className="mt-4">
              <Search className="mr-2 h-4 w-4" />
              Rechercher des aides
            </Button>
          </Link>
        </div>
      ) : filteredSubsidies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-600">Aucune aide avec ce statut</p>
          <Button
            variant="outline"
            onClick={() => handleStatusFilterChange(null)}
            className="mt-3"
          >
            Voir toutes les aides
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubsidies.map((saved) => {
            const subsidy = saved.subsidy;
            if (!subsidy) return null;

            const title = getSubsidyTitle(subsidy);
            const statusOption = getStatusOption(saved.status);
            const aiData = aiScoresMap.get(subsidy.id);

            const isSelected = selectedSubsidies.has(saved.subsidy_id);

            return (
              <div
                key={saved.id}
                onClick={isSelectionMode ? () => handleToggleSelection(saved.subsidy_id) : undefined}
                className={`bg-white rounded-xl border p-5 transition-all ${
                  isSelectionMode ? 'cursor-pointer hover:shadow-md' : ''
                } ${
                  isSelected
                    ? 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Selection Checkbox */}
                  {isSelectionMode && (
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4 text-white" />}
                    </div>
                  )}
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      {isSelectionMode ? (
                        <h3 className="font-semibold text-slate-900 line-clamp-2 flex-1">
                          {title}
                        </h3>
                      ) : (
                        <Link
                          to={`/app/subsidy/${subsidy.id}`}
                          className="block group flex-1"
                        >
                          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {title}
                          </h3>
                        </Link>
                      )}
                      {/* AI Match Score Badge */}
                      {aiData?.matchScore && (
                        <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                          <Sparkles className="h-3.5 w-3.5" />
                          {aiData.matchScore}%
                        </div>
                      )}
                    </div>
                    {/* AI Match Reasons */}
                    {aiData?.matchReasons && aiData.matchReasons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {aiData.matchReasons.slice(0, 3).map((reason, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                    {subsidy.agency && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
                        <Building className="h-3.5 w-3.5" />
                        <span className="truncate">{subsidy.agency}</span>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                      {subsidy.amount_max && (
                        <div className="flex items-center gap-1 text-emerald-700">
                          <Euro className="h-3.5 w-3.5" />
                          <span>Jusqu'à {formatAmount(subsidy.amount_max)}</span>
                        </div>
                      )}
                      {subsidy.deadline && (() => {
                        const deadlineStatus = getDeadlineStatus(subsidy.deadline);
                        const urgencyStyles = {
                          expired: 'bg-slate-100 text-slate-500',
                          urgent: 'bg-red-100 text-red-700',
                          warning: 'bg-amber-100 text-amber-700',
                          normal: 'bg-blue-50 text-blue-700',
                        };

                        return (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-slate-600">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {new Date(subsidy.deadline).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                            {deadlineStatus.urgency && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  urgencyStyles[deadlineStatus.urgency]
                                }`}
                              >
                                {deadlineStatus.urgency === 'urgent' && (
                                  <AlertTriangle className="h-3 w-3" />
                                )}
                                {deadlineStatus.urgency === 'warning' && (
                                  <Clock className="h-3 w-3" />
                                )}
                                {deadlineStatus.label}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Actions - hidden in selection mode */}
                  {!isSelectionMode && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Status Select */}
                      <Select
                        value={saved.status}
                        onValueChange={(value) =>
                          handleStatusChange(saved.id, value as SavedSubsidy['status'])
                        }
                      >
                        <SelectTrigger className={`w-[180px] ${statusOption.color}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(saved.subsidy_id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Actions Row - hidden in selection mode */}
                {!isSelectionMode && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4">
                    <Link to={`/app/subsidy/${subsidy.id}`}>
                      <Button variant="outline" size="sm">
                        Voir les détails
                      </Button>
                    </Link>
                    {subsidy.application_url && (
                      <a
                        href={subsidy.application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Postuler
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleNotes(saved.id)}
                      className="ml-auto text-slate-500"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Notes
                      {saved.notes && <span className="ml-1 text-blue-600">*</span>}
                      {expandedNotes.has(saved.id) ? (
                        <ChevronUp className="h-4 w-4 ml-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Notes Section - hidden in selection mode */}
                {!isSelectionMode && expandedNotes.has(saved.id) && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes personnelles
                    </label>
                    <Textarea
                      placeholder="Ajoutez des notes sur cette aide (ex: documents requis, contacts, étapes...)'"
                      value={editingNotes[saved.id] ?? saved.notes ?? ''}
                      onChange={(e) => handleNotesChange(saved.id, e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveNotes(saved.id, saved.notes)}
                        disabled={
                          savingNotes.has(saved.id) ||
                          (editingNotes[saved.id] ?? saved.notes ?? '') === (saved.notes ?? '')
                        }
                      >
                        {savingNotes.has(saved.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-1" />
                            Enregistrer
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AI Recommendations Section - Shown AFTER saved subsidies */}
      {hasProfile && recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Découvrir d'autres aides
              </h2>
              {isAIScored && (
                <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                  <Sparkles className="h-3 w-3" />
                  Score IA - basé sur votre profil entreprise
                </p>
              )}
            </div>
            <Link to="/app/search" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loadingRecommendations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-slate-600">Calcul des recommandations...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {unsavedRecommendations
                .slice(0, 12)
                .map((subsidy) => (
                  <SubsidyCard
                    key={subsidy.id}
                    subsidy={subsidy}
                    isSaved={isSaved(subsidy.id)}
                    onToggleSave={isSelectionMode ? undefined : toggleSave}
                    matchScore={subsidy.matchScore}
                    matchReasons={subsidy.matchReasons}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedSubsidies.has(subsidy.id)}
                    onSelect={handleToggleSelection}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Selection Toolbar */}
      {isSelectionMode && (
        <SelectionToolbar
          selectedCount={selectedSubsidies.size}
          totalCount={totalSelectableCount}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onExportPDF={handleExportPDF}
          onSendEmail={handleSendEmail}
          onCancel={handleExitSelectionMode}
        />
      )}

      {/* Email Composer Modal */}
      <EmailComposerModal
        open={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          // Exit selection mode after sending
          handleExitSelectionMode();
        }}
        subsidies={selectedSubsidiesData}
        profile={hasProfile ? profile : null}
      />
    </div>
  );
}

export default SavedSubsidiesPage;
