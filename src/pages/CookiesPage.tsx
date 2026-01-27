import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Cookie, Settings, Shield, BarChart, ArrowLeft, Info } from 'lucide-react';

const CookiesPage = () => {
  const lastUpdated = '2026-01-01';

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Politique de Cookies - MaSubventionPro</title>
        <meta name="description" content="Politique de cookies de MaSubventionPro - Comment nous utilisons les cookies et comment gérer vos préférences" />
        <link rel="canonical" href="https://masubventionpro.com/cookies" />
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
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Politique de Cookies</h1>
          <p className="text-slate-500">Dernière mise à jour : {lastUpdated}</p>
        </div>

        {/* Cookie Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-blue-600" />
            Préférences de cookies
          </h2>
          <p className="text-slate-600 mb-4">
            Gérez vos paramètres de cookies ci-dessous. Vous pouvez à tout moment modifier vos
            préférences.
          </p>

          {/* Essential Cookies - Always On */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="font-semibold text-slate-800">Cookies essentiels</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Requis</span>
              </div>
              <p className="text-sm text-slate-600">
                Nécessaires pour l'authentification, les préférences et la sécurité. Ne peuvent pas être désactivés.
              </p>
            </div>
            <div className="w-12 h-6 bg-green-500 rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>

          {/* Analytics Cookies */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <BarChart className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-slate-800">Suivi des erreurs (optionnel)</span>
              </div>
              <p className="text-sm text-slate-600">
                Nous aide à identifier et corriger les bugs. Toutes les données sont anonymisées.
              </p>
            </div>
            <div className="text-sm text-slate-500">
              Configurable via le bandeau cookies
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm">
              <Info className="h-4 w-4 inline mr-1" />
              Pour modifier vos préférences de cookies, utilisez le bandeau de consentement qui
              apparaît lors de votre première visite, ou effacez les cookies de votre navigateur
              pour voir à nouveau ce bandeau.
            </p>
          </div>
        </div>

        {/* What Are Cookies */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Cookie className="h-5 w-5 text-blue-600" />
            Qu'est-ce qu'un cookie ?
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Les cookies sont de petits fichiers texte stockés sur votre appareil lorsque vous
            visitez un site web. Nous utilisons une combinaison de cookies (pour l'authentification)
            et de stockage local du navigateur (localStorage) pour les préférences.
          </p>
          <p className="text-slate-600 leading-relaxed mt-4">
            <strong>Important :</strong> Nous n'utilisons aucun cookie marketing ou publicitaire.
            Nous ne suivons pas votre navigation sur d'autres sites.
          </p>
        </div>

        {/* Cookie Categories Detail */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Détail des cookies utilisés</h2>

          {/* Essential Cookies Details */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-green-500" />
              Cookies essentiels
            </h3>
            <p className="text-slate-600 mb-3">
              Ces cookies et le stockage local sont strictement nécessaires au fonctionnement du site.
              Ils ne peuvent pas être désactivés.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Nom</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Finalité</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Durée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-2 text-slate-700 font-mono text-xs">sb-*-auth-token</td>
                    <td className="px-4 py-2 text-slate-600">Authentification Supabase</td>
                    <td className="px-4 py-2 text-slate-600">Session</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-700 font-mono text-xs">sb-*-auth-token-code-verifier</td>
                    <td className="px-4 py-2 text-slate-600">Vérification de sécurité OAuth</td>
                    <td className="px-4 py-2 text-slate-600">Session</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-700 font-mono text-xs">theme (localStorage)</td>
                    <td className="px-4 py-2 text-slate-600">Préférence de thème (clair/sombre)</td>
                    <td className="px-4 py-2 text-slate-600">Persistant</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-700 font-mono text-xs">cookie_consent</td>
                    <td className="px-4 py-2 text-slate-600">Mémorisation de vos choix cookies</td>
                    <td className="px-4 py-2 text-slate-600">1 an</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Error Tracking Details */}
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <BarChart className="h-4 w-4 text-blue-500" />
              Suivi des erreurs (optionnel)
            </h3>
            <p className="text-slate-600 mb-3">
              Si vous acceptez, nous utilisons Sentry pour détecter et corriger les bugs.
              Ces données sont entièrement anonymisées.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 ml-4">
              <li>Détection d'erreurs et rapports de plantage (anonymisés)</li>
              <li>Surveillance des performances (taux d'échantillonnage de 10%)</li>
              <li>Tous les cookies, en-têtes et données personnelles sont supprimés avant envoi</li>
              <li>Aucune donnée marketing ou publicitaire collectée</li>
            </ul>
          </div>
        </div>

        {/* How to Control Cookies */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Comment contrôler les cookies</h2>
          <p className="text-slate-600 mb-4">
            Vous avez plusieurs options pour gérer et contrôler les cookies :
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600">
            <li>
              <strong>Bandeau de consentement :</strong> Lors de votre première visite, un bandeau
              vous permet de choisir les cookies optionnels
            </li>
            <li>
              <strong>Paramètres du navigateur :</strong> Vous pouvez configurer votre navigateur
              pour bloquer ou supprimer les cookies. Attention : cela peut affecter le fonctionnement
              du site.
            </li>
            <li>
              <strong>Suppression des cookies :</strong> Vous pouvez effacer tous les cookies à
              tout moment dans les paramètres de votre navigateur
            </li>
          </ul>

          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-600">
              <strong>Liens vers les paramètres des navigateurs :</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Chrome</a>
              <span className="text-slate-300">•</span>
              <a href="https://support.mozilla.org/fr/kb/activer-desactiver-cookies" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Firefox</a>
              <span className="text-slate-300">•</span>
              <a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Safari</a>
              <span className="text-slate-300">•</span>
              <a href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Edge</a>
            </div>
          </div>
        </div>

        {/* Changes to Policy */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Modifications de cette politique</h2>
          <p className="text-slate-600">
            Nous pouvons mettre à jour cette politique de cookies périodiquement. En cas de
            modification substantielle, nous vous en informerons par email ou par une notification
            sur le site. Nous vous encourageons à consulter régulièrement cette page.
          </p>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Nous contacter</h2>
          <p className="text-slate-600">
            Si vous avez des questions sur notre utilisation des cookies, veuillez nous contacter à{' '}
            <a href="mailto:contact@masubventionpro.com" className="text-blue-600 hover:underline">
              contact@masubventionpro.com
            </a>
          </p>
        </div>

        {/* Related Links */}
        <div className="flex flex-wrap gap-4">
          <Link to="/privacy" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Politique de confidentialité
          </Link>
          <Link to="/cgu" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Conditions d'utilisation
          </Link>
          <Link to="/mentions-legales" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Mentions légales
          </Link>
          <Link to="/ai-transparency" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            Transparence IA
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CookiesPage;
