import { AlertCircle } from 'lucide-react';
import type { AIUsageStatus } from '@/types/ai-usage';

interface AIUsageBlockedAlertProps {
  status: AIUsageStatus;
  className?: string;
}

export function AIUsageBlockedAlert({ status, className = '' }: AIUsageBlockedAlertProps) {
  if (!status.isBlocked) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-red-800">
            Limite d'utilisation atteinte
          </h4>
          <p className="text-sm text-red-700 mt-1">
            Vous avez atteint votre limite d'utilisation de l'IA ({status.limits.total.toFixed(2)} EUR).
          </p>
          <p className="text-sm text-red-600 mt-2">
            Passez a un forfait superieur pour continuer a utiliser l'assistant IA.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AIUsageBlockedAlert;
