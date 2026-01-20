import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useSavedSubsidies } from '@/hooks/useSavedSubsidies';
import { useNewSubsidies } from '@/hooks/useNewSubsidies';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { SubsidyCard } from '@/components/search/SubsidyCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { Subsidy } from '@/types';
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
  Star,
  Send,
  Trophy,
  Euro,
  Bell,
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, hasProfile } = useProfile();
  const { savedSubsidies, isSaved, toggleSave } = useSavedSubsidies();
  const { newCount, hasNew } = useNewSubsidies();

  // Recommended subsidies state
  const [recommendedSubsidies, setRecommendedSubsidies] = useState<Subsidy[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Utilisateur';

  // Calculate stats from saved subsidies
  const stats = {
    saved: savedSubsidies.length,
    applied: savedSubsidies.filter(s => s.status === 'applied').length,
    received: savedSubsidies.filter(s => s.status === 'received').length,
    potentialFunding: savedSubsidies.reduce((sum, s) => {
      const amount = s.subsidy?.amount_max || s.subsidy?.amount_min || 0;
      return sum + (typeof amount === 'number' ? amount : 0);
    }, 0),
    fundingWon: savedSubsidies
      .filter(s => s.status === 'received')
      .reduce((sum, s) => {
        const amount = s.subsidy?.amount_max || s.subsidy?.amount_min || 0;
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0),
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M EUR`;
    }
    if (amount >= 1000) {
      return `${Math.round(amount / 1000)}K EUR`;
    }
    return `${amount} EUR`;
  };

  // Fetch recommended subsidies based on profile
  useEffect(() => {
    async function fetchRecommendations() {
      if (!hasProfile || !profile) return;

      setLoadingRecommendations(true);
      try {
        let query = supabase
          .from('subsidies')
          .select('id, title, description, agency, region, deadline, amount_min, amount_max, funding_type, categories, primary_sector, application_url, is_active')
          .eq('is_active', true)
          .order('deadline', { ascending: true, nullsFirst: false })
          .limit(5);

        // Filter by region if available (include national)
        if (profile.region) {
          query = query.or(`region.cs.{${profile.region}},region.cs.{National}`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching recommendations:', error);
          return;
        }

        setRecommendedSubsidies((data || []) as Subsidy[]);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoadingRecommendations(false);
      }
    }

    fetchRecommendations();
  }, [hasProfile, profile]);

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

      {/* New Subsidies Alert */}
      {hasNew && newCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-full">
              <Bell className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-800">
              {newCount} nouvelle{newCount > 1 ? 's' : ''} aide{newCount > 1 ? 's' : ''} disponible{newCount > 1 ? 's' : ''}
            </h3>
            <p className="text-emerald-700 text-sm mt-1">
              De nouvelles subventions ont ete ajoutees depuis votre derniere visite.
            </p>
            <Link to="/app/search">
              <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700" size="sm">
                Voir les nouvelles aides
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Saved Subsidies */}
        <Link
          to="/app/saved"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <Bookmark className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Sauvegardees</p>
              <p className="text-2xl font-bold text-slate-900">{stats.saved}</p>
            </div>
          </div>
        </Link>

        {/* Applications Sent */}
        <Link
          to="/app/saved?status=applied"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg">
              <Send className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Candidatures</p>
              <p className="text-2xl font-bold text-slate-900">{stats.applied}</p>
            </div>
          </div>
        </Link>

        {/* Funding Won */}
        <Link
          to="/app/saved?status=received"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg">
              <Trophy className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Obtenues</p>
              <p className="text-2xl font-bold text-slate-900">{stats.received}</p>
            </div>
          </div>
        </Link>

        {/* Potential Funding */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
              <Euro className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Potentiel</p>
              <p className="text-xl font-bold text-slate-900">
                {stats.potentialFunding > 0 ? formatCurrency(stats.potentialFunding) : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded-lg">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Mon entreprise</p>
              <p className="text-lg font-semibold text-slate-900">
                {hasProfile ? profile?.company_name : 'Non configure'}
              </p>
            </div>
          </div>
          <Link to={hasProfile ? '/app/profile' : '/app/profile/setup'}>
            <Button variant="outline" size="sm">
              {hasProfile ? 'Voir le profil' : 'Configurer'}
            </Button>
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

          {/* AI Assistant */}
          <Link
            to="/app/ai"
            className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white hover:from-purple-700 hover:to-purple-800 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Assistant IA</h3>
                <p className="text-purple-100 text-sm mt-1">
                  Discutez avec votre conseiller en subventions
                </p>
              </div>
              <Sparkles className="h-10 w-10 text-purple-300 group-hover:scale-110 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Activity Feed */}
      {savedSubsidies.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" />
              Activite recente
            </h2>
          </div>
          <div className="p-3">
            <ActivityFeed savedSubsidies={savedSubsidies} maxItems={5} />
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <Link to="/app/saved" className="text-sm text-blue-600 hover:underline">
              Voir toutes mes aides
            </Link>
          </div>
        </div>
      )}

      {/* Recommended Subsidies */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            {hasProfile ? 'Recommandees pour vous' : 'Aides recentes'}
          </h2>
          <Link to="/app/search" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loadingRecommendations ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-slate-600 mt-3">Chargement des recommandations...</p>
          </div>
        ) : recommendedSubsidies.length > 0 ? (
          <div className="space-y-4">
            {recommendedSubsidies.map((subsidy) => (
              <SubsidyCard
                key={subsidy.id}
                subsidy={subsidy}
                isSaved={isSaved(subsidy.id)}
                onToggleSave={toggleSave}
              />
            ))}
            <div className="text-center pt-2">
              <Link to="/app/search">
                <Button variant="outline">
                  Voir plus d'aides
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mx-auto mb-4">
              <Clock className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600">
              {hasProfile
                ? 'Aucune aide correspondant a votre profil pour le moment'
                : 'Completez votre profil pour recevoir des recommandations personnalisees'}
            </p>
            <Link to={hasProfile ? '/app/search' : '/app/profile/setup'}>
              <Button className="mt-4">
                {hasProfile ? (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Rechercher des aides
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Completer mon profil
                  </>
                )}
              </Button>
            </Link>
          </div>
        )}
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
