/* ==========================================================================
   ExpenseFuel — Field App · fuel.js
   Depends on (loaded before this file):
     translations.js  →  TRANSLATIONS, DEFAULT_LANG
     lists.js         →  LISTS, populateSelect()
     utils.js         →  loadFromStorage(), saveToStorage(), getSettings(),
                         generateId(), formatDate(), formatNumber(),
                         getCurrentMonth(), getCurrentDay(), getCurrentYear(),
                         showToast()
     validations.js   →  (imported for reference; validateFuelEntry() also available)
     app.js           →  (global init already done)
   ========================================================================== */

/* ==========================================================================
   STORAGE HELPERS
   ========================================================================== */

function getFuelEntries() {
  return loadFromStorage('fuel', []);
}

function saveFuelEntries(arr) {
  saveToStorage('fuel', arr);
}

function getFuelById(id) {
  return getFuelEntries().find(function (e) { return e.id === id; }) || null;
}

/* ==========================================================================
   LAST ENTRY — used for KM continuity auto-fill
   ========================================================================== */

function getLastFuelEntry() {
  const entries = getFuelEntries();
  if (!entries.length) return null;

  /* Sort newest-first by createdAt; fall back to date string if missing */
  return entries.slice().sort(function (a, b) {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  })[0];
}

/* ==========================================================================
   COMPUTED TOTALS
   ========================================================================== */

function getFuelTotals() {
  const entries = getFuelEntries();

  const newFuel = entries.reduce(function (sum, e) {
    return sum + (parseFloat(e.fuelAmount) || 0);
  }, 0);

  const karta = entries.reduce(function (sum, e) {
    return sum + (parseFloat(e.kartaAmount) || 0);
  }, 0);

  return {
    total:   newFuel + karta,
    newFuel,
    karta,
  };
}

/* ==========================================================================
   FORM READ — builds the CLAUDE.md data model object from form fields
   ========================================================================== */

function buildFuelFromForm() {
  const settings = getSettings() || {};

  const { day, month, year, date } = parseDatePickerValue(_inputVal('fieldDate'));
  const projectName = _selectVal('fieldProject')     || '';
  const siteId      = _inputVal('fieldSiteId');
  const jobCode     = _inputVal('fieldJobCode');
  const startKm     = parseFloat(_inputVal('fieldStartKm')) || 0;
  const endKm       = parseFloat(_inputVal('fieldEndKm'))   || 0;
  const fuelAmount  = parseFloat(_inputVal('fieldFuelAmount'))  || 0;
  const kartaAmount = parseFloat(_inputVal('fieldKartaAmount')) || 0;
  const area        = _inputVal('fieldArea');
  const driver      = _inputVal('fieldDriver');
  const city        = _inputVal('fieldCity');
  const coordinator = _inputVal('fieldCoordinator');
  const comment     = _inputVal('fieldComment');

  return {
    id:             generateId(),
    month,
    day,
    projectName,
    siteId,
    jobCode,
    startKm,
    endKm,
    fuelAmount,
    kartaAmount,
    area,
    driver,
    city,
    coordinator,
    comment,
    trackingNumber: settings.trackingNumber || 0,
    date,
    createdAt:      new Date().toISOString(),
  };
}

/* ==========================================================================
   FORM VALIDATION
   Returns true if all required fields pass; false otherwise.
   ========================================================================== */

function validateFuelForm() {
  _clearFuelFormErrors();

  let valid = true;

  if (!_inputVal('fieldSiteId')) {
    _showError('fieldSiteId', 'errorSiteId');
    valid = false;
  }

  const startKm = parseFloat(_inputVal('fieldStartKm'));
  if (isNaN(startKm) || startKm < 0 || _inputVal('fieldStartKm') === '') {
    _showError('fieldStartKm', 'errorStartKm');
    valid = false;
  }

  const endKm = parseFloat(_inputVal('fieldEndKm'));
  if (isNaN(endKm) || _inputVal('fieldEndKm') === '' || endKm <= startKm) {
    /* Custom message already in the HTML: "End KM must be greater than Start KM" */
    _showError('fieldEndKm', 'errorEndKm');
    valid = false;
  }

  const fuelAmount = parseFloat(_inputVal('fieldFuelAmount'));
  if (isNaN(fuelAmount) || fuelAmount <= 0) {
    _showError('fieldFuelAmount', 'errorFuelAmount');
    valid = false;
  }

  if (!valid) {
    const first = document.querySelector('.form-input.is-error, .form-select.is-error');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

/* ==========================================================================
   LIVE DISTANCE UPDATE
   Called on every input/keyup event on the KM fields.
   Updates #fieldDistance and shows a non-blocking warning if end ≤ start.
   ========================================================================== */

function liveDistanceUpdate() {
  const startRaw = _inputVal('fieldStartKm');
  const endRaw   = _inputVal('fieldEndKm');
  const start    = parseFloat(startRaw);
  const end      = parseFloat(endRaw);
  const distEl   = document.getElementById('fieldDistance');
  const errEl    = document.getElementById('errorEndKm');

  /* ---- Distance display ---- */
  if (distEl) {
    if (!isNaN(start) && !isNaN(end) && end > start) {
      distEl.value = formatNumber(end - start);
    } else {
      distEl.value = '';
    }
  }

  /* ---- Non-blocking live warning (only when both fields have values) ---- */
  if (errEl && startRaw !== '' && endRaw !== '') {
    if (!isNaN(start) && !isNaN(end) && end <= start) {
      /* Show warning text without adding .is-error to the input — non-blocking */
      errEl.classList.remove('hidden');
    } else {
      errEl.classList.add('hidden');
    }
  }
}

function autoFillStartKm() {
  const last = getLastFuelEntry();
  if (!last) return;

  const lastEndKm = parseFloat(last.endKm);
  if (isNaN(lastEndKm) || lastEndKm <= 0) return;

  const startEl  = document.getElementById('fieldStartKm');
  const banner   = document.getElementById('autoFillBanner');
  const valueEl  = document.getElementById('autoFillValue');

  if (startEl) {
    startEl.value = lastEndKm;
  }

  if (banner && valueEl) {
    valueEl.textContent = formatNumber(lastEndKm);
    banner.classList.remove('hidden');
  }

  /* Trigger live update with new startKm value (endKm is still empty) */
  liveDistanceUpdate();
}

/* ==========================================================================
   ADD — new entry → redirect to my-entries.html
   ========================================================================== */

function addFuel() {
  if (!validateFuelForm()) return;

  const entry = buildFuelFromForm();
  const list  = getFuelEntries();
  list.push(entry);
  saveFuelEntries(list);

  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  showToast((TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG]).saveSuccess, 'success');

  setTimeout(function () {
    window.location.href = 'my-entries.html';
  }, 600);
}

/* ==========================================================================
   ADD & CLEAR — save, stay on page, reset for next entry
   ========================================================================== */

function addFuelAndClear() {
  if (!validateFuelForm()) return;

  const entry = buildFuelFromForm();
  const list  = getFuelEntries();
  list.push(entry);
  saveFuelEntries(list);

  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  showToast((TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG]).saveSuccess, 'success');

  _resetFuelFormToDefaults();

  /* Auto-fill startKm from the entry we just saved */
  const startEl = document.getElementById('fieldStartKm');
  if (startEl) {
    startEl.value = entry.endKm;

    const banner  = document.getElementById('autoFillBanner');
    const valueEl = document.getElementById('autoFillValue');
    if (banner && valueEl) {
      valueEl.textContent = formatNumber(entry.endKm);
      banner.classList.remove('hidden');
    }
  }

  liveDistanceUpdate();

  const siteEl = document.getElementById('fieldSiteId');
  if (siteEl) siteEl.focus();
}

/* ==========================================================================
   UPDATE — overwrite existing entry, redirect to my-entries.html
   ========================================================================== */

function updateFuel(id) {
  if (!validateFuelForm()) return;

  const updated  = buildFuelFromForm();
  updated.id     = id;

  /* Preserve original createdAt */
  const original = getFuelById(id);
  if (original) updated.createdAt = original.createdAt;

  const list  = getFuelEntries();
  const index = list.findIndex(function (e) { return e.id === id; });

  if (index === -1) {
    showToast('Entry not found.', 'error');
    return;
  }

  list[index] = updated;
  saveFuelEntries(list);

  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  showToast((TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG]).saveSuccess, 'success');

  setTimeout(function () {
    window.location.href = 'my-entries.html';
  }, 600);
}

/* ==========================================================================
   DELETE — confirm modal → remove from array → toast → redirect/re-render
   ========================================================================== */

function deleteFuel(id) {
  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  const t    = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];

  _showFuelDeleteModal(
    lang === 'ar' ? 'حذف سجل الوقود؟' : 'Delete Fuel Entry?',
    t.deleteConfirm,
    t.cancel || 'Cancel',
    t.delete || 'Delete',
    function () {
      const updated = getFuelEntries().filter(function (e) { return e.id !== id; });
      saveFuelEntries(updated);
      showToast(t.deleteSuccess, 'success');

      const page = window.location.pathname.split('/').pop();
      if (page === 'my-entries.html') {
        window.dispatchEvent(new CustomEvent('fuelUpdated'));
      } else {
        setTimeout(function () {
          window.location.href = 'my-entries.html';
        }, 400);
      }
    }
  );
}

/* ==========================================================================
   DISPATCHERS — called by onclick in add-fuel.html
   ========================================================================== */

function saveFuel() {
  const editId = _inputVal('editEntryId');
  if (editId) {
    updateFuel(editId);
  } else {
    addFuel();
  }
}

function saveAndAddAnotherFuel() {
  addFuelAndClear();
}

/* ==========================================================================
   LOAD FOR EDIT
   ========================================================================== */

function loadFuelForEdit(id) {
  const entry = getFuelById(id);
  if (!entry) {
    showToast('Fuel entry not found.', 'error');
    setTimeout(function () { window.location.href = 'my-entries.html'; }, 800);
    return;
  }

  /* ---- Populate all form fields ---- */
  _setInput('fieldDate',        toDatePickerValue(entry.date));
  _setSelect('fieldProject',    entry.projectName);
  _setInput('fieldSiteId',      entry.siteId);
  _setInput('fieldJobCode',     entry.jobCode);
  _setInput('fieldStartKm',     entry.startKm);
  _setInput('fieldEndKm',       entry.endKm);
  _setInput('fieldFuelAmount',  entry.fuelAmount);
  _setInput('fieldKartaAmount', entry.kartaAmount);
  _setInput('fieldArea',        entry.area);
  _setInput('fieldDriver',      entry.driver);
  _setInput('fieldCity',        entry.city);
  _setInput('fieldCoordinator', entry.coordinator);
  _setInput('fieldComment',     entry.comment || '');
  _setInput('editEntryId',      entry.id);

  /* Compute and show distance from stored values */
  liveDistanceUpdate();

  /* ---- Switch UI to edit mode ---- */
  _activateFuelEditModeUI();
}

/* ==========================================================================
   DOM READY — runs only on add-fuel.html
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  const page = window.location.pathname.split('/').pop();
  if (page !== 'add-fuel.html') return;

  const settings = getSettings() || {};

  /* ---- Populate selects ---- */
  populateSelect(document.getElementById('fieldProject'),
                 'projects', settings.defaultProject || '');

  /* ---- Default field values ---- */
  _setInput('fieldDate',        getTodayPickerValue());
  _setInput('fieldDriver',      settings.defaultDriver      || '');
  _setInput('fieldCoordinator', settings.defaultCoordinator || '');
  _setInput('fieldKartaAmount', 0);

  /* ---- Live distance listeners ---- */
  ['fieldStartKm', 'fieldEndKm'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input',  liveDistanceUpdate);
      el.addEventListener('keyup',  liveDistanceUpdate);
    }
  });

  /* ---- Check for edit mode ---- */
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');

  if (editId) {
    /* Edit mode: load existing entry — skip auto-fill */
    loadFuelForEdit(editId);
  } else {
    /* Add mode: auto-fill startKm from last entry */
    autoFillStartKm();
  }

  /* ---- Wire action buttons ---- */
  _wireFuelButton('btnSave',       saveFuel);
  _wireFuelButton('btnSaveAndAdd', saveAndAddAnotherFuel);
  _wireFuelButton('btnCancel', function () {
    window.location.href = 'index.html';
  });

  /* ---- Clear field error as the user corrects each field ---- */
  ['fieldSiteId', 'fieldJobCode', 'fieldStartKm', 'fieldEndKm', 'fieldFuelAmount'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { _clearFuelFieldError(id); });
  });
  ['fieldProject'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', function () { _clearFuelFieldError(id); });
  });
});

/* ==========================================================================
   PRIVATE HELPERS
   ========================================================================== */

/* ---- Form field readers -------------------------------------------------- */

function _inputVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function _selectVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

/* ---- Form field setters -------------------------------------------------- */

function _setInput(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.value = value;
}

function _setSelect(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.value = value;
}

/* ---- Error state --------------------------------------------------------- */

function _showError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.add('is-error');
  if (error) error.classList.remove('hidden');
}

function _clearFuelFormErrors() {
  document.querySelectorAll('.form-input.is-error, .form-select.is-error').forEach(
    function (el) { el.classList.remove('is-error'); }
  );
  document.querySelectorAll('.form-error').forEach(
    function (el) { el.classList.add('hidden'); }
  );
}

function _clearFuelFieldError(inputId) {
  var input = document.getElementById(inputId);
  if (input) input.classList.remove('is-error');
  var errorId = 'error' + inputId.charAt(0).toUpperCase() + inputId.slice(1).replace('field', '');
  var error   = document.getElementById(errorId);
  if (error) error.classList.add('hidden');
}

/* ---- Reset form to add-mode defaults ------------------------------------ */

function _resetFuelFormToDefaults() {
  const settings = getSettings() || {};

  /* Clear trip-specific fields */
  _setInput('fieldSiteId',      '');
  _setInput('fieldJobCode',     '');
  _setInput('fieldEndKm',       '');
  _setInput('fieldFuelAmount',  '');
  _setInput('fieldArea',        '');
  _setInput('fieldCity',        '');

  /* Reset to defaults */
  _setInput('fieldDate',        getTodayPickerValue());
  _setSelect('fieldProject',    settings.defaultProject    || '');
  _setInput('fieldDriver',      settings.defaultDriver     || '');
  _setInput('fieldCoordinator', settings.defaultCoordinator || '');
  _setInput('fieldKartaAmount', 0);
  _setInput('fieldComment',     '');
  _setInput('fieldDistance',    '');

  /* NOTE: fieldStartKm is intentionally NOT cleared here —
     addFuelAndClear() sets it to the just-saved entry's endKm for continuity. */

  /* Clear editEntryId so next save goes to addFuel() */
  _setInput('editEntryId', '');

  _clearFuelFormErrors();
}

/* ---- Edit mode UI -------------------------------------------------------- */

function _activateFuelEditModeUI() {
  const lang  = localStorage.getItem('lang') || DEFAULT_LANG;
  const isAr  = lang === 'ar';
  const label = isAr ? 'تعديل وقود' : 'Edit Fuel';

  document.title = label + ' — ExpenseFuel Field';

  _setText('navTitle',    label);
  _setText('cardTitle',   label);
  _setText('pageHeading', label);

  const badge = document.getElementById('editBadge');
  if (badge) badge.classList.remove('hidden');

  _setText('btnSaveLabel', isAr ? 'تحديث الوقود' : 'Update Entry');

  const btnSaveAdd = document.getElementById('btnSaveAndAdd');
  if (btnSaveAdd) btnSaveAdd.classList.add('hidden');

  /* Hide auto-fill banner in edit mode */
  const banner = document.getElementById('autoFillBanner');
  if (banner) banner.classList.add('hidden');
}

/* ---- Generic helpers ----------------------------------------------------- */

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _wireFuelButton(id, fn) {
  const el = document.getElementById(id);
  if (el && !el._fuelWired) {
    el.addEventListener('click', fn);
    el._fuelWired = true;
  }
}

/* ---- Delete confirmation modal ------------------------------------------ */

function _showFuelDeleteModal(title, message, cancelLabel, confirmLabel, onConfirm) {
  const existing = document.getElementById('_fuelDeleteModal');
  if (existing) existing.remove();

  const lang  = localStorage.getItem('lang') || DEFAULT_LANG;
  const isRtl = lang === 'ar';

  const overlay = document.createElement('div');
  overlay.id = '_fuelDeleteModal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', '_fuelModalTitle');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9500',
    'background:rgba(15,23,42,0.55)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'padding:16px',
  ].join(';');

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

  const iconWrap = document.createElement('div');
  iconWrap.style.cssText = [
    'width:44px', 'height:44px', 'border-radius:50%',
    'background:#fef2f2', 'color:#dc2626',
    'display:flex', 'align-items:center', 'justify-content:center',
    'flex-shrink:0',
  ].join(';');
  iconWrap.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>';

  const h = document.createElement('h3');
  h.id = '_fuelModalTitle';
  h.style.cssText = 'font-size:17px;font-weight:700;color:#0f172a;margin:0;line-height:1.3';
  h.textContent = title;

  const p = document.createElement('p');
  p.style.cssText = 'font-size:14px;color:#64748b;margin:0;line-height:1.6';
  p.textContent = message;

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
  btnConfirm.onclick = function () { overlay.remove(); onConfirm(); };

  actions.append(btnCancel, btnConfirm);
  card.append(iconWrap, h, p, actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });

  function onKey(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
  }
  document.addEventListener('keydown', onKey);

  setTimeout(function () { btnCancel.focus(); }, 50);
}
