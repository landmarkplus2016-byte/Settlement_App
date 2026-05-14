/* ==========================================================================
   ExpenseFuel Tracker — Sample Data
   Plain global — no ES module exports.
   Depends on: utils.js (loadFromStorage, saveToStorage, showToast, generateId)

   Usage:
     1. Include this script AFTER utils.js in field-app/index.html and
        coordinator-app/index.html.
     2. Call initSampleDataBtn() from the dashboard's DOMContentLoaded handler
        (or at the bottom of the inline dashboard script).
   ========================================================================== */

/* ==========================================================================
   SAMPLE EXPENSE DATA — 5 entries, April 2026
   Varies: project, category, site, amount, day.
   ========================================================================== */

const SAMPLE_DATA = {

  expenses: [

    {
      id:              'smp-exp-0001-0000-0000-000000000001',
      month:           'Apr',
      day:             3,
      projectName:     'roll out',
      siteId:          'D0510',
      jobCode:         'EM042',
      category:        'Labor',
      subCategory:     'Labor',
      itemDescription: 'تركيب براكت ولينك وتوصيلات',
      amount:          350,
      comment:         '',
      coordinator:     'eslam mussa',
      trackingNumber:  13,
      date:            '3-Apr-2026',
      createdAt:       '2026-04-03T09:15:00.000Z',
    },

    {
      id:              'smp-exp-0002-0000-0000-000000000002',
      month:           'Apr',
      day:             7,
      projectName:     'EXP',
      siteId:          'D0612',
      jobCode:         'EM043',
      category:        'Material',
      subCategory:     'Material',
      itemDescription: 'كيبل UTP Cat6 — 100 متر',
      amount:          180,
      comment:         'تم الشراء من المورد المعتمد',
      coordinator:     'eslam mussa',
      trackingNumber:  13,
      date:            '7-Apr-2026',
      createdAt:       '2026-04-07T11:30:00.000Z',
    },

    {
      id:              'smp-exp-0003-0000-0000-000000000003',
      month:           'Apr',
      day:             12,
      projectName:     'ROT',
      siteId:          'B0201',
      jobCode:         'EM044',
      category:        'Transportation',
      subCategory:     'Transportation',
      itemDescription: 'تاكسي ذهاب وعودة للموقع',
      amount:          120,
      comment:         '',
      coordinator:     'eslam mussa',
      trackingNumber:  13,
      date:            '12-Apr-2026',
      createdAt:       '2026-04-12T08:00:00.000Z',
    },

    {
      id:              'smp-exp-0004-0000-0000-000000000004',
      month:           'Apr',
      day:             16,
      projectName:     'roll out',
      siteId:          'D0510',
      jobCode:         'EM042',
      category:        'Accommodation',
      subCategory:     'Allowance',
      itemDescription: 'إقامة فندقية ليلة واحدة',
      amount:          450,
      comment:         '',
      coordinator:     'eslam mussa',
      trackingNumber:  13,
      date:            '16-Apr-2026',
      createdAt:       '2026-04-16T19:00:00.000Z',
    },

    {
      id:              'smp-exp-0005-0000-0000-000000000005',
      month:           'Apr',
      day:             21,
      projectName:     'NFM',
      siteId:          'C0330',
      jobCode:         'EM045',
      category:        'Car Oil',
      subCategory:     'Car Oil',
      itemDescription: 'زيت محرك وفلتر هواء',
      amount:          275,
      comment:         '',
      coordinator:     'eslam mussa',
      trackingNumber:  13,
      date:            '21-Apr-2026',
      createdAt:       '2026-04-21T10:45:00.000Z',
    },

  ],

  fuel: [

    /* KM chain: 45200 → 45480 → 45720 → 46010 → 46255 → 46490 */

    {
      id:            'smp-fue-0001-0000-0000-000000000001',
      month:         'Apr',
      day:           2,
      projectName:   'roll out',
      siteId:        'D0510',
      jobCode:       'EM042',
      startKm:       45200,
      endKm:         45480,
      fuelAmount:    350,
      kartaAmount:   50,
      area:          'delta',
      driver:        'tamer khalil',
      city:          'Mansoura',
      coordinator:   'eslam mussa',
      trackingNumber: 13,
      date:          '2-Apr-2026',
      createdAt:     '2026-04-02T07:30:00.000Z',
    },

    {
      id:            'smp-fue-0002-0000-0000-000000000002',
      month:         'Apr',
      day:           5,
      projectName:   'EXP',
      siteId:        'D0612',
      jobCode:       'EM043',
      startKm:       45480,
      endKm:         45720,
      fuelAmount:    300,
      kartaAmount:   0,
      area:          'cairo',
      driver:        'tamer khalil',
      city:          'Cairo',
      coordinator:   'eslam mussa',
      trackingNumber: 13,
      date:          '5-Apr-2026',
      createdAt:     '2026-04-05T08:00:00.000Z',
    },

    {
      id:            'smp-fue-0003-0000-0000-000000000003',
      month:         'Apr',
      day:           9,
      projectName:   'ROT',
      siteId:        'B0201',
      jobCode:       'EM044',
      startKm:       45720,
      endKm:         46010,
      fuelAmount:    420,
      kartaAmount:   80,
      area:          'upper egypt',
      driver:        'tamer khalil',
      city:          'Minya',
      coordinator:   'eslam mussa',
      trackingNumber: 13,
      date:          '9-Apr-2026',
      createdAt:     '2026-04-09T06:30:00.000Z',
    },

    {
      id:            'smp-fue-0004-0000-0000-000000000004',
      month:         'Apr',
      day:           14,
      projectName:   'roll out',
      siteId:        'D0510',
      jobCode:       'EM042',
      startKm:       46010,
      endKm:         46255,
      fuelAmount:    310,
      kartaAmount:   50,
      area:          'delta',
      driver:        'tamer khalil',
      city:          'Tanta',
      coordinator:   'eslam mussa',
      trackingNumber: 13,
      date:          '14-Apr-2026',
      createdAt:     '2026-04-14T07:15:00.000Z',
    },

    {
      id:            'smp-fue-0005-0000-0000-000000000005',
      month:         'Apr',
      day:           19,
      projectName:   'NFM',
      siteId:        'C0330',
      jobCode:       'EM045',
      startKm:       46255,
      endKm:         46490,
      fuelAmount:    380,
      kartaAmount:   0,
      area:          'cairo',
      driver:        'ahmed hassan',
      city:          'Heliopolis',
      coordinator:   'eslam mussa',
      trackingNumber: 13,
      date:          '19-Apr-2026',
      createdAt:     '2026-04-19T09:00:00.000Z',
    },

  ],

};

/* ==========================================================================
   SAMPLE IMPORT — for coordinator-app (wraps SAMPLE_DATA in import format)
   ========================================================================== */

const SAMPLE_IMPORT = {
  id:          'smp-import-coordinator-demo-0001',
  exportedAt:  '2026-04-22T12:00:00.000Z',
  importedAt:  new Date().toISOString(),
  sourceType:  'json',
  month:       'Apr',
  teamMember: {
    name:           'كريم وليد عبدالرؤوف',
    mobile:         '01012345678',
    trackingNumber: 13,
    accountType:    'New',
  },
  trackingNumber: 13,
  expenses: SAMPLE_DATA.expenses,
  fuel:     SAMPLE_DATA.fuel,
  totals: {
    expenseTotal:  1375,
    fuelTotal:     1760,
    kartaTotal:    180,
    combinedTotal: 3315,
  },
};

/* ==========================================================================
   LOAD SAMPLE DATA — Field App
   Only runs if both expense and fuel arrays are empty.
   ========================================================================== */

function loadSampleData() {
  var existingExpenses = loadFromStorage('expenses', []);
  var existingFuel     = loadFromStorage('fuel',     []);

  if (existingExpenses.length > 0 || existingFuel.length > 0) {
    showToast('Data already exists — sample data not loaded.', 'warning');
    return;
  }

  /* Stamp fresh IDs so repeated calls (e.g. after a clear) get unique entries */
  var expenses = SAMPLE_DATA.expenses.map(function (e) {
    return Object.assign({}, e, { id: generateId() });
  });
  var fuel = SAMPLE_DATA.fuel.map(function (f, i) {
    /* Re-chain KM with the new IDs but same values */
    return Object.assign({}, f, { id: generateId() });
  });

  saveToStorage('expenses', expenses);
  saveToStorage('fuel',     fuel);

  var lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'en';
  var t    = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang]) || {};
  showToast(t.loadedSampleData || 'Sample data loaded. You can edit or submit it.', 'success');

  setTimeout(function () { window.location.reload(); }, 900);
}

/* ==========================================================================
   LOAD SAMPLE IMPORT — Coordinator App
   Creates a fake imported report in localStorage so the coordinator can
   explore the review workflow without having a real field export.
   ========================================================================== */

function loadCoordSampleData() {
  var key = 'imported_' + SAMPLE_IMPORT.id;

  if (localStorage.getItem(key)) {
    showToast('Sample report already loaded.', 'warning');
    return;
  }

  /* Stamp a fresh importedAt timestamp */
  var imp = Object.assign({}, SAMPLE_IMPORT, { importedAt: new Date().toISOString() });
  saveToStorage(key, imp);

  showToast('Sample report loaded. Go to the dashboard to review it.', 'success');

  setTimeout(function () { window.location.reload(); }, 900);
}

/* ==========================================================================
   INIT SAMPLE DATA BUTTON
   Call once per DOMContentLoaded.
   Detects which app is running and inserts the button into the correct
   empty-state container — only when the relevant data store is empty.
   ========================================================================== */

function initSampleDataBtn() {
  var filename = window.location.pathname.split('/').pop().toLowerCase();
  if (filename !== 'index.html' && filename !== '') return; /* only on dashboard */

  var isCoordApp = window.location.pathname.indexOf('/coordinator-app/') !== -1;

  if (isCoordApp) {
    _initCoordSampleBtn();
  } else {
    _initFieldSampleBtn();
  }
}

/* ---- Field app ---- */
function _initFieldSampleBtn() {
  var expenses = loadFromStorage('expenses', []);
  var fuel     = loadFromStorage('fuel',     []);
  if (expenses.length > 0 || fuel.length > 0) return; /* data exists — skip */

  /* Target the flex action row inside #emptyStateEntries */
  var emptyCard = document.getElementById('emptyStateEntries');
  if (!emptyCard) return;

  var actionRow = emptyCard.querySelector('.flex');
  if (!actionRow) return;

  var btn = _buildSampleBtn('loadSample', loadSampleData);
  actionRow.appendChild(btn);
}

/* ---- Coordinator app ---- */
function _initCoordSampleBtn() {
  /* Only show when there are genuinely zero imports */
  var hasImports = false;
  for (var i = 0; i < localStorage.length; i++) {
    if ((localStorage.key(i) || '').indexOf('imported_') === 0) { hasImports = true; break; }
  }
  if (hasImports) return;

  var container = document.getElementById('importListContainer');
  if (!container) return;

  function _tryInject() {
    var noImportsCard = container.querySelector('.no-imports-card');
    if (!noImportsCard) return false;
    if (noImportsCard.querySelector('.btn-sample-data')) return true; /* already done */

    var btn = _buildSampleBtn('loadSample', loadCoordSampleData);
    btn.classList.add('btn-sm');
    btn.style.marginTop = 'var(--sp-2)';
    noImportsCard.appendChild(btn);
    return true;
  }

  /* _renderDashboard() runs synchronously before initSampleDataBtn() — check immediately */
  if (_tryInject()) return;

  /* Fallback: observe for async re-renders (e.g. after a delete) */
  var observer = new MutationObserver(function (mutations, obs) {
    if (_tryInject()) obs.disconnect();
  });
  observer.observe(container, { childList: true, subtree: true });
}

/* Build the "Load Sample Data" button element */
function _buildSampleBtn(i18nKey, clickHandler) {
  var btn = document.createElement('button');
  btn.type      = 'button';
  btn.className = 'btn btn-ghost btn-sm btn-sample-data';

  btn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"' +
    ' stroke="currentColor" stroke-width="2"' +
    ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10"></circle>' +
    '<line x1="12" y1="8" x2="12" y2="12"></line>' +
    '<line x1="12" y1="16" x2="12.01" y2="16"></line>' +
    '</svg>' +
    '<span data-i18n="' + i18nKey + '">Load Sample Data</span>';

  btn.addEventListener('click', clickHandler);
  return btn;
}
