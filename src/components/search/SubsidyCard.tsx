import { useNavigate } from 'react-router-dom';
import { Subsidy, getSubsidyTitle, getSubsidyDescription } from '@/types';
import {
  Calendar,
  Euro,
  MapPin,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Sparkles,
  Check,
  Users,
  Phone,
  Building2,
} from 'lucide-react';
import OrganizationLogo from '@/components/subsidy/OrganizationLogo';
import { Button } from '@/components/ui/button';
import {
  getAmountDisplay,
  getDaysUntilDeadline,
  getDeadlineStatus,
  getEntityTypeBadges,
  hasContacts,
  hasProjectTypes,
  getProjectTypeLabels,
} from '@/lib/subsidyUtils';

interface SubsidyCardProps {
  subsidy: Subsidy;
  isSaved?: boolean;
  onToggleSave?: (subsidyId: string) => void;
  matchScore?: number;
  matchReasons?: string[];
  // Selection mode props
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (subsidyId: string) => void;
}

export function SubsidyCard({
  subsidy,
  isSaved = false,
  onToggleSave,
  matchScore,
  matchReasons,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
}: SubsidyCardProps) {
  const navigate = useNavigate();
  const title = getSubsidyTitle(subsidy);
  const description = getSubsidyDescription(subsidy);

  const handleCardClick = () => {
    if (isSelectionMode && onSelect) {
      onSelect(subsidy.id);
    } else {
      navigate(`/app/subsidy/${subsidy.id}`);
    }
  };

  // Use shared utilities for deadline
  const daysUntil = getDaysUntilDeadline(subsidy.deadline);
  const deadlineStatus = getDeadlineStatus(subsidy.deadline);
  const isExpired = deadlineStatus === 'expired';
  const isUrgent = deadlineStatus === 'urgent' || deadlineStatus === 'soon';

  // Use shared utility for amount display
  const amountDisplay = getAmountDisplay(subsidy.amount_min, subsidy.amount_max, 'abbreviated');

  // Get entity type badges
  const entityBadges = getEntityTypeBadges(subsidy);

  // Get project type labels (max 3)
  const projectLabels = hasProjectTypes(subsidy) ? getProjectTypeLabels(subsidy, 3) : [];
  const hasMoreProjects = subsidy.decoded_projets && subsidy.decoded_projets.length > 3;

  // Get region display
  const regionDisplay = () => {
    if (!subsidy.region || subsidy.region.length === 0) return null;
    if (subsidy.region.includes('National') || subsidy.region.includes('national')) {
      return 'National';
    }
    return subsidy.region[0];
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all cursor-pointer ${
        isExpired ? 'opacity-60' : ''
      } ${
        isSelected
          ? 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-200'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Header */}
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
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {title}
          </h3>
          {subsidy.agency && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
              <OrganizationLogo
                organizationName={subsidy.agency}
                logoUrl={subsidy.logo_url}
                size="sm"
              />
              <span className="truncate">{subsidy.agency}</span>
            </div>
          )}
          {/* Entity Type Badges */}
          {entityBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {entityBadges.slice(0, 2).map((badge, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${badge.colorClasses}`}
                >
                  {badge.type === 'association' && <Users className="h-3 w-3" />}
                  {badge.type === 'entreprise' && <Building2 className="h-3 w-3" />}
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Save Button - hidden in selection mode */}
        {!isSelectionMode && onToggleSave && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(subsidy.id);
            }}
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

      {/* Match Reasons (when available) */}
      {matchReasons && matchReasons.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Sparkles className="h-3.5 w-3.5 text-purple-500" />
          {matchReasons.slice(0, 3).map((reason, idx) => (
            <span
              key={idx}
              className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full"
            >
              {reason}
            </span>
          ))}
          {matchScore && matchScore >= 50 && (
            <span className="text-xs text-purple-600 font-medium">
              {matchScore}% match
            </span>
          )}
        </div>
      )}

      {/* Project Types */}
      {projectLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {projectLabels.map((label, idx) => (
            <span
              key={idx}
              className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
            >
              {label}
            </span>
          ))}
          {hasMoreProjects && (
            <span className="text-xs text-slate-400">
              +{subsidy.decoded_projets!.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Meta Info */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {/* Amount */}
        {amountDisplay && (
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
            <Euro className="h-3.5 w-3.5" />
            <span className="font-medium">{amountDisplay}</span>
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
                ? 'Expiré'
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

        {/* Contact Indicator */}
        {hasContacts(subsidy) && (
          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
            <Phone className="h-3.5 w-3.5" />
            <span className="text-xs">Contact</span>
          </div>
        )}
      </div>

      {/* Actions - hidden in selection mode */}
      {!isSelectionMode && subsidy.application_url && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end">
          <a
            href={subsidy.application_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            Postuler
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

export default SubsidyCard;
