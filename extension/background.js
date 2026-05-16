// J-MAP - Background Service Worker v4
// MV3-correct: no setInterval, uses chrome.tabs for navigation capture,
// keepAlive pattern to prevent service worker sleep during webRequest

const BACKEND_URL = 'http://localhost:3747';
const DB_NAME = 'JMAPdb';
const DB_VERSION = 2;
const STORE_NAME = 'pending_files';

// ─── IndexedDB ────────────────────────────────────────────────────────────────

let _db = null;
function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const s = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      s.createIndex('synced', 'synced', { unique: false });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

async function queueFile(fileData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const record = { ...fileData, synced: 0 };
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getUnsynced() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).index('synced').getAll(IDBKeyRange.only(0));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removeSynced(id) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function getPendingCount() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).index('synced').count(IDBKeyRange.only(0));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(0);
  });
}

async function clearAllQueued() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
  });
}

// ─── Scope ────────────────────────────────────────────────────────────────────

async function getConfig() {
  const r = await chrome.storage.local.get(['scope', 'enabled']);
  return { scope: r.scope || [], enabled: r.enabled !== false };
}

function urlMatchesScope(url, scope) {
  if (!scope || scope.length === 0) return false;
  try {
    const h = new URL(url).hostname;
    return scope.some(entry => {
      entry = entry.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (entry.startsWith('*.')) {
        const base = entry.slice(2);
        return h === base || h.endsWith('.' + base);
      }
      return h === entry || h.endsWith('.' + entry);
    });
  } catch { return false; }
}

// ─── Backend ──────────────────────────────────────────────────────────────────

async function fetchActiveProject() {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/projects/active`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function pushToBackend(fileData) {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/js-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData),
      signal: AbortSignal.timeout(10000)
    });
    if (resp.status === 409) return 'no_project';
    return resp.ok ? 'ok' : 'error';
  } catch {
    return 'offline';
  }
}

async function syncQueue() {
  let count = 0;
  try {
    const pending = await getUnsynced();
    for (const file of pending) {
      const result = await pushToBackend(file);
      if (result === 'ok') {
        await removeSynced(file.id);
        count++;
      }
    }
  } catch (err) {
    console.error('[J-MAP] syncQueue error:', err);
  }
  await updateBadge();
  return count;
}

// ─── Observed Requests Buffer ─────────────────────────────────────────────────
// In MV3 we can't use setInterval reliably — service worker gets killed.
// Instead we flush: (1) on every alarm, (2) on tab events, (3) explicitly.

const observedBuffer = [];

const SKIP_EXTENSIONS = /\.(js|mjs|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif|pdf|zip|gz)(\?|$)/i;

const CAPTURE_TYPES = new Set([
  'main_frame',
  'sub_frame',
  'xmlhttprequest',
  'fetch',
  'ping',
  'websocket',
]);

function mapRequestType(t) {
  if (t === 'main_frame' || t === 'sub_frame') return 'navigation';
  if (t === 'xmlhttprequest') return 'xhr';
  if (t === 'fetch') return 'fetch';
  if (t === 'websocket') return 'websocket';
  return t || 'other';
}

function shouldCaptureRequest(details, scope) {
  const { url, tabId, type } = details;
  if (tabId < 0) return false;
  if (!CAPTURE_TYPES.has(type)) return false;
  if (url.includes('localhost:3747')) return false;
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return false;
  const rawUrl = url.split('?')[0].split('#')[0];
  if (SKIP_EXTENSIONS.test(rawUrl)) return false;
  if (!urlMatchesScope(url, scope)) return false;
  return true;
}

async function flushObservedBuffer() {
  if (observedBuffer.length === 0) return;
  const batch = observedBuffer.splice(0, observedBuffer.length);
  try {
    const resp = await fetch(`${BACKEND_URL}/api/observed-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: batch }),
      signal: AbortSignal.timeout(8000)
    });
    if (!resp.ok) {
      console.warn('[J-MAP] flush failed:', resp.status);
      // Put them back so we don't lose them
      observedBuffer.unshift(...batch);
    }
  } catch {
    // Backend offline — put back
    observedBuffer.unshift(...batch);
  }
}

function bufferObserved(entry) {
  observedBuffer.push(entry);
  // Flush immediately if buffer is getting large
  if (observedBuffer.length >= 20) flushObservedBuffer();
}

// ─── Capture JS Files ─────────────────────────────────────────────────────────

const inFlight = new Set();

async function captureJSFile(url, tabId) {
  if (inFlight.has(url)) return;

  const { scope, enabled } = await getConfig();
  if (!enabled || !urlMatchesScope(url, scope)) return;

  inFlight.add(url);
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return;

    const content = await resp.text();
    if (!content || content.length < 10) return;

    let sourcePageUrl = '';
    try { const tab = await chrome.tabs.get(tabId); sourcePageUrl = tab.url || ''; } catch {}

    const fileData = {
      id: crypto.randomUUID(),
      url,
      content,
      size: new TextEncoder().encode(content).length,
      sourcePageUrl,
      capturedAt: new Date().toISOString(),
      synced: 0,
      contentType: resp.headers.get('content-type') || 'application/javascript'
    };

    const result = await pushToBackend(fileData);
    if (result !== 'ok') await queueFile(fileData);
    await updateBadge();

  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('[J-MAP] Capture error:', url, err.message);
    }
  } finally {
    inFlight.delete(url);
  }
}

// ─── Badge ────────────────────────────────────────────────────────────────────

async function updateBadge() {
  try {
    const count = await getPendingCount();
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: '#ff9900' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch {}
}

// ─── Scope cache ──────────────────────────────────────────────────────────────

let _cachedScope = null;
let _scopeCacheTs = 0;

async function getCachedScope() {
  const now = Date.now();
  if (_cachedScope && now - _scopeCacheTs < 5000) return _cachedScope;
  const { scope, enabled } = await getConfig();
  _cachedScope = enabled ? scope : [];
  _scopeCacheTs = now;
  return _cachedScope;
}

chrome.storage.onChanged.addListener(() => { _cachedScope = null; });

// ─── Capture Method 1: webRequest ─────────────────────────────────────────────
// Catches XHR/fetch API calls reliably. May miss main_frame in some MV3 builds.

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.tabId < 0) return;
    const scope = await getCachedScope();
    if (!scope.length) return;

    const url = details.url;
    const rawUrl = url.split('?')[0].split('#')[0];

    // JS files → full content capture
    const isJsByExt = rawUrl.endsWith('.js') || rawUrl.endsWith('.mjs');
    const ct = details.responseHeaders?.find(h => h.name.toLowerCase() === 'content-type')?.value || '';
    const isJsByCT = ct.includes('javascript');

    if (isJsByExt || isJsByCT) {
      captureJSFile(url, details.tabId);
      return;
    }

    // Everything else → observed log
    if (shouldCaptureRequest(details, scope)) {
      let sourcePageUrl = '';
      try {
        const tab = await chrome.tabs.get(details.tabId);
        sourcePageUrl = details.type === 'main_frame'
          ? (details.initiator || '')
          : (tab.url || '');
      } catch {}

      bufferObserved({
        url,
        method: details.method || 'GET',
        statusCode: details.statusCode || null,
        sourcePage: sourcePageUrl,
        capturedAt: new Date().toISOString(),
        type: mapRequestType(details.type),
      });
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// ─── Capture Method 2: chrome.tabs navigation ─────────────────────────────────
// This is the GUARANTEED way to catch page navigations in MV3.
// webRequest may miss main_frame events; tabs.onUpdated never misses them.

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only fire when the URL is committed (status === 'loading' fires at navigation start)
  if (changeInfo.status !== 'loading') return;
  if (!tab.url) return;

  const url = tab.url;

  // Skip non-http and internal pages
  if (!url.startsWith('http')) return;
  if (url.includes('localhost:3747')) return;

  const scope = await getCachedScope();
  if (!scope.length || !urlMatchesScope(url, scope)) return;

  bufferObserved({
    url,
    method: 'GET',
    statusCode: null, // not available at navigation start
    sourcePage: tab.url || '',
    capturedAt: new Date().toISOString(),
    type: 'navigation',
  });
});

// Also catch history API navigation (pushState/replaceState in SPAs)
// These don't trigger tabs.onUpdated with status='loading', but DO update tab.url
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // SPA navigation: url changes but status may stay 'complete'
  if (!changeInfo.url) return;
  const url = changeInfo.url;

  if (!url.startsWith('http')) return;
  if (url.includes('localhost:3747')) return;

  const scope = await getCachedScope();
  if (!scope.length || !urlMatchesScope(url, scope)) return;

  bufferObserved({
    url,
    method: 'GET',
    statusCode: null,
    sourcePage: '',
    capturedAt: new Date().toISOString(),
    type: 'navigation',
  });
});

// ─── Capture Method 3: webNavigation (catches all frame navigations) ──────────
// Requires "webNavigation" permission — catches even more than tabs.onUpdated

chrome.webNavigation.onCommitted.addListener(async (details) => {
  const { url, tabId, frameId } = details;

  if (!url || !url.startsWith('http')) return;
  if (url.includes('localhost:3747')) return;

  const scope = await getCachedScope();
  if (!scope.length || !urlMatchesScope(url, scope)) return;

  bufferObserved({
    url,
    method: 'GET',
    statusCode: null,
    sourcePage: details.frameId === 0 ? '' : url,
    capturedAt: new Date().toISOString(),
    type: frameId === 0 ? 'navigation' : 'sub_frame',
  });
});

// ─── Messages ─────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'GET_STATUS') {
    Promise.all([
      getConfig(),
      getPendingCount(),
      fetchActiveProject()
    ]).then(([config, pending, activeProject]) => {
      sendResponse({ config, pending, activeProject });
    }).catch(() => {
      sendResponse({ config: { scope: [], enabled: true }, pending: 0, activeProject: null });
    });
    return true;
  }

  if (msg.type === 'JS_FILE_DETECTED') {
    captureJSFile(msg.url, sender.tab?.id ?? -1);
    return false;
  }

  if (msg.type === 'OBSERVED_FETCH') {
    const { url, method, sourcePage } = msg;
    if (url && !url.includes('localhost:3747') && !url.startsWith('chrome-extension://')) {
      getConfig().then(({ scope, enabled }) => {
        if (enabled && urlMatchesScope(url, scope)) {
          bufferObserved({
            url,
            method: (method || 'GET').toUpperCase(),
            statusCode: null,
            sourcePage: sourcePage || '',
            capturedAt: new Date().toISOString(),
            type: 'fetch',
          });
        }
      });
    }
    return false;
  }

  if (msg.type === 'SET_CONFIG') {
    chrome.storage.local.set({ scope: msg.scope, enabled: msg.enabled }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'SYNC_NOW') {
    sendResponse({ ok: true });
    syncQueue();
    flushObservedBuffer();
    return false;
  }

  return false;
});

// ─── Alarms ───────────────────────────────────────────────────────────────────
// Alarms are the ONLY reliable periodic timer in MV3 service workers.
// setInterval gets killed when the SW sleeps. Alarms wake it back up.

chrome.alarms.create('sync', { periodInMinutes: 2 });
chrome.alarms.create('flush', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'sync') { syncQueue(); flushObservedBuffer(); }
  if (alarm.name === 'flush') { flushObservedBuffer(); }
});

updateBadge();
console.log('[J-MAP] Background v4 (MV3-correct) started');