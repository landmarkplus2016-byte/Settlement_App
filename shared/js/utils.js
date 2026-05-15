/* ==========================================================================
   ExpenseFuel Tracker — Utility Functions
   Plain global — no ES module exports.
   Depends on: TRANSLATIONS (translations.js)
   Include order: translations.js → lists.js → utils.js → app JS
   ========================================================================== */

/* --------------------------------------------------------------------------
   ID GENERATION
   -------------------------------------------------------------------------- */

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/* --------------------------------------------------------------------------
   DATE HELPERS
   -------------------------------------------------------------------------- */

function formatDate(day, month, year) {
  return day + '-' + month + '-' + year;
}

function getCurrentMonth() {
  var months = ['Jan','Feb','Mar','Apr','May','Jun',
                'Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[new Date().getMonth()];
}

function getCurrentDay() {
  return new Date().getDate();
}

function getCurrentYear() {
  return new Date().getFullYear();
}

/* --------------------------------------------------------------------------
   DATE PICKER HELPERS — bridge between <input type="date"> (YYYY-MM-DD)
   and the data model (day/month/year/date fields).
   -------------------------------------------------------------------------- */

var _MONTH_ABBREVS = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];
var _MONTH_TO_PAD  = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                       Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };

/* Parse "YYYY-MM-DD" → {day, month, year, date}.  Falls back to today. */
function parseDatePickerValue(val) {
  var parts = (val || '').split('-');
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  if (!y || !m || !d) {
    var now = new Date();
    y = now.getFullYear(); m = now.getMonth() + 1; d = now.getDate();
  }
  var month = _MONTH_ABBREVS[m - 1];
  return { day: d, month: month, year: y, date: formatDate(d, month, y) };
}

/* Convert stored "16-Apr-2026" → "2026-04-16" for <input type="date">. */
function toDatePickerValue(dateStr) {
  if (!dateStr) return getTodayPickerValue();
  var parts = String(dateStr).split('-');
  if (parts.length !== 3) return getTodayPickerValue();
  var dd = String(parts[0]).padStart(2, '0');
  var mm = _MONTH_TO_PAD[parts[1]] || '01';
  return parts[2] + '-' + mm + '-' + dd;
}

/* Today as "YYYY-MM-DD" for the default date input value. */
function getTodayPickerValue() {
  var now = new Date();
  var m   = String(now.getMonth() + 1).padStart(2, '0');
  var d   = String(now.getDate()).padStart(2, '0');
  return now.getFullYear() + '-' + m + '-' + d;
}

/* --------------------------------------------------------------------------
   LOCAL STORAGE
   -------------------------------------------------------------------------- */

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    /* Storage full or unavailable — fail silently; caller shows feedback */
  }
}

function loadFromStorage(key, fallback) {
  if (fallback === undefined) { fallback = null; }
  try {
    var raw = localStorage.getItem(key);
    if (raw === null) { return fallback; }
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

/* --------------------------------------------------------------------------
   SETTINGS HELPERS
   -------------------------------------------------------------------------- */

function getSettings() {
  return loadFromStorage('settings', null);
}

function isSettingsComplete() {
  var s = getSettings();
  if (!s) { return false; }
  return (
    typeof s.name   === 'string' && s.name.trim()   !== '' &&
    typeof s.mobile === 'string' && s.mobile.trim() !== ''
  );
}

function guardSettings(redirectPath) {
  if (!isSettingsComplete()) {
    window.location.href = redirectPath;
  }
}

/* --------------------------------------------------------------------------
   LANGUAGE / RTL
   -------------------------------------------------------------------------- */

function applyLanguage(lang) {
  var html = document.documentElement;

  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

  /* Update all text nodes */
  var i18nEls = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < i18nEls.length; i++) {
    var el  = i18nEls[i];
    var key = el.getAttribute('data-i18n');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key] !== undefined) {
      el.textContent = TRANSLATIONS[lang][key];
    }
  }

  /* Update placeholder attributes */
  var phEls = document.querySelectorAll('[data-i18n-placeholder]');
  for (var j = 0; j < phEls.length; j++) {
    var phEl  = phEls[j];
    var phKey = phEl.getAttribute('data-i18n-placeholder');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][phKey] !== undefined) {
      phEl.setAttribute('placeholder', TRANSLATIONS[lang][phKey]);
    }
  }

  /* Update title attribute (tooltips, aria) */
  var titleEls = document.querySelectorAll('[data-i18n-title]');
  for (var k = 0; k < titleEls.length; k++) {
    var tEl  = titleEls[k];
    var tKey = tEl.getAttribute('data-i18n-title');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][tKey] !== undefined) {
      tEl.setAttribute('title', TRANSLATIONS[lang][tKey]);
    }
  }

  localStorage.setItem('lang', lang);
}

function initLanguage() {
  var lang = localStorage.getItem('lang');

  if (!lang) {
    var s = getSettings();
    lang = (s && s.language) ? s.language : (DEFAULT_LANG || 'en');
  }

  applyLanguage(lang);
  return lang;
}

/* --------------------------------------------------------------------------
   TOAST NOTIFICATIONS
   -------------------------------------------------------------------------- */

var _toastIcons = {
  success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  error:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  info:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
};

function _getToastContainer() {
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function _removeToast(toast) {
  toast.classList.add('toast-hiding');
  setTimeout(function () {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 220); /* matches toast-fade-out animation in common.css */
}

function showToast(message, type) {
  if (!type) { type = 'success'; }
  if (!_toastIcons[type]) { type = 'info'; }

  var container = _getToastContainer();

  /* Enforce max 3 visible toasts — drop the oldest */
  var existing = container.querySelectorAll('.toast:not(.toast-hiding)');
  if (existing.length >= 3) {
    _removeToast(existing[0]);
  }

  /* Build toast element */
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  toast.innerHTML =
    '<span class="toast-icon">' + _toastIcons[type] + '</span>' +
    '<span class="toast-body">' +
      '<span class="toast-message">' + _escapeHtml(message) + '</span>' +
    '</span>' +
    '<button class="toast-close" aria-label="Close">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
    '</button>';

  /* Manual close */
  toast.querySelector('.toast-close').addEventListener('click', function () {
    clearTimeout(toast._timer);
    _removeToast(toast);
  });

  container.appendChild(toast);

  /* Auto-dismiss after 3 s */
  toast._timer = setTimeout(function () {
    _removeToast(toast);
  }, 3000);
}

function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* --------------------------------------------------------------------------
   FORMATTING
   -------------------------------------------------------------------------- */

function formatCurrency(amount) {
  var n = parseFloat(amount);
  if (isNaN(n)) { return '0 EGP'; }
  return formatNumber(n) + ' EGP';
}

function formatNumber(num) {
  var n = parseFloat(num);
  if (isNaN(n)) { return '0'; }
  /* toLocaleString is unavailable in some offline WebView contexts — manual fallback */
  var parts = n.toFixed(n % 1 === 0 ? 0 : 2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/* --------------------------------------------------------------------------
   DATE RANGE STRING
   Returns "earliest → latest" date string from mixed expense+fuel arrays.
   -------------------------------------------------------------------------- */

var _DATE_RANGE_MONTHS = {
  Jan:0, Feb:1, Mar:2, Apr:3, May:4,  Jun:5,
  Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11,
};

function buildDateRange(expenses, fuel) {
  function toMs(dateStr) {
    if (!dateStr) return null;
    var parts = String(dateStr).split('-');
    if (parts.length !== 3) return null;
    var d = parseInt(parts[0], 10);
    var m = _DATE_RANGE_MONTHS[parts[1]];
    var y = parseInt(parts[2], 10);
    if (isNaN(d) || m === undefined || isNaN(y)) return null;
    return new Date(y, m, d).getTime();
  }

  var all = (expenses || []).concat(fuel || []);
  if (!all.length) return '—';

  var minMs = Infinity, maxMs = -Infinity, minDate = '', maxDate = '';
  all.forEach(function (e) {
    var ms = toMs(e.date);
    if (ms === null) return;
    if (ms < minMs) { minMs = ms; minDate = e.date; }
    if (ms > maxMs) { maxMs = ms; maxDate = e.date; }
  });

  if (!minDate) return '—';
  return minDate === maxDate ? minDate : minDate + ' → ' + maxDate;
}

/* --------------------------------------------------------------------------
   KM CALCULATION
   -------------------------------------------------------------------------- */

function calculateDistance(startKm, endKm) {
  var s = parseFloat(startKm);
  var e = parseFloat(endKm);
  if (isNaN(s) || isNaN(e) || e < s) { return 0; }
  return e - s;
}
