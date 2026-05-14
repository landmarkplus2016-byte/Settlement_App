/* ==========================================================================
   ExpenseFuel — Field App · Global Init (app.js)
   Runs on every field-app page. No page-specific logic here.

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
  const activeLang = initLanguage(); /* defined in utils.js */
  _syncLangPill(activeLang);

  /* ---- 2. Bottom nav active state --------------------------------------- */
  _setActiveNavItem();

  /* ---- 3. Settings state (banner + indicator dot) ----------------------- */
  _applySettingsState();

  /* ---- 4. Language toggle pill click handlers --------------------------- */
  _bindLangToggle();

});

/* ==========================================================================
   PRIVATE HELPERS
   ========================================================================== */

/* --------------------------------------------------------------------------
   _setActiveNavItem()
   Marks the .bottom-nav-item whose href matches the current page filename.
   Falls back to index.html when the path ends with '/' or is empty.
   -------------------------------------------------------------------------- */
function _setActiveNavItem() {
  let filename = window.location.pathname.split('/').pop();
  if (!filename || filename === '') filename = 'index.html';

  const navItems = document.querySelectorAll('.bottom-nav-item');
  navItems.forEach(function (item) {
    const href = (item.getAttribute('href') || '').split('/').pop();
    const isMatch = href === filename ||
                    /* treat bare '/' or empty href as dashboard */
                    (filename === 'index.html' && (href === '' || href === '#'));
    item.classList.toggle('active', isMatch);
  });
}

/* --------------------------------------------------------------------------
   _applySettingsState()
   • Shows or hides the .warning-banner element present on the page (if any).
   • Updates the .settings-complete-indicator dot colour.
   • Does NOT redirect — individual data-entry pages call guardSettings()
     themselves at the top of their own init function.
   -------------------------------------------------------------------------- */
function _applySettingsState() {
  const complete = isSettingsComplete(); /* defined in utils.js */

  /* Warning banner — present on dashboard (index.html) */
  const banner = document.querySelector('.warning-banner');
  if (banner) {
    banner.classList.toggle('hidden', complete);
  }

  /* Indicator dot in the navbar */
  const dot = document.querySelector('.settings-complete-indicator');
  if (dot) {
    dot.classList.toggle('incomplete', !complete);
    /* Remove any leftover pulse so it doesn't replay on every page load */
    dot.classList.remove('pulse');
  }

  /* Tracking number chip — populate from settings if present */
  const chip = document.querySelector('.tracking-chip');
  if (chip && complete) {
    const s = getSettings(); /* defined in utils.js */
    if (s && s.trackingNumber !== undefined) {
      chip.textContent = 'T-' + s.trackingNumber;
    }
  }
}

/* --------------------------------------------------------------------------
   _syncLangPill(lang)
   Sets the active class on the correct pill button to match the current lang.
   -------------------------------------------------------------------------- */
function _syncLangPill(lang) {
  const btnEn = document.getElementById('btnEn');
  const btnAr = document.getElementById('btnAr');
  if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  if (btnAr) btnAr.classList.toggle('active', lang === 'ar');
}

/* --------------------------------------------------------------------------
   _bindLangToggle()
   Wires up the EN | AR pill buttons in the navbar.
   applyLanguage() (utils.js) handles the DOM update + localStorage save.
   -------------------------------------------------------------------------- */
function _bindLangToggle() {
  const btnEn = document.getElementById('btnEn');
  const btnAr = document.getElementById('btnAr');

  if (btnEn) {
    btnEn.addEventListener('click', function () {
      applyLanguage('en'); /* utils.js — updates DOM + saves to localStorage */
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
   PUBLIC HELPER — called by page scripts after saving settings
   ========================================================================== */

/* Re-run the settings state check (used by settings.js after a successful save) */
function refreshSettingsState() {
  _applySettingsState();

  /* Briefly pulse the dot green to give tactile feedback */
  const dot = document.querySelector('.settings-complete-indicator');
  if (dot && isSettingsComplete()) {
    dot.classList.remove('pulse');
    /* Force reflow so the animation restarts even if already applied */
    void dot.offsetWidth;
    dot.classList.add('pulse');
  }
}
