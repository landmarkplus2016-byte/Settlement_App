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
   Columns A–R (18 cols, index 0–17):
   (blank), (blank), Month, Day, Project name, Site ID, Job Code,
   Category, Item Description, Amount, Comment, Coordinator,
   Tracking #, Name, Site Count, Category2, Sub Category, Date
   ========================================================================== */

function _buildExpensesSheet(settings, expenses) {
  const NCOLS   = 18;
  const expTotal = expenses.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);

  const rows = [];

  /* ---- Rows 0–3: header block ---- */
  rows.push(_blankRow(NCOLS, { 0: 'Expenses Tracking' }));
  rows.push(_blankRow(NCOLS, {
    0: 'Account:',
    1: settings.accountType || 'New',
    5: 'VF',
  }));
  rows.push(_blankRow(NCOLS, {
    0:  'Name:',
    1:  settings.name || '',
    3:  'New',
    5:  'Total:',
    6:  expTotal,
  }));
  rows.push(new Array(NCOLS).fill('')); // blank spacer

  /* ---- Row 4: column headers ---- */
  rows.push([
    '', '',
    'Month', 'Day', 'Project name', 'Site ID', 'Job Code',
    'Category', 'Item Description', 'Amount', 'Comment',
    'Coordinator', 'Tracking #', 'Name', 'Site Count',
    'Category2', 'Sub Category', 'Date',
  ]);

  /* ---- Rows 5+: data ---- */
  expenses.forEach(function (e) {
    rows.push([
      '', '',
      e.month          || '',
      typeof e.day === 'number' ? e.day : (parseInt(e.day, 10) || ''),
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
   Columns A–U (21 cols, index 0–20):
   (blank), (blank), Month, Day, Project name, Site ID, Job Code,
   Start KM, End KM, Fuel Amount, Area, Driver, City, Karta Amount,
   Coordinator, Tracking #, Name, Site Count, Category2, Sub Category, Date
   ========================================================================== */

function _buildFuelSheet(settings, fuel) {
  const NCOLS    = 21;
  const fuelTotal  = fuel.reduce(function (s, e) { return s + (parseFloat(e.fuelAmount)  || 0); }, 0);
  const kartaTotal = fuel.reduce(function (s, e) { return s + (parseFloat(e.kartaAmount) || 0); }, 0);

  const rows = [];

  /* ---- Rows 0–3: header block ---- */
  rows.push(_blankRow(NCOLS, { 0: 'Fuel Tracking' }));
  rows.push(_blankRow(NCOLS, {
    0: 'Account:',
    1: settings.accountType || 'New',
    5: 'VF',
  }));
  rows.push(_blankRow(NCOLS, {
    0:  'Name:',
    1:  settings.name || '',
    3:  'New Fuel:',
    4:  fuelTotal,
    6:  'Karta:',
    7:  kartaTotal,
    9:  'Total:',
    10: fuelTotal + kartaTotal,
  }));
  rows.push(new Array(NCOLS).fill(''));

  /* ---- Row 4: column headers ---- */
  rows.push([
    '', '',
    'Month', 'Day', 'Project name', 'Site ID', 'Job Code',
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
      e.month          || '',
      typeof e.day === 'number' ? e.day : (parseInt(e.day, 10) || ''),
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
   Columns: Month, Day, Project, PC, Category, Name
   ========================================================================== */

function _buildListSheet(settings) {
  const months     = LISTS.months;
  const days       = LISTS.days;
  const projects   = LISTS.projects;
  const categories = LISTS.categories;
  const accounts   = LISTS.accountTypes;

  const rows = [];
  rows.push(['Month', 'Day', 'Project', 'PC', 'Category', 'Name']);

  const maxRows = Math.max(months.length, days.length, projects.length, categories.length, accounts.length);

  for (var i = 0; i < maxRows; i++) {
    rows.push([
      months[i]     !== undefined ? months[i]     : '',
      days[i]       !== undefined ? days[i]       : '',
      projects[i]   !== undefined ? projects[i]   : '',
      accounts[i]   !== undefined ? accounts[i]   : '',
      categories[i] !== undefined ? categories[i] : '',
      i === 0 ? (settings.name || '') : '',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 8 },   /* Month */
    { wch: 5 },   /* Day */
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
    { wch: 7  }, /* C Month */
    { wch: 5  }, /* D Day */
    { wch: 14 }, /* E Project name */
    { wch: 10 }, /* F Site ID */
    { wch: 10 }, /* G Job Code */
    { wch: 18 }, /* H Category */
    { wch: 28 }, /* I Item Description */
    { wch: 12 }, /* J Amount */
    { wch: 22 }, /* K Comment */
    { wch: 16 }, /* L Coordinator */
    { wch: 12 }, /* M Tracking # */
    { wch: 28 }, /* N Name */
    { wch: 8  }, /* O Site Count */
    { wch: 18 }, /* P Category2 */
    { wch: 16 }, /* Q Sub Category */
    { wch: 14 }, /* R Date */
  ];
}

function _fuelColWidths() {
  return [
    { wch: 4  }, /* A blank */
    { wch: 4  }, /* B blank */
    { wch: 7  }, /* C Month */
    { wch: 5  }, /* D Day */
    { wch: 14 }, /* E Project name */
    { wch: 10 }, /* F Site ID */
    { wch: 10 }, /* G Job Code */
    { wch: 11 }, /* H Start KM */
    { wch: 11 }, /* I End KM */
    { wch: 12 }, /* J Fuel Amount */
    { wch: 12 }, /* K Area */
    { wch: 16 }, /* L Driver */
    { wch: 14 }, /* M City */
    { wch: 12 }, /* N Karta Amount */
    { wch: 16 }, /* O Coordinator */
    { wch: 12 }, /* P Tracking # */
    { wch: 28 }, /* Q Name */
    { wch: 8  }, /* R Site Count */
    { wch: 14 }, /* S Category2 */
    { wch: 14 }, /* T Sub Category */
    { wch: 14 }, /* U Date */
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
