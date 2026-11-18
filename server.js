const express = require('express');
const helmet = require('helmet');
const cookieSession = require('cookie-session');
const multer = require('multer');
const yauzl = require('yauzl');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { promisify } = require('node:util');

const app = express();
const port = Number(process.env.PORT || 3000);
const baseDomain = (process.env.BASE_DOMAIN || 'millionair.site').toLowerCase();
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const appsDir = path.join(dataDir, 'apps');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 1 } });

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
  throw new Error('Set ADMIN_USERNAME, ADMIN_PASSWORD, and SESSION_SECRET environment variables.');
}
if (process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
fs.mkdirSync(appsDir, { recursive: true });

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use(cookieSession({
  name: 'millionair_admin',
  keys: [process.env.SESSION_SECRET],
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000
}));

const safeSlug = value => typeof value === 'string' && /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(value);
const equalSecret = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && require('node:crypto').timingSafeEqual(left, right);
};
const requireAdmin = (req, res, next) => req.session?.admin ? next() : res.status(401).json({ error: 'سجّل الدخول أولاً.' });
const requireActionHeader = (req, res, next) => req.get('x-admin-action') === '1' ? next() : res.sendStatus(403);

function listApps() {
  return fs.readdirSync(appsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && safeSlug(entry.name) && fs.existsSync(path.join(appsDir, entry.name, 'index.html')))
    .map(entry => ({ slug: entry.name, url: `https://${entry.name}.${baseDomain}` }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function extractZip(buffer, destination) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (openError, zip) => {
      if (openError) return reject(new Error('تعذرت قراءة ملف ZIP.'));
      let totalBytes = 0;
      let fileCount = 0;
      let settled = false;
      const fail = error => {
        if (settled) return;
        settled = true;
        zip.close();
        reject(error);
      };
      zip.on('error', fail);
      zip.on('end', () => {
        if (settled) return;
        settled = true;
        if (!fs.existsSync(path.join(destination, 'index.html'))) return reject(new Error('يجب أن يحتوي ZIP على index.html في المجلد الرئيسي.'));
        resolve();
      });
      zip.on('entry', entry => {
        (async () => {
          const name = entry.fileName;
          if (!name || name.includes('\\') || name.startsWith('/') || /^[a-zA-Z]:/.test(name)) throw new Error('يحتوي ZIP على مسار ملف غير مسموح.');
          const parts = name.split('/').filter(Boolean);
          if (parts.some(part => part === '.' || part === '..')) throw new Error('يحتوي ZIP على مسار ملف غير مسموح.');
          if (++fileCount > 5000) throw new Error('عدد الملفات داخل ZIP أكبر من المسموح (5000).');
          totalBytes += entry.uncompressedSize || 0;
          if (totalBytes > 250 * 1024 * 1024) throw new Error('حجم الملفات بعد فك الضغط يتجاوز 250 ميغابايت.');
          const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
          if ((mode & 0o170000) === 0o120000) throw new Error('اختصارات الملفات غير مسموح بها داخل ZIP.');
          const target = path.resolve(destination, ...parts);
          if (target !== destination && !target.startsWith(destination + path.sep)) throw new Error('مسار ملف غير مسموح.');
          if (name.endsWith('/')) {
            await fs.promises.mkdir(target, { recursive: true });
          } else {
            await fs.promises.mkdir(path.dirname(target), { recursive: true });
            const stream = await new Promise((res, rej) => zip.openReadStream(entry, (err, value) => err ? rej(err) : res(value)));
            await pipeline(stream, fs.createWriteStream(target, { flags: 'wx' }));
          }
          zip.readEntry();
        })().catch(fail);
      });
      zip.readEntry();
    });
  });
}

app.get('/api/session', (req, res) => res.json({ authenticated: Boolean(req.session?.admin) }));
app.post('/api/login', (req, res) => {
  if (!equalSecret(req.body?.username, process.env.ADMIN_USERNAME) || !equalSecret(req.body?.password, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
  }
  req.session = { admin: true };
  res.json({ ok: true });
});
app.post('/api/logout', requireAdmin, requireActionHeader, (req, res) => { req.session = null; res.json({ ok: true }); });
app.get('/api/apps', requireAdmin, (req, res) => res.json({ apps: listApps() }));
app.post('/api/apps', requireAdmin, requireActionHeader, upload.single('archive'), async (req, res) => {
  const slug = String(req.body?.slug || '').toLowerCase();
  if (!safeSlug(slug) || ['www', 'admin', 'api', 'mail', 'ftp', 'smtp', 'autodiscover'].includes(slug)) return res.status(400).json({ error: 'استخدم اسماً لاتينياً بسيطاً للنطاق الفرعي.' });
  if (!req.file) return res.status(400).json({ error: 'اختر ملف ZIP للتطبيق.' });
  const finalDir = path.join(appsDir, slug);
  if (fs.existsSync(finalDir)) return res.status(409).json({ error: 'هذا الاسم مستخدم بالفعل.' });
  const tempDir = path.join(appsDir, `.upload-${require('node:crypto').randomUUID()}`);
  try {
    await fs.promises.mkdir(tempDir, { recursive: false });
    await extractZip(req.file.buffer, tempDir);
    await fs.promises.rename(tempDir, finalDir);
    res.status(201).json({ ok: true, url: `https://${slug}.${baseDomain}` });
  } catch (error) {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    res.status(400).json({ error: error.message || 'فشل رفع التطبيق.' });
  }
});
app.delete('/api/apps/:slug', requireAdmin, requireActionHeader, async (req, res) => {
  if (!safeSlug(req.params.slug)) return res.sendStatus(400);
  const target = path.join(appsDir, req.params.slug);
  if (!fs.existsSync(target)) return res.sendStatus(404);
  await fs.promises.rm(target, { recursive: true, force: true });
  res.json({ ok: true });
});

const adminPage = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>إدارة التطبيقات | millionair.site</title><style>
:root{color-scheme:dark;--bg:#0b1020;--card:#151d32;--line:#293653;--text:#eef3ff;--muted:#aab6d0;--accent:#65e0bd}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at top,#18264a,var(--bg) 60%);color:var(--text);font:16px system-ui,sans-serif;min-height:100vh}.wrap{max-width:980px;margin:auto;padding:36px 20px}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px}h1{font-size:clamp(25px,5vw,38px);margin:0}p{color:var(--muted)}.card{background:#151d32eF;border:1px solid var(--line);border-radius:18px;padding:24px;margin:18px 0;box-shadow:0 12px 40px #0003}label{display:block;margin:14px 0 7px;color:var(--muted)}input,button{font:inherit;border-radius:10px;padding:12px 14px}input{width:100%;border:1px solid var(--line);background:#0b1020;color:var(--text)}button{border:0;background:var(--accent);color:#08241d;font-weight:700;cursor:pointer;margin-top:16px}button.secondary{background:#293653;color:var(--text)}button.danger{background:#6e2d3d;color:#fff}.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.row input{flex:1;min-width:220px}.app{display:flex;justify-content:space-between;gap:12px;align-items:center;border-top:1px solid var(--line);padding:16px 0}.app a{color:var(--accent);direction:ltr;overflow-wrap:anywhere}.hidden{display:none!important}.msg{min-height:1.5em;color:var(--accent)}.hint{font-size:14px}a{color:var(--accent)}
</style></head><body><main class="wrap"><header><div><h1>مركز التطبيقات</h1><p>ارفع تطبيقات PWA وأدر نطاقاتها الفرعية</p></div><button id="logout" class="secondary hidden">تسجيل الخروج</button></header><section id="login" class="card hidden"><h2>دخول المدير</h2><form id="loginForm"><label>اسم المستخدم</label><input name="username" autocomplete="username" required><label>كلمة المرور</label><input name="password" type="password" autocomplete="current-password" required><button>دخول</button></form></section><section id="dashboard" class="hidden"><div class="card"><h2>رفع تطبيق PWA</h2><p class="hint">ارفع ملف ZIP يحتوي index.html في المجلد الرئيسي. سيصبح التطبيق على اسمك المختار.millionair.site</p><form id="uploadForm"><label>اسم النطاق الفرعي</label><div class="row"><input name="slug" placeholder="my-app" pattern="[a-zA-Z0-9-]+" maxlength="40" required><span dir="ltr">.millionair.site</span></div><label>ملف التطبيق (ZIP، حتى 50 ميغابايت)</label><input name="archive" type="file" accept=".zip,application/zip" required><button>رفع التطبيق</button></form><p id="message" class="msg" role="status"></p></div><div class="card"><h2>تطبيقاتي</h2><div id="apps"></div></div></section><footer><p class="hint">يجب أن يشير DNS للنطاق *.millionair.site إلى خدمة Render.</p></footer></main><script>
const $=s=>document.querySelector(s), msg=$('#message');async function api(url,options={}){const r=await fetch(url,options);const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'حدث خطأ.');return data}function action(){return {'x-admin-action':'1'}}async function loadApps(){const data=await api('/api/apps');const box=$('#apps');box.replaceChildren();if(!data.apps.length){box.textContent='لا توجد تطبيقات مضافة بعد.';return}for(const item of data.apps){const row=document.createElement('div');row.className='app';const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener';link.textContent=item.url;const del=document.createElement('button');del.className='danger';del.textContent='حذف';del.onclick=async()=>{if(!confirm('هل تريد حذف هذا التطبيق؟'))return;try{await api('/api/apps/'+encodeURIComponent(item.slug),{method:'DELETE',headers:action()});await loadApps()}catch(e){alert(e.message)}};row.append(link,del);box.append(row)}}async function init(){try{const s=await api('/api/session');$('#login').classList.toggle('hidden',s.authenticated);$('#dashboard').classList.toggle('hidden',!s.authenticated);$('#logout').classList.toggle('hidden',!s.authenticated);if(s.authenticated)await loadApps()}catch(e){msg.textContent=e.message}}$('#loginForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:f.get('username'),password:f.get('password')})});e.target.reset();await init()}catch(err){alert(err.message)}};$('#uploadForm').onsubmit=async e=>{e.preventDefault();msg.textContent='جارٍ رفع التطبيق...';try{const data=await api('/api/apps',{method:'POST',headers:action(),body:new FormData(e.target)});msg.textContent='تم النشر: '+data.url;e.target.reset();await loadApps()}catch(err){msg.textContent=err.message}};$('#logout').onclick=async()=>{await api('/api/logout',{method:'POST',headers:action()});await init()};init();
</script></body></html>`;
const homePage = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تطبيقاتي | millionair.site</title><style>body{margin:0;background:#0b1020;color:#eef3ff;font:17px system-ui,sans-serif}.wrap{max-width:1100px;margin:auto;padding:50px 22px}h1{font-size:42px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;margin-top:30px}.tile{background:#151d32;border:1px solid #293653;border-radius:18px;padding:24px;color:#65e0bd;text-decoration:none;transition:transform .2s}.tile:hover{transform:translateY(-4px)}.tile strong{display:block;font-size:20px;color:#eef3ff;margin-bottom:8px}.empty{color:#aab6d0}</style></head><body><main class="wrap"><h1>تطبيقاتي</h1><p>مجموعة تطبيقاتي على الويب</p><div id="grid" class="grid"></div><script>fetch('/api/public-apps').then(r=>r.json()).then(({apps})=>{const grid=document.querySelector('#grid');if(!apps.length){grid.innerHTML='<p class="empty">لا توجد تطبيقات منشورة حالياً.</p>';return}for(const app of apps){const a=document.createElement('a');a.className='tile';a.href=app.url;const title=document.createElement('strong');title.textContent=app.slug;const sub=document.createElement('span');sub.textContent=app.url;a.append(title,sub);grid.append(a)}})</script></main></body></html>`;
app.get('/api/public-apps', (req, res) => res.json({ apps: listApps() }));
app.get('/', (req, res, next) => {
  const host = String(req.hostname || '').toLowerCase();
  if (host === baseDomain || host === `www.${baseDomain}` || host === 'localhost' || host === '127.0.0.1') return res.type('html').send(homePage);
  if (!host.endsWith(`.${baseDomain}`)) return next();
  const slug = host.slice(0, -(baseDomain.length + 1));
  if (!safeSlug(slug)) return res.sendStatus(404);
  const dir = path.join(appsDir, slug);
  if (!fs.existsSync(path.join(dir, 'index.html'))) return res.status(404).send('لا يوجد تطبيق منشور على هذا النطاق.');
  res.sendFile(path.join(dir, 'index.html'));
});
app.get('*', (req, res, next) => {
  const host = String(req.hostname || '').toLowerCase();
  if (host === baseDomain || host === `www.${baseDomain}` || host === 'localhost' || host === '127.0.0.1') {
    if (req.path.startsWith('/api/')) return next();
    return res.status(404).send('الصفحة غير موجودة.');
  }
  if (!host.endsWith(`.${baseDomain}`)) return next();
  const slug = host.slice(0, -(baseDomain.length + 1));
  if (!safeSlug(slug)) return res.sendStatus(404);
  const dir = path.join(appsDir, slug);
  const requested = path.resolve(dir, `.${decodeURIComponent(req.path)}`);
  if (requested.startsWith(dir + path.sep) && fs.existsSync(requested) && fs.statSync(requested).isFile()) return res.sendFile(requested);
  const index = path.join(dir, 'index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(404).send('لا يوجد تطبيق منشور على هذا النطاق.');
});
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err instanceof multer.MulterError ? 400 : 500).json({ error: err instanceof multer.MulterError ? 'حجم الملف يتجاوز الحد المسموح أو أن الطلب غير صالح.' : 'حدث خطأ داخلي.' });
});
app.listen(port, '0.0.0.0', () => console.log(`PWA hub listening on ${port}`));
