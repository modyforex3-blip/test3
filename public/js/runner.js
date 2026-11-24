/**
 * In-Portal Web App Runner Engine
 */

let currentApp = null;
let siteSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  let appId = urlParams.get('id');

  if (!appId) {
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && segments[0] === 'run') {
      appId = segments[1];
    }
  }

  if (!appId) appId = 'app-1';

  await loadRunnerData(appId);
  setupRunnerControls();
});

async function loadRunnerData(id) {
  try {
    const res = await fetch(`/api/apps/${id}`);
    const data = await res.json();
    if (data.success && data.app) {
      currentApp = data.app;
      siteSettings = data.settings || {};
      renderAdBanners();
      initAppRunner();
    } else {
      document.getElementById('runnerViewport').innerHTML = `
        <div class="text-center py-20 text-gray-400">
          <p>التطبيق المطلوب غير متوفر حالياً</p>
          <a href="/" class="btn-primary mt-4 inline-block">العودة للرئيسية</a>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading runner:', err);
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
        <div class="ad-banner-50 flex items-center justify-center w-full h-[50px] overflow-hidden text-center">
          <ins class="adsbygoogle" style="display:inline-block;width:100%;max-width:728px;height:50px" data-ad-client="ca-pub-6429184518728912" data-ad-slot="6300978111" data-ad-format="horizontal"></ins>
          <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
        </div>
      `);
    } else {
      topAd.style.display = 'none';
      topAd.innerHTML = '';
    }
  }

  if (bottomAd) {
    if (!adsGloballyDisabled && siteSettings.enableBottomBanner !== false) {
      bottomAd.style.display = 'flex';
      executeAdCode(bottomAd, siteSettings.bottomAdCode, `
        <div class="ad-banner-50 flex items-center justify-center w-full h-[50px] overflow-hidden text-center">
          <script>(function(s){s.dataset.zone='12339753',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>
        </div>
      `);
    } else {
      bottomAd.style.display = 'none';
      bottomAd.innerHTML = '';
    }
  }
}

function initAppRunner() {
  const isEn = window.i18n && window.i18n.currentLang === 'en';
  const app = currentApp;

  document.title = `${isEn ? (app.nameEn || app.nameAr) : (app.nameAr || app.nameEn)} - مشغل الويب | مليونير`;

  document.getElementById('runnerAppIcon').src = app.icon;
  document.getElementById('runnerAppName').textContent = isEn ? (app.nameEn || app.nameAr) : (app.nameAr || app.nameEn);
  document.getElementById('runnerAppCategory').textContent = app.category;
  document.getElementById('backToDetailsBtn').href = `/app.html?id=${app.id}`;

  const directPwaBtn = document.getElementById('directAppPwaBtn');
  if (directPwaBtn) {
    if (app.webAppUrl) {
      directPwaBtn.href = app.webAppUrl;
      directPwaBtn.style.display = 'inline-flex';
    } else {
      directPwaBtn.style.display = 'none';
    }
  }

  const viewport = document.getElementById('runnerViewport');

  // If app has an embed/external web app url:
  if (app.webAppUrl && (app.webAppUrl.startsWith('http') || app.webAppUrl.startsWith('/'))) {
    // Open in full independent page directly
    window.location.replace(app.webAppUrl);
    return;
  }

  // Interactive built-in interactive simulator suite based on category
  renderInteractiveAppSuite(app, viewport);
}

function renderInteractiveAppSuite(app, viewport) {
  const isEn = window.i18n && window.i18n.currentLang === 'en';

  if (app.category === 'finance') {
    viewport.innerHTML = `
      <div class="p-6 md:p-10 flex flex-col justify-between h-full text-slate-100 bg-[#080c14]">
        <div class="space-y-6">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span class="text-xs text-emerald-400 font-bold uppercase tracking-wider">رادار الأسواق المباشر (Live Market Feed)</span>
              <h2 class="text-2xl font-black text-white mt-1">BTC / USDT : $96,420.00</h2>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold animate-pulse">
                <i class="fas fa-signal"></i> إشارة الذكاء الاصطناعي: شراء قوي (STRONG BUY)
              </span>
            </div>
          </div>

          <!-- Simulation Radar Card -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="glass-panel p-4 border border-emerald-500/20">
              <span class="text-xs text-gray-400">توقع الاتجاه (Next 24h)</span>
              <div class="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
                <i class="fas fa-arrow-trend-up"></i> +8.45% صعود
              </div>
            </div>
            <div class="glass-panel p-4 border border-amber-500/20">
              <span class="text-xs text-gray-400">مؤشر الخوف والجشع</span>
              <div class="text-xl font-bold text-amber-400 mt-1">78 (جشع شديد)</div>
            </div>
            <div class="glass-panel p-4 border border-blue-500/20">
              <span class="text-xs text-gray-400">حجم التداول اليومي</span>
              <div class="text-xl font-bold text-blue-400 mt-1">$48.2 Billion</div>
            </div>
          </div>

          <!-- Interactive Calculator -->
          <div class="glass-panel p-6 border border-white/10">
            <h3 class="font-bold text-sm text-white mb-3 flex items-center gap-2">
              <i class="fas fa-calculator text-emerald-400"></i>
              <span>حاسبة أرباح الاستثمار التجريبية بالذكاء الاصطناعي</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label class="block text-xs text-gray-400 mb-1">المبلغ المبدئي ($)</label>
                <input type="number" id="calcInvestAmount" value="1000" class="w-full py-2 px-3 rounded-lg bg-slate-900 border border-white/10 text-white text-sm" oninput="calculateProfit()">
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">مدة الاستثمار (أشهر)</label>
                <input type="number" id="calcInvestMonths" value="6" class="w-full py-2 px-3 rounded-lg bg-slate-900 border border-white/10 text-white text-sm" oninput="calculateProfit()">
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">العائد المتوقع المتراكم</label>
                <div id="calcResult" class="py-2 px-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-sm">$1,689.48 (+68.9%)</div>
              </div>
            </div>
          </div>
        </div>

        <!-- In-App Safe Ad Slot -->
        <div class="ad-demo-box my-4">
          <span class="ad-badge">إعلان معتمد داخل التطبيق / In-App Monetag & AdSense</span>
          <div class="ad-content-inner">مساحة إعلانية داخلية تظهر على الويب وعند التثبيت على الهاتف المحمول دون تعطيل الاستخدام</div>
        </div>
      </div>
    `;
  } else if (app.category === 'ai') {
    viewport.innerHTML = `
      <div class="p-6 md:p-10 flex flex-col justify-between h-full text-slate-100 bg-[#080c14]">
        <div class="space-y-6">
          <div class="border-b border-white/10 pb-4">
            <span class="text-xs text-amber-400 font-bold uppercase tracking-wider">مساعد كتابة وتسويق الأعمال الذكي</span>
            <h2 class="text-2xl font-black text-white mt-1">${app.nameAr}</h2>
          </div>

          <div class="glass-panel p-6 border border-white/10 space-y-4">
            <label class="block text-xs font-bold text-gray-300">اكتب فكرة مشروعك أو منتجك لتوليد حملة إعلانية فورية:</label>
            <div class="flex gap-2">
              <input type="text" id="aiInputPrompt" placeholder="مثال: تطبيق توصيل وجبات صحية للمنازل..." value="منصة تداول واستثمار رقمية لرواد الأعمال" class="flex-1 py-3 px-4 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500">
              <button onclick="simulateAIGeneration()" class="btn-primary text-xs px-6 font-bold flex items-center gap-2">
                <i class="fas fa-magic"></i> توليد بالذكاء الاصطناعي
              </button>
            </div>
            
            <div id="aiOutputBox" class="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20 text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-line">
              ✨ عنوان الحملة المقترح: "انطلق نحو مستقبلك المالي مع أقوى حلول التداول الذكي!"
              🎯 الجمهور المستهدف: المستثمرون، رواد الأعمال، الباحثون عن عوائد استثمارية ذكية.
              💡 الميزة التنافسية: تحليل لحظي بالذكاء الاصطناعي مع أمان تشفير عسكري.
            </div>
          </div>
        </div>

        <div class="ad-demo-box my-4">
          <span class="ad-badge">إعلان ممول / In-App Ad</span>
          <div class="ad-content-inner">إعلان مدمج متوافق مع كافة الأجهزة المحمولة ومتصفحات الويب</div>
        </div>
      </div>
    `;
  } else {
    // General Interactive Suite
    viewport.innerHTML = `
      <div class="p-6 md:p-10 flex flex-col justify-between h-full text-slate-100 bg-[#080c14]">
        <div class="space-y-6">
          <div class="border-b border-white/10 pb-4 flex items-center justify-between">
            <div>
              <span class="text-xs text-emerald-400 font-bold uppercase tracking-wider">منصة التشغيل الفورية</span>
              <h2 class="text-2xl font-black text-white mt-1">${app.nameAr}</h2>
            </div>
            <span class="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
              <i class="fas fa-check-circle"></i> جاهز للاستخدام
            </span>
          </div>

          <div class="glass-panel p-6 border border-white/10">
            <h3 class="font-bold text-white text-base mb-2">مميزات وضع الويب المباشر:</h3>
            <ul class="space-y-2 text-xs text-gray-300">
              <li class="flex items-center gap-2"><i class="fas fa-check text-emerald-400"></i> تشغيل سريع بنقرة واحدة دون الحاجة لتثبيت برامج إضافية</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-emerald-400"></i> متوافق مع كافة الشاشات وأجهزة الكمبيوتر والموبايل</li>
              <li class="flex items-center gap-2"><i class="fas fa-check text-emerald-400"></i> حفظ الإعدادات تلقائياً في ذاكرة المتصفح السحابية</li>
            </ul>

            <div class="mt-6 flex flex-wrap gap-4">
              <a href="${app.downloadUrl || '#'}" target="_blank" class="btn-primary text-sm py-2.5 px-6">
                <i class="fas fa-download"></i> تحميل النسخة الكاملة
              </a>
              <button onclick="promptPWAInstall()" class="btn-gold text-sm py-2.5 px-6">
                <i class="fas fa-mobile-alt"></i> تثبيت التطبيق على الهاتف
              </button>
            </div>
          </div>
        </div>

        <div class="ad-demo-box my-4">
          <span class="ad-badge">إعلان ممول / Sponsored</span>
          <div class="ad-content-inner">مساحة إعلانية مخصصة للمعلنين والشركاء الرسميين</div>
        </div>
      </div>
    `;
  }
}

function calculateProfit() {
  const amount = parseFloat(document.getElementById('calcInvestAmount').value) || 0;
  const months = parseFloat(document.getElementById('calcInvestMonths').value) || 0;
  const monthlyRate = 0.09; // 9% simulation
  const result = amount * Math.pow(1 + monthlyRate, months);
  const gain = ((result - amount) / (amount || 1)) * 100;
  const el = document.getElementById('calcResult');
  if (el) {
    el.textContent = `$${result.toFixed(2)} (+${gain.toFixed(1)}%)`;
  }
}

function simulateAIGeneration() {
  const prompt = document.getElementById('aiInputPrompt').value;
  const output = document.getElementById('aiOutputBox');
  output.innerHTML = `<i class="fas fa-spinner fa-spin text-emerald-400"></i> جاري التحليل والتوليد بالذكاء الاصطناعي...`;
  setTimeout(() => {
    output.innerHTML = `
      ✨ <strong>خطة تسويقية مقترحة لمشروع: ${prompt}</strong><br>
      • <strong>العنوان الجذاب:</strong> الحل الأذكى لرواد الأعمال في 2026.<br>
      • <strong>رسالة الإعلان:</strong> وفر 70% من وقتك وحقق أعلى عائد على الاستثمار بأحدث تقنيات الأتمتة.<br>
      • <strong>دعوة لاتخاذ إجراء (CTA):</strong> ابدأ تجربتك المجانية اليوم عبر منصة مليونير!
    `;
  }, 900);
}

function setupRunnerControls() {
  // Fullscreen toggle
  const fsBtn = document.getElementById('fullscreenBtn');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      const elem = document.getElementById('runnerContainer');
      if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => alert(`Error: ${err.message}`));
      } else {
        document.exitFullscreen();
      }
    });
  }

  // Reload button
  const reloadBtn = document.getElementById('reloadAppBtn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      initAppRunner();
    });
  }

  // Install PWA button
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) {
    installBtn.addEventListener('click', promptPWAInstall);
  }
}

// PWA Install Prompt handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) installBtn.classList.remove('hidden');
});

function promptPWAInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        alert('شكراً لك! تم تثبيت التطبيق بنجاح على جهازك ويحتوي على كافة الإعلانات والمميزات.');
      }
      deferredPrompt = null;
    });
  } else {
    alert('لتثبيت التطبيق على هاتفك المحمول الآن:\n• على أندرويد/Chrome: اضغط على القائمة (⋮) ثم اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".\n• على آيفون/Safari: اضغط على زر المشاركة (Share) ثم اختر "إضافة إلى الصفحة الرئيسية (Add to Home Screen)".');
  }
}
