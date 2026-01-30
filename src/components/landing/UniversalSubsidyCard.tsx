import { Link } from 'react-router-dom';
import { Subsidy, getSubsidyTitle } from '@/types';
import { Euro, MapPin, Calendar, ExternalLink, ArrowRight } from 'lucide-react';
import OrganizationLogo from '@/components/subsidy/OrganizationLogo';

interface UniversalSubsidyCardProps {
  subsidy: Subsidy;
  variant?: 'national' | 'regional';
}

/**
 * Compact subsidy card for landing page display
 * Shows key info at a glance without requiring authentication
 */
export function UniversalSubsidyCard({ subsidy, variant = 'national' }: UniversalSubsidyCardProps) {
  const title = getSubsidyTitle(subsidy);

  // Format amount display
  const formatAmount = () => {
    const min = subsidy.amount_min;
    const max = subsidy.amount_max;

    if (!min && !max) return null;

    const formatValue = (val: number) => {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
      return val.toLocaleString('fr-FR');
    };

    if (max && !min) return `Jusqu'à ${formatValue(max)}€`;
    if (min && !max) return `À partir de ${formatValue(min)}€`;
    if (min && max) {
      if (min === max) return `${formatValue(max)}€`;
      return `${formatValue(min)} - ${formatValue(max)}€`;
    }
    return null;
  };

  // Get deadline display
  const getDeadlineDisplay = () => {
    if (!subsidy.deadline) return 'Permanent';
    const deadline = new Date(subsidy.deadline);
    const now = new Date();
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return null; // Expired
    if (daysUntil <= 7) return `${daysUntil}j restants`;
    if (daysUntil <= 30) return `${daysUntil} jours`;

    return deadline.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Get region display
  const getRegionDisplay = () => {
    if (!subsidy.region || subsidy.region.length === 0) return null;
    if (subsidy.region.includes('National')) return 'National';
    return subsidy.region[0];
  };

  const amountDisplay = formatAmount();
  const deadlineDisplay = getDeadlineDisplay();
  const regionDisplay = getRegionDisplay();

  // Don't show expired subsidies
  if (deadlineDisplay === null) return null;

  const isNational = variant === 'national';
  const borderColor = isNational ? 'border-blue-200 hover:border-blue-400' : 'border-emerald-200 hover:border-emerald-400';
  const accentColor = isNational ? 'text-blue-600' : 'text-emerald-600';

  return (
    <div
      className={`bg-white rounded-xl border-2 ${borderColor} p-4 transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col h-full`}
    >
      {/* Header with logo and agency */}
      <div className="flex items-start gap-3 mb-3">
        <OrganizationLogo
          organizationName={subsidy.agency || ''}
          logoUrl={subsidy.logo_url}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 leading-tight">
            {title}
          </h4>
          {subsidy.agency && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{subsidy.agency}</p>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-2 mt-auto">
        {/* Amount */}
        {amountDisplay && (
          <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-medium">
            <Euro className="h-3 w-3" />
            {amountDisplay}
          </span>
        )}

        {/* Region */}
        {regionDisplay && (
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
            isNational ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
            <MapPin className="h-3 w-3" />
            {regionDisplay}
          </span>
        )}

        {/* Deadline */}
        {deadlineDisplay && (
          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
            <Calendar className="h-3 w-3" />
            {deadlineDisplay}
          </span>
        )}

        {/* Funding type */}
        {subsidy.funding_type && (
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
            {subsidy.funding_type}
          </span>
        )}
      </div>

      {/* Action link */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <Link
          to={`/app/subsidy/${subsidy.id}`}
          className={`text-xs ${accentColor} hover:underline flex items-center gap-1 font-medium`}
        >
          Voir les détails
          <ArrowRight className="h-3 w-3" />
        </Link>
        {subsidy.application_url && (
          <a
            href={subsidy.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            Postuler
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export default UniversalSubsidyCard;
