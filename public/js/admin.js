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
  document.getElementById('enableTopBanner').checked = !!s.enableTopBanner;
  document.getElementById('enableBottomBanner').checked = !!s.enableBottomBanner;
  document.getElementById('enableInFeedAds').checked = !!s.enableInFeedAds;
  document.getElementById('topAdCode').value = s.topAdCode || '';
  document.getElementById('bottomAdCode').value = s.bottomAdCode || '';
  document.getElementById('inFeedAdCode').value = s.inFeedAdCode || '';
  document.getElementById('headerScript').value = s.headerScript || '';
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
    adsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        enableTopBanner: document.getElementById('enableTopBanner').checked,
        enableBottomBanner: document.getElementById('enableBottomBanner').checked,
        enableInFeedAds: document.getElementById('enableInFeedAds').checked,
        topAdCode: document.getElementById('topAdCode').value,
        bottomAdCode: document.getElementById('bottomAdCode').value,
        inFeedAdCode: document.getElementById('inFeedAdCode').value,
        headerScript: document.getElementById('headerScript').value
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
