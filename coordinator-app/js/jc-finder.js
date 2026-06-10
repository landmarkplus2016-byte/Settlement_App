/* ==========================================================================
   JC Finder — coordinator-app/js/jc-finder.js
   Depends on (loaded before this file):
     xlsx.full.min.js   →  window.XLSX
     utils.js           →  showToast(), saveToStorage(), loadFromStorage()
     coord-tracking.js  →  loadCoordTracking(), _getMapEntry(), _parseExcelDate()
   ========================================================================== */

var JC_FINDER_KEY   = 'jc_finder_tracking';
var _JC_EXCEL_EXTS  = ['.xlsx', '.xlsm', '.xlsb', '.xls', '.xlt', '.xltx', '.xltm'];


/* ==========================================================================
   INIT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  _renderTrackingStrip();
  _initJCUpload();

  var btnFill   = document.getElementById('btnFillJC');
  var btnClear  = document.getElementById('btnClear');
  var btnCopy   = document.getElementById('btnCopy');
  var btnCopyJC = document.getElementById('btnCopyJC');

  if (btnFill)   btnFill.addEventListener('click',   fillJC);
  if (btnClear)  btnClear.addEventListener('click',   clearAll);
  if (btnCopy)   btnCopy.addEventListener('click',    copyResults);
  if (btnCopyJC) btnCopyJC.addEventListener('click',  copyJC);

  var textarea = document.getElementById('siteInput');
  if (textarea) {
    textarea.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        fillJC();
      }
    });
  }
});


/* ==========================================================================
   JC FINDER FILE — parse, store, load, clear
   ========================================================================== */

function _parseJCFinderFile(file, onSuccess, onError) {
  if (typeof XLSX === 'undefined') {
    onError('SheetJS library is not loaded. Cannot read Excel files.');
    return;
  }

  var reader = new FileReader();

  reader.onload = function (e) {
    var wb;
    try {
      wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
    } catch (err) {
      onError('Could not open Excel file: ' + err.message);
      return;
    }

    /* Prefer sheet named "Site ID-JC", then "Tracking", then first */
    var PREFERRED = ['site id-jc', 'tracking', 'invoicing track'];
    var sheetName = null;
    for (var s = 0; s < wb.SheetNames.length; s++) {
      if (PREFERRED.indexOf(wb.SheetNames[s].trim().toLowerCase()) !== -1) {
        sheetName = wb.SheetNames[s];
        break;
      }
    }
    if (!sheetName) sheetName = wb.SheetNames[0];

    var sheet = wb.Sheets[sheetName];
    if (!sheet) { onError('No sheets found in this workbook.'); return; }

    var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    /* Scan rows for the header that contains "Site ID-JC" */
    var siteJCCol   = -1;
    var taskDateCol = -1;
    var oldNewCol   = -1;
    var dataStart   = 0;

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var tmpSJC = -1, tmpTD = -1, tmpON = -1;

      for (var c = 0; c < row.length; c++) {
        var cell = String(row[c] || '').trim().toLowerCase();
        if (cell === 'site id-jc' || cell === 'site id - jc') tmpSJC = c;
        if (cell === 'task date')  tmpTD = c;
        if (cell === 'old/new')    tmpON = c;
      }

      if (tmpSJC !== -1) {
        siteJCCol   = tmpSJC;
        taskDateCol = tmpTD;
        oldNewCol   = tmpON;
        dataStart   = i + 1;
        break;
      }
    }

    if (siteJCCol === -1) {
      onError(
        'Could not find a "Site ID-JC" column in sheet "' + sheetName + '". ' +
        'Make sure the column header is exactly "Site ID-JC".'
      );
      return;
    }

    /* Build map — split "K4429-ABD01" into site="K4429", jc="ABD01" */
    var map = {};
    for (var j = dataStart; j < rows.length; j++) {
      var r       = rows[j];
      var cellVal = String(r[siteJCCol] || '').trim();
      if (!cellVal) continue;

      var parts  = _splitLastHyphen(cellVal);
      var siteId = parts.site.toUpperCase();
      var jcCode = parts.jc;
      if (!siteId) continue;

      var taskDate = taskDateCol >= 0 ? _parseExcelDate(r[taskDateCol]) : '';
      var oldNew   = oldNewCol   >= 0 ? String(r[oldNewCol] || '').trim() : '';

      /* Derive Old/New from task date year if not explicit in the file */
      if (!oldNew && taskDate) {
        var yr = new Date(taskDate).getFullYear();
        oldNew = (!isNaN(yr) && yr < 2026) ? 'Old' : 'New';
      }

      /* Normalise casing */
      if (oldNew.toLowerCase() === 'old') oldNew = 'Old';
      else if (oldNew.toLowerCase() === 'new') oldNew = 'New';

      map[siteId] = { jc: jcCode, taskDate: taskDate, oldNew: oldNew };
    }

    var siteCount = Object.keys(map).length;
    if (siteCount === 0) {
      onError('No site / JC pairs found. Check that the "Site ID-JC" column has data.');
      return;
    }

    var data = {
      map:       map,
      filename:  file.name,
      loadedAt:  new Date().toISOString(),
      siteCount: siteCount,
    };
    saveToStorage(JC_FINDER_KEY, data);
    onSuccess(data);
  };

  reader.onerror = function () { onError('Could not read the file.'); };
  reader.readAsArrayBuffer(file);
}

/* Split on the LAST hyphen: "K4429-ABD01" → { site:"K4429", jc:"ABD01" } */
function _splitLastHyphen(str) {
  var idx = str.lastIndexOf('-');
  if (idx <= 0) return { site: str, jc: '' };
  return { site: str.substring(0, idx).trim(), jc: str.substring(idx + 1).trim() };
}

function _loadJCFinderTracking() {
  return loadFromStorage(JC_FINDER_KEY, null);
}

function _clearJCFinderTracking() {
  localStorage.removeItem(JC_FINDER_KEY);
}


/* ==========================================================================
   JC UPLOAD UI
   ========================================================================== */

function _initJCUpload() {
  _updateJCUploadUI(_loadJCFinderTracking());

  var fileInput  = document.getElementById('jcFileInput');
  var dropZone   = document.getElementById('jcDropZone');
  var btnBrowse  = document.getElementById('btnBrowseJC');
  var btnReplace = document.getElementById('btnReplaceJC');
  var btnClear   = document.getElementById('btnClearJC');

  function triggerBrowse() { if (fileInput) fileInput.click(); }

  if (btnBrowse)  btnBrowse.addEventListener('click',  triggerBrowse);
  if (btnReplace) btnReplace.addEventListener('click', triggerBrowse);

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (this.files && this.files.length > 0) {
        _handleJCFile(this.files[0]);
        this.value = '';
      }
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', function () {
      _clearJCFinderTracking();
      _updateJCUploadUI(null);
      _renderTrackingStrip();
      showToast('JC tracking file cleared', 'info');
    });
  }

  if (dropZone) {
    dropZone.addEventListener('click', triggerBrowse);

    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropZone.classList.add('dragging');
    });
    dropZone.addEventListener('dragenter', function (e) {
      e.preventDefault();
      dropZone.classList.add('dragging');
    });
    dropZone.addEventListener('dragleave', function (e) {
      if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('dragging');
    });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('dragging');
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) _handleJCFile(files[0]);
    });
    dropZone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerBrowse(); }
    });
  }
}

function _handleJCFile(file) {
  var name    = file.name.toLowerCase();
  var isExcel = _JC_EXCEL_EXTS.some(function (ext) { return name.endsWith(ext); });

  if (!isExcel) {
    showToast('Please upload an Excel file (.xlsx, .xls)', 'error');
    return;
  }

  _parseJCFinderFile(
    file,
    function (data) {
      _updateJCUploadUI(data);
      _renderTrackingStrip();
      showToast(data.siteCount + ' sites loaded from JC tracking file', 'success');
    },
    function (err) {
      showToast('Error: ' + err, 'error');
    }
  );
}

function _updateJCUploadUI(data) {
  var emptyEl  = document.getElementById('jcFileEmpty');
  var loadedEl = document.getElementById('jcFileLoaded');
  var nameEl   = document.getElementById('jcFilename');
  var countEl  = document.getElementById('jcSiteCount');

  if (data && data.map && data.siteCount > 0) {
    if (emptyEl)  emptyEl.classList.add('hidden');
    if (loadedEl) loadedEl.classList.remove('hidden');
    if (nameEl)   nameEl.textContent  = data.filename  || '—';
    if (countEl)  countEl.textContent = data.siteCount + ' sites loaded';
  } else {
    if (emptyEl)  emptyEl.classList.remove('hidden');
    if (loadedEl) loadedEl.classList.add('hidden');
  }
}


/* ==========================================================================
   TRACKING STATUS STRIP
   Shows which data source is active
   ========================================================================== */

function _renderTrackingStrip() {
  var strip = document.getElementById('trackingStrip');
  if (!strip) return;

  var jcFile   = _loadJCFinderTracking();
  var tracking = (typeof loadCoordTracking === 'function') ? loadCoordTracking() : null;

  if (jcFile && jcFile.map && jcFile.siteCount > 0) {
    strip.innerHTML =
      '<div class="tracking-strip loaded">' +
      '  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      '       stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '    <polyline points="20 6 9 17 4 12"></polyline>' +
      '  </svg>' +
      '  <span>Using uploaded JC file — <strong>' + jcFile.siteCount + ' sites</strong> from ' +
      '  <em>' + _esc(jcFile.filename) + '</em></span>' +
      '</div>';
  } else if (tracking && tracking.map && tracking.siteCount > 0) {
    strip.innerHTML =
      '<div class="tracking-strip loaded">' +
      '  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      '       stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '    <polyline points="20 6 9 17 4 12"></polyline>' +
      '  </svg>' +
      '  <span><strong>' + tracking.siteCount + ' sites</strong> loaded from ' +
      '  <em>' + _esc(tracking.filename || 'coordinator tracking') + '</em></span>' +
      '</div>';
  } else {
    strip.innerHTML =
      '<div class="tracking-strip missing">' +
      '  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      '       stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
      '       style="flex-shrink:0" aria-hidden="true">' +
      '    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
      '    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' +
      '  </svg>' +
      '  <span>No tracking loaded. Upload a JC file above or ' +
      '  <a href="import.html" style="color:inherit;font-weight:600;text-decoration:underline">' +
      '  import coordinator tracking</a>.</span>' +
      '</div>';
  }
}


/* ==========================================================================
   PARSE PASTED INPUT
   ========================================================================== */

function _parseGroups() {
  var raw = (document.getElementById('siteInput') || {}).value || '';
  return raw
    .split(/[\n\r,]+/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}


/* ==========================================================================
   LOOKUP — Job Code + Old/New for a single site ID
   Checks the uploaded JC file first; falls back to coord_tracking.
   Old/New from the uploaded file is used as-is (already explicit in column).
   ========================================================================== */

function _lookupSingle(siteId) {
  var key = String(siteId).toUpperCase();

  /* 1. Check uploaded JC Finder file */
  var jcFile = _loadJCFinderTracking();
  if (jcFile && jcFile.map && jcFile.map[key]) {
    var e = jcFile.map[key];
    return { jc: e.jc || '', oldNew: e.oldNew || 'New', inSheet: true };
  }

  /* 2. Fall back to coord_tracking (imported on Import page) */
  var tracking = (typeof loadCoordTracking === 'function') ? loadCoordTracking() : null;
  if (!tracking || !tracking.map) return { jc: '', oldNew: '', inSheet: false };

  var entry = (typeof _getMapEntry === 'function')
    ? _getMapEntry(tracking.map, key)
    : null;

  if (!entry) return { jc: '', oldNew: '', inSheet: false };

  var oldNew = 'New';
  if (entry.taskDate) {
    var year = new Date(entry.taskDate).getFullYear();
    if (!isNaN(year)) oldNew = year < 2026 ? 'Old' : 'New';
  }

  return { jc: entry.jc || '', oldNew: oldNew, inSheet: true };
}

/* Split a composite site-ID field (e.g. "D0510/R7103") into individual IDs */
function _splitComposite(field) {
  return String(field)
    .split(/[\/,]+/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}


/* ==========================================================================
   FILL JC — build results table
   ========================================================================== */

function fillJC() {
  var groups = _parseGroups();
  if (!groups.length) {
    showToast('Paste some site IDs in the box first', 'warning');
    return;
  }

  var jcFile   = _loadJCFinderTracking();
  var tracking = (typeof loadCoordTracking === 'function') ? loadCoordTracking() : null;

  if ((!jcFile || !jcFile.map) && (!tracking || !tracking.map)) {
    showToast('Upload a JC file above or import coordinator tracking first', 'warning');
    return;
  }

  var tbody = document.getElementById('resultsBody');
  if (tbody) tbody.innerHTML = '';

  var found    = 0;
  var notFound = 0;
  var rowNum   = 0;

  groups.forEach(function (line, groupIdx) {
    var parts = _splitComposite(line);

    parts.forEach(function (site) {
      rowNum++;
      var result = _lookupSingle(site);
      if (result.inSheet) found++;
      else                notFound++;

      var tr = document.createElement('tr');
      tr.dataset.group  = String(groupIdx);
      tr.dataset.site   = site;
      tr.dataset.jc     = result.jc || '';
      tr.dataset.oldnew = result.oldNew || '';

      /* # */
      var tdNum = document.createElement('td');
      tdNum.className   = 'row-num';
      tdNum.textContent = String(rowNum);
      tr.appendChild(tdNum);

      /* Site ID */
      var tdSite = document.createElement('td');
      tdSite.className   = 'jc-site-cell';
      tdSite.textContent = site;
      tr.appendChild(tdSite);

      /* Job Code */
      var tdJC = document.createElement('td');
      tdJC.className = 'jc-code-cell';
      if (result.jc) {
        tdJC.textContent = result.jc;
      } else {
        var span = document.createElement('span');
        span.className   = 'jc-notfound';
        span.textContent = result.inSheet ? '(no JC)' : 'Not in tracking';
        tdJC.appendChild(span);
      }
      tr.appendChild(tdJC);

      /* Old / New badge */
      var tdON = document.createElement('td');
      tdON.className = 'jc-on-cell';
      if (result.inSheet) {
        var badge = document.createElement('span');
        badge.textContent  = result.oldNew;
        badge.style.cssText = [
          'display:inline-block',
          'padding:2px 10px',
          'border-radius:999px',
          'font-size:var(--text-xs)',
          'font-weight:600',
          result.oldNew === 'New'
            ? 'background:var(--color-success-bg);color:var(--color-success);border:1px solid #a7f3d0'
            : 'background:var(--color-warning-bg);color:var(--color-warning);border:1px solid #fde68a',
        ].join(';');
        tdON.appendChild(badge);
      } else {
        var dash = document.createElement('span');
        dash.className   = 'jc-notfound';
        dash.textContent = '—';
        tdON.appendChild(dash);
      }
      tr.appendChild(tdON);

      if (!result.inSheet) tr.style.opacity = '0.55';
      if (tbody) tbody.appendChild(tr);
    });
  });

  var resultsCard = document.getElementById('resultsCard');
  if (resultsCard) resultsCard.classList.remove('hidden');

  var summaryEl = document.getElementById('resultsSummary');
  if (summaryEl) {
    var foundTxt    = '<strong>' + found + '</strong> site' + (found !== 1 ? 's' : '') + ' found';
    var notFoundTxt = notFound > 0
      ? ' · <strong>' + notFound + '</strong> not in tracking'
      : '';
    summaryEl.innerHTML = foundTxt + notFoundTxt +
      '<span style="color:var(--color-text-muted)"> · Ctrl+Enter to refill</span>';
  }

  if (resultsCard) resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/* ==========================================================================
   CLEAR
   ========================================================================== */

function clearAll() {
  var siteInput   = document.getElementById('siteInput');
  var tbody       = document.getElementById('resultsBody');
  var resultsCard = document.getElementById('resultsCard');
  var summaryEl   = document.getElementById('resultsSummary');

  if (siteInput)   siteInput.value   = '';
  if (tbody)       tbody.innerHTML   = '';
  if (resultsCard) resultsCard.classList.add('hidden');
  if (summaryEl)   summaryEl.innerHTML = '';

  if (siteInput) siteInput.focus();
}


/* ==========================================================================
   COPY TO CLIPBOARD
   3 tab-separated columns: Site ID(s) · Job Code(s) · Old/New
   Old rows first, then New, then not-found.
   ========================================================================== */

function copyResults() {
  var rows = document.querySelectorAll('#resultsBody tr');
  if (!rows.length) {
    showToast('Nothing to copy — run Fill JC first', 'warning');
    return;
  }

  var buckets    = {};
  var groupOrder = [];
  rows.forEach(function (tr) {
    var g = tr.dataset.group || '0';
    if (!buckets[g]) { buckets[g] = []; groupOrder.push(g); }
    buckets[g].push(tr);
  });

  var oldLines  = [];
  var newLines  = [];
  var missLines = [];
  var oldCount  = 0;
  var newCount  = 0;

  groupOrder.forEach(function (g) {
    var oldSites = [], oldJCs = [];
    var newSites = [], newJCs = [];
    var missSites = [], missJCs = [];

    buckets[g].forEach(function (tr) {
      var site = tr.dataset.site   || '';
      var jc   = tr.dataset.jc     || '';
      var on   = tr.dataset.oldnew || '';

      if      (on === 'Old') { oldSites.push(site);  oldJCs.push(jc);  }
      else if (on === 'New') { newSites.push(site);  newJCs.push(jc);  }
      else                   { missSites.push(site); missJCs.push(jc); }
    });

    if (oldSites.length) {
      oldLines.push(oldSites.join('/') + '\t' + oldJCs.join('/') + '\t' + 'Old');
      oldCount += oldSites.length;
    }
    if (newSites.length) {
      newLines.push(newSites.join('/') + '\t' + newJCs.join('/') + '\t' + 'New');
      newCount += newSites.length;
    }
    if (missSites.length) {
      missLines.push(missSites.join('/') + '\t' + missJCs.join('/') + '\t' + '—');
    }
  });

  var allLines = oldLines.concat(newLines).concat(missLines);
  var text     = allLines.join('\n');
  var summary  = oldCount + ' Old · ' + newCount + ' New';
  if (missLines.length) summary += ' · ' + missLines.length + ' not found';

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      showToast(summary + ' — copied', 'success');
    }).catch(function () { _fallbackCopy(text, summary); });
  } else {
    _fallbackCopy(text, summary);
  }
}

/* ==========================================================================
   COPY JC — site + job code in original row order, no old/new grouping
   ========================================================================== */

function copyJC() {
  var rows = document.querySelectorAll('#resultsBody tr');
  if (!rows.length) {
    showToast('Nothing to copy — run Fill JC first', 'warning');
    return;
  }

  var buckets    = {};
  var groupOrder = [];
  rows.forEach(function (tr) {
    var g = tr.dataset.group || '0';
    if (!buckets[g]) { buckets[g] = []; groupOrder.push(g); }
    buckets[g].push(tr);
  });

  var lines = [];
  groupOrder.forEach(function (g) {
    var jcs = buckets[g]
      .map(function (tr) { return tr.dataset.jc || ''; })
      .filter(function (jc) { return jc.length > 0; });
    if (jcs.length) lines.push(jcs.join('/'));
  });

  var text    = lines.join('\n');
  var summary = lines.length + ' JC' + (lines.length !== 1 ? 's' : '') + ' copied';

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      showToast(summary, 'success');
    }).catch(function () { _fallbackCopy(text, summary); });
  } else {
    _fallbackCopy(text, summary);
  }
}


function _fallbackCopy(text, summary) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(summary + ' — copied to clipboard', 'success');
  } catch (_) {
    showToast('Copy failed — please select and copy manually', 'error');
  }
  document.body.removeChild(ta);
}


/* ==========================================================================
   UTILITY
   ========================================================================== */

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
