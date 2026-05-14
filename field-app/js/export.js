/* ==========================================================================
   ExpenseFuel — Field App · export.js
   Depends on (loaded before this file):
     translations.js   →  TRANSLATIONS, DEFAULT_LANG
     utils.js          →  getSettings(), loadFromStorage(), showToast(),
                          formatCurrency(), getCurrentMonth(), getCurrentYear()
     excel-export.js   →  generateFieldExcel(), triggerExcelDownload(),
                          generateFieldJSON(), triggerJSONDownload()
     expenses.js       →  getExpenses()
     fuel.js           →  getFuelEntries(), getFuelTotals()
   ========================================================================== */

/* ==========================================================================
   FILENAME BUILDER
   Format: [FirstName]_T[trackingNumber]_[Month][Year].[ext]
   e.g. "Karim_T13_Apr2026.xlsx"
   ========================================================================== */

function buildFilename(extension) {
  const settings = getSettings() || {};
  const firstName = (settings.name || 'user')
    .trim()
    .split(/\s+/)[0]
    .replace(/[^\w؀-ۿ]/g, '_'); /* keep Arabic chars, replace others */
  const tracking = settings.trackingNumber || '0';
  const month    = getCurrentMonth();
  const year     = getCurrentYear();
  return firstName + '_T' + tracking + '_' + month + year + '.' + extension;
}

/* ==========================================================================
   LOAD SUMMARY — populate all page elements from storage
   ========================================================================== */

function loadExportSummary() {
  const settings = getSettings() || {};
  const expenses = getExpenses();
  const fuel     = getFuelEntries();

  /* ---- User info ---- */
  const initials = _buildInitials(settings.name);
  _setText('exportInitials', initials);
  _setText('exportName',     settings.name   || '—');
  _setText('exportMobile',   settings.mobile || '—');
  _setText('exportTracking', 'T-' + (settings.trackingNumber || '—'));

  /* ---- Expense stats ---- */
  const expenseTotal = expenses.reduce(function (s, e) {
    return s + (parseFloat(e.amount) || 0);
  }, 0);
  _setText('exportExpenseCount', String(expenses.length));
  _setText('exportExpenseTotal', formatCurrency(expenseTotal));

  /* ---- Fuel stats ---- */
  const fuelTotals = (typeof getFuelTotals === 'function')
    ? getFuelTotals()
    : { newFuel: 0, karta: 0, total: 0 };

  _setText('exportFuelCount',  String(fuel.length));
  _setText('exportFuelTotal',  formatCurrency(fuelTotals.newFuel));
  _setText('exportKartaTotal', formatCurrency(fuelTotals.karta));

  /* ---- Grand total (expenses + fuel + karta) ---- */
  const grandTotal = expenseTotal + fuelTotals.newFuel + fuelTotals.karta;
  _setText('exportGrandTotal', formatCurrency(grandTotal));

  /* ---- Date range ---- */
  _setText('exportDateRange', _buildDateRange(expenses, fuel));

  /* ---- Checklist ---- */
  _setChecklist('checkExpensesIcon', 'checkExpensesLabel',
    expenses.length, expenses.length + ' expense ' + (expenses.length === 1 ? 'entry' : 'entries'));
  _setChecklist('checkFuelIcon', 'checkFuelLabel',
    fuel.length, fuel.length + ' fuel ' + (fuel.length === 1 ? 'entry' : 'entries'));

  /* ---- No-entries warning + button state ---- */
  const hasEntries = expenses.length > 0 || fuel.length > 0;
  _toggleEl('noEntriesWarning', !hasEntries);

  const btnExcel = document.getElementById('btnExportExcel');
  const btnJson  = document.getElementById('btnExportJson');
  if (btnExcel) btnExcel.disabled = !hasEntries;
  if (btnJson)  btnJson.disabled  = !hasEntries;
}

/* ==========================================================================
   EXCEL EXPORT
   ========================================================================== */

function triggerExcelExport() {
  const settings = getSettings();
  if (!settings) { showToast('Settings required.', 'error'); return; }

  const expenses = getExpenses();
  const fuel     = getFuelEntries();
  const filename = buildFilename('xlsx');
  const lang     = localStorage.getItem('lang') || DEFAULT_LANG;
  const t        = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];

  try {
    const workbook = generateFieldExcel(settings, expenses, fuel);
    triggerExcelDownload(workbook, filename);

    /* Show inline success */
    _setText('filenameExcel', filename);
    _toggleEl('successExcel', true);

    showToast(t.exportSuccess, 'success');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  }
}

/* Alias called by onclick="exportExcel()" in export.html */
function exportExcel() { triggerExcelExport(); }

/* ==========================================================================
   JSON EXPORT
   ========================================================================== */

function triggerJSONExport() {
  const settings = getSettings();
  if (!settings) { showToast('Settings required.', 'error'); return; }

  const expenses = getExpenses();
  const fuel     = getFuelEntries();
  const filename = buildFilename('json');
  const lang     = localStorage.getItem('lang') || DEFAULT_LANG;
  const t        = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];

  try {
    const json = generateFieldJSON(settings, expenses, fuel);
    triggerJSONDownload(json, filename);

    /* Show inline success */
    _setText('filenameJson', filename);
    _toggleEl('successJson', true);

    showToast(t.exportSuccess, 'success');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  }
}

/* Alias called by onclick="exportJson()" in export.html */
function exportJson() { triggerJSONExport(); }

/* ==========================================================================
   CLEAR GATE — enables the danger button only when input === 'CLEAR'
   ========================================================================== */

function setupClearGate() {
  const input    = document.getElementById('clearInput');
  const btnClear = document.getElementById('btnClearAll');
  if (!input || !btnClear) return;

  function check() {
    const ok = input.value === 'CLEAR';
    btnClear.disabled         = !ok;
    input.style.borderColor   = ok ? 'var(--color-danger)' : '';
    input.style.boxShadow     = ok ? '0 0 0 3px var(--color-danger-bg)' : '';
  }

  input.addEventListener('input', check);
  check(); /* run once on setup in case value is pre-filled */
}

/* ==========================================================================
   CLEAR ALL ENTRIES
   ========================================================================== */

function clearAllEntries() {
  /* Double-check the gate — defence against programmatic calls */
  const input = document.getElementById('clearInput');
  if (!input || input.value !== 'CLEAR') {
    showToast('Type CLEAR to confirm.', 'warning');
    return;
  }

  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  const t    = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];

  localStorage.removeItem('expenses');
  localStorage.removeItem('fuel');

  showToast(t.deleteSuccess || 'All entries cleared.', 'success');

  setTimeout(function () {
    window.location.href = 'index.html';
  }, 1500);
}

/* ==========================================================================
   INIT — called from export.html DOMContentLoaded
   ========================================================================== */

function initExportPage() {
  loadExportSummary();
  setupClearGate();
}

/* ==========================================================================
   DOM READY — also registers standalone (runs only on export.html)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  const page = window.location.pathname.split('/').pop();
  if (page !== 'export.html') return;

  initExportPage();

  /* Wire buttons via addEventListener (supplements onclick attrs in HTML) */
  _wireOnce('btnExportExcel', exportExcel);
  _wireOnce('btnExportJson',  exportJson);
  _wireOnce('btnClearAll',    clearAllEntries);
});

/* ==========================================================================
   PRIVATE HELPERS
   ========================================================================== */

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _toggleEl(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden', !show);
}

function _wireOnce(id, fn) {
  const el = document.getElementById(id);
  if (el && !el._exportWired) {
    el.addEventListener('click', fn);
    el._exportWired = true;
  }
}

function _buildInitials(name) {
  if (!name) return '--';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/* ---- Date range from mixed expenses + fuel entries ---- */
function _buildDateRange(expenses, fuel) {
  const MONTHS = {
    Jan:0, Feb:1, Mar:2, Apr:3, May:4,  Jun:5,
    Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11,
  };

  function toMs(dateStr) {
    if (!dateStr) return null;
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return null;
    const d = parseInt(parts[0], 10);
    const m = MONTHS[parts[1]];
    const y = parseInt(parts[2], 10);
    if (isNaN(d) || m === undefined || isNaN(y)) return null;
    return new Date(y, m, d).getTime();
  }

  const all = expenses.concat(fuel);
  if (!all.length) return '—';

  let minMs = Infinity;
  let maxMs = -Infinity;
  let minDate = '';
  let maxDate = '';

  all.forEach(function (e) {
    const ms = toMs(e.date);
    if (ms === null) return;
    if (ms < minMs) { minMs = ms; minDate = e.date; }
    if (ms > maxMs) { maxMs = ms; maxDate = e.date; }
  });

  if (!minDate) return '—';
  if (minDate === maxDate) return minDate;
  return minDate + ' → ' + maxDate;
}

/* ---- Checklist icon + label update ---- */
function _setChecklist(iconId, labelId, count, labelText) {
  const icon  = document.getElementById(iconId);
  const label = document.getElementById(labelId);

  if (icon) {
    icon.classList.remove('pass', 'fail', 'warn');
    icon.classList.add(count > 0 ? 'pass' : 'warn');

    /* Swap icon SVG: checkmark for pass, dash for warn */
    icon.innerHTML = count > 0
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  }

  if (label) label.textContent = labelText;
}
