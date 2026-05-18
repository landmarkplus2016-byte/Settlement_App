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
   Columns A–J (10 cols, index 0–9):
   (blank), (blank), Project name, Site ID, Job Code,
   Category, Item Description, Amount, Comment, Coordinator
   ========================================================================== */

function _buildExpensesSheet(settings, expenses) {
  const NCOLS   = 10;
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
  rows.push(new Array(NCOLS).fill(''));

  /* ---- Row 4: column headers ---- */
  rows.push([
    '', '',
    'Project name', 'Site ID', 'Job Code',
    'Category', 'Item Description', 'Amount', 'Comment', 'Coordinator',
  ]);

  /* ---- Rows 5+: data ---- */
  expenses.forEach(function (e) {
    rows.push([
      '', '',
      e.projectName     || '',
      e.siteId          || '',
      e.jobCode         || '',
      e.category        || '',
      e.itemDescription || '',
      parseFloat(e.amount) || 0,
      e.comment         || '',
      e.coordinator     || '',
    ]);
  });

  rows.push(new Array(NCOLS).fill(''));

  /* ---- Approval footer ---- */
  _pushApprovalFooter(rows, settings, NCOLS);

  /* ---- Build sheet ---- */
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NCOLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } },
  ];

  ws['!cols'] = [
    { wch: 4  }, /* A blank */
    { wch: 4  }, /* B blank */
    { wch: 14 }, /* C Project name */
    { wch: 10 }, /* D Site ID */
    { wch: 10 }, /* E Job Code */
    { wch: 18 }, /* F Category */
    { wch: 30 }, /* G Item Description */
    { wch: 12 }, /* H Amount */
    { wch: 24 }, /* I Comment */
    { wch: 18 }, /* J Coordinator */
  ];

  return ws;
}

/* ==========================================================================
   PRIVATE — FUEL SHEET
   Columns A–N (14 cols, index 0–13):
   (blank), (blank), Project name, Site ID, Job Code,
   Start KM, End KM, Fuel Amount, Area, Driver, City, Karta Amount,
   Comment, Coordinator
   ========================================================================== */

function _buildFuelSheet(settings, fuel) {
  const NCOLS    = 14;
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
    'Karta Amount', 'Comment', 'Coordinator',
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
      e.comment        || '',
      e.coordinator    || '',
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

  ws['!cols'] = [
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
    { wch: 24 }, /* M Comment */
    { wch: 18 }, /* N Coordinator */
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
    { wch: 22 }, /* M Comment */
    { wch: 16 }, /* N Coordinator */
    { wch: 12 }, /* O Tracking # */
    { wch: 28 }, /* P Name */
    { wch: 8  }, /* Q Site Count */
    { wch: 14 }, /* R Category2 */
    { wch: 14 }, /* S Sub Category */
    { wch: 14 }, /* T Date */
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
   COORDINATOR EXPORT — ExcelJS implementation (replaces old SheetJS version)
   Requires ExcelJS + FileSaver.js loaded on coordinator export.html.
   ========================================================================== */

/* Colour palette (ARGB 8-char) */
var _XL_NAVY  = 'FF002060';
var _XL_GREEN = 'FF00B050';
var _XL_LGRAY = 'FFD9D9D9';
var _XL_WHITE = 'FFFFFFFF';
var _XL_DGRAY = 'FF595959';
var _XL_LBLUE = 'FFEBF3FA';

function _bs(argb, style) { return { style: style || 'thin', color: { argb: argb } }; }

async function _fetchLogo() {
  try {
    var res = await fetch('LMP Big Logo.jpg');
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch (e) { return null; }
}

function _xCell(cell, val, opts) {
  opts = opts || {};
  if (val !== undefined) cell.value = val;
  if (opts.fill)   cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
  if (opts.font)   cell.font      = Object.assign({ name: 'Calibri', size: 10 }, opts.font);
  if (opts.align)  cell.alignment = opts.align;
  if (opts.border) cell.border    = opts.border;
  if (opts.numFmt) cell.numFmt    = opts.numFmt;
}

function _navySep(ws, rowNum, n) {
  var row = ws.getRow(rowNum); row.height = 4;
  for (var c = 1; c <= n; c++) {
    ws.getRow(rowNum).getCell(c).fill = { type:'pattern', pattern:'solid', fgColor:{argb:_XL_NAVY} };
  }
  ws.mergeCells(rowNum, 1, rowNum, n);
}

function _addApprovalFooterXLSX(ws, settings, startRow, n) {
  var tracking = settings.trackingNumber || '';
  var now = new Date();
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var dateStr = now.getDate() + '-' + months[now.getMonth()] + '-' + now.getFullYear();
  function bdr() { var s = _bs(_XL_NAVY,'thin'); return {top:s,bottom:s,left:s,right:s}; }

  var fr1 = ws.getRow(startRow); fr1.height = 22;
  [{c:1,v:'إعتماد'},{c:3,v:'مدير الحسابات'},{c:5,v:'المدير المسؤل'},{c:n,v:'Tracking #'}]
    .forEach(function(x) {
      _xCell(fr1.getCell(x.c), x.v, { font:{bold:true,size:10}, align:{horizontal:'center',vertical:'middle'}, border:bdr() });
    });

  var fr2 = ws.getRow(startRow + 1); fr2.height = 20;
  _xCell(fr2.getCell(n), tracking, { font:{bold:true,size:11}, align:{horizontal:'center',vertical:'middle'}, border:bdr() });

  var fr3 = ws.getRow(startRow + 2); fr3.height = 18;
  fr3.getCell(1).value = dateStr;
  fr3.getCell(2).value = 'التاريخ:';
}

/* --- Shared row-builder for logo/title/account rows (both sheets) --- */
function _addHeaderRows(ws, n, title, settings, logoId) {
  var LOGO_END    = 3; /* logo occupies cols A–C (1–3) */
  var ACCT_LBL_END = LOGO_END + 3; /* "Account" label spans D–F (4–6) */

  /* Row 1: all green title */
  var r1 = ws.getRow(1); r1.height = 44;
  for (var c = 1; c <= n; c++) {
    _xCell(r1.getCell(c), undefined, {
      fill:  _XL_GREEN,
      font:  {bold:true,color:{argb:_XL_WHITE},size:14},
      align: {horizontal:'center',vertical:'middle'},
    });
  }
  r1.getCell(1).value = title;
  ws.mergeCells(1, 1, 1, n);

  /* Row 2: A–C white (logo area) | D–F LBLUE "Account" | G–n white value */
  var r2 = ws.getRow(2); r2.height = 20;
  for (var c = 1; c <= n; c++) {
    var isLbl = c > LOGO_END && c <= ACCT_LBL_END;
    var isVal = c > ACCT_LBL_END;
    _xCell(r2.getCell(c), undefined, {
      fill:  isLbl ? _XL_LBLUE : _XL_WHITE,
      font:  isLbl ? {bold:true,color:{argb:_XL_NAVY},size:11} : isVal ? {color:{argb:_XL_NAVY},size:11} : undefined,
      align: (isLbl||isVal) ? {horizontal:'center',vertical:'middle'} : undefined,
    });
  }
  r2.getCell(LOGO_END + 1).value = 'Account';
  r2.getCell(ACCT_LBL_END + 1).value = settings.accountType || 'New';
  ws.mergeCells(2, LOGO_END + 1, 2, ACCT_LBL_END);    /* D–F: "Account" label */
  ws.mergeCells(2, ACCT_LBL_END + 1, 2, n);            /* G–n: value */

  /* Logo overlays rows 1–2, cols A–C (floats over cells) */
  if (logoId !== null && logoId !== undefined) {
    ws.addImage(logoId, { tl:{col:0,row:0}, br:{col:3,row:2} });
  }

  /* Row 3: navy separator */
  _navySep(ws, 3, n);
}

/* --- Shared column-header row builder --- */
function _addColHeaders(ws, rowNum, n, headers) {
  var row = ws.getRow(rowNum); row.height = 28;
  headers.forEach(function(h, i) {
    var c = i + 1;
    _xCell(row.getCell(c), h, {
      fill:   _XL_NAVY,
      font:   {bold:true,color:{argb:_XL_WHITE},size:10},
      align:  {horizontal:'center',vertical:'middle',wrapText:true},
      border: {
        top:    _bs(_XL_NAVY,'medium'),
        bottom: _bs(_XL_NAVY,'thin'),
        left:   c===1 ? _bs(_XL_NAVY,'medium') : _bs(_XL_WHITE,'thin'),
        right:  c===n ? _bs(_XL_NAVY,'medium') : _bs(_XL_WHITE,'thin'),
      },
    });
  });
  ws.autoFilter = { from:{row:rowNum,column:1}, to:{row:rowNum,column:n} };
}

/* --- Shared data-row builder --- */
function _addDataRows(ws, dataStart, n, rows) {
  rows.forEach(function(vals, ri) {
    var row = ws.getRow(dataStart + ri); row.height = 18;
    var isAlt  = ri % 2 === 1;
    var isLast = ri === rows.length - 1;
    var fillC  = isAlt ? _XL_LGRAY : _XL_WHITE;
    vals.forEach(function(v, i) {
      var c = i + 1;
      var cell = row.getCell(c);
      var isNum = typeof v === 'number';
      _xCell(cell, v, {
        fill:  fillC,
        font:  {size:10},
        align: {horizontal: isNum?'right':'left', vertical:'middle', wrapText:true},
        border: {
          top:    isAlt  ? _bs(_XL_LGRAY,'thin') : _bs(_XL_WHITE,'thin'),
          bottom: isLast ? _bs(_XL_NAVY,'medium') : _bs(_XL_LGRAY,'thin'),
          left:   c===1  ? _bs(_XL_NAVY,'medium') : _bs(_XL_LGRAY,'thin'),
          right:  c===n  ? _bs(_XL_NAVY,'medium') : _bs(_XL_LGRAY,'thin'),
        },
      });
    });
  });
}

/* -----------------------------------------------------------------------
   Expense sheet  (n=10, A-J)
   ----------------------------------------------------------------------- */
function _buildCoordExpensesSheetXLSX(wb, settings, expenses, logoId, label) {
  var n        = 10;
  var tabTitle = 'Expenses Tracking' + (label ? '-' + label : '');
  var ws = wb.addWorksheet(tabTitle);
  ws.columns = [
    {width:8},{width:6},{width:14},{width:16},{width:14},
    {width:18},{width:32},{width:12},{width:24},{width:18}
  ];

  _addHeaderRows(ws, n, tabTitle, settings, logoId);

  /* Row 4: Name + Total */
  var expTotal = expenses.reduce(function(s,e){return s+(parseFloat(e.amount)||0);},0);
  var r4 = ws.getRow(4); r4.height = 22;
  function dgBdr(){ var s=_bs(_XL_DGRAY); return {top:s,bottom:s,left:s,right:s}; }
  _xCell(r4.getCell(1),  'Name',  {font:{bold:true,color:{argb:_XL_NAVY},size:10}, border:dgBdr(), align:{horizontal:'center',vertical:'middle'}});
  _xCell(r4.getCell(2),  settings.name||'', {font:{color:{argb:_XL_DGRAY},size:10}, border:dgBdr(), align:{horizontal:'left',vertical:'middle'}});
  ws.mergeCells(4,2,4,6);
  _xCell(r4.getCell(8), 'Total', {font:{bold:true,color:{argb:_XL_NAVY},size:10}, border:dgBdr(), align:{horizontal:'center',vertical:'middle'}});
  _xCell(r4.getCell(9), 'EGP '+Math.round(expTotal).toLocaleString(), {font:{color:{argb:_XL_DGRAY},size:10}, border:dgBdr(), align:{horizontal:'center',vertical:'middle'}});
  ws.mergeCells(4,9,4,10);

  _navySep(ws, 5, n);

  _addColHeaders(ws, 6, n, ['Month','Day','Project name','Site ID','Job Code','Category','Item Description','Amount','Comment','Coordinator']);

  var dataRows = expenses.map(function(e) {
    return [e.month||'', e.day||'', e.projectName||'', e.siteId||'', e.jobCode||'',
            e.category||'', e.itemDescription||'', parseFloat(e.amount)||0, e.comment||'',
            settings.coordName || e.coordinator || ''];
  });
  _addDataRows(ws, 7, n, dataRows);
  /* Amount numFmt */
  expenses.forEach(function(_,ri){ ws.getRow(7+ri).getCell(8).numFmt = '#,##0.00'; });

  var afterData = 7 + expenses.length;
  ws.getRow(afterData).height = 8;
  _addApprovalFooterXLSX(ws, settings, afterData+1, n);
}

/* -----------------------------------------------------------------------
   Fuel sheet  (n=13, A-M)
   ----------------------------------------------------------------------- */
function _buildCoordFuelSheetXLSX(wb, settings, fuel, logoId, label) {
  var n        = 13;
  var tabTitle = 'Fuel Tracking' + (label ? '-' + label : '');
  var ws = wb.addWorksheet(tabTitle);
  ws.columns = [
    {width:8},{width:6},{width:14},{width:16},{width:14},
    {width:12},{width:12},{width:12},{width:12},{width:16},{width:14},{width:12},{width:18}
  ];

  _addHeaderRows(ws, n, tabTitle, settings, logoId);

  /* Row 4: Name | Total | Fuel | Karta */
  var fuelTotal  = fuel.reduce(function(s,f){return s+(parseFloat(f.fuelAmount)||0);},0);
  var kartaTotal = fuel.reduce(function(s,f){return s+(parseFloat(f.kartaAmount)||0);},0);
  var r4 = ws.getRow(4); r4.height = 22;
  function dgBdr(){ var s=_bs(_XL_DGRAY); return {top:s,bottom:s,left:s,right:s}; }
  function lbl(c,v){ _xCell(r4.getCell(c),v,{font:{bold:true,color:{argb:_XL_NAVY},size:10},border:dgBdr(),align:{horizontal:'center',vertical:'middle'}}); }
  function val(c,v){ _xCell(r4.getCell(c),v,{font:{color:{argb:_XL_DGRAY},size:10},border:dgBdr(),align:{horizontal:'center',vertical:'middle'}}); }
  lbl(1,'Name');
  val(2, settings.name||'');  ws.mergeCells(4,2,4,3);
  lbl(4,'Total');
  val(5,'EGP '+Math.round(fuelTotal+kartaTotal).toLocaleString());  ws.mergeCells(4,5,4,6);
  lbl(7,'Fuel');
  val(8,'EGP '+Math.round(fuelTotal).toLocaleString());
  lbl(9,'Karta');
  val(10,'EGP '+Math.round(kartaTotal).toLocaleString());            ws.mergeCells(4,10,4,13);

  _navySep(ws, 5, n);

  _addColHeaders(ws, 6, n, ['Month','Day','Project name','Site ID','Job Code',
    'Start KM','End KM','Fuel Amount','Area','Driver','City','Karta Amount','Coordinator']);

  var dataRows = fuel.map(function(f) {
    return [f.month||'', f.day||'', f.projectName||'', f.siteId||'', f.jobCode||'',
            parseFloat(f.startKm)||0, parseFloat(f.endKm)||0, parseFloat(f.fuelAmount)||0,
            f.area||'', f.driver||'', f.city||'', parseFloat(f.kartaAmount)||0,
            settings.coordName || f.coordinator || ''];
  });
  _addDataRows(ws, 7, n, dataRows);
  /* Fuel + Karta numFmt */
  fuel.forEach(function(_,ri){ ws.getRow(7+ri).getCell(8).numFmt='#,##0.00'; ws.getRow(7+ri).getCell(12).numFmt='#,##0.00'; });

  var afterData = 7 + fuel.length;
  ws.getRow(afterData).height = 8;
  _addApprovalFooterXLSX(ws, settings, afterData+1, n);
}

/* -----------------------------------------------------------------------
   Rejected entries sheet (simple, no heavy styling needed)
   ----------------------------------------------------------------------- */
function _buildRejectedSheetXLSX(wb, rejectedExpenses, rejectedFuel) {
  var ws = wb.addWorksheet('Rejected Entries');
  ws.columns = [{width:10},{width:14},{width:14},{width:14},{width:18},{width:20}];
  var r1 = ws.getRow(1);
  _xCell(r1.getCell(1),'Rejected Entries — Excluded from Export',{font:{bold:true,size:12}});
  ws.mergeCells(1,1,1,6);
  var r3 = ws.getRow(3); r3.height = 22;
  ['Type','Date','Project','Site ID','Category / Area','Amount / Fuel (EGP)'].forEach(function(h,i){
    _xCell(r3.getCell(i+1),h,{fill:_XL_NAVY,font:{bold:true,color:{argb:_XL_WHITE},size:10},align:{horizontal:'center',vertical:'middle'}});
  });
  var dr = 4;
  rejectedExpenses.forEach(function(e){ var r=ws.getRow(dr++); r.height=18; ['Expense',e.date||'',e.projectName||'',e.siteId||'',e.category||'',parseFloat(e.amount)||0].forEach(function(v,i){r.getCell(i+1).value=v;}); });
  rejectedFuel.forEach(function(f){ var r=ws.getRow(dr++); r.height=18; ['Fuel',f.date||'',f.projectName||'',f.siteId||'',f.area||'',parseFloat(f.fuelAmount)||0].forEach(function(v,i){r.getCell(i+1).value=v;}); });
  if (dr===4) ws.getRow(4).getCell(1).value='No rejected entries.';
}

/* -----------------------------------------------------------------------
   DEAD CODE STUBS — referenced shapes kept so old SheetJS path compiles
   (these functions are never called from coordinator export.html)
   ----------------------------------------------------------------------- */
function _applyCoordStyles() { /* replaced by ExcelJS */ }
function _buildCoordExpensesSheet(s,e){ return {}; }
function _buildCoordFuelSheet(s,f){ return {}; }
function _buildRejectedSheet(e,f){ return {}; }
function _buildSummarySheet(){ return {}; }

function _applyCoordStyles_UNUSED(ws, numCols, dataStartRow, dataEndRow) {
  if (!ws || !ws['!ref']) return;

  var GREEN  = '00B050';
  var BLUE   = '1F3864';
  var LGREEN = 'E2EFDA';
  var WHITE  = 'FFFFFF';
  var BLACK  = '000000';
  var HEADER_ROW = 8;  /* row index of column labels */
  var NAME_ROW   = 4;  /* row index of Name / Total */

  function thin(rgb) { return { style: 'thin', color: { rgb: rgb || BLACK } }; }
  function borderAll() { var t = thin(); return { top: t, bottom: t, left: t, right: t }; }

  var range = XLSX.utils.decode_range(ws['!ref']);

  for (var r = range.s.r; r <= range.e.r; r++) {
    for (var c = 0; c < numCols; c++) {
      var ref = XLSX.utils.encode_cell({ r: r, c: c });
      if (!ws[ref]) ws[ref] = { v: '', t: 's' };

      var s = null;

      if (r === 0) {
        /* ── Title row: green bg, white bold text, centred ── */
        s = {
          fill:      { patternType: 'solid', fgColor: { rgb: GREEN } },
          font:      { bold: true, color: { rgb: WHITE }, sz: 14, name: 'Calibri' },
          alignment: { horizontal: 'center', vertical: 'center' },
        };

      } else if (r === NAME_ROW) {
        /* ── Name / Total row: light-green tint, bold labels ── */
        s = {
          fill:      { patternType: 'solid', fgColor: { rgb: LGREEN } },
          font:      { bold: (c === 2 || c === 6 || c === 7 || c === 9 || c === 10 || c === 12 || c === 13), name: 'Calibri', sz: 10 },
          border:    borderAll(),
          alignment: { vertical: 'center' },
        };

      } else if (r === HEADER_ROW) {
        /* ── Column labels: dark-blue bg, white bold, centred, wrapped ── */
        s = {
          fill:      { patternType: 'solid', fgColor: { rgb: BLUE } },
          font:      { bold: true, color: { rgb: WHITE }, sz: 10, name: 'Calibri' },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border:    borderAll(),
        };

      } else if (r >= dataStartRow && r <= dataEndRow) {
        /* ── Data rows: thin border all sides ── */
        s = {
          border:    borderAll(),
          alignment: { vertical: 'center', wrapText: true },
          font:      { name: 'Calibri', sz: 10 },
        };
      }

      if (s) ws[ref].s = s;
    }
  }

  /* Row heights */
  var rowHeights = [];
  rowHeights[0]         = { hpt: 32 };  /* title */
  rowHeights[NAME_ROW]  = { hpt: 22 };  /* name/total */
  rowHeights[HEADER_ROW]= { hpt: 40 };  /* column labels (allow wrap) */
  ws['!rows'] = rowHeights;

  /* Auto-filter on the column-label row (data columns only, skip blank A-B) */
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: HEADER_ROW, c: 2 },
      e: { r: HEADER_ROW, c: numCols - 1 },
    }),
  };
}


/* ==========================================================================
   COORDINATOR EXPORT — generateCoordinatorExcel(importData, reviewData)

   importData  — the object stored under 'imported_[id]' in localStorage
   reviewData  — the object stored under 'review_[id]':
                 { [entryId]: { status, coordinatorNote, reviewedAt } }

   Returns a SheetJS workbook. Caller downloads via triggerExcelDownload().
   ========================================================================== */

async function generateCoordinatorExcel(importData, reviewData) {
  var review  = reviewData || {};
  var member  = (importData && importData.teamMember) || {};
  var allExp  = (importData && importData.expenses)   || [];
  var allFuel = (importData && importData.fuel)       || [];

  var approvedExpenses = allExp.filter(function(e)  { return review[e.id] && review[e.id].status === 'approved'; });
  var approvedFuel     = allFuel.filter(function(f)  { return review[f.id] && review[f.id].status === 'approved'; });
  var rejectedExpenses = allExp.filter(function(e)  { return review[e.id] && review[e.id].status === 'rejected'; });
  var rejectedFuel     = allFuel.filter(function(f)  { return review[f.id] && review[f.id].status === 'rejected'; });

  /* Load coordinator name from coordinator app settings */
  var coordName = '';
  try {
    var _cs = localStorage.getItem('coord_settings');
    if (_cs) coordName = (JSON.parse(_cs).name || '').trim();
  } catch (_) {}

  /* Load coordinator tracking for Old/New classification */
  var trackingMap = null;
  try {
    var _ct = localStorage.getItem('coord_tracking');
    if (_ct) { var _ctd = JSON.parse(_ct); trackingMap = _ctd ? _ctd.map : null; }
  } catch (_) {}

  /* Derive settlement month/year from entries */
  var _MONS = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  var sMonth = null, sYear = null;
  var _allForDate = allExp.concat(allFuel);
  for (var _di = 0; _di < _allForDate.length; _di++) {
    var _de = _allForDate[_di];
    if (_de.date) {
      var _dp = _de.date.split('-');
      if (_dp.length === 3) {
        var _dm = _MONS[_dp[1].toLowerCase()];
        var _dy = parseInt(_dp[2], 10);
        if (_dm !== undefined && !isNaN(_dy)) { sMonth = _dm; sYear = _dy; break; }
      }
    }
  }

  /* Classify a single entry as 'new' or 'old' */
  function _classify(siteId) {
    if (!trackingMap || sMonth === null) return 'new';
    var sites = String(siteId || '').split(/[\/,\-–—\s]+/).map(function(s){return s.trim();}).filter(Boolean);
    for (var si = 0; si < sites.length; si++) {
      var ent = trackingMap[sites[si].toUpperCase()];
      var td  = ent ? (typeof ent === 'object' ? ent.taskDate : '') : '';
      if (!td) continue;
      var tDate = new Date(td);
      if (isNaN(tDate.getTime())) continue;
      var tY = tDate.getFullYear(), tM = tDate.getMonth();
      return (tY < sYear || (tY === sYear && tM < sMonth)) ? 'old' : 'new';
    }
    return 'new'; /* default: no task date → treat as New */
  }

  /* Split approved entries */
  var expNew = [], expOld = [];
  approvedExpenses.forEach(function(e) { (_classify(e.siteId) === 'old' ? expOld : expNew).push(e); });

  var fuelNew = [], fuelOld = [];
  approvedFuel.forEach(function(f) { (_classify(f.siteId) === 'old' ? fuelOld : fuelNew).push(f); });

  var settings = {
    name:           member.name           || '',
    trackingNumber: member.trackingNumber || (importData && importData.trackingNumber) || 0,
    accountType:    member.accountType    || 'New',
    coordName:      coordName,
  };

  var logoBuffer = await _fetchLogo();

  /* Build workbook for a given label ('New' or 'Old') */
  async function _buildWb(exp, fuel, label) {
    var wb     = new ExcelJS.Workbook();
    wb.creator = 'Expense-Fuel Settlement Checker';
    wb.created = new Date();
    var lId = (logoBuffer && wb.addImage) ? wb.addImage({ buffer: logoBuffer, extension: 'jpeg' }) : null;
    _buildCoordExpensesSheetXLSX(wb, settings, exp,  lId, label);
    _buildCoordFuelSheetXLSX(wb,     settings, fuel, lId, label);
    if (rejectedExpenses.length + rejectedFuel.length > 0) {
      _buildRejectedSheetXLSX(wb, rejectedExpenses, rejectedFuel);
    }
    return wb;
  }

  var hasNew = expNew.length > 0 || fuelNew.length > 0;
  var hasOld = expOld.length > 0 || fuelOld.length > 0;

  return {
    new: hasNew ? await _buildWb(expNew, fuelNew, 'New') : null,
    old: hasOld ? await _buildWb(expOld, fuelOld, 'Old') : null,
  };
}

/* --------------------------------------------------------------------------
   _buildCoordExpensesSheet
   Matches the original template column layout exactly:
   A–B blank | C Month | D Day | E Project | F Site ID | G Job Code |
   H Category | I Item Description | J Amount | K Comment | L Coordinator
   -------------------------------------------------------------------------- */

function _buildCoordExpensesSheet(settings, expenses) {
  var NCOLS    = 12; /* A–L */
  var expTotal = expenses.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);

  var rows = [];

  /* Row 0 — Title (merged across all columns) */
  rows.push(_blankRow(NCOLS, { 2: 'Expenses Tracking' }));

  /* Row 1 — Account / VF */
  rows.push(_blankRow(NCOLS, { 2: 'Account', 8: 'VF' }));

  /* Rows 2–3 — empty spacer */
  rows.push(new Array(NCOLS).fill(''));
  rows.push(new Array(NCOLS).fill(''));

  /* Row 4 — Name / Total */
  rows.push(_blankRow(NCOLS, {
    2: 'Name',
    3: settings.name || '',
    7: 'Total',
    8: 'EGP ' + (Math.round(expTotal * 100) / 100),
  }));

  /* Rows 5–7 — empty spacer */
  rows.push(new Array(NCOLS).fill(''));
  rows.push(new Array(NCOLS).fill(''));
  rows.push(new Array(NCOLS).fill(''));

  /* Row 8 — Column headers */
  rows.push(['', '', 'Month', 'Day', 'Project name', 'Site ID', 'Job Code',
             'Category', 'Item Description', 'Amount', 'Comment', 'Coordinator']);

  /* Row 9+ — Data */
  expenses.forEach(function (e) {
    rows.push([
      '', '',
      e.month           || '',
      e.day             || '',
      e.projectName     || '',
      e.siteId          || '',
      e.jobCode         || '',
      e.category        || '',
      e.itemDescription || '',
      parseFloat(e.amount) || 0,
      e.comment         || '',
      e.coordinator     || '',
    ]);
  });

  rows.push(new Array(NCOLS).fill(''));
  _pushApprovalFooter(rows, settings, NCOLS);

  var ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NCOLS - 1 } }, /* Title */
    { s: { r: 4, c: 3 }, e: { r: 4, c: 6 } },          /* Name value spans D–G */
  ];

  ws['!cols'] = [
    { wch: 4  }, /* A blank     */
    { wch: 4  }, /* B blank     */
    { wch: 8  }, /* C Month     */
    { wch: 6  }, /* D Day       */
    { wch: 14 }, /* E Project   */
    { wch: 16 }, /* F Site ID   */
    { wch: 14 }, /* G Job Code  */
    { wch: 18 }, /* H Category  */
    { wch: 32 }, /* I Desc      */
    { wch: 12 }, /* J Amount    */
    { wch: 24 }, /* K Comment   */
    { wch: 18 }, /* L Coord     */
  ];

  /* Apply colours / borders (xlsx-js-style only; ignored by plain SheetJS) */
  var dataEndRow = 8 + expenses.length;  /* header=row8, data starts row9 */
  _applyCoordStyles(ws, NCOLS, 9, dataEndRow);

  return ws;
}

/* --------------------------------------------------------------------------
   _buildCoordFuelSheet
   Matches the original template column layout exactly:
   A–B blank | C Month | D Day | E Project | F Site ID | G Job Code |
   H Start KM | I End KM | J Fuel Amount | K Area | L Driver | M City |
   N Karta Amount | O Coordinator
   -------------------------------------------------------------------------- */

function _buildCoordFuelSheet(settings, fuel) {
  var NCOLS     = 15; /* A–O */
  var fuelTotal  = fuel.reduce(function (s, e) { return s + (parseFloat(e.fuelAmount)  || 0); }, 0);
  var kartaTotal = fuel.reduce(function (s, e) { return s + (parseFloat(e.kartaAmount) || 0); }, 0);

  var rows = [];

  /* Row 0 — Title */
  rows.push(_blankRow(NCOLS, { 2: 'Fuel Tracking' }));

  /* Row 1 — Account / VF */
  rows.push(_blankRow(NCOLS, { 2: 'Account', 10: 'VF' }));

  /* Rows 2–3 — empty spacer */
  rows.push(new Array(NCOLS).fill(''));
  rows.push(new Array(NCOLS).fill(''));

  /* Row 4 — Name / Fuel / Karta / Total */
  rows.push(_blankRow(NCOLS, {
    2: 'Name',
    3: settings.name || '',
    6: 'Total',
    7: 'EGP ' + (Math.round((fuelTotal + kartaTotal) * 100) / 100),
    9:  'Fuel',
    10: 'EGP ' + (Math.round(fuelTotal  * 100) / 100),
    12: 'Karta',
    13: 'EGP ' + (Math.round(kartaTotal * 100) / 100),
  }));

  /* Rows 5–7 — empty spacer */
  rows.push(new Array(NCOLS).fill(''));
  rows.push(new Array(NCOLS).fill(''));
  rows.push(new Array(NCOLS).fill(''));

  /* Row 8 — Column headers */
  rows.push(['', '', 'Month', 'Day', 'Project name', 'Site ID', 'Job Code',
             'Start KM', 'End KM', 'Fuel Amount', 'Area', 'Driver', 'City',
             'Karta Amount', 'Coordinator']);

  /* Row 9+ — Data */
  fuel.forEach(function (e) {
    rows.push([
      '', '',
      e.month  || '',
      e.day    || '',
      e.projectName    || '',
      e.siteId         || '',
      e.jobCode        || '',
      parseFloat(e.startKm)    || 0,
      parseFloat(e.endKm)      || 0,
      parseFloat(e.fuelAmount) || 0,
      e.area           || '',
      e.driver         || '',
      e.city           || '',
      parseFloat(e.kartaAmount) || 0,
      e.coordinator    || '',
    ]);
  });

  rows.push(new Array(NCOLS).fill(''));
  _pushApprovalFooter(rows, settings, NCOLS);

  var ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NCOLS - 1 } }, /* Title */
    { s: { r: 4, c: 3 }, e: { r: 4, c: 5 } },          /* Name value spans D–F */
  ];

  ws['!cols'] = [
    { wch: 4  }, /* A blank       */
    { wch: 4  }, /* B blank       */
    { wch: 8  }, /* C Month       */
    { wch: 6  }, /* D Day         */
    { wch: 14 }, /* E Project     */
    { wch: 16 }, /* F Site ID     */
    { wch: 14 }, /* G Job Code    */
    { wch: 12 }, /* H Start KM    */
    { wch: 12 }, /* I End KM      */
    { wch: 12 }, /* J Fuel Amount */
    { wch: 12 }, /* K Area        */
    { wch: 16 }, /* L Driver      */
    { wch: 12 }, /* M City        */
    { wch: 12 }, /* N Karta       */
    { wch: 18 }, /* O Coordinator */
  ];

  /* Apply colours / borders (xlsx-js-style only; ignored by plain SheetJS) */
  var dataEndRow = 8 + fuel.length;
  _applyCoordStyles(ws, NCOLS, 9, dataEndRow);

  return ws;
}

/* --------------------------------------------------------------------------
   _buildFlaggedSheet — all flagged expenses + fuel in one combined table
   Columns: Type | Date | Project | Site ID | Category/Area | Amount/Fuel | Note
   -------------------------------------------------------------------------- */

function _buildRejectedSheet(rejectedExpenses, rejectedFuel) {
  var rows = [];

  rows.push(['Rejected Entries — Excluded from Export']);
  rows.push([]);
  rows.push(['Type', 'Date', 'Project', 'Site ID', 'Category / Area', 'Amount / Fuel (EGP)']);

  rejectedExpenses.forEach(function (e) {
    rows.push([
      'Expense',
      e.date        || '',
      e.projectName || '',
      e.siteId      || '',
      e.category    || '',
      parseFloat(e.amount) || 0,
    ]);
  });

  rejectedFuel.forEach(function (f) {
    rows.push([
      'Fuel',
      f.date        || '',
      f.projectName || '',
      f.siteId      || '',
      f.area        || '',
      parseFloat(f.fuelAmount) || 0,
    ]);
  });

  if (rejectedExpenses.length === 0 && rejectedFuel.length === 0) {
    rows.push(['No rejected entries.', '', '', '', '', '']);
  }

  var ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  ws['!cols'] = [
    { wch: 10 }, /* Type            */
    { wch: 14 }, /* Date            */
    { wch: 14 }, /* Project         */
    { wch: 14 }, /* Site ID         */
    { wch: 18 }, /* Category / Area */
    { wch: 20 }, /* Amount          */
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
