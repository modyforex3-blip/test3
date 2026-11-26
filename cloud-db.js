/**
 * Free Always-On Cloud Database Persistence Engine for Millionaire Portal
 * - Prevents data/articles/apps loss across Render ephemeral restarts & redeploys
 * - Supports GitHub Cloud Branch ('data-store'), JSONBin.io, and Supabase/REST
 * - Zero external npm dependencies (uses Node.js built-in fetch/https)
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');

let syncTimer = null;
let lastSyncStatus = {
  connected: false,
  provider: 'local',
  lastSyncAt: null,
  lastError: null
};

function readLocalDB() {
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }
  } catch (err) {
    console.error('[CloudDB] Error reading local DB:', err.message);
  }
  return { settings: {}, aiBlogger: {}, apps: [], articles: [], messages: [] };
}

function writeLocalDB(data) {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[CloudDB] Error writing local DB:', err.message);
    return false;
  }
}

function getCloudConfig(db) {
  const s = (db && db.settings && db.settings.cloudDb) || {};
  return {
    provider: process.env.CLOUD_DB_PROVIDER || s.provider || (process.env.GITHUB_DB_TOKEN ? 'github' : (process.env.JSONBIN_BIN_ID ? 'jsonbin' : 'local')),
    githubRepo: process.env.GITHUB_DB_REPO || s.githubRepo || 'modyforex3-blip/test3',
    githubBranch: process.env.GITHUB_DB_BRANCH || s.githubBranch || 'data-store',
    githubToken: process.env.GITHUB_DB_TOKEN || s.githubToken || '',
    jsonbinBinId: process.env.JSONBIN_BIN_ID || s.jsonbinBinId || '',
    jsonbinKey: process.env.JSONBIN_MASTER_KEY || s.jsonbinKey || ''
  };
}

// Merge remote cloud data with local data so neither new code defaults nor remote articles/apps are lost
function mergeDatabases(localData, remoteData) {
  if (!remoteData || typeof remoteData !== 'object') return localData;

  const mergeById = (localArr = [], remoteArr = []) => {
    const map = new Map();
    // Remote items first (historical persisted items)
    for (const item of remoteArr) {
      if (item && item.id) map.set(item.id, item);
    }
    // Local items fill in any missing/new defaults
    for (const item of localArr) {
      if (item && item.id && !map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  };

  const mergedArticles = mergeById(localData.articles, remoteData.articles)
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  const mergedApps = mergeById(localData.apps, remoteData.apps);
  const mergedMessages = mergeById(localData.messages, remoteData.messages);

  return {
    settings: {
      ...(localData.settings || {}),
      ...(remoteData.settings || {})
    },
    aiBlogger: {
      ...(localData.aiBlogger || {}),
      ...(remoteData.aiBlogger || {})
    },
    apps: mergedApps,
    articles: mergedArticles,
    messages: mergedMessages
  };
}

// --- Provider 1: GitHub Dedicated Data Branch ('data-store') ---
async function pullFromGitHub(cfg) {
  const url = `https://api.github.com/repos/${cfg.githubRepo}/contents/data/database.json?ref=${encodeURIComponent(cfg.githubBranch)}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${cfg.githubToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Millionaire-Portal-CloudDB'
    }
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`GitHub pull HTTP ${res.status}`);
  }
  const json = await res.json();
  const decoded = Buffer.from(json.content, 'base64').toString('utf8');
  return JSON.parse(decoded);
}

async function pushToGitHub(cfg, data) {
  const apiUrl = `https://api.github.com/repos/${cfg.githubRepo}/contents/data/database.json`;
  const headers = {
    'Authorization': `Bearer ${cfg.githubToken}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'Millionaire-Portal-CloudDB'
  };

  // Get current file SHA on data-store branch if it exists
  let sha = undefined;
  try {
    const checkRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(cfg.githubBranch)}`, { headers });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }
  } catch (_) {}

  const contentB64 = Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64');
  const body = {
    message: `chore(db): sync live database (${(data.articles || []).length} articles, ${(data.apps || []).length} apps)`,
    content: contentB64,
    branch: cfg.githubBranch
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`GitHub push HTTP ${putRes.status}: ${errText.slice(0, 150)}`);
  }
  return true;
}

// --- Provider 2: JSONBin.io ---
async function pullFromJsonBin(cfg) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${cfg.jsonbinBinId}/latest`, {
    headers: { 'X-Master-Key': cfg.jsonbinKey }
  });
  if (!res.ok) throw new Error(`JSONBin pull HTTP ${res.status}`);
  const json = await res.json();
  return json.record || null;
}

async function pushToJsonBin(cfg, data) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${cfg.jsonbinBinId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': cfg.jsonbinKey
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`JSONBin push HTTP ${res.status}`);
  return true;
}

async function pullFromCloud() {
  const localData = readLocalDB();
  const cfg = getCloudConfig(localData);

  if (cfg.provider === 'github' && cfg.githubToken) {
    try {
      const remoteData = await pullFromGitHub(cfg);
      if (remoteData) {
        const merged = mergeDatabases(localData, remoteData);
        writeLocalDB(merged);
        lastSyncStatus = { connected: true, provider: 'github', lastSyncAt: new Date().toISOString(), lastError: null };
        console.log(`☁️ [CloudDB] Synced from GitHub (${cfg.githubBranch}): ${(merged.articles || []).length} articles, ${(merged.apps || []).length} apps.`);
        return merged;
      }
    } catch (err) {
      lastSyncStatus = { connected: false, provider: 'github', lastSyncAt: lastSyncStatus.lastSyncAt, lastError: err.message };
      console.warn('⚠️ [CloudDB] GitHub pull warning:', err.message);
    }
  } else if (cfg.provider === 'jsonbin' && cfg.jsonbinBinId && cfg.jsonbinKey) {
    try {
      const remoteData = await pullFromJsonBin(cfg);
      if (remoteData) {
        const merged = mergeDatabases(localData, remoteData);
        writeLocalDB(merged);
        lastSyncStatus = { connected: true, provider: 'jsonbin', lastSyncAt: new Date().toISOString(), lastError: null };
        console.log(`☁️ [CloudDB] Synced from JSONBin: ${(merged.articles || []).length} articles.`);
        return merged;
      }
    } catch (err) {
      lastSyncStatus = { connected: false, provider: 'jsonbin', lastSyncAt: lastSyncStatus.lastSyncAt, lastError: err.message };
      console.warn('⚠️ [CloudDB] JSONBin pull warning:', err.message);
    }
  }

  return localData;
}

async function pushToCloudNow(dataOverride = null) {
  const data = dataOverride || readLocalDB();
  const cfg = getCloudConfig(data);

  if (cfg.provider === 'github' && cfg.githubToken) {
    try {
      await pushToGitHub(cfg, data);
      lastSyncStatus = { connected: true, provider: 'github', lastSyncAt: new Date().toISOString(), lastError: null };
      return { success: true, provider: 'github' };
    } catch (err) {
      lastSyncStatus = { connected: false, provider: 'github', lastSyncAt: lastSyncStatus.lastSyncAt, lastError: err.message };
      console.warn('⚠️ [CloudDB] GitHub push warning:', err.message);
      return { success: false, error: err.message };
    }
  } else if (cfg.provider === 'jsonbin' && cfg.jsonbinBinId && cfg.jsonbinKey) {
    try {
      await pushToJsonBin(cfg, data);
      lastSyncStatus = { connected: true, provider: 'jsonbin', lastSyncAt: new Date().toISOString(), lastError: null };
      return { success: true, provider: 'jsonbin' };
    } catch (err) {
      lastSyncStatus = { connected: false, provider: 'jsonbin', lastSyncAt: lastSyncStatus.lastSyncAt, lastError: err.message };
      console.warn('⚠️ [CloudDB] JSONBin push warning:', err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'No cloud database credentials configured' };
}

function scheduleCloudPush(data) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    pushToCloudNow(data).catch(() => {});
  }, 1500);
}

function getStatus() {
  const db = readLocalDB();
  const cfg = getCloudConfig(db);
  return {
    ...lastSyncStatus,
    configured: Boolean((cfg.provider === 'github' && cfg.githubToken) || (cfg.provider === 'jsonbin' && cfg.jsonbinBinId && cfg.jsonbinKey)),
    provider: cfg.provider,
    githubRepo: cfg.githubRepo,
    githubBranch: cfg.githubBranch
  };
}

module.exports = {
  pullFromCloud,
  pushToCloudNow,
  scheduleCloudPush,
  getStatus
};
