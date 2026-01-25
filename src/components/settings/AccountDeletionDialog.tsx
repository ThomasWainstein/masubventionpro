import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  Loader2,
  Check,
  X,
  Trash2,
  FileText,
  MessageSquare,
  User,
  HardDrive,
  Database,
  Shield,
} from 'lucide-react';
import { useAccountDeletion, type DeletionStep } from '@/hooks/useAccountDeletion';

interface AccountDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONFIRMATION_TEXT = 'SUPPRIMER';

export function AccountDeletionDialog({ open, onOpenChange }: AccountDeletionDialogProps) {
  const { isDeleting, steps, error, deleteAccount } = useAccountDeletion();
  const [confirmText, setConfirmText] = useState('');
  const [understood, setUnderstood] = useState(false);

  const canDelete = confirmText === CONFIRMATION_TEXT && understood && !isDeleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    await deleteAccount();
  };

  const handleClose = () => {
    if (isDeleting) return; // Don't close while deleting
    setConfirmText('');
    setUnderstood(false);
    onOpenChange(false);
  };

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'storage': return HardDrive;
      case 'ai_logs': return Database;
      case 'conversations': return MessageSquare;
      case 'documents': return FileText;
      case 'saved': return Shield;
      case 'profile': return User;
      case 'local': return Database;
      case 'auth': return Trash2;
      default: return Database;
    }
  };

  const getStatusIcon = (status: DeletionStep['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <Check className="w-4 h-4 text-emerald-500" />;
      case 'error':
        return <X className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Supprimer mon compte
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Toutes vos données seront définitivement supprimées.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Data to be deleted */}
          {!isDeleting && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-800 mb-2">
                Les données suivantes seront supprimées:
              </p>
              <ul className="space-y-1 text-sm text-red-700">
                <li className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Votre profil entreprise
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Tous vos documents uploadés
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  L'historique de vos conversations IA
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  Vos aides sauvegardées
                </li>
                <li className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5" />
                  Toutes les données associées
                </li>
              </ul>
            </div>
          )}

          {/* Deletion progress */}
          {isDeleting && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Suppression en cours...
              </p>
              {steps.map((step) => {
                const Icon = getStepIcon(step.id);
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-2 rounded ${
                      step.status === 'in_progress' ? 'bg-blue-50' :
                      step.status === 'completed' ? 'bg-emerald-50' :
                      step.status === 'error' ? 'bg-red-50' : ''
                    }`}
                  >
                    {getStatusIcon(step.status)}
                    <Icon className="h-4 w-4 text-slate-500" />
                    <span className={`text-sm ${
                      step.status === 'completed' ? 'text-emerald-700' :
                      step.status === 'error' ? 'text-red-700' :
                      step.status === 'in_progress' ? 'text-blue-700' :
                      'text-slate-600'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Confirmation inputs */}
          {!isDeleting && (
            <>
              <div className="space-y-2">
                <Label htmlFor="confirmDelete">
                  Tapez <span className="font-mono font-bold text-red-600">{CONFIRMATION_TEXT}</span> pour confirmer
                </Label>
                <Input
                  id="confirmDelete"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={CONFIRMATION_TEXT}
                  className="font-mono"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-slate-600">
                  Je comprends que cette action est irréversible et que toutes mes données seront définitivement supprimées.
                </span>
              </label>
            </>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isDeleting && (
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
          )}
          <Button
            onClick={handleDelete}
            disabled={!canDelete}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Supprimer définitivement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AccountDeletionDialog;
