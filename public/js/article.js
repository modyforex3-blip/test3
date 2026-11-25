/**
 * Article Reader Logic for Millionaire Portal
 */

let currentArticle = null;
let relatedArticles = [];
let siteSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  let articleId = urlParams.get('id');

  if (!articleId) {
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && segments[0] === 'article') {
      articleId = segments[1];
    }
  }

  if (!articleId) articleId = 'art-1';

  await loadArticle(articleId);
});

async function loadArticle(id) {
  try {
    const res = await fetch(`/api/articles/${id}`);
    const data = await res.json();
    if (data.success && data.article) {
      currentArticle = data.article;
      relatedArticles = data.relatedArticles || [];
      siteSettings = data.settings || {};
      renderAdBanners();
      renderArticle();
      renderRelatedArticles();
    } else {
      document.getElementById('articleContainer').innerHTML = `
        <div class="text-center py-20 text-gray-400">
          <p class="text-lg font-bold">عذراً، المقال المطلوب غير موجود أو تم تحديثه.</p>
          <a href="/" class="btn-primary mt-4 inline-block">العودة للرئيسية</a>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading article:', err);
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

  // Bottom banner retired in favor of Monetag Rewarded Modal
  if (bottomAd) {
    bottomAd.style.display = 'none';
    bottomAd.innerHTML = '';
  }
}

function renderArticle() {
  const a = currentArticle;
  document.title = `${a.titleAr} | مجلة مليونير`;

  document.getElementById('articleTitle').textContent = a.titleAr;
  document.getElementById('articleCategory').textContent = a.categoryNameAr || 'تقنية وذكاء اصطناعي';
  document.getElementById('articleReadTime').textContent = a.readTime || '5 دقائق قراءة';
  document.getElementById('articleDate').textContent = new Date(a.publishedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('articleAuthor').textContent = a.author || 'روبوت الذكاء الاصطناعي • منصة مليونير';
  document.getElementById('articleImage').src = a.image;
  document.getElementById('articleImage').alt = a.titleAr;
  document.getElementById('articleExcerpt').textContent = a.excerpt || '';

  // Format content with markdown/newlines
  const contentEl = document.getElementById('articleContent');
  if (contentEl) {
    const formatted = a.content
      .split('\n\n')
      .map(p => {
        if (p.startsWith('### ')) {
          return `<h3 class="text-xl font-bold text-emerald-400 mt-6 mb-3">${p.replace('### ', '')}</h3>`;
        }
        if (p.startsWith('- ') || p.startsWith('1. ') || p.startsWith('2. ') || p.startsWith('3. ')) {
          return `<div class="p-3 bg-slate-900/40 rounded-xl border border-white/5 my-2 text-sm leading-relaxed text-gray-200">${p}</div>`;
        }
        return `<p class="text-base text-gray-300 leading-relaxed my-4">${p}</p>`;
      })
      .join('');
    contentEl.innerHTML = formatted;
  }
}

function renderRelatedArticles() {
  const container = document.getElementById('relatedArticlesGrid');
  if (!container) return;

  if (relatedArticles.length === 0) {
    container.parentElement.style.display = 'none';
    return;
  }

  container.innerHTML = relatedArticles.map(art => `
    <a href="/article.html?id=${art.id}" class="glass-panel glass-panel-hover p-4 flex gap-4 group">
      <img src="${art.image}" class="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-slate-800">
      <div class="flex-1 min-w-0">
        <span class="text-[10px] text-emerald-400 font-bold">${art.categoryNameAr || 'مقال تقني'}</span>
        <h4 class="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-400 line-clamp-2 mt-1 leading-snug">
          ${art.titleAr}
        </h4>
        <span class="text-[11px] text-gray-400 mt-2 block">${art.readTime}</span>
      </div>
    </a>
  `).join('');
}

function shareCurrentArticle() {
  if (navigator.share) {
    navigator.share({
      title: document.title,
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert('تم نسخ رابط المقال بنجاح!');
  }
}
