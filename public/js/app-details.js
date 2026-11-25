/**
 * App Details Page Logic
 */

let currentApp = null;
let relatedApps = [];
let siteSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  let appId = urlParams.get('id');

  // Handle path fallback like /app/app-1
  if (!appId) {
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && segments[0] === 'app') {
      appId = segments[1];
    }
  }

  if (!appId) {
    appId = 'app-1'; // fallback
  }

  await loadAppDetails(appId);
});

window.addEventListener('millionaire_lang_changed', () => {
  if (currentApp) {
    renderAppDetails();
    renderRelatedApps();
  }
});

async function loadAppDetails(id) {
  try {
    const res = await fetch(`/api/apps/${id}`);
    const data = await res.json();
    if (data.success && data.app) {
      currentApp = data.app;
      relatedApps = data.relatedApps || [];
      siteSettings = data.settings || {};
      renderAdBanners();
      renderAppDetails();
      renderRelatedApps();
    } else {
      showError();
    }
  } catch (err) {
    console.error('Error fetching app details:', err);
    showError();
  }
}

function executeAdCode(container, code, fallback) {
  if (!container) return;
  const content = (code && code.trim()) ? code : fallback;
  if (!content) return;

  if (container.dataset.renderedCode === content) return;

  const existingScript = container.querySelector('script');
  if (existingScript && (content.includes('nap5k.com') || content.includes('12339753'))) {
    container.dataset.renderedCode = content;
    return;
  }

  // If container already has an AdSense tag loaded from HTML, preserve it!
  const existingAdsense = container.querySelector('ins.adsbygoogle');
  if (existingAdsense && content.includes('adsbygoogle')) {
    container.dataset.renderedCode = content;
    return;
  }

  container.dataset.renderedCode = content;
  container.innerHTML = content;

  const scripts = Array.from(container.querySelectorAll('script'));
  scripts.forEach(oldScript => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
    if (oldScript.textContent) {
      newScript.textContent = oldScript.textContent;
    }
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

function renderAdBanners() {
  const topAd = document.getElementById('topAdContainer');
  const bottomAd = document.getElementById('bottomAdContainer');
  const adsGloballyDisabled = siteSettings.adProvider === 'none';

  if (topAd) {
    if (!adsGloballyDisabled && siteSettings.enableTopBanner !== false) {
      topAd.style.display = 'flex';
      executeAdCode(topAd, siteSettings.topAdCode, `
        <div class="ad-banner-50 relative flex items-center justify-center w-full h-[50px] overflow-hidden text-center">
          <ins class="adsbygoogle" style="display:inline-block;width:100%;max-width:728px;height:50px" data-ad-client="ca-pub-6429184518728912" data-ad-slot="6300978111" data-ad-format="horizontal"></ins>
          <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
          <button onclick="document.getElementById('topAdContainer').style.display='none'" class="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white flex items-center justify-center text-xs transition-all z-20" title="إغلاق الإعلان" aria-label="إغلاق الإعلان">✕</button>
        </div>
      `);
    } else {
      topAd.style.display = 'none';
      topAd.innerHTML = '';
    }
  }

  // Bottom banner embedded strictly at 50px without overlapping any content
  if (bottomAd) {
    if (!adsGloballyDisabled && siteSettings.enableBottomBanner !== false) {
      bottomAd.style.display = 'flex';
      executeAdCode(bottomAd, siteSettings.bottomAdCode, `
        <div class="ad-banner-50 relative flex items-center justify-center w-full h-[50px] overflow-hidden text-center">
          <script>(function(s){s.dataset.zone='12339753',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
          <button onclick="document.getElementById('bottomAdContainer').style.display='none'" class="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white flex items-center justify-center text-xs transition-all z-20" title="إغلاق الإعلان" aria-label="إغلاق الإعلان">✕</button>
        </div>
      `);
    } else {
      bottomAd.style.display = 'none';
      bottomAd.innerHTML = '';
    }
  }
}

function renderAppDetails() {
  const isEn = window.i18n && window.i18n.currentLang === 'en';
  const app = currentApp;

  document.title = `${isEn ? (app.nameEn || app.nameAr) : (app.nameAr || app.nameEn)} | مليونير`;

  const appIcon = document.getElementById('appIcon');
  const appTitle = document.getElementById('appTitle');
  const appCategory = document.getElementById('appCategory');
  const appRating = document.getElementById('appRating');
  const appDownloads = document.getElementById('appDownloads');
  const appShortDesc = document.getElementById('appShortDesc');
  const appFullDesc = document.getElementById('appFullDesc');
  const appFeaturesList = document.getElementById('appFeaturesList');
  const appActionBtn = document.getElementById('appActionBtn');

  const categoryNames = {
    finance: isEn ? 'Finance & Trading' : 'تداول واستثمار',
    crypto: isEn ? 'Crypto' : 'عملات وبلوكتشين',
    ai: isEn ? 'AI Suite' : 'ذكاء اصطناعي',
    tools: isEn ? 'Tools' : 'أدوات إنتاجية',
    education: isEn ? 'Academy' : 'تعليم ورواد'
  };

  if (appIcon) appIcon.src = app.icon;
  if (appTitle) appTitle.textContent = isEn ? (app.nameEn || app.nameAr) : (app.nameAr || app.nameEn);
  if (appCategory) appCategory.textContent = categoryNames[app.category] || app.category;
  if (appRating) appRating.textContent = app.rating || '4.9';
  if (appDownloads) appDownloads.textContent = `${app.downloadsCount || '50K+'} ${window.i18n.t('downloadsCount')}`;
  if (appShortDesc) appShortDesc.textContent = isEn ? (app.shortDescEn || app.shortDescAr) : (app.shortDescAr || app.shortDescEn);
  if (appFullDesc) appFullDesc.textContent = isEn ? (app.fullDescEn || app.fullDescAr) : (app.fullDescAr || app.fullDescEn);

  if (appActionBtn) {
    appActionBtn.href = app.downloadUrl || '#';
  }

  const appRunWebBtn = document.getElementById('appRunWebBtn');
  if (appRunWebBtn) {
    if (app.webAppUrl) {
      appRunWebBtn.href = app.webAppUrl;
      appRunWebBtn.target = '_blank';
      appRunWebBtn.rel = 'noopener noreferrer';
    } else {
      appRunWebBtn.href = `/run.html?id=${app.id}`;
    }
  }

  if (appFeaturesList) {
    const features = isEn ? (app.featuresEn || app.featuresAr || []) : (app.featuresAr || app.featuresEn || []);
    appFeaturesList.innerHTML = features.map(f => `
      <li class="flex items-start gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-white/5">
        <i class="fas fa-check-circle text-emerald-400 mt-1 text-base flex-shrink-0"></i>
        <span class="text-gray-200 text-sm leading-relaxed">${f}</span>
      </li>
    `).join('');
  }
}

function renderRelatedApps() {
  const container = document.getElementById('relatedAppsGrid');
  if (!container) return;

  const isEn = window.i18n && window.i18n.currentLang === 'en';
  if (relatedApps.length === 0) {
    container.parentElement.style.display = 'none';
    return;
  }

  container.innerHTML = relatedApps.map(app => `
    <a href="/app.html?id=${app.id}" class="glass-panel glass-panel-hover p-4 flex items-center gap-4 group">
      <img src="${app.icon}" alt="${app.nameAr}" class="w-16 h-16 rounded-xl object-cover bg-slate-800 flex-shrink-0">
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-sm text-white group-hover:text-emerald-400 truncate">
          ${isEn ? (app.nameEn || app.nameAr) : (app.nameAr || app.nameEn)}
        </h4>
        <p class="text-xs text-gray-400 line-clamp-1 mt-1">
          ${isEn ? (app.shortDescEn || app.shortDescAr) : (app.shortDescAr || app.shortDescEn)}
        </p>
        <div class="flex items-center gap-2 mt-2 text-[11px] text-amber-400 font-semibold">
          <i class="fas fa-star"></i>
          <span>${app.rating || '4.8'}</span>
        </div>
      </div>
    </a>
  `).join('');
}

function shareCurrentApp() {
  if (navigator.share) {
    navigator.share({
      title: document.title,
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert(window.i18n.t('shareSuccess'));
  }
}

function showError() {
  const content = document.getElementById('appContent');
  if (content) {
    content.innerHTML = `
      <div class="text-center py-20">
        <i class="fas fa-exclamation-triangle text-4xl text-amber-500 mb-4"></i>
        <h2 class="text-2xl font-bold text-white mb-2">عذراً، التطبيق المطلوب غير موجود</h2>
        <a href="/" class="btn-primary mt-6 inline-flex">العودة للرئيسية</a>
      </div>
    `;
  }
}
