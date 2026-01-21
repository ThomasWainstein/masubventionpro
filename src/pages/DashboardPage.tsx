import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useSavedSubsidies } from '@/hooks/useSavedSubsidies';
import { useNewSubsidies } from '@/hooks/useNewSubsidies';
import { useRecommendedSubsidies } from '@/hooks/useRecommendedSubsidies';
import { Button } from '@/components/ui/button';
import { SubsidyCard } from '@/components/search/SubsidyCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { getSubsidyTitle } from '@/types';
import {
  Search,
  Building2,
  Bookmark,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Clock,
  Sparkles,
  Star,
  Send,
  Trophy,
  Euro,
  Bell,
  CalendarClock,
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, hasProfile } = useProfile();
  const { savedSubsidies, isSaved, toggleSave } = useSavedSubsidies();
  const { newCount, hasNew } = useNewSubsidies();

  // V5 Hybrid Matcher - Profile-based recommendations with AI scoring
  const {
    recommendations: recommendedSubsidies,
    loading: loadingRecommendations,
    isAIScored,
  } = useRecommendedSubsidies(hasProfile ? profile : null, { limit: 5, useAIScoring: true });

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

  // Calculate upcoming deadlines from saved subsidies
  const upcomingDeadlines = savedSubsidies
    .filter(s => {
      if (!s.subsidy?.deadline) return false;
      const deadline = new Date(s.subsidy.deadline);
      const now = new Date();
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 30 && s.status !== 'received' && s.status !== 'rejected';
    })
    .sort((a, b) => new Date(a.subsidy!.deadline!).getTime() - new Date(b.subsidy!.deadline!).getTime());

  // Dynamic tips based on user context
  const getDynamicTip = () => {
    // Priority 1: No profile - encourage completion
    if (!hasProfile) {
      return {
        icon: Building2,
        title: 'Completez votre profil',
        message: 'Pour recevoir des recommandations d\'aides personnalisees et pertinentes, completez les informations de votre entreprise.',
        actionText: 'Completer mon profil',
        actionLink: '/app/profile/setup',
      };
    }

    // Priority 2: Upcoming deadlines
    if (upcomingDeadlines.length > 0) {
      const nextDeadline = upcomingDeadlines[0];
      const deadline = new Date(nextDeadline.subsidy!.deadline!);
      const daysUntil = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const subsidyTitle = nextDeadline.subsidy ? getSubsidyTitle(nextDeadline.subsidy) : 'Aide';
      return {
        icon: Clock,
        title: `Deadline dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`,
        message: `Votre aide "${subsidyTitle.substring(0, 50)}${subsidyTitle.length > 50 ? '...' : ''}" arrive a echeance bientot. N'oubliez pas de soumettre votre candidature.`,
        actionText: 'Voir les details',
        actionLink: `/app/subsidy/${nextDeadline.subsidy_id}`,
      };
    }

    // Priority 3: No saved subsidies - encourage exploration
    if (savedSubsidies.length === 0) {
      return {
        icon: Search,
        title: 'Explorez les aides disponibles',
        message: 'Commencez par rechercher des aides adaptees a votre entreprise et sauvegardez celles qui vous interessent.',
        actionText: 'Rechercher des aides',
        actionLink: '/app/search',
      };
    }

    // Priority 4: Saved but no applications
    if (stats.applied === 0 && stats.saved > 0) {
      return {
        icon: Send,
        title: 'Passez a l\'action',
        message: `Vous avez ${stats.saved} aide${stats.saved > 1 ? 's' : ''} sauvegardee${stats.saved > 1 ? 's' : ''}. Mettez a jour leur statut quand vous soumettez vos candidatures.`,
        actionText: 'Voir mes aides',
        actionLink: '/app/saved',
      };
    }

    // Priority 5: Applications in progress
    if (stats.applied > 0 && stats.received === 0) {
      return {
        icon: TrendingUp,
        title: 'Candidatures en cours',
        message: `Vous avez ${stats.applied} candidature${stats.applied > 1 ? 's' : ''} en cours. Pensez a suivre leur avancement et mettre a jour leur statut.`,
        actionText: 'Suivre mes candidatures',
        actionLink: '/app/saved?status=applied',
      };
    }

    // Priority 6: Success - celebrate and encourage more
    if (stats.received > 0) {
      return {
        icon: Trophy,
        title: 'Felicitations pour vos succes !',
        message: `Vous avez obtenu ${stats.received} aide${stats.received > 1 ? 's' : ''}${stats.fundingWon > 0 ? ` pour un total de ${formatCurrency(stats.fundingWon)}` : ''}. Continuez a explorer de nouvelles opportunites.`,
        actionText: 'Trouver plus d\'aides',
        actionLink: '/app/search',
      };
    }

    // Default tip
    return {
      icon: TrendingUp,
      title: 'Conseil du jour',
      message: 'Completez votre profil avec le maximum d\'informations pour recevoir des recommandations d\'aides plus pertinentes.',
      actionText: 'Voir mon profil',
      actionLink: '/app/profile',
    };
  };

  const dynamicTip = getDynamicTip();

  // Calculate profile completion percentage (same logic as ProfilePage)
  const calculateProfileCompletion = () => {
    if (!profile) return 0;

    const fields = [
      'company_name',
      'siret',
      'sector',
      'region',
      'employees',
      'legal_form',
      'year_created',
      'naf_code',
      'website_url',
      'description',
    ];

    const filled = fields.filter((field) => {
      const value = (profile as any)[field];
      if (value === null || value === undefined || value === '') return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    });

    return Math.round((filled.length / fields.length) * 100);
  };

  const profileCompletion = calculateProfileCompletion();

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
      <div className="grid grid-cols-2 gap-4">
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

        {/* Funding Won Amount or Potential */}
        <Link
          to="/app/saved?status=received"
          className={`rounded-xl border p-5 hover:shadow-sm transition-all ${
            stats.fundingWon > 0
              ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:border-emerald-300'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
              stats.fundingWon > 0 ? 'bg-emerald-200' : 'bg-purple-100'
            }`}>
              <Euro className={`h-5 w-5 ${stats.fundingWon > 0 ? 'text-emerald-700' : 'text-purple-600'}`} />
            </div>
            <div>
              <p className={`text-xs ${stats.fundingWon > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                {stats.fundingWon > 0 ? 'Obtenu' : 'Potentiel'}
              </p>
              <p className={`text-xl font-bold ${stats.fundingWon > 0 ? 'text-emerald-800' : 'text-slate-900'}`}>
                {stats.fundingWon > 0
                  ? formatCurrency(stats.fundingWon)
                  : stats.potentialFunding > 0
                    ? formatCurrency(stats.potentialFunding)
                    : '-'}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Success Banner - Show when user has won funding */}
      {stats.fundingWon > 0 && stats.potentialFunding > stats.fundingWon && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Financement total obtenu</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(stats.fundingWon)}</p>
              <p className="text-emerald-100 text-sm mt-2">
                + {formatCurrency(stats.potentialFunding - stats.fundingWon)} en cours de traitement
              </p>
            </div>
            <Trophy className="h-16 w-16 text-emerald-200 opacity-50" />
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
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
        {hasProfile && (
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Completion du profil</span>
              <span className={`text-xs font-semibold ${profileCompletion >= 80 ? 'text-emerald-600' : profileCompletion >= 50 ? 'text-amber-600' : 'text-slate-600'}`}>
                {profileCompletion}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${profileCompletion >= 80 ? 'bg-emerald-500' : profileCompletion >= 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            {profileCompletion < 80 && (
              <p className="text-xs text-slate-500 mt-2">
                Completez votre profil pour de meilleures recommandations
              </p>
            )}
          </div>
        )}
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

      {/* Upcoming Deadlines Alert */}
      {upcomingDeadlines.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="h-5 w-5 text-orange-600" />
            <h2 className="font-semibold text-orange-800">
              Deadlines a venir ({upcomingDeadlines.length})
            </h2>
          </div>
          <div className="space-y-3">
            {upcomingDeadlines.slice(0, 3).map((item) => {
              const deadline = new Date(item.subsidy!.deadline!);
              const daysUntil = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysUntil <= 7;
              const itemTitle = item.subsidy ? getSubsidyTitle(item.subsidy) : 'Aide';

              return (
                <Link
                  key={item.id}
                  to={`/app/subsidy/${item.subsidy_id}`}
                  className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isUrgent && (
                      <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    )}
                    <span className="text-sm text-slate-700 truncate">
                      {itemTitle}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2 ${isUrgent ? 'bg-orange-200 text-orange-800' : 'bg-orange-100 text-orange-700'}`}>
                    {daysUntil} jour{daysUntil > 1 ? 's' : ''}
                  </span>
                </Link>
              );
            })}
          </div>
          {upcomingDeadlines.length > 3 && (
            <Link to="/app/saved" className="block text-center text-sm text-orange-700 hover:underline mt-3">
              Voir {upcomingDeadlines.length - 3} autre{upcomingDeadlines.length - 3 > 1 ? 's' : ''} deadline{upcomingDeadlines.length - 3 > 1 ? 's' : ''}
            </Link>
          )}
        </div>
      )}

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
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              {hasProfile ? 'Recommandees pour vous' : 'Aides recentes'}
            </h2>
            {hasProfile && isAIScored && (
              <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                <Sparkles className="h-3 w-3" />
                Score par IA - basé sur les laureats similaires
              </p>
            )}
          </div>
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
                matchScore={subsidy.matchScore}
                matchReasons={subsidy.matchReasons}
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

      {/* Dynamic Tips */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg flex-shrink-0">
            <dynamicTip.icon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{dynamicTip.title}</h3>
            <p className="text-slate-600 text-sm mt-1">
              {dynamicTip.message}
            </p>
            <Link to={dynamicTip.actionLink}>
              <Button variant="outline" size="sm" className="mt-3">
                {dynamicTip.actionText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
