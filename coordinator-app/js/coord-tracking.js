/* ==========================================================================
   ExpenseFuel — Coordinator App · coord-tracking.js
   Manages the Coordinator Tracking sheet (Site ID → Job Code mapping).

   Depends on (loaded before this file):
     xlsx.full.min.js  →  window.XLSX
     utils.js          →  saveToStorage(), loadFromStorage(), showToast()

   Storage key: 'coord_tracking'
     { map: { 'D0510': 'EM042', ... }, filename, loadedAt, siteCount }

   Header detection:
     Scans the first 10 rows for a row containing a cell with 'site' AND a cell
     with 'job' or exactly 'jc' (case-insensitive). Falls back to col 0 = Site,
     col 1 = JC, starting at row 2.

   Duplicate Site IDs: last row wins (the tracking sheet may repeat a site with
   an updated JC — the furthest-down entry is always used).
   ========================================================================== */

var COORD_TRACKING_KEY = 'coord_tracking';

/* ==========================================================================
   PARSE — reads an Excel file and builds the site→JC map
   onSuccess(trackingData)  onError(message)
   ========================================================================== */

function parseCoordTrackingFile(file, onSuccess, onError) {
  if (typeof XLSX === 'undefined') {
    onError('SheetJS library is not loaded. Cannot read Excel files.');
    return;
  }

  var reader = new FileReader();

  reader.onload = function (e) {
    _ctProgress(100, 'Parsing…', true);
    var wb;
    try {
      wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
    } catch (err) {
      _ctProgressHide();
      onError('Could not open Excel file: ' + err.message);
      return;
    }

    /* ---- Pick the right sheet: prefer "Tracking", then "Invoicing Track", then first ---- */
    var PREFERRED_SHEETS = ['tracking', 'invoicing track'];
    var sheetName = null;

    for (var s = 0; s < wb.SheetNames.length; s++) {
      var candidate = wb.SheetNames[s].trim().toLowerCase();
      if (PREFERRED_SHEETS.indexOf(candidate) !== -1) {
        sheetName = wb.SheetNames[s];
        break;
      }
    }
    if (!sheetName) sheetName = wb.SheetNames[0];

    var sheet = wb.Sheets[sheetName];
    if (!sheet) { onError('No sheets found in this workbook.'); return; }

    var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    /* ---- Scan ALL rows for the header containing "Logical Site ID" and "Job Code" ----
       The header can appear anywhere in the sheet (A1, A4, etc.).
       Match is case-insensitive and whitespace-trimmed.                              */
    var siteCol     = -1;
    var jcCol       = -1;
    var taskDateCol = -1;
    var dataStart   = 0;

    for (var i = 0; i < rows.length; i++) {
      var row     = rows[i];
      var tmpSite = -1;
      var tmpJc   = -1;
      var tmpTD   = -1;

      for (var c = 0; c < row.length; c++) {
        var cell = String(row[c] || '').trim().toLowerCase();
        if (cell === 'logical site id') tmpSite = c;
        if (cell === 'job code')        tmpJc   = c;
        if (cell === 'task date')       tmpTD   = c;
      }

      if (tmpSite !== -1 && tmpJc !== -1) {
        siteCol     = tmpSite;
        jcCol       = tmpJc;
        taskDateCol = tmpTD; /* -1 if not found — optional */
        dataStart   = i + 1;
        break;
      }
    }

    if (siteCol === -1 || jcCol === -1) {
      onError(
        'Could not find header columns "Logical Site ID" and "Job Code" in sheet "' + sheetName + '". ' +
        'Check the column names and try again.'
      );
      return;
    }

    /* ---- Build map — last occurrence wins ---- */
    var map = {};
    for (var j = dataStart; j < rows.length; j++) {
      var r      = rows[j];
      var siteId = String(r[siteCol] || '').trim();
      var jc     = String(r[jcCol]   || '').trim();
      if (siteId && jc) {
        var taskDate = taskDateCol >= 0 ? _parseExcelDate(r[taskDateCol]) : '';
        map[siteId.toUpperCase()] = { jc: jc, taskDate: taskDate };
      }
    }

    var siteCount = Object.keys(map).length;
    if (siteCount === 0) {
      onError(
        'No site / job-code pairs found. ' +
        'Make sure the file has columns labelled "Site" and "Job" (or "JC").'
      );
      return;
    }

    var trackingData = {
      map:       map,
      filename:  file.name,
      loadedAt:  new Date().toISOString(),
      siteCount: siteCount,
    };

    saveToStorage(COORD_TRACKING_KEY, trackingData);
    onSuccess(trackingData);
  };

  reader.onloadstart = function () { _ctProgress(0, 'Reading file…'); };

  reader.onprogress = function (evt) {
    if (evt.lengthComputable) {
      _ctProgress(Math.round(evt.loaded / evt.total * 100), 'Reading file…');
    }
  };

  reader.onerror = function () { _ctProgressHide(); onError('Could not read the file.'); };
  reader.readAsArrayBuffer(file);
}


/* ==========================================================================
   STORAGE HELPERS
   ========================================================================== */

function loadCoordTracking() {
  return loadFromStorage(COORD_TRACKING_KEY, null);
}

function clearCoordTracking() {
  localStorage.removeItem(COORD_TRACKING_KEY);
}


/* ==========================================================================
   LOOKUP
   Handles "/" separated site IDs (e.g. "D0150/D1111/4356").
   Returns "/" joined JC results in the same order, or '' if none found.
   ========================================================================== */

/* Normalize a map entry — handles old (string) and new ({ jc, taskDate }) formats */
function _getMapEntry(trackingMap, siteKey) {
  var e = trackingMap[siteKey];
  if (!e) return null;
  if (typeof e === 'string') return { jc: e, taskDate: '' }; /* backward compat */
  return e;
}

/* Convert an Excel cell value to an ISO date string "YYYY-MM-DD".
   Handles: Excel serial numbers, JS Date objects, and date strings. */
function _parseExcelDate(val) {
  if (!val && val !== 0) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    /* Excel epoch: Dec 30 1899 (accounts for Lotus 1-2-3 leap-year bug) */
    var ms = (val - 25569) * 86400000;
    var d  = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    var s = val.trim();
    if (!s) return '';
    /* Already ISO */
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    /* Try native parse for other formats */
    var d2 = new Date(s);
    if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0];
    return s; /* Return as-is if unparseable */
  }
  return '';
}

/* Split on any common separator: / , – (en dash) — (em dash) or whitespace.
   Each site is looked up independently; results are joined with "/". */
function lookupJC(siteIdField, trackingMap) {
  if (!siteIdField || !trackingMap) return '';

  var sites = String(siteIdField)
    .split(/[\/,\-–—\s]+/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });

  if (!sites.length) return '';

  var results = sites.map(function (s) {
    var entry = _getMapEntry(trackingMap, s.toUpperCase());
    return entry ? (entry.jc || '') : '';
  });

  return results.some(function (r) { return r !== ''; })
    ? results.join('/')
    : '';
}

/* Look up the Task Date for the first matching site part */
function lookupTaskDate(siteIdField, trackingMap) {
  if (!siteIdField || !trackingMap) return '';

  var sites = String(siteIdField)
    .split(/[\/,\-–—\s]+/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });

  for (var i = 0; i < sites.length; i++) {
    var entry = _getMapEntry(trackingMap, sites[i].toUpperCase());
    if (entry && entry.taskDate) return entry.taskDate;
  }
  return '';
}


/* ==========================================================================
   CARD UI — called from import.html DOMContentLoaded
   ========================================================================== */

function initCoordTrackingCard() {
  /* Show current state on page load */
  _updateTrackingCardUI(loadCoordTracking());

  var fileInput         = document.getElementById('trackingFileInput');
  var btnBrowse         = document.getElementById('btnBrowseTracking');
  var btnClear          = document.getElementById('btnClearTracking');
  var btnReplace        = document.getElementById('btnReplaceTracking');
  var dropZone          = document.getElementById('dropZoneTracking');

  /* Browse button */
  if (btnBrowse && fileInput) {
    btnBrowse.addEventListener('click', function () { fileInput.click(); });
  }

  /* Replace button (same as browse — lets coordinator swap the file) */
  if (btnReplace && fileInput) {
    btnReplace.addEventListener('click', function () { fileInput.click(); });
  }

  /* File input change */
  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (this.files && this.files.length > 0) {
        _handleTrackingFile(this.files[0]);
        this.value = '';
      }
    });
  }

  /* Clear */
  if (btnClear) {
    btnClear.addEventListener('click', function () {
      clearCoordTracking();
      _updateTrackingCardUI(null);
      showToast('Coordinator tracking cleared', 'info');
    });
  }

  /* Drag & drop on the tracking zone */
  if (dropZone) {
    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropZone.classList.add('dragging');
    });
    dropZone.addEventListener('dragenter', function (e) {
      e.preventDefault();
      dropZone.classList.add('dragging');
    });
    dropZone.addEventListener('dragleave', function (e) {
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('dragging');
      }
    });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('dragging');
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) _handleTrackingFile(files[0]);
    });

    /* Keyboard activation */
    dropZone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (fileInput) fileInput.click();
      }
    });
  }
}


/* ---- Private helpers ---- */

var _EXCEL_EXTS = ['.xlsx', '.xlsm', '.xlsb', '.xls', '.xlt', '.xltx', '.xltm'];

function _handleTrackingFile(file) {
  var name    = file.name.toLowerCase();
  var isExcel = _EXCEL_EXTS.some(function (ext) { return name.endsWith(ext); });

  if (!isExcel) {
    showToast('Please use an Excel file for the coordinator tracking', 'error');
    return;
  }

  parseCoordTrackingFile(
    file,
    function (data) {
      _ctProgressHide();
      _updateTrackingCardUI(data);
      showToast(data.siteCount + ' sites loaded from coordinator tracking', 'success');
    },
    function (err) {
      _ctProgressHide();
      showToast('Error: ' + err, 'error');
    }
  );
}

/* ---- Progress bar helpers (import page only — no-ops elsewhere) ---- */
function _ctProgress(pct, label, done) {
  var wrap  = document.getElementById('trackingProgressWrap');
  var fill  = document.getElementById('trackingProgressFill');
  var pctEl = document.getElementById('trackingProgressPct');
  var lblEl = document.getElementById('trackingProgressLabel');
  if (!wrap) return;
  wrap.classList.remove('hidden');
  if (fill)  { fill.style.width = pct + '%'; fill.classList.toggle('complete', !!done); }
  if (pctEl) pctEl.textContent  = pct + '%';
  if (lblEl) lblEl.textContent  = label || 'Reading…';
}

function _ctProgressHide() {
  var wrap = document.getElementById('trackingProgressWrap');
  if (wrap) wrap.classList.add('hidden');
  var fill = document.getElementById('trackingProgressFill');
  if (fill) { fill.style.width = '0%'; fill.classList.remove('complete'); }
}

function _updateTrackingCardUI(data) {
  var loadedEl  = document.getElementById('trackingLoadedState');
  var emptyEl   = document.getElementById('trackingEmptyState');
  var nameEl    = document.getElementById('trackingFilename');
  var countEl   = document.getElementById('trackingSiteCount');
  var timeEl    = document.getElementById('trackingLoadedAt');

  if (data && data.map && data.siteCount > 0) {
    if (loadedEl) loadedEl.classList.remove('hidden');
    if (emptyEl)  emptyEl.classList.add('hidden');
    if (nameEl)   nameEl.textContent  = data.filename  || '—';
    if (countEl)  countEl.textContent = data.siteCount + ' sites mapped';
    if (timeEl && data.loadedAt) {
      try {
        timeEl.textContent = 'Loaded ' + new Date(data.loadedAt).toLocaleString();
      } catch (_) { timeEl.textContent = ''; }
    }
  } else {
    if (loadedEl) loadedEl.classList.add('hidden');
    if (emptyEl)  emptyEl.classList.remove('hidden');
  }
}
