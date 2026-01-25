import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Settings, X, Check, Shield } from 'lucide-react';
import { useCookieConsent, type CookiePreferences } from '@/hooks/useCookieConsent';

/**
 * GDPR/ePrivacy compliant cookie consent banner
 * - Shows before any non-essential cookies are set
 * - "Reject All" is equally prominent as "Accept All"
 * - Granular preference controls available
 */
export function CookieConsent() {
  const {
    showBanner,
    preferences,
    acceptAll,
    rejectAll,
    savePreferences,
    isPreferencesOpen,
    openPreferences,
    closePreferences,
  } = useCookieConsent();

  const [tempPrefs, setTempPrefs] = useState<CookiePreferences>(preferences);

  // Update temp prefs when opening modal
  const handleOpenPreferences = () => {
    setTempPrefs(preferences);
    openPreferences();
  };

  const handleSavePreferences = () => {
    savePreferences(tempPrefs);
  };

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return; // Cannot toggle necessary
    setTempPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!showBanner && !isPreferencesOpen) {
    return null;
  }

  return (
    <>
      {/* Main Banner */}
      {showBanner && !isPreferencesOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-slate-200 shadow-lg">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              {/* Icon & Text */}
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                  <Cookie className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    Nous respectons votre vie privée
                  </h3>
                  <p className="text-sm text-slate-600">
                    Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez accepter
                    tous les cookies, les refuser (sauf les cookies essentiels), ou personnaliser vos
                    preferences.{' '}
                    <Link to="/cookies" className="text-blue-600 hover:underline">
                      En savoir plus
                    </Link>
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  onClick={handleOpenPreferences}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Personnaliser
                </button>
                <button
                  onClick={rejectAll}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Tout refuser
                </button>
                <button
                  onClick={acceptAll}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Tout accepter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {isPreferencesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Paramètres des cookies</h2>
                  <p className="text-sm text-slate-500">Gérez vos preferences</p>
                </div>
              </div>
              <button
                onClick={closePreferences}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cookie Categories */}
            <div className="p-6 space-y-4">
              {/* Necessary */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-900">Cookies essentiels</h3>
                  <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
                    Toujours actifs
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Ces cookies sont nécessaires au fonctionnement du site. Ils permettent
                  l'authentification, la sécurité et la mémorisation de vos preferences de consentement.
                </p>
              </div>

              {/* Analytics */}
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-900">Cookies analytiques</h3>
                  <button
                    onClick={() => togglePreference('analytics')}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      tempPrefs.analytics ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        tempPrefs.analytics ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                <p className="text-sm text-slate-600">
                  Ces cookies nous permettent de mesurer l'audience du site et d'améliorer nos services.
                  Aucune donnée personnelle n'est partagée avec des tiers.
                </p>
              </div>

              {/* Marketing */}
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-900">Cookies marketing</h3>
                  <button
                    onClick={() => togglePreference('marketing')}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      tempPrefs.marketing ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        tempPrefs.marketing ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                <p className="text-sm text-slate-600">
                  Ces cookies permettent d'afficher des publicités pertinentes et de mesurer l'efficacité
                  de nos campagnes.
                </p>
              </div>

              {/* Preferences */}
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-900">Cookies de preferences</h3>
                  <button
                    onClick={() => togglePreference('preferences')}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      tempPrefs.preferences ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        tempPrefs.preferences ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                <p className="text-sm text-slate-600">
                  Ces cookies mémorisent vos preferences (langue, thème) pour améliorer votre expérience
                  sur nos futures visites.
                </p>
              </div>

              {/* Link to full policy */}
              <p className="text-sm text-slate-500 text-center">
                Pour plus d'informations, consultez notre{' '}
                <Link to="/cookies" className="text-blue-600 hover:underline" onClick={closePreferences}>
                  politique de cookies
                </Link>
                .
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={rejectAll}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Tout refuser
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleSavePreferences}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Enregistrer mes choix
                </button>
                <button
                  onClick={acceptAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Tout accepter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Small button to reopen cookie preferences (for footer)
 */
export function CookiePreferencesButton() {
  const { openPreferences } = useCookieConsent();

  return (
    <button
      onClick={openPreferences}
      className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
    >
      Gérer les cookies
    </button>
  );
}

export default CookieConsent;
