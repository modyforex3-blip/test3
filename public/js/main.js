/**
 * Main Portal Logic for Millionaire
 */

let allApps = [];
let allArticles = [];
let siteSettings = {};
let currentCategory = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  await fetchPortalData();
  setupEventListeners();
  applyLanguageDirection();
});

// React to language switch
window.addEventListener('millionaire_lang_changed', (e) => {
  renderApps();
  renderArticles();
  renderAdBanners();
  applyLanguageDirection();
});

async function fetchPortalData() {
  try {
    const res = await fetch('/api/public-data');
    const data = await res.json();
    if (data.success) {
      siteSettings = data.settings || {};
      allApps = data.apps || [];
      allArticles = data.articles || [];
      renderAdBanners();
      renderApps();
      renderArticles();
    }
  } catch (err) {
    console.error('Failed to load portal data:', err);
  }
}

function applyLanguageDirection() {
  const isEn = window.i18n && window.i18n.currentLang === 'en';
  document.documentElement.dir = isEn ? 'ltr' : 'rtl';
  document.documentElement.lang = isEn ? 'en' : 'ar';
}

function renderAdBanners() {
  const topAdContainer = document.getElementById('topAdContainer');
  const bottomAdContainer = document.getElementById('bottomAdContainer');

  if (topAdContainer) {
    if (siteSettings.enableTopBanner) {
      topAdContainer.style.display = 'flex';
      topAdContainer.innerHTML = siteSettings.topAdCode || `
        <div class="ad-demo-box">
          <span class="ad-badge">${window.i18n.t('sponsored')} (AdSense / Monetag)</span>
          <div class="ad-content-inner">مساحة إعلانية علوية استراتيجية متوافقة 100% مع معايير AdSense & Monetag</div>
        </div>
      `;
    } else {
      topAdContainer.style.display = 'none';
    }
  }

  if (bottomAdContainer) {
    if (siteSettings.enableBottomBanner) {
      bottomAdContainer.style.display = 'flex';
      bottomAdContainer.innerHTML = siteSettings.bottomAdCode || `
        <div class="ad-demo-box">
          <span class="ad-badge">${window.i18n.t('sponsored')} (AdSense / Monetag)</span>
          <div class="ad-content-inner">مساحة إعلانية سفلية ثابتة - تحقق أعلى عائد ظهور ونقرات مشروعة</div>
        </div>
      `;
    } else {
      bottomAdContainer.style.display = 'none';
    }
  }
}

function renderApps() {
  const grid = document.getElementById('appsGrid');
  if (!grid) return;

  const isEn = window.i18n && window.i18n.currentLang === 'en';
  const query = searchQuery.trim().toLowerCase();

  // Filter apps
  const filtered = allApps.filter(app => {
    const matchCategory = (currentCategory === 'all') || (app.category === currentCategory);
    if (!matchCategory) return false;

    if (!query) return true;
    const name = (isEn ? app.nameEn : app.nameAr) || app.nameAr || '';
    const desc = (isEn ? app.shortDescEn : app.shortDescAr) || app.shortDescAr || '';
    return name.toLowerCase().includes(query) || desc.toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-16 text-gray-400">
        <i class="fas fa-search text-4xl mb-4 text-emerald-500 opacity-60"></i>
        <p class="text-lg font-semibold">${isEn ? 'No apps found matching your search.' : 'لم يتم العثور على أي تطبيقات مطابقة للبحث.'}</p>
        <button onclick="resetSearch()" class="mt-4 btn-secondary text-sm">
          ${isEn ? 'Reset Filters' : 'إعادة ضبط الفلاتر'}
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  const inFeedFreq = 3; // insert an in-feed ad every 3 cards

  filtered.forEach((app, index) => {
    const appName = isEn ? (app.nameEn || app.nameAr) : (app.nameAr || app.nameEn);
    const shortDesc = isEn ? (app.shortDescEn || app.shortDescAr) : (app.shortDescAr || app.shortDescEn);
    const features = isEn ? (app.featuresEn || app.featuresAr || []) : (app.featuresAr || app.featuresEn || []);

    const categoryNames = {
      finance: isEn ? 'Finance & Trading' : 'تداول واستثمار',
      crypto: isEn ? 'Crypto' : 'عملات رقمية',
      ai: isEn ? 'AI Suite' : 'ذكاء اصطناعي',
      tools: isEn ? 'Tools' : 'أدوات إنتاجية',
      education: isEn ? 'Academy' : 'تعليم ورواد'
    };
    const categoryLabel = categoryNames[app.category] || app.category;

    html += `
      <div class="app-card group">
        ${app.featured ? `
          <div class="featured-badge">
            <i class="fas fa-crown"></i>
            <span>${isEn ? 'Featured' : 'مميز'}</span>
          </div>
        ` : ''}

        <div class="app-card-img-wrapper">
          <img src="${app.icon}" alt="${appName}" class="app-card-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80'">
          <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>
        </div>

        <div class="p-5 flex flex-col flex-1 justify-between">
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="category-pill">${categoryLabel}</span>
              <div class="flex items-center gap-1 text-xs text-amber-400 font-bold">
                <i class="fas fa-star text-amber-400"></i>
                <span>${app.rating || '4.9'}</span>
              </div>
            </div>

            <h3 class="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
              ${appName}
            </h3>

            <p class="text-sm text-gray-400 mb-4 line-clamp-2">
              ${shortDesc}
            </p>

            <div class="mb-5 space-y-1.5 border-t border-white/5 pt-3">
              ${features.slice(0, 3).map(f => `
                <div class="feature-bullet">
                  <i class="fas fa-check-circle text-xs text-emerald-400"></i>
                  <span class="line-clamp-1">${f}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="pt-3 border-t border-white/10 flex items-center gap-2">
            <a href="/app.html?id=${app.id}" class="btn-primary flex-1 text-center text-xs sm:text-sm py-2.5">
              <span>${window.i18n.t('viewApp')}</span>
              <i class="fas fa-arrow-left text-xs ${isEn ? 'rotate-180' : ''}"></i>
            </a>
            <a href="/run.html?id=${app.id}" class="btn-gold px-3.5 py-2.5 text-xs font-bold" title="${isEn ? 'Run in Web App' : 'تشغيل التطبيق بالويب'}">
              <i class="fas fa-play"></i>
            </a>
            ${app.downloadUrl ? `
              <a href="${app.downloadUrl}" target="_blank" rel="noopener noreferrer" class="btn-secondary px-3 py-2.5" title="${window.i18n.t('directOpen')}">
                <i class="fas fa-external-link-alt text-xs"></i>
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Inject in-feed ad if enabled and after specific intervals
    if (siteSettings.enableInFeedAds && (index + 1) % inFeedFreq === 0 && (index + 1) < filtered.length) {
      html += `
        <div class="app-card ad-card-box justify-center items-center text-center p-6 bg-slate-900/40">
          <span class="ad-badge">${window.i18n.t('sponsored')} (AdSense / Monetag)</span>
          <div class="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center my-3 text-emerald-400">
            <i class="fas fa-ad text-xl"></i>
          </div>
          <h4 class="font-bold text-amber-400 text-sm mb-1">${isEn ? 'Exclusive Partner Offer' : 'عرض شريك استثماري حصري'}</h4>
          <p class="text-xs text-gray-400 mb-4 max-w-xs">${isEn ? 'Discover top-tier financial software & trading bonuses.' : 'اكتشف أفضل الأدوات والفرص الاستثمارية المصممة لرواد الأعمال.'}</p>
          <a href="#" class="btn-gold text-xs py-2 px-4">${isEn ? 'Explore Partner' : 'استكشف الآن'}</a>
        </div>
      `;
    }
  });

  grid.innerHTML = html;
}

function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderApps();
    });
  }

  // Category filter buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category || 'all';
      renderApps();
    });
  });

  // Language Switcher buttons
  const langArBtn = document.getElementById('langArBtn');
  const langEnBtn = document.getElementById('langEnBtn');
  if (langArBtn) {
    langArBtn.addEventListener('click', () => window.i18n.setLanguage('ar'));
  }
  if (langEnBtn) {
    langEnBtn.addEventListener('click', () => window.i18n.setLanguage('en'));
  }
}

function resetSearch() {
  searchQuery = '';
  currentCategory = 'all';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  document.querySelectorAll('.filter-btn').forEach(b => {
    if (b.dataset.category === 'all') b.classList.add('active');
    else b.classList.remove('active');
  });
  renderApps();
}

function renderArticles() {
  const container = document.getElementById('articlesGrid');
  if (!container || !allArticles || allArticles.length === 0) return;

  const isEn = window.i18n && window.i18n.currentLang === 'en';
  container.innerHTML = allArticles.slice(0, 6).map(art => `
    <article class="glass-panel overflow-hidden border border-white/10 group flex flex-col justify-between">
      <div class="h-44 overflow-hidden relative bg-slate-900">
        <img src="${art.image}" alt="${art.titleAr}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">
        <span class="absolute top-3 right-3 bg-slate-900/90 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
          ${art.categoryNameAr || 'مقال تقني'}
        </span>
      </div>
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <span class="text-[11px] text-gray-400 flex items-center gap-2 mb-2">
            <i class="far fa-clock text-emerald-400"></i> ${art.readTime || '5 دقائق قراءة'}
          </span>
          <h3 class="font-bold text-white text-base group-hover:text-emerald-400 transition-colors leading-snug mb-2 line-clamp-2">
            ${isEn ? (art.titleEn || art.titleAr) : art.titleAr}
          </h3>
          <p class="text-xs text-gray-400 line-clamp-3 leading-relaxed mb-4">
            ${art.excerpt || ''}
          </p>
        </div>
        <a href="/article.html?id=${art.id}" class="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 pt-2 border-t border-white/5">
          <span>${isEn ? 'Read Full Article' : 'قراءة المقال بالكامل'}</span>
          <i class="fas fa-arrow-left text-[10px] ${isEn ? 'rotate-180' : ''}"></i>
        </a>
      </div>
    </article>
  `).join('');
}
