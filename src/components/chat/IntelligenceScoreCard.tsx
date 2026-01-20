import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Target,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  MinusCircle,
  AlertTriangle,
  ExternalLink,
  Bookmark,
} from 'lucide-react';

export interface QuickScoreData {
  profile_id: string;
  profile_name: string;
  final_score: number;
  similarity_score: number;
  market_density_score: number;
  timing_score: number;
  competitive_density: 'low' | 'medium' | 'high' | 'very_high' | 'unknown';
  peak_quarter: string;
  similar_companies_count: number;
  explanation: string;
  subsidy_context?: {
    subsidy_id: string;
    subsidy_title: string;
  };
}

interface IntelligenceScoreCardProps {
  data: QuickScoreData;
  mode?: 'compact' | 'detailed';
  className?: string;
  onTrackSubsidy?: (subsidyId: string) => void;
  isTracked?: boolean;
}

/**
 * IntelligenceScoreCard - Displays quick score intelligence data
 * Shows success probability, market density, timing, and competitive insights.
 */
export function IntelligenceScoreCard({
  data,
  mode = 'compact',
  className,
  onTrackSubsidy,
  isTracked = false,
}: IntelligenceScoreCardProps) {
  // Score verdict mapping (French)
  const getScoreVerdict = (score: number) => {
    if (score >= 70)
      return {
        label: 'Fortement Recommande',
        color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        borderColor: 'border-l-emerald-500',
        icon: CheckCircle,
        emoji: '🟢',
      };
    if (score >= 50)
      return {
        label: 'Viable mais Competitif',
        color: 'bg-amber-50 border-amber-200 text-amber-700',
        borderColor: 'border-l-amber-500',
        icon: MinusCircle,
        emoji: '🟡',
      };
    return {
      label: 'Faible Probabilite',
      color: 'bg-red-50 border-red-200 text-red-700',
      borderColor: 'border-l-red-500',
      icon: AlertTriangle,
      emoji: '🔴',
    };
  };

  // Competitive density labels (French)
  const getDensityLabel = (density: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      low: { label: 'Faible concurrence', color: 'text-emerald-600' },
      medium: { label: 'Concurrence moderee', color: 'text-amber-600' },
      high: { label: 'Forte concurrence', color: 'text-orange-600' },
      very_high: { label: 'Tres forte concurrence', color: 'text-red-600' },
      unknown: { label: 'Donnees insuffisantes', color: 'text-slate-500' },
    };
    return labels[density] || labels.unknown;
  };

  const verdict = getScoreVerdict(data.final_score);
  const density = getDensityLabel(data.competitive_density);

  // Compact mode for inline chat display
  if (mode === 'compact') {
    return (
      <div
        className={cn(
          'border rounded-lg border-l-4 p-4',
          verdict.borderColor,
          className
        )}
      >
        {/* Header with score */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-sm text-slate-900">
              Score de Succes
            </span>
          </div>
          <span
            className={cn(
              'text-sm font-bold px-2 py-0.5 rounded-full',
              verdict.color
            )}
          >
            {verdict.emoji} {data.final_score}%
          </span>
        </div>

        {/* Score bar */}
        <div className="mb-4">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                data.final_score >= 70
                  ? 'bg-emerald-500'
                  : data.final_score >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              )}
              style={{ width: `${data.final_score}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{verdict.label}</p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <div>
              <span className="text-slate-500">Profils similaires: </span>
              <span className="font-medium text-slate-900">
                {data.similar_companies_count}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <span className={density.color}>{density.label}</span>
          </div>
        </div>

        {/* Peak timing */}
        {data.peak_quarter && data.peak_quarter !== 'unknown' && (
          <div className="flex items-center gap-2 mt-3 text-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500">Trimestre optimal: </span>
            <span className="font-medium text-slate-900">
              {data.peak_quarter}
            </span>
          </div>
        )}

        {/* Subsidy context */}
        {data.subsidy_context && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Pour:{' '}
              <span className="font-medium text-slate-700">
                {data.subsidy_context.subsidy_title}
              </span>
            </p>
          </div>
        )}

        {/* Action buttons */}
        {data.subsidy_context && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
            {onTrackSubsidy && (
              <Button
                variant={isTracked ? 'secondary' : 'outline'}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => onTrackSubsidy(data.subsidy_context!.subsidy_id)}
              >
                <Bookmark
                  className={cn(
                    'h-3.5 w-3.5 mr-1.5',
                    isTracked && 'fill-current'
                  )}
                />
                {isTracked ? 'Suivi' : 'Sauvegarder'}
              </Button>
            )}
            <Link to={`/app/subsidy/${data.subsidy_context.subsidy_id}`}>
              <Button variant="outline" size="sm" className="text-xs">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Plus d'infos
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Detailed mode for expanded view
  return (
    <div
      className={cn(
        'border rounded-xl border-l-4 p-6',
        verdict.borderColor,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-slate-900">Analyse Intelligence</h3>
        </div>
        <span
          className={cn(
            'text-lg font-bold px-3 py-1 rounded-full',
            verdict.color
          )}
        >
          {verdict.emoji} {data.final_score}%
        </span>
      </div>

      {/* Main score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Score global de succes
          </span>
          <span className={cn('text-sm font-semibold', verdict.color)}>
            {verdict.label}
          </span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              data.final_score >= 70
                ? 'bg-emerald-500'
                : data.final_score >= 50
                ? 'bg-amber-500'
                : 'bg-red-500'
            )}
            style={{ width: `${data.final_score}%` }}
          />
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5" />
            <span>Similarite avec laureats</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${data.similarity_score}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {data.similarity_score}%
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Score marche</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${data.market_density_score}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {data.market_density_score}%
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>Score timing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${data.timing_score}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {data.timing_score}%
            </span>
          </div>
        </div>
      </div>

      {/* Intelligence insights */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Entreprises similaires</span>
          <span className="font-semibold text-slate-900">
            {data.similar_companies_count}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Densite concurrentielle
          </span>
          <span className={cn('font-semibold', density.color)}>
            {density.label}
          </span>
        </div>
        {data.peak_quarter && data.peak_quarter !== 'unknown' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Trimestre optimal</span>
            <span className="font-semibold text-slate-900">
              {data.peak_quarter}
            </span>
          </div>
        )}
      </div>

      {/* Explanation */}
      {data.explanation && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">{data.explanation}</p>
        </div>
      )}
    </div>
  );
}

export default IntelligenceScoreCard;
