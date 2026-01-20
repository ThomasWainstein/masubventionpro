import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import {
  Search,
  Building2,
  Bookmark,
  ArrowRight,
  AlertCircle,
  Loader2,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, hasProfile } = useProfile();

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Utilisateur';
  const userPlan = user?.user_metadata?.selected_plan || 'decouverte';

  // Plan limits
  const planLimits = {
    decouverte: { searches: 50, name: 'Decouverte' },
    business: { searches: 200, name: 'Business' },
    premium: { searches: -1, name: 'Premium' }, // -1 = unlimited
  };

  const currentPlan = planLimits[userPlan as keyof typeof planLimits] || planLimits.decouverte;
  const searchesRemaining = currentPlan.searches === -1 ? 'Illimitees' : currentPlan.searches;

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Helmet>
        <title>Tableau de bord - MaSubventionPro</title>
      </Helmet>

      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Bonjour, {userName} !
        </h1>
        <p className="text-slate-600 mt-1">
          {hasProfile
            ? `Bienvenue sur votre espace ${profile?.company_name || 'MaSubventionPro'}`
            : 'Completez votre profil pour recevoir des recommandations personnalisees'}
        </p>
      </div>

      {/* Profile Completion Alert */}
      {!hasProfile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800">Completez votre profil</h3>
            <p className="text-amber-700 text-sm mt-1">
              Pour recevoir des recommandations d'aides personnalisees, completez les informations
              de votre entreprise.
            </p>
            <Link to="/app/profile/setup">
              <Button className="mt-3" size="sm">
                Completer mon profil
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Searches */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Recherches</p>
              <p className="text-2xl font-bold text-slate-900">{searchesRemaining}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Offre {currentPlan.name}
          </p>
        </div>

        {/* Saved Subsidies */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg">
              <Bookmark className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Aides sauvegardees</p>
              <p className="text-2xl font-bold text-slate-900">0</p>
            </div>
          </div>
          <Link to="/app/saved" className="text-xs text-blue-600 hover:underline mt-3 inline-block">
            Voir mes aides
          </Link>
        </div>

        {/* Profile */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Mon profil</p>
              <p className="text-lg font-semibold text-slate-900 truncate">
                {hasProfile ? profile?.company_name : 'Non configure'}
              </p>
            </div>
          </div>
          <Link
            to={hasProfile ? '/app/profile/edit' : '/app/profile/setup'}
            className="text-xs text-blue-600 hover:underline mt-3 inline-block"
          >
            {hasProfile ? 'Modifier' : 'Configurer'}
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Action */}
          <Link
            to="/app/search"
            className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white hover:from-blue-700 hover:to-blue-800 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Rechercher des aides</h3>
                <p className="text-blue-100 text-sm mt-1">
                  Explorez les subventions disponibles pour votre entreprise
                </p>
              </div>
              <Search className="h-10 w-10 text-blue-300 group-hover:scale-110 transition-transform" />
            </div>
          </Link>

          {/* AI Matching (Premium feature teaser) */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-white/20 px-2 py-0.5 rounded text-xs font-medium">
              Business+
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Matching IA</h3>
                <p className="text-purple-100 text-sm mt-1">
                  Recevez des recommandations personnalisees
                </p>
              </div>
              <Sparkles className="h-10 w-10 text-purple-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Subsidies Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Aides recentes</h2>
          <Link to="/app/search" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mx-auto mb-4">
            <Clock className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-slate-600">
            Lancez une recherche pour decouvrir les aides disponibles
          </p>
          <Link to="/app/search">
            <Button className="mt-4">
              <Search className="mr-2 h-4 w-4" />
              Rechercher des aides
            </Button>
          </Link>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Conseil du jour</h3>
            <p className="text-slate-600 text-sm mt-1">
              Completez votre profil avec le maximum d'informations pour recevoir des
              recommandations d'aides plus pertinentes et adaptees a votre situation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
