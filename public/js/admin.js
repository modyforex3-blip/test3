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
          <button onclick="openEditAppModal('${app.id}')" class="p-2 text-amber-400 hover:text-amber-300" title="تعديل"><i class="fas fa-edit"></i></button>
          <button onclick="deleteApp('${app.id}')" class="p-2 text-rose-500 hover:text-rose-400" title="حذف"><i class="fas fa-trash"></i></button>
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
  document.getElementById('siteNameAr').value = s.siteNameAr || '';
  document.getElementById('siteNameEn').value = s.siteNameEn || '';
  document.getElementById('taglineAr').value = s.taglineAr || '';
  document.getElementById('taglineEn').value = s.taglineEn || '';
  document.getElementById('gridColumns').value = s.gridColumns || 3;
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
  const enabledEl = document.getElementById('aiBloggerEnabled');
  if (enabledEl) enabledEl.checked = b.enabled !== false;
  const catEl = document.getElementById('aiBloggerCategory');
  if (catEl && b.category) catEl.value = b.category;
  const styleEl = document.getElementById('aiBloggerStyle');
  if (styleEl && b.writingStyle) styleEl.value = b.writingStyle;
  const freqEl = document.getElementById('aiBloggerFrequency');
  if (freqEl && b.frequency) freqEl.value = b.frequency;

  const statusBadge = document.getElementById('aiBloggerStatusBadge');
  if (statusBadge) {
    if (b.enabled !== false) {
      statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      statusBadge.textContent = 'نشط ويعمل تلقائياً';
    } else {
      statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30';
      statusBadge.textContent = 'متوقف مؤقتاً';
    }
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
        gridColumns: parseInt(document.getElementById('gridColumns').value) || 3
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

      const payload = {
        adProvider: adProvider,
        enableTopBanner: document.getElementById('enableTopBanner').checked,
        enableBottomBanner: document.getElementById('enableBottomBanner').checked,
        enableInFeedAds: document.getElementById('enableInFeedAds').checked,
        enableAdaptiveAds: document.getElementById('enableAdaptiveAds').checked,
        adFrequencyRate: document.getElementById('adFrequencyRate') ? document.getElementById('adFrequencyRate').value : 'relaxed',
        adCooldownMinutes: parseInt(document.getElementById('adCooldownMinutes') ? document.getElementById('adCooldownMinutes').value : '10', 10) || 10,
        disablePopupsInApps: document.getElementById('disablePopupsInApps') ? document.getElementById('disablePopupsInApps').checked : true,
        maxPopupsPerSession: parseInt(document.getElementById('maxPopupsPerSession') ? document.getElementById('maxPopupsPerSession').value : '2', 10) || 2,
        cleanAppRunner: document.getElementById('cleanAppRunner') ? document.getElementById('cleanAppRunner').checked : true,
        enableOnClickAds: document.getElementById('enableOnClickAds') ? document.getElementById('enableOnClickAds').checked : false,
        
        topAdCode: monetagTopCode,
        bottomAdCode: document.getElementById('bottomAdCode').value,
        inFeedAdCode: document.getElementById('inFeedAdCode').value,
        adaptiveAdCode: monetagAdaptCode,
        headerScript: document.getElementById('headerScript').value,

        monetag: {
          enabled: document.getElementById('monetagEnabled').checked,
          topBannerZone: '12339753',
          adaptiveZone: '314974',
          serviceWorkerZone: '12339769',
          swFileName: 'sw(2).js',
          topBannerCode: monetagTopCode,
          adaptiveCode: monetagAdaptCode
        },

        googleAdsense: {
          enabled: document.getElementById('adsenseEnabled').checked,
          publisherId: document.getElementById('adsensePublisherId').value.trim(),
          autoAds: document.getElementById('adsenseAutoAds').checked,
          customCode: document.getElementById('adsenseCustomCode').value
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

  // AI Blogger Manual Trigger
  const btnTriggerAI = document.getElementById('btnTriggerAIBlog');
  if (btnTriggerAI) {
    btnTriggerAI.addEventListener('click', async () => {
      const originalContent = btnTriggerAI.innerHTML;
      btnTriggerAI.disabled = true;
      btnTriggerAI.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ صياغة المقال بالذكاء الاصطناعي...';
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
        btnTriggerAI.disabled = false;
        btnTriggerAI.innerHTML = originalContent;
      }
    });
  }

  // Save AI Blogger Settings
  const aiBloggerForm = document.getElementById('aiBloggerSettingsForm');
  if (aiBloggerForm) {
    aiBloggerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        enabled: document.getElementById('aiBloggerEnabled').checked,
        category: document.getElementById('aiBloggerCategory').value,
        writingStyle: document.getElementById('aiBloggerStyle').value,
        frequency: document.getElementById('aiBloggerFrequency').value
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
  const app = dashboardData.apps.find(a => a.id === id);
  if (!app) return;

  currentEditingAppId = id;
  document.getElementById('modalTitle').textContent = 'تعديل التطبيق: ' + app.nameAr;
  document.getElementById('appNameAr').value = app.nameAr || '';
  document.getElementById('appNameEn').value = app.nameEn || '';
  document.getElementById('appCategoryInput').value = app.category || 'tools';
  document.getElementById('appRatingInput').value = app.rating || 4.8;
  document.getElementById('appDownloadsCount').value = app.downloadsCount || '10K+';
  document.getElementById('appDownloadUrl').value = app.downloadUrl || '';
  document.getElementById('appWebAppUrl').value = app.webAppUrl || '';
  document.getElementById('appIconUrl').value = app.icon || '';
  document.getElementById('appFeatured').checked = !!app.featured;
  document.getElementById('appShortDescAr').value = app.shortDescAr || '';
  document.getElementById('appShortDescEn').value = app.shortDescEn || '';
  document.getElementById('appFeaturesAr').value = (app.featuresAr || []).join('\n');
  document.getElementById('appFeaturesEn').value = (app.featuresEn || []).join('\n');
  document.getElementById('appFullDescAr').value = app.fullDescAr || '';
  document.getElementById('appFullDescEn').value = app.fullDescEn || '';

  document.getElementById('appModal').classList.add('active');
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
