import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSubscription, PLAN_INFO } from '@/hooks/useSubscription';
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
  ArrowLeft,
  Pencil,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Building2,
} from 'lucide-react';
import { AccountDeletionDialog } from '@/components/settings/AccountDeletionDialog';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    subscription,
    loading: _subLoading,
    openBillingPortal,
    createUpgrade,
  } = useSubscription();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || '');
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [billingLoading, setBillingLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Check for upgrade success from URL params
  useEffect(() => {
    if (searchParams.get('upgrade') === 'success') {
      setUpgradeSuccess(true);
      // Remove the query param
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      setTimeout(() => setUpgradeSuccess(false), 5000);
    }
  }, [searchParams]);

  // Get current plan info
  const currentPlanType = subscription?.plan_type || user?.user_metadata?.selected_plan || 'decouverte';
  const currentPlan = PLAN_INFO[currentPlanType as keyof typeof PLAN_INFO] || PLAN_INFO.decouverte;

  // Determine subscription status display
  const getStatusDisplay = () => {
    if (!subscription) return { label: 'Actif', color: 'emerald' };

    switch (subscription.status) {
      case 'active':
      case 'trialing':
        return { label: 'Actif', color: 'emerald' };
      case 'past_due':
        return { label: 'Paiement en retard', color: 'amber' };
      case 'canceled':
        return { label: 'Annulé', color: 'red' };
      case 'paused':
        return { label: 'En pause', color: 'slate' };
      default:
        return { label: 'Actif', color: 'emerald' };
    }
  };

  const status = getStatusDisplay();

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Get period end or access expiry
  const getPeriodInfo = () => {
    if (subscription?.is_one_time && subscription.access_expires_at) {
      return `Accès jusqu'au ${formatDate(subscription.access_expires_at)}`;
    }
    if (subscription?.current_period_end) {
      return `Prochain renouvellement : ${formatDate(subscription.current_period_end)}`;
    }
    return null;
  };

  // Determine available upgrades
  const getAvailableUpgrades = () => {
    const upgrades: { plan: 'business' | 'premium'; label: string; price: string; highlight?: string }[] = [];

    if (currentPlanType === 'decouverte') {
      upgrades.push({
        plan: 'business',
        label: 'Business',
        price: '189€ HT/an',
        highlight: 'Payez 140€ (crédit 49€ appliqué)',
      });
      upgrades.push({
        plan: 'premium',
        label: 'Premium Groupe',
        price: '549€ HT/an',
        highlight: 'Payez 500€ (crédit 49€ appliqué)',
      });
    } else if (currentPlanType === 'business') {
      upgrades.push({
        plan: 'premium',
        label: 'Premium Groupe',
        price: '549€ HT/an',
        highlight: 'Payez 360€ (crédit 189€ appliqué)',
      });
    }

    return upgrades;
  };

  const availableUpgrades = getAvailableUpgrades();

  const handleNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(false);

    if (!firstName.trim() || !lastName.trim()) {
      setNameError('Le prénom et le nom sont requis');
      return;
    }

    setNameLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      });

      if (error) throw error;

      setNameSuccess(true);
      setIsEditingName(false);

      setTimeout(() => setNameSuccess(false), 5000);
    } catch (err: any) {
      setNameError(err.message || 'Erreur lors de la modification du nom');
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
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

  const handleOpenBillingPortal = async () => {
    setBillingLoading(true);
    try {
      await openBillingPortal();
    } catch (err: any) {
      console.error('Error opening billing portal:', err);
      // If billing portal fails, user might not have a Stripe customer yet
      alert(err.message || 'Erreur lors de l\'ouverture du portail');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleUpgrade = async (targetPlan: 'business' | 'premium') => {
    setUpgradeLoading(targetPlan);
    try {
      await createUpgrade(targetPlan);
    } catch (err: any) {
      console.error('Error creating upgrade:', err);
      alert(err.message || 'Erreur lors de la mise à niveau');
    } finally {
      setUpgradeLoading(null);
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
        <title>Paramètres - MaSubventionPro</title>
      </Helmet>

      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate('/app')}
          className="mb-4 -ml-2 text-slate-600"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-600 mt-1">Gérez votre compte et vos préférences</p>
      </div>

      {/* Upgrade Success Message */}
      {upgradeSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-5 w-5" />
          Votre abonnement a été mis à niveau avec succès !
        </div>
      )}

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
          {nameSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <Check className="h-5 w-5" />
              Nom modifié avec succès
            </div>
          )}

          {!isEditingName ? (
            <div>
              <Label className="text-sm text-slate-500">Nom</Label>
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">
                  {user?.user_metadata?.first_name || ''} {user?.user_metadata?.last_name || ''}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingName(true)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleNameChange} className="space-y-4 max-w-md">
              {nameError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  {nameError}
                </div>
              )}
              <div>
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Votre nom"
                  className="mt-1"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={nameLoading}>
                  {nameLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditingName(false);
                    setNameError(null);
                    setFirstName(user?.user_metadata?.first_name || '');
                    setLastName(user?.user_metadata?.last_name || '');
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}

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
            <h2 className="text-lg font-semibold text-slate-900">Sécurité</h2>
          </div>
        </div>
        <div className="p-6">
          {passwordSuccess && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <Check className="h-5 w-5" />
              Mot de passe modifié avec succès
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
                  placeholder="Minimum 8 caractères"
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
        <div className="p-6 space-y-6">
          {/* Current Plan */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Offre {currentPlan.name}</p>
              <p className="text-slate-600 text-sm">
                {currentPlan.price}€ HT{currentPlan.period}
              </p>
              {subscription?.addon_companies && subscription.addon_companies > 0 && (
                <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                  <Building2 className="h-3.5 w-3.5" />
                  +{subscription.addon_companies} société(s) supplémentaire(s)
                </p>
              )}
            </div>
            <span
              className={`bg-${status.color}-100 text-${status.color}-700 px-3 py-1 rounded-full text-sm font-medium`}
            >
              {status.label}
            </span>
          </div>

          {/* Period Info */}
          {getPeriodInfo() && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="h-4 w-4" />
              {getPeriodInfo()}
            </div>
          )}

          {/* Upgrade Options */}
          {availableUpgrades.length > 0 && (
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Passer à un plan supérieur
              </h3>
              <div className="space-y-3">
                {availableUpgrades.map((upgrade) => (
                  <div
                    key={upgrade.plan}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{upgrade.label}</p>
                      <p className="text-sm text-slate-500">{upgrade.price}</p>
                      {upgrade.highlight && (
                        <p className="text-sm text-blue-600 mt-1">{upgrade.highlight}</p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleUpgrade(upgrade.plan)}
                      disabled={upgradeLoading !== null}
                      className="gap-2"
                    >
                      {upgradeLoading === upgrade.plan ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement...
                        </>
                      ) : (
                        <>
                          Mettre à niveau
                          <ArrowUpRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Billing Portal Link */}
          <div className="border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              onClick={handleOpenBillingPortal}
              disabled={billingLoading}
              className="gap-2"
            >
              {billingLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ouverture...
                </>
              ) : (
                <>
                  Gérer mon abonnement
                  <ExternalLink className="h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              Modifier votre moyen de paiement, télécharger vos factures ou annuler votre abonnement
            </p>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Session</h2>
        <Button variant="outline" onClick={handleSignOut} className="text-red-600 border-red-200 hover:bg-red-50">
          Se déconnecter
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Zone de danger</h2>
        <p className="text-red-700 text-sm mb-4">
          La suppression de votre compte est irréversible. Toutes vos données seront définitivement supprimées.
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
