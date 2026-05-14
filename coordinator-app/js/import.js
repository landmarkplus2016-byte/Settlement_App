/* ==========================================================================
   ExpenseFuel — Coordinator App · import.js
   Depends on (loaded before this file):
     xlsx.full.min.js  →  window.XLSX
     translations.js   →  TRANSLATIONS, DEFAULT_LANG
     utils.js          →  generateId(), saveToStorage(), showToast()
     app.js            →  (none specifically)

   Expense sheet columns (A–R, indices 0–17), data rows start at row 5:
     0  blank   1  blank   2  Month     3  Day       4  Project name
     5  Site ID 6  Job Code 7  Category  8  Item Desc 9  Amount
     10 Comment 11 Coordinator 12 Tracking# 13 Name   14 Site Count
     15 Category2 16 Sub Category 17 Date

   Fuel sheet columns (A–U, indices 0–20), data rows start at row 5:
     0  blank   1  blank   2  Month     3  Day       4  Project name
     5  Site ID 6  Job Code 7  Start KM  8  End KM   9  Fuel Amount
     10 Area    11 Driver   12 City      13 Karta Amt 14 Coordinator
     15 Tracking# 16 Name  17 Site Count 18 Category2 19 Sub Category 20 Date
   ========================================================================== */

/* Internal reference to the parsed data pending confirmation */
var _pendingImportData = null;
var _pendingSourceType  = null;

/* ==========================================================================
   DRAG & DROP SETUP
   ========================================================================== */

function setupDragDrop() {
  var zone = document.getElementById('dropZone');
  if (!zone) return;

  zone.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.add('dragging');
  });

  zone.addEventListener('dragenter', function (e) {
    e.preventDefault();
    zone.classList.add('dragging');
  });

  zone.addEventListener('dragleave', function (e) {
    /* Only remove if the pointer truly left the zone (not a child element) */
    if (!zone.contains(e.relatedTarget)) {
      zone.classList.remove('dragging');
    }
  });

  zone.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('dragging');

    var files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  /* Keyboard activation */
  zone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('fileInput').click();
    }
  });
}

/* ==========================================================================
   FILE DISPATCH
   ========================================================================== */

function handleFile(file) {
  if (!file) return;

  var name = file.name.toLowerCase();

  if (name.endsWith('.json')) {
    parseJSONFile(file);
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    parseExcelFile(file);
  } else {
    _showError(
      _t('unsupportedFile') ||
      'Unsupported file type. Please use an .xlsx (Excel) or .json file.'
    );
  }
}

/* ==========================================================================
   JSON PARSER
   ========================================================================== */

function parseJSONFile(file) {
  var reader = new FileReader();

  reader.onload = function (e) {
    var text = e.target.result;
    var data;

    try {
      data = JSON.parse(text);
    } catch (err) {
      _showError((_t('jsonParseError') || 'Invalid JSON file.') + ' (' + err.message + ')');
      return;
    }

    /* Validate required structure */
    var problems = _validateJSONStructure(data);
    if (problems.length > 0) {
      _showError(
        (_t('invalidFormat') || 'File format not recognised.') +
        '\n' + problems.join(' ')
      );
      return;
    }

    showPreview(data, 'json', file);
  };

  reader.onerror = function () {
    _showError(_t('fileReadError') || 'Could not read the file.');
  };

  reader.readAsText(file, 'UTF-8');
}

/* Checks that the decoded object has the expected shape */
function _validateJSONStructure(data) {
  var problems = [];

  if (!data || typeof data !== 'object') {
    problems.push('Root is not an object.');
    return problems;
  }

  if (!data.teamMember || typeof data.teamMember !== 'object') {
    problems.push('Missing "teamMember" object.');
  } else {
    if (!data.teamMember.name)   problems.push('"teamMember.name" is empty.');
    if (!data.teamMember.mobile) problems.push('"teamMember.mobile" is empty.');
  }

  if (!Array.isArray(data.expenses)) problems.push('Missing "expenses" array.');
  if (!Array.isArray(data.fuel))     problems.push('Missing "fuel" array.');
  if (!data.totals || typeof data.totals !== 'object') problems.push('Missing "totals" object.');

  return problems;
}

/* ==========================================================================
   EXCEL PARSER
   ========================================================================== */

function parseExcelFile(file) {
  if (typeof XLSX === 'undefined') {
    _showError('SheetJS library is not loaded. Cannot read Excel files.');
    return;
  }

  var reader = new FileReader();

  reader.onload = function (e) {
    var arrayBuffer = e.target.result;

    var wb;
    try {
      wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    } catch (err) {
      _showError((_t('excelParseError') || 'Could not open Excel file.') + ' (' + err.message + ')');
      return;
    }

    /* ---- Expenses sheet ---- */
    var expSheet = wb.Sheets['Expenses Tracking'];
    if (!expSheet) {
      _showError(_t('missingExpenseSheet') || 'Sheet "Expenses Tracking" not found in this workbook.');
      return;
    }

    /* ---- Fuel sheet ---- */
    var fuelSheet = wb.Sheets['Fuel Tracking'];
    if (!fuelSheet) {
      _showError(_t('missingFuelSheet') || 'Sheet "Fuel Tracking" not found in this workbook.');
      return;
    }

    /* Convert sheets to arrays of arrays */
    var expRows  = XLSX.utils.sheet_to_json(expSheet,  { header: 1, defval: '' });
    var fuelRows = XLSX.utils.sheet_to_json(fuelSheet, { header: 1, defval: '' });

    /* ---- Extract team member info from header rows ---- */
    /* Row 2 (index 2): [ 'Name:', name, ..., 'New', ..., 'Total:', total ] */
    var nameRow  = expRows[2] || [];
    var memberName     = String(nameRow[1] || '').trim();
    var expenseTotal   = parseFloat(nameRow[6]) || 0;

    /* Row 1 (index 1): [ 'Account:', accountType, ..., 'VF' ] */
    var accountRow  = expRows[1] || [];
    var accountType = String(accountRow[1] || 'New').trim();

    /* Tracking number: pulled from first data row col 12, or footer */
    var trackingNumber = 0;

    /* ---- Parse expense data rows (start at index 5) ---- */
    var expenses = [];
    for (var i = 5; i < expRows.length; i++) {
      var r = expRows[i];

      /* Stop at blank row or approval footer */
      var firstCell = String(r[0] || '').trim();
      if (firstCell === 'إعتماد' || firstCell === 'التاريخ:') break;

      /* Skip rows where the data columns are all empty */
      var month = String(r[2] || '').trim();
      var siteId = String(r[5] || '').trim();
      if (!month && !siteId) continue;

      var dayVal = r[3];
      var day = (dayVal !== '' && dayVal !== null && dayVal !== undefined)
        ? parseInt(dayVal, 10) : 0;

      var amount = parseFloat(r[9]) || 0;

      /* Capture tracking number from first valid row */
      if (!trackingNumber && r[12]) {
        trackingNumber = parseInt(r[12], 10) || 0;
      }

      expenses.push({
        id:              generateId(),
        month:           month,
        day:             day,
        projectName:     String(r[4]  || '').trim(),
        siteId:          siteId,
        jobCode:         String(r[6]  || '').trim(),
        category:        String(r[7]  || '').trim(),
        itemDescription: String(r[8]  || '').trim(),
        amount:          amount,
        comment:         String(r[10] || '').trim(),
        coordinator:     String(r[11] || '').trim(),
        trackingNumber:  parseInt(r[12], 10) || 0,
        subCategory:     String(r[16] || '').trim(),
        date:            String(r[17] || '').trim(),
        createdAt:       new Date().toISOString(),
      });
    }

    /* ---- Parse fuel data rows (start at index 5) ---- */
    /* Row 2 col 1: name again; mobile not stored in Excel */
    var fuelNameRow  = fuelRows[2] || [];
    if (!memberName) memberName = String(fuelNameRow[1] || '').trim();

    var fuel = [];
    for (var j = 5; j < fuelRows.length; j++) {
      var rf = fuelRows[j];

      var firstCellF = String(rf[0] || '').trim();
      if (firstCellF === 'إعتماد' || firstCellF === 'التاريخ:') break;

      var monthF  = String(rf[2] || '').trim();
      var siteIdF = String(rf[5] || '').trim();
      if (!monthF && !siteIdF) continue;

      var dayFVal = rf[3];
      var dayF = (dayFVal !== '' && dayFVal !== null && dayFVal !== undefined)
        ? parseInt(dayFVal, 10) : 0;

      if (!trackingNumber && rf[15]) {
        trackingNumber = parseInt(rf[15], 10) || 0;
      }

      fuel.push({
        id:            generateId(),
        month:         monthF,
        day:           dayF,
        projectName:   String(rf[4]  || '').trim(),
        siteId:        siteIdF,
        jobCode:       String(rf[6]  || '').trim(),
        startKm:       parseFloat(rf[7])  || 0,
        endKm:         parseFloat(rf[8])  || 0,
        fuelAmount:    parseFloat(rf[9])  || 0,
        area:          String(rf[10] || '').trim(),
        driver:        String(rf[11] || '').trim(),
        city:          String(rf[12] || '').trim(),
        kartaAmount:   parseFloat(rf[13]) || 0,
        coordinator:   String(rf[14] || '').trim(),
        trackingNumber: parseInt(rf[15], 10) || 0,
        date:          String(rf[20] || '').trim(),
        createdAt:     new Date().toISOString(),
      });
    }

    /* Derive month from first expense or fuel entry */
    var reportMonth = (expenses[0] && expenses[0].month) ||
                      (fuel[0]     && fuel[0].month)     || '';

    /* Recalculate totals from parsed rows */
    var expTotal   = expenses.reduce(function (s, e) { return s + (e.amount     || 0); }, 0);
    var fuelTotal  = fuel.reduce(    function (s, e) { return s + (e.fuelAmount || 0); }, 0);
    var kartaTotal = fuel.reduce(    function (s, e) { return s + (e.kartaAmount|| 0); }, 0);

    var data = {
      exportedAt: null,
      teamMember: {
        name:           memberName,
        mobile:         '',          /* not stored in Excel */
        trackingNumber: trackingNumber,
        accountType:    accountType,
      },
      trackingNumber: trackingNumber,
      month:          reportMonth,
      expenses:       expenses,
      fuel:           fuel,
      totals: {
        expenseTotal:  Math.round(expTotal   * 100) / 100,
        fuelTotal:     Math.round(fuelTotal  * 100) / 100,
        kartaTotal:    Math.round(kartaTotal * 100) / 100,
        combinedTotal: Math.round((expTotal + fuelTotal + kartaTotal) * 100) / 100,
      },
    };

    showPreview(data, 'xlsx', file);
  };

  reader.onerror = function () {
    _showError(_t('fileReadError') || 'Could not read the file.');
  };

  reader.readAsArrayBuffer(file);
}

/* ==========================================================================
   PREVIEW
   ========================================================================== */

function showPreview(data, sourceType, file) {
  _pendingImportData = data;
  _pendingSourceType = sourceType;

  /* ---- File info row ---- */
  _setText('fileInfoName', file ? file.name : (data.filename || '—'));
  _setText('fileFormatChip', sourceType === 'xlsx' ? 'xlsx' : 'json');

  if (file) {
    var sizeKb = (file.size / 1024).toFixed(1);
    _setText('fileInfoMeta', sizeKb + ' KB · ' + sourceType.toUpperCase());
  }

  /* ---- Team member strip ---- */
  var m = data.teamMember || {};
  _setText('memberName',     m.name           || '—');
  _setText('memberMobile',   m.mobile         || (sourceType === 'xlsx' ? 'N/A (Excel)' : '—'));
  _setText('memberTracking', 'T-' + (m.trackingNumber || data.trackingNumber || '—'));
  _setText('memberMonth',    data.month || _deriveMonth(data.expenses, data.fuel) || '—');

  /* ---- Counts ---- */
  var expenses = data.expenses || [];
  var fuel     = data.fuel     || [];
  _setText('expenseCount', String(expenses.length));
  _setText('fuelCount',    String(fuel.length));

  /* ---- Expense preview table (first 3 rows) ---- */
  var expBody = document.getElementById('expensePreviewBody');
  var expWrap = document.getElementById('expensePreviewWrap');
  var expEmpty = document.getElementById('expenseEmptyState');

  if (expenses.length === 0) {
    if (expWrap)  expWrap.classList.add('hidden');
    if (expEmpty) expEmpty.classList.remove('hidden');
  } else {
    if (expWrap)  expWrap.classList.remove('hidden');
    if (expEmpty) expEmpty.classList.add('hidden');

    if (expBody) {
      expBody.innerHTML = '';
      var expSlice = expenses.slice(0, 3);
      expSlice.forEach(function (e) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td class="ltr-field">' + _esc(e.date || e.month + '-' + e.day) + '</td>' +
          '<td class="ltr-field">' + _esc(e.siteId || '—') + '</td>' +
          '<td>' + _esc(e.category || '—') + '</td>' +
          '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
            + _esc(e.itemDescription || '—') + '</td>' +
          '<td class="ltr-field" style="font-weight:600">' + _esc(String(e.amount || 0)) + '</td>';
        expBody.appendChild(tr);
      });
    }

    var expMore = document.getElementById('expenseMoreHint');
    if (expMore) {
      var remaining = expenses.length - 3;
      expMore.textContent = remaining > 0
        ? 'and ' + remaining + ' more expense entr' + (remaining === 1 ? 'y' : 'ies') + '…'
        : '';
    }
  }

  /* Badge text */
  var expBadge = document.getElementById('expensePreviewBadge');
  if (expBadge) expBadge.textContent = expenses.length > 3 ? 'first 3 of ' + expenses.length : 'all ' + expenses.length;

  /* ---- Fuel preview table (first 3 rows) ---- */
  var fuelBody  = document.getElementById('fuelPreviewBody');
  var fuelWrap  = document.getElementById('fuelPreviewWrap');
  var fuelEmpty = document.getElementById('fuelEmptyState');

  if (fuel.length === 0) {
    if (fuelWrap)  fuelWrap.classList.add('hidden');
    if (fuelEmpty) fuelEmpty.classList.remove('hidden');
  } else {
    if (fuelWrap)  fuelWrap.classList.remove('hidden');
    if (fuelEmpty) fuelEmpty.classList.add('hidden');

    if (fuelBody) {
      fuelBody.innerHTML = '';
      var fuelSlice = fuel.slice(0, 3);
      fuelSlice.forEach(function (f) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td class="ltr-field">' + _esc(f.date || f.month + '-' + f.day) + '</td>' +
          '<td class="ltr-field">' + _esc(f.siteId || '—') + '</td>' +
          '<td class="ltr-field">' + _esc(String(f.startKm || 0)) + '</td>' +
          '<td class="ltr-field">' + _esc(String(f.endKm   || 0)) + '</td>' +
          '<td class="ltr-field" style="font-weight:600">' + _esc(String(f.fuelAmount || 0)) + '</td>' +
          '<td>' + _esc(f.driver || '—') + '</td>';
        fuelBody.appendChild(tr);
      });
    }

    var fuelMore = document.getElementById('fuelMoreHint');
    if (fuelMore) {
      var fRemaining = fuel.length - 3;
      fuelMore.textContent = fRemaining > 0
        ? 'and ' + fRemaining + ' more fuel entr' + (fRemaining === 1 ? 'y' : 'ies') + '…'
        : '';
    }
  }

  var fuelBadge = document.getElementById('fuelPreviewBadge');
  if (fuelBadge) fuelBadge.textContent = fuel.length > 3 ? 'first 3 of ' + fuel.length : 'all ' + fuel.length;

  /* ---- Show preview, hide drop zone and error ---- */
  _showSection('previewSection');
  _hideSection('dropZoneSection');
  _hideSection('errorSection');

  /* ---- Wire Confirm button ---- */
  var btnConfirm = document.getElementById('btnConfirmImport');
  if (btnConfirm) {
    /* Replace to remove any prior listener */
    var fresh = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(fresh, btnConfirm);
    fresh.addEventListener('click', function () {
      confirmImport(_pendingImportData);
    });
  }
}

/* ==========================================================================
   CONFIRM IMPORT
   ========================================================================== */

function confirmImport(data) {
  if (!data) return;

  var importId = generateId();

  data.id          = importId;
  data.importedAt  = new Date().toISOString();
  data.sourceType  = _pendingSourceType || 'json';

  saveToStorage('imported_' + importId, data);

  var lang = localStorage.getItem('lang') || DEFAULT_LANG;
  var t    = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
  showToast(t.importSuccess || 'Report imported successfully', 'success');

  setTimeout(function () {
    window.location.href = 'index.html';
  }, 1000);
}

/* ==========================================================================
   DOM READY
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  setupDragDrop();

  /* Browse button → trigger file input */
  var btnBrowse = document.getElementById('btnBrowse');
  var fileInput = document.getElementById('fileInput');

  if (btnBrowse && fileInput) {
    btnBrowse.addEventListener('click', function (e) {
      e.stopPropagation(); /* prevent drop-zone click bubbling */
      fileInput.click();
    });
  }

  /* File input change */
  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (this.files && this.files.length > 0) {
        handleFile(this.files[0]);
        /* Reset so the same file can be re-selected after cancel */
        this.value = '';
      }
    });
  }

  /* Retry button → reset to drop zone */
  var btnRetry = document.getElementById('btnRetry');
  if (btnRetry) {
    btnRetry.addEventListener('click', _resetToDropZone);
  }

  /* Cancel button inside preview */
  var btnCancel = document.getElementById('btnCancelImport');
  if (btnCancel) {
    btnCancel.addEventListener('click', _resetToDropZone);
  }
});

/* ==========================================================================
   PRIVATE HELPERS
   ========================================================================== */

function _showSection(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function _hideSection(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function _showError(message) {
  var msgEl = document.getElementById('errorMessage');
  if (msgEl) msgEl.textContent = message;

  _showSection('errorSection');
  _hideSection('dropZoneSection');
  _hideSection('previewSection');

  _pendingImportData = null;
}

function _resetToDropZone() {
  _pendingImportData = null;
  _pendingSourceType = null;

  _showSection('dropZoneSection');
  _hideSection('errorSection');
  _hideSection('previewSection');

  /* Clear preview table bodies so stale data doesn't flash on next import */
  var expBody  = document.getElementById('expensePreviewBody');
  var fuelBody = document.getElementById('fuelPreviewBody');
  if (expBody)  expBody.innerHTML  = '';
  if (fuelBody) fuelBody.innerHTML = '';
}

function _setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* Escape HTML to prevent XSS when inserting user-supplied file content */
function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Look up a translation key in the current language */
function _t(key) {
  var lang = localStorage.getItem('lang') || DEFAULT_LANG;
  var t    = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
  return t[key] || '';
}

/* Derive report month from first entry in expenses or fuel arrays */
function _deriveMonth(expenses, fuel) {
  if (expenses && expenses.length > 0 && expenses[0].month) return expenses[0].month;
  if (fuel      && fuel.length      > 0 && fuel[0].month)      return fuel[0].month;
  return '';
}
