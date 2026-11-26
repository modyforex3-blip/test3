/**
 * Monetag Official Unified Integration Engine for Millionaire Portal & Apps
 * - Merges Monetag into Page Banners (Top & Bottom)
 * - Merges Monetag into Application Banners (In-App Top & Bottom)
 * - Merges Monetag into Rewarded Ads Program (Opens in dedicated reward screen/modal)
 */

(function () {
  'use strict';

  const MONETAG_CONFIG = {
    topBannerZone: '12339753',
    adaptiveZone: '314974',
    serviceWorkerZone: '12339769',
    swFile: '/sw(2).js',
    verificationMeta: '0167ea94057a766eea2813d6211ed27b'
  };

  // 1. Service Worker Auto-Registration
  function registerMonetagSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(MONETAG_CONFIG.swFile, { scope: '/' }).catch(() => {});
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
      });
    }
  }

  // 2. Mount Monetag in Page Banners (Top & Bottom)
  function mountPageBanners() {
    const topSlot = document.querySelector('#topAdContainer .monetag-slot, #topAdContainer [data-monetag-zone]');
    if (topSlot && topSlot.children.length === 0) {
      loadMonetagBanner(topSlot, MONETAG_CONFIG.topBannerZone);
    }

    const bottomSlot = document.querySelector('#bottomAdContainer .monetag-slot, #bottomAdContainer [data-monetag-zone]');
    if (bottomSlot && bottomSlot.children.length === 0) {
      loadMonetagBanner(bottomSlot, MONETAG_CONFIG.topBannerZone);
    }
  }

  // 3. Mount Monetag in Application Banners (Runner & Millionaire OS)
  function mountAppBanners() {
    // In-App Top Banners
    const inAppTopSlots = document.querySelectorAll('#runnerInAppTopAd .monetag-slot, #inAppTopBanner .monetag-slot');
    inAppTopSlots.forEach(slot => {
      if (slot.children.length === 0) {
        loadMonetagBanner(slot, MONETAG_CONFIG.topBannerZone);
      }
    });

    // In-App Bottom Banners
    const inAppBottomSlots = document.querySelectorAll('#runnerInAppBottomAd .monetag-slot, #inAppBottomBanner .monetag-slot');
    inAppBottomSlots.forEach(slot => {
      if (slot.children.length === 0) {
        loadMonetagBanner(slot, MONETAG_CONFIG.topBannerZone);
      }
    });
  }

  // Helper: Load Monetag Banner Script inside specific element
  function loadMonetagBanner(targetEl, zoneId) {
    if (!targetEl) return;
    try {
      const s = document.createElement('script');
      s.dataset.zone = zoneId || MONETAG_CONFIG.topBannerZone;
      s.src = 'https://nap5k.com/tag.min.js';
      s.async = true;
      targetEl.appendChild(s);
    } catch (_) {}
  }

  // 4. Open Monetag Rewarded Ad Screen
  function openMonetagRewardScreen(options = {}) {
    // If user prefers opening full dedicated reward page
    if (options.openFullPage === true) {
      const currentUrl = encodeURIComponent(window.location.href);
      window.location.href = `/reward.html?return=${currentUrl}`;
      return;
    }

    // Open the embedded luxury modal with fresh Monetag ad
    if (window.RewardSystem && typeof window.RewardSystem.openRewardModal === 'function') {
      window.RewardSystem.openRewardModal();
    } else if (typeof window.openMonetagRewardModal === 'function') {
      window.openMonetagRewardModal();
    } else {
      window.location.href = `/reward.html?return=${encodeURIComponent(window.location.href)}`;
    }
  }

  // 5. Initialize Engine
  function init() {
    registerMonetagSW();
    mountPageBanners();
    mountAppBanners();

    // Bind any reward buttons or links with data-monetag-reward
    document.querySelectorAll('[data-monetag-reward], .btn-monetag-reward').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openMonetagRewardScreen();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Global Export
  window.MonetagAds = {
    config: MONETAG_CONFIG,
    mountPageBanners,
    mountAppBanners,
    openRewardScreen: openMonetagRewardScreen,
    loadBanner: loadMonetagBanner
  };

})();
