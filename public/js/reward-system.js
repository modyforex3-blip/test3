/**
 * Millionaire Rewarded Ads & Gamified Points System
 * - Voluntary Rewarded Ad Modal with live countdown timer
 * - Automatic points reward upon completion
 * - Prevents automatic unprompted popups on app or page clicks
 * - Integrates reward badges across navigation & in-app toolbars
 */

(function () {
  'use strict';

  const STORAGE_POINTS_KEY = 'mil_user_reward_points';
  const STORAGE_HISTORY_KEY = 'mil_user_reward_history';

  // System State
  let points = parseInt(localStorage.getItem(STORAGE_POINTS_KEY) || '100', 10); // Start with 100 welcome bonus points
  let currentTimer = null;
  let remainingSeconds = 15;
  let isWatchingAd = false;
  let systemConfig = {
    enabled: true,
    pointsPerAd: 50,
    adDurationSeconds: 15,
    rewardAdCode: ''
  };

  // Fetch dynamic settings from server
  fetch('/api/public-data')
    .then(r => r.json())
    .then(data => {
      if (data && data.settings && data.settings.rewardSystem) {
        systemConfig = { ...systemConfig, ...data.settings.rewardSystem };
      }
      renderPointsBadges();
    })
    .catch(() => {});

  // Save initial points if new user
  if (!localStorage.getItem(STORAGE_POINTS_KEY)) {
    localStorage.setItem(STORAGE_POINTS_KEY, points.toString());
  }

  // --- Sound Effects using Web Audio API (Zero external assets needed) ---
  function playRewardSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // Pleasant ascending chime: C5 -> E5 -> G5 -> C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);

        gain.gain.setValueAtTime(0.01, ctx.currentTime + index * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + index * 0.1 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + index * 0.1);
        osc.stop(ctx.currentTime + index * 0.1 + 0.4);
      });
    } catch (_) {}
  }

  // --- Confetti Particle System (Pure Canvas) ---
  function triggerConfetti() {
    try {
      let canvas = document.getElementById('milRewardConfetti');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'milRewardConfetti';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999999;';
        document.body.appendChild(canvas);
      }
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles = [];
      const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#ffffff'];

      for (let i = 0; i < 90; i++) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2 - 50,
          vx: (Math.random() - 0.5) * 14,
          vy: (Math.random() - 0.8) * 16,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 10,
          alpha: 1
        });
      }

      let frame = 0;
      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35; // gravity
          p.rotation += p.rotSpeed;
          p.alpha -= 0.012;

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        });

        frame++;
        if (frame < 85) {
          requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.remove();
        }
      }
      animate();
    } catch (_) {}
  }

  // --- Points Management ---
  function getPoints() {
    return points;
  }

  function addPoints(amount, reason = 'مكافأة مشاهدة إعلان') {
    points += amount;
    localStorage.setItem(STORAGE_POINTS_KEY, points.toString());

    // Record history
    try {
      const history = JSON.parse(localStorage.getItem(STORAGE_HISTORY_KEY) || '[]');
      history.unshift({
        amount,
        reason,
        date: new Date().toISOString(),
        total: points
      });
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
    } catch (_) {}

    renderPointsBadges();
    playRewardSound();
    triggerConfetti();

    // Dispatch custom event for any listeners (e.g. apps)
    window.dispatchEvent(new CustomEvent('millionaire:points-updated', { detail: { points, added: amount } }));
  }

  function renderPointsBadges() {
    const formatted = points.toLocaleString('ar-EG');
    document.querySelectorAll('.user-points-val').forEach(el => {
      el.textContent = formatted;
      // Animate bounce
      el.classList.add('scale-125', 'text-amber-300');
      setTimeout(() => el.classList.remove('scale-125', 'text-amber-300'), 400);
    });
  }

  // --- Modal Injection & Management ---
  function createModalIfNotExists() {
    if (document.getElementById('rewardAdModal')) return;

    const modalHTML = `
      <div id="rewardAdModal" class="reward-modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="rewardModalTitle">
        <div class="reward-modal-card">
          
          <!-- Modal Header -->
          <div class="reward-modal-header">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl flex-shrink-0 animate-bounce">
                <i class="fas fa-gift"></i>
              </div>
              <div>
                <h3 id="rewardModalTitle" class="font-black text-white text-base sm:text-lg flex items-center gap-2">
                  <span>برنامج المكافآت الذكي</span>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">+<span id="rewardPointsRewardLabel">50</span> نقطة</span>
                </h3>
                <p class="text-xs text-gray-400 mt-0.5">شاهد الإعلان حتى نهاية المؤقت للحصول على مكافأتك فوراً في محفظتك</p>
              </div>
            </div>
            
            <button id="rewardModalCloseBtn" class="reward-close-btn" title="إغلاق النافذة" aria-label="إغلاق">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Timer & Progress Bar Section -->
          <div class="reward-timer-box">
            <div class="flex items-center justify-between text-xs font-bold mb-2">
              <span id="rewardTimerStatus" class="flex items-center gap-2 text-amber-400">
                <i class="fas fa-hourglass-half animate-spin"></i>
                <span>جاري مشاهدة الإعلان...</span>
              </span>
              <span class="px-2.5 py-1 rounded-full bg-slate-800 border border-white/10 text-white font-mono text-xs">
                ⏱️ يتبقى: <strong id="rewardRemainingSeconds">15</strong> ثانية
              </span>
            </div>
            <div class="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
              <div id="rewardProgressBar" class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-1000 ease-linear" style="width: 100%;"></div>
            </div>
          </div>

          <!-- Reward Ad Viewport -->
          <div class="reward-ad-viewport">
            <div class="reward-ad-badge">
              <i class="fas fa-badge-check text-emerald-400"></i>
              <span>إعلان شريك معتمد | Verified Reward Partner</span>
            </div>
            
            <div id="rewardAdPlacement" class="w-full min-h-[160px] flex items-center justify-center text-center p-4">
              <!-- Monetag In-Page / AdSense / Custom Rewarded Ad Content -->
              <div class="space-y-3">
                <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl text-emerald-400">
                  <i class="fas fa-gem animate-pulse"></i>
                </div>
                <div>
                  <h4 class="font-bold text-white text-sm">منظومة المليونير الحصرية (Millionaire VIP)</h4>
                  <p class="text-xs text-gray-400 max-w-sm mx-auto mt-1">تطبيقات ذكاء اصطناعي وأدوات مالية وتقنية حصرية تمنحك مزايا إنتاجية واستثمارية فريدة</p>
                </div>
                <div class="text-[11px] text-amber-400 font-semibold">
                  <i class="fas fa-check-circle"></i> مكافأتك في الانتظار، لا تغلق الشاشة حتى ينتهي الوقت
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer / Actions -->
          <div class="reward-modal-footer">
            <div class="flex items-center gap-2 text-xs text-gray-400">
              <i class="fas fa-wallet text-amber-400"></i>
              <span>رصيدك الحالي: <strong class="user-points-val text-white font-bold">${points}</strong> نقطة</span>
            </div>
            
            <button id="rewardClaimBtn" class="btn-primary text-xs py-2 px-5 font-bold hidden" disabled>
              <i class="fas fa-check-circle"></i> استلام المكافأة وإغلاق
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Bind Close Event
    const closeBtn = document.getElementById('rewardModalCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', handleUserCloseRequest);
    }

    // Bind Claim Event
    const claimBtn = document.getElementById('rewardClaimBtn');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => {
        closeRewardModal();
      });
    }
  }

  function handleUserCloseRequest() {
    if (!isWatchingAd) {
      closeRewardModal();
      return;
    }

    // If timer is still running, warn user politely
    if (remainingSeconds > 0) {
      const confirmEarlyClose = confirm(
        '⚠️ تنبيه: المؤقت لم ينتهِ بعد!\n\nإذا أغلقت الشاشة الآن، فلن تُحتسب نقاط المكافأة.\nهل ترغب بالإغلاق دون الحصول على المكافأة؟'
      );
      if (confirmEarlyClose) {
        clearInterval(currentTimer);
        isWatchingAd = false;
        closeRewardModal();
      }
    } else {
      closeRewardModal();
    }
  }

  function renderRewardAd(container) {
    if (!container) return;
    const ts = Date.now();

    // Render Monetag & AdSense directly in top-level DOM (Monetag blocks nested iframes)
    container.innerHTML = `
      <div class="reward-monetag-direct-wrapper w-full flex flex-col items-center justify-center gap-2">
        <div id="rewardMonetagLiveSlot" class="w-full min-h-[110px] flex flex-col items-center justify-center rounded-xl bg-slate-900/60 border border-white/10 p-3">
          <div class="text-[11px] text-emerald-400 font-bold mb-2 flex items-center gap-1.5">
            <i class="fas fa-satellite-dish animate-pulse"></i>
            <span>إعلان شبكة Monetag المباشر</span>
          </div>
          <div id="rewardMonetagTarget" class="w-full flex flex-col items-center justify-center min-h-[60px]"></div>
          <ins class="adsbygoogle" style="display:inline-block;width:100%;max-width:468px;min-height:60px" data-ad-client="ca-pub-6429184518728912" data-ad-slot="6300978111" data-ad-format="horizontal" data-full-width-responsive="true"></ins>
        </div>

        <div class="mt-1 flex items-center justify-between w-full text-[11px] text-gray-400 px-1">
          <span class="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <i class="fas fa-badge-check"></i>
            <span>إعلان رسمي معتمد من Monetag</span>
          </span>
          <a href="/reward.html?return=${encodeURIComponent(window.location.href)}" target="_blank" class="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors" title="فتح صفحة المكافآت المستقلة">
            <i class="fas fa-external-link-alt text-[9px]"></i>
            <span>فتح في صفحة مستقلة</span>
          </a>
        </div>
      </div>
    `;

    // Mount fresh Monetag ad sourced from /sw(2).js
    const target = document.getElementById('rewardMonetagTarget');
    if (target) {
      if (window.MonetagAds && typeof window.MonetagAds.mountRewardAd === 'function') {
        window.MonetagAds.ready.then(() => window.MonetagAds.mountRewardAd(target));
      } else {
        try {
          const s1 = document.createElement('script');
          s1.dataset.zone = '12339753';
          s1.src = `https://nap5k.com/tag.min.js?r=${ts}`;
          s1.async = true;
          target.appendChild(s1);

          const s2 = document.createElement('script');
          s2.dataset.zone = '314974';
          s2.src = `https://quge5.com/88/tag.min.js?r=${ts}`;
          s2.async = true;
          s2.setAttribute('data-cfasync', 'false');
          target.appendChild(s2);
        } catch (_) {}
      }
    }

    // Trigger AdSense
    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (_) {}
  }

  function openRewardModal() {
    createModalIfNotExists();
    const modal = document.getElementById('rewardAdModal');
    if (!modal) return;

    const rewardAmount = systemConfig.pointsPerAd || 50;
    const duration = systemConfig.adDurationSeconds || 15;

    remainingSeconds = duration;
    isWatchingAd = true;
    window.__IS_REWARD_AD_ACTIVE__ = true;

    // Reset UI
    document.getElementById('rewardPointsRewardLabel').textContent = rewardAmount;
    document.getElementById('rewardRemainingSeconds').textContent = remainingSeconds;
    const progressBar = document.getElementById('rewardProgressBar');
    progressBar.style.width = '100%';

    const timerStatus = document.getElementById('rewardTimerStatus');
    timerStatus.innerHTML = '<i class="fas fa-hourglass-half animate-spin"></i> <span>جاري مشاهدة الإعلان...</span>';
    timerStatus.className = 'flex items-center gap-2 text-amber-400';

    const claimBtn = document.getElementById('rewardClaimBtn');
    claimBtn.classList.add('hidden');
    claimBtn.disabled = true;

    // Execute real live ad in container
    const placement = document.getElementById('rewardAdPlacement');
    if (placement) {
      renderRewardAd(placement);
    }

    // Show modal
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    // Run Countdown Timer
    clearInterval(currentTimer);
    const totalDuration = duration;
    currentTimer = setInterval(() => {
      remainingSeconds--;
      const secEl = document.getElementById('rewardRemainingSeconds');
      if (secEl) secEl.textContent = remainingSeconds;

      const progressPct = Math.max(0, (remainingSeconds / totalDuration) * 100);
      if (progressBar) progressBar.style.width = `${progressPct}%`;

      if (remainingSeconds <= 0) {
        clearInterval(currentTimer);
        onRewardCompleted(rewardAmount);
      }
    }, 1000);
  }

  function onRewardCompleted(rewardAmount) {
    isWatchingAd = false;

    // Add points
    addPoints(rewardAmount, 'مشاهدة إعلان مكافأة مكتمل');

    // Update UI state
    const timerStatus = document.getElementById('rewardTimerStatus');
    if (timerStatus) {
      timerStatus.innerHTML = '<i class="fas fa-check-circle text-emerald-400"></i> <span class="text-emerald-400 font-bold">تم اكتمال الإعلان بنجاح!</span>';
    }

    const secEl = document.getElementById('rewardRemainingSeconds');
    if (secEl) secEl.textContent = '0';

    const progressBar = document.getElementById('rewardProgressBar');
    if (progressBar) {
      progressBar.style.width = '0%';
      progressBar.className = 'h-full bg-emerald-400';
    }

    const claimBtn = document.getElementById('rewardClaimBtn');
    if (claimBtn) {
      claimBtn.classList.remove('hidden');
      claimBtn.disabled = false;
      claimBtn.innerHTML = `<i class="fas fa-gift text-amber-300"></i> مبروك! استلمت +${rewardAmount} نقطة (إغلاق)`;
    }

    // Auto close after 2.5 seconds
    setTimeout(() => {
      closeRewardModal();
    }, 2500);
  }

  function closeRewardModal() {
    clearInterval(currentTimer);
    isWatchingAd = false;
    window.__IS_REWARD_AD_ACTIVE__ = false;
    const modal = document.getElementById('rewardAdModal');
    if (modal) {
      modal.classList.add('hidden');
    }
    document.body.classList.remove('overflow-hidden');
  }

  // --- Anti-Auto-Popup Strict Shield ---
  // Ensure ads NEVER open by themselves when clicking normal page or app buttons
  function installAntiAutoPopupShield() {
    const originalOpen = window.open;
    window.open = function (url, target, features) {
      // If triggered by voluntary user watching a rewarded ad, allow
      if (isWatchingAd) {
        return originalOpen.apply(this, arguments);
      }

      // Block unprompted popunders
      const urlStr = String(url || '').toLowerCase();
      if (
        urlStr.includes('quge5.com') ||
        urlStr.includes('nap5k.com') ||
        urlStr.includes('monetag') ||
        urlStr.includes('onclick') ||
        urlStr.includes('popunder')
      ) {
        console.log('[Reward System Shield] Blocked unprompted ad popup. Ads only open via voluntary Reward button.');
        return null;
      }

      return originalOpen.apply(this, arguments);
    };

    // Stop popunders from hijacking app controls
    document.addEventListener('click', function (e) {
      const rewardTrigger = e.target.closest('[data-reward-btn], .btn-watch-reward-ad');
      if (rewardTrigger) {
        e.preventDefault();
        e.stopPropagation();
        openRewardModal();
        return;
      }
    }, true);
  }

  // Auto-init once DOM is ready
  function init() {
    createModalIfNotExists();
    renderPointsBadges();
    installAntiAutoPopupShield();

    // Bind all reward buttons on the page
    document.querySelectorAll('[data-reward-btn], .btn-watch-reward-ad').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openRewardModal();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export Global API
  window.RewardSystem = {
    getPoints,
    addPoints,
    openRewardModal,
    closeRewardModal,
    renderPointsBadges,
    getConfig: () => systemConfig
  };

  // Universal Monetag Compatibility Aliases
  window.openMonetagRewardModal = openRewardModal;
  window.closeMonetagRewardModal = closeRewardModal;
  window.claimMonetagReward = function() {
    closeRewardModal();
  };

})();

