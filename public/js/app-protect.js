/**
 * Millionaire App Anti-Copy & Anti-Theft Protection Shield
 * - Blocks right-click context menu outside form inputs
 * - Disables text selection, copying, cutting, and dragging
 * - Blocks View-Source, Save-Page, and DevTools keyboard shortcuts
 * - Protects against unauthorized external iframe hotlinking
 */

(function () {
  'use strict';

  // 1. Inject non-selectable CSS (preserving inputs & textareas)
  try {
    const style = document.createElement('style');
    style.textContent = `
      body, body *:not(input):not(textarea):not(select) {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      img, svg {
        -webkit-user-drag: none !important;
        user-drag: none !important;
        pointer-events: auto;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  } catch (_) {}

  function isEditable(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  // 2. Disable Right-Click Context Menu
  document.addEventListener('contextmenu', function (e) {
    if (!isEditable(e.target)) {
      e.preventDefault();
    }
  }, true);

  // 3. Disable Copy, Cut, DragStart
  ['copy', 'cut', 'dragstart', 'selectstart'].forEach(evt => {
    document.addEventListener(evt, function (e) {
      if (!isEditable(e.target)) {
        e.preventDefault();
      }
    }, true);
  });

  // 4. Block Save, View-Source, Print, and DevTools Shortcuts
  document.addEventListener('keydown', function (e) {
    const key = (e.key || '').toLowerCase();
    const ctrlOrCmd = e.ctrlKey || e.metaKey;

    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    // Ctrl/Cmd + U (View Source), S (Save Page), P (Print)
    if (ctrlOrCmd && (key === 'u' || key === 's' || key === 'p')) {
      e.preventDefault();
      return false;
    }
    // Ctrl/Cmd + C / X outside editable inputs
    if (ctrlOrCmd && (key === 'c' || key === 'x') && !isEditable(e.target)) {
      e.preventDefault();
      return false;
    }
    // Ctrl/Cmd + Shift + I / J / C (DevTools)
    if (ctrlOrCmd && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
      e.preventDefault();
      return false;
    }
  }, true);

  // 5. Anti-Theft Frame Busting (if embedded on an unauthorized external domain)
  try {
    if (window.top !== window.self && document.referrer) {
      const refHost = new URL(document.referrer).hostname;
      const curHost = window.location.hostname;
      if (refHost && curHost && refHost !== curHost) {
        window.top.location = window.self.location;
      }
    }
  } catch (_) {}
})();
