import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Send,
  FileText,
  Sparkles,
  AlertCircle,
  Check,
  Eye,
} from 'lucide-react';
import { Subsidy, getSubsidyTitle, MaSubventionProProfile } from '@/types';
import { exportSubsidiesToPDF } from '@/lib/pdfExport';
import { supabase } from '@/lib/supabase';

interface EmailComposerModalProps {
  open: boolean;
  onClose: () => void;
  subsidies: Subsidy[];
  profile?: MaSubventionProProfile | null;
}

// Format amount for display
function formatAmount(amount: number | null): string {
  if (amount === null) return '';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Calculate total max funding
function getTotalMaxFunding(subsidies: Subsidy[]): number {
  return subsidies.reduce((sum, s) => sum + (s.amount_max || 0), 0);
}

// Count urgent deadlines (within 30 days)
function countUrgentDeadlines(subsidies: Subsidy[]): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return subsidies.filter((s) => {
    if (!s.deadline) return false;
    const deadline = new Date(s.deadline);
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;
}

// Generate default email content (B2C style - from customer/business owner)
function generateDefaultEmail(
  subsidies: Subsidy[],
  profile?: MaSubventionProProfile | null,
  recipientName?: string
): string {
  const companyName = profile?.company_name || 'mon entreprise';
  const totalFunding = getTotalMaxFunding(subsidies);
  const urgentCount = countUrgentDeadlines(subsidies);

  const greeting = recipientName ? `Bonjour ${recipientName},` : 'Bonjour,';

  let body = `${greeting}

Je vous transmets une selection de ${subsidies.length} aide${subsidies.length > 1 ? 's' : ''} publique${subsidies.length > 1 ? 's' : ''} que j'ai identifiee${subsidies.length > 1 ? 's' : ''} pour ${companyName}.

`;

  if (totalFunding > 0) {
    body += `**Montant potentiel total : jusqu'a ${formatAmount(totalFunding)}**

`;
  }

  body += `**Aides incluses :**
`;

  subsidies.slice(0, 5).forEach((s) => {
    const title = getSubsidyTitle(s);
    const amount = s.amount_max ? ` (jusqu'a ${formatAmount(s.amount_max)})` : '';
    body += `- ${title}${amount}\n`;
  });

  if (subsidies.length > 5) {
    body += `- ... et ${subsidies.length - 5} autre${subsidies.length - 5 > 1 ? 's' : ''}\n`;
  }

  body += '\n';

  if (urgentCount > 0) {
    body += `**Attention :** ${urgentCount} aide${urgentCount > 1 ? 's ont une' : ' a une'} date limite proche (moins de 30 jours).

`;
  }

  body += `Vous trouverez le rapport detaille en piece jointe de cet email.

N'hesitez pas a me contacter si vous avez des questions.

Cordialement,
${companyName}`;

  return body;
}

export function EmailComposerModal({
  open,
  onClose,
  subsidies,
  profile,
}: EmailComposerModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachPDF, setAttachPDF] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Generate default subject
  const defaultSubject = useMemo(() => {
    const companyName = profile?.company_name || '';
    return companyName
      ? `${subsidies.length} aide${subsidies.length > 1 ? 's' : ''} identifiee${subsidies.length > 1 ? 's' : ''} pour ${companyName}`
      : `${subsidies.length} aide${subsidies.length > 1 ? 's' : ''} identifiee${subsidies.length > 1 ? 's' : ''}`;
  }, [subsidies.length, profile?.company_name]);

  // Initialize form when modal opens
  useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      setBody(generateDefaultEmail(subsidies, profile, recipientName));
      setError(null);
      setSuccess(false);
    }
  }, [open, subsidies, profile, defaultSubject]);

  // Update body when recipient name changes
  useEffect(() => {
    if (open && recipientName) {
      setBody(generateDefaultEmail(subsidies, profile, recipientName));
    }
  }, [recipientName]);

  const handleSend = async () => {
    // Validate
    if (!recipientEmail.trim()) {
      setError('Veuillez saisir une adresse email destinataire');
      return;
    }

    if (!recipientEmail.includes('@')) {
      setError('Adresse email invalide');
      return;
    }

    setSending(true);
    setError(null);

    try {
      // Generate PDF if attachment is enabled
      let pdfBase64: string | null = null;
      let pdfFilename: string | null = null;

      if (attachPDF) {
        const { blob, filename } = await exportSubsidiesToPDF(subsidies, {
          download: false,
          profile,
        });
        pdfFilename = filename;

        // Convert blob to base64
        const reader = new FileReader();
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix to get pure base64
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Call the send-export-email edge function
      // API matches the expected contract from subvention360
      const { error: sendError } = await supabase.functions.invoke('send-export-email', {
        body: {
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || undefined,
          ccEmails: ccEmail.trim() ? [ccEmail.trim()] : undefined,
          subject: subject.trim(),
          body: body.trim(),
          pdfBase64: pdfBase64 || undefined,
          pdfFilename: pdfFilename || undefined,
          subsidyIds: subsidies.map(s => s.id),
          // Platform source for correct branding
          source: 'masubventionpro',
        },
      });

      if (sendError) {
        throw new Error(sendError.message || 'Erreur lors de l\'envoi');
      }

      setSuccess(true);

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        // Reset state
        setRecipientEmail('');
        setRecipientName('');
        setCcEmail('');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Email send error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  const totalFunding = getTotalMaxFunding(subsidies);

  // Preview PDF in new tab
  const handlePreviewPDF = async () => {
    const { blob } = await exportSubsidiesToPDF(subsidies, {
      download: false,
      profile,
    });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Transmettre {subsidies.length} aide{subsidies.length > 1 ? 's' : ''} par email
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="bg-slate-50 rounded-lg p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">{subsidies.length} aide{subsidies.length > 1 ? 's' : ''} selectionnee{subsidies.length > 1 ? 's' : ''}</span>
            {totalFunding > 0 && (
              <span className="text-emerald-700 font-medium">
                Jusqu'a {formatAmount(totalFunding)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Recipient */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Email destinataire *</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="email@exemple.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientName">Nom (optionnel)</Label>
              <Input
                id="recipientName"
                placeholder="Jean Dupont"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
          </div>

          {/* CC */}
          <div className="space-y-2">
            <Label htmlFor="ccEmail">Copie (CC)</Label>
            <Input
              id="ccEmail"
              type="email"
              placeholder="copie@exemple.com"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Pour recevoir une copie de l'email
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Objet</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* PDF Attachment Toggle */}
          <div className={`rounded-lg border transition-colors ${
            attachPDF
              ? 'bg-blue-50 border-blue-200'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setAttachPDF(!attachPDF)}
              className="flex items-center justify-between w-full p-3"
            >
              <div className="flex items-center gap-3">
                <FileText className={`h-5 w-5 ${attachPDF ? 'text-blue-600' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="font-medium text-sm">Joindre le rapport PDF</p>
                  <p className="text-xs text-slate-500">
                    Rapport detaille avec toutes les aides selectionnees
                  </p>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  attachPDF
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-slate-300'
                }`}
              >
                {attachPDF && <Check className="h-3 w-3 text-white" />}
              </div>
            </button>
            {/* Preview PDF button */}
            <div className="px-3 pb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreviewPDF}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir le rapport PDF
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              Email envoye avec succes !
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending || success}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EmailComposerModal;
