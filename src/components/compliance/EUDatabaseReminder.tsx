import { useState, useEffect } from 'react';
import { Database, X, ExternalLink, Calendar } from 'lucide-react';

interface EUDatabaseReminderProps {
  className?: string;
}

/**
 * EU Database Registration Reminder
 * Displays a reminder about Article 51 registration requirements
 * Shows only to admin users and can be dismissed
 */
export function EUDatabaseReminder({ className = '' }: EUDatabaseReminderProps) {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Registration deadline - August 2, 2026
  const registrationDeadline = new Date('2026-08-02');
  const today = new Date();
  const daysUntilDeadline = Math.ceil(
    (registrationDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  useEffect(() => {
    // Check if user dismissed this reminder
    const dismissedUntil = localStorage.getItem('eu-db-reminder-dismissed');
    if (dismissedUntil) {
      const dismissDate = new Date(dismissedUntil);
      if (dismissDate > today) {
        setDismissed(true);
        return;
      }
    }

    // Only show if deadline is within 180 days
    if (daysUntilDeadline > 0 && daysUntilDeadline <= 180) {
      setVisible(true);
    }
  }, [daysUntilDeadline]);

  const handleDismiss = () => {
    // Dismiss for 30 days
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 30);
    localStorage.setItem('eu-db-reminder-dismissed', dismissUntil.toISOString());
    setDismissed(true);
  };

  if (dismissed || !visible) {
    return null;
  }

  const urgencyColor = daysUntilDeadline <= 30
    ? 'bg-red-50 border-red-200 text-red-800'
    : daysUntilDeadline <= 90
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-blue-50 border-blue-200 text-blue-800';

  const iconColor = daysUntilDeadline <= 30
    ? 'text-red-600'
    : daysUntilDeadline <= 90
    ? 'text-amber-600'
    : 'text-blue-600';

  return (
    <div className={`${urgencyColor} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Database className={`w-5 h-5 ${iconColor} mt-0.5 shrink-0`} />
          <div>
            <h4 className="font-medium flex items-center gap-2">
              EU AI Act Database Registration
              <span className="flex items-center gap-1 text-xs font-normal opacity-75">
                <Calendar className="w-3 h-3" />
                {daysUntilDeadline} jours restants
              </span>
            </h4>
            <p className="text-sm mt-1 opacity-90">
              {daysUntilDeadline <= 30 ? (
                <>
                  <strong>Action urgente requise:</strong> La date limite d'enregistrement
                  au registre EU approche. Consultez la documentation de conformité.
                </>
              ) : daysUntilDeadline <= 90 ? (
                <>
                  Rappel: L'enregistrement au registre EU des systèmes IA est prévu
                  pour août 2026. Vérifiez que la documentation est à jour.
                </>
              ) : (
                <>
                  Information: L'enregistrement volontaire au registre EU est recommandé
                  pour démontrer la conformité. Consultez le guide de préparation.
                </>
              )}
            </p>
            <a
              href="/docs/compliance/eu-database-registration.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium mt-2 hover:underline"
            >
              Voir la documentation
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-black/10 rounded transition-colors shrink-0"
          aria-label="Fermer le rappel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Compact version for sidebar/header
 */
export function EUDatabaseReminderCompact() {
  const registrationDeadline = new Date('2026-08-02');
  const today = new Date();
  const daysUntilDeadline = Math.ceil(
    (registrationDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Only show if within 90 days
  if (daysUntilDeadline <= 0 || daysUntilDeadline > 90) {
    return null;
  }

  const urgencyColor = daysUntilDeadline <= 30
    ? 'text-red-600 bg-red-100'
    : 'text-amber-600 bg-amber-100';

  return (
    <div className={`${urgencyColor} px-2 py-1 rounded text-xs font-medium flex items-center gap-1`}>
      <Database className="w-3 h-3" />
      EU DB: {daysUntilDeadline}j
    </div>
  );
}

export default EUDatabaseReminder;
