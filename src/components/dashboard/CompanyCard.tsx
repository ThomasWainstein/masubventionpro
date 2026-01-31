import { Link } from 'react-router-dom';
import { Building2, MapPin, Users, ArrowRight, Sparkles, Trash2, Pencil, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompanyCardProps {
  id: string;
  companyName: string;
  sector?: string;
  region?: string;
  employees?: string;
  legalForm?: string;
  hasWebsiteIntelligence?: boolean;
  matchCount?: number;
  isActive?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export function CompanyCard({
  id,
  companyName,
  sector,
  region,
  employees,
  legalForm,
  hasWebsiteIntelligence,
  matchCount,
  isActive = false,
  onSelect,
  onDelete,
  canDelete = true,
}: CompanyCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border-2 p-5 transition-all hover:shadow-md ${
        isActive
          ? 'border-blue-500 ring-2 ring-blue-100'
          : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${
            isActive ? 'bg-blue-100' : 'bg-slate-100'
          }`}
        >
          <Building2 className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-600'}`} />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 truncate" title={companyName}>
              {companyName}
            </h3>
            <div className="flex-shrink-0 flex items-center gap-1">
              <Link to={`/app/profile/edit?id=${id}`}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Modifier">
                  <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                </Button>
              </Link>
              {canDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Supprimer"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                </Button>
              )}
            </div>
          </div>
          {legalForm && (
            <p className="text-xs text-slate-500 truncate">{legalForm}</p>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div className="space-y-1.5 mb-4">
        {sector && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{sector}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {region && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {region}
            </span>
          )}
          {employees && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {employees} sal.
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3">
          {matchCount !== undefined && matchCount > 0 && (
            <span className="text-sm font-medium text-emerald-600">
              {matchCount} aides
            </span>
          )}
          {hasWebsiteIntelligence && (
            <span className="flex items-center gap-1 text-xs text-purple-600">
              <Sparkles className="h-3 w-3" />
              IA enrichi
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={isActive ? 'default' : 'outline'}
          onClick={onSelect}
          asChild={!onSelect}
        >
          {onSelect ? (
            <>
              {isActive ? 'Sélectionnée' : 'Sélectionner'}
            </>
          ) : (
            <Link to={`/app/search?profile=${id}`}>
              Voir les aides
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          )}
        </Button>
      </div>
    </div>
  );
}

interface AddCompanyCardProps {
  remainingSlots: number;
}

export function AddCompanyCard({
  remainingSlots,
}: AddCompanyCardProps) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-slate-300 p-5 flex flex-col items-center justify-center min-h-[200px] hover:border-blue-400 transition-colors">
      <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm mb-3">
        <Building2 className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-700 mb-1">Ajouter une société</p>
      <p className="text-xs text-slate-500 mb-4">
        {remainingSlots} place{remainingSlots > 1 ? 's' : ''} disponible{remainingSlots > 1 ? 's' : ''}
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <Link to="/app/profile/setup">
          <Button size="sm" variant="outline">
            Par SIRET
          </Button>
        </Link>
        <Link to="/app/import">
          <Button size="sm" variant="outline">
            Import fichier
          </Button>
        </Link>
      </div>
    </div>
  );
}

interface BuyMoreCompaniesCardProps {
  planType: 'business' | 'premium';
  onBuy: () => void;
  loading?: boolean;
}

export function BuyMoreCompaniesCard({
  planType,
  onBuy,
  loading = false,
}: BuyMoreCompaniesCardProps) {
  const isPremium = planType === 'premium';
  const price = 99;
  const companiesPerPack = isPremium ? 5 : 1;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-300 p-5 flex flex-col items-center justify-center min-h-[200px] hover:border-blue-400 transition-colors">
      <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm mb-3">
        <Plus className="h-6 w-6 text-blue-500" />
      </div>
      <p className="text-sm font-medium text-slate-700 mb-1">Capacité atteinte</p>
      <p className="text-xs text-slate-600 text-center mb-2 max-w-[180px]">
        Ajoutez {isPremium ? 'un pack de 5 sociétés' : 'une société'} supplémentaire{isPremium ? 's' : ''}
      </p>
      <p className="text-lg font-bold text-blue-600 mb-3">
        +{price}€ HT{isPremium ? '' : '/société'}
      </p>
      <Button
        size="sm"
        onClick={onBuy}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Chargement...
          </>
        ) : (
          <>
            <Plus className="mr-1 h-4 w-4" />
            Acheter {companiesPerPack} place{companiesPerPack > 1 ? 's' : ''}
          </>
        )}
      </Button>
    </div>
  );
}

export default CompanyCard;
