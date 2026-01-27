import { useNavigate } from 'react-router-dom';
import { Subsidy, getSubsidyTitle } from '@/types';
import { MapPin, Building, Bookmark, BookmarkCheck } from 'lucide-react';

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

  // Format amount display
  const formatAmount = (amount: number | null) => {
    if (amount === null) return null;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const amountDisplay = () => {
    const max = formatAmount(subsidy.amount_max);
    const min = formatAmount(subsidy.amount_min);
    if (max) {
      return `Jusqu'à ${max}`;
    }
    if (min) {
      return `À partir de ${min}`;
    }
    return 'Contacter pour les détails du financement';
  };

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

      {/* Title */}
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm leading-snug mb-3">
          {title}
        </h3>
      </div>

      {/* Amount */}
      <p className="text-base font-semibold text-slate-900 mb-3">
        {amountDisplay()}
      </p>

      {/* Agency */}
      {agencyDisplay() && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <div className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
            <Building className="h-3 w-3 text-slate-400" />
          </div>
          <span className="truncate">{agencyDisplay()}</span>
        </div>
      )}

      {/* Region */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-auto pt-2">
        <MapPin className="h-3.5 w-3.5 text-slate-400" />
        <span>{regionDisplay()}</span>
      </div>
    </div>
  );
}

export default SubsidyGridCard;
