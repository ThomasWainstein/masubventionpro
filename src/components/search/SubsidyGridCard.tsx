import { useNavigate } from 'react-router-dom';
import { Subsidy, getSubsidyTitle } from '@/types';
import { MapPin, Bookmark, BookmarkCheck, Users, Phone } from 'lucide-react';
import { getAmountDisplay, getEntityTypeBadges, hasContacts } from '@/lib/subsidyUtils';
import OrganizationLogo from '@/components/subsidy/OrganizationLogo';

interface SubsidyGridCardProps {
  subsidy: Subsidy;
  isSaved?: boolean;
  onToggleSave?: (subsidyId: string) => void;
}

export function SubsidyGridCard({
  subsidy,
  isSaved = false,
  onToggleSave,
}: SubsidyGridCardProps) {
  const navigate = useNavigate();
  const title = getSubsidyTitle(subsidy);

  const handleCardClick = () => {
    navigate(`/app/subsidy/${subsidy.id}`);
  };

  // Use shared utility for amount display
  const amountDisplay = getAmountDisplay(subsidy.amount_min, subsidy.amount_max, 'full')
    || 'Contacter pour les détails';

  // Get entity type badge (first one only for compact view)
  const entityBadges = getEntityTypeBadges(subsidy);
  const primaryBadge = entityBadges[0];

  // Get region display
  const regionDisplay = () => {
    if (!subsidy.region || subsidy.region.length === 0) return 'National';
    if (subsidy.region.includes('National') || subsidy.region.includes('national')) {
      return 'National';
    }
    return subsidy.region[0];
  };

  // Truncate agency name
  const agencyDisplay = () => {
    if (!subsidy.agency) return null;
    if (subsidy.agency.length > 35) {
      return subsidy.agency.substring(0, 32) + '...';
    }
    return subsidy.agency;
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-lg hover:border-slate-300 transition-all h-full flex flex-col cursor-pointer group"
    >
      {/* Save Button - Positioned top right */}
      {onToggleSave && (
        <div className="flex justify-end -mt-1 -mr-1 mb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(subsidy.id);
            }}
            className={`p-1.5 rounded-full transition-colors ${
              isSaved
                ? 'text-blue-600 bg-blue-50'
                : 'text-slate-300 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* Entity Type Badge */}
      {primaryBadge && (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${primaryBadge.colorClasses} mb-2 self-start`}>
          {primaryBadge.type === 'association' && <Users className="h-3 w-3" />}
          {primaryBadge.label}
        </span>
      )}

      {/* Title */}
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm leading-snug mb-3">
          {title}
        </h3>
      </div>

      {/* Amount */}
      <p className="text-base font-semibold text-slate-900 mb-3">
        {amountDisplay}
      </p>

      {/* Agency */}
      {agencyDisplay() && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <OrganizationLogo
            organizationName={subsidy.agency || ''}
            logoUrl={subsidy.logo_url}
            size="sm"
            className="flex-shrink-0"
          />
          <span className="truncate">{agencyDisplay()}</span>
        </div>
      )}

      {/* Region & Contact */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          <span>{regionDisplay()}</span>
        </div>
        {hasContacts(subsidy) && (
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <Phone className="h-3 w-3" />
            <span>Contact</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SubsidyGridCard;
