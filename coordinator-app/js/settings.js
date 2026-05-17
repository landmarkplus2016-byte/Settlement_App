/* ==========================================================================
   ExpenseFuel — Coordinator App · settings.js
   Depends on (loaded before this file):
     translations.js  →  TRANSLATIONS, DEFAULT_LANG
     utils.js         →  saveToStorage(), applyLanguage(), initLanguage(), showToast()
     app.js           →  refreshSettingsState()
   Storage key: 'coord_settings'
   ========================================================================== */

var COORD_SETTINGS_KEY = 'coord_settings';

/* ==========================================================================
   LOAD — populate form from localStorage
   ========================================================================== */

function loadSettings() {
  var raw = localStorage.getItem(COORD_SETTINGS_KEY);
  var settings = raw ? JSON.parse(raw) : null;

  if (!settings) {
    _setAvatarVisible(false);
    _setLangRadio('en');
    return;
  }

  _setInputVal('fieldName', settings.name);
  _setLangRadio(settings.language || 'en');
  _renderAvatar(settings);
}

/* ==========================================================================
   SAVE — validate, persist, update UI
   ========================================================================== */

function saveSettings() {
  _clearAllErrors();

  var name = _getInputVal('fieldName');

  var langRadio = document.querySelector('input[name="language"]:checked');
  var language  = langRadio ? langRadio.value : 'en';

  var hasError = false;

  if (!name) {
    _showFieldError('fieldName', 'errorName');
    hasError = true;
  }

  if (hasError) {
    var firstError = document.querySelector('.form-input.is-error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  var settings = {
    name:     name,
    language: language,
  };

  localStorage.setItem(COORD_SETTINGS_KEY, JSON.stringify(settings));

  applyLanguage(language);
  _syncNavLangPill(language);

  var t = TRANSLATIONS[language] || TRANSLATIONS[DEFAULT_LANG];
  showToast(t.settingsSaved || 'Settings saved', 'success');

  if (typeof refreshSettingsState === 'function') refreshSettingsState();

  _renderAvatar(settings);
}

/* ==========================================================================
   CLEAR — custom modal confirm, then wipe storage
   ========================================================================== */

function clearSettings() {
  var lang = localStorage.getItem('lang') || DEFAULT_LANG;
  var t    = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];

  _showConfirmModal(
    lang === 'ar' ? 'مسح جميع الإعدادات؟' : 'Clear All Settings?',
    lang === 'ar'
      ? 'سيتم حذف جميع بياناتك المحفوظة نهائياً ولا يمكن التراجع عن ذلك.'
      : 'This will permanently delete all your saved settings. You will need to re-enter your information.',
    t.cancel  || 'Cancel',
    t.clear   || 'Clear All',
    function () {
      localStorage.removeItem(COORD_SETTINGS_KEY);
      window.location.reload();
    }
  );
}

/* ==========================================================================
   DOM READY
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  loadSettings();

  /* Language radio → switch UI language live */
  document.querySelectorAll('input[name="language"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      applyLanguage(this.value);
      _syncNavLangPill(this.value);
    });
  });

  var btnSave  = document.getElementById('btnSave');
  var btnClear = document.getElementById('btnClearAll');
  if (btnSave)  btnSave.addEventListener('click',  saveSettings);
  if (btnClear) btnClear.addEventListener('click', clearSettings);
});

/* ==========================================================================
   PRIVATE HELPERS
   ========================================================================== */

function _getInputVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function _setInputVal(id, value) {
  var el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.value = value;
}

function _showFieldError(inputId, errorId) {
  var input = document.getElementById(inputId);
  var error = document.getElementById(errorId);
  if (input) input.classList.add('is-error');
  if (error) error.classList.remove('hidden');
}

function _clearAllErrors() {
  document.querySelectorAll('.form-input.is-error').forEach(function (el) {
    el.classList.remove('is-error');
  });
  document.querySelectorAll('.form-error').forEach(function (el) {
    el.classList.add('hidden');
  });
}

function _setLangRadio(lang) {
  var radio = document.getElementById(lang === 'ar' ? 'langPrefAr' : 'langPrefEn');
  if (radio) radio.checked = true;
}

function _syncNavLangPill(lang) {
  var btnEn = document.getElementById('btnEn');
  var btnAr = document.getElementById('btnAr');
  if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  if (btnAr) btnAr.classList.toggle('active', lang === 'ar');
}

/* ---- Avatar strip ---- */

function _renderAvatar(settings) {
  if (!settings || !settings.name) {
    _setAvatarVisible(false);
    return;
  }
  _setAvatarVisible(true);
  _setTextContent('avatarInitials', _buildInitials(settings.name));
  _setTextContent('avatarName',     settings.name);
  _setTextContent('avatarMobile',   settings.mobile || '');
}

function _setAvatarVisible(visible) {
  var el = document.getElementById('settingsAvatar');
  if (el) el.classList.toggle('hidden', !visible);
}

function _setTextContent(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _buildInitials(name) {
  if (!name) return '--';
  var words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/* ---- Custom confirm modal ---- */

function _showConfirmModal(title, message, cancelLabel, confirmLabel, onConfirm) {
  var stale = document.getElementById('_coordConfirmModal');
  if (stale) stale.remove();

  var lang  = localStorage.getItem('lang') || DEFAULT_LANG;
  var isRtl = lang === 'ar';

  var overlay = document.createElement('div');
  overlay.id = '_coordConfirmModal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', '_coordModalTitle');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9500',
    'background:rgba(15,23,42,0.55)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'padding:16px',
    'animation:_modalIn 150ms ease',
  ].join(';');

  if (!document.getElementById('_modalKeyframe')) {
    var style = document.createElement('style');
    style.id = '_modalKeyframe';
    style.textContent = '@keyframes _modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}';
    document.head.appendChild(style);
  }

  var card = document.createElement('div');
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

  var iconWrap = document.createElement('div');
  iconWrap.style.cssText = [
    'width:44px', 'height:44px', 'border-radius:50%',
    'background:#fef2f2', 'color:#dc2626',
    'display:flex', 'align-items:center', 'justify-content:center',
    'flex-shrink:0',
  ].join(';');
  iconWrap.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>';

  var h = document.createElement('h3');
  h.id = '_coordModalTitle';
  h.style.cssText = 'font-size:17px;font-weight:700;color:#0f172a;margin:0;line-height:1.3';
  h.textContent = title;

  var p = document.createElement('p');
  p.style.cssText = 'font-size:14px;color:#64748b;margin:0;line-height:1.6';
  p.textContent = message;

  var actions = document.createElement('div');
  actions.style.cssText = [
    'display:flex', 'gap:10px',
    isRtl ? 'justify-content:flex-start;flex-direction:row-reverse' : 'justify-content:flex-end',
    'margin-top:4px',
  ].join(';');

  var btnCancel = document.createElement('button');
  btnCancel.className = 'btn btn-secondary';
  btnCancel.textContent = cancelLabel;
  btnCancel.onclick = function () { overlay.remove(); };

  var btnConfirm = document.createElement('button');
  btnConfirm.className = 'btn btn-danger';
  btnConfirm.textContent = confirmLabel;
  btnConfirm.onclick = function () { overlay.remove(); onConfirm(); };

  actions.append(btnCancel, btnConfirm);
  card.append(iconWrap, h, p, actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });

  function onKeydown(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKeydown); }
  }
  document.addEventListener('keydown', onKeydown);

  setTimeout(function () { btnCancel.focus(); }, 50);
}
