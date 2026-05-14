/* ==========================================================================
   ExpenseFuel — Coordinator App · review.js
   Shared review logic for review-expenses.html and review-fuel.html.

   Depends on (loaded before this file):
     translations.js  →  TRANSLATIONS, DEFAULT_LANG
     utils.js         →  loadFromStorage(), saveToStorage(), showToast(), generateId()
     validations.js   →  validateExpenseEntry(), validateFuelEntry(),
                         validateKmContinuity(), validateDateSequence(),
                         validateExpenseTotals(), validateFuelTotals()
     app.js           →  getReviewData(), saveReviewData()

   Detected DOM structure (shared between both review pages):
     #pageErrorSection  #reviewContent  #pageTitle  #trackingChip  #pageSubtitle
     #validationBanner  #validationBannerTitle  #validationIssueList
     #toolbarProgressBar  #toolbarProgressFill  #toolbarProgressText
     #btnApproveAll  #btnSaveReviews  #btnSaveReviewsBottom
   Expenses-only:  #expenseTableBody  #expenseTable  #expenseEmptyState  #switchToFuelBtn
   Fuel-only:      #fuelTableBody  #fuelTable  #fuelEmptyState  #fuelTableFoot  #switchToExpensesBtn
   ========================================================================== */

/* ==========================================================================
   MODULE STATE
   ========================================================================== */

var importId   = null;
var importData = null;
var reviewData = {};   /* { [entryId]: { status, coordinatorNote } } */
var entryType  = null; /* 'expenses' | 'fuel' */

/* Private tracking sets populated during validation */
var _errorEntryIds = {}; /* entries with per-field validation failures */
var _kmMismatchIds = {}; /* fuel entries with KM continuity gaps */

/* ==========================================================================
   INIT
   ========================================================================== */

function initReviewPage() {

  /* ---- 1. Parse importId from URL ---- */
  var params = new URLSearchParams(window.location.search);
  importId   = params.get('importId') || '';

  if (!importId) { _showPageError(); return; }

  /* ---- 2. Detect which review page we are on ---- */
  var filename = window.location.pathname.split('/').pop().toLowerCase();
  entryType    = (filename === 'review-fuel.html') ? 'fuel' : 'expenses';

  /* ---- 3. Load import data ---- */
  importData = loadFromStorage('imported_' + importId, null);

  if (!importData) { _showPageError(); return; }

  /* ---- 4. Seed reviewData from saved state ---- */
  var saved   = getReviewData(importId);
  reviewData  = {};
  var entries = entryType === 'fuel'
    ? (importData.fuel     || [])
    : (importData.expenses || []);

  entries.forEach(function (e) {
    reviewData[e.id] = saved[e.id]
      ? { status: saved[e.id].status || 'pending', coordinatorNote: saved[e.id].coordinatorNote || '' }
      : { status: 'pending', coordinatorNote: '' };
  });

  /* ---- 5. Show content ---- */
  document.getElementById('pageErrorSection').classList.add('hidden');
  document.getElementById('reviewContent').classList.remove('hidden');

  /* ---- 6. Populate page header ---- */
  var member = importData.teamMember || {};
  var typeLabel = entryType === 'fuel' ? 'Fuel Review' : 'Expense Review';
  document.getElementById('pageTitle').textContent = (member.name || 'Unknown') + ' — ' + typeLabel;

  var subtitleEl = document.getElementById('pageSubtitle');
  if (subtitleEl) subtitleEl.textContent = member.mobile || '';

  var chip = document.getElementById('trackingChip');
  var tn   = member.trackingNumber || importData.trackingNumber;
  if (chip && tn) {
    chip.textContent = 'T-' + tn;
    chip.classList.remove('hidden');
  }

  /* Cross-link to the other review page for the same import */
  var crossLink = entryType === 'fuel'
    ? document.getElementById('switchToExpensesBtn')
    : document.getElementById('switchToFuelBtn');
  if (crossLink) {
    var crossTarget = entryType === 'fuel'
      ? 'review-expenses.html'
      : 'review-fuel.html';
    crossLink.href = crossTarget + '?importId=' + encodeURIComponent(importId);
  }

  /* ---- 7. Run validations, collect issues, auto-flag pending entries ---- */
  var validationResult = runAllValidations({
    expenses: importData.expenses || [],
    fuel:     importData.fuel     || [],
    declaredExpenseTotal: importData.totals ? importData.totals.expenseTotal : undefined,
    declaredFuelTotal:    importData.totals ? importData.totals.fuelTotal    : undefined,
    declaredKartaTotal:   importData.totals ? importData.totals.kartaTotal   : undefined,
  });

  _autoFlagIssues(validationResult);
  _showValidationBanner(_buildBannerIssues(validationResult));

  /* ---- 8. Render table ---- */
  if (entryType === 'expenses') {
    renderExpenseReview(importData.expenses || []);
  } else {
    renderFuelReview(importData.fuel || []);
    _renderTotalsRow(importData.fuel || []);
  }

  /* ---- 9. Initial progress display ---- */
  updateProgressDisplay();

  /* ---- 10. Wire buttons ---- */
  _bindBtn('btnApproveAll',         approveAll);
  _bindBtn('btnSaveReviews',        saveReviews);
  _bindBtn('btnSaveReviewsBottom',  saveReviews);
}


/* ==========================================================================
   AUTO-FLAG
   Sets status='flagged' and fills coordinatorNote for pending entries
   with detected validation issues. Never overwrites a non-pending status.
   ========================================================================== */

function _autoFlagIssues(v) {
  _errorEntryIds = {};
  _kmMismatchIds = {};

  if (entryType === 'expenses') {

    /* Per-entry validation errors */
    v.expenseErrors.forEach(function (err) {
      var id = err.entryId;
      if (!id) return;
      _errorEntryIds[id] = true;
      if (reviewData[id] && reviewData[id].status === 'pending') {
        reviewData[id].status          = 'flagged';
        reviewData[id].coordinatorNote = reviewData[id].coordinatorNote || err.errors[0] || 'Validation error';
      }
    });

    /* Date sequence issues */
    v.dateIssues.expenses.forEach(function (iss) {
      var id = iss.entryId;
      if (!id) return;
      _errorEntryIds[id] = true;
      if (reviewData[id] && reviewData[id].status === 'pending') {
        reviewData[id].status          = 'flagged';
        reviewData[id].coordinatorNote = reviewData[id].coordinatorNote || iss.message;
      }
    });

  } else {

    /* Per-entry validation errors */
    v.fuelErrors.forEach(function (err) {
      var id = err.entryId;
      if (!id) return;
      _errorEntryIds[id] = true;
      if (reviewData[id] && reviewData[id].status === 'pending') {
        reviewData[id].status          = 'flagged';
        reviewData[id].coordinatorNote = reviewData[id].coordinatorNote || err.errors[0] || 'Validation error';
      }
    });

    /* KM continuity gaps */
    v.kmIssues.forEach(function (iss) {
      var id = iss.entryId;
      if (!id) return;
      _kmMismatchIds[id] = true;
      if (reviewData[id] && reviewData[id].status === 'pending') {
        reviewData[id].status          = 'flagged';
        reviewData[id].coordinatorNote = reviewData[id].coordinatorNote || 'KM gap detected';
      }
    });

    /* Date sequence issues */
    v.dateIssues.fuel.forEach(function (iss) {
      var id = iss.entryId;
      if (!id) return;
      _errorEntryIds[id] = true;
      if (reviewData[id] && reviewData[id].status === 'pending') {
        reviewData[id].status          = 'flagged';
        reviewData[id].coordinatorNote = reviewData[id].coordinatorNote || iss.message;
      }
    });
  }
}


/* Build a flat array of human-readable issue strings for the banner */
function _buildBannerIssues(v) {
  var issues = [];
  var entries = entryType === 'fuel'
    ? (importData.fuel     || [])
    : (importData.expenses || []);

  /* Map id→index for "Row N" labels */
  var idToIndex = {};
  entries.forEach(function (e, i) { idToIndex[e.id] = i + 1; });

  if (entryType === 'expenses') {

    v.expenseErrors.forEach(function (err) {
      var rowNum = idToIndex[err.entryId] || '?';
      var date   = (entries[rowNum - 1] && entries[rowNum - 1].date) || '?';
      err.errors.forEach(function (msg) {
        issues.push('Row ' + rowNum + ' (' + date + '): ' + msg);
      });
    });

    v.dateIssues.expenses.forEach(function (iss) {
      issues.push('Date order: ' + iss.message);
    });

    if (v.totalIssues && v.totalIssues.expense && !v.totalIssues.expense.passed) {
      var t = v.totalIssues.expense;
      issues.push('Total mismatch: declared EGP ' + t.declared + ', actual EGP ' + t.actual + ' (diff: ' + t.difference + ')');
    }

  } else {

    v.fuelErrors.forEach(function (err) {
      var rowNum = idToIndex[err.entryId] || '?';
      var date   = (entries[rowNum - 1] && entries[rowNum - 1].date) || '?';
      err.errors.forEach(function (msg) {
        issues.push('Row ' + rowNum + ' (' + date + '): ' + msg);
      });
    });

    v.kmIssues.forEach(function (iss) {
      issues.push('KM gap — ' + iss.message +
        (iss.date   ? ' (date: ' + iss.date   + ')' : '') +
        (iss.siteId ? ' Site: '  + iss.siteId        : ''));
    });

    v.dateIssues.fuel.forEach(function (iss) {
      issues.push('Date order: ' + iss.message);
    });

    if (v.totalIssues && v.totalIssues.fuel) {
      var tf = v.totalIssues.fuel;
      if (!tf.fuelPassed)  issues.push('Fuel total mismatch: declared EGP ' + tf.declaredFuel  + ', actual EGP ' + tf.actualFuel  + ' (diff: ' + tf.fuelDifference  + ')');
      if (!tf.kartaPassed) issues.push('Karta total mismatch: declared EGP ' + tf.declaredKarta + ', actual EGP ' + tf.actualKarta + ' (diff: ' + tf.kartaDifference + ')');
    }
  }

  return issues;
}


/* ==========================================================================
   VALIDATION BANNER
   ========================================================================== */

function _showValidationBanner(issues) {
  if (!issues.length) return;

  var banner = document.getElementById('validationBanner');
  var title  = document.getElementById('validationBannerTitle');
  var list   = document.getElementById('validationIssueList');
  if (!banner) return;

  title.textContent = issues.length + ' issue' + (issues.length === 1 ? '' : 's') +
                      ' detected — affected rows are highlighted below';

  list.innerHTML = '';
  issues.slice(0, 10).forEach(function (msg) {
    var li = document.createElement('li');
    li.textContent = msg;
    list.appendChild(li);
  });

  if (issues.length > 10) {
    var more = document.createElement('li');
    more.textContent = 'and ' + (issues.length - 10) + ' more…';
    list.appendChild(more);
  }

  banner.classList.remove('hidden');
}


/* ==========================================================================
   RENDER — EXPENSES
   ========================================================================== */

function renderExpenseReview(expenses) {
  var tbody = document.getElementById('expenseTableBody');
  var empty = document.getElementById('expenseEmptyState');
  var table = document.getElementById('expenseTable');

  if (!expenses.length) {
    if (table) table.style.display = 'none';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (tbody) tbody.innerHTML = '';

  expenses.forEach(function (e, i) {
    var state  = reviewData[e.id] || { status: 'pending', coordinatorNote: '' };
    var hasErr = !!_errorEntryIds[e.id];

    var tr = document.createElement('tr');
    tr.dataset.entryId = e.id;
    _applyRowClass(tr, state.status);
    if (hasErr) tr.classList.add('has-issues');

    /* # */
    var tdNum = document.createElement('td');
    tdNum.className  = 'row-num';
    tdNum.textContent = String(i + 1);
    tr.appendChild(tdNum);

    /* Date */ tr.appendChild(_td(_esc(e.date  || '—'), 'ltr-field'));
    /* Project */ tr.appendChild(_td(_esc(e.projectName || '—')));
    /* Site ID */ tr.appendChild(_td(_esc(e.siteId      || '—'), 'ltr-field'));
    /* Job Code */ tr.appendChild(_td(_esc(e.jobCode    || '—'), 'ltr-field'));
    /* Category */ tr.appendChild(_td(_esc(e.category   || '—')));

    /* Description (truncated) */
    var tdDesc = document.createElement('td');
    tdDesc.className   = 'desc-cell';
    tdDesc.title       = e.itemDescription || '—';
    tdDesc.textContent = e.itemDescription || '—';
    tr.appendChild(tdDesc);

    /* Amount */
    tr.appendChild(_td(_esc(String(e.amount || 0)), 'amount-cell'));

    /* Status select + Note input */
    tr.appendChild(_buildStatusCell(e.id, state, i));
    tr.appendChild(_buildNoteCell(e.id, state, i, false));

    if (tbody) tbody.appendChild(tr);
  });
}


/* ==========================================================================
   RENDER — FUEL
   ========================================================================== */

function renderFuelReview(fuel) {
  var tbody = document.getElementById('fuelTableBody');
  var empty = document.getElementById('fuelEmptyState');
  var table = document.getElementById('fuelTable');

  if (!fuel.length) {
    if (table) table.style.display = 'none';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (tbody) tbody.innerHTML = '';

  fuel.forEach(function (f, i) {
    var state    = reviewData[f.id] || { status: 'pending', coordinatorNote: '' };
    var hasErr   = !!_errorEntryIds[f.id];
    var hasKmGap = !!_kmMismatchIds[f.id];

    var startKm  = parseFloat(f.startKm) || 0;
    var endKm    = parseFloat(f.endKm)   || 0;
    var distance = endKm > startKm ? endKm - startKm : 0;

    var tr = document.createElement('tr');
    tr.dataset.entryId = f.id;
    _applyRowClass(tr, state.status);
    if (hasKmGap) tr.classList.add('row-warning');
    if (hasErr)   tr.classList.add('has-issues');

    /* # — with optional KM gap badge */
    var tdNum = document.createElement('td');
    tdNum.className = 'row-num';
    if (hasKmGap) {
      tdNum.innerHTML = _esc(String(i + 1)) +
        '<span class="km-warn-icon" title="KM mismatch" aria-label="KM mismatch">!</span>';
    } else {
      tdNum.textContent = String(i + 1);
    }
    tr.appendChild(tdNum);

    /* Date */ tr.appendChild(_td(_esc(f.date || '—'), 'ltr-field'));
    /* Project */ tr.appendChild(_td(_esc(f.projectName || '—')));
    /* Site ID */ tr.appendChild(_td(_esc(f.siteId      || '—'), 'ltr-field'));
    /* Job Code */ tr.appendChild(_td(_esc(f.jobCode    || '—'), 'ltr-field'));

    /* Start KM — amber if gap */
    var tdStart = _td(_esc(String(f.startKm || 0)), 'num-cell');
    if (hasKmGap) tdStart.style.color = 'var(--color-warning)';
    tr.appendChild(tdStart);

    /* End KM */ tr.appendChild(_td(_esc(String(f.endKm       || 0)), 'num-cell'));
    /* Dist  */ tr.appendChild(_td(_esc(String(distance)),            'num-cell'));
    /* Fuel  */ tr.appendChild(_td(_esc(String(f.fuelAmount   || 0)), 'fuel-cell'));
    /* Karta */ tr.appendChild(_td(_esc(String(f.kartaAmount  || 0)), 'num-cell'));
    /* Area  */ tr.appendChild(_td(_esc(f.area   || '—')));
    /* Driver */ tr.appendChild(_td(_esc(f.driver || '—')));

    /* Status select + Note input (km-warning variant for note) */
    tr.appendChild(_buildStatusCell(f.id, state, i, hasKmGap));
    tr.appendChild(_buildNoteCell(f.id, state, i, hasKmGap));

    if (tbody) tbody.appendChild(tr);
  });
}


/* Fuel totals row in <tfoot> */
function _renderTotalsRow(fuel) {
  if (!fuel.length) return;
  var tfoot = document.getElementById('fuelTableFoot');
  if (!tfoot) return;

  var totalFuel  = fuel.reduce(function (s, f) { return s + (parseFloat(f.fuelAmount)  || 0); }, 0);
  var totalKarta = fuel.reduce(function (s, f) { return s + (parseFloat(f.kartaAmount) || 0); }, 0);

  var tr = document.createElement('tr');
  tr.className = 'totals-row';

  [                    /* col label    class        */
    ['Totals', 'row-num'],
    ['—', ''], ['—', ''], ['—', ''], ['—', ''],
    ['—', 'num-cell'], ['—', 'num-cell'], ['—', 'num-cell'],
  ].forEach(function (pair) { tr.appendChild(_footTd(pair[0], pair[1])); });

  var tdFuel = document.createElement('td');
  tdFuel.className  = 'fuel-cell total-value';
  tdFuel.textContent = String(Math.round(totalFuel  * 100) / 100);
  tr.appendChild(tdFuel);

  var tdKarta = document.createElement('td');
  tdKarta.className  = 'num-cell total-value';
  tdKarta.textContent = String(Math.round(totalKarta * 100) / 100);
  tr.appendChild(tdKarta);

  tr.appendChild(_footTd('—'));   /* Area   */
  tr.appendChild(_footTd('—'));   /* Driver */
  tr.appendChild(_footTd(''));    /* Status */
  tr.appendChild(_footTd(''));    /* Note   */

  tfoot.appendChild(tr);
}


/* ==========================================================================
   UPDATE ENTRY — called by select/input listeners
   ========================================================================== */

function updateReviewEntry(id, field, value) {
  if (!reviewData[id]) reviewData[id] = { status: 'pending', coordinatorNote: '' };

  if (field === 'status') reviewData[id].status          = value;
  if (field === 'note')   reviewData[id].coordinatorNote = value;

  if (field === 'status') {
    var tr = document.querySelector('tr[data-entry-id="' + id + '"]');
    if (tr) {
      _applyRowClass(tr, value);
      /* Fuel: preserve amber km-warning highlight regardless of status */
      if (_kmMismatchIds[id]) tr.classList.add('row-warning');
    }
  }

  updateProgressDisplay();
}


/* ==========================================================================
   PROGRESS
   ========================================================================== */

function updateProgressDisplay() {
  var entries = entryType === 'fuel'
    ? (importData ? (importData.fuel     || []) : [])
    : (importData ? (importData.expenses || []) : []);

  var total    = entries.length;
  var reviewed = 0;
  var approved = 0;
  var flagged  = 0;

  entries.forEach(function (e) {
    var rd = reviewData[e.id];
    if (!rd) return;
    if (rd.status !== 'pending') reviewed++;
    if (rd.status === 'approved') approved++;
    if (rd.status === 'flagged')  flagged++;
  });

  var pct  = total > 0 ? Math.round((reviewed / total) * 100) : 0;
  var fill = document.getElementById('toolbarProgressFill');
  var text = document.getElementById('toolbarProgressText');
  var bar  = document.getElementById('toolbarProgressBar');

  if (fill) {
    fill.style.width = pct + '%';
    fill.className   = 'toolbar-progress-fill' + (pct >= 100 ? ' complete' : '');
  }
  if (text) text.textContent = reviewed + ' / ' + total + ' reviewed';
  if (bar)  bar.setAttribute('aria-valuenow', String(pct));
}


/* ==========================================================================
   APPROVE ALL
   ========================================================================== */

function approveAll() {
  var entries = entryType === 'fuel'
    ? (importData ? (importData.fuel     || []) : [])
    : (importData ? (importData.expenses || []) : []);

  entries.forEach(function (e) {
    reviewData[e.id].status = 'approved';
  });

  var tbodyId = entryType === 'fuel' ? 'fuelTableBody' : 'expenseTableBody';
  document.querySelectorAll('#' + tbodyId + ' tr').forEach(function (tr) {
    var id = tr.dataset.entryId;
    if (!id) return;
    var wasKmGap = tr.classList.contains('row-warning');
    _applyRowClass(tr, 'approved');
    if (wasKmGap) tr.classList.add('row-warning');
    var sel = tr.querySelector('.status-select');
    if (sel) { sel.value = 'approved'; _applySelectClass(sel, 'approved'); }
  });

  updateProgressDisplay();
}


/* ==========================================================================
   SAVE REVIEWS
   ========================================================================== */

function saveReviews() {
  if (!importId) return;

  /* Merge current-page entries into the shared review map, preserving other page's data */
  var existing = getReviewData(importId);
  var now      = new Date().toISOString();

  Object.keys(reviewData).forEach(function (id) {
    existing[id] = {
      status:          reviewData[id].status,
      coordinatorNote: reviewData[id].coordinatorNote,
      reviewedAt:      now,
    };
  });

  saveReviewData(importId, existing);

  var lang = localStorage.getItem('lang') || DEFAULT_LANG;
  var t    = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
  showToast(t.saveSuccess || 'Reviews saved', 'success');
}


/* ==========================================================================
   DOM READY
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  initReviewPage();
});


/* ==========================================================================
   PRIVATE HELPERS
   ========================================================================== */

function _showPageError() {
  var errEl  = document.getElementById('pageErrorSection');
  var revEl  = document.getElementById('reviewContent');
  if (errEl) errEl.classList.remove('hidden');
  if (revEl) revEl.classList.add('hidden');
}

/* Build a status <select> wrapped in a <td> */
function _buildStatusCell(id, state, rowIndex, isKmGap) {
  var td  = document.createElement('td');
  var sel = document.createElement('select');
  sel.className = 'status-select';
  sel.setAttribute('aria-label', 'Status for row ' + (rowIndex + 1));

  ['pending', 'approved', 'flagged'].forEach(function (val) {
    var opt = document.createElement('option');
    opt.value       = val;
    opt.textContent = val.charAt(0).toUpperCase() + val.slice(1);
    if (val === state.status) opt.selected = true;
    sel.appendChild(opt);
  });

  _applySelectClass(sel, state.status);

  sel.addEventListener('change', function () {
    _applySelectClass(sel, sel.value);
    updateReviewEntry(id, 'status', sel.value);
  });

  td.appendChild(sel);
  return td;
}

/* Build a note <input> wrapped in a <td> */
function _buildNoteCell(id, state, rowIndex, isKmGap) {
  var td  = document.createElement('td');
  var inp = document.createElement('input');
  inp.type        = 'text';
  inp.className   = 'note-input' + (isKmGap ? ' km-warning' : '');
  inp.value       = state.coordinatorNote || '';
  inp.placeholder = isKmGap ? 'KM gap detected' : 'Add note…';
  inp.setAttribute('aria-label', 'Note for row ' + (rowIndex + 1));

  inp.addEventListener('input', function () {
    updateReviewEntry(id, 'note', inp.value);
  });

  td.appendChild(inp);
  return td;
}

function _td(html, extraClass) {
  var td = document.createElement('td');
  if (extraClass) td.className = extraClass;
  td.innerHTML = html;
  return td;
}

function _footTd(text, extraClass) {
  var td = document.createElement('td');
  if (extraClass) td.className = extraClass;
  td.textContent = text;
  return td;
}

function _applyRowClass(tr, status) {
  tr.classList.remove('row-approved', 'row-flagged');
  if (status === 'approved') tr.classList.add('row-approved');
  if (status === 'flagged')  tr.classList.add('row-flagged');
}

function _applySelectClass(sel, status) {
  sel.className = 'status-select';
  if (status === 'approved') sel.classList.add('status-approved');
  if (status === 'flagged')  sel.classList.add('status-flagged');
  if (status === 'pending')  sel.classList.add('status-pending');
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _bindBtn(id, fn) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}
