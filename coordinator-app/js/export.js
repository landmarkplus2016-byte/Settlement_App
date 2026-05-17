/* ==========================================================================
   ExpenseFuel — Coordinator App · export.js
   Handles the export.html page: checklist, summary, Excel generation.

   Depends on (loaded before this file):
     xlsx.full.min.js   →  window.XLSX
     translations.js    →  TRANSLATIONS, DEFAULT_LANG
     utils.js           →  loadFromStorage(), showToast()
     validations.js     →  validateKmContinuity(), validateExpenseTotals(),
                           validateFuelTotals()
     excel-export.js    →  generateCoordinatorExcel(), triggerExcelDownload()
     app.js             →  getReviewData()
   ========================================================================== */

/* ==========================================================================
   MODULE STATE
   ========================================================================== */

var importId   = null;
var importData = null;
var reviewData = {};

/* ==========================================================================
   INIT
   ========================================================================== */

function initExportPage() {

  /* ---- 1. Parse importId from URL ---- */
  var params  = new URLSearchParams(window.location.search);
  importId    = params.get('importId') || '';

  if (!importId) { _showPageError(); return; }

  /* ---- 2. Load import + review data ---- */
  importData = loadFromStorage('imported_' + importId, null);
  if (!importData) { _showPageError(); return; }

  reviewData = getReviewData(importId);

  /* ---- 3. Show page content ---- */
  document.getElementById('pageErrorSection').classList.add('hidden');
  document.getElementById('exportContent').classList.remove('hidden');

  /* ---- 4. Populate page header ---- */
  var member = importData.teamMember || {};

  document.getElementById('pageTitle').textContent =
    'Export Final Sheet — ' + (member.name || 'Unknown');

  var subtitleEl = document.getElementById('pageSubtitle');
  if (subtitleEl) subtitleEl.textContent = member.mobile || '';

  var chip = document.getElementById('trackingChip');
  var tn   = member.trackingNumber || importData.trackingNumber;
  if (chip && tn) { chip.textContent = 'T-' + tn; chip.classList.remove('hidden'); }

  /* Review cross-links */
  var enc = encodeURIComponent(importId);
  var expLink  = document.getElementById('reviewExpensesLink');
  var fuelLink = document.getElementById('reviewFuelLink');
  if (expLink)  expLink.href  = 'review-expenses.html?importId=' + enc;
  if (fuelLink) fuelLink.href = 'review-fuel.html?importId='    + enc;

  /* ---- 5. Pre-display planned filename ---- */
  var filenameEl = document.getElementById('plannedFilename');
  if (filenameEl) filenameEl.textContent = 'File: ' + buildCoordFilename();

  /* ---- 6. Build checklist and summary ---- */
  buildChecklist();
  buildExportSummary();
}


/* ==========================================================================
   CHECKLIST
   ========================================================================== */

function buildChecklist() {
  var expenses = importData ? (importData.expenses || []) : [];
  var fuel     = importData ? (importData.fuel     || []) : [];

  /* ---- Partition entries by review status ---- */
  var pendingCount  = 0;
  var rejectedExpCnt = 0;
  var rejectedFuelCnt = 0;

  expenses.forEach(function (e) {
    var status = _statusOf(e.id);
    if (status === 'pending') pendingCount++;
    if (status === 'rejected') rejectedExpCnt++;
  });

  fuel.forEach(function (f) {
    var status = _statusOf(f.id);
    if (status === 'pending') pendingCount++;
    if (status === 'rejected') rejectedFuelCnt++;
  });

  /* Approved-only fuel — KM continuity check on the subset being exported */
  var approvedFuel = fuel.filter(function (f) { return _statusOf(f.id) === 'approved'; });
  var kmIssues     = validateKmContinuity(approvedFuel);

  /* Expense total validation */
  var approvedExpenses = expenses.filter(function (e) { return _statusOf(e.id) === 'approved'; });
  var expTotCheck      = validateExpenseTotals(
    approvedExpenses,
    importData.totals ? importData.totals.expenseTotal : undefined
  );

  /* Fuel total validation (on approved fuel) */
  var fuelTotCheck = validateFuelTotals(
    approvedFuel,
    importData.totals ? importData.totals.fuelTotal  : undefined,
    importData.totals ? importData.totals.kartaTotal : undefined
  );

  var allReviewed      = pendingCount    === 0;
  var noFlaggedExpenses = rejectedExpCnt  === 0;
  var noFlaggedFuel    = rejectedFuelCnt  === 0;
  var kmOk             = kmIssues.length === 0;

  /* Total validation passes if declared values weren't provided (no comparison possible) */
  var expenseTotalsOk = (importData.totals === undefined || importData.totals.expenseTotal === undefined)
    ? true
    : expTotCheck.passed;

  var fuelTotalsOk = (importData.totals === undefined || importData.totals.fuelTotal === undefined)
    ? true
    : (fuelTotCheck.fuelPassed && fuelTotCheck.kartaPassed);

  /* ---- Render ---- */
  var items = [
    {
      pass:   allReviewed,
      label:  'All entries reviewed',
      detail: allReviewed
        ? 'No pending entries.'
        : pendingCount + ' entr' + (pendingCount === 1 ? 'y' : 'ies') + ' still pending.',
    },
    {
      pass:   noFlaggedExpenses,
      label:  'No rejected expenses',
      detail: noFlaggedExpenses
        ? 'All expense entries approved.'
        : rejectedExpCnt + ' expense entr' + (rejectedExpCnt === 1 ? 'y' : 'ies') + ' rejected — excluded from export.',
    },
    {
      pass:   noFlaggedFuel,
      label:  'No rejected fuel entries',
      detail: noFlaggedFuel
        ? 'All fuel entries approved.'
        : rejectedFuelCnt + ' fuel entr' + (rejectedFuelCnt === 1 ? 'y' : 'ies') + ' rejected — excluded from export.',
    },
    {
      pass:   kmOk,
      label:  'KM continuity verified',
      detail: kmOk
        ? 'Approved fuel KM sequence is continuous.'
        : kmIssues.length + ' KM gap' + (kmIssues.length === 1 ? '' : 's') + ' in the approved fuel set.',
    },
    {
      pass:   expenseTotalsOk,
      label:  'Expense totals match',
      detail: expenseTotalsOk
        ? 'Approved expense total matches the declared total.'
        : 'Expense total mismatch: declared EGP ' + (importData.totals && importData.totals.expenseTotal) +
          ', approved EGP ' + (Math.round(expTotCheck.actual * 100) / 100) + '.',
    },
    {
      pass:   fuelTotalsOk,
      label:  'Fuel totals match',
      detail: fuelTotalsOk
        ? 'Approved fuel and karta totals match declared values.'
        : 'Fuel/karta total mismatch in the approved set.',
    },
  ];

  var container = document.getElementById('checklist');
  if (!container) return;
  container.innerHTML = '';

  var anyFail = false;

  items.forEach(function (item) {
    if (!item.pass) anyFail = true;

    var div = document.createElement('div');
    div.className = 'checklist-item ' + (item.pass ? 'pass' : 'fail');

    var iconDiv = document.createElement('div');
    iconDiv.className = 'checklist-icon ' + (item.pass ? 'pass' : 'fail');
    iconDiv.setAttribute('aria-hidden', 'true');
    iconDiv.innerHTML = item.pass
      ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    var labelDiv = document.createElement('div');
    labelDiv.className = 'checklist-label';
    labelDiv.textContent = item.label;

    var detailDiv = document.createElement('div');
    detailDiv.className = 'checklist-status';
    detailDiv.textContent = item.detail;

    div.append(iconDiv, labelDiv, detailDiv);
    container.appendChild(div);
  });

  /* Warning note */
  var warningEl = document.getElementById('checklistWarning');
  if (warningEl) warningEl.classList.toggle('hidden', !anyFail);
}


/* ==========================================================================
   EXPORT SUMMARY
   ========================================================================== */

function buildExportSummary() {
  var expenses = importData ? (importData.expenses || []) : [];
  var fuel     = importData ? (importData.fuel     || []) : [];

  var approvedExpenses = expenses.filter(function (e) { return _statusOf(e.id) === 'approved'; });
  var approvedFuel     = fuel.filter(    function (f) { return _statusOf(f.id) === 'approved'; });

  var rejectedCount = 0;
  expenses.forEach(function (e) { if (_statusOf(e.id) === 'rejected') rejectedCount++; });
  fuel.forEach(    function (f) { if (_statusOf(f.id) === 'rejected') rejectedCount++; });

  var expTotal   = approvedExpenses.reduce(function (s, e) { return s + (parseFloat(e.amount)     || 0); }, 0);
  var fuelTotal  = approvedFuel.reduce(    function (s, f) { return s + (parseFloat(f.fuelAmount)  || 0); }, 0);
  var kartaTotal = approvedFuel.reduce(    function (s, f) { return s + (parseFloat(f.kartaAmount) || 0); }, 0);

  _setText('statApprovedExp',
    approvedExpenses.length + ' entr' + (approvedExpenses.length === 1 ? 'y' : 'ies') +
    ' — EGP ' + _fmt(expTotal));

  _setText('statApprovedFuel',
    approvedFuel.length + ' entr' + (approvedFuel.length === 1 ? 'y' : 'ies') +
    ' — EGP ' + _fmt(fuelTotal));

  _setText('statApprovedKarta', 'EGP ' + _fmt(kartaTotal));

  _setText('statFlagged',
    rejectedCount + ' entr' + (rejectedCount === 1 ? 'y' : 'ies') + ' excluded');

  var member = importData ? (importData.teamMember || {}) : {};
  _setText('summarySubtitle',
    (member.name || '') + (importData && importData.month ? ' — ' + importData.month : ''));
}


/* ==========================================================================
   FILENAME
   ========================================================================== */

function buildCoordFilename() {
  var member    = importData ? (importData.teamMember || {}) : {};
  var fullName  = member.name || 'Unknown';
  var firstName = fullName.trim().split(/\s+/)[0];
  var safeName  = firstName.replace(/[^a-zA-Z0-9؀-ۿ]/g, '_'); /* keep Arabic chars */
  var tracking  = member.trackingNumber || (importData && importData.trackingNumber) || 0;

  var month = (importData && importData.month)
    || _deriveMonth(importData ? importData.expenses : [], importData ? importData.fuel : [])
    || 'unknown';

  var year = new Date().getFullYear();

  return 'APPROVED_' + safeName + '_T' + tracking + '_' + month + year + '.xlsx';
}


/* ==========================================================================
   EXPORT TRIGGER
   ========================================================================== */

async function triggerFinalExport() {
  var btn = document.getElementById('btnExport');
  if (btn) btn.disabled = true;

  try {
    var wb       = await generateCoordinatorExcel(importData, reviewData);
    var filename = buildCoordFilename();

    /* ExcelJS: write to buffer then trigger download via FileSaver */
    var buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), filename);

    _setText('exportedFilenameText', filename);

    var exportSection  = document.getElementById('exportBtnSection');
    var successSection = document.getElementById('successSection');
    if (exportSection)  exportSection.classList.add('hidden');
    if (successSection) successSection.classList.remove('hidden');

    var lang = localStorage.getItem('lang') || DEFAULT_LANG;
    var t    = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
    showToast(t.exportSuccess || 'Exported successfully', 'success');

  } catch (err) {
    if (btn) btn.disabled = false;
    showToast('Export failed: ' + (err.message || 'unknown error'), 'error');
  }
}

/* Reset to export button after "Export Again" click */
function _resetToExportBtn() {
  var exportSection  = document.getElementById('exportBtnSection');
  var successSection = document.getElementById('successSection');
  if (exportSection)  exportSection.classList.remove('hidden');
  if (successSection) successSection.classList.add('hidden');

  var btn = document.getElementById('btnExport');
  if (btn) btn.disabled = false;
}


/* ==========================================================================
   DOM READY
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  initExportPage();

  var btnExport = document.getElementById('btnExport');
  if (btnExport) btnExport.addEventListener('click', triggerFinalExport);

  var btnAgain = document.getElementById('btnExportAgain');
  if (btnAgain) btnAgain.addEventListener('click', _resetToExportBtn);
});


/* ==========================================================================
   PRIVATE HELPERS
   ========================================================================== */

/* Return status of an entry, defaulting to 'pending' if not reviewed */
function _statusOf(entryId) {
  var rd = reviewData[entryId];
  return (rd && rd.status) ? rd.status : 'pending';
}

function _showPageError() {
  var errEl = document.getElementById('pageErrorSection');
  var conEl = document.getElementById('exportContent');
  if (errEl) errEl.classList.remove('hidden');
  if (conEl) conEl.classList.add('hidden');
}

function _setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _fmt(n) {
  return (Math.round(n * 100) / 100).toLocaleString();
}

/* Extract report month from the first available entry */
function _deriveMonth(expenses, fuel) {
  if (expenses && expenses.length > 0 && expenses[0].month) return expenses[0].month;
  if (fuel      && fuel.length      > 0 && fuel[0].month)      return fuel[0].month;
  return '';
}
