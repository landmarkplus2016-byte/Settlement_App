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

/* Apply saved theme immediately — before DOMContentLoaded to avoid colour flash */
(function () {
  var t = localStorage.getItem('coord_theme');
  if (t && t !== 'default') document.documentElement.setAttribute('data-coord-theme', t);
}());

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

  /* ---- 5. Theme picker -------------------------------------------------- */
  _injectThemePicker();
  _markActiveThemeSwatch();
  _bindThemePicker();

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

  /* Navbar inline links (.coord-nav-link) and icon buttons (.navbar-icon-btn) */
  document.querySelectorAll('.coord-nav-link, .navbar-icon-btn').forEach(function (item) {
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
  var complete  = !!(settings && settings.name);

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
   THEME PICKER
   ========================================================================== */

var _THEMES = [
  { id: 'default', color: '#065f46', label: 'Green'  },
  { id: 'navy',    color: '#1e3a5f', label: 'Navy'   },
  { id: 'ocean',   color: '#0369a1', label: 'Ocean'  },
  { id: 'slate',   color: '#334155', label: 'Slate'  },
  { id: 'rose',    color: '#9f1239', label: 'Rose'   },
  { id: 'amber',   color: '#92400e', label: 'Amber'  },
];

/* Inject the picker HTML before the lang-toggle in the navbar */
function _injectThemePicker() {
  var langToggle = document.querySelector('.navbar .lang-toggle');
  if (!langToggle || document.getElementById('themePicker')) return;

  var swatches = _THEMES.map(function (t) {
    return '<button class="theme-swatch" data-theme="' + t.id + '" ' +
           'style="background:' + t.color + '" ' +
           'title="' + t.label + '" aria-label="' + t.label + ' theme"></button>';
  }).join('');

  var wrap = document.createElement('div');
  wrap.className = 'theme-picker';
  wrap.id        = 'themePicker';
  wrap.innerHTML =
    '<button class="theme-picker-btn" id="themePickerBtn" ' +
    '        aria-label="Change colour theme" title="Colour theme">' +
    '  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    '       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '    <circle cx="13.5" cy="6.5"  r=".5" fill="currentColor"/>' +
    '    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>' +
    '    <circle cx="8.5"  cy="7.5"  r=".5" fill="currentColor"/>' +
    '    <circle cx="6.5"  cy="12.5" r=".5" fill="currentColor"/>' +
    '    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688' +
    '     0-.437-.18-.835-.476-1.124-.29-.289-.469-.684-.469-1.116' +
    '     a1.64 1.64 0 0 1 1.648-1.648h1.93c3.082 0 5.568-2.487 5.568-5.568' +
    '     C21.815 6.006 17.41 2 12 2z"/>' +
    '  </svg>' +
    '</button>' +
    '<div class="theme-panel hidden" id="themePanel" role="menu" ' +
    '     aria-label="Colour themes">' +
    swatches +
    '</div>';

  var settingsBtn = document.querySelector('.navbar .navbar-icon-btn');
  var anchor = settingsBtn || langToggle;
  anchor.parentNode.insertBefore(wrap, anchor);
}

/* Set & persist a theme */
function _setTheme(name) {
  if (name && name !== 'default') {
    document.documentElement.setAttribute('data-coord-theme', name);
  } else {
    document.documentElement.removeAttribute('data-coord-theme');
  }
  localStorage.setItem('coord_theme', name || 'default');
  _markActiveThemeSwatch();
}

/* Ring the active swatch */
function _markActiveThemeSwatch() {
  var current = localStorage.getItem('coord_theme') || 'default';
  document.querySelectorAll('.theme-swatch').forEach(function (sw) {
    sw.classList.toggle('active', sw.dataset.theme === current);
  });
}

/* Wire button + swatches + outside-click close */
function _bindThemePicker() {
  var btn   = document.getElementById('themePickerBtn');
  var panel = document.getElementById('themePanel');
  if (!btn || !panel) return;

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  document.querySelectorAll('.theme-swatch').forEach(function (sw) {
    sw.addEventListener('click', function () {
      _setTheme(sw.dataset.theme);
      panel.classList.add('hidden');
    });
  });

  document.addEventListener('click', function () {
    if (panel) panel.classList.add('hidden');
  });
  panel.addEventListener('click', function (e) { e.stopPropagation(); });
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
