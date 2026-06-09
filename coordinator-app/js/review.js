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
var _errorEntryIds    = {}; /* entries with per-field validation failures */
var _kmMismatchIds    = {}; /* fuel entries with KM continuity gaps */
var _siteNotFoundIds  = {}; /* entries whose site ID is absent from coord tracking */
var _userReviewed     = {}; /* entries that already had saved coordinator decisions */
var _settlementPeriod = null; /* { month:0-11, year } derived once from import dates */
var _jcFinderTracking = null; /* jc_finder_tracking cached on page load */

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

  _userReviewed = {};
  entries.forEach(function (e) {
    reviewData[e.id] = saved[e.id]
      ? { status: _normalizeStatus(saved[e.id].status), coordinatorNote: saved[e.id].coordinatorNote || '' }
      : { status: 'approved', coordinatorNote: '' };
    if (saved[e.id]) _userReviewed[e.id] = true;
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

  /* ---- 7b. Cache JC Finder tracking, run site existence + Old/New setup ---- */
  _jcFinderTracking = loadFromStorage('jc_finder_tracking', null);
  _settlementPeriod = _computeSettlementPeriod();
  _checkSiteExistence();
  _applyWarningStatus();

  /* ---- 8. Render table ---- */
  if (entryType === 'expenses') {
    renderExpenseReview(importData.expenses || []);
  } else {
    renderFuelReview(importData.fuel || []);
  }

  _renderWarningsCard();

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
    var state       = reviewData[e.id] || { status: 'pending', coordinatorNote: '' };
    var hasErr      = !!_errorEntryIds[e.id];
    var hasSiteWarn = !!_siteNotFoundIds[e.id];

    var tr = document.createElement('tr');
    tr.dataset.entryId = e.id;
    _applyRowClass(tr, state.status);
    if (hasErr) tr.classList.add('has-issues');

    /* # — with optional site-not-found badge */
    var tdNum = document.createElement('td');
    tdNum.className = 'row-num';
    if (hasSiteWarn) {
      tdNum.innerHTML = _esc(String(i + 1)) +
        '<span class="site-warn-icon" title="Site not in coordinator sheet" aria-label="Site not found">!</span>';
    } else {
      tdNum.textContent = String(i + 1);
    }
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
    /* Old / New classification from coordinator tracking */
    tr.appendChild(_buildOldNewCell(e.siteId));
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
    var state       = reviewData[f.id] || { status: 'pending', coordinatorNote: '' };
    var hasErr      = !!_errorEntryIds[f.id];
    var hasKmGap    = !!_kmMismatchIds[f.id];
    var hasSiteWarn = !!_siteNotFoundIds[f.id];

    var startKm  = parseFloat(f.startKm) || 0;
    var endKm    = parseFloat(f.endKm)   || 0;

    var tr = document.createElement('tr');
    tr.dataset.entryId = f.id;
    _applyRowClass(tr, state.status);
    if (hasKmGap) tr.classList.add('row-warning');
    if (hasErr)   tr.classList.add('has-issues');

    /* # — with optional KM gap badge and/or site-not-found badge */
    var tdNum = document.createElement('td');
    tdNum.className = 'row-num';
    var numHtml = _esc(String(i + 1));
    if (hasKmGap)    numHtml += '<span class="km-warn-icon"   title="KM mismatch"              aria-label="KM mismatch">!</span>';
    if (hasSiteWarn) numHtml += '<span class="site-warn-icon" title="Site not in coordinator sheet" aria-label="Site not found">!</span>';
    if (hasKmGap || hasSiteWarn) {
      tdNum.innerHTML = numHtml;
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

    /* Old / New classification from coordinator tracking */
    tr.appendChild(_buildOldNewCell(f.siteId));
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

  tr.appendChild(_footTd('—'));   /* Area         */
  tr.appendChild(_footTd('—'));   /* Driver       */
  tr.appendChild(_footTd('—'));   /* City         */
  tr.appendChild(_footTd('—'));   /* Coordinator  */
  tr.appendChild(_footTd(''));    /* Old/New      */
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
      /* Preserve KM-gap amber accent regardless of status change */
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
  /* Prefer JC Finder file; fall back to Coordinator Tracking */
  var jcData    = loadFromStorage('jc_finder_tracking', null);
  var coordData = (typeof loadCoordTracking === 'function') ? loadCoordTracking() : null;

  var activeMap  = null;
  var sourceName = '';
  if (jcData && jcData.map && jcData.siteCount > 0) {
    activeMap  = jcData.map;
    sourceName = 'JC Finder file';
  } else if (coordData && coordData.map && coordData.siteCount > 0) {
    activeMap  = coordData.map;
    sourceName = 'Coordinator Tracking';
  }

  if (!activeMap) {
    showToast('No tracking loaded — upload a JC Finder File or Coordinator Tracking on the Import page first', 'warning');
    return;
  }

  var entries = importData
    ? (entryType === 'fuel' ? (importData.fuel || []) : (importData.expenses || []))
    : [];

  var filled  = 0;
  var skipped = 0;

  entries.forEach(function (e) {
    var jc = (typeof lookupJC === 'function') ? lookupJC(e.siteId, activeMap) : '';
    if (!jc) { skipped++; return; }

    e.jobCode = jc;
    filled++;

    var jcEl = document.querySelector('[data-jc-cell="' + e.id + '"]');
    if (jcEl) {
      jcEl.value = jc;
      jcEl.style.height = 'auto';
      jcEl.style.height = jcEl.scrollHeight + 'px';
    }
  });

  if (filled > 0 && importId) {
    saveToStorage('imported_' + importId, importData);
  }

  if (filled > 0) {
    var msg = 'Auto-filled ' + filled + ' Job Code' + (filled !== 1 ? 's' : '') + ' from ' + sourceName;
    if (skipped > 0) msg += ' (' + skipped + ' site' + (skipped !== 1 ? 's' : '') + ' not found)';
    showToast(msg, 'success');
  } else {
    showToast(
      skipped > 0
        ? 'No matching sites found in tracking'
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

  [['approved', 'Approved'], ['warning', 'Warning'], ['rejected', 'Rejected']].forEach(function (pair) {
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
  if (s === 'warning')  return 'warning';
  return 'approved'; /* treat old 'pending' as approved */
}

function _applyRowClass(tr, status) {
  tr.classList.remove('row-approved', 'row-flagged', 'row-status-warning');
  if (status === 'approved') tr.classList.add('row-approved');
  if (status === 'rejected') tr.classList.add('row-flagged');
  if (status === 'warning')  tr.classList.add('row-status-warning');
}

function _applySelectClass(sel, status) {
  sel.className = 'status-select';
  if (status === 'approved') sel.classList.add('status-approved');
  if (status === 'rejected') sel.classList.add('status-flagged');
  if (status === 'warning')  sel.classList.add('status-warning');
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


/* ==========================================================================
   OLD / NEW CLASSIFICATION
   Each composite site ID (e.g. "D0510/R7103") is split into individual parts.
   Each part is looked up independently so the cell shows a labelled badge per site.
   ========================================================================== */

/* Derive settlement month/year once from the first dated import entry */
function _computeSettlementPeriod() {
  var _MONS = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  var entries = ((importData && importData.expenses) || []).concat((importData && importData.fuel) || []);
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.date) {
      var pts = e.date.split('-');
      if (pts.length === 3) {
        var m = _MONS[pts[1].toLowerCase()];
        var y = parseInt(pts[2], 10);
        if (m !== undefined && !isNaN(y)) return { month: m, year: y };
      }
    }
  }
  return null;
}

/* Classify a SINGLE plain site ID — no splitting, no iteration */
function _getOldNewSingle(site) {
  var key = site.toUpperCase();

  /* 1. JC Finder file has an explicit Old/New column — use it directly */
  if (_jcFinderTracking && _jcFinderTracking.map && _jcFinderTracking.map[key]) {
    return _jcFinderTracking.map[key].oldNew || 'New';
  }

  /* 2. Fall back to Coordinator Tracking + settlement-period date logic */
  var tracking = (typeof loadCoordTracking === 'function') ? loadCoordTracking() : null;
  if (!tracking || !tracking.map || !_settlementPeriod) return '';

  var entry = tracking.map[key];
  if (!entry) return '';

  var taskDateStr = typeof entry === 'object' ? (entry.taskDate || '') : '';
  if (!taskDateStr) return 'New';

  var tDate = new Date(taskDateStr);
  if (isNaN(tDate.getTime())) return '';

  var tY = tDate.getFullYear(), tM = tDate.getMonth();
  var sY = _settlementPeriod.year,  sM = _settlementPeriod.month;
  return (tY < sY || (tY === sY && tM < sM)) ? 'Old' : 'New';
}

/* Build a read-only <td> showing a labelled badge for EACH site part.
   e.g. "D0510/R7103" → two rows: "D0510 [New]" and "R7103 [Old]"        */
function _buildOldNewCell(siteId) {
  var td = document.createElement('td');
  td.style.cssText = 'vertical-align:middle;padding:4px 6px';

  if (!siteId) { _blankOldNew(td); return td; }

  var sites = String(siteId).split(/[\/,\-–—\s]+/)
    .map(function(s) { return s.trim(); })
    .filter(function(s) { return s.length > 0; });

  if (!sites.length) { _blankOldNew(td); return td; }

  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;align-items:flex-start';

  var anyLabel = false;

  sites.forEach(function(site) {
    var label = _getOldNewSingle(site);
    var row   = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:4px;white-space:nowrap';

    var siteSpan = document.createElement('span');
    siteSpan.textContent = site;
    siteSpan.style.cssText = 'font-size:9px;color:var(--color-text-secondary);min-width:40px';
    row.appendChild(siteSpan);

    if (label) {
      anyLabel = true;
      var badge = document.createElement('span');
      badge.textContent = label;
      badge.style.cssText = [
        'display:inline-block',
        'padding:1px 6px',
        'border-radius:999px',
        'font-size:9px',
        'font-weight:600',
        label === 'New'
          ? 'background:var(--color-success-bg);color:var(--color-success);border:1px solid #a7f3d0'
          : 'background:var(--color-warning-bg);color:var(--color-warning);border:1px solid #fde68a',
      ].join(';');
      row.appendChild(badge);
    } else {
      var dash = document.createElement('span');
      dash.textContent = '—';
      dash.style.cssText = 'font-size:9px;color:var(--color-text-muted)';
      row.appendChild(dash);
    }
    wrap.appendChild(row);
  });

  if (!anyLabel) { _blankOldNew(td); return td; }
  td.appendChild(wrap);
  return td;
}

function _blankOldNew(td) {
  td.textContent = '—';
  td.style.cssText = 'color:var(--color-text-muted);text-align:center;font-size:var(--text-xs);vertical-align:middle';
}

/* ==========================================================================
   SITE EXISTENCE CHECK
   Compares each entry's siteId against the loaded coordinator tracking map.
   Marks entries as _siteNotFoundIds when none of their site parts are found.
   ========================================================================== */

function _checkSiteExistence() {
  _siteNotFoundIds = {};

  /* Prefer JC Finder file; fall back to Coordinator Tracking */
  var coordTracking = (typeof loadCoordTracking === 'function') ? loadCoordTracking() : null;
  var activeMap = null;
  if (_jcFinderTracking && _jcFinderTracking.map && _jcFinderTracking.siteCount) {
    activeMap = _jcFinderTracking.map;
  } else if (coordTracking && coordTracking.map && coordTracking.siteCount) {
    activeMap = coordTracking.map;
  }
  if (!activeMap) return;

  var entries = entryType === 'fuel'
    ? (importData.fuel     || [])
    : (importData.expenses || []);

  entries.forEach(function (e) {
    if (!e.siteId) return;
    var parts = String(e.siteId).split(/[\/,\-–—\s]+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
    if (!parts.length) return;
    var anyFound = parts.some(function (s) { return !!activeMap[s.toUpperCase()]; });
    if (!anyFound) _siteNotFoundIds[e.id] = e.siteId;
  });
}

/* Only auto-set 'warning' for entries the coordinator has never explicitly saved */
function _applyWarningStatus() {
  Object.keys(_siteNotFoundIds).forEach(function (id) {
    if (!_userReviewed[id] && reviewData[id] && reviewData[id].status === 'approved') {
      reviewData[id].status = 'warning';
    }
  });
}

/* ==========================================================================
   WARNINGS CARD
   Renders a yellow card listing every unique site ID absent from the
   coordinator tracking sheet. Hidden when no warnings or no tracking loaded.
   ========================================================================== */

function _renderWarningsCard() {
  var card = document.getElementById('warningsCard');
  if (!card) return;

  /* Prefer JC Finder file; fall back to Coordinator Tracking */
  var coordTracking  = (typeof loadCoordTracking === 'function') ? loadCoordTracking() : null;
  var activeTracking = null;
  if (_jcFinderTracking && _jcFinderTracking.map && _jcFinderTracking.siteCount) {
    activeTracking = _jcFinderTracking;
  } else if (coordTracking && coordTracking.map && coordTracking.siteCount) {
    activeTracking = coordTracking;
  }
  if (!activeTracking) { card.classList.add('hidden'); return; }

  /* Collect unique missing sites with their row numbers */
  var entries = entryType === 'fuel' ? (importData.fuel || []) : (importData.expenses || []);
  var missingSites = {}; /* siteId → [row numbers] */

  entries.forEach(function (e, i) {
    if (_siteNotFoundIds[e.id]) {
      var site = String(e.siteId || '?');
      if (!missingSites[site]) missingSites[site] = [];
      missingSites[site].push(i + 1);
    }
  });

  var siteKeys = Object.keys(missingSites);
  if (!siteKeys.length) { card.classList.add('hidden'); return; }

  card.classList.remove('hidden');

  var trackingInfo = activeTracking.filename
    ? '<span style="font-size:var(--text-xs);color:#92400e;opacity:.7;margin-left:auto">Checked against: ' + _esc(activeTracking.filename) + '</span>'
    : '';

  var itemsHtml = siteKeys.map(function (site) {
    var rows    = missingSites[site];
    var rowStr  = 'row' + (rows.length !== 1 ? 's' : '') + ' ' + rows.join(', ');
    return '<li style="font-size:var(--text-sm);color:#92400e;padding:2px 0">' +
           'Site <strong>' + _esc(site) + '</strong> — not found in coordinator sheet (' + rowStr + ')</li>';
  }).join('');

  var count = siteKeys.length;

  card.innerHTML =
    '<div style="background:var(--color-warning-bg);border:1px solid #fde68a;' +
    'border-left:4px solid var(--color-warning);border-radius:var(--radius-md);padding:var(--sp-4)">' +
    '  <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-3)">' +
    '    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
    '         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
    '         style="color:var(--color-warning);flex-shrink:0" aria-hidden="true">' +
    '      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
    '      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' +
    '    </svg>' +
    '    <span style="font-weight:600;color:#92400e;font-size:var(--text-sm)">' +
    '      Warnings — ' + count + ' site' + (count !== 1 ? 's' : '') + ' not found in coordinator sheet' +
    '    </span>' +
    trackingInfo +
    '  </div>' +
    '  <ul style="margin:0;padding-left:var(--sp-5);display:flex;flex-direction:column;gap:2px">' +
    itemsHtml +
    '  </ul>' +
    '</div>';
}
