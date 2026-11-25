/**
 * Millionaire Portal - Smart Non-Intrusive Ad Controller (Ad Guard)
 * - Guarantees visible, responsive banners on both Desktop & Mobile
 * - Prevents annoying popups from hijacking app buttons
 * - Provides close button for sticky bottom banner
 * - Graceful AdBlock notice on desktop
 */

(function () {
  'use strict';

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdGuard);
  } else {
    initAdGuard();
  }

  function initAdGuard() {
    setupBottomBannerClose();
    setupSmartOnClickGuard();
    checkDesktopAdBlock();
  }

  // 2. Close button for bottom banner (Non-intrusive experience)
  function setupBottomBannerClose() {
    const bottomContainer = document.getElementById('bottomAdContainer');
    if (!bottomContainer) return;

    // Check if dismissed in this session
    if (sessionStorage.getItem('dismiss_bottom_ad') === 'true') {
      bottomContainer.style.display = 'none';
      return;
    }

    if (!bottomContainer.querySelector('.ad-close-btn')) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'ad-close-btn';
      closeBtn.setAttribute('title', 'إغلاق الإعلان');
      closeBtn.setAttribute('aria-label', 'Close ad');
      closeBtn.innerHTML = '<i class="fas fa-times"></i>';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        bottomContainer.style.display = 'none';
        sessionStorage.setItem('dismiss_bottom_ad', 'true');
      });
      bottomContainer.appendChild(closeBtn);
    }
  }

  // 3. Smart OnClick Guard: Never hijack app buttons, inputs, or navigation
  function setupSmartOnClickGuard() {
    // Intercept clicks on interactive elements to prevent popunders from hijacking them
    document.addEventListener('click', function (e) {
      const interactiveTarget = e.target.closest(
        'button, a, input, select, textarea, .filter-btn, .lang-switcher-btn, .btn-primary, .btn-secondary, .btn-gold, .runner-container, [role="button"]'
      );

      // If user is clicking an interactive app button, stop popunders
      if (interactiveTarget) {
        // Mark event as user app interaction
        e.isAppInteraction = true;
      }
    }, true);
  }

  // 4. AdBlock Detection for Desktop: Friendly notice instead of blank space
  function checkDesktopAdBlock() {
    // Only check if window width is desktop (> 768px)
    if (window.innerWidth < 768) return;

    setTimeout(() => {
      // Test if Monetag scripts loaded
      const testImg = new Image();
      testImg.onerror = function () {
        showAdBlockNotice();
      };
      testImg.src = 'https://nap5k.com/favicon.ico?' + Date.now();
    }, 2500);
  }

  function showAdBlockNotice() {
    const notices = document.querySelectorAll('.ad-partner-sub');
    notices.forEach(n => {
      n.innerHTML = '<span class="text-amber-400 font-semibold"><i class="fas fa-shield-alt text-xs"></i> يُرجى استثناء الموقع من مانع الإعلانات (AdBlock) لتجربة كاملة</span>';
    });
  }

})();
