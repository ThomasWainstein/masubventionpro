import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Bot,
  Brain,
  Database,
  Shield,
  AlertTriangle,
  UserCheck,
  Scale,
  Mail,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Info,
  FileText,
  Activity,
  Eye,
  MessageSquare,
} from 'lucide-react';

const AITransparencyPage = () => {
  const lastUpdated = '2026-01-01';

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Transparence IA - MaSubventionPro</title>
        <meta
          name="description"
          content="Transparence de l'Intelligence Artificielle de MaSubventionPro - Conformité au Règlement européen sur l'IA (EU AI Act)"
        />
        <link rel="canonical" href="https://masubventionpro.com/ai-transparency" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Transparence de l'Intelligence Artificielle</h1>
          <p className="text-slate-500">Dernière mise à jour : {lastUpdated}</p>
        </div>

        {/* EU AI Act Compliance Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-start gap-4">
            <Scale className="h-8 w-8 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-semibold mb-2">Conformité au Règlement européen sur l'IA</h2>
              <p className="text-blue-100 text-sm">
                Cette page répond aux exigences de transparence du <strong>Règlement (UE) 2024/1689</strong> (AI Act),
                notamment l'Article 52 sur les obligations de transparence. Nous nous engageons à vous informer
                clairement sur le fonctionnement, les limites et vos droits concernant notre système d'IA.
              </p>
            </div>
          </div>
        </div>

        {/* Risk Classification */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-green-600" />
            Classification du risque
          </h2>

          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">Système IA à risque limité</span>
            </div>
            <p className="text-green-700 text-sm">
              Conformément à l'Annexe III du Règlement UE 2024/1689, notre système d'IA n'est <strong>pas classé
              comme système à haut risque</strong>.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800">Justification de cette classification :</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-sm text-slate-600">
                  <strong>Système consultatif :</strong> Nos recommandations sont informatives et n'ont aucun
                  caractère contraignant sur l'obtention des aides
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-sm text-slate-600">
                  <strong>Décision humaine préservée :</strong> L'utilisateur reste maître de ses décisions
                  et doit vérifier l'éligibilité auprès des organismes financeurs
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-sm text-slate-600">
                  <strong>Pas d'évaluation de crédit :</strong> Nous n'évaluons pas la solvabilité et n'influençons
                  pas les décisions d'octroi de financement
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-sm text-slate-600">
                  <strong>Pas de scoring social :</strong> Nous ne notons pas les individus ni ne discriminons
                  sur des critères personnels
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* System Overview */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Bot className="h-5 w-5 text-blue-600" />
            Vue d'ensemble du système
          </h2>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-500 mb-1">Nom du système</p>
                <p className="font-semibold text-slate-900">MaSubventionPro AI Matcher</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-500 mb-1">Fournisseur</p>
                <p className="font-semibold text-slate-900">ECOEMIT SOLUTIONS (SARL)</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-500 mb-1">Modèle IA utilisé</p>
                <p className="font-semibold text-slate-900">Mistral AI (LLM)</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-500 mb-1">Finalité</p>
                <p className="font-semibold text-slate-900">Aide à la découverte de subventions</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Objectif du système</h3>
              <p className="text-slate-600 text-sm">
                Notre système d'IA a pour objectif d'aider les entreprises françaises et européennes à identifier
                les aides publiques (subventions, prêts, crédits d'impôt) auxquelles elles pourraient être éligibles,
                parmi une base de plus de 10 000 dispositifs référencés.
              </p>
            </div>
          </div>
        </div>

        {/* How AI Works */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-purple-600" />
            Fonctionnement technique
          </h2>

          <div className="space-y-4">
            <p className="text-slate-600">
              Notre système utilise plusieurs composants d'intelligence artificielle pour analyser votre profil
              et générer des recommandations :
            </p>

            <div className="space-y-3">
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold text-slate-800 mb-1">1. Analyse de profil</h3>
                <p className="text-sm text-slate-600">
                  L'IA analyse les données de votre entreprise (SIREN, secteur NAF, région, effectifs, CA)
                  pour créer un profil d'éligibilité.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-slate-800 mb-1">2. Matching multi-facteurs</h3>
                <p className="text-sm text-slate-600">
                  Un algorithme hybride (règles + LLM) compare votre profil aux critères de chaque aide
                  avec une pondération : Région (30%), Secteur (25%), Type de projet (20%),
                  Intelligence web (15%), Timing (10%).
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-slate-800 mb-1">3. Scoring de probabilité</h3>
                <p className="text-sm text-slate-600">
                  L'IA génère un score de correspondance (0-100%) et une estimation de probabilité de succès
                  basée sur la densité concurrentielle et l'historique du dispositif.
                </p>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold text-slate-800 mb-1">4. Assistant conversationnel</h3>
                <p className="text-sm text-slate-600">
                  Un chatbot alimenté par Mistral AI répond à vos questions sur les aides,
                  en utilisant le contexte de votre profil et notre base de connaissances.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Used */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-blue-600" />
            Données utilisées par l'IA
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Données d'entrée (input)</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 ml-4">
                <li>Identifiants entreprise : SIREN, SIRET, nom commercial</li>
                <li>Caractéristiques : secteur NAF, région, département, effectifs, CA</li>
                <li>Type de projets envisagés (R&D, export, recrutement, etc.)</li>
                <li>Documents uploadés (optionnel) : business plan, pitch deck</li>
                <li>Historique de conversation avec l'assistant</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Données de référence</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 ml-4">
                <li>Base de données subvention360 : 10 000+ aides françaises et européennes</li>
                <li>Critères d'éligibilité officiels des dispositifs</li>
                <li>Données INSEE pour validation des entreprises</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Données de sortie (output)</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 ml-4">
                <li>Liste d'aides recommandées avec scores de correspondance</li>
                <li>Probabilités de succès estimées</li>
                <li>Explications textuelles des raisons du matching</li>
                <li>Réponses conversationnelles</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-blue-800 text-sm">
                <Info className="h-4 w-4 inline mr-1" />
                <strong>Protection des données :</strong> Vos données ne sont pas utilisées pour entraîner
                le modèle d'IA (opt-out contractuel). Consultez notre{' '}
                <Link to="/privacy" className="underline">politique de confidentialité</Link> pour plus de détails.
              </p>
            </div>
          </div>
        </div>

        {/* Limitations */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Limites et biais connus
          </h2>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 text-sm font-medium">
              Il est essentiel de comprendre les limites de notre système d'IA pour l'utiliser de manière éclairée.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Limites techniques</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-600">
                    <strong>Exactitude non garantie :</strong> Les scores de correspondance sont des estimations
                    et peuvent différer de l'éligibilité réelle
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-600">
                    <strong>Données potentiellement obsolètes :</strong> Les critères des aides changent
                    régulièrement et notre base peut ne pas être à jour
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-600">
                    <strong>Hallucinations possibles :</strong> Le LLM peut parfois générer des informations
                    incorrectes ou inventées
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-600">
                    <strong>Couverture géographique :</strong> Meilleure couverture en France métropolitaine
                    qu'en outre-mer ou dans d'autres pays européens
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Biais potentiels identifiés</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-600">
                    <strong>Biais sectoriel :</strong> Certains secteurs (tech, industrie) peuvent avoir
                    une meilleure couverture que d'autres (agriculture, artisanat)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-600">
                    <strong>Biais de taille :</strong> Les PME/ETI sont mieux représentées que les TPE
                    ou les grandes entreprises
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-600">
                    <strong>Biais temporel :</strong> Les aides récemment ajoutées peuvent être moins
                    bien caractérisées
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Ce que l'IA ne peut pas faire</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-600">Garantir l'obtention d'une subvention</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-600">Remplacer l'avis d'un expert-comptable ou conseiller en financement</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-600">Déposer des dossiers de demande en votre nom</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  <span className="text-sm text-slate-600">Prédire avec certitude les décisions des organismes financeurs</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Human Oversight */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <UserCheck className="h-5 w-5 text-green-600" />
            Contrôle humain et supervision
          </h2>

          <div className="space-y-4">
            <p className="text-slate-600">
              Conformément à l'Article 14 du Règlement UE 2024/1689, notre système est conçu pour
              permettre un contrôle humain effectif :
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Supervision interne
                </h3>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>• Monitoring des performances IA</li>
                  <li>• Revue régulière des recommandations</li>
                  <li>• Analyse des retours utilisateurs</li>
                  <li>• Tests de qualité trimestriels</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Contrôle utilisateur
                </h3>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• Possibilité de recherche manuelle sans IA</li>
                  <li>• Signalement de recommandations incorrectes</li>
                  <li>• Demande de vérification humaine</li>
                  <li>• Désactivation des suggestions IA</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Procédure de demande de vérification humaine</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 ml-4">
                <li>Identifiez la recommandation que vous souhaitez faire vérifier</li>
                <li>Contactez notre support à <a href="mailto:support@masubventionpro.com" className="text-blue-600 hover:underline">support@masubventionpro.com</a></li>
                <li>Précisez le nom de l'aide et votre question</li>
                <li>Notre équipe vous répondra sous 48h ouvrées</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Your Rights */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Scale className="h-5 w-5 text-blue-600" />
            Vos droits au titre du Règlement IA
          </h2>

          <p className="text-slate-600 mb-4">
            En tant qu'utilisateur d'un système d'IA, vous bénéficiez des droits suivants :
          </p>

          <div className="grid gap-4">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Droit à l'information</h3>
                <p className="text-sm text-slate-600">
                  Être informé que vous interagissez avec un système d'IA et comprendre son fonctionnement
                  (cette page répond à ce droit)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Droit à l'explication</h3>
                <p className="text-sm text-slate-600">
                  Demander des explications sur les recommandations générées par l'IA et comprendre
                  pourquoi certaines aides vous sont proposées
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Droit au contrôle humain</h3>
                <p className="text-sm text-slate-600">
                  Demander qu'une recommandation soit vérifiée par un expert humain avant de prendre
                  une décision importante
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Droit de contestation</h3>
                <p className="text-sm text-slate-600">
                  Signaler une recommandation incorrecte, trompeuse ou potentiellement discriminatoire
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Droit de non-utilisation</h3>
                <p className="text-sm text-slate-600">
                  Choisir de ne pas utiliser les fonctionnalités IA et d'effectuer vos recherches
                  manuellement via notre moteur de recherche
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Monitoring */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-blue-600" />
            Surveillance des performances
          </h2>

          <p className="text-slate-600 mb-4">
            Nous surveillons en continu les performances de notre système d'IA pour garantir
            sa fiabilité et son amélioration :
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">Quotidien</p>
              <p className="text-sm text-slate-600">Monitoring des erreurs et disponibilité</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">Mensuel</p>
              <p className="text-sm text-slate-600">Analyse des retours utilisateurs</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">Trimestriel</p>
              <p className="text-sm text-slate-600">Audit de qualité des recommandations</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-blue-600" />
            Contact pour questions IA
          </h2>

          <p className="text-slate-600 mb-4">
            Pour toute question concernant notre système d'intelligence artificielle, vous pouvez nous contacter :
          </p>

          <div className="space-y-2 text-sm">
            <p className="text-slate-700">
              <strong>Support technique IA :</strong>{' '}
              <a href="mailto:support@masubventionpro.com" className="text-blue-600 hover:underline">
                support@masubventionpro.com
              </a>
            </p>
            <p className="text-slate-700">
              <strong>Protection des données (DPO) :</strong>{' '}
              <a href="mailto:contact@masubventionpro.com" className="text-blue-600 hover:underline">
                contact@masubventionpro.com
              </a>
            </p>
            <p className="text-slate-700">
              <strong>Adresse :</strong> ECOEMIT SOLUTIONS, 102 Quai Louis Bleriot, 75016 Paris, France
            </p>
          </div>
        </div>

        {/* Related Links */}
        <div className="flex flex-wrap gap-4">
          <Link to="/cgu" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Conditions d'utilisation
          </Link>
          <Link to="/privacy" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Politique de confidentialité
          </Link>
          <Link to="/mentions-legales" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Mentions légales
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AITransparencyPage;
