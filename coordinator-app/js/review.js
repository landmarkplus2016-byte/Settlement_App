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
      ? { status: _normalizeStatus(saved[e.id].status), coordinatorNote: saved[e.id].coordinatorNote || '' }
      : { status: 'approved', coordinatorNote: '' };
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

  /* trackingChip intentionally not shown */

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

  /* ---- 8. Render table ---- */
  if (entryType === 'expenses') {
    renderExpenseReview(importData.expenses || []);
  } else {
    renderFuelReview(importData.fuel || []);
  }

  /* ---- 9. Initial progress display ---- */
  updateProgressDisplay();

  /* ---- 10. Wire buttons ---- */
  _bindBtn('btnApproveAll',         approveAll);
  _bindBtn('btnSaveReviews',        saveReviews);
  _bindBtn('btnSaveReviewsBottom',  saveReviews);
  _bindBtn('btnAutoFillJC',         applyCoordTracking);
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
        reviewData[id].status          = 'rejected';
        reviewData[id].coordinatorNote = reviewData[id].coordinatorNote || err.errors[0] || 'Validation error';
      }
    });

    /* Date sequence issues */
    v.dateIssues.expenses.forEach(function (iss) {
      var id = iss.entryId;
      if (!id) return;
      _errorEntryIds[id] = true;
      if (reviewData[id] && reviewData[id].status === 'pending') {
        reviewData[id].status          = 'rejected';
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
        reviewData[id].status          = 'rejected';
        reviewData[id].coordinatorNote = reviewData[id].coordinatorNote || err.errors[0] || 'Validation error';
      }
    });

    /* KM continuity gaps */
    v.kmIssues.forEach(function (iss) {
      var id = iss.entryId;
      if (!id) return;
      _kmMismatchIds[id] = true;
      if (reviewData[id] && reviewData[id].status === 'pending') {
        reviewData[id].status          = 'rejected';
        reviewData[id].coordinatorNote = reviewData[id].coordinatorNote || 'KM gap detected';
      }
    });

    /* Date sequence issues */
    v.dateIssues.fuel.forEach(function (iss) {
      var id = iss.entryId;
      if (!id) return;
      _errorEntryIds[id] = true;
      if (reviewData[id] && reviewData[id].status === 'pending') {
        reviewData[id].status          = 'rejected';
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

    /* Date */        tr.appendChild(_editTd(e.id, 'date',            e.date          || '', { ltr: true,  placeholder: 'DD-Mon-YYYY' }));
    /* Project */     tr.appendChild(_editTd(e.id, 'projectName',     e.projectName   || '', { placeholder: 'Project' }));
    /* Site ID */     tr.appendChild(_editTd(e.id, 'siteId',          e.siteId        || '', { ltr: true,  placeholder: 'Site ID', wrap: true }));
    /* Job Code */    tr.appendChild(_editTd(e.id, 'jobCode',         e.jobCode       || '', { ltr: true,  placeholder: 'JC',      wrap: true, jcCell: e.id }));
    /* Category */    tr.appendChild(_editTd(e.id, 'category',        e.category      || '', { placeholder: 'Category' }));
    /* Description */ tr.appendChild(_editTd(e.id, 'itemDescription', e.itemDescription || '', { minWidth: 140, placeholder: 'Description' }));
    /* Amount */      tr.appendChild(_editTd(e.id, 'amount',          e.amount        || 0,  { type: 'number', ltr: true, min: 0, step: 'any' }));

    /* Comment from the original sheet — editable */
    tr.appendChild(_editTd(e.id, 'comment', e.comment || '', { placeholder: 'Comment…', minWidth: 130 }));
    /* Approval status */
    tr.appendChild(_buildStatusCell(e.id, state, i));

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

    var U = { updateFn: updateFuelField }; /* shorthand opts base for fuel fields */

    /* Date */        tr.appendChild(_editTd(f.id, 'date',        f.date        || '', Object.assign({}, U, { ltr: true, placeholder: 'DD-Mon-YYYY' })));
    /* Project */     tr.appendChild(_editTd(f.id, 'projectName', f.projectName || '', Object.assign({}, U, { placeholder: 'Project' })));
    /* Site ID */     tr.appendChild(_editTd(f.id, 'siteId',      f.siteId      || '', Object.assign({}, U, { ltr: true, placeholder: 'Site ID', wrap: true })));
    /* Job Code */    tr.appendChild(_editTd(f.id, 'jobCode',     f.jobCode     || '', Object.assign({}, U, { ltr: true, placeholder: 'JC', wrap: true, jcCell: f.id })));

    /* Start KM — amber tint on input if KM gap */
    var tdStartKm = _editTd(f.id, 'startKm', f.startKm || 0, Object.assign({}, U, { type: 'number', ltr: true, min: 0 }));
    if (hasKmGap) { var skInp = tdStartKm.querySelector('input'); if (skInp) skInp.classList.add('km-gap'); }
    tr.appendChild(tdStartKm);

    /* End KM */      tr.appendChild(_editTd(f.id, 'endKm',      f.endKm      || 0, Object.assign({}, U, { type: 'number', ltr: true, min: 0 })));
    /* Fuel */        tr.appendChild(_editTd(f.id, 'fuelAmount',  f.fuelAmount  || 0, Object.assign({}, U, { type: 'number', ltr: true, min: 0 })));
    /* Karta */       tr.appendChild(_editTd(f.id, 'kartaAmount', f.kartaAmount || 0, Object.assign({}, U, { type: 'number', ltr: true, min: 0 })));
    /* Area */        tr.appendChild(_editTd(f.id, 'area',        f.area        || '', Object.assign({}, U, { placeholder: 'Area' })));
    /* Driver */      tr.appendChild(_editTd(f.id, 'driver',      f.driver      || '', Object.assign({}, U, { placeholder: 'Driver' })));
    /* City */        tr.appendChild(_editTd(f.id, 'city',        f.city        || '', Object.assign({}, U, { placeholder: 'City' })));
    /* Coordinator */ tr.appendChild(_editTd(f.id, 'coordinator', f.coordinator || '', Object.assign({}, U, { placeholder: 'Coordinator' })));

    /* Approval status — last column */
    tr.appendChild(_buildStatusCell(f.id, state, i));

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

  /* # | Date | Project | Site ID | Job Code | Start KM | End KM */
  [
    ['Totals', 'row-num'],
    ['—', ''], ['—', ''], ['—', ''], ['—', ''],
    ['—', 'num-cell'], ['—', 'num-cell'],
  ].forEach(function (pair) { tr.appendChild(_footTd(pair[0], pair[1])); });

  /* Fuel total */
  var tdFuel = document.createElement('td');
  tdFuel.className   = 'fuel-cell total-value';
  tdFuel.textContent = String(Math.round(totalFuel  * 100) / 100);
  tr.appendChild(tdFuel);

  /* Karta total */
  var tdKarta = document.createElement('td');
  tdKarta.className  = 'num-cell total-value';
  tdKarta.textContent = String(Math.round(totalKarta * 100) / 100);
  tr.appendChild(tdKarta);

  tr.appendChild(_footTd('—'));   /* Area        */
  tr.appendChild(_footTd('—'));   /* Driver      */
  tr.appendChild(_footTd('—'));   /* City        */
  tr.appendChild(_footTd('—'));   /* Coordinator */
  tr.appendChild(_footTd(''));    /* Approval STS */

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
   AUTO-FILL JOB CODES FROM COORDINATOR TRACKING
   Reads coord_tracking from localStorage, loops through all expense entries,
   splits siteId by "/" to handle composite sites, looks up each site's JC,
   updates the in-memory data + the visible table cell.
   ========================================================================== */

function applyCoordTracking() {
  /* Guard: tracking must be loaded */
  var tracking = (typeof loadCoordTracking === 'function') ? loadCoordTracking() : null;
  if (!tracking || !tracking.map || tracking.siteCount === 0) {
    showToast('No coordinator tracking loaded — upload it on the Import page first', 'warning');
    return;
  }

  /* Work on whichever tab is currently open */
  var entries = importData
    ? (entryType === 'fuel' ? (importData.fuel || []) : (importData.expenses || []))
    : [];

  var filled  = 0;
  var skipped = 0;

  entries.forEach(function (e) {
    var jc = (typeof lookupJC === 'function')
      ? lookupJC(e.siteId, tracking.map)
      : '';

    if (!jc) { skipped++; return; }

    /* Update in-memory entry */
    e.jobCode = jc;
    filled++;

    /* Update the visible textarea (Job Code uses wrap:true → textarea) */
    var jcEl = document.querySelector('[data-jc-cell="' + e.id + '"]');
    if (jcEl) {
      jcEl.value = jc;
      jcEl.style.height = 'auto';
      jcEl.style.height = jcEl.scrollHeight + 'px';
    }
  });

  /* Persist the updated import data so it survives a page reload */
  if (filled > 0 && importId) {
    saveToStorage('imported_' + importId, importData);
  }

  if (filled > 0) {
    var msg = 'Auto-filled ' + filled + ' Job Code' + (filled !== 1 ? 's' : '');
    if (skipped > 0) msg += ' (' + skipped + ' site' + (skipped !== 1 ? 's' : '') + ' not found in tracking)';
    showToast(msg, 'success');
  } else {
    showToast(
      skipped > 0
        ? 'No matching sites found in coordinator tracking'
        : 'Nothing to fill — all Job Codes already set',
      'info'
    );
  }
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

  [['approved', 'Approved'], ['rejected', 'Rejected']].forEach(function (pair) {
    var opt = document.createElement('option');
    opt.value       = pair[0];
    opt.textContent = pair[1];
    if (pair[0] === state.status) opt.selected = true;
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

/* Build an editable <td><input|textarea></td> for expense review rows.
   opts: { type, ltr, placeholder, min, step, minWidth, jcCell, wrap }
   wrap:true → uses <textarea> so multi-value cells (Site ID, Job Code) can wrap. */
function _editTd(entryId, field, value, opts) {
  opts = opts || {};
  var td  = document.createElement('td');
  var el;

  if (opts.wrap) {
    /* ---- Wrapping textarea (Site ID, Job Code) ---- */
    el = document.createElement('textarea');
    el.rows = 1;

    /* Auto-resize to fit content height */
    function _autoResize() {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
    el.addEventListener('input', _autoResize);
    setTimeout(_autoResize, 0); /* run after element is in DOM */

    el.addEventListener('change', function () {
      var fn = opts.updateFn || updateExpenseField;
      fn(entryId, field, el.value, 'text');
    });

  } else {
    /* ---- Standard input ---- */
    el = document.createElement('input');
    el.type = opts.type || 'text';

    if (opts.min  !== undefined) el.min  = String(opts.min);
    if (opts.step !== undefined) el.step = String(opts.step);

    el.addEventListener('change', function () {
      var fn = opts.updateFn || updateExpenseField;
      fn(entryId, field, el.value, el.type);
    });
  }

  el.value       = (value !== null && value !== undefined) ? String(value) : '';
  el.placeholder = opts.placeholder || '';
  el.className   = 'cell-edit-input' + (opts.ltr ? ' ltr-field' : '');

  if (opts.minWidth) el.style.minWidth = opts.minWidth + 'px';

  /* Tag JC elements so applyCoordTracking() can update them */
  if (opts.jcCell) el.dataset.jcCell = opts.jcCell;

  td.appendChild(el);
  return td;
}

/* Persist a single field change back into importData + localStorage */
function updateExpenseField(id, field, rawValue, inputType) {
  if (!importData || !importData.expenses) return;
  for (var k = 0; k < importData.expenses.length; k++) {
    if (importData.expenses[k].id === id) {
      importData.expenses[k][field] = (inputType === 'number')
        ? (parseFloat(rawValue) || 0)
        : rawValue;
      break;
    }
  }
  if (importId) saveToStorage('imported_' + importId, importData);
}

function updateFuelField(id, field, rawValue, inputType) {
  if (!importData || !importData.fuel) return;
  for (var k = 0; k < importData.fuel.length; k++) {
    if (importData.fuel[k].id === id) {
      importData.fuel[k][field] = (inputType === 'number')
        ? (parseFloat(rawValue) || 0)
        : rawValue;
      break;
    }
  }
  if (importId) saveToStorage('imported_' + importId, importData);
}

function _footTd(text, extraClass) {
  var td = document.createElement('td');
  if (extraClass) td.className = extraClass;
  td.textContent = text;
  return td;
}

function _normalizeStatus(s) {
  if (s === 'approved') return 'approved';
  if (s === 'rejected' || s === 'flagged') return 'rejected';
  return 'approved'; /* treat old 'pending' as approved */
}

function _applyRowClass(tr, status) {
  tr.classList.remove('row-approved', 'row-flagged');
  if (status === 'approved') tr.classList.add('row-approved');
  if (status === 'rejected') tr.classList.add('row-flagged');
}

function _applySelectClass(sel, status) {
  sel.className = 'status-select';
  if (status === 'approved') sel.classList.add('status-approved');
  if (status === 'rejected') sel.classList.add('status-flagged');
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
