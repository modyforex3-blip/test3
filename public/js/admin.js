/**
 * Admin Panel Management Script
 */

let dashboardData = {
  settings: {},
  apps: [],
  messages: [],
  articles: [],
  aiBlogger: {}
};

let currentEditingAppId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupAdminListeners();
});

async function checkAuth() {
  try {
    const res = await fetch('/api/admin/check-auth');
    const data = await res.json();
    if (data.authenticated) {
      showDashboard();
      await loadDashboardData();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('adminDashboard').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('adminDashboard').classList.remove('hidden');
}

async function loadDashboardData() {
  try {
    const res = await fetch('/api/admin/dashboard-data');
    const data = await res.json();
    if (data.success) {
      dashboardData = data;
      renderStats();
      renderAppsTable();
      renderArticlesTable();
      populateSettingsForm();
      populateAdsForm();
      populateAIBloggerForm();
      renderMessagesTable();
    } else if (res.status === 401) {
      showLogin();
    }
  } catch (err) {
    console.error('Error loading admin dashboard data:', err);
  }
}

function renderStats() {
  document.getElementById('statTotalApps').textContent = dashboardData.apps.length;
  document.getElementById('statFeaturedApps').textContent = dashboardData.apps.filter(a => a.featured).length;
  document.getElementById('statMessages').textContent = dashboardData.messages.length;
  
  const statArticles = document.getElementById('statTotalArticles');
  if (statArticles) {
    statArticles.textContent = (dashboardData.articles || []).length;
  }
  
  const adsActive = (dashboardData.settings.enableTopBanner ? 1 : 0) + 
                    (dashboardData.settings.enableBottomBanner ? 1 : 0) + 
                    (dashboardData.settings.enableInFeedAds ? 1 : 0);
  document.getElementById('statActiveAds').textContent = `${adsActive} / 3`;
}

function renderAppsTable() {
  const tbody = document.getElementById('appsTableBody');
  if (!tbody) return;

  if (dashboardData.apps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-400">لا توجد تطبيقات مسجلة حتى الآن</td></tr>`;
    return;
  }

  tbody.innerHTML = dashboardData.apps.map(app => `
    <tr class="border-b border-white/5 hover:bg-slate-800/40 transition-colors">
      <td class="py-4 px-4">
        <div class="flex items-center gap-3">
          <img src="${app.icon}" class="w-12 h-12 rounded-xl object-cover bg-slate-900 border border-white/10" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80'">
          <div>
            <div class="font-bold text-white text-sm">${app.nameAr}</div>
            <div class="text-xs text-gray-400">${app.nameEn || ''}</div>
          </div>
        </div>
      </td>
      <td class="py-4 px-4 text-xs font-semibold">
        <span class="category-pill">${app.category}</span>
      </td>
      <td class="py-4 px-4 text-xs text-amber-400 font-bold">
        <i class="fas fa-star text-xs"></i> ${app.rating || '4.8'}
      </td>
      <td class="py-4 px-4 text-xs">
        ${app.featured ? '<span class="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">مميز</span>' : '<span class="text-gray-500">عادي</span>'}
      </td>
      <td class="py-4 px-4 text-xs text-gray-400">${app.downloadsCount || '0'}</td>
      <td class="py-4 px-4 text-right">
        <div class="flex items-center justify-end gap-2">
          <a href="/app.html?id=${app.id}" target="_blank" class="p-2 text-gray-400 hover:text-emerald-400" title="معاينة"><i class="fas fa-external-link-alt"></i></a>
          <button type="button" onclick="openEditAppModal('${app.id}')" class="p-2 text-amber-400 hover:text-amber-300 cursor-pointer" title="تعديل"><i class="fas fa-edit"></i></button>
          <button type="button" onclick="deleteApp('${app.id}')" class="p-2 text-rose-500 hover:text-rose-400 cursor-pointer" title="حذف"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderArticlesTable() {
  const tbody = document.getElementById('articlesTableBody');
  if (!tbody) return;

  const articles = dashboardData.articles || [];
  if (articles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-400">لا توجد مقالات منشورة حتى الآن. انقر على زر التوليد الفوري بالأعلى!</td></tr>`;
    return;
  }

  tbody.innerHTML = articles.map(art => `
    <tr class="border-b border-white/5 hover:bg-slate-800/40 transition-colors">
      <td class="py-4 px-4">
        <div class="flex items-center gap-3">
          <img src="${art.image}" class="w-12 h-12 rounded-xl object-cover bg-slate-900 border border-white/10" onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=80'">
          <div>
            <div class="font-bold text-white text-sm line-clamp-1">${art.titleAr}</div>
            <div class="text-xs text-gray-400 line-clamp-1">${art.titleEn || ''}</div>
          </div>
        </div>
      </td>
      <td class="py-4 px-4 text-xs font-semibold">
        <span class="category-pill">${art.category || 'tech'}</span>
      </td>
      <td class="py-4 px-4 text-xs text-gray-400">
        ${new Date(art.publishedAt || Date.now()).toLocaleDateString('ar-EG')}
      </td>
      <td class="py-4 px-4 text-xs text-emerald-400 font-bold">
        <i class="fas fa-eye text-xs"></i> ${art.views || 0}
      </td>
      <td class="py-4 px-4 text-xs">
        <span class="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">منشور</span>
      </td>
      <td class="py-4 px-4 text-right">
        <div class="flex items-center justify-end gap-2">
          <a href="/article.html?id=${art.id}" target="_blank" class="p-2 text-gray-400 hover:text-emerald-400" title="قراءة المقال"><i class="fas fa-external-link-alt"></i></a>
          <button onclick="deleteArticle('${art.id}')" class="p-2 text-rose-500 hover:text-rose-400" title="حذف المقال"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderMessagesTable() {
  const container = document.getElementById('messagesContainer');
  if (!container) return;

  if (dashboardData.messages.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-gray-400 text-sm">صندوق الرسائل فارغ حالياً</div>`;
    return;
  }

  container.innerHTML = dashboardData.messages.map(msg => `
    <div class="glass-panel p-5 border border-white/5 space-y-2">
      <div class="flex items-center justify-between text-xs text-gray-400">
        <span class="font-bold text-white text-sm">${msg.name} (${msg.email})</span>
        <div class="flex items-center gap-3">
          <span>${new Date(msg.createdAt).toLocaleDateString('ar-EG')}</span>
          <button onclick="deleteMessage('${msg.id}')" class="text-rose-400 hover:text-rose-300"><i class="fas fa-trash text-sm"></i></button>
        </div>
      </div>
      <div class="text-xs font-semibold text-emerald-400">الموضوع: ${msg.subject}</div>
      <p class="text-xs text-gray-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-white/5 whitespace-pre-line">${msg.message}</p>
    </div>
  `).join('');
}

function populateSettingsForm() {
  const s = dashboardData.settings || {};
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };

  setVal('siteNameAr', s.siteNameAr || '');
  setVal('siteNameEn', s.siteNameEn || '');
  setVal('taglineAr', s.taglineAr || '');
  setVal('taglineEn', s.taglineEn || '');
  setVal('gridColumns', s.gridColumns || 3);
  setVal('contactEmail', s.contactEmail || '');
  setVal('telegramLink', s.telegramLink || '');

  const f = s.siteFeatures || {};
  setChk('siteShowNavbarReward', f.showNavbarReward !== false);
  setChk('siteShowFloatingReward', f.showFloatingReward !== false);
  setChk('siteEnableSearch', f.enableSearch !== false);
  setChk('siteEnableArticles', f.enableArticles !== false);
}

function populateAdsForm() {
  const s = dashboardData.settings || {};
  const m = s.monetag || {};
  const g = s.googleAdsense || {};

  // Master Network Radio
  const provider = s.adProvider || 'both';
  const radio = document.querySelector(`input[name="adProviderRadio"][value="${provider}"]`);
  if (radio) radio.checked = true;
  updateAdProviderBadge(provider);

  // Universal Placements
  const topEl = document.getElementById('enableTopBanner');
  if (topEl) topEl.checked = s.enableTopBanner !== false;

  const botEl = document.getElementById('enableBottomBanner');
  if (botEl) botEl.checked = s.enableBottomBanner !== false;

  const inFeedEl = document.getElementById('enableInFeedAds');
  if (inFeedEl) inFeedEl.checked = s.enableInFeedAds !== false;

  const adaptiveEl = document.getElementById('enableAdaptiveAds');
  if (adaptiveEl) adaptiveEl.checked = s.enableAdaptiveAds !== false;

  // Granular Ad Locations & Devices
  const loc = s.adLocations || {};
  const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
  setChk('adPageHome', loc.home !== false);
  setChk('adPageAppDetails', loc.appDetails !== false);
  setChk('adPageArticles', loc.articles !== false);
  setChk('adPageRunner', loc.runner !== false);
  setChk('adPageMillionaireApp', loc.millionaireApp !== false);
  setChk('adNeutralizeFloating', loc.neutralizeFloating !== false);
  setChk('adDeviceDesktop', loc.desktop !== false);
  setChk('adDeviceMobile', loc.mobile !== false);

  // Smart Ad Frequency & Experience Controls
  const freqRateEl = document.getElementById('adFrequencyRate');
  if (freqRateEl) freqRateEl.value = s.adFrequencyRate || 'relaxed';

  const cooldownEl = document.getElementById('adCooldownMinutes');
  if (cooldownEl) cooldownEl.value = typeof s.adCooldownMinutes === 'number' ? s.adCooldownMinutes : 10;

  const noPopupsEl = document.getElementById('disablePopupsInApps');
  if (noPopupsEl) noPopupsEl.checked = s.disablePopupsInApps !== false;

  const maxPopupsEl = document.getElementById('maxPopupsPerSession');
  if (maxPopupsEl) maxPopupsEl.value = typeof s.maxPopupsPerSession === 'number' ? s.maxPopupsPerSession : 2;

  const cleanRunnerEl = document.getElementById('cleanAppRunner');
  if (cleanRunnerEl) cleanRunnerEl.checked = s.cleanAppRunner !== false;

  const onClickEl = document.getElementById('enableOnClickAds');
  if (onClickEl) onClickEl.checked = !!s.enableOnClickAds;

  // Monetag
  const mEnabledEl = document.getElementById('monetagEnabled');
  if (mEnabledEl) mEnabledEl.checked = m.enabled !== false;

  const mTopEl = document.getElementById('monetagTopBannerCode');
  if (mTopEl) mTopEl.value = m.topBannerCode || s.topAdCode || "<script>(function(s){s.dataset.zone='12339753',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>";

  const mAdaptEl = document.getElementById('monetagAdaptiveCode');
  if (mAdaptEl) mAdaptEl.value = m.adaptiveCode || s.adaptiveAdCode || '<script src="https://quge5.com/88/tag.min.js" data-zone="314974" async data-cfasync="false"></script>';

  // Google AdSense
  const gEnabledEl = document.getElementById('adsenseEnabled');
  if (gEnabledEl) gEnabledEl.checked = g.enabled !== false;

  const gPubEl = document.getElementById('adsensePublisherId');
  if (gPubEl) gPubEl.value = g.publisherId || '';

  const gAutoEl = document.getElementById('adsenseAutoAds');
  if (gAutoEl) gAutoEl.checked = g.autoAds !== false;

  const gCustomEl = document.getElementById('adsenseCustomCode');
  if (gCustomEl) gCustomEl.value = g.customCode || '';

  // Rewarded Ads Program
  const r = s.rewardSystem || {};
  const rEnabledEl = document.getElementById('rewardSystemEnabled');
  if (rEnabledEl) rEnabledEl.checked = r.enabled !== false;

  const rPointsEl = document.getElementById('rewardPointsPerAd');
  if (rPointsEl) rPointsEl.value = typeof r.pointsPerAd === 'number' ? r.pointsPerAd : 50;

  const rDurationEl = document.getElementById('rewardAdDuration');
  if (rDurationEl) rDurationEl.value = typeof r.adDurationSeconds === 'number' ? r.adDurationSeconds : 15;

  const rCodeEl = document.getElementById('rewardAdCode');
  if (rCodeEl) rCodeEl.value = r.rewardAdCode || '';

  // General Direct Codes
  const botCodeEl = document.getElementById('bottomAdCode');
  if (botCodeEl) botCodeEl.value = s.bottomAdCode || '';

  const inFeedCodeEl = document.getElementById('inFeedAdCode');
  if (inFeedCodeEl) inFeedCodeEl.value = s.inFeedAdCode || '';

  const headScriptEl = document.getElementById('headerScript');
  if (headScriptEl) headScriptEl.value = s.headerScript || '';
}

function updateAdProviderBadge(provider) {
  const badge = document.getElementById('adProviderStatusBadge');
  if (!badge) return;

  if (provider === 'both') {
    badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    badge.textContent = 'كلا الشبكتين نشطتان (أعلى أرباح)';
  } else if (provider === 'monetag') {
    badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30';
    badge.textContent = 'Monetag فقط نشطة';
  } else if (provider === 'adsense') {
    badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30';
    badge.textContent = 'Google AdSense فقط نشطة';
  } else {
    badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
    badge.textContent = 'الإعلانات متوقفة مؤقتاً';
  }
}

function populateAIBloggerForm() {
  const b = dashboardData.aiBlogger || {};
  const freqEl = document.getElementById('aiFrequency') || document.getElementById('aiBloggerFrequency');
  if (freqEl && b.frequency) freqEl.value = b.frequency;

  const styleEl = document.getElementById('aiStyle') || document.getElementById('aiBloggerStyle');
  if (styleEl && (b.style || b.writingStyle)) styleEl.value = b.style || b.writingStyle;

  const autoEl = document.getElementById('aiAutoPublish') || document.getElementById('aiBloggerEnabled');
  if (autoEl) autoEl.checked = b.autoPublish !== false && b.enabled !== false;

  const lastRunEl = document.getElementById('aiLastRunTime');
  if (lastRunEl && b.lastRun) {
    lastRunEl.textContent = new Date(b.lastRun).toLocaleString('ar-EG');
  }
}

function setupAdminListeners() {
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('adminPasswordInput').value;
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        showDashboard();
        await loadDashboardData();
      } else {
        alert(data.message || 'كلمة المرور غير صحيحة');
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/admin/logout', { method: 'POST' });
      showLogin();
    });
  }

  // Save Settings Form
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        siteNameAr: document.getElementById('siteNameAr').value,
        siteNameEn: document.getElementById('siteNameEn').value,
        taglineAr: document.getElementById('taglineAr').value,
        taglineEn: document.getElementById('taglineEn').value,
        gridColumns: parseInt(document.getElementById('gridColumns').value) || 3,
        contactEmail: document.getElementById('contactEmail') ? document.getElementById('contactEmail').value.trim() : '',
        telegramLink: document.getElementById('telegramLink') ? document.getElementById('telegramLink').value.trim() : '',
        siteFeatures: {
          showNavbarReward: document.getElementById('siteShowNavbarReward') ? document.getElementById('siteShowNavbarReward').checked : true,
          showFloatingReward: document.getElementById('siteShowFloatingReward') ? document.getElementById('siteShowFloatingReward').checked : true,
          enableSearch: document.getElementById('siteEnableSearch') ? document.getElementById('siteEnableSearch').checked : true,
          enableArticles: document.getElementById('siteEnableArticles') ? document.getElementById('siteEnableArticles').checked : true
        }
      };

      const newPass = document.getElementById('newAdminPassword').value.trim();
      if (newPass) {
        payload.adminPassword = newPass;
      }

      await saveSettings(payload);
    });
  }

  // Save Ads Form
  const adsForm = document.getElementById('adsForm');
  if (adsForm) {
    document.querySelectorAll('input[name="adProviderRadio"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        updateAdProviderBadge(e.target.value);
      });
    });

    adsForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const selectedRadio = document.querySelector('input[name="adProviderRadio"]:checked');
      const adProvider = selectedRadio ? selectedRadio.value : 'both';

      const monetagTopCode = document.getElementById('monetagTopBannerCode').value;
      const monetagAdaptCode = document.getElementById('monetagAdaptiveCode').value;
      const getChk = (id, def = true) => { const el = document.getElementById(id); return el ? el.checked : def; };

      const payload = {
        adProvider: adProvider,
        enableTopBanner: getChk('enableTopBanner'),
        enableBottomBanner: getChk('enableBottomBanner'),
        enableInFeedAds: getChk('enableInFeedAds'),
        enableAdaptiveAds: getChk('enableAdaptiveAds'),
        adLocations: {
          home: getChk('adPageHome'),
          appDetails: getChk('adPageAppDetails'),
          articles: getChk('adPageArticles'),
          runner: getChk('adPageRunner'),
          millionaireApp: getChk('adPageMillionaireApp'),
          neutralizeFloating: getChk('adNeutralizeFloating'),
          desktop: getChk('adDeviceDesktop'),
          mobile: getChk('adDeviceMobile')
        },
        adFrequencyRate: document.getElementById('adFrequencyRate') ? document.getElementById('adFrequencyRate').value : 'relaxed',
        adCooldownMinutes: parseInt(document.getElementById('adCooldownMinutes') ? document.getElementById('adCooldownMinutes').value : '10', 10) || 10,
        disablePopupsInApps: getChk('disablePopupsInApps'),
        maxPopupsPerSession: parseInt(document.getElementById('maxPopupsPerSession') ? document.getElementById('maxPopupsPerSession').value : '2', 10) || 2,
        cleanAppRunner: getChk('cleanAppRunner'),
        enableOnClickAds: getChk('enableOnClickAds', false),
        
        topAdCode: monetagTopCode,
        bottomAdCode: document.getElementById('bottomAdCode').value,
        inFeedAdCode: document.getElementById('inFeedAdCode').value,
        adaptiveAdCode: monetagAdaptCode,
        headerScript: document.getElementById('headerScript').value,

        monetag: {
          enabled: getChk('monetagEnabled'),
          topBannerZone: '12339753',
          adaptiveZone: '314974',
          serviceWorkerZone: '12339769',
          swFileName: 'sw(2).js',
          topBannerCode: monetagTopCode,
          adaptiveCode: monetagAdaptCode
        },

        googleAdsense: {
          enabled: getChk('adsenseEnabled'),
          publisherId: document.getElementById('adsensePublisherId').value.trim(),
          autoAds: getChk('adsenseAutoAds'),
          customCode: document.getElementById('adsenseCustomCode').value
        },

        rewardSystem: {
          enabled: getChk('rewardSystemEnabled'),
          pointsPerAd: parseInt(document.getElementById('rewardPointsPerAd') ? document.getElementById('rewardPointsPerAd').value : '50', 10) || 50,
          adDurationSeconds: parseInt(document.getElementById('rewardAdDuration') ? document.getElementById('rewardAdDuration').value : '15', 10) || 15,
          rewardAdCode: document.getElementById('rewardAdCode') ? document.getElementById('rewardAdCode').value : '',
          blockAutoPopups: true
        }
      };

      await saveSettings(payload);
    });
  }

  // Add/Edit App Form Modal
  const appModalForm = document.getElementById('appModalForm');
  if (appModalForm) {
    appModalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(appModalForm);
      
      const url = currentEditingAppId ? `/api/admin/apps/${currentEditingAppId}` : '/api/admin/apps';
      const method = currentEditingAppId ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method: method,
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          closeAppModal();
          await loadDashboardData();
          alert(data.message);
        } else {
          alert(data.message || 'حدث خطأ');
        }
      } catch (err) {
        alert('حدث خطأ في الاتصال بالخادم');
      }
    });
  }

  // Upload App Package (.ZIP) Form
  const uploadPackageForm = document.getElementById('uploadPackageForm');
  if (uploadPackageForm) {
    uploadPackageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const progress = document.getElementById('pkgUploadProgress');
      const submitBtn = document.getElementById('pkgSubmitBtn');

      if (progress) progress.classList.remove('hidden');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ الرفع والفك...';
      }

      const formData = new FormData(uploadPackageForm);

      try {
        const res = await fetch('/api/admin/apps/upload-package', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          closeUploadPackageModal();
          await loadDashboardData();
          alert(data.message || 'تم رفع واستخراج حزمة التطبيق ونشرها بنجاح!');
        } else {
          alert(data.message || 'فشل في رفع ومعالجة التطبيق');
        }
      } catch (err) {
        alert('حدث خطأ في الاتصال بالخادم أثناء رفع الحزمة');
      } finally {
        if (progress) progress.classList.add('hidden');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> <span>بدء الرفع والنشر المباشر</span>';
        }
      }
    });
  }

  // Save AI Blogger Settings
  const aiBloggerForm = document.getElementById('aiBloggerSettingsForm');
  if (aiBloggerForm) {
    aiBloggerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const freqEl = document.getElementById('aiFrequency') || document.getElementById('aiBloggerFrequency');
      const styleEl = document.getElementById('aiStyle') || document.getElementById('aiBloggerStyle');
      const autoEl = document.getElementById('aiAutoPublish') || document.getElementById('aiBloggerEnabled');

      const payload = {
        enabled: autoEl ? autoEl.checked : true,
        autoPublish: autoEl ? autoEl.checked : true,
        style: styleEl ? styleEl.value : 'unique_engaging',
        frequency: freqEl ? freqEl.value : 'daily'
      };
      try {
        const res = await fetch('/api/admin/ai-blogger/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          alert('تم حفظ إعدادات روبوت الذكاء الاصطناعي بنجاح!');
          await loadDashboardData();
        } else {
          alert(data.message || 'فشل الحفظ');
        }
      } catch (err) {
        alert('حدث خطأ في الاتصال');
      }
    });
  }
}

async function triggerAIBlogGeneration() {
  const btn = document.getElementById('btnGenerateNow') || document.getElementById('btnTriggerAIBlog');
  const originalContent = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>جارٍ صياغة المقال بالذكاء الاصطناعي...</span>';
  }
  try {
    const res = await fetch('/api/admin/ai-blogger/generate', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('تم بنجاح صياغة ونشر مقال جديد بواسطة الروبوت الذكي!');
      await loadDashboardData();
    } else {
      alert(data.message || 'فشل التوليد');
    }
  } catch (err) {
    alert('حدث خطأ أثناء التوليد');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }
  }
}

async function saveSettings(payload) {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('تم حفظ التعديلات بنجاح!');
      await loadDashboardData();
    } else {
      alert(data.message || 'فشل حفظ التعديلات');
    }
  } catch (err) {
    alert('حدث خطأ في الاتصال');
  }
}

function openAddAppModal() {
  currentEditingAppId = null;
  const form = document.getElementById('appModalForm');
  form.reset();
  document.getElementById('modalTitle').textContent = 'إضافة تطبيق جديد';
  document.getElementById('appModal').classList.add('active');
}

function openEditAppModal(id) {
  const app = (dashboardData.apps || []).find(a => a.id === id);
  if (!app) return;

  currentEditingAppId = id;
  const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val; };
  const titleEl = document.getElementById('modalTitle');
  if (titleEl) titleEl.textContent = 'تعديل التطبيق: ' + (app.nameAr || '');

  setVal('appNameAr', app.nameAr || '');
  setVal('appNameEn', app.nameEn || '');
  setVal('appCategoryInput', app.category || 'tools');
  setVal('appRatingInput', app.rating || 4.8);
  setVal('appDownloadsCount', app.downloadsCount || '10K+');
  setVal('appDownloadUrl', app.downloadUrl || '');
  setVal('appWebAppUrl', app.webAppUrl || '');
  setVal('appIconUrl', app.icon || '');
  const featEl = document.getElementById('appFeatured');
  if (featEl) featEl.checked = !!app.featured;
  setVal('appShortDescAr', app.shortDescAr || '');
  setVal('appShortDescEn', app.shortDescEn || '');
  setVal('appFeaturesAr', (app.featuresAr || []).join('\n'));
  setVal('appFeaturesEn', (app.featuresEn || []).join('\n'));
  setVal('appFullDescAr', app.fullDescAr || '');
  setVal('appFullDescEn', app.fullDescEn || '');

  const modal = document.getElementById('appModal');
  if (modal) modal.classList.add('active');
}

function closeAppModal() {
  document.getElementById('appModal').classList.remove('active');
}

function openUploadPackageModal() {
  const form = document.getElementById('uploadPackageForm');
  if (form) form.reset();
  const progress = document.getElementById('pkgUploadProgress');
  if (progress) progress.classList.add('hidden');
  const btn = document.getElementById('pkgSubmitBtn');
  if (btn) btn.disabled = false;
  document.getElementById('uploadPackageModal').classList.add('active');
}

function closeUploadPackageModal() {
  document.getElementById('uploadPackageModal').classList.remove('active');
}

async function deleteApp(id) {
  if (!confirm('هل أنت متأكد من رغبتك في حذف هذا التطبيق نهائياً؟')) return;
  try {
    const res = await fetch(`/api/admin/apps/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await loadDashboardData();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('فشل في حذف التطبيق');
  }
}

async function deleteMessage(id) {
  if (!confirm('حذف هذه الرسالة؟')) return;
  try {
    const res = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await loadDashboardData();
    }
  } catch (err) {
    alert('فشل حذف الرسالة');
  }
}

async function deleteArticle(id) {
  if (!confirm('هل تريد بالتأكيد حذف هذا المقال نهائياً؟')) return;
  try {
    const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await loadDashboardData();
    } else {
      alert(data.message || 'فشل حذف المقال');
    }
  } catch (err) {
    alert('فشل في حذف المقال');
  }
}

// Tab navigation within admin panel
function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.admin-nav-btn').forEach(el => el.classList.remove('bg-emerald-500/20', 'text-emerald-400'));
  
  const target = document.getElementById(tabId);
  if (target) target.classList.remove('hidden');

  const btn = document.getElementById('btn-' + tabId);
  if (btn) btn.classList.add('bg-emerald-500/20', 'text-emerald-400');
}
