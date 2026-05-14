/* ==========================================================================
   ExpenseFuel — Coordinator App · Global Init (app.js)
   Runs on every coordinator-app page. No page-specific logic here.

   Load order in every HTML page:
     ../shared/js/translations.js
     ../shared/js/lists.js
     ../shared/js/utils.js
     ../shared/js/validations.js
     js/app.js                   ← this file
     js/[page-specific].js       ← last
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ---- 1. Language init ------------------------------------------------- */
  var activeLang = initLanguage(); /* defined in utils.js */
  _syncLangPill(activeLang);

  /* ---- 2. Top nav tab active state -------------------------------------- */
  _setActiveNavTab();

  /* ---- 3. Settings warning banner --------------------------------------- */
  _applySettingsState();

  /* ---- 4. Language toggle pill click handlers --------------------------- */
  _bindLangToggle();

});

/* ==========================================================================
   PRIVATE HELPERS
   ========================================================================== */

/* --------------------------------------------------------------------------
   _setActiveNavTab()
   Marks the .coord-nav-tab (or .coord-nav-link) whose href matches the
   current page filename. Falls back to index.html for root/empty paths.
   -------------------------------------------------------------------------- */
function _setActiveNavTab() {
  var filename = window.location.pathname.split('/').pop();
  if (!filename || filename === '') filename = 'index.html';

  /* Tab bar links (.coord-nav-tab) */
  document.querySelectorAll('.coord-nav-tab').forEach(function (item) {
    var href = (item.getAttribute('href') || '').split('/').pop();
    var isMatch = href === filename ||
                  (filename === 'index.html' && (href === '' || href === '#'));
    item.classList.toggle('active', isMatch);
  });

  /* Navbar inline links (.coord-nav-link) */
  document.querySelectorAll('.coord-nav-link').forEach(function (item) {
    var href = (item.getAttribute('href') || '').split('/').pop();
    var isMatch = href === filename ||
                  (filename === 'index.html' && (href === '' || href === '#'));
    item.classList.toggle('active', isMatch);
  });
}

/* --------------------------------------------------------------------------
   _applySettingsState()
   Shows the .warning-banner if coord_settings has no name set.
   Does NOT redirect — individual pages guard themselves if needed.
   -------------------------------------------------------------------------- */
function _applySettingsState() {
  var settings = getCoordSettings();
  var complete  = !!(settings && settings.name && settings.mobile);

  var banner = document.querySelector('.warning-banner');
  if (banner) {
    banner.classList.toggle('hidden', complete);
  }
}

/* --------------------------------------------------------------------------
   _syncLangPill(lang)
   Sets the active class on the correct pill button.
   -------------------------------------------------------------------------- */
function _syncLangPill(lang) {
  var btnEn = document.getElementById('btnEn');
  var btnAr = document.getElementById('btnAr');
  if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  if (btnAr) btnAr.classList.toggle('active', lang === 'ar');
}

/* --------------------------------------------------------------------------
   _bindLangToggle()
   Wires the EN | AR pill buttons in the navbar.
   -------------------------------------------------------------------------- */
function _bindLangToggle() {
  var btnEn = document.getElementById('btnEn');
  var btnAr = document.getElementById('btnAr');

  if (btnEn) {
    btnEn.addEventListener('click', function () {
      applyLanguage('en');
      _syncLangPill('en');
    });
  }

  if (btnAr) {
    btnAr.addEventListener('click', function () {
      applyLanguage('ar');
      _syncLangPill('ar');
    });
  }
}

/* ==========================================================================
   PUBLIC HELPER — called by settings.js after a successful save
   ========================================================================== */

function refreshSettingsState() {
  _applySettingsState();
}

/* ==========================================================================
   PUBLIC DATA HELPERS
   ========================================================================== */

/* --------------------------------------------------------------------------
   getCoordSettings()
   Returns the coordinator's saved settings object, or null if not set.
   -------------------------------------------------------------------------- */
function getCoordSettings() {
  return loadFromStorage('coord_settings', null);
}

/* --------------------------------------------------------------------------
   getAllImports()
   Scans all localStorage keys for 'imported_*' entries.
   Returns an array of objects: { id, ...importData }
   Sorted newest-first by importedAt (falls back to array order).
   -------------------------------------------------------------------------- */
function getAllImports() {
  var results = [];

  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (!key || key.indexOf('imported_') !== 0) continue;

    var id  = key.slice('imported_'.length);
    var raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      var data = JSON.parse(raw);
      data.id  = data.id || id; /* ensure id field is present */
      results.push(data);
    } catch (e) {
      /* Corrupt entry — skip */
    }
  }

  /* Sort newest-first using importedAt timestamp */
  results.sort(function (a, b) {
    var ta = a.importedAt ? new Date(a.importedAt).getTime() : 0;
    var tb = b.importedAt ? new Date(b.importedAt).getTime() : 0;
    return tb - ta;
  });

  return results;
}

/* --------------------------------------------------------------------------
   getReviewData(importId)
   Returns the review-status map for an imported report, or {} if not found.
   Shape: { [entryId]: { status, coordinatorNote, reviewedAt } }
   -------------------------------------------------------------------------- */
function getReviewData(importId) {
  return loadFromStorage('review_' + importId, {});
}

/* --------------------------------------------------------------------------
   saveReviewData(importId, data)
   Persists the review-status map for an imported report.
   -------------------------------------------------------------------------- */
function saveReviewData(importId, data) {
  saveToStorage('review_' + importId, data);
}
