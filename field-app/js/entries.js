/* ==========================================================================
   ExpenseFuel — Field App · entries.js
   Depends on: translations.js, lists.js, utils.js, expenses.js, fuel.js
   ========================================================================== */

/* ==========================================================================
   MODULE STATE
   ========================================================================== */

let activeTab = 'expenses';

let filters = {
  month:   '',
  project: '',
  search:  '',
};

/* ==========================================================================
   RENDER — EXPENSES TABLE
   ========================================================================== */

function renderExpenseTable(entries) {
  entries = entries || getFilteredExpenses();

  const tbody  = document.getElementById('expensesTableBody');
  const empty  = document.getElementById('emptyExpenses');
  const wrapper = document.getElementById('expensesTableWrapper');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (entries.length === 0) {
    if (wrapper) wrapper.classList.add('hidden');
    if (empty)   empty.classList.remove('hidden');
    _updateExpenseSummary([], getExpenses().length);
    _updateResultsLabel('expense', 0, getExpenses().length);
    return;
  }

  if (wrapper) wrapper.classList.remove('hidden');
  if (empty)   empty.classList.add('hidden');

  entries.forEach(function (entry) {
    tbody.appendChild(_buildExpenseRow(entry));
  });

  _updateExpenseSummary(entries, getExpenses().length);
  _updateResultsLabel('expense', entries.length, getExpenses().length);
}

/* Alias — called by the 'expensesUpdated' custom event with no arguments */
function renderExpensesTable() {
  renderExpenseTable(getFilteredExpenses());
}

/* ==========================================================================
   RENDER — FUEL TABLE
   ========================================================================== */

function renderFuelTable(entries) {
  entries = entries || getFilteredFuel();

  const tbody  = document.getElementById('fuelTableBody');
  const empty  = document.getElementById('emptyFuel');
  const wrapper = document.getElementById('fuelTableWrapper');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (entries.length === 0) {
    if (wrapper) wrapper.classList.add('hidden');
    if (empty)   empty.classList.remove('hidden');
    _updateFuelSummary([], getFuelEntries().length);
    _updateResultsLabel('fuel', 0, getFuelEntries().length);
    return;
  }

  if (wrapper) wrapper.classList.remove('hidden');
  if (empty)   empty.classList.add('hidden');

  entries.forEach(function (entry) {
    tbody.appendChild(_buildFuelRow(entry));
  });

  _updateFuelSummary(entries, getFuelEntries().length);
  _updateResultsLabel('fuel', entries.length, getFuelEntries().length);
}

/* ==========================================================================
   FILTERED DATA
   ========================================================================== */

function getFilteredExpenses() {
  let list = getExpenses();

  if (filters.month) {
    list = list.filter(function (e) { return e.month === filters.month; });
  }

  if (filters.project) {
    list = list.filter(function (e) { return e.projectName === filters.project; });
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(function (e) {
      return (
        (e.itemDescription || '').toLowerCase().includes(q) ||
        (e.siteId          || '').toLowerCase().includes(q) ||
        (e.category        || '').toLowerCase().includes(q) ||
        (e.jobCode         || '').toLowerCase().includes(q)
      );
    });
  }

  return list.slice().sort(function (a, b) {
    return _dateSort(b.date) - _dateSort(a.date);
  });
}

function getFilteredFuel() {
  let list = getFuelEntries();

  if (filters.month) {
    list = list.filter(function (e) { return e.month === filters.month; });
  }

  if (filters.project) {
    list = list.filter(function (e) { return e.projectName === filters.project; });
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(function (e) {
      return (
        (e.siteId  || '').toLowerCase().includes(q) ||
        (e.area    || '').toLowerCase().includes(q) ||
        (e.driver  || '').toLowerCase().includes(q) ||
        (e.jobCode || '').toLowerCase().includes(q)
      );
    });
  }

  return list.slice().sort(function (a, b) {
    return _dateSort(b.date) - _dateSort(a.date);
  });
}

/* ==========================================================================
   INLINE DELETE CONFIRM — replaces the row with a confirm bar
   ========================================================================== */

function handleDelete(type, id) {
  /* Find the row by data-type + data-id attributes */
  const row = document.querySelector(
    'tr[data-type="' + type + '"][data-id="' + id + '"]'
  );
  if (!row) return;

  const colSpan = type === 'expense' ? 7 : 9;
  const lang    = localStorage.getItem('lang') || DEFAULT_LANG;
  const t       = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
  const isRtl   = lang === 'ar';

  const confirmRow = document.createElement('tr');
  confirmRow.style.background = 'var(--color-danger-bg)';
  confirmRow.setAttribute('role', 'alert');

  const td = document.createElement('td');
  td.colSpan = colSpan;
  td.style.cssText = 'padding:10px 16px';

  const inner = document.createElement('div');
  inner.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:10px',
    'flex-wrap:wrap',
    isRtl ? 'flex-direction:row-reverse' : '',
  ].filter(Boolean).join(';');

  /* Warning icon */
  const icon = document.createElement('span');
  icon.style.color = 'var(--color-danger)';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>';

  /* Message */
  const msg = document.createElement('span');
  msg.style.cssText = 'font-size:13px;font-weight:600;color:var(--color-danger);flex:1';
  msg.textContent = lang === 'ar'
    ? 'هل تريد حذف هذا السجل؟'
    : 'Delete this entry?';

  /* Confirm button */
  const btnYes = document.createElement('button');
  btnYes.className = 'btn btn-danger btn-sm';
  btnYes.textContent = t.delete || 'Delete';
  btnYes.addEventListener('click', function () {
    if (type === 'expense') {
      const list    = getExpenses();
      const updated = list.filter(function (e) { return e.id !== id; });
      saveExpenses(updated);
      showToast(t.deleteSuccess, 'success');
      renderExpenseTable(getFilteredExpenses());
    } else {
      const list    = getFuelEntries();
      const updated = list.filter(function (e) { return e.id !== id; });
      saveFuelEntries(updated);
      showToast(t.deleteSuccess, 'success');
      renderFuelTable(getFilteredFuel());
    }
  });

  /* Cancel button */
  const btnNo = document.createElement('button');
  btnNo.className = 'btn btn-secondary btn-sm';
  btnNo.textContent = t.cancel || 'Cancel';
  btnNo.addEventListener('click', function () {
    /* Restore by re-rendering the active table */
    if (type === 'expense') {
      renderExpenseTable(getFilteredExpenses());
    } else {
      renderFuelTable(getFilteredFuel());
    }
  });

  inner.append(icon, msg, btnYes, btnNo);
  td.appendChild(inner);
  confirmRow.appendChild(td);
  row.parentNode.replaceChild(confirmRow, row);
  btnYes.focus();
}

/* ==========================================================================
   TAB SWITCHING
   NOTE: my-entries.html's inline switchTab() runs instead of this one
   (loaded after entries.js). This definition exists for correctness and
   remains active if no inline override is present.
   ========================================================================== */

function switchTab(tab) {
  activeTab = tab;
  const isExpenses = tab === 'expenses';

  /* Tab button styles */
  const tabExp  = document.getElementById('tabExpenses');
  const tabFuel = document.getElementById('tabFuel');
  if (tabExp)  { tabExp.classList.toggle('active', isExpenses);  tabExp.setAttribute('aria-selected', isExpenses); }
  if (tabFuel) { tabFuel.classList.toggle('active', !isExpenses); tabFuel.setAttribute('aria-selected', !isExpenses); }

  /* Panel visibility */
  _toggleEl('panelExpenses', isExpenses);
  _toggleEl('panelFuel',    !isExpenses);

  /* Summary bars */
  _toggleEl('summaryExpenses', isExpenses);
  _toggleEl('summaryFuel',    !isExpenses);

  applyFilters();
}

/* ==========================================================================
   FILTERS
   ========================================================================== */

function applyFilters() {
  /* Read filter values from DOM */
  filters.month   = _elVal('filterMonth');
  filters.project = _elVal('filterProject');
  filters.search  = _elVal('filterSearch');

  /* Determine which panel is visible by checking DOM (avoids state conflicts
     with the HTML inline switchTab which manages _activeTab separately) */
  const expPanel = document.getElementById('panelExpenses');
  const expVisible = expPanel && !expPanel.classList.contains('hidden');

  if (expVisible) {
    renderExpenseTable(getFilteredExpenses());
  } else {
    renderFuelTable(getFilteredFuel());
  }
}

function clearFilters() {
  filters = { month: '', project: '', search: '' };

  const m = document.getElementById('filterMonth');
  const p = document.getElementById('filterProject');
  const s = document.getElementById('filterSearch');
  if (m) m.value = '';
  if (p) p.value = '';
  if (s) s.value = '';

  applyFilters();
}

/* ==========================================================================
   INIT — called from my-entries.html DOMContentLoaded
   ========================================================================== */

function initEntries() {
  /* Initial render of both tables (fuel renders into hidden panel — harmless) */
  renderExpenseTable(getFilteredExpenses());
  renderFuelTable(getFilteredFuel());

  /* Update tab count badges */
  _updateTabCounts();

  /* Wire filter controls (supplements HTML onchange/oninput attrs) */
  ['filterMonth', 'filterProject'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el && !el._entriesWired) {
      el.addEventListener('change', applyFilters);
      el._entriesWired = true;
    }
  });

  const searchEl = document.getElementById('filterSearch');
  if (searchEl && !searchEl._entriesWired) {
    searchEl.addEventListener('input', applyFilters);
    searchEl._entriesWired = true;
  }
}

/* Also register DOMContentLoaded so entries.js works standalone */
document.addEventListener('DOMContentLoaded', function () {
  const page = window.location.pathname.split('/').pop();
  if (page !== 'my-entries.html') return;
  initEntries();
});

/* ==========================================================================
   PRIVATE — ROW BUILDERS
   ========================================================================== */

function _buildExpenseRow(entry) {
  const tr = document.createElement('tr');
  tr.setAttribute('data-type', 'expense');
  tr.setAttribute('data-id',   entry.id);

  _addCell(tr, entry.date || '—',         'ltr-field');
  _addCell(tr, entry.projectName || '—');
  _addCell(tr, entry.siteId || '—',       'ltr-field');
  _addCell(tr, entry.category || '—');

  /* Description — truncated to 30 chars */
  const descCell = document.createElement('td');
  descCell.className = 'cell-desc';
  const raw = entry.itemDescription || '—';
  descCell.textContent = raw.length > 30 ? raw.slice(0, 30) + '…' : raw;
  if (raw.length > 30) descCell.title = raw; /* full text on hover */
  tr.appendChild(descCell);

  _addCell(tr, formatCurrency(entry.amount), 'cell-amount');
  tr.appendChild(_buildActionCell('expense', entry));

  return tr;
}

function _buildFuelRow(entry) {
  const tr = document.createElement('tr');
  tr.setAttribute('data-type', 'fuel');
  tr.setAttribute('data-id',   entry.id);

  const dist = calculateDistance(entry.startKm, entry.endKm);

  _addCell(tr, entry.date       || '—',               'ltr-field');
  _addCell(tr, entry.projectName || '—');
  _addCell(tr, entry.siteId     || '—',               'ltr-field');
  _addCell(tr, formatNumber(entry.startKm) || '—',    'cell-km');
  _addCell(tr, formatNumber(entry.endKm)   || '—',    'cell-km');
  _addCell(tr, dist > 0 ? formatNumber(dist) + ' km' : '—', 'cell-km');
  _addCell(tr, formatCurrency(entry.fuelAmount),       'cell-amount');
  _addCell(tr, formatCurrency(entry.kartaAmount || 0), 'cell-amount');
  tr.appendChild(_buildActionCell('fuel', entry));

  return tr;
}

function _buildActionCell(type, entry) {
  const td = document.createElement('td');

  const wrap = document.createElement('div');
  wrap.className = 'table-actions';

  /* Edit — anchor navigates to form with ?id= */
  const editHref = (type === 'expense' ? 'add-expense' : 'add-fuel') + '.html?id=' + entry.id;
  const editBtn  = document.createElement('a');
  editBtn.href       = editHref;
  editBtn.className  = 'action-btn action-btn-edit';
  editBtn.setAttribute('aria-label', 'Edit entry');
  editBtn.title      = 'Edit';
  editBtn.innerHTML  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';

  /* Delete — inline confirm */
  const delBtn = document.createElement('button');
  delBtn.type      = 'button';
  delBtn.className = 'action-btn action-btn-delete';
  delBtn.setAttribute('aria-label', 'Delete entry');
  delBtn.title     = 'Delete';
  delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>';

  const capturedId   = entry.id;
  const capturedType = type;
  delBtn.addEventListener('click', function () {
    handleDelete(capturedType, capturedId);
  });

  wrap.append(editBtn, delBtn);
  td.appendChild(wrap);
  return td;
}

/* ==========================================================================
   PRIVATE — SUMMARY BAR UPDATES
   ========================================================================== */

function _updateExpenseSummary(filtered, total) {
  const sum = filtered.reduce(function (s, e) {
    return s + (parseFloat(e.amount) || 0);
  }, 0);

  _setText('expenseTotal',      formatCurrency(sum));
  _setText('expenseEntryCount', String(filtered.length));
  _setText('countExpenses',     String(total));
}

function _updateFuelSummary(filtered, total) {
  const fuelSum  = filtered.reduce(function (s, e) { return s + (parseFloat(e.fuelAmount)  || 0); }, 0);
  const kartaSum = filtered.reduce(function (s, e) { return s + (parseFloat(e.kartaAmount) || 0); }, 0);

  _setText('fuelTotalFuel',  formatCurrency(fuelSum));
  _setText('fuelTotalKarta', formatCurrency(kartaSum));
  _setText('fuelEntryCount', String(filtered.length));
  _setText('countFuel',      String(total));
}

function _updateTabCounts() {
  _setText('countExpenses', String(getExpenses().length));
  _setText('countFuel',     String(getFuelEntries().length));
}

/* ==========================================================================
   PRIVATE — RESULTS LABEL (shown when filter reduces entry count)
   ========================================================================== */

function _updateResultsLabel(type, filteredCount, totalCount) {
  const labelId = type === 'expense' ? 'expensesResultsLabel' : 'fuelResultsLabel';
  const label   = document.getElementById(labelId);
  if (!label) return;

  const hasFilter = filters.month || filters.project || filters.search;

  if (hasFilter && filteredCount !== totalCount) {
    const lang = localStorage.getItem('lang') || DEFAULT_LANG;
    label.textContent = lang === 'ar'
      ? 'يُعرض ' + filteredCount + ' من أصل ' + totalCount
      : 'Showing ' + filteredCount + ' of ' + totalCount + ' entries';
    label.classList.remove('hidden');
  } else {
    label.classList.add('hidden');
  }
}

/* ==========================================================================
   PRIVATE — HELPERS
   ========================================================================== */

/* Parse "16-Apr-2026" to timestamp for sorting */
function _dateSort(dateStr) {
  const MONTHS = {
    Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,
    Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
  };
  if (!dateStr) return 0;
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return 0;
  const d = parseInt(parts[0], 10);
  const m = MONTHS[parts[1]];
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || m === undefined || isNaN(y)) return 0;
  return new Date(y, m, d).getTime();
}

function _addCell(tr, text, cssClass) {
  const td = document.createElement('td');
  td.textContent = text;
  if (cssClass) td.className = cssClass;
  tr.appendChild(td);
  return td;
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _elVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function _toggleEl(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden', !show);
}
