/* ==========================================================================
   ExpenseFuel Tracker — Excel & JSON Export
   Depends on:
     window.XLSX       — SheetJS (load xlsx.full.min.js BEFORE this file)
     LISTS             — lists.js
     formatDate()      — utils.js
     formatCurrency()  — utils.js
   ========================================================================== */

/* ==========================================================================
   MAIN ENTRY POINT — generateFieldExcel
   Returns a SheetJS workbook object.
   Caller is responsible for downloading it via triggerExcelDownload().
   ========================================================================== */

function generateFieldExcel(settings, expenses, fuel) {
  if (typeof XLSX === 'undefined') {
    throw new Error('SheetJS (XLSX) must be loaded before excel-export.js');
  }

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, _buildExpensesSheet(settings, expenses), 'Expenses Tracking');
  XLSX.utils.book_append_sheet(wb, _buildFuelSheet(settings, fuel),         'Fuel Tracking');
  XLSX.utils.book_append_sheet(wb, _buildListSheet(settings),               'List');

  return wb;
}

/* ==========================================================================
   DOWNLOAD HELPERS
   ========================================================================== */

function triggerExcelDownload(workbook, filename) {
  XLSX.writeFile(workbook, filename);
}

function triggerJSONDownload(jsonString, filename) {
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

/* ==========================================================================
   JSON EXPORT
   ========================================================================== */

function generateFieldJSON(settings, expenses, fuel) {
  const expenseTotal = expenses.reduce(function (s, e) { return s + (parseFloat(e.amount)      || 0); }, 0);
  const fuelTotal    = fuel.reduce(   function (s, e) { return s + (parseFloat(e.fuelAmount)   || 0); }, 0);
  const kartaTotal   = fuel.reduce(   function (s, e) { return s + (parseFloat(e.kartaAmount)  || 0); }, 0);

  const payload = {
    exportedAt:    new Date().toISOString(),
    teamMember: {
      name:           settings.name           || '',
      mobile:         settings.mobile         || '',
      trackingNumber: settings.trackingNumber || 0,
      accountType:    settings.accountType    || 'New',
    },
    trackingNumber: settings.trackingNumber || 0,
    expenses:       expenses,
    fuel:           fuel,
    totals: {
      expenseTotal:  Math.round(expenseTotal  * 100) / 100,
      fuelTotal:     Math.round(fuelTotal     * 100) / 100,
      kartaTotal:    Math.round(kartaTotal    * 100) / 100,
      combinedTotal: Math.round((expenseTotal + fuelTotal + kartaTotal) * 100) / 100,
    },
  };

  return JSON.stringify(payload, null, 2);
}

/* ==========================================================================
   PRIVATE — EXPENSES SHEET
   Columns A–P (16 cols, index 0–15):
   (blank), (blank), Project name, Site ID, Job Code,
   Category, Item Description, Amount, Comment, Coordinator,
   Tracking #, Name, Site Count, Category2, Sub Category, Date
   ========================================================================== */

function _buildExpensesSheet(settings, expenses) {
  const NCOLS   = 16;
  const expTotal = expenses.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);

  const rows = [];

  /* ---- Rows 0–3: header block ---- */
  rows.push(_blankRow(NCOLS, { 0: 'Expenses Tracking' }));
  rows.push(_blankRow(NCOLS, {
    0: 'Account:',
    1: settings.accountType || 'New',
    3: 'VF',
  }));
  rows.push(_blankRow(NCOLS, {
    0: 'Name:',
    1: settings.name || '',
    3: 'Total:',
    4: expTotal,
  }));
  rows.push(new Array(NCOLS).fill('')); // blank spacer

  /* ---- Row 4: column headers ---- */
  rows.push([
    '', '',
    'Project name', 'Site ID', 'Job Code',
    'Category', 'Item Description', 'Amount', 'Comment',
    'Coordinator', 'Tracking #', 'Name', 'Site Count',
    'Category2', 'Sub Category', 'Date',
  ]);

  /* ---- Rows 5+: data ---- */
  expenses.forEach(function (e) {
    rows.push([
      '', '',
      e.projectName    || '',
      e.siteId         || '',
      e.jobCode        || '',
      e.category       || '',
      e.itemDescription || '',
      parseFloat(e.amount) || 0,
      e.comment        || '',
      e.coordinator    || '',
      e.trackingNumber || settings.trackingNumber || 0,
      settings.name    || '',
      1,                          /* Site Count — one site per entry */
      e.category       || '',     /* Category2 */
      e.subCategory    || '',
      e.date           || '',
    ]);
  });

  rows.push(new Array(NCOLS).fill('')); /* blank after data */

  /* ---- Approval footer ---- */
  _pushApprovalFooter(rows, settings, NCOLS);

  /* ---- Build sheet ---- */
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    /* Title row spans all columns */
    { s: { r: 0, c: 0 }, e: { r: 0, c: NCOLS - 1 } },
    /* Account row partial merges */
    { s: { r: 1, c: 0 }, e: { r: 1, c: 0 } },
    /* Name row partial merges */
    { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } },
  ];

  ws['!cols'] = _expenseColWidths();

  return ws;
}

/* ==========================================================================
   PRIVATE — FUEL SHEET
   Columns A–S (19 cols, index 0–18):
   (blank), (blank), Project name, Site ID, Job Code,
   Start KM, End KM, Fuel Amount, Area, Driver, City, Karta Amount,
   Coordinator, Tracking #, Name, Site Count, Category2, Sub Category, Date
   ========================================================================== */

function _buildFuelSheet(settings, fuel) {
  const NCOLS    = 19;
  const fuelTotal  = fuel.reduce(function (s, e) { return s + (parseFloat(e.fuelAmount)  || 0); }, 0);
  const kartaTotal = fuel.reduce(function (s, e) { return s + (parseFloat(e.kartaAmount) || 0); }, 0);

  const rows = [];

  /* ---- Rows 0–3: header block ---- */
  rows.push(_blankRow(NCOLS, { 0: 'Fuel Tracking' }));
  rows.push(_blankRow(NCOLS, {
    0: 'Account:',
    1: settings.accountType || 'New',
    3: 'VF',
  }));
  rows.push(_blankRow(NCOLS, {
    0: 'Name:',
    1: settings.name || '',
    2: 'New Fuel:',
    3: fuelTotal,
    5: 'Karta:',
    6: kartaTotal,
    8: 'Total:',
    9: fuelTotal + kartaTotal,
  }));
  rows.push(new Array(NCOLS).fill(''));

  /* ---- Row 4: column headers ---- */
  rows.push([
    '', '',
    'Project name', 'Site ID', 'Job Code',
    'Start KM', 'End KM', 'Fuel Amount', 'Area', 'Driver', 'City',
    'Karta Amount', 'Coordinator', 'Tracking #', 'Name', 'Site Count',
    'Category2', 'Sub Category', 'Date',
  ]);

  /* ---- Rows 5+: data ---- */
  fuel.forEach(function (e) {
    const startKm = parseFloat(e.startKm) || 0;
    const endKm   = parseFloat(e.endKm)   || 0;
    rows.push([
      '', '',
      e.projectName    || '',
      e.siteId         || '',
      e.jobCode        || '',
      startKm,
      endKm,
      parseFloat(e.fuelAmount)  || 0,
      e.area           || '',
      e.driver         || '',
      e.city           || '',
      parseFloat(e.kartaAmount) || 0,
      e.coordinator    || '',
      e.trackingNumber || settings.trackingNumber || 0,
      settings.name    || '',
      1,               /* Site Count */
      '',              /* Category2 — not applicable to fuel */
      '',              /* Sub Category — not applicable */
      e.date           || '',
    ]);
  });

  rows.push(new Array(NCOLS).fill(''));

  /* ---- Approval footer ---- */
  _pushApprovalFooter(rows, settings, NCOLS);

  /* ---- Build sheet ---- */
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NCOLS - 1 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } },
  ];

  ws['!cols'] = _fuelColWidths();

  return ws;
}

/* ==========================================================================
   PRIVATE — LIST SHEET
   Columns: Project, PC, Category, Name
   ========================================================================== */

function _buildListSheet(settings) {
  const projects   = LISTS.projects;
  const categories = LISTS.categories;
  const accounts   = LISTS.accountTypes;

  const rows = [];
  rows.push(['Project', 'PC', 'Category', 'Name']);

  const maxRows = Math.max(projects.length, categories.length, accounts.length);

  for (var i = 0; i < maxRows; i++) {
    rows.push([
      projects[i]   !== undefined ? projects[i]   : '',
      accounts[i]   !== undefined ? accounts[i]   : '',
      categories[i] !== undefined ? categories[i] : '',
      i === 0 ? (settings.name || '') : '',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 14 },  /* Project */
    { wch: 8 },   /* PC */
    { wch: 22 },  /* Category */
    { wch: 30 },  /* Name */
  ];

  return ws;
}

/* ==========================================================================
   PRIVATE — APPROVAL FOOTER (appended to both sheets)
   Row -3: إعتماد | (blank) | مدير الحسابات | (blank) | المدير المسؤل | (blank) | Tracking #
   Row -2: (blank×4)          | .              | (blank) | trackingNumber
   Row -1: exportDate         | التاريخ:
   ========================================================================== */

function _pushApprovalFooter(rows, settings, ncols) {
  const tracking = settings.trackingNumber || '';

  const row1 = new Array(ncols).fill('');
  row1[0] = 'إعتماد';
  row1[2] = 'مدير الحسابات';
  row1[4] = 'المدير المسؤل';
  row1[6] = 'Tracking #';
  rows.push(row1);

  const row2 = new Array(ncols).fill('');
  row2[4] = '.';
  row2[6] = tracking;
  rows.push(row2);

  const row3 = new Array(ncols).fill('');
  /* Export date formatted as DD-Mon-YYYY */
  const now   = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  row3[0] = now.getDate() + '-' + months[now.getMonth()] + '-' + now.getFullYear();
  row3[1] = 'التاريخ:';
  rows.push(row3);
}

/* ==========================================================================
   PRIVATE — COLUMN WIDTHS
   ========================================================================== */

function _expenseColWidths() {
  return [
    { wch: 4  }, /* A blank */
    { wch: 4  }, /* B blank */
    { wch: 14 }, /* C Project name */
    { wch: 10 }, /* D Site ID */
    { wch: 10 }, /* E Job Code */
    { wch: 18 }, /* F Category */
    { wch: 28 }, /* G Item Description */
    { wch: 12 }, /* H Amount */
    { wch: 22 }, /* I Comment */
    { wch: 16 }, /* J Coordinator */
    { wch: 12 }, /* K Tracking # */
    { wch: 28 }, /* L Name */
    { wch: 8  }, /* M Site Count */
    { wch: 18 }, /* N Category2 */
    { wch: 16 }, /* O Sub Category */
    { wch: 14 }, /* P Date */
  ];
}

function _fuelColWidths() {
  return [
    { wch: 4  }, /* A blank */
    { wch: 4  }, /* B blank */
    { wch: 14 }, /* C Project name */
    { wch: 10 }, /* D Site ID */
    { wch: 10 }, /* E Job Code */
    { wch: 11 }, /* F Start KM */
    { wch: 11 }, /* G End KM */
    { wch: 12 }, /* H Fuel Amount */
    { wch: 12 }, /* I Area */
    { wch: 16 }, /* J Driver */
    { wch: 14 }, /* K City */
    { wch: 12 }, /* L Karta Amount */
    { wch: 16 }, /* M Coordinator */
    { wch: 12 }, /* N Tracking # */
    { wch: 28 }, /* O Name */
    { wch: 8  }, /* P Site Count */
    { wch: 14 }, /* Q Category2 */
    { wch: 14 }, /* R Sub Category */
    { wch: 14 }, /* S Date */
  ];
}

/* ==========================================================================
   PRIVATE — UTILITIES
   ========================================================================== */

/* Creates a row of `len` empty strings with specified column overrides */
function _blankRow(len, overrides) {
  const row = new Array(len).fill('');
  if (overrides) {
    Object.keys(overrides).forEach(function (col) {
      row[parseInt(col, 10)] = overrides[col];
    });
  }
  return row;
}

/* ==========================================================================
   EXPORT FILENAME BUILDER — shared by field-app/js/export.js
   ========================================================================== */

function buildExportFilename(settings, month, year, ext) {
  /* [Name]_T[TrackingNum]_[Month][Year].[ext] */
  const safeName    = (settings.name    || 'unknown').replace(/\s+/g, '_');
  const tracking    = settings.trackingNumber || 0;
  const mon         = month || 'unknown';
  const yr          = year  || new Date().getFullYear();
  return safeName + '_T' + tracking + '_' + mon + yr + '.' + (ext || 'xlsx');
}

/* ==========================================================================
   COORDINATOR EXPORT — generateCoordinatorExcel(importData, reviewData)

   importData  — the object stored under 'imported_[id]' in localStorage
   reviewData  — the object stored under 'review_[id]':
                 { [entryId]: { status, coordinatorNote, reviewedAt } }

   Returns a SheetJS workbook. Caller downloads via triggerExcelDownload().
   ========================================================================== */

function generateCoordinatorExcel(importData, reviewData) {
  if (typeof XLSX === 'undefined') {
    throw new Error('SheetJS (XLSX) must be loaded before excel-export.js');
  }

  var review  = reviewData  || {};
  var member  = (importData && importData.teamMember) || {};
  var allExp  = (importData && importData.expenses)   || [];
  var allFuel = (importData && importData.fuel)       || [];

  /* ---- Partition by status ---- */
  var approvedExpenses = allExp.filter(function (e) {
    var rd = review[e.id];
    return rd && rd.status === 'approved';
  });

  var approvedFuel = allFuel.filter(function (f) {
    var rd = review[f.id];
    return rd && rd.status === 'approved';
  });

  var flaggedExpenses = allExp.filter(function (e) {
    var rd = review[e.id];
    return rd && rd.status === 'flagged';
  });

  var flaggedFuel = allFuel.filter(function (f) {
    var rd = review[f.id];
    return rd && rd.status === 'flagged';
  });

  /* Pseudo-settings from import data — keeps _buildExpensesSheet compatible */
  var pseudoSettings = {
    name:           member.name           || '',
    mobile:         member.mobile         || '',
    trackingNumber: member.trackingNumber || importData.trackingNumber || 0,
    accountType:    member.accountType    || 'New',
  };

  /* ---- Read coordinator's own name from localStorage (browser-only) ---- */
  var coordName = '';
  try {
    var cs = localStorage.getItem('coord_settings');
    if (cs) coordName = (JSON.parse(cs).name || '');
  } catch (e) { /* ignore */ }

  /* ---- Build workbook ---- */
  var wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    _buildCoordExpensesSheet(pseudoSettings, approvedExpenses, review),
    'Expenses Tracking'
  );

  XLSX.utils.book_append_sheet(
    wb,
    _buildCoordFuelSheet(pseudoSettings, approvedFuel, review),
    'Fuel Tracking'
  );

  XLSX.utils.book_append_sheet(
    wb,
    _buildFlaggedSheet(flaggedExpenses, flaggedFuel, review),
    'Flagged Entries'
  );

  XLSX.utils.book_append_sheet(
    wb,
    _buildSummarySheet(importData, approvedExpenses, approvedFuel, flaggedExpenses.length + flaggedFuel.length, coordName),
    'Summary'
  );

  return wb;
}

/* --------------------------------------------------------------------------
   _buildCoordExpensesSheet — approved expenses + Coordinator Notes column
   Columns A–Q (17 cols, 0–16): same as field export + col 16 = Coord Notes
   -------------------------------------------------------------------------- */

function _buildCoordExpensesSheet(settings, expenses, reviewData) {
  const NCOLS    = 17;
  const expTotal = expenses.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);

  const rows = [];

  /* Header block (rows 0-3) */
  rows.push(_blankRow(NCOLS, { 0: 'Expenses Tracking — Approved Only' }));
  rows.push(_blankRow(NCOLS, {
    0: 'Account:', 1: settings.accountType || 'New', 3: 'VF',
  }));
  rows.push(_blankRow(NCOLS, {
    0: 'Name:', 1: settings.name || '', 3: 'Total:', 4: expTotal,
  }));
  rows.push(new Array(NCOLS).fill(''));

  /* Column headers (row 4) */
  rows.push([
    '', '',
    'Project name', 'Site ID', 'Job Code',
    'Category', 'Item Description', 'Amount', 'Comment',
    'Coordinator', 'Tracking #', 'Name', 'Site Count',
    'Category2', 'Sub Category', 'Date',
    'Coordinator Notes',
  ]);

  /* Data rows (row 5+) */
  expenses.forEach(function (e) {
    const note = (reviewData[e.id] && reviewData[e.id].coordinatorNote) || '';
    rows.push([
      '', '',
      e.projectName    || '',
      e.siteId         || '',
      e.jobCode        || '',
      e.category       || '',
      e.itemDescription || '',
      parseFloat(e.amount) || 0,
      e.comment        || '',
      e.coordinator    || '',
      e.trackingNumber || settings.trackingNumber || 0,
      settings.name    || '',
      1,
      e.category       || '',
      e.subCategory    || '',
      e.date           || '',
      note,
    ]);
  });

  rows.push(new Array(NCOLS).fill(''));
  _pushApprovalFooter(rows, settings, NCOLS);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NCOLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } },
  ];

  /* Column widths — same as field + coord notes */
  ws['!cols'] = _expenseColWidths().concat([{ wch: 30 }]);

  return ws;
}

/* --------------------------------------------------------------------------
   _buildCoordFuelSheet — approved fuel + Coordinator Notes column
   Columns A–T (20 cols, 0–19): same as field fuel export + col 19 = Coord Notes
   -------------------------------------------------------------------------- */

function _buildCoordFuelSheet(settings, fuel, reviewData) {
  const NCOLS    = 20;
  const fuelTotal  = fuel.reduce(function (s, e) { return s + (parseFloat(e.fuelAmount)  || 0); }, 0);
  const kartaTotal = fuel.reduce(function (s, e) { return s + (parseFloat(e.kartaAmount) || 0); }, 0);

  const rows = [];

  /* Header block */
  rows.push(_blankRow(NCOLS, { 0: 'Fuel Tracking — Approved Only' }));
  rows.push(_blankRow(NCOLS, {
    0: 'Account:', 1: settings.accountType || 'New', 3: 'VF',
  }));
  rows.push(_blankRow(NCOLS, {
    0: 'Name:', 1: settings.name || '',
    2: 'New Fuel:', 3: fuelTotal,
    5: 'Karta:', 6: kartaTotal,
    8: 'Total:', 9: fuelTotal + kartaTotal,
  }));
  rows.push(new Array(NCOLS).fill(''));

  /* Column headers */
  rows.push([
    '', '',
    'Project name', 'Site ID', 'Job Code',
    'Start KM', 'End KM', 'Fuel Amount', 'Area', 'Driver', 'City',
    'Karta Amount', 'Coordinator', 'Tracking #', 'Name', 'Site Count',
    'Category2', 'Sub Category', 'Date',
    'Coordinator Notes',
  ]);

  /* Data rows */
  fuel.forEach(function (e) {
    const note    = (reviewData[e.id] && reviewData[e.id].coordinatorNote) || '';
    const startKm = parseFloat(e.startKm) || 0;
    const endKm   = parseFloat(e.endKm)   || 0;
    rows.push([
      '', '',
      e.projectName    || '',
      e.siteId         || '',
      e.jobCode        || '',
      startKm,
      endKm,
      parseFloat(e.fuelAmount)  || 0,
      e.area           || '',
      e.driver         || '',
      e.city           || '',
      parseFloat(e.kartaAmount) || 0,
      e.coordinator    || '',
      e.trackingNumber || settings.trackingNumber || 0,
      settings.name    || '',
      1,
      '',
      '',
      e.date           || '',
      note,
    ]);
  });

  rows.push(new Array(NCOLS).fill(''));
  _pushApprovalFooter(rows, settings, NCOLS);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NCOLS - 1 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } },
  ];

  ws['!cols'] = _fuelColWidths().concat([{ wch: 30 }]);

  return ws;
}

/* --------------------------------------------------------------------------
   _buildFlaggedSheet — all flagged expenses + fuel in one combined table
   Columns: Type | Date | Project | Site ID | Category/Area | Amount/Fuel | Note
   -------------------------------------------------------------------------- */

function _buildFlaggedSheet(flaggedExpenses, flaggedFuel, reviewData) {
  const rows = [];

  rows.push(['Flagged Entries — Excluded from Export']);
  rows.push([]);
  rows.push(['Type', 'Date', 'Project', 'Site ID', 'Category / Area', 'Amount / Fuel (EGP)', 'Coordinator Note']);

  flaggedExpenses.forEach(function (e) {
    const note = (reviewData[e.id] && reviewData[e.id].coordinatorNote) || '';
    rows.push([
      'Expense',
      e.date        || '',
      e.projectName || '',
      e.siteId      || '',
      e.category    || '',
      parseFloat(e.amount) || 0,
      note,
    ]);
  });

  flaggedFuel.forEach(function (f) {
    const note = (reviewData[f.id] && reviewData[f.id].coordinatorNote) || '';
    rows.push([
      'Fuel',
      f.date        || '',
      f.projectName || '',
      f.siteId      || '',
      f.area        || '',
      parseFloat(f.fuelAmount) || 0,
      note,
    ]);
  });

  if (flaggedExpenses.length === 0 && flaggedFuel.length === 0) {
    rows.push(['No flagged entries.', '', '', '', '', '', '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
  ];

  ws['!cols'] = [
    { wch: 10 }, /* Type */
    { wch: 14 }, /* Date */
    { wch: 14 }, /* Project */
    { wch: 10 }, /* Site ID */
    { wch: 18 }, /* Category / Area */
    { wch: 20 }, /* Amount */
    { wch: 35 }, /* Note */
  ];

  return ws;
}

/* --------------------------------------------------------------------------
   _buildSummarySheet — one-page review summary
   -------------------------------------------------------------------------- */

function _buildSummarySheet(importData, approvedExpenses, approvedFuel, flaggedCount, coordName) {
  var member   = (importData && importData.teamMember) || {};
  var month    = (importData && importData.month)      || '';
  var tracking = member.trackingNumber || (importData && importData.trackingNumber) || '';

  var now    = new Date();
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var today  = now.getDate() + '-' + months[now.getMonth()] + '-' + now.getFullYear();

  var expTotal   = approvedExpenses.reduce(function (s, e) { return s + (parseFloat(e.amount)     || 0); }, 0);
  var fuelTotal  = approvedFuel.reduce(    function (s, f) { return s + (parseFloat(f.fuelAmount)  || 0); }, 0);
  var kartaTotal = approvedFuel.reduce(    function (s, f) { return s + (parseFloat(f.kartaAmount) || 0); }, 0);

  var rows = [
    ['ExpenseFuel — Coordinator Review Summary'],
    [],
    ['Export Date:',     today],
    ['Coordinator:',     coordName || '—'],
    [],
    ['Team Member:',     member.name || '—'],
    ['Tracking Number:', tracking   || '—'],
    ['Month:',           month      || '—'],
    [],
    ['',                  'Count',                               'Total (EGP)'],
    ['Approved Expenses', approvedExpenses.length,               Math.round(expTotal   * 100) / 100],
    ['Approved Fuel',     approvedFuel.length,                   Math.round(fuelTotal  * 100) / 100],
    ['Approved Karta',    '—',                                   Math.round(kartaTotal * 100) / 100],
    ['Flagged (Excluded)', flaggedCount,                         '—'],
    [],
    ['Total Approved Value', '', Math.round((expTotal + fuelTotal + kartaTotal) * 100) / 100],
  ];

  var ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
  ];

  ws['!cols'] = [
    { wch: 22 }, /* Label */
    { wch: 10 }, /* Count */
    { wch: 16 }, /* Total */
  ];

  return ws;
}

/* --------------------------------------------------------------------------
   buildCoordinatorFilename(importData)
   Returns "APPROVED_[MemberName]_T[TrackingNum]_[Month][Year].xlsx"
   -------------------------------------------------------------------------- */

function buildCoordinatorFilename(importData) {
  var member   = (importData && importData.teamMember) || {};
  var safeName = (member.name || 'Unknown').replace(/\s+/g, '_');
  var tracking = member.trackingNumber || (importData && importData.trackingNumber) || 0;
  var month    = (importData && importData.month)
    || ((importData && importData.expenses && importData.expenses[0] && importData.expenses[0].month)
      || (importData && importData.fuel && importData.fuel[0] && importData.fuel[0].month)
      || 'unknown');
  var year     = new Date().getFullYear();

  return 'APPROVED_' + safeName + '_T' + tracking + '_' + month + year + '.xlsx';
}
