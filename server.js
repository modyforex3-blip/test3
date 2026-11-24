const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const cors = require('cors');

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('millionaire-secret-key-2026'));
app.use(express.static(path.join(__dirname, 'public')));

// Simple Auth Middleware
function requireAdmin(req, res, next) {
  const db = readDatabase();
  const token = req.cookies['millionaire_admin_token'];
  const expectedPassword = db.settings.adminPassword || 'admin123millionaire';

  if (token && token === Buffer.from(expectedPassword).toString('base64')) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'غير مصرح لك بالوصول (Unauthorized)' });
}

// ---------------- PUBLIC API ROUTES ----------------

// Get site public data & apps list
app.get('/api/public-data', (req, res) => {
  const db = readDatabase();
  const safeSettings = { ...db.settings };
  delete safeSettings.adminPassword; // never expose password

  res.json({
    success: true,
    settings: safeSettings,
    apps: db.apps || []
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
  const validPassword = db.settings.adminPassword || 'admin123millionaire';

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
  const expectedPassword = db.settings.adminPassword || 'admin123millionaire';

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
    messages: db.messages || []
  });
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

// Wildcard routing to serve pages
app.get('/app/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/run/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'run.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 خادم موقع مليونير يعمل بنجاح على: http://localhost:${PORT}`);
});
