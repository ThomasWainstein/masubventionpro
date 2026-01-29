import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Rocket,
  Heart,
  ArrowRight,
  Check,
  ChevronRight,
  ExternalLink,
  Info,
  Users,
  Target,
  Sparkles,
  CircleDot,
  Layers,
} from 'lucide-react';

/**
 * SimulationUXDemoPage - Demonstrates different UX patterns for user type selection
 *
 * Based on research from:
 * - Appcues: 200+ onboarding flows study
 * - UserPilot: Modal UX Design best practices
 * - NN/g: Card UI patterns
 * - Slack, Notion, Asana onboarding patterns
 */

type ProfileType = 'entreprise' | 'creation' | 'association';

interface PatternInfo {
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  source: string;
  sourceUrl: string;
}

const patternResearch: Record<string, PatternInfo> = {
  stacked: {
    title: "Cartes Verticales Empilées (Actuel)",
    description: "Le pattern actuel de MaSubventionPro. Cartes empilées verticalement avec icônes, titres, descriptions et checkmarks de fonctionnalités.",
    pros: [
      "Lisibilité mobile excellente",
      "Zone de clic large et accessible",
      "Hiérarchie visuelle claire",
      "Permet d'afficher plus de détails par option"
    ],
    cons: [
      "Peut nécessiter du scroll sur mobile",
      "Moins efficace pour comparer les options",
      "Occupe beaucoup d'espace vertical"
    ],
    bestFor: "Mobile-first, utilisateurs qui ont besoin de détails pour décider",
    source: "Salt Design System - Selectable Cards",
    sourceUrl: "https://www.saltdesignsystem.com/salt/patterns/selectable-card"
  },
  grid: {
    title: "Grille Horizontale",
    description: "Disposition en grille côte à côte (3 colonnes sur desktop, 1 sur mobile). Pattern utilisé par Asana et Trello pour la sélection de persona.",
    pros: [
      "Toutes les options visibles sans scroll (desktop)",
      "Facilite la comparaison rapide",
      "Design moderne et aéré",
      "Meilleure utilisation de l'espace horizontal"
    ],
    cons: [
      "Moins de place pour les détails",
      "Peut sembler écrasé sur petits écrans",
      "Nécessite des icônes très distinctives"
    ],
    bestFor: "Desktop-first, comparaison rapide entre 3-4 options",
    source: "Asana Onboarding Research",
    sourceUrl: "https://userpilot.com/blog/user-onboarding-examples/"
  },
  minimal: {
    title: "Cards Minimalistes",
    description: "Version épurée avec uniquement icône + titre + sous-titre. Inspiré du style Notion qui privilégie la simplicité et l'action rapide.",
    pros: [
      "Décision ultra-rapide",
      "Moins de charge cognitive",
      "Interface épurée et moderne",
      "Excellent pour utilisateurs familiers"
    ],
    cons: [
      "Manque de contexte pour nouveaux utilisateurs",
      "Peut générer de l'incertitude",
      "Moins différenciant"
    ],
    bestFor: "Utilisateurs récurrents, interfaces minimalistes",
    source: "Notion Onboarding Study",
    sourceUrl: "https://designerup.co/blog/i-studied-the-ux-ui-of-over-200-onboarding-flows-heres-everything-i-learned/"
  },
  question: {
    title: "Flow Basé sur Questions",
    description: "Approche conversationnelle de Slack: poser une question claire puis proposer les réponses. Crée un sentiment de dialogue personnalisé.",
    pros: [
      "Sentiment de personnalisation",
      "Engagement émotionnel plus fort",
      "Réduit l'anxiété de choix",
      "Naturel et conversationnel"
    ],
    cons: [
      "Plus d'étapes potentielles",
      "Peut sembler condescendant pour experts",
      "Moins direct"
    ],
    bestFor: "Nouveaux utilisateurs, produits complexes nécessitant du contexte",
    source: "Slack Onboarding Analysis",
    sourceUrl: "https://userpilot.com/blog/slack-onboarding/"
  },
  twoColumn: {
    title: "Modal Deux Colonnes",
    description: "Layout recommandé par UserPilot: illustration/valeur à gauche, sélection à droite. Équilibre entre information et action.",
    pros: [
      "Contexte et action côte à côte",
      "Réduit le sentiment de formulaire",
      "Permet de communiquer la valeur",
      "Format professionnel B2B"
    ],
    cons: [
      "Nécessite plus de travail design",
      "Moins adapté au mobile",
      "Peut distraire de l'action principale"
    ],
    bestFor: "SaaS B2B, produits nécessitant de rassurer",
    source: "UserPilot Modal UX Design",
    sourceUrl: "https://userpilot.com/blog/modal-ux-design/"
  },
  radio: {
    title: "Radio Buttons Traditionnels",
    description: "Approche formulaire classique avec radio buttons. Simple, accessible, prévisible. Utilisé par les administrations et outils enterprise.",
    pros: [
      "Familier et prévisible",
      "Excellente accessibilité (ADA)",
      "Fonctionne partout",
      "Pas de confusion sur l'interaction"
    ],
    cons: [
      "Moins engageant visuellement",
      "Peut sembler daté",
      "Moins d'espace pour différencier"
    ],
    bestFor: "Accessibilité, utilisateurs seniors, contextes administratifs",
    source: "NN/g Forms Best Practices",
    sourceUrl: "https://www.nngroup.com/articles/cards-component/"
  }
};

const SimulationUXDemoPage = () => {
  const [activePattern, setActivePattern] = useState<string>('stacked');
  const [selectedType, setSelectedType] = useState<ProfileType | null>(null);

  const resetSelection = () => setSelectedType(null);

  // Research stats banner
  const researchStats = [
    { stat: "80%", label: "Abandon si mauvais onboarding", source: "DesignerUp" },
    { stat: "50%", label: "Meilleure rétention avec personnalisation", source: "Appcues" },
    { stat: "2-5", label: "Nombre optimal d'options", source: "UX Research" },
    { stat: "54%", label: "Meilleure activation avec segmentation", source: "UserPilot" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Demo: Patterns UX Simulation</h1>
              <p className="text-sm text-slate-500">Comparaison de différentes approches de sélection utilisateur</p>
            </div>
          </div>
          <a
            href="https://www.appcues.com/blog/choosing-the-right-onboarding-ux-pattern"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Recherche UX
          </a>
        </div>
      </header>

      {/* Research Stats Banner */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white py-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {researchStats.map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold">{item.stat}</div>
                <div className="text-xs text-blue-200">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Pattern Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900">Sélectionner un pattern</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(patternResearch).map(([key, pattern]) => (
              <button
                key={key}
                onClick={() => { setActivePattern(key); resetSelection(); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activePattern === key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {pattern.title.split('(')[0].trim()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Pattern Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Modal Header Simulation */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Simulation</h3>
                <button className="text-slate-400 hover:text-slate-600">
                  <span className="text-xl">&times;</span>
                </button>
              </div>

              {/* Pattern Content */}
              <div className="p-6">
                {selectedType ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-emerald-600" />
                    </div>
                    <p className="text-lg font-semibold text-slate-900 mb-2">
                      Type sélectionné: {selectedType === 'entreprise' ? 'Entreprise' : selectedType === 'creation' ? 'Création' : 'Association'}
                    </p>
                    <button
                      onClick={resetSelection}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Réinitialiser la sélection
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Pattern 1: Stacked Cards (Current) */}
                    {activePattern === 'stacked' && (
                      <div className="space-y-4 max-w-lg mx-auto">
                        <PatternStackedCard
                          type="entreprise"
                          icon={<Building2 className="w-7 h-7 text-white" />}
                          title="Entreprise"
                          subtitle="Vous avez déjà une entreprise immatriculée"
                          features={["Enrichissement automatique SIRET", "Données pré-remplies"]}
                          color="blue"
                          onClick={() => setSelectedType('entreprise')}
                        />
                        <PatternStackedCard
                          type="creation"
                          icon={<Rocket className="w-7 h-7 text-white" />}
                          title="Création / Reprise d'entreprise"
                          subtitle="Vous envisagez de créer ou reprendre une activité"
                          features={["Aides à la création incluses", "Accompagnement personnalisé"]}
                          color="emerald"
                          onClick={() => setSelectedType('creation')}
                        />
                        <PatternStackedCard
                          type="association"
                          icon={<Heart className="w-7 h-7 text-white" />}
                          title="Association"
                          subtitle="Vous gérez une association loi 1901"
                          features={["Recherche par RNA ou SIRET", "Subventions spécifiques"]}
                          color="purple"
                          onClick={() => setSelectedType('association')}
                        />
                      </div>
                    )}

                    {/* Pattern 2: Horizontal Grid */}
                    {activePattern === 'grid' && (
                      <div className="grid md:grid-cols-3 gap-4">
                        <PatternGridCard
                          icon={<Building2 className="w-8 h-8" />}
                          title="Entreprise"
                          subtitle="Déjà immatriculée"
                          color="blue"
                          onClick={() => setSelectedType('entreprise')}
                        />
                        <PatternGridCard
                          icon={<Rocket className="w-8 h-8" />}
                          title="Création"
                          subtitle="Projet en cours"
                          color="emerald"
                          onClick={() => setSelectedType('creation')}
                        />
                        <PatternGridCard
                          icon={<Heart className="w-8 h-8" />}
                          title="Association"
                          subtitle="Loi 1901 / Non lucratif"
                          color="purple"
                          onClick={() => setSelectedType('association')}
                        />
                      </div>
                    )}

                    {/* Pattern 3: Minimal Cards */}
                    {activePattern === 'minimal' && (
                      <div className="space-y-3 max-w-md mx-auto">
                        <PatternMinimalCard
                          icon={<Building2 className="w-5 h-5" />}
                          title="Entreprise existante"
                          onClick={() => setSelectedType('entreprise')}
                        />
                        <PatternMinimalCard
                          icon={<Rocket className="w-5 h-5" />}
                          title="Création d'entreprise"
                          onClick={() => setSelectedType('creation')}
                        />
                        <PatternMinimalCard
                          icon={<Heart className="w-5 h-5" />}
                          title="Association"
                          onClick={() => setSelectedType('association')}
                        />
                      </div>
                    )}

                    {/* Pattern 4: Question-Based */}
                    {activePattern === 'question' && (
                      <div className="max-w-lg mx-auto">
                        <div className="text-center mb-8">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-blue-600" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 mb-2">
                            Quel est votre profil ?
                          </h3>
                          <p className="text-slate-500">
                            Pour vous proposer les aides les plus pertinentes
                          </p>
                        </div>
                        <div className="space-y-3">
                          <PatternQuestionOption
                            title="J'ai déjà une entreprise"
                            subtitle="Recherche d'aides pour développer mon activité"
                            onClick={() => setSelectedType('entreprise')}
                          />
                          <PatternQuestionOption
                            title="Je crée ou reprends une entreprise"
                            subtitle="Recherche d'aides à la création/reprise"
                            onClick={() => setSelectedType('creation')}
                          />
                          <PatternQuestionOption
                            title="Je gère une association"
                            subtitle="Recherche de subventions associatives"
                            onClick={() => setSelectedType('association')}
                          />
                        </div>
                      </div>
                    )}

                    {/* Pattern 5: Two Column */}
                    {activePattern === 'twoColumn' && (
                      <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 flex flex-col justify-center">
                          <Sparkles className="w-10 h-10 text-blue-600 mb-4" />
                          <h3 className="text-xl font-bold text-slate-900 mb-2">
                            Trouvez vos aides publiques
                          </h3>
                          <p className="text-slate-600 mb-4">
                            Notre IA analyse des milliers de dispositifs pour identifier les subventions qui correspondent à votre profil. Analyse complète en 5 à 10 minutes.
                          </p>
                          <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-600" />
                              Analyse personnalisée
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-600" />
                              Scores d'éligibilité
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-600" />
                              100% gratuit
                            </li>
                          </ul>
                        </div>
                        <div className="flex flex-col justify-center space-y-3">
                          <p className="text-sm font-medium text-slate-700 mb-1">
                            Sélectionnez votre situation :
                          </p>
                          <PatternTwoColumnOption
                            icon={<Building2 className="w-5 h-5" />}
                            title="Entreprise"
                            color="blue"
                            onClick={() => setSelectedType('entreprise')}
                          />
                          <PatternTwoColumnOption
                            icon={<Rocket className="w-5 h-5" />}
                            title="Création / Reprise"
                            color="emerald"
                            onClick={() => setSelectedType('creation')}
                          />
                          <PatternTwoColumnOption
                            icon={<Heart className="w-5 h-5" />}
                            title="Association"
                            color="purple"
                            onClick={() => setSelectedType('association')}
                          />
                        </div>
                      </div>
                    )}

                    {/* Pattern 6: Radio Buttons */}
                    {activePattern === 'radio' && (
                      <div className="max-w-md mx-auto">
                        <p className="text-sm font-medium text-slate-700 mb-4">
                          Quel type de structure représentez-vous ?
                        </p>
                        <div className="space-y-3">
                          <PatternRadioOption
                            name="profileType"
                            title="Entreprise existante"
                            subtitle="SARL, SAS, SA, EURL, auto-entrepreneur..."
                            onClick={() => setSelectedType('entreprise')}
                          />
                          <PatternRadioOption
                            name="profileType"
                            title="Création / Reprise d'entreprise"
                            subtitle="Projet de création ou reprise en cours"
                            onClick={() => setSelectedType('creation')}
                          />
                          <PatternRadioOption
                            name="profileType"
                            title="Association loi 1901"
                            subtitle="Association ou organisme à but non lucratif"
                            onClick={() => setSelectedType('association')}
                          />
                        </div>
                        <button className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                          Continuer
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Pattern Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">Analyse du Pattern</h3>
              </div>

              <h4 className="font-bold text-slate-900 mb-2">
                {patternResearch[activePattern].title}
              </h4>
              <p className="text-sm text-slate-600 mb-4">
                {patternResearch[activePattern].description}
              </p>

              <div className="mb-4">
                <h5 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                  Avantages
                </h5>
                <ul className="space-y-1">
                  {patternResearch[activePattern].pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <h5 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                  Inconvénients
                </h5>
                <ul className="space-y-1">
                  {patternResearch[activePattern].cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <CircleDot className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      {con}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h5 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                  Idéal pour
                </h5>
                <p className="text-sm text-blue-800">
                  {patternResearch[activePattern].bestFor}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <a
                  href={patternResearch[activePattern].sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  {patternResearch[activePattern].source}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Research Sources */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Sources de Recherche UX</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SourceCard
              title="Appcues - 200+ Onboarding Flows"
              description="Étude exhaustive des patterns d'onboarding SaaS"
              url="https://designerup.co/blog/i-studied-the-ux-ui-of-over-200-onboarding-flows-heres-everything-i-learned/"
            />
            <SourceCard
              title="UserPilot - Modal UX Design"
              description="Best practices pour les modals en 2025"
              url="https://userpilot.com/blog/modal-ux-design/"
            />
            <SourceCard
              title="Slack Onboarding Analysis"
              description="Comment Slack segmente ses utilisateurs"
              url="https://userpilot.com/blog/slack-onboarding/"
            />
            <SourceCard
              title="NN/g - Cards Component"
              description="Recherche fondamentale sur les card UI"
              url="https://www.nngroup.com/articles/cards-component/"
            />
            <SourceCard
              title="Salt Design System"
              description="Patterns de cartes sélectionnables"
              url="https://www.saltdesignsystem.com/salt/patterns/selectable-card"
            />
            <SourceCard
              title="UX Design Institute"
              description="Guide complet du card design"
              url="https://www.uxdesigninstitute.com/blog/card-design-for-ui/"
            />
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="mt-8 bg-gradient-to-r from-blue-800 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="font-bold text-lg mb-4">Points Clés de la Recherche</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Bonnes Pratiques</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Limiter à 2-5 options maximum (nombre optimal selon la recherche)
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Toujours offrir une option de fermeture/skip
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Utiliser des icônes distinctives pour chaque option
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Zone de clic large pour mobile (44px minimum)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">À Éviter</h4>
              <ul className="space-y-2 text-sm text-blue-100">
                <li className="flex items-start gap-2">
                  <CircleDot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Trop de texte ou d'informations dans le modal
                </li>
                <li className="flex items-start gap-2">
                  <CircleDot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Forcer l'utilisateur sans option de sortie
                </li>
                <li className="flex items-start gap-2">
                  <CircleDot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Options trop similaires ou confuses
                </li>
                <li className="flex items-start gap-2">
                  <CircleDot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Ignorer l'accessibilité (radio buttons pour screen readers)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Component patterns

interface PatternStackedCardProps {
  type: ProfileType;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  features: string[];
  color: 'blue' | 'emerald' | 'purple';
  onClick: () => void;
}

const PatternStackedCard = ({ icon, title, subtitle, features, color, onClick }: PatternStackedCardProps) => {
  const colorClasses = {
    blue: {
      bg: 'from-blue-800 to-blue-600',
      hover: 'hover:border-blue-800 hover:bg-blue-50/50',
      text: 'group-hover:text-blue-800',
      check: 'text-blue-600',
      arrow: 'text-slate-400 group-hover:text-blue-800'
    },
    emerald: {
      bg: 'from-emerald-600 to-emerald-500',
      hover: 'hover:border-emerald-600 hover:bg-emerald-50/50',
      text: 'group-hover:text-emerald-600',
      check: 'text-emerald-600',
      arrow: 'text-slate-400 group-hover:text-emerald-600'
    },
    purple: {
      bg: 'from-purple-600 to-purple-500',
      hover: 'hover:border-purple-600 hover:bg-purple-50/50',
      text: 'group-hover:text-purple-600',
      check: 'text-purple-600',
      arrow: 'text-slate-400 group-hover:text-purple-600'
    }
  };

  const c = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={`w-full p-6 border-2 border-slate-200 rounded-xl text-left ${c.hover} transition-all group`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 bg-gradient-to-br ${c.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className={`text-lg font-bold text-slate-900 mb-2 ${c.text}`}>{title}</h4>
          <p className="text-slate-500 text-sm mb-3">{subtitle}</p>
          <div className="space-y-2">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <Check className={`w-4 h-4 ${c.check}`} />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <ArrowRight className={`w-5 h-5 ${c.arrow} transition-colors mt-1`} />
      </div>
    </button>
  );
};

interface PatternGridCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: 'blue' | 'emerald' | 'purple';
  onClick: () => void;
}

const PatternGridCard = ({ icon, title, subtitle, color, onClick }: PatternGridCardProps) => {
  const colorClasses = {
    blue: 'hover:border-blue-600 hover:bg-blue-50 text-blue-600',
    emerald: 'hover:border-emerald-600 hover:bg-emerald-50 text-emerald-600',
    purple: 'hover:border-purple-600 hover:bg-purple-50 text-purple-600'
  };

  return (
    <button
      onClick={onClick}
      className={`p-6 border-2 border-slate-200 rounded-xl text-center ${colorClasses[color]} transition-all group`}
    >
      <div className="mb-3">{icon}</div>
      <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </button>
  );
};

interface PatternMinimalCardProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}

const PatternMinimalCard = ({ icon, title, onClick }: PatternMinimalCardProps) => (
  <button
    onClick={onClick}
    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-left hover:border-blue-600 hover:bg-blue-50 transition-all flex items-center justify-between group"
  >
    <div className="flex items-center gap-3">
      <span className="text-slate-400 group-hover:text-blue-600">{icon}</span>
      <span className="font-medium text-slate-900">{title}</span>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
  </button>
);

interface PatternQuestionOptionProps {
  title: string;
  subtitle: string;
  onClick: () => void;
}

const PatternQuestionOption = ({ title, subtitle, onClick }: PatternQuestionOptionProps) => (
  <button
    onClick={onClick}
    className="w-full p-4 border-2 border-slate-200 rounded-xl text-left hover:border-blue-600 hover:bg-blue-50/50 transition-all group"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-slate-900 group-hover:text-blue-800">{title}</p>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
    </div>
  </button>
);

interface PatternTwoColumnOptionProps {
  icon: React.ReactNode;
  title: string;
  color: 'blue' | 'emerald' | 'purple';
  onClick: () => void;
}

const PatternTwoColumnOption = ({ icon, title, color, onClick }: PatternTwoColumnOptionProps) => {
  const colorClasses = {
    blue: 'hover:border-blue-600 hover:bg-blue-50 text-blue-600',
    emerald: 'hover:border-emerald-600 hover:bg-emerald-50 text-emerald-600',
    purple: 'hover:border-purple-600 hover:bg-purple-50 text-purple-600'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-left ${colorClasses[color]} transition-all flex items-center justify-between group`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-slate-900">{title}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </button>
  );
};

interface PatternRadioOptionProps {
  name: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}

const PatternRadioOption = ({ name, title, subtitle, onClick }: PatternRadioOptionProps) => (
  <label
    className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
    onClick={onClick}
  >
    <input type="radio" name={name} className="mt-1" />
    <div>
      <p className="font-medium text-slate-900">{title}</p>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  </label>
);

interface SourceCardProps {
  title: string;
  description: string;
  url: string;
}

const SourceCard = ({ title, description, url }: SourceCardProps) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="block p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
  >
    <h4 className="font-medium text-slate-900 group-hover:text-blue-700 mb-1">{title}</h4>
    <p className="text-sm text-slate-500">{description}</p>
    <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
      <ExternalLink className="w-3 h-3" />
      Voir la source
    </div>
  </a>
);

export default SimulationUXDemoPage;
