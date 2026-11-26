/**
 * Millionaire Smart Ad Frequency & User Experience Controller
 * - Blocks unprompted popunders without breaking legitimate app actions
 * - Catches nested or top-level floating Monetag In-Page Push ads (even inside wrapper divs)
 *   and confines them strictly inside Top/Bottom Banners or the active Reward Modal
 */

(function() {
  'use strict';

  const STORAGE_KEY_LAST_POPUP = 'mil_last_ad_popup_time';
  const STORAGE_KEY_SESSION_COUNT = 'mil_session_popup_count';
  const STORAGE_KEY_CONFIG = 'mil_ad_frequency_config';

  let config = {
    adFrequencyRate: 'relaxed',
    adCooldownMinutes: 10,
    disablePopupsInApps: true,
    maxPopupsPerSession: 2
  };

  try {
    const cached = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (cached) {
      config = { ...config, ...JSON.parse(cached) };
    }
  } catch (_) {}

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

  function shouldBlockAd() {
    if (window.__IS_REWARD_AD_ACTIVE__ === true) {
      return false;
    }
    if (config.disablePopupsInApps !== false || config.blockAutoPopups !== false) {
      return true;
    }
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

  // Intercept ONLY unauthorized third-party ad network popunders; allow all legitimate app actions
  const originalWindowOpen = window.open;
  window.open = function(url, target, features) {
    if (window.__ALLOW_USER_INTENT_OPEN__) {
      return originalWindowOpen.apply(this, arguments);
    }

    const urlStr = String(url || '').toLowerCase();
    const isAdNetworkUrl = urlStr && (
      urlStr.includes('quge5.com') ||
      urlStr.includes('nap5k.com') ||
      urlStr.includes('3nbf4.com') ||
      urlStr.includes('monetag') ||
      urlStr.includes('onclick') ||
      urlStr.includes('popunder') ||
      urlStr.includes('adcash') ||
      urlStr.includes('propeller')
    );

    if (isAdNetworkUrl) {
      console.log('[Millionaire Ad Control] Unauthorized ad popunder blocked:', url);
      return null;
    }

    return originalWindowOpen.apply(this, arguments);
  };

  // Block hidden ad link clicks when not watching reward ad
  document.addEventListener('click', function(e) {
    if (shouldBlockAd()) {
      const target = e.target && e.target.closest ? e.target.closest('a') : null;
      if (target && target.href) {
        const href = target.href.toLowerCase();
        if (href.includes('quge5.com') || href.includes('nap5k.com') || href.includes('3nbf4.com') || href.includes('onclick') || href.includes('adcash')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }
  }, true);

  // --- Neutralize Floating Monetag In-Page Push Ads & Confine to Banners / Reward Modal ---
  const PROTECTED_IDS = new Set([
    'root',
    'rewardAdModal',
    'monetagRewardedModal',
    'mobileMenu',
    'floatingRewardContainer',
    'floatingRewardBtn',
    'topAdContainer',
    'bottomAdContainer',
    'inAppTopBanner',
    'inAppBottomBanner',
    'runnerInAppTopAd',
    'runnerInAppBottomAd',
    'runnerContainer',
    'monetagZoneSlot',
    'rewardAdPlacement'
  ]);

  let neutralizedCount = 0;

  function isProtectedElement(el) {
    if (!el || el.nodeType !== 1) return true;
    const tag = el.tagName;
    if (tag === 'HEAD' || tag === 'BODY' || tag === 'HTML' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META' || tag === 'HEADER' || tag === 'MAIN' || tag === 'FOOTER') {
      return true;
    }
    if (el.id && PROTECTED_IDS.has(el.id)) return true;
    if (el.dataset && el.dataset.neutralizedAd === 'true') return true;
    if (
      el.closest('#root') ||
      el.closest('#rewardAdModal') ||
      el.closest('#monetagRewardedModal') ||
      el.closest('#topAdContainer') ||
      el.closest('#bottomAdContainer') ||
      el.closest('#inAppTopBanner') ||
      el.closest('#inAppBottomBanner') ||
      el.closest('#runnerInAppTopAd') ||
      el.closest('#runnerInAppBottomAd') ||
      el.closest('#floatingRewardContainer') ||
      el.closest('#mobileMenu') ||
      el.closest('#rewardAdPlacement') ||
      el.closest('header') ||
      el.closest('main') ||
      el.closest('footer')
    ) {
      return true;
    }
    if (el.classList.contains('reward-modal-backdrop') || el.classList.contains('modal-overlay')) {
      return true;
    }
    return false;
  }

  function hasFixedDescendant(el) {
    if (!el || !el.querySelectorAll) return false;
    const descendants = el.querySelectorAll('div, aside, section, iframe');
    for (let i = 0; i < descendants.length; i++) {
      const d = descendants[i];
      try {
        const cs = window.getComputedStyle(d);
        const z = parseInt(d.style.zIndex || cs.zIndex || '0', 10) || 0;
        if ((d.style.position === 'fixed' || cs.position === 'fixed') && z >= 100) {
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  function neutralizeAdElement(el) {
    if (isProtectedElement(el)) return;

    const s = el.style;
    let computed = null;
    try {
      computed = window.getComputedStyle ? window.getComputedStyle(el) : null;
    } catch (_) {}

    const pos = s.position || (computed ? computed.position : '');
    const zIndex = parseInt(s.zIndex || (computed ? computed.zIndex : '0'), 10) || 0;
    const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
    const id = (el.id || '').toLowerCase();

    const isFloatingAd = (pos === 'fixed' || (pos === 'absolute' && zIndex >= 999)) && zIndex >= 100;
    const isMonetagNode = (
      id.includes('monetag') ||
      id.includes('zone_') ||
      cls.includes('monetag') ||
      cls.includes('zone-') ||
      cls.includes('ipp-') ||
      cls.includes('in-page-push') ||
      (el.tagName === 'IFRAME' && el.src && (el.src.includes('quge5.com') || el.src.includes('nap5k.com') || el.src.includes('3nbf4.com')))
    );

    if (!isFloatingAd && !isMonetagNode && !hasFixedDescendant(el)) return;

    // If Reward Modal is currently open, route new Monetag ads straight into #rewardAdPlacement!
    const rewardModal = document.getElementById('rewardAdModal');
    const isRewardOpen = rewardModal && !rewardModal.classList.contains('hidden');
    let targetContainer = null;

    if (isRewardOpen) {
      targetContainer = document.getElementById('rewardAdPlacement');
    } else {
      const topContainer = document.getElementById('topAdContainer') ||
                           document.getElementById('inAppTopBanner') ||
                           document.getElementById('runnerInAppTopAd');
      const bottomContainer = document.getElementById('bottomAdContainer') ||
                              document.getElementById('inAppBottomBanner') ||
                              document.getElementById('runnerInAppBottomAd');

      targetContainer = topContainer;
      if (neutralizedCount % 2 === 1 && bottomContainer) {
        targetContainer = bottomContainer;
      }
      if (!targetContainer) {
        targetContainer = document.getElementById('monetagZoneSlot') || document.getElementById('rewardAdPlacement');
      }
    }

    if (targetContainer) {
      neutralizedCount++;
      el.dataset.neutralizedAd = 'true';

      const resetFixed = (node) => {
        node.style.setProperty('position', 'relative', 'important');
        node.style.setProperty('top', 'auto', 'important');
        node.style.setProperty('left', 'auto', 'important');
        node.style.setProperty('right', 'auto', 'important');
        node.style.setProperty('bottom', 'auto', 'important');
        node.style.setProperty('transform', 'none', 'important');
        node.style.setProperty('max-width', '100%', 'important');
        node.style.setProperty('margin', '4px auto', 'important');
        node.style.setProperty('z-index', '5', 'important');
      };

      resetFixed(el);
      if (el.querySelectorAll) {
        el.querySelectorAll('div, aside, section, iframe').forEach(child => {
          try {
            const cPos = child.style.position || window.getComputedStyle(child).position;
            if (cPos === 'fixed' || cPos === 'absolute') {
              resetFixed(child);
            }
          } catch (_) {}
        });
      }

      const wrapper = targetContainer.querySelector('.ad-banner-clean') ||
                      targetContainer.querySelector('.ad-inner-wrapper') ||
                      targetContainer;
      if (!isRewardOpen) {
        targetContainer.style.display = 'flex';
      }
      if (el.parentNode !== wrapper) {
        wrapper.appendChild(el);
      }
    }
  }

  function scanBodyForFloatingAds() {
    if (document.body) {
      Array.from(document.body.children).forEach(neutralizeAdElement);
    }
    if (document.documentElement) {
      Array.from(document.documentElement.children).forEach(child => {
        if (child.tagName !== 'HEAD' && child.tagName !== 'BODY') {
          neutralizeAdElement(child);
        }
      });
    }
  }

  function initAdNeutralizer() {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1 && !isProtectedElement(node)) {
              neutralizeAdElement(node);
            }
          }
        }
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: false });
    }
    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: false });
    }
    scanBodyForFloatingAds();

    // Targeted delayed scans without continuous polling overhead
    [800, 2000, 4500, 8000].forEach(delay => {
      setTimeout(scanBodyForFloatingAds, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdNeutralizer);
  } else {
    initAdNeutralizer();
  }

  window.__MILLIONAIRE_AD_CTRL__ = {
    shouldBlockAd,
    registerAdImpression,
    scanBodyForFloatingAds,
    getConfig: () => config
  };
})();
