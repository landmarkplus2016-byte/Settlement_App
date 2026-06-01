/* ==========================================================================
   JC Finder — coordinator-app/js/jc-finder.js
   Depends on (loaded before this file):
     utils.js          →  showToast()
     coord-tracking.js →  loadCoordTracking(), lookupJC(), lookupTaskDate(),
                          _getMapEntry()
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  _renderTrackingStrip();

  var btnFill  = document.getElementById('btnFillJC');
  var btnClear = document.getElementById('btnClear');
  var btnCopy  = document.getElementById('btnCopy');

  if (btnFill)  btnFill.addEventListener('click',  fillJC);
  if (btnClear) btnClear.addEventListener('click',  clearAll);
  if (btnCopy)  btnCopy.addEventListener('click',   copyResults);

  /* Allow Ctrl/Cmd+Enter in the textarea to trigger Fill JC */
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
   TRACKING STATUS STRIP
   ========================================================================== */

function _renderTrackingStrip() {
  var strip    = document.getElementById('trackingStrip');
  if (!strip) return;

  var tracking = (typeof loadCoordTracking === 'function') ? loadCoordTracking() : null;

  if (tracking && tracking.map && tracking.siteCount > 0) {
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
      '  <span>No coordinator tracking loaded. ' +
      '  <a href="import.html" style="color:inherit;font-weight:600;text-decoration:underline">' +
      '  Upload it on the Import page</a> first.</span>' +
      '</div>';
  }
}


/* ==========================================================================
   PARSE PASTED INPUT
   Returns an array of "groups" — each group is one original input line
   (or comma-separated token). Within a group, composite sites like
   D0510/R7103 are kept together so they can be recombined on copy.
   ========================================================================== */

function _parseGroups() {
  var raw = (document.getElementById('siteInput') || {}).value || '';
  return raw
    .split(/[\n\r,]+/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}


/* ==========================================================================
   LOOKUP — Job Code + Old/New for a single site ID (no composite splitting)
   Old/New rule: task date year < 2026 → Old, >= 2026 or empty → New
   ========================================================================== */

function _lookupSingle(siteId) {
  var tracking = (typeof loadCoordTracking === 'function') ? loadCoordTracking() : null;
  if (!tracking || !tracking.map) return { jc: '', oldNew: '', inSheet: false };

  var entry = (typeof _getMapEntry === 'function')
    ? _getMapEntry(tracking.map, String(siteId).toUpperCase())
    : null;

  if (!entry) return { jc: '', oldNew: '', inSheet: false };

  var oldNew = 'New';
  if (entry.taskDate) {
    var year = new Date(entry.taskDate).getFullYear();
    if (!isNaN(year)) {
      oldNew = year < 2026 ? 'Old' : 'New';
    }
  }

  return { jc: entry.jc || '', oldNew: oldNew, inSheet: true };
}


/* Split a composite site-ID field (e.g. "D0510/R7103" or "73/EM071")
   into individual site IDs. */
function _splitComposite(field) {
  return String(field)
    .split(/[\/,\-–—]+/)
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

  var tracking = (typeof loadCoordTracking === 'function') ? loadCoordTracking() : null;
  if (!tracking || !tracking.map) {
    showToast('Load coordinator tracking on the Import page first', 'warning');
    return;
  }

  var tbody = document.getElementById('resultsBody');
  if (tbody) tbody.innerHTML = '';

  var found    = 0;
  var notFound = 0;
  var rowNum   = 0;

  /* Each group from the textarea may be a composite (e.g. "D0510/R7103").
     Expand every composite into individual site rows so each site gets
     its own Old/New badge. data-group tracks the original input line so
     copyResults() can recombine composites back together. */
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

      /* Old / New — individual badge per site */
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

      /* Dim rows not found in sheet */
      if (!result.inSheet) tr.style.opacity = '0.55';

      if (tbody) tbody.appendChild(tr);
    });
  });

  /* Show results card */
  var resultsCard = document.getElementById('resultsCard');
  if (resultsCard) resultsCard.classList.remove('hidden');

  /* Summary line */
  var summaryEl = document.getElementById('resultsSummary');
  if (summaryEl) {
    var foundTxt    = '<strong>' + found + '</strong> site' + (found !== 1 ? 's' : '') + ' found';
    var notFoundTxt = notFound > 0
      ? ' · <strong>' + notFound + '</strong> not in tracking sheet'
      : '';
    summaryEl.innerHTML = foundTxt + notFoundTxt +
      '<span style="color:var(--color-text-muted)"> · Ctrl+Enter to refill</span>';
  }

  /* Scroll to results */
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
   Mixed composites are split at the Old/New boundary so that every
   output row is either purely Old or purely New.
   Order: all Old rows first, then all New rows, not-found last.
   ========================================================================== */

function copyResults() {
  var rows = document.querySelectorAll('#resultsBody tr');
  if (!rows.length) {
    showToast('Nothing to copy — run Fill JC first', 'warning');
    return;
  }

  /* Re-bucket rows by their original input-line group */
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
