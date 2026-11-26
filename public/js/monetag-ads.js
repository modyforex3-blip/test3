/**
 * Monetag Official Unified Integration Engine for Millionaire Portal & Apps
 * - Reads master ad configuration directly from /sw(2).js
 * - Registers /sw(2).js as the primary Service Worker
 * - Mounts Monetag into Page Banners, In-App Banners, and Rewarded Modal/Page
 */

(function () {
  'use strict';

  const DEFAULT_CONFIG = {
    domain: '3nbf4.com',
    zoneId: '12339769',
    bannerZone: '12339753',
    adaptiveZone: '314974',
    bannerScript: 'https://nap5k.com/tag.min.js',
    adaptiveScript: 'https://quge5.com/88/tag.min.js',
    swFile: '/sw(2).js'
  };

  let activeConfig = { ...DEFAULT_CONFIG };

  // Parse self.options directly from /sw(2).js so sw(2).js is the single source of truth
  async function loadConfigFromSw2() {
    try {
      const res = await fetch('/sw(2).js?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/self\.options\s*=\s*(\{[\s\S]*?\});/);
        if (match && match[1]) {
          const parsed = JSON.parse(match[1]);
          activeConfig = {
            ...activeConfig,
            ...parsed,
            zoneId: String(parsed.zoneId || activeConfig.zoneId),
            bannerZone: String(parsed.bannerZone || activeConfig.bannerZone),
            adaptiveZone: String(parsed.adaptiveZone || activeConfig.adaptiveZone)
          };
        }
      }
    } catch (_) {}
    return activeConfig;
  }

  // 1. Service Worker Auto-Registration (sw(2).js as primary)
  function registerMonetagSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(activeConfig.swFile, { scope: '/' }).catch(() => {});
      });
    }
  }

  // Helper: Load Monetag Banner Script inside specific element using sw(2).js config
  function loadMonetagBanner(targetEl, zoneId, scriptUrl) {
    if (!targetEl) return;
    try {
      const s = document.createElement('script');
      s.dataset.zone = String(zoneId || activeConfig.bannerZone || activeConfig.zoneId);
      s.src = scriptUrl || activeConfig.bannerScript || 'https://nap5k.com/tag.min.js';
      s.async = true;
      targetEl.appendChild(s);
    } catch (_) {}
  }

  // 2. Mount Monetag in Page Banners (Top & Bottom)
  function mountPageBanners() {
    // Top banner
    const topSlot = document.querySelector('#topAdContainer .monetag-slot, #topAdContainer [data-monetag-zone]');
    if (topSlot && topSlot.children.length === 0) {
      loadMonetagBanner(topSlot, activeConfig.bannerZone, activeConfig.bannerScript);
    }
    // Also try to push AdSense on top banner
    try {
      const topIns = document.querySelector('#topAdContainer ins.adsbygoogle');
      if (topIns && !topIns.dataset.adsbygoogleStatus) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (_) {}

    // Bottom banner
    const bottomSlot = document.querySelector('#bottomAdContainer .monetag-slot, #bottomAdContainer [data-monetag-zone]');
    if (bottomSlot && bottomSlot.children.length === 0) {
      loadMonetagBanner(bottomSlot, activeConfig.bannerZone, activeConfig.bannerScript);
    }
    // Also try to push AdSense on bottom banner
    try {
      const bottomIns = document.querySelector('#bottomAdContainer ins.adsbygoogle');
      if (bottomIns && !bottomIns.dataset.adsbygoogleStatus) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (_) {}
  }

  // 3. Mount Monetag in Application Banners (Runner & Millionaire OS)
  function mountAppBanners() {
    const inAppSlots = document.querySelectorAll(
      '#runnerInAppTopAd .monetag-slot, #runnerInAppBottomAd .monetag-slot, #inAppTopBanner .monetag-slot, #inAppBottomBanner .monetag-slot'
    );
    inAppSlots.forEach(slot => {
      if (slot.children.length === 0) {
        loadMonetagBanner(slot, activeConfig.bannerZone, activeConfig.bannerScript);
      }
    });
  }

  // 4. Mount Monetag inside Rewarded Modal / Page using sw(2).js config
  function mountRewardAd(targetEl) {
    if (!targetEl) return;
    const ts = Date.now();
    try {
      const sBanner = document.createElement('script');
      sBanner.dataset.zone = activeConfig.bannerZone;
      sBanner.src = `${activeConfig.bannerScript}?r=${ts}`;
      sBanner.async = true;
      targetEl.appendChild(sBanner);

      const sAdaptive = document.createElement('script');
      sAdaptive.dataset.zone = activeConfig.adaptiveZone;
      sAdaptive.src = `${activeConfig.adaptiveScript}?r=${ts}`;
      sAdaptive.async = true;
      sAdaptive.setAttribute('data-cfasync', 'false');
      targetEl.appendChild(sAdaptive);
    } catch (_) {}
  }

  // 5. Open Monetag Rewarded Ad Screen
  function openMonetagRewardScreen(options = {}) {
    if (options.openFullPage === true) {
      window.location.href = `/reward.html?return=${encodeURIComponent(window.location.href)}`;
      return;
    }

    if (window.RewardSystem && typeof window.RewardSystem.openRewardModal === 'function') {
      window.RewardSystem.openRewardModal();
    } else if (typeof window.openMonetagRewardModal === 'function') {
      window.openMonetagRewardModal();
    } else {
      window.location.href = `/reward.html?return=${encodeURIComponent(window.location.href)}`;
    }
  }

  const readyPromise = loadConfigFromSw2().then((cfg) => {
    registerMonetagSW();
    const runMounts = () => {
      mountPageBanners();
      mountAppBanners();
      document.querySelectorAll('[data-monetag-reward], .btn-monetag-reward').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          openMonetagRewardScreen();
        });
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runMounts);
    } else {
      runMounts();
    }

    // Desktop retry: re-attempt banner injection after scripts have time to load
    setTimeout(() => { mountPageBanners(); mountAppBanners(); }, 1500);
    setTimeout(() => { mountPageBanners(); mountAppBanners(); }, 4000);

    return cfg;
  });

  // Global Export
  window.MonetagAds = {
    getConfig: () => activeConfig,
    ready: readyPromise,
    mountPageBanners,
    mountAppBanners,
    mountRewardAd,
    openRewardScreen: openMonetagRewardScreen,
    loadBanner: loadMonetagBanner
  };

})();
