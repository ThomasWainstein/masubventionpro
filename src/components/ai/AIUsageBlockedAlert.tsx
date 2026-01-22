import { AlertCircle, Clock } from 'lucide-react';
import type { AIUsageStatus } from '@/types/ai-usage';

interface AIUsageBlockedAlertProps {
  status: AIUsageStatus;
  className?: string;
}

export function AIUsageBlockedAlert({ status, className = '' }: AIUsageBlockedAlertProps) {
  if (!status.isBlocked) return null;

  const getResetMessage = () => {
    switch (status.blockedReason) {
      case 'daily':
        return 'Votre limite sera reinitialisee demain a minuit.';
      case 'weekly':
        return 'Votre limite sera reinitialisee lundi prochain.';
      case 'yearly':
        return 'Votre limite annuelle est atteinte. Contactez le support pour plus d\'options.';
      default:
        return '';
    }
  };

  const getLimitLabel = () => {
    switch (status.blockedReason) {
      case 'daily':
        return 'quotidienne';
      case 'weekly':
        return 'hebdomadaire';
      case 'yearly':
        return 'annuelle';
      default:
        return '';
    }
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-red-800">
            Limite {getLimitLabel()} atteinte
          </h4>
          <p className="text-sm text-red-700 mt-1">
            Vous avez atteint votre limite d'utilisation de l'IA ({status.limits[status.blockedReason!].toFixed(2)} EUR).
          </p>
          <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {getResetMessage()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AIUsageBlockedAlert;
