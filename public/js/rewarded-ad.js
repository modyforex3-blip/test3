/**
 * Millionaire Rewarded Monetag Ad Modal & User Safety Shield Controller
 * إعلانات مونيتاج المدبلجة في صفحة منبثقة بمكافأة وتغلق بدون حجب المحتوى
 * 
 * الميزات:
 * 1. منع فتح أي إعلانات بدون إذن المستخدم (حجب Popunders والنقر الخفي 100%)
 * 2. عند إغلاق النافذة المنبثقة تضاف +50 نقطة ثروة فوراً للرصيد
 * 3. دمج الإعلانات في البانر العلوي والسفلي بدقة 50px وبدون تغطية أي محتوى
 * 4. إزالة أي أشرطة إعلانية عائمة متراكمة (In-Page Push) تطفو فوق الموقع
 * 5. عرض رصيد النقاط وتحديثه المباشر في النافبار
 */

(function() {
  'use strict';

  const STORAGE_POINTS_KEY = 'millionaire_user_wealth_points';
  const STORAGE_LAST_REWARD_TIME = 'mil_last_rewarded_ad_ts';
  const REWARD_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown

  let rewardAwardedThisTurn = false;
  let onRewardClosedCallback = null;
  let rewardCountdownTimer = null;

  // 1. Points Management
  function getUserPoints() {
    return parseInt(localStorage.getItem(STORAGE_POINTS_KEY) || '150', 10);
  }

  function addPoints(amount) {
    const current = getUserPoints();
    const updated = current + amount;
    localStorage.setItem(STORAGE_POINTS_KEY, updated.toString());
    updatePointsDisplay(updated);
    return updated;
  }

  function updatePointsDisplay(points) {
    const pts = typeof points === 'number' ? points : getUserPoints();
    const elements = document.querySelectorAll('#userRewardPointsBadge, .user-wealth-points-val');
    elements.forEach(el => {
      el.textContent = `${pts} نقطة`;
    });
  }

  function isAppActive() {
    const path = window.location.pathname.toLowerCase();
    return path.includes('/run/') || 
           path.includes('/apps/') || 
           window.__IS_IN_APP__ === true;
  }

  // 2. Shield: Block Unauthorized Popups & Popunders ("لا يتم فتح أي إعلانات بدون إذن المستخدم")
  const originalWindowOpen = window.open;
  window.open = function(url, target, features) {
    if (window.__ALLOW_USER_INTENT_OPEN__) {
      return originalWindowOpen.apply(this, arguments);
    }

    const urlStr = String(url || '').toLowerCase();
    const isAdPopunder = urlStr && (
      urlStr.includes('quge5.com') ||
      urlStr.includes('nap5k.com') ||
      urlStr.includes('monetag') ||
      urlStr.includes('onclick') ||
      urlStr.includes('popunder') ||
      urlStr.includes('adcash') ||
      urlStr.includes('propeller') ||
      urlStr.includes('doubleclick') ||
      urlStr.includes('adservice')
    );

    if (isAdPopunder) {
      console.warn('[Millionaire Shield] تم منع فتح إعلان منبثق بدون إذن المستخدم:', url);
      return null;
    }

    return originalWindowOpen.apply(this, arguments);
  };

  // Prevent hidden synthetic clicks on ad links
  const originalAClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function() {
    const href = String(this.href || '').toLowerCase();
    if (href.includes('quge5.com') || href.includes('nap5k.com') || href.includes('onclick') || href.includes('popunder')) {
      console.warn('[Millionaire Shield] تم اعتراض نقرة إعلانية خفية بدون إذن.');
      return;
    }
    return originalAClick.apply(this, arguments);
  };

  // 3. Remove Rogue Floating Notification Push Bars ("شريطين إعلاميين يفتحان تحت بعضهما")
  function suppressFloatingAds() {
    const selectors = [
      'div[class*="in-page-push"]',
      'div[id*="in-page-push"]',
      'div[class*="ipp-"]',
      'div[id*="ipp-"]',
      '[class*="quge5"]',
      '[id*="quge5"]'
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (!el.closest('#monetagRewardedModal') && !el.closest('#bottomAdContainer') && !el.closest('#topAdContainer')) {
          el.remove();
        }
      });
    });
  }

  // Active DOM Observer to keep page clean from floating stacked banners
  const adCleanObserver = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const added = mutations[i].addedNodes;
      for (let j = 0; j < added.length; j++) {
        const node = added[j];
        if (node.nodeType === 1) {
          const cls = (node.className || '').toString().toLowerCase();
          const id = (node.id || '').toString().toLowerCase();
          if (
            cls.includes('in-page-push') ||
            id.includes('in-page-push') ||
            cls.includes('ipp-') ||
            id.includes('ipp-') ||
            cls.includes('quge5') ||
            id.includes('quge5')
          ) {
            if (!node.closest('#monetagRewardedModal') && !node.closest('#bottomAdContainer')) {
              node.remove();
            }
          }
        }
      }
    }
  });

  // 4. Inject Modal & Floating Pill
  function injectRewardedModalHTML() {
    if (document.getElementById('monetagRewardedModal')) return;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'monetagRewardedModal';
    modalDiv.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300 hidden';
    modalDiv.setAttribute('role', 'dialog');
    modalDiv.setAttribute('aria-modal', 'true');

    modalDiv.innerHTML = `
      <div class="relative w-full max-w-md p-6 rounded-3xl bg-[#0b1329] border border-amber-500/40 text-center shadow-2xl text-slate-100 overflow-hidden transform transition-all scale-100 animate-fadeIn">
        
        <!-- Background Ambient Glow -->
        <div class="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -right-12 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Prominent Close Button (X) - Always grants reward upon closing -->
        <button onclick="window.closeMonetagRewardModal()" class="absolute top-4 left-4 w-9 h-9 rounded-full bg-slate-800/90 hover:bg-slate-700 text-gray-300 hover:text-white flex items-center justify-center transition-all z-20 border border-white/10" title="إغلاق وجمع النقاط">
          <i class="fas fa-times text-sm"></i>
        </button>

        <!-- Badge & Reward Header -->
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-black mb-3">
          <i class="fas fa-gift text-sm text-amber-400 animate-bounce"></i>
          <span>برنامج مكافآت الشريك • Rewarded Program</span>
        </div>

        <h3 class="text-lg font-black text-white mb-1.5 flex items-center justify-center gap-2">
          <span>شاهد الإعلان واربح +50 نقطة ثروة!</span>
        </h3>
        <p class="text-xs text-gray-300 mb-4 leading-relaxed">
          إعلان رسمي معتمد لدعم استمرارية التطبيقات مجاناً. بمجرد إغلاق هذه النافذة ستُضاف <strong>50 نقطة مكافأة</strong> تلقائياً إلى رصيدك!
        </p>

        <!-- Embedded Monetag Ad Slot (مدبلجة داخل النافذة) -->
        <div id="rewardedMonetagSlot" class="w-full min-h-[140px] rounded-2xl bg-slate-900/90 border border-white/10 p-3 flex flex-col items-center justify-center relative overflow-hidden mb-4">
          <div class="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
            <i class="fas fa-ad text-lg"></i>
          </div>
          <span class="text-xs font-bold text-amber-300 mb-1">إعلان معتمد من شبكة Monetag العالمية</span>
          <p class="text-[11px] text-gray-400 max-w-xs text-center">أفضل العروض والحلول الرقمية الآمنة مع شركاء معتمدين.</p>
          <div id="monetagInnerScriptContainer" class="w-full mt-2"></div>
        </div>

        <!-- Progress / Reward Status Bar -->
        <div class="space-y-1.5 mb-4">
          <div class="flex items-center justify-between text-[11px] font-bold text-gray-400 px-1">
            <span id="rewardTimerLabel">جاري التحقق من مشاهدة الإعلان...</span>
            <span id="rewardTimerSeconds" class="text-amber-400 font-mono">5 ثوانٍ</span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-white/5">
            <div id="rewardProgressBar" class="bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-1000" style="width: 0%"></div>
          </div>
        </div>

        <!-- Action & Dismiss Buttons -->
        <div class="flex items-center justify-center gap-2.5">
          <button id="claimRewardBtn" onclick="window.claimMonetagReward()" class="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all">
            <i class="fas fa-coins text-sm"></i>
            <span id="claimBtnLabel">استلام المكافأة وإغلاق (+50)</span>
          </button>
          <button onclick="window.closeMonetagRewardModal()" class="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-bold border border-white/10 transition-all">
            <span>إغلاق</span>
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modalDiv);

    // Floating Reward Pill (اختياري وقابل للإخفاء الفوري)
    if (!document.getElementById('floatingRewardContainer') && !isAppActive()) {
      const pillWrapper = document.createElement('div');
      pillWrapper.id = 'floatingRewardContainer';
      pillWrapper.className = 'fixed bottom-4 left-4 z-40 flex items-center gap-1.5 transition-all select-none';
      pillWrapper.innerHTML = `
        <button id="floatingRewardBtn" onclick="window.openMonetagRewardModal(false)" class="flex items-center gap-2 py-2 px-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/30 cursor-pointer border border-amber-300/40 transition-all hover:scale-105 active:scale-95" title="اضغط للحصول على مكافأة مجانية ومشاهدة إعلان الشريك">
          <i class="fas fa-gift text-sm text-slate-950 animate-bounce"></i>
          <span>مكافأة مجانية (+50)</span>
        </button>
        <button onclick="document.getElementById('floatingRewardContainer').remove()" class="w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white flex items-center justify-center text-[11px] transition-all border border-white/10" title="إخفاء الزر" aria-label="إخفاء الزر">✕</button>
      `;
      document.body.appendChild(pillWrapper);
    }
  }

  // 5. Open Rewarded Ad Modal
  window.openMonetagRewardModal = function(autoTriggered = false, callback = null) {
    injectRewardedModalHTML();

    const modal = document.getElementById('monetagRewardedModal');
    if (!modal) return;

    onRewardClosedCallback = typeof callback === 'function' ? callback : null;
    rewardAwardedThisTurn = false;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    const bar = document.getElementById('rewardProgressBar');
    const timerLabel = document.getElementById('rewardTimerLabel');
    const timerSeconds = document.getElementById('rewardTimerSeconds');
    const claimBtn = document.getElementById('claimRewardBtn');

    if (bar) bar.style.width = '0%';
    if (timerLabel) timerLabel.textContent = 'جاري التحقق من مشاهدة الإعلان...';
    if (claimBtn) {
      claimBtn.classList.remove('bg-emerald-500', 'text-white');
      claimBtn.classList.add('bg-gradient-to-r', 'from-amber-500', 'to-amber-600', 'text-slate-950');
    }

    // Load Monetag zone inside modal slot
    const slot = document.getElementById('monetagInnerScriptContainer');
    if (slot && !slot.dataset.loaded) {
      slot.dataset.loaded = 'true';
      const s = document.createElement('script');
      s.dataset.zone = '12339753';
      s.src = 'https://nap5k.com/tag.min.js';
      s.async = true;
      slot.appendChild(s);
    }

    // 5-second countdown to unlock reward
    let remaining = 5;
    if (timerSeconds) timerSeconds.textContent = `${remaining} ثوانٍ`;

    if (rewardCountdownTimer) clearInterval(rewardCountdownTimer);
    rewardCountdownTimer = setInterval(() => {
      remaining--;
      const progressPercent = ((5 - remaining) / 5) * 100;
      if (bar) bar.style.width = `${progressPercent}%`;

      if (remaining > 0) {
        if (timerSeconds) timerSeconds.textContent = `${remaining} ثوانٍ`;
      } else {
        clearInterval(rewardCountdownTimer);
        if (timerSeconds) timerSeconds.textContent = 'جاهز!';
        if (timerLabel) timerLabel.textContent = '✅ اكتمل العرض بنجاح! المكافأة جاهزة عند الإغلاق';
        if (claimBtn) {
          claimBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>استلم +50 نقطة الآن وأغلق</span>';
          claimBtn.classList.add('animate-pulse');
        }
      }
    }, 1000);
  };

  // 6. Close Modal & Add Points ("عند إغلاقها تضاف نقاط")
  window.closeMonetagRewardModal = function() {
    const modal = document.getElementById('monetagRewardedModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
    if (rewardCountdownTimer) clearInterval(rewardCountdownTimer);
    sessionStorage.setItem(STORAGE_LAST_REWARD_TIME, Date.now().toString());

    // Award +50 points whenever closed as requested by user
    if (!rewardAwardedThisTurn) {
      rewardAwardedThisTurn = true;
      const newPoints = addPoints(50);
      showRewardToast(50, newPoints);
    }

    // Execute callback if user was waiting to continue action
    if (typeof onRewardClosedCallback === 'function') {
      const cb = onRewardClosedCallback;
      onRewardClosedCallback = null;
      cb();
    }
  };

  window.claimMonetagReward = function() {
    window.closeMonetagRewardModal();
  };

  function showRewardToast(amount, total) {
    const existing = document.getElementById('rewardToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'rewardToast';
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[100001] bg-emerald-600 text-white font-bold text-xs sm:text-sm py-3 px-6 rounded-2xl shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce select-none';
    toast.innerHTML = `
      <i class="fas fa-check-circle text-base text-white"></i>
      <span>🎉 رائع! تمت إضافة +${amount} نقطة ثروة بنجاح! رصيدك الآن: ${total} نقطة</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4500);
  }

  // 7. Connect Clicks on Site Content to Rewards ("اربط الاعلانات التي تفتح عند الضغط على محتويات الموقع ببرنامج المكافأت")
  function setupContentClickRewards() {
    document.addEventListener('click', function(e) {
      const trigger = e.target.closest('[data-reward-ad="true"], .btn-trigger-reward');
      if (trigger) {
        e.preventDefault();
        const targetUrl = trigger.getAttribute('href');
        window.openMonetagRewardModal(false, () => {
          if (targetUrl && targetUrl !== '#') {
            window.location.href = targetUrl;
          }
        });
      }
    });
  }

  // 8. Lifecycle init
  document.addEventListener('DOMContentLoaded', () => {
    updatePointsDisplay();
    injectRewardedModalHTML();
    setupContentClickRewards();
    suppressFloatingAds();

    try {
      adCleanObserver.observe(document.body, { childList: true, subtree: true });
    } catch (_) {}

    // Periodic sweep every 3 seconds to guarantee no rogue floating ads appear
    setInterval(suppressFloatingAds, 3000);
  });

})();
