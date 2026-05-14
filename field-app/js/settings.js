/* ==========================================================================
   ExpenseFuel — Field App · settings.js
   Depends on (loaded before this file):
     translations.js  →  TRANSLATIONS, DEFAULT_LANG
     lists.js         →  LISTS, populateSelect()
     utils.js         →  getSettings(), saveToStorage(), applyLanguage(),
                         initLanguage(), showToast()
     app.js           →  refreshSettingsState()
   ========================================================================== */

/* ==========================================================================
   LOAD — populate form from localStorage
   ========================================================================== */

function loadSettings() {
  const settings = getSettings();

  if (!settings) {
    /* No saved data: hide avatar, pre-select EN radio, nothing else */
    _setAvatarVisible(false);
    _setLangRadio('en');
    return;
  }

  /* ---- Text / number inputs ---- */
  _setInputVal('fieldName',            settings.name);
  _setInputVal('fieldMobile',          settings.mobile);
  _setInputVal('fieldTrackingNumber',  settings.trackingNumber);
  _setInputVal('fieldCoordinator',     settings.defaultCoordinator);
  _setInputVal('fieldDriver',          settings.defaultDriver);

  /* ---- Account type select ---- */
  const accountTypeEl = document.getElementById('fieldAccountType');
  if (accountTypeEl && settings.accountType) {
    accountTypeEl.value = settings.accountType;
  }

  /* ---- Default project (select already populated by DOMContentLoaded) ---- */
  const projectEl = document.getElementById('fieldProject');
  if (projectEl && settings.defaultProject) {
    projectEl.value = settings.defaultProject;
  }

  /* ---- Language radio ---- */
  _setLangRadio(settings.language || 'en');

  /* ---- Avatar strip ---- */
  _renderAvatar(settings);
}

/* ==========================================================================
   SAVE — validate, persist, update UI
   ========================================================================== */

function saveSettings() {
  /* Clear previous error state */
  _clearAllErrors();

  /* Read values */
  const name            = _getInputVal('fieldName');
  const mobile          = _getInputVal('fieldMobile');
  const trackingRaw     = _getInputVal('fieldTrackingNumber');
  const accountType     = _getSelectVal('fieldAccountType') || 'New';
  const defaultCoordinator = _getInputVal('fieldCoordinator');
  const defaultProject  = _getSelectVal('fieldProject');
  const defaultDriver   = _getInputVal('fieldDriver');
  const langRadio       = document.querySelector('input[name="language"]:checked');
  const language        = langRadio ? langRadio.value : 'en';

  /* ---- Validate required fields ---- */
  let hasError = false;

  if (!name) {
    _showFieldError('fieldName', 'errorName');
    hasError = true;
  }

  if (!mobile) {
    _showFieldError('fieldMobile', 'errorMobile');
    hasError = true;
  }

  const trackingNumber = parseInt(trackingRaw, 10);
  if (!trackingRaw || isNaN(trackingNumber) || trackingNumber < 1) {
    _showFieldError('fieldTrackingNumber', 'errorTracking');
    hasError = true;
  }

  if (hasError) {
    /* Scroll the first red field into view */
    const firstError = document.querySelector('.form-input.is-error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  /* ---- Build and persist the settings object (exact CLAUDE.md schema) ---- */
  const settings = {
    name,
    mobile,
    defaultCoordinator,
    defaultProject,
    defaultDriver,
    accountType,
    trackingNumber,
    language,
  };

  saveToStorage('settings', settings);

  /* ---- Apply language change to live UI ---- */
  applyLanguage(language);
  _syncNavLangPill(language);

  /* ---- Feedback ---- */
  const t = TRANSLATIONS[language] || TRANSLATIONS[DEFAULT_LANG];
  showToast(t.settingsSaved, 'success');

  /* ---- Update navbar indicator dot + warning banner (app.js) ---- */
  refreshSettingsState();

  /* ---- Refresh avatar ---- */
  _renderAvatar(settings);
}

/* ==========================================================================
   CLEAR — custom modal confirm, then wipe storage
   ========================================================================== */

function clearAllSettings() {
  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  const t    = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];

  _showConfirmModal(
    /* title   */ lang === 'ar' ? 'مسح جميع الإعدادات؟' : 'Clear All Settings?',
    /* message */ lang === 'ar'
      ? 'سيتم حذف جميع بياناتك المحفوظة نهائياً ولا يمكن التراجع عن ذلك.'
      : 'This will permanently delete all your saved settings. You will need to re-enter your information.',
    /* cancel  */ t.cancel  || 'Cancel',
    /* confirm */ t.clear   || 'Clear All',
    /* onOK    */ function () {
      localStorage.removeItem('settings');
      window.location.reload();
    }
  );
}

/* ==========================================================================
   DOM READY
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* 1. Populate project select BEFORE loadSettings so the value sticks */
  populateSelect(document.getElementById('fieldProject'), 'projects');

  /* 2. Fill form from saved data (sets project value too) */
  loadSettings();

  /* 3. Language radio → switch UI language live as the user toggles it */
  document.querySelectorAll('input[name="language"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      applyLanguage(this.value);
      _syncNavLangPill(this.value);
    });
  });

  /* 4. Bind Save / Clear buttons (supplements the onclick attrs in HTML) */
  const btnSave  = document.getElementById('btnSave');
  const btnClear = document.getElementById('btnClearAll');
  if (btnSave)  btnSave.addEventListener('click',  saveSettings);
  if (btnClear) btnClear.addEventListener('click', clearAllSettings);
});

/* ==========================================================================
   PRIVATE HELPERS
   ========================================================================== */

/* ---- DOM value helpers --------------------------------------------------- */

function _getInputVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function _getSelectVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function _setInputVal(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) {
    el.value = value;
  }
}

/* ---- Error state --------------------------------------------------------- */

function _showFieldError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.add('is-error');
  if (error) error.classList.remove('hidden');
}

function _clearAllErrors() {
  document.querySelectorAll('.form-input.is-error, .form-select.is-error').forEach(function (el) {
    el.classList.remove('is-error');
  });
  document.querySelectorAll('.form-error').forEach(function (el) {
    el.classList.add('hidden');
  });
}

/* ---- Language radio ------------------------------------------------------- */

function _setLangRadio(lang) {
  const radio = document.getElementById(lang === 'ar' ? 'langPrefAr' : 'langPrefEn');
  if (radio) radio.checked = true;
}

/* Keep the navbar EN | AR pill in sync when settings change language */
function _syncNavLangPill(lang) {
  const btnEn = document.getElementById('btnEn');
  const btnAr = document.getElementById('btnAr');
  if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  if (btnAr) btnAr.classList.toggle('active', lang === 'ar');
}

/* ---- Avatar strip -------------------------------------------------------- */

function _renderAvatar(settings) {
  if (!settings || !settings.name) {
    _setAvatarVisible(false);
    return;
  }

  _setAvatarVisible(true);

  const initials = _buildInitials(settings.name);

  _setTextContent('avatarInitials', initials);
  _setTextContent('avatarName',     settings.name);
  _setTextContent('avatarMobile',   settings.mobile || '');
  _setTextContent('avatarTracking', 'T-' + (settings.trackingNumber || '—'));
}

function _setAvatarVisible(visible) {
  const el = document.getElementById('settingsAvatar');
  if (el) el.classList.toggle('hidden', !visible);
}

function _setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _buildInitials(name) {
  if (!name) return '--';
  const words = name.trim().split(/\s+/);
  /* Works for both Latin (uppercase) and Arabic (no-op on toUpperCase) */
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/* ---- Custom confirm modal ------------------------------------------------ */

function _showConfirmModal(title, message, cancelLabel, confirmLabel, onConfirm) {
  /* Remove any stale modal */
  const stale = document.getElementById('_settingsConfirmModal');
  if (stale) stale.remove();

  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  const isRtl = lang === 'ar';

  /* --- Overlay --- */
  const overlay = document.createElement('div');
  overlay.id = '_settingsConfirmModal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', '_modalTitle');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9500',
    'background:rgba(15,23,42,0.55)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'padding:16px',
    'animation:_modalIn 150ms ease',
  ].join(';');

  /* Inject keyframe once */
  if (!document.getElementById('_modalKeyframe')) {
    const style = document.createElement('style');
    style.id = '_modalKeyframe';
    style.textContent = '@keyframes _modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}';
    document.head.appendChild(style);
  }

  /* --- Modal card --- */
  const card = document.createElement('div');
  card.style.cssText = [
    'background:#fff',
    'border-radius:14px',
    'box-shadow:0 10px 30px rgba(0,0,0,0.15),0 4px 8px rgba(0,0,0,0.06)',
    'padding:24px',
    'max-width:380px',
    'width:100%',
    'display:flex',
    'flex-direction:column',
    'gap:16px',
    isRtl ? 'direction:rtl;text-align:right' : 'direction:ltr',
  ].join(';');

  /* Danger icon */
  const iconWrap = document.createElement('div');
  iconWrap.style.cssText = [
    'width:44px', 'height:44px', 'border-radius:50%',
    'background:#fef2f2', 'color:#dc2626',
    'display:flex', 'align-items:center', 'justify-content:center',
    'flex-shrink:0',
  ].join(';');
  iconWrap.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>';

  /* Title */
  const h = document.createElement('h3');
  h.id = '_modalTitle';
  h.style.cssText = 'font-size:17px;font-weight:700;color:#0f172a;margin:0;line-height:1.3';
  h.textContent = title;

  /* Message */
  const p = document.createElement('p');
  p.style.cssText = 'font-size:14px;color:#64748b;margin:0;line-height:1.6';
  p.textContent = message;

  /* Action row */
  const actions = document.createElement('div');
  actions.style.cssText = [
    'display:flex', 'gap:10px',
    isRtl ? 'justify-content:flex-start;flex-direction:row-reverse' : 'justify-content:flex-end',
    'margin-top:4px',
  ].join(';');

  const btnCancel = document.createElement('button');
  btnCancel.className = 'btn btn-secondary';
  btnCancel.textContent = cancelLabel;
  btnCancel.onclick = function () { overlay.remove(); };

  const btnConfirm = document.createElement('button');
  btnConfirm.className = 'btn btn-danger';
  btnConfirm.textContent = confirmLabel;
  btnConfirm.onclick = function () {
    overlay.remove();
    onConfirm();
  };

  actions.append(btnCancel, btnConfirm);
  card.append(iconWrap, h, p, actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  /* Close on backdrop click */
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });

  /* Close on Escape */
  function onKeydown(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKeydown); }
  }
  document.addEventListener('keydown', onKeydown);
  overlay.addEventListener('remove', function () { document.removeEventListener('keydown', onKeydown); });

  /* Focus cancel button for keyboard accessibility */
  setTimeout(function () { btnCancel.focus(); }, 50);
}
