const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const aiBlogger = require('./ai-blogger');

let AdmZip;
try {
  AdmZip = require('adm-zip');
} catch (e) {
  // AdmZip will be loaded after npm install on server or fallback to tar/powershell
}

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dbPath = path.join(dataDir, 'database.json');

// Helper to read and write database
function readDatabase() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading database:', err);
  }
  return { settings: {}, apps: [], messages: [] };
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing database:', err);
    return false;
  }
}

// Multer storage for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'app-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('الملف يجب أن يكون صورة'));
    }
  }
});

// Multer storage for app package ZIP uploads (up to 100MB)
const tempPackagesDir = path.join(uploadsDir, 'temp-packages');
if (!fs.existsSync(tempPackagesDir)) fs.mkdirSync(tempPackagesDir, { recursive: true });

const packageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempPackagesDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'pkg-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
  }
});

const uploadPackage = multer({
  storage: packageStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Robust ZIP extraction helper with multiple fallbacks
function extractZipToDirectory(zipPath, targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Try AdmZip if available
  if (AdmZip) {
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(targetDir, true);
      return true;
    } catch (e) {
      console.warn('[ZIP] AdmZip warning, trying system extraction:', e.message);
    }
  }

  // 2. Try native tar (standard on Linux & modern Windows)
  try {
    execSync(`tar -xf "${zipPath}" -C "${targetDir}"`, { stdio: 'pipe' });
    return true;
  } catch (err) {
    console.warn('[ZIP] tar warning, trying fallback:', err.message);
  }

  // 3. Try PowerShell Expand-Archive (Windows fallback)
  if (process.platform === 'win32') {
    try {
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`, { stdio: 'pipe' });
      return true;
    } catch (err) {
      console.warn('[ZIP] PowerShell warning:', err.message);
    }
  }

  // 4. Try Linux unzip
  try {
    execSync(`unzip -o "${zipPath}" -d "${targetDir}"`, { stdio: 'pipe' });
    return true;
  } catch (err) {
    console.error('[ZIP] Linux unzip error:', err.message);
  }

  return false;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('millionaire-secret-key-2026'));
// Monetag Service Worker Verification & Adaptive Ads Routes (Must be BEFORE express.static to set Service-Worker-Allowed header)
app.use((req, res, next) => {
  const cleanPath = req.url.split('?')[0];
  if (cleanPath === '/sw(2).js' || cleanPath === '/sw%282%29.js' || cleanPath === '/sw-2.js') {
    res.set('Content-Type', 'application/javascript; charset=UTF-8');
    res.set('Service-Worker-Allowed', '/');
    const rootSw2 = path.join(__dirname, 'sw(2).js');
    if (fs.existsSync(rootSw2)) return res.sendFile(rootSw2);
    const pubSw2 = path.join(__dirname, 'public', 'sw(2).js');
    if (fs.existsSync(pubSw2)) return res.sendFile(pubSw2);
    return res.status(404).send('// Service worker sw(2).js not found');
  }

  if (cleanPath === '/sw.js') {
    res.set('Content-Type', 'application/javascript; charset=UTF-8');
    res.set('Service-Worker-Allowed', '/');
    const rootSw = path.join(__dirname, 'sw.js');
    if (fs.existsSync(rootSw)) return res.sendFile(rootSw);
    return res.sendFile(path.join(__dirname, 'public', 'sw.js'));
  }

  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.apk')) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="millionaire-os.apk"');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    } else if (filePath.endsWith('.aab')) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="millionaire-os.aab"');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }
}));

// Simple Auth Middleware
function requireAdmin(req, res, next) {
  const db = readDatabase();
  const token = req.cookies['millionaire_admin_token'];
  const expectedPassword = db.settings.adminPassword || 'Ab527149';

  if (token && token === Buffer.from(expectedPassword).toString('base64')) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'غير مصرح لك بالوصول (Unauthorized)' });
}

// ---------------- PUBLIC API ROUTES ----------------

// Get site public data & apps & articles list
app.get('/api/public-data', (req, res) => {
  const db = readDatabase();
  const safeSettings = { ...db.settings };
  delete safeSettings.adminPassword; // never expose password

  res.json({
    success: true,
    settings: safeSettings,
    apps: db.apps || [],
    articles: db.articles || []
  });
});

// Get all articles (for news section / blog)
app.get('/api/articles', (req, res) => {
  const db = readDatabase();
  res.json({ success: true, articles: db.articles || [] });
});

// Get single article details
app.get('/api/articles/:id', (req, res) => {
  const db = readDatabase();
  const article = (db.articles || []).find(a => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ success: false, message: 'المقال غير موجود' });
  }

  const relatedArticles = (db.articles || []).filter(a => a.id !== req.params.id).slice(0, 3);
  const safeSettings = { ...db.settings };
  delete safeSettings.adminPassword;

  res.json({
    success: true,
    article,
    relatedArticles,
    settings: safeSettings
  });
});

// Get single app details
app.get('/api/apps/:id', (req, res) => {
  const db = readDatabase();
  const appItem = (db.apps || []).find(a => a.id === req.params.id);
  if (!appItem) {
    return res.status(404).json({ success: false, message: 'التطبيق غير موجود' });
  }

  // Also return 3 related apps from same or any category
  const relatedApps = (db.apps || [])
    .filter(a => a.id !== req.params.id)
    .slice(0, 3);

  const safeSettings = { ...db.settings };
  delete safeSettings.adminPassword;

  res.json({
    success: true,
    app: appItem,
    relatedApps,
    settings: safeSettings
  });
});

// Submit contact form
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول المطلوبة' });
  }

  const db = readDatabase();
  if (!db.messages) db.messages = [];

  const newMessage = {
    id: 'msg-' + Date.now(),
    name: name.trim(),
    email: email.trim(),
    subject: (subject || 'رسالة جديدة').trim(),
    message: message.trim(),
    createdAt: new Date().toISOString(),
    isRead: false
  };

  db.messages.unshift(newMessage);
  writeDatabase(db);

  res.json({ success: true, message: 'تم استلام رسالتك بنجاح، سنتواصل معك قريباً!' });
});

// ---------------- ADMIN AUTH & API ROUTES ----------------

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const db = readDatabase();
  const validPassword = db.settings.adminPassword || 'Ab527149';

  if (password === validPassword) {
    const token = Buffer.from(validPassword).toString('base64');
    res.cookie('millionaire_admin_token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax'
    });
    return res.json({ success: true, message: 'تم تسجيل الدخول بنجاح' });
  }

  return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
});

// Admin Check Auth
app.get('/api/admin/check-auth', (req, res) => {
  const db = readDatabase();
  const token = req.cookies['millionaire_admin_token'];
  const expectedPassword = db.settings.adminPassword || 'Ab527149';

  if (token && token === Buffer.from(expectedPassword).toString('base64')) {
    return res.json({ success: true, authenticated: true });
  }
  return res.json({ success: false, authenticated: false });
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('millionaire_admin_token');
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

// Admin full dashboard data
app.get('/api/admin/dashboard-data', requireAdmin, (req, res) => {
  const db = readDatabase();
  res.json({
    success: true,
    settings: db.settings,
    apps: db.apps || [],
    messages: db.messages || [],
    articles: db.articles || [],
    aiBlogger: db.aiBlogger || { enabled: true, frequency: "daily", autoPublish: true }
  });
});

// Admin AI Blogger manual trigger: generate new article immediately
app.post('/api/admin/ai-blogger/generate', requireAdmin, (req, res) => {
  try {
    const article = aiBlogger.generateNewArticle(req.body.category);
    res.json({
      success: true,
      article,
      message: 'تم توليد ونشر مقال تقني فريد جديد فوراً بنجاح!'
    });
  } catch (err) {
    console.error('AI Blogger manual error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء توليد المقال' });
  }
});

// Admin AI Blogger update settings
app.post('/api/admin/ai-blogger/settings', requireAdmin, (req, res) => {
  const db = readDatabase();
  db.aiBlogger = {
    ...(db.aiBlogger || {}),
    ...req.body
  };
  writeDatabase(db);
  res.json({ success: true, aiBlogger: db.aiBlogger, message: 'تم حفظ إعدادات روبوت الذكاء الاصطناعي بنجاح' });
});

// Admin delete article
app.delete('/api/admin/articles/:id', requireAdmin, (req, res) => {
  const db = readDatabase();
  db.articles = (db.articles || []).filter(a => a.id !== req.params.id);
  writeDatabase(db);
  res.json({ success: true, message: 'تم حذف المقال بنجاح' });
});

// Admin add new app
app.post('/api/admin/apps', requireAdmin, upload.single('iconFile'), (req, res) => {
  try {
    const db = readDatabase();
    if (!db.apps) db.apps = [];

    let iconUrl = req.body.iconUrl || '';
    if (req.file) {
      iconUrl = '/uploads/' + req.file.filename;
    }
    if (!iconUrl) {
      iconUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80';
    }

    // Parse features if string
    let featuresAr = [];
    let featuresEn = [];
    if (typeof req.body.featuresAr === 'string') {
      featuresAr = req.body.featuresAr.split('\n').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(req.body.featuresAr)) {
      featuresAr = req.body.featuresAr;
    }

    if (typeof req.body.featuresEn === 'string') {
      featuresEn = req.body.featuresEn.split('\n').map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(req.body.featuresEn)) {
      featuresEn = req.body.featuresEn;
    }

    const newApp = {
      id: 'app-' + Date.now(),
      nameAr: req.body.nameAr || 'تطبيق جديد',
      nameEn: req.body.nameEn || 'New App',
      category: req.body.category || 'tools',
      icon: iconUrl,
      shortDescAr: req.body.shortDescAr || '',
      shortDescEn: req.body.shortDescEn || '',
      fullDescAr: req.body.fullDescAr || '',
      fullDescEn: req.body.fullDescEn || '',
      featuresAr: featuresAr.length > 0 ? featuresAr : ['ميزة رقم 1', 'ميزة رقم 2'],
      featuresEn: featuresEn.length > 0 ? featuresEn : ['Feature 1', 'Feature 2'],
      downloadUrl: req.body.downloadUrl || '#',
      webAppUrl: req.body.webAppUrl || '',
      rating: parseFloat(req.body.rating) || 4.8,
      featured: req.body.featured === 'true' || req.body.featured === true,
      downloadsCount: req.body.downloadsCount || '10K+',
      createdAt: new Date().toISOString()
    };

    db.apps.unshift(newApp);
    writeDatabase(db);

    res.json({ success: true, app: newApp, message: 'تمت إضافة التطبيق بنجاح' });
  } catch (err) {
    console.error('Error adding app:', err);
    res.status(500).json({ success: false, message: 'فشل في إضافة التطبيق' });
  }
});

// Admin upload entire App Package (.ZIP, Uncompressed Folder, or Single HTML) directly to platform
app.post('/api/admin/apps/upload-package', requireAdmin, uploadPackage.fields([
  { name: 'packageZip', maxCount: 1 },
  { name: 'folderFiles', maxCount: 500 },
  { name: 'singleHtmlFile', maxCount: 1 },
  { name: 'iconFile', maxCount: 1 }
]), (req, res) => {
  try {
    const files = req.files || {};
    const packageFile = files.packageZip ? files.packageZip[0] : null;
    const folderFiles = files.folderFiles || [];
    const singleHtmlFile = files.singleHtmlFile ? files.singleHtmlFile[0] : null;
    const iconFile = files.iconFile ? files.iconFile[0] : null;

    if (!packageFile && folderFiles.length === 0 && !singleHtmlFile) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار ملف مضغوط (.zip) أو مجلد غير مضغوط أو ملف HTML مفرد' });
    }

    // Determine slug
    let rawSlug = req.body.slug || req.body.nameEn || ('app-' + Date.now());
    const slug = rawSlug.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || ('app-' + Date.now());

    const appsBaseDir = path.join(__dirname, 'public', 'apps');
    if (!fs.existsSync(appsBaseDir)) fs.mkdirSync(appsBaseDir, { recursive: true });

    const targetDir = path.join(appsBaseDir, slug);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    if (packageFile) {
      // 1. Extract ZIP package
      const extracted = extractZipToDirectory(packageFile.path, targetDir);
      try { fs.unlinkSync(packageFile.path); } catch (_) {}
      if (!extracted) {
        return res.status(500).json({ success: false, message: 'فشل في فك ضغط ملف الحزمة البرمجية (.zip)' });
      }
    } else if (folderFiles.length > 0) {
      // 2. Uncompressed Folder upload preserving relative structure
      let relPaths = [];
      try {
        relPaths = req.body.folderPaths ? JSON.parse(req.body.folderPaths) : [];
      } catch (_) {}

      folderFiles.forEach((file, idx) => {
        const rawRel = (relPaths[idx] || file.originalname || '').replace(/\\/g, '/');
        const safeParts = rawRel.split('/').filter(part => part && part !== '.' && part !== '..');
        // Strip top-level selected folder name if present so index.html sits cleanly at root
        const relSubPath = safeParts.length > 1 ? safeParts.slice(1).join('/') : (safeParts[0] || file.originalname);
        const destPath = path.join(targetDir, relSubPath);
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        try {
          fs.renameSync(file.path, destPath);
        } catch (_) {
          fs.copyFileSync(file.path, destPath);
          try { fs.unlinkSync(file.path); } catch (__) {}
        }
      });
    } else if (singleHtmlFile) {
      // 3. Single HTML file upload -> index.html
      const destHtml = path.join(targetDir, 'index.html');
      try {
        fs.renameSync(singleHtmlFile.path, destHtml);
      } catch (_) {
        fs.copyFileSync(singleHtmlFile.path, destHtml);
        try { fs.unlinkSync(singleHtmlFile.path); } catch (__) {}
      }
    }

    // Normalize directory if all files were nested inside a single folder
    try {
      if (!fs.existsSync(path.join(targetDir, 'index.html'))) {
        const items = fs.readdirSync(targetDir);
        if (items.length === 1 && fs.statSync(path.join(targetDir, items[0])).isDirectory()) {
          const subDirPath = path.join(targetDir, items[0]);
          if (fs.existsSync(path.join(subDirPath, 'index.html'))) {
            const subItems = fs.readdirSync(subDirPath);
            for (const item of subItems) {
              const src = path.join(subDirPath, item);
              const dst = path.join(targetDir, item);
              if (!fs.existsSync(dst)) {
                fs.renameSync(src, dst);
              }
            }
          }
        }
      }
    } catch (normErr) {
      console.warn('Folder normalization warning:', normErr.message);
    }

    // Inject Anti-Copy & Anti-Theft Protection Shield into index.html if enabled
    const protectSource = req.body.protectSource !== 'false';
    const indexHtmlPath = path.join(targetDir, 'index.html');
    if (protectSource && fs.existsSync(indexHtmlPath)) {
      try {
        let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
        if (!htmlContent.includes('/js/app-protect.js')) {
          const shieldTag = '\n  <!-- Millionaire Anti-Copy & Anti-Theft Shield -->\n  <script src="/js/app-protect.js"></script>\n';
          if (htmlContent.includes('</head>')) {
            htmlContent = htmlContent.replace('</head>', `${shieldTag}</head>`);
          } else if (htmlContent.includes('</body>')) {
            htmlContent = htmlContent.replace('</body>', `${shieldTag}</body>`);
          } else {
            htmlContent = shieldTag + htmlContent;
          }
          fs.writeFileSync(indexHtmlPath, htmlContent, 'utf8');
        }
      } catch (shieldErr) {
        console.warn('Anti-copy shield injection warning:', shieldErr.message);
      }
    }

    // Determine icon
    let iconUrl = req.body.iconUrl || '';
    if (iconFile) {
      const finalIconName = 'icon-' + slug + path.extname(iconFile.originalname);
      const finalIconPath = path.join(uploadsDir, finalIconName);
      try {
        fs.renameSync(iconFile.path, finalIconPath);
        iconUrl = '/uploads/' + finalIconName;
      } catch (e) {
        iconUrl = '/uploads/' + iconFile.filename;
      }
    }
    if (!iconUrl) {
      if (fs.existsSync(path.join(targetDir, 'icon.svg'))) {
        iconUrl = `/apps/${slug}/icon.svg`;
      } else if (fs.existsSync(path.join(targetDir, 'icon.png'))) {
        iconUrl = `/apps/${slug}/icon.png`;
      } else {
        iconUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80';
      }
    }

    // Parse features
    let featuresAr = ['واجهة تفاعلية حديثة وسريعة', 'متوافق بالكامل مع الهواتف الذكية والتطبيقات التقدمية (PWA)'];
    if (req.body.featuresAr) {
      if (typeof req.body.featuresAr === 'string') {
        featuresAr = req.body.featuresAr.split('\n').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(req.body.featuresAr)) {
        featuresAr = req.body.featuresAr;
      }
    }
    let featuresEn = ['Modern ultra-fast responsive user interface', 'Fully mobile and PWA compliant'];
    if (req.body.featuresEn) {
      if (typeof req.body.featuresEn === 'string') {
        featuresEn = req.body.featuresEn.split('\n').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(req.body.featuresEn)) {
        featuresEn = req.body.featuresEn;
      }
    }

    const newApp = {
      id: 'app-' + slug,
      slug: slug,
      nameAr: req.body.nameAr || slug,
      nameEn: req.body.nameEn || slug,
      category: req.body.category || 'tools',
      icon: iconUrl,
      shortDescAr: req.body.shortDescAr || 'تطبيق ويب سحابي متطور متاح عبر منصة مليونير.',
      shortDescEn: req.body.shortDescEn || 'Advanced web application available on Millionaire platform.',
      fullDescAr: req.body.fullDescAr || req.body.shortDescAr || 'تطبيق ويب سحابي متطور.',
      fullDescEn: req.body.fullDescEn || req.body.shortDescEn || 'Advanced web application.',
      featuresAr,
      featuresEn,
      webAppUrl: `/apps/${slug}/index.html`,
      downloadUrl: req.body.downloadUrl || '#',
      rating: parseFloat(req.body.rating) || 4.9,
      featured: req.body.featured === 'true' || req.body.featured === true,
      downloadsCount: req.body.downloadsCount || '10K+',
      isPwa: true,
      createdAt: new Date().toISOString()
    };

    const db = readDatabase();
    if (!db.apps) db.apps = [];

    // Check if app already exists -> update or prepend
    const existingIndex = db.apps.findIndex(a => a.id === newApp.id || a.slug === slug);
    if (existingIndex !== -1) {
      db.apps[existingIndex] = { ...db.apps[existingIndex], ...newApp };
    } else {
      db.apps.unshift(newApp);
    }

    writeDatabase(db);

    res.json({
      success: true,
      app: newApp,
      message: `تم رفع ونشر حزمة تطبيق [${newApp.nameAr}] بنجاح، وأصبح جاهزاً للتشغيل!`
    });
  } catch (err) {
    console.error('Error uploading app package:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء رفع ومعالجة الحزمة: ' + err.message });
  }
});

// Admin update app
app.put('/api/admin/apps/:id', requireAdmin, upload.single('iconFile'), (req, res) => {
  try {
    const db = readDatabase();
    const appIndex = (db.apps || []).findIndex(a => a.id === req.params.id);
    if (appIndex === -1) {
      return res.status(404).json({ success: false, message: 'التطبيق غير موجود' });
    }

    let iconUrl = req.body.iconUrl || db.apps[appIndex].icon;
    if (req.file) {
      iconUrl = '/uploads/' + req.file.filename;
    }

    let featuresAr = db.apps[appIndex].featuresAr;
    if (typeof req.body.featuresAr === 'string') {
      featuresAr = req.body.featuresAr.split('\n').map(s => s.trim()).filter(Boolean);
    }

    let featuresEn = db.apps[appIndex].featuresEn;
    if (typeof req.body.featuresEn === 'string') {
      featuresEn = req.body.featuresEn.split('\n').map(s => s.trim()).filter(Boolean);
    }

    db.apps[appIndex] = {
      ...db.apps[appIndex],
      nameAr: req.body.nameAr !== undefined ? req.body.nameAr : db.apps[appIndex].nameAr,
      nameEn: req.body.nameEn !== undefined ? req.body.nameEn : db.apps[appIndex].nameEn,
      category: req.body.category !== undefined ? req.body.category : db.apps[appIndex].category,
      icon: iconUrl,
      shortDescAr: req.body.shortDescAr !== undefined ? req.body.shortDescAr : db.apps[appIndex].shortDescAr,
      shortDescEn: req.body.shortDescEn !== undefined ? req.body.shortDescEn : db.apps[appIndex].shortDescEn,
      fullDescAr: req.body.fullDescAr !== undefined ? req.body.fullDescAr : db.apps[appIndex].fullDescAr,
      fullDescEn: req.body.fullDescEn !== undefined ? req.body.fullDescEn : db.apps[appIndex].fullDescEn,
      featuresAr,
      featuresEn,
      downloadUrl: req.body.downloadUrl !== undefined ? req.body.downloadUrl : db.apps[appIndex].downloadUrl,
      webAppUrl: req.body.webAppUrl !== undefined ? req.body.webAppUrl : (db.apps[appIndex].webAppUrl || ''),
      rating: req.body.rating !== undefined ? parseFloat(req.body.rating) : db.apps[appIndex].rating,
      featured: req.body.featured === 'true' || req.body.featured === true,
      downloadsCount: req.body.downloadsCount || db.apps[appIndex].downloadsCount,
      updatedAt: new Date().toISOString()
    };

    writeDatabase(db);
    res.json({ success: true, app: db.apps[appIndex], message: 'تم تحديث بيانات التطبيق بنجاح' });
  } catch (err) {
    console.error('Error updating app:', err);
    res.status(500).json({ success: false, message: 'فشل في تحديث التطبيق' });
  }
});

// Admin delete app
app.delete('/api/admin/apps/:id', requireAdmin, (req, res) => {
  const db = readDatabase();
  const initialLength = db.apps.length;
  db.apps = (db.apps || []).filter(a => a.id !== req.params.id);

  if (db.apps.length === initialLength) {
    return res.status(404).json({ success: false, message: 'التطبيق غير موجود' });
  }

  writeDatabase(db);
  res.json({ success: true, message: 'تم حذف التطبيق بنجاح' });
});

// Admin update settings & ads
app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const db = readDatabase();
  db.settings = {
    ...db.settings,
    ...req.body
  };
  writeDatabase(db);
  res.json({ success: true, settings: db.settings, message: 'تم حفظ إعدادات الموقع والإعلانات بنجاح' });
});

// Admin delete message
app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const db = readDatabase();
  db.messages = (db.messages || []).filter(m => m.id !== req.params.id);
  writeDatabase(db);
  res.json({ success: true, message: 'تم حذف الرسالة بنجاح' });
});

// Dynamic SEO Sitemap & Robots.txt
app.get('/sitemap.xml', (req, res) => {
  const db = readDatabase();
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/contact', priority: '0.6', changefreq: 'monthly' },
    { loc: '/privacy', priority: '0.4', changefreq: 'monthly' },
    { loc: '/reward', priority: '0.7', changefreq: 'weekly' }
  ];

  const appUrls = (db.apps || []).map(app => ({
    loc: `/app.html?id=${encodeURIComponent(app.id)}`,
    priority: '0.9',
    changefreq: 'weekly',
    lastmod: (app.createdAt || today).split('T')[0]
  }));

  const articleUrls = (db.articles || []).map(art => ({
    loc: `/article.html?id=${encodeURIComponent(art.id)}`,
    priority: '0.8',
    changefreq: 'weekly',
    lastmod: (art.publishedAt || today).split('T')[0]
  }));

  const allUrls = [...staticPages, ...appUrls, ...articleUrls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${baseUrl}${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.send(xml);
});

app.get('/robots.txt', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin.html
Disallow: /api/admin/

Sitemap: ${baseUrl}/sitemap.xml
`);
});

// Wildcard routing to serve pages
app.get('/app/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/run/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'run.html'));
});

app.get('/article/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'article.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/reward', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reward.html'));
});

app.get('/reward-ad', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reward.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check endpoint for Render & Uptime monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'active',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 خادم موقع مليونير يعمل بنجاح على: http://localhost:${PORT}`);

  // Start AI Auto-Blogger Daily Scheduler
  aiBlogger.initAIBloggerScheduler();

  // Safe Auto-Keep-Alive Mechanism (100% Legal & Safe):
  // Render spins down free services after 15 min of inactivity.
  // Render automatically injects process.env.RENDER_EXTERNAL_URL (e.g. https://xxxx.onrender.com).
  // A gentle self-ping every 13 minutes keeps the instance warm without violating Render or GitHub terms.
  const appUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
  if (appUrl) {
    console.log(`⚡ تفعيل نظام التنبيه الذكي للإبقاء على الموقع نشطاً: ${appUrl}`);
    const PING_INTERVAL = 13 * 60 * 1000; // 13 minutes
    setInterval(async () => {
      try {
        const pingUrl = `${appUrl}/health`;
        const res = await fetch(pingUrl);
        if (res.ok) {
          console.log(`[Keep-Alive] تم فحص وتنشيط السيرفر بنجاح: ${new Date().toLocaleTimeString()}`);
        }
      } catch (err) {
        console.warn('[Keep-Alive] تنبيه اتصال:', err.message);
      }
    }, PING_INTERVAL);
  }
});
