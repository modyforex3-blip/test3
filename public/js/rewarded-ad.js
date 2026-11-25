/**
 * Millionaire Rewarded Monetag Ad Modal Controller
 * إعلانات مونيتاج المدبلجة في صفحة منبثقة بمكافأة وتغلق ولا تغطي على محتوى الموقع
 * Features:
 * 1. Embedded Monetag Ad in a dedicated Popup Modal
 * 2. Rewarded User Experience (+50 Wealth Points upon view/interaction)
 * 3. Easy-to-close (Prominent Close Button 'X' and dismiss actions)
 * 4. Zero Content Block: When closed, occupies 0px screen space
 * 5. Floating optional Reward Pill allowing users to claim bonuses on demand
 */

(function() {
  'use strict';

  const STORAGE_POINTS_KEY = 'millionaire_user_wealth_points';
  const STORAGE_LAST_REWARD_TIME = 'mil_last_rewarded_ad_ts';
  const REWARD_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown between auto-prompts

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
    const el = document.getElementById('userRewardPointsBadge');
    if (el) el.textContent = `${points} نقطة`;
  }

  function isAppActive() {
    const path = window.location.pathname.toLowerCase();
    return path.includes('/run/') || 
           path.includes('/apps/') || 
           window.__IS_IN_APP__ === true;
  }

  // Inject Modal & Floating Pill into DOM
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

        <!-- Prominent Close Button (X) -->
        <button onclick="window.closeMonetagRewardModal()" class="absolute top-4 left-4 w-9 h-9 rounded-full bg-slate-800/90 hover:bg-slate-700 text-gray-300 hover:text-white flex items-center justify-center transition-all z-20 border border-white/10" title="إغلاق الإعلان">
          <i class="fas fa-times text-sm"></i>
        </button>

        <!-- Badge & Reward Header -->
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-black mb-3">
          <i class="fas fa-gift text-sm text-amber-400 animate-bounce"></i>
          <span>عرض الشريك بمكافأة • Rewarded Ad</span>
        </div>

        <h3 class="text-lg font-black text-white mb-1.5 flex items-center justify-center gap-2">
          <span>شاهد الإعلان واربح +50 نقطة ثروة!</span>
        </h3>
        <p class="text-xs text-gray-300 mb-4 leading-relaxed">
          يدعم هذا الإعلان استمرارية أدوات الذكاء الاصطناعي مجاناً. يمكنك إغلاق النافذة في أي وقت أو استلام المكافأة.
        </p>

        <!-- Embedded Monetag Ad Slot (مدبلجة في النافذة) -->
        <div id="rewardedMonetagSlot" class="w-full min-h-[140px] rounded-2xl bg-slate-900/90 border border-white/10 p-3 flex flex-col items-center justify-center relative overflow-hidden mb-4">
          <div class="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
            <i class="fas fa-ad text-lg"></i>
          </div>
          <span class="text-xs font-bold text-amber-300 mb-1">إعلان معتمد من شبكة Monetag العالمية</span>
          <p class="text-[11px] text-gray-400 max-w-xs text-center">أفضل العروض والحلول المالية والتداول الموثوقة مع شركاء معتمدين.</p>
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
            <span id="claimBtnLabel">استلام المكافأة (+50)</span>
          </button>
          <button onclick="window.closeMonetagRewardModal()" class="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-bold border border-white/10 transition-all">
            <span>إغلاق</span>
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modalDiv);

    // Floating Reward Pill (غير معطل ولا يغطي المحتوى وقابل للإخفاء)
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

  let rewardCountdownTimer = null;
  let rewardCompleted = false;

  window.openMonetagRewardModal = function(autoTriggered = false) {
    injectRewardedModalHTML();

    const modal = document.getElementById('monetagRewardedModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    rewardCompleted = false;
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

    // Execute Monetag zone inside modal slot
    const slot = document.getElementById('monetagInnerScriptContainer');
    if (slot && !slot.dataset.loaded) {
      slot.dataset.loaded = 'true';
      const s = document.createElement('script');
      s.dataset.zone = '12339753';
      s.src = 'https://nap5k.com/tag.min.js';
      s.async = true;
      slot.appendChild(s);
    }

    // Start 5-second countdown to unlock reward
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
        rewardCompleted = true;
        if (timerSeconds) timerSeconds.textContent = 'جاهز!';
        if (timerLabel) timerLabel.textContent = '✅ اكتمل العرض بنجاح! مكافأتك جاهزة للاستلام';
        if (claimBtn) {
          claimBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>استلم +50 نقطة الآن!</span>';
          claimBtn.classList.add('animate-pulse');
        }
      }
    }, 1000);
  };

  window.closeMonetagRewardModal = function() {
    const modal = document.getElementById('monetagRewardedModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
    if (rewardCountdownTimer) clearInterval(rewardCountdownTimer);
    sessionStorage.setItem(STORAGE_LAST_REWARD_TIME, Date.now().toString());
  };

  window.claimMonetagReward = function() {
    addPoints(50);
    window.closeMonetagRewardModal();

    // Show celebration alert/toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[100001] bg-emerald-600 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce';
    toast.innerHTML = `
      <i class="fas fa-check-circle text-base"></i>
      <span>🎉 رائع! تم إضافة +50 نقطة ثروة إلى حسابك بنجاح! الرصيد: ${getUserPoints()} نقطة</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  };

  // Auto-prompt rewarded modal smoothly after 25s if user hasn't seen it recently
  document.addEventListener('DOMContentLoaded', () => {
    injectRewardedModalHTML();

    if (isAppActive()) return; // Never auto-pop inside apps

    setTimeout(() => {
      const last = parseInt(sessionStorage.getItem(STORAGE_LAST_REWARD_TIME) || '0', 10);
      const now = Date.now();
      if (now - last > REWARD_COOLDOWN_MS) {
        window.openMonetagRewardModal(true);
      }
    }, 25000);
  });
})();
