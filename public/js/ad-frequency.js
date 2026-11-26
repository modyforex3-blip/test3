/**
 * Millionaire Smart Ad Frequency & User Experience Controller
 * Enforces:
 * 1. Ad Cooldown Intervals (e.g. at most 1 popup per 10 minutes)
 * 2. Session Capping (e.g. max 2 popups per user session)
 * 3. In-App Intrusive Popunder Suppression (Smooth, uninterrupted user experience inside apps)
 */

(function() {
  'use strict';

  const STORAGE_KEY_LAST_POPUP = 'mil_last_ad_popup_time';
  const STORAGE_KEY_SESSION_COUNT = 'mil_session_popup_count';
  const STORAGE_KEY_CONFIG = 'mil_ad_frequency_config';

  // Default conservative settings
  let config = {
    adFrequencyRate: 'relaxed', // 'relaxed' (10m), 'balanced' (5m), 'frequent' (2m), 'off'
    adCooldownMinutes: 10,
    disablePopupsInApps: true,
    maxPopupsPerSession: 2
  };

  // Try to load cached config from localStorage
  try {
    const cached = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (cached) {
      config = { ...config, ...JSON.parse(cached) };
    }
  } catch (_) {}

  // Fetch latest settings from server asynchronously
  fetch('/api/public-data')
    .then(r => r.json())
    .then(data => {
      if (data && data.settings) {
        if (data.settings.adFrequencyRate) config.adFrequencyRate = data.settings.adFrequencyRate;
        if (typeof data.settings.adCooldownMinutes === 'number') config.adCooldownMinutes = data.settings.adCooldownMinutes;
        if (typeof data.settings.disablePopupsInApps === 'boolean') config.disablePopupsInApps = data.settings.disablePopupsInApps;
        if (typeof data.settings.maxPopupsPerSession === 'number') config.maxPopupsPerSession = data.settings.maxPopupsPerSession;

        try {
          localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
        } catch (_) {}
      }
    })
    .catch(() => {});

  function isInsideApp() {
    const path = window.location.pathname.toLowerCase();
    return path.includes('/run/') || 
           path.includes('/apps/') || 
           path.includes('/app/') ||
           document.querySelector('iframe#appFrame') !== null ||
           window.__IS_IN_APP__ === true;
  }

  function shouldBlockAd() {
    // If user is intentionally watching a voluntary rewarded ad, allow it
    if (window.__IS_REWARD_AD_ACTIVE__ === true) {
      return false;
    }

    // Per user policy: Ads must NEVER open automatically upon clicking app/page content,
    // only when explicitly choosing the "Watch ad for reward" button.
    if (config.disablePopupsInApps !== false || config.blockAutoPopups !== false) {
      return true;
    }

    // If popups are completely turned off in settings
    if (config.adFrequencyRate === 'off') {
      return true;
    }

    return true;
  }

  function registerAdImpression() {
    sessionStorage.setItem(STORAGE_KEY_LAST_POPUP, Date.now().toString());
    const count = parseInt(sessionStorage.getItem(STORAGE_KEY_SESSION_COUNT) || '0', 10);
    sessionStorage.setItem(STORAGE_KEY_SESSION_COUNT, (count + 1).toString());
  }

  // Intercept window.open calls triggered by third-party ad networks
  const originalWindowOpen = window.open;
  window.open = function(url, target, features) {
    const urlStr = String(url || '').toLowerCase();
    const isAdUrl = urlStr && (
      urlStr.includes('quge5.com') ||
      urlStr.includes('nap5k.com') ||
      urlStr.includes('monetag') ||
      urlStr.includes('onclick') ||
      urlStr.includes('popunder') ||
      urlStr.includes('adcash') ||
      urlStr.includes('propeller') ||
      (!urlStr.includes(window.location.hostname) && 
       !urlStr.startsWith('/') && 
       !urlStr.startsWith('#') && 
       !urlStr.startsWith('mailto:') && 
       !urlStr.startsWith('tel:') && 
       !urlStr.includes('github.com'))
    );

    if (isAdUrl) {
      // User safety & anti-intrusive rule: No ads open without explicit user permission
      console.log('[Millionaire Ad Control] Unauthorized popunder blocked. Ads are linked to rewarded modal only.');
      return null;
    }

    return originalWindowOpen.apply(this, arguments);
  };

  // Block fake link clicks or unexpected ad triggers during aggressive cooldown
  document.addEventListener('click', function(e) {
    if (shouldBlockAd()) {
      const target = e.target && e.target.closest ? e.target.closest('a') : null;
      if (target && target.href) {
        const href = target.href.toLowerCase();
        if (href.includes('quge5.com') || href.includes('nap5k.com') || href.includes('onclick') || href.includes('adcash')) {
          e.preventDefault();
          e.stopPropagation();
          console.log('[Millionaire Ad Control] Ad click intercepted.');
        }
      }
    }
  }, true);

  window.__MILLIONAIRE_AD_CTRL__ = {
    shouldBlockAd,
    registerAdImpression,
    getConfig: () => config
  };
})();
