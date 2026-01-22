import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Mail,
  Lock,
  CreditCard,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { AccountDeletionDialog } from '@/components/settings/AccountDeletionDialog';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const userPlan = user?.user_metadata?.selected_plan || 'decouverte';
  const planInfo = {
    decouverte: { name: 'Decouverte', price: '49€', period: '' },
    business: { name: 'Business', price: '149€', period: '/an' },
    premium: { name: 'Premium', price: '299€', period: '/an' },
  };
  const currentPlan = planInfo[userPlan as keyof typeof planInfo] || planInfo.decouverte;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);

      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Helmet>
        <title>Parametres - MaSubventionPro</title>
      </Helmet>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Parametres</h1>
        <p className="text-slate-600 mt-1">Gerez votre compte et vos preferences</p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Informations du compte</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Label className="text-sm text-slate-500">Nom</Label>
            <p className="font-medium text-slate-900">
              {user?.user_metadata?.first_name || ''} {user?.user_metadata?.last_name || ''}
            </p>
          </div>
          <div>
            <Label className="text-sm text-slate-500">Email</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <p className="font-medium text-slate-900">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded-lg">
              <Lock className="h-5 w-5 text-slate-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Securite</h2>
          </div>
        </div>
        <div className="p-6">
          {passwordSuccess && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <Check className="h-5 w-5" />
              Mot de passe modifie avec succes
            </div>
          )}

          {!isChangingPassword ? (
            <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
              Changer le mot de passe
            </Button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  {passwordError}
                </div>
              )}
              <div>
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caracteres"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le mot de passe"
                  className="mt-1"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Modification...
                    </>
                  ) : (
                    'Modifier'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordError(null);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Abonnement</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Offre {currentPlan.name}</p>
              <p className="text-slate-600 text-sm">
                {currentPlan.price}
                {currentPlan.period}
              </p>
            </div>
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
              Actif
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <a
              href="https://billing.stripe.com/p/login/test_XXX"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm flex items-center gap-1"
            >
              Gerer mon abonnement
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Session</h2>
        <Button variant="outline" onClick={handleSignOut} className="text-red-600 border-red-200 hover:bg-red-50">
          Se deconnecter
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Zone de danger</h2>
        <p className="text-red-700 text-sm mb-4">
          La suppression de votre compte est irreversible. Toutes vos donnees seront definitivement supprimees.
        </p>
        <Button
          variant="outline"
          onClick={() => setShowDeleteDialog(true)}
          className="text-red-600 border-red-300 hover:bg-red-100 gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer mon compte
        </Button>
      </div>

      {/* Account Deletion Dialog */}
      <AccountDeletionDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </div>
  );
}

export default SettingsPage;
