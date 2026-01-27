import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Shield, Eye, Download, Trash2, Mail, FileText, Clock, ArrowLeft, Server, Users, Globe } from 'lucide-react';

const PrivacyPage = () => {
  const lastUpdated = '2026-01-01';

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Politique de Confidentialité - MaSubventionPro</title>
        <meta name="description" content="Politique de confidentialité de MaSubventionPro - Comment nous collectons, utilisons et protégeons vos données personnelles conformément au RGPD" />
        <link rel="canonical" href="https://masubventionpro.com/privacy" />
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
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Politique de Confidentialité</h1>
          <p className="text-slate-500">Dernière mise à jour : {lastUpdated}</p>
        </div>

        {/* Introduction */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-blue-600" />
            Introduction
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Cette politique de confidentialité explique comment MaSubventionPro (exploité par
            ECOEMIT SOLUTIONS) collecte, utilise et protège vos informations personnelles lorsque
            vous utilisez notre plateforme de découverte d'aides publiques.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Nous nous engageons à respecter le Règlement Général sur la Protection des Données (RGPD)
            et la loi Informatique et Libertés. La protection de vos données est au cœur de notre
            activité.
          </p>
        </div>

        {/* Data Controller */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-blue-600" />
            Responsable du traitement
          </h2>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-slate-700"><strong>ECOEMIT SOLUTIONS</strong></p>
            <p className="text-slate-600">SARL au capital de 2 000 €</p>
            <p className="text-slate-600">SIRET : 987 787 918 00018</p>
            <p className="text-slate-600">102 Quai Louis Bleriot, 75016 Paris, France</p>
            <p className="text-slate-600 mt-2">
              <strong>Délégué à la Protection des Données (DPO) :</strong>{' '}
              <a href="mailto:contact@masubventionpro.com" className="text-blue-600 hover:underline">
                contact@masubventionpro.com
              </a>
            </p>
          </div>
        </div>

        {/* Data We Collect */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-blue-600" />
            Données que nous collectons
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Informations personnelles</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                <li>Nom complet et informations de contact (lors de l'inscription)</li>
                <li>Adresse email pour les communications et l'authentification</li>
                <li>Numéro de téléphone (optionnel, pour le support)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Données d'entreprise</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                <li>Informations d'entreprise : SIREN, SIRET, code NAF, localisation, taille, secteur d'activité</li>
                <li>Données financières : chiffre d'affaires, effectifs (pour le matching des aides)</li>
                <li>Documents téléchargés : business plan, pitch deck, bilans (pour améliorer l'analyse IA)</li>
                <li>Historique des simulations et recherches sauvegardées</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Données techniques et d'utilisation</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                <li>Cookies de navigateur essentiels (authentification, préférences)</li>
                <li>Adresse IP et informations de connexion</li>
                <li>Modèles d'utilisation et interactions avec la plateforme</li>
                <li>Données de performance et diagnostic d'erreurs (anonymisées)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How We Use Data */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Comment nous utilisons vos données</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-600">
            <li><strong>Correspondance des aides :</strong> Analyse de votre profil d'entreprise et calcul des scores d'éligibilité avec notre base de 10 000+ dispositifs</li>
            <li><strong>Génération de rapports :</strong> Création de rapports PDF personnalisés avec les aides identifiées</li>
            <li><strong>Assistant IA :</strong> Réponse à vos questions sur les aides publiques en utilisant le contexte de votre profil</li>
            <li><strong>Alertes et notifications :</strong> Envoi d'emails concernant les nouvelles aides correspondant à votre profil</li>
            <li><strong>Amélioration du service :</strong> Analyse anonymisée pour améliorer nos algorithmes de matching</li>
            <li><strong>Obligations légales :</strong> Conservation des données nécessaires à la facturation et conformité fiscale</li>
          </ul>
        </div>

        {/* Legal Basis */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Base légale du traitement</h2>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-slate-800 mb-1">Exécution du contrat (Art. 6.1.b RGPD)</h3>
              <p className="text-sm text-slate-600">
                Traitement nécessaire pour vous fournir nos services : analyse de profil, matching,
                rapports, assistant IA.
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-slate-800 mb-1">Consentement (Art. 6.1.a RGPD)</h3>
              <p className="text-sm text-slate-600">
                Pour l'envoi d'emails marketing, les alertes sur les nouvelles aides, et l'utilisation
                de cookies non essentiels.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-slate-800 mb-1">Intérêt légitime (Art. 6.1.f RGPD)</h3>
              <p className="text-sm text-slate-600">
                Amélioration de nos services, sécurité de la plateforme, prévention de la fraude.
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-slate-800 mb-1">Obligation légale (Art. 6.1.c RGPD)</h3>
              <p className="text-sm text-slate-600">
                Conservation des factures et données comptables (obligation fiscale française).
              </p>
            </div>
          </div>
        </div>

        {/* Data Sharing */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-blue-600" />
            Partage et transfert de données
          </h2>

          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg mb-4">
            <p className="text-emerald-800 font-medium">
              🔒 Vos données ne sont JAMAIS vendues, louées ou cédées à des tiers à des fins commerciales.
            </p>
          </div>

          <p className="text-slate-600 mb-4">
            Nous partageons vos données uniquement avec les prestataires techniques nécessaires au fonctionnement du service :
          </p>

          <div className="space-y-3">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="font-medium text-slate-800">Supabase (hébergement base de données)</p>
              <p className="text-sm text-slate-600">
                <strong>Données hébergées en Union Européenne</strong> (région eu-central-1, Francfort, Allemagne).
                Supabase est certifié <strong>SOC 2 Type 2</strong> et conforme RGPD avec DPA et clauses
                contractuelles types (SCC) en place. Vos données utilisateur ne quittent jamais la région EU.
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="font-medium text-slate-800">Vercel (hébergement application)</p>
              <p className="text-sm text-slate-600">
                Certifié <strong>SOC 2 Type 2</strong> et <strong>ISO 27001:2022</strong>. Vercel est certifié
                sous le EU-US Data Privacy Framework (DPF). Les fonctions serverless sont configurées en région
                européenne. Certaines métadonnées (protection DDoS) peuvent transiter par les US conformément aux SCC.
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="font-medium text-slate-800">Stripe (paiements)</p>
              <p className="text-sm text-slate-600">Certifié PCI-DSS niveau 1. Données de paiement non stockées sur nos serveurs.</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="font-medium text-slate-800">Mistral AI (analyse IA)</p>
              <p className="text-sm text-slate-600">
                Service d'intelligence artificielle français utilisé pour l'analyse de votre profil d'entreprise
                et la génération de recommandations de subventions. Mistral AI est une entreprise française
                conforme au RGPD. <strong>Vos données ne servent PAS à entraîner leurs modèles</strong> (opt-out contractuel en place).
              </p>
            </div>
          </div>
        </div>

        {/* Data Retention */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-600" />
            Conservation des données
          </h2>
          <p className="text-slate-600 mb-4">
            Nous ne conservons vos données personnelles que le temps nécessaire aux finalités
            décrites dans cette politique :
          </p>
          <div className="grid gap-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-slate-800 mb-1">Comptes utilisateurs actifs</h3>
              <p className="text-sm text-slate-600">Conservés pendant la durée de l'abonnement + 3 ans après la dernière connexion</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-slate-800 mb-1">Simulations et rapports</h3>
              <p className="text-sm text-slate-600">Conservés pendant la durée de l'abonnement, supprimés 30 jours après la fermeture du compte</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-slate-800 mb-1">Documents uploadés</h3>
              <p className="text-sm text-slate-600">Supprimés 90 jours après leur traitement (ou sur demande)</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-slate-800 mb-1">Factures et données comptables</h3>
              <p className="text-sm text-slate-600">Conservées 10 ans (obligation fiscale française)</p>
            </div>
            <div className="border-l-4 border-gray-500 pl-4">
              <h3 className="font-semibold text-slate-800 mb-1">Logs techniques</h3>
              <p className="text-sm text-slate-600">Anonymisés après 12 mois</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-semibold text-slate-800 mb-1">Demandes de suppression</h3>
              <p className="text-sm text-slate-600">Exécutées sous 30 jours (délai de grâce pour récupération)</p>
            </div>
          </div>
        </div>

        {/* Your Rights */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Vos droits (RGPD)</h2>
          <p className="text-slate-600 mb-4">
            Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-800">Droit d'accès</h3>
                <p className="text-sm text-slate-600">Demander une copie de toutes les données personnelles que nous détenons sur vous</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-800">Portabilité des données</h3>
                <p className="text-sm text-slate-600">Télécharger vos données dans un format structuré et lisible par machine</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-800">Droit de rectification</h3>
                <p className="text-sm text-slate-600">Demander la correction de données personnelles inexactes ou incomplètes</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-800">Droit à l'effacement</h3>
                <p className="text-sm text-slate-600">Demander la suppression de vos données personnelles ("droit à l'oubli")</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Pour exercer vos droits :</strong> Envoyez un email à{' '}
              <a href="mailto:contact@masubventionpro.com" className="underline">contact@masubventionpro.com</a>{' '}
              avec une copie de votre pièce d'identité. Nous répondrons dans un délai de 30 jours.
            </p>
          </div>

          <p className="text-slate-600 text-sm mt-4">
            En cas de désaccord, vous pouvez introduire une réclamation auprès de la CNIL :{' '}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              www.cnil.fr
            </a>
          </p>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-blue-600" />
            Mesures de sécurité
          </h2>
          <p className="text-slate-600 mb-4">
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
            protéger vos données :
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
            <li>Chiffrement TLS 1.3 pour toutes les communications (HTTPS)</li>
            <li>Chiffrement AES-256 des données au repos</li>
            <li>Authentification sécurisée avec mots de passe hashés (bcrypt)</li>
            <li>Accès restreint aux données sur la base du besoin d'en connaître</li>
            <li>Audits de sécurité réguliers et tests de pénétration</li>
            <li>Plan de réponse aux incidents de sécurité</li>
          </ul>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-blue-600" />
            Contact
          </h2>
          <p className="text-slate-600 mb-4">
            Pour toute question relative à la confidentialité ou pour exercer vos droits, contactez notre Délégué à la Protection des Données :
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-slate-700">
              <strong>DPO :</strong>{' '}
              <a href="mailto:contact@masubventionpro.com" className="text-blue-600 hover:underline">
                contact@masubventionpro.com
              </a>
            </p>
            <p className="text-slate-700">
              <strong>Contact général :</strong>{' '}
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
          <Link to="/mentions-legales" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Mentions légales
          </Link>
          <Link to="/cgu" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Conditions d'utilisation
          </Link>
          <Link to="/cgv" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            CGV
          </Link>
          <Link to="/cookies" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Politique de cookies
          </Link>
          <Link to="/ai-transparency" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Transparence IA
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
