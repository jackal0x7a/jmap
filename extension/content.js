// J-MAP - Content Script
// Does two jobs:
//   1. JS Hunter: detects all <script src> tags and reports them to background (existing)
//   2. Observed Requests: intercepts fetch() and XHR to capture live API calls (new)

(function () {
  'use strict';

  // ── Guard: don't double-inject ─────────────────────────────────────────────
  // Use the original guard key so existing installs don't break
  if (window.__jsHunterActive) return;
  window.__jsHunterActive = true;

  const SOURCE_PAGE = location.href;

  // ─── Job 1: JS Script Detection ───────────────────────────────────────────

  function reportScript(src) {
    if (!src) return;
    try {
      const absolute = new URL(src, location.href).href;
      if (!absolute.startsWith('http')) return;
      chrome.runtime.sendMessage({ type: 'JS_FILE_DETECTED', url: absolute });
    } catch (_) {}
  }

  // Scan all existing <script src> tags
  document.querySelectorAll('script[src]').forEach(s => reportScript(s.src));

  // Watch for dynamically injected scripts (SPAs, lazy loaders, etc.)
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeName === 'SCRIPT' && node.src) {
          reportScript(node.src);
        }
        // Also catch scripts inside added subtrees
        if (node.querySelectorAll) {
          node.querySelectorAll('script[src]').forEach(s => reportScript(s.src));
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // ─── Job 2: fetch() / XHR Interception ───────────────────────────────────
  // webRequest already catches most traffic, but this gives us:
  //   - Correct HTTP method for same-origin fetch() calls
  //   - XHR calls that may be missed in some browser/config combos
  //   - Service-worker-intercepted requests that bypass webRequest entirely

  function reportObserved(url, method) {
    try {
      const resolved = new URL(url, location.href).href;
      if (!resolved.startsWith('http')) return;
      chrome.runtime.sendMessage({
        type: 'OBSERVED_FETCH',
        url: resolved,
        method: (method || 'GET').toUpperCase(),
        sourcePage: SOURCE_PAGE,
      });
    } catch (_) {}
  }

  // Patch fetch()
  const _origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input
                : (input instanceof Request) ? input.url
                : String(input);
      const method = (init && init.method)
                  || (input instanceof Request && input.method)
                  || 'GET';
      reportObserved(url, method);
    } catch (_) {}
    return _origFetch(input, init);
  };

  // Patch XMLHttpRequest.open()
  const _origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      reportObserved(url, method);
    } catch (_) {}
    return _origOpen.apply(this, arguments);
  };

})();
