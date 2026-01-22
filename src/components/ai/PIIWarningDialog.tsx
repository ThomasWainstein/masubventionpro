import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Send, EyeOff, X } from 'lucide-react';
import type { PIIMatch, PIIUserChoice } from '@/lib/pii';

interface PIIWarningDialogProps {
  open: boolean;
  matches: PIIMatch[];
  onChoice: (choice: PIIUserChoice) => void;
}

export function PIIWarningDialog({ open, matches, onChoice }: PIIWarningDialogProps) {
  // Group matches by type
  const groupedMatches = matches.reduce((acc, match) => {
    if (!acc[match.label]) {
      acc[match.label] = [];
    }
    acc[match.label].push(match);
    return acc;
  }, {} as Record<string, PIIMatch[]>);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onChoice('cancel')}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Donnees sensibles detectees
          </DialogTitle>
          <DialogDescription>
            Votre message contient des informations personnelles qui pourraient etre envoyees a notre assistant IA.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm font-medium text-amber-800 mb-2">
              Informations detectees:
            </p>
            <ul className="space-y-1.5">
              {Object.entries(groupedMatches).map(([label, items]) => (
                <li key={label} className="flex items-center gap-2 text-sm text-amber-700">
                  <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {label} ({items.length})
                    <span className="text-amber-600 ml-1">
                      {items.length === 1 ? `: ${maskPreview(items[0].value)}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-500">
            Pour votre securite, nous vous recommandons de masquer ces informations avant l'envoi.
            Les donnees masquees seront remplacees par des asterisques.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onChoice('cancel')}
            className="w-full sm:w-auto gap-2"
          >
            <X className="h-4 w-4" />
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={() => onChoice('send')}
            className="w-full sm:w-auto gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
          >
            <Send className="h-4 w-4" />
            Envoyer quand meme
          </Button>
          <Button
            onClick={() => onChoice('mask')}
            className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <EyeOff className="h-4 w-4" />
            Masquer et envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Create a preview of the masked value for display
 */
function maskPreview(value: string): string {
  if (value.length <= 8) {
    return value[0] + '***' + value.slice(-1);
  }
  return value.substring(0, 3) + '...' + value.slice(-3);
}

export default PIIWarningDialog;
