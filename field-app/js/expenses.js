/* ==========================================================================
   ExpenseFuel — Field App · expenses.js
   Depends on (loaded before this file):
     translations.js  →  TRANSLATIONS, DEFAULT_LANG
     lists.js         →  LISTS, populateSelect()
     utils.js         →  loadFromStorage(), saveToStorage(), getSettings(),
                         generateId(), formatDate(), getCurrentMonth(),
                         getCurrentDay(), getCurrentYear(), showToast(),
                         formatCurrency()
     validations.js   →  validateExpenseEntry()
     app.js           →  (global init already done)
   ========================================================================== */

/* ==========================================================================
   STORAGE HELPERS
   ========================================================================== */

function getExpenses() {
  return loadFromStorage('expenses', []);
}

function saveExpenses(arr) {
  saveToStorage('expenses', arr);
}

function getExpenseById(id) {
  return getExpenses().find(function (e) { return e.id === id; }) || null;
}

/* ==========================================================================
   COMPUTED TOTALS
   ========================================================================== */

function getTotalExpenses() {
  return getExpenses().reduce(function (sum, e) {
    return sum + (parseFloat(e.amount) || 0);
  }, 0);
}

/* ==========================================================================
   FORM READ — builds the CLAUDE.md data model object from form fields
   ========================================================================== */

function buildExpenseFromForm() {
  const settings = getSettings() || {};

  const { day, month, year, date } = parseDatePickerValue(_inputVal('fieldDate'));
  const projectName = _selectVal('fieldProject')     || '';
  const siteId      = _inputVal('fieldSiteId');
  const jobCode     = _inputVal('fieldJobCode');
  const category    = _selectVal('fieldCategory');
  const subCategory = _selectVal('fieldSubCategory');
  const itemDescription = _textareaVal('fieldDescription');
  const amount      = parseFloat(_inputVal('fieldAmount')) || 0;
  const comment     = _inputVal('fieldComment');
  const coordinator = _inputVal('fieldCoordinator');

  return {
    id:              generateId(),
    month,
    day,
    projectName,
    siteId,
    jobCode,
    category,
    subCategory,
    itemDescription,
    amount,
    comment,
    coordinator,
    trackingNumber:  settings.trackingNumber || 0,
    date,
    createdAt:       new Date().toISOString(),
  };
}

/* ==========================================================================
   FORM VALIDATION — marks fields red, shows inline errors
   Returns true if valid, false if any required field fails.
   ========================================================================== */

function validateExpenseForm() {
  _clearFormErrors();

  let valid = true;

  if (!_inputVal('fieldSiteId')) {
    _showError('fieldSiteId', 'errorSiteId');
    valid = false;
  }

  if (!_selectVal('fieldCategory')) {
    _showError('fieldCategory', 'errorCategory');
    valid = false;
  }

  if (!_selectVal('fieldSubCategory')) {
    _showError('fieldSubCategory', 'errorSubCategory');
    valid = false;
  }

  const amount = parseFloat(_inputVal('fieldAmount'));
  if (isNaN(amount) || amount <= 0) {
    _showError('fieldAmount', 'errorAmount');
    valid = false;
  }

  if (!valid) {
    /* Scroll to the first red field */
    const first = document.querySelector('.form-input.is-error, .form-select.is-error');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

/* ==========================================================================
   ADD — save new entry, redirect to my-entries.html
   ========================================================================== */

function addExpense() {
  if (!validateExpenseForm()) return;

  const entry = buildExpenseFromForm();
  const list  = getExpenses();
  list.push(entry);
  saveExpenses(list);

  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  showToast((TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG]).saveSuccess, 'success');

  /* Small delay so the toast is visible before navigation */
  setTimeout(function () {
    window.location.href = 'my-entries.html';
  }, 600);
}

/* ==========================================================================
   ADD & CLEAR — save, stay on page, reset to defaults for next entry
   ========================================================================== */

function addExpenseAndClear() {
  if (!validateExpenseForm()) return;

  const entry = buildExpenseFromForm();
  const list  = getExpenses();
  list.push(entry);
  saveExpenses(list);

  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  showToast((TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG]).saveSuccess, 'success');

  _resetFormToDefaults();
}

/* ==========================================================================
   UPDATE — overwrite existing entry, redirect to my-entries.html
   ========================================================================== */

function updateExpense(id) {
  if (!validateExpenseForm()) return;

  const updated = buildExpenseFromForm();
  /* Keep the original id — buildExpenseFromForm generates a new one */
  updated.id = id;
  /* Preserve the original createdAt timestamp */
  const original = getExpenseById(id);
  if (original) updated.createdAt = original.createdAt;

  const list    = getExpenses();
  const index   = list.findIndex(function (e) { return e.id === id; });

  if (index === -1) {
    const lang = localStorage.getItem('lang') || DEFAULT_LANG;
    showToast('Entry not found.', 'error');
    return;
  }

  list[index] = updated;
  saveExpenses(list);

  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  showToast((TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG]).saveSuccess, 'success');

  setTimeout(function () {
    window.location.href = 'my-entries.html';
  }, 600);
}

/* ==========================================================================
   DELETE — custom confirm modal, then remove from array
   ========================================================================== */

function deleteExpense(id) {
  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  const t    = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];

  _showDeleteModal(
    lang === 'ar' ? 'حذف المصروف؟' : 'Delete Expense?',
    t.deleteConfirm,
    t.cancel  || 'Cancel',
    t.delete  || 'Delete',
    function () {
      const list    = getExpenses();
      const updated = list.filter(function (e) { return e.id !== id; });
      saveExpenses(updated);
      showToast(t.deleteSuccess, 'success');

      /* If on my-entries.html, reload; if elsewhere, redirect */
      const page = window.location.pathname.split('/').pop();
      if (page === 'my-entries.html') {
        /* Let entries.js re-render — dispatch a custom event */
        window.dispatchEvent(new CustomEvent('expensesUpdated'));
      } else {
        setTimeout(function () {
          window.location.href = 'my-entries.html';
        }, 400);
      }
    }
  );
}

/* ==========================================================================
   DISPATCHER — called by onclick="saveExpense()" in add-expense.html
   Routes to addExpense() or updateExpense() depending on edit mode.
   ========================================================================== */

function saveExpense() {
  const editId = _inputVal('editEntryId');
  if (editId) {
    updateExpense(editId);
  } else {
    addExpense();
  }
}

function saveAndAddAnother() {
  /* Only valid in add mode — button is hidden in edit mode */
  addExpenseAndClear();
}

/* ==========================================================================
   LOAD FOR EDIT — populate form from existing entry + switch UI to edit mode
   ========================================================================== */

function loadExpenseForEdit(id) {
  const entry = getExpenseById(id);
  if (!entry) {
    showToast('Entry not found.', 'error');
    setTimeout(function () { window.location.href = 'my-entries.html'; }, 800);
    return;
  }

  /* ---- Populate form fields ---- */
  _setInput('fieldDate',         toDatePickerValue(entry.date));
  _setSelect('fieldProject',     entry.projectName);
  _setInput('fieldSiteId',       entry.siteId);
  _setInput('fieldJobCode',      entry.jobCode);
  _setSelect('fieldCategory',    entry.category);
  _setSelect('fieldSubCategory', entry.subCategory);
  _setTextarea('fieldDescription', entry.itemDescription);
  _setInput('fieldAmount',       entry.amount);
  _setInput('fieldComment',      entry.comment);
  _setInput('fieldCoordinator',  entry.coordinator);

  /* ---- Store the id so saveExpense() routes to updateExpense() ---- */
  _setInput('editEntryId', entry.id);

  /* ---- Switch UI to edit mode ---- */
  _activateEditModeUI();
}

/* ==========================================================================
   DOM READY — runs only on add-expense.html
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  const page = window.location.pathname.split('/').pop();
  if (page !== 'add-expense.html') return;

  const settings = getSettings() || {};

  /* ---- Populate all selects ---- */
  populateSelect(document.getElementById('fieldProject'),
                 'projects', settings.defaultProject || '');

  populateSelect(document.getElementById('fieldCategory'),
                 'categories');

  populateSelect(document.getElementById('fieldSubCategory'),
                 'subCategories');

  /* ---- Set default field values ---- */
  _setInput('fieldDate',        getTodayPickerValue());
  _setInput('fieldCoordinator', settings.defaultCoordinator || '');

  /* ---- Check for edit mode ---- */
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');
  if (editId) {
    loadExpenseForEdit(editId);
  }

  /* ---- Wire action buttons (supplements onclick attrs in HTML) ---- */
  _wireButton('btnSave',       saveExpense);
  _wireButton('btnSaveAndAdd', saveAndAddAnother);
  _wireButton('btnCancel',     function () {
    window.location.href = 'index.html';
  });

  /* ---- Clear field error as the user corrects each field ---- */
  ['fieldSiteId', 'fieldJobCode', 'fieldAmount'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function () { _clearFieldError(id); });
  });
  ['fieldCategory', 'fieldSubCategory'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', function () { _clearFieldError(id); });
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

function _textareaVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
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

function _setTextarea(id, value) {
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

function _clearFormErrors() {
  document.querySelectorAll('.form-input.is-error, .form-select.is-error').forEach(
    function (el) { el.classList.remove('is-error'); }
  );
  document.querySelectorAll('.form-error').forEach(
    function (el) { el.classList.add('hidden'); }
  );
}

function _clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  if (input) input.classList.remove('is-error');
  /* Find the paired error span (id = 'error' + PascalCase of inputId) */
  const errorId = 'error' + inputId.charAt(0).toUpperCase() + inputId.slice(1).replace('field', '');
  const error   = document.getElementById(errorId);
  if (error) error.classList.add('hidden');
}

/* ---- Reset form to add-mode defaults ------------------------------------ */

function _resetFormToDefaults() {
  const settings = getSettings() || {};

  /* Clear freetext fields */
  _setInput('fieldSiteId',      '');
  _setInput('fieldJobCode',     '');
  _setInput('fieldAmount',      '');
  _setInput('fieldComment',     '');
  _setTextarea('fieldDescription', '');

  /* Reset to defaults */
  _setInput('fieldDate', getTodayPickerValue());
  _setInput('fieldCoordinator', settings.defaultCoordinator || '');

  /* Re-select defaults on selects */
  _setSelect('fieldProject',    settings.defaultProject || '');
  _setSelect('fieldCategory',   '');
  _setSelect('fieldSubCategory', '');

  /* Clear hidden edit id */
  _setInput('editEntryId', '');

  /* Clear errors */
  _clearFormErrors();

  /* Focus Site ID for quick re-entry */
  const siteEl = document.getElementById('fieldSiteId');
  if (siteEl) siteEl.focus();
}

/* ---- Edit mode UI -------------------------------------------------------- */

function _activateEditModeUI() {
  const lang = localStorage.getItem('lang') || DEFAULT_LANG;
  const t    = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
  const isAr = lang === 'ar';

  const editLabel = isAr ? 'تعديل مصروف' : 'Edit Expense';

  document.title = editLabel + ' — ExpenseFuel Field';

  _setText('navTitle',    editLabel);
  _setText('cardTitle',   editLabel);
  _setText('pageHeading', editLabel);

  /* Show edit badge */
  const badge = document.getElementById('editBadge');
  if (badge) badge.classList.remove('hidden');

  /* Update save button label */
  _setText('btnSaveLabel', isAr ? 'تحديث المصروف' : 'Update Entry');

  /* Hide Save & Add Another */
  const btnSaveAdd = document.getElementById('btnSaveAndAdd');
  if (btnSaveAdd) btnSaveAdd.classList.add('hidden');
}

/* ---- Generic helpers ----------------------------------------------------- */

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _wireButton(id, fn) {
  const el = document.getElementById(id);
  /* Guard: only add listener if element exists and handler not already wired
     via onclick attribute (onclick fires before addEventListener, both run, but
     this double-wiring is harmless for all action functions here). */
  if (el && !el._expensesWired) {
    el.addEventListener('click', fn);
    el._expensesWired = true;
  }
}

/* ---- Delete confirmation modal ------------------------------------------ */

function _showDeleteModal(title, message, cancelLabel, confirmLabel, onConfirm) {
  const existing = document.getElementById('_expenseDeleteModal');
  if (existing) existing.remove();

  const lang  = localStorage.getItem('lang') || DEFAULT_LANG;
  const isRtl = lang === 'ar';

  const overlay = document.createElement('div');
  overlay.id = '_expenseDeleteModal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', '_expModalTitle');
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

  /* Danger icon */
  const iconWrap = document.createElement('div');
  iconWrap.style.cssText = [
    'width:44px', 'height:44px', 'border-radius:50%',
    'background:#fef2f2', 'color:#dc2626',
    'display:flex', 'align-items:center', 'justify-content:center',
    'flex-shrink:0',
  ].join(';');
  iconWrap.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>';

  const h = document.createElement('h3');
  h.id = '_expModalTitle';
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
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); }
  }
  document.addEventListener('keydown', onKey);

  setTimeout(function () { btnCancel.focus(); }, 50);
}
