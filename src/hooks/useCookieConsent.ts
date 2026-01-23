import { useState, useEffect, useCallback } from 'react';

/**
 * Cookie consent categories as per ePrivacy Directive
 */
export interface CookiePreferences {
  necessary: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export interface CookieConsentState {
  hasConsented: boolean;
  consentDate: string | null;
  preferences: CookiePreferences;
}

const CONSENT_STORAGE_KEY = 'masubventionpro_cookie_consent';
const CONSENT_VERSION = '1.0'; // Increment when cookie policy changes

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

/**
 * Get stored consent from localStorage
 */
function getStoredConsent(): CookieConsentState | null {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Check if consent version matches
    if (parsed.version !== CONSENT_VERSION) {
      return null; // Re-consent required on policy change
    }

    return {
      hasConsented: true,
      consentDate: parsed.consentDate,
      preferences: parsed.preferences,
    };
  } catch {
    return null;
  }
}

/**
 * Store consent in localStorage
 */
function storeConsent(preferences: CookiePreferences): void {
  const consent = {
    version: CONSENT_VERSION,
    consentDate: new Date().toISOString(),
    preferences,
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
}

/**
 * Clear non-consented cookies
 */
function clearNonConsentedCookies(preferences: CookiePreferences): void {
  // Get all cookies
  const cookies = document.cookie.split(';');

  // Define cookie categories (customize based on your actual cookies)
  const analyticsCookies = ['_ga', '_gid', '_gat', 'plausible'];
  const marketingCookies = ['_fbp', '_gcl'];
  const preferenceCookies = ['theme', 'language'];

  cookies.forEach(cookie => {
    const cookieName = cookie.split('=')[0].trim();

    // Clear analytics cookies if not consented
    if (!preferences.analytics && analyticsCookies.some(ac => cookieName.startsWith(ac))) {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }

    // Clear marketing cookies if not consented
    if (!preferences.marketing && marketingCookies.some(mc => cookieName.startsWith(mc))) {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }

    // Clear preference cookies if not consented
    if (!preferences.preferences && preferenceCookies.some(pc => cookieName === pc)) {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

interface UseCookieConsentReturn {
  showBanner: boolean;
  preferences: CookiePreferences;
  hasConsented: boolean;
  consentDate: string | null;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (prefs: CookiePreferences) => void;
  openPreferences: () => void;
  isPreferencesOpen: boolean;
  closePreferences: () => void;
}

export function useCookieConsent(): UseCookieConsentReturn {
  const [state, setState] = useState<CookieConsentState>(() => {
    const stored = getStoredConsent();
    return stored || {
      hasConsented: false,
      consentDate: null,
      preferences: DEFAULT_PREFERENCES,
    };
  });
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Check consent on mount
  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setState(stored);
      // Apply stored preferences
      clearNonConsentedCookies(stored.preferences);
    }
  }, []);

  const acceptAll = useCallback(() => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    storeConsent(allAccepted);
    setState({
      hasConsented: true,
      consentDate: new Date().toISOString(),
      preferences: allAccepted,
    });
    setIsPreferencesOpen(false);
  }, []);

  const rejectAll = useCallback(() => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    storeConsent(onlyNecessary);
    clearNonConsentedCookies(onlyNecessary);
    setState({
      hasConsented: true,
      consentDate: new Date().toISOString(),
      preferences: onlyNecessary,
    });
    setIsPreferencesOpen(false);
  }, []);

  const savePreferences = useCallback((prefs: CookiePreferences) => {
    // Ensure necessary is always true
    const finalPrefs = { ...prefs, necessary: true };
    storeConsent(finalPrefs);
    clearNonConsentedCookies(finalPrefs);
    setState({
      hasConsented: true,
      consentDate: new Date().toISOString(),
      preferences: finalPrefs,
    });
    setIsPreferencesOpen(false);
  }, []);

  const openPreferences = useCallback(() => {
    setIsPreferencesOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    setIsPreferencesOpen(false);
  }, []);

  return {
    showBanner: !state.hasConsented,
    preferences: state.preferences,
    hasConsented: state.hasConsented,
    consentDate: state.consentDate,
    acceptAll,
    rejectAll,
    savePreferences,
    openPreferences,
    isPreferencesOpen,
    closePreferences,
  };
}

export default useCookieConsent;
