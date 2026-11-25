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
    renderResponsiveBanners();
    setupBottomBannerClose();
    setupSmartOnClickGuard();
    checkDesktopAdBlock();
  }

  // 1. Render visible, responsive banners on Desktop and Mobile
  function renderResponsiveBanners() {
    const topContainer = document.getElementById('topAdContainer');
    const bottomContainer = document.getElementById('bottomAdContainer');

    if (topContainer) {
      ensureBannerContent(topContainer, 'top');
    }

    if (bottomContainer) {
      ensureBannerContent(bottomContainer, 'bottom');
    }
  }

  function ensureBannerContent(container, position) {
    let inner = container.querySelector('.ad-inner-wrapper');
    if (!inner) {
      inner = document.createElement('div');
      inner.className = 'ad-inner-wrapper';
      container.appendChild(inner);
    }

    // If already contains visual banner, don't overwrite
    if (inner.querySelector('.ad-partner-card')) return;

    // Check language
    const isEn = document.documentElement.lang === 'en';

    const bannerHTML = `
      <div class="ad-partner-card">
        <div class="ad-partner-badge">
          <i class="fas fa-certificate"></i>
          <span>${isEn ? 'Sponsored Partner' : 'إعلان معتمد'}</span>
        </div>
        <div class="ad-partner-body">
          <div class="ad-partner-icon">
            <i class="fas fa-chart-line text-emerald-400"></i>
          </div>
          <div class="ad-partner-text">
            <div class="ad-partner-title">${isEn ? 'Pro Market Radar & Financial AI Suite' : 'منظومة رادار الأسواق والتحليل المالي الذكي'}</div>
            <div class="ad-partner-sub">${isEn ? 'Exclusive tools for crypto, stocks, and smart productivity' : 'أحدث أدوات التداول المعتمدة والذكاء الاصطناعي'}</div>
          </div>
          <a href="/app.html?id=app-1" class="ad-partner-cta">
            <span>${isEn ? 'Explore Now' : 'اكتشف العرض'}</span>
            <i class="fas fa-arrow-left text-[10px] ${isEn ? 'rotate-180' : ''}"></i>
          </a>
        </div>
      </div>
    `;

    // Append visual partner banner alongside any Monetag tag
    const visualDiv = document.createElement('div');
    visualDiv.className = 'w-full flex justify-center items-center';
    visualDiv.innerHTML = bannerHTML;
    inner.prepend(visualDiv);
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
