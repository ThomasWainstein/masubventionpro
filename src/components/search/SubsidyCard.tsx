import { Link } from 'react-router-dom';
import { Subsidy, getSubsidyTitle, getSubsidyDescription } from '@/types';
import {
  Calendar,
  Euro,
  MapPin,
  Building,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubsidyCardProps {
  subsidy: Subsidy;
  isSaved?: boolean;
  onToggleSave?: (subsidyId: string) => void;
}

export function SubsidyCard({ subsidy, isSaved = false, onToggleSave }: SubsidyCardProps) {
  const title = getSubsidyTitle(subsidy);
  const description = getSubsidyDescription(subsidy);

  // Calculate days until deadline
  const getDaysUntilDeadline = () => {
    if (!subsidy.deadline) return null;
    const deadline = new Date(subsidy.deadline);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilDeadline();
  const isExpired = daysUntil !== null && daysUntil < 0;
  const isUrgent = daysUntil !== null && daysUntil >= 0 && daysUntil <= 30;

  // Format amount display
  const formatAmount = (amount: number | null) => {
    if (amount === null) return null;
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M€`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K€`;
    }
    return `${amount}€`;
  };

  const amountDisplay = () => {
    const min = formatAmount(subsidy.amount_min);
    const max = formatAmount(subsidy.amount_max);
    if (max && min && min !== max) {
      return `${min} - ${max}`;
    }
    if (max) {
      return `Jusqu'a ${max}`;
    }
    if (min) {
      return `A partir de ${min}`;
    }
    return null;
  };

  // Get region display
  const regionDisplay = () => {
    if (!subsidy.region || subsidy.region.length === 0) return null;
    if (subsidy.region.includes('National') || subsidy.region.includes('national')) {
      return 'National';
    }
    return subsidy.region[0];
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow ${isExpired ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
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
        </div>

        {/* Save Button */}
        {onToggleSave && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleSave(subsidy.id)}
            className={isSaved ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'}
          >
            {isSaved ? (
              <BookmarkCheck className="h-5 w-5" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="mt-3 text-sm text-slate-600 line-clamp-2">
          {description}
        </p>
      )}

      {/* Meta Info */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {/* Amount */}
        {amountDisplay() && (
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
            <Euro className="h-3.5 w-3.5" />
            <span className="font-medium">{amountDisplay()}</span>
          </div>
        )}

        {/* Deadline */}
        {subsidy.deadline && (
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
              isExpired
                ? 'text-red-700 bg-red-50'
                : isUrgent
                ? 'text-amber-700 bg-amber-50'
                : 'text-slate-600 bg-slate-100'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-medium">
              {isExpired
                ? 'Expire'
                : isUrgent
                ? `${daysUntil}j restants`
                : new Date(subsidy.deadline).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
            </span>
          </div>
        )}

        {/* Region */}
        {regionDisplay() && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <MapPin className="h-3.5 w-3.5" />
            <span>{regionDisplay()}</span>
          </div>
        )}

        {/* Funding Type */}
        {subsidy.funding_type && (
          <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-xs">
            {subsidy.funding_type}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
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
}

export default SubsidyCard;
