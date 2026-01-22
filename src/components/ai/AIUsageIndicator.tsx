import { AlertCircle, AlertTriangle, Zap } from 'lucide-react';
import { useAIUsage } from '@/hooks/useAIUsage';

interface AIUsageIndicatorProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function AIUsageIndicator({ variant = 'compact', className = '' }: AIUsageIndicatorProps) {
  const { status, loading } = useAIUsage();

  if (loading || !status) return null;

  const { percentages, isBlocked, blockedReason, remainingDaily } = status;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isBlocked ? (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
            <AlertCircle className="h-3 w-3" />
            Limite atteinte
          </span>
        ) : percentages.daily > 80 ? (
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
            <AlertTriangle className="h-3 w-3" />
            {remainingDaily.toFixed(2)} EUR restants
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
            <Zap className="h-3 w-3" />
            IA disponible
          </span>
        )}
      </div>
    );
  }

  // Full variant with progress bars
  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-900 text-sm">Utilisation IA</h4>
        {isBlocked && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
            Bloquee ({blockedReason === 'daily' ? 'jour' : blockedReason === 'weekly' ? 'semaine' : 'annee'})
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Daily */}
        <div>
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>Aujourd'hui</span>
            <span>{status.summary?.daily_cost_eur.toFixed(2) || '0.00'} / {status.limits.daily.toFixed(2)} EUR</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentages.daily > 80 ? 'bg-red-500' : percentages.daily > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, percentages.daily)}%` }}
            />
          </div>
        </div>

        {/* Weekly */}
        <div>
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>Cette semaine</span>
            <span>{status.summary?.weekly_cost_eur.toFixed(2) || '0.00'} / {status.limits.weekly.toFixed(2)} EUR</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentages.weekly > 80 ? 'bg-red-500' : percentages.weekly > 50 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, percentages.weekly)}%` }}
            />
          </div>
        </div>

        {/* Yearly */}
        <div>
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>Cette annee</span>
            <span>{status.summary?.yearly_cost_eur.toFixed(2) || '0.00'} / {status.limits.yearly.toFixed(2)} EUR</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentages.yearly > 80 ? 'bg-red-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(100, percentages.yearly)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIUsageIndicator;
