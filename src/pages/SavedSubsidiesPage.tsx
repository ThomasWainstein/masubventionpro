import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSavedSubsidies } from '@/hooks/useSavedSubsidies';
import { getSubsidyTitle, SavedSubsidy } from '@/types';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'saved', label: 'Sauvegardee', color: 'bg-slate-100 text-slate-700' },
  { value: 'interested', label: 'Interessee', color: 'bg-blue-100 text-blue-700' },
  { value: 'applied', label: 'Candidature envoyee', color: 'bg-amber-100 text-amber-700' },
  { value: 'received', label: 'Obtenue', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'rejected', label: 'Refusee', color: 'bg-red-100 text-red-700' },
];

export function SavedSubsidiesPage() {
  const { savedSubsidies, loading, unsaveSubsidy, updateStatus } = useSavedSubsidies();

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

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Mes subventions - MaSubventionPro</title>
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes subventions</h1>
          <p className="text-slate-600 mt-1">
            Gerez les aides que vous avez sauvegardees
          </p>
        </div>
        <Link to="/app/search">
          <Button>
            <Search className="mr-2 h-4 w-4" />
            Rechercher des aides
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {STATUS_OPTIONS.map((status) => {
          const count = savedSubsidies.filter((s) => s.status === status.value).length;
          return (
            <div
              key={status.value}
              className="bg-white rounded-lg border border-slate-200 p-4 text-center"
            >
              <p className="text-2xl font-bold text-slate-900">{count}</p>
              <p className="text-sm text-slate-600">{status.label}</p>
            </div>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : savedSubsidies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4">
            <Bookmark className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Aucune aide sauvegardee</h3>
          <p className="text-slate-600 mt-2 max-w-md mx-auto">
            Commencez par rechercher des aides et sauvegardez celles qui vous interessent
          </p>
          <Link to="/app/search">
            <Button className="mt-4">
              <Search className="mr-2 h-4 w-4" />
              Rechercher des aides
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {savedSubsidies.map((saved) => {
            const subsidy = saved.subsidy;
            if (!subsidy) return null;

            const title = getSubsidyTitle(subsidy);
            const statusOption = getStatusOption(saved.status);

            return (
              <div
                key={saved.id}
                className="bg-white rounded-xl border border-slate-200 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/app/subsidy/${subsidy.id}`}
                      className="block group"
                    >
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {title}
                      </h3>
                    </Link>
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
                          <span>Jusqu'a {formatAmount(subsidy.amount_max)}</span>
                        </div>
                      )}
                      {subsidy.deadline && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {new Date(subsidy.deadline).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
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
                </div>

                {/* Actions Row */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4">
                  <Link to={`/app/subsidy/${subsidy.id}`}>
                    <Button variant="outline" size="sm">
                      Voir les details
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SavedSubsidiesPage;
