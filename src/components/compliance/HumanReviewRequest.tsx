import { useState } from 'react';
import { User, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface HumanReviewRequestProps {
  subsidyId?: string;
  eventId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

type ReviewReason = 'low_confidence' | 'user_request' | 'high_value' | 'complex_criteria';

const REVIEW_REASONS: { value: ReviewReason; label: string; description: string }[] = [
  {
    value: 'user_request',
    label: 'Je souhaite un avis humain',
    description: 'Je prefere qu\'un expert examine cette recommandation',
  },
  {
    value: 'low_confidence',
    label: 'Doute sur la pertinence',
    description: 'La recommandation ne me semble pas adaptee a ma situation',
  },
  {
    value: 'complex_criteria',
    label: 'Criteres complexes',
    description: 'Les criteres d\'eligibilite sont difficiles a comprendre',
  },
  {
    value: 'high_value',
    label: 'Montant important',
    description: 'Le montant de l\'aide justifie une verification humaine',
  },
];

/**
 * Human Review Request Component
 * EU AI Act Article 14 - Human Oversight
 */
export function HumanReviewRequest({
  subsidyId,
  eventId,
  onClose,
  onSuccess,
}: HumanReviewRequestProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<ReviewReason | null>(null);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !reason) {
      setError('Veuillez selectionner une raison');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('human_review_requests')
        .insert({
          user_id: user.id,
          event_id: eventId || null,
          subsidy_id: subsidyId || null,
          reason,
          user_question: question || null,
          status: 'pending',
        });

      if (insertError) throw insertError;

      setSuccess(true);
      onSuccess?.();

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose?.();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md mx-auto">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Demande envoyee
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Un expert examinera votre demande dans les 24 a 48 heures ouvrees.
            Vous recevrez une notification par email.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Demander un avis humain</h3>
            <p className="text-xs text-slate-500">Article 14 EU AI Act</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Info Banner */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-sm text-blue-700">
            Conformement au Reglement EU 2024/1689, vous avez le droit de demander
            qu'un expert humain examine toute recommandation generee par notre IA.
          </p>
        </div>

        {/* Reason Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Raison de la demande *
          </label>
          <div className="space-y-2">
            {REVIEW_REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  reason === r.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-slate-800">{r.label}</p>
                  <p className="text-xs text-slate-500">{r.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Question (Optional) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Question ou commentaire (optionnel)
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Decrivez votre situation ou posez une question specifique..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={!reason || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              'Envoyer la demande'
            )}
          </button>
        </div>

        {/* Response Time */}
        <p className="text-xs text-slate-500 text-center">
          Delai de reponse: 24-48 heures ouvrees
        </p>
      </form>
    </div>
  );
}

/**
 * Small button to trigger human review request
 */
export function HumanReviewButton({
  subsidyId,
  eventId,
  className = '',
}: {
  subsidyId?: string;
  eventId?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors ${className}`}
      >
        <User className="w-4 h-4" />
        Demander un avis humain
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <HumanReviewRequest
            subsidyId={subsidyId}
            eventId={eventId}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}

export default HumanReviewRequest;
