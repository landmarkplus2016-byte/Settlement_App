/* ==========================================================================
   ExpenseFuel Tracker — Shared Validation Rules
   Plain global — no ES module exports.
   Depends on: TRANSLATIONS (translations.js), LISTS (lists.js)
   Include order: translations.js → lists.js → utils.js → validations.js
   ========================================================================== */

/* --------------------------------------------------------------------------
   PRIVATE HELPERS
   -------------------------------------------------------------------------- */

/* Current active language from localStorage (set by applyLanguage in utils.js) */
function _lang() {
  return localStorage.getItem('lang') || 'en';
}

/* Safe translation lookup — falls back to key if missing */
function _t(key) {
  const lang = _lang();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) ? TRANSLATIONS[lang][key] : key;
}

/* Field-name-aware "is required" message — bilingual without extra keys */
function _required(fieldKey) {
  const label = _t(fieldKey);
  return _lang() === 'ar'
    ? `${label}: مطلوب`
    : `${label}: required`;
}

/* Parse "16-Apr-2026" → Date object (midnight local) */
function _parseEntryDate(dateStr) {
  if (!dateStr) return null;
  const MONTHS = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = MONTHS[parts[1]];
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || m === undefined || isNaN(y)) return null;
  return new Date(y, m, d);
}

/* Compare two parsed dates: -1 / 0 / 1 */
function _dateCmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/* Check a value is a finite number > 0 */
function _isPositive(val) {
  const n = parseFloat(val);
  return isFinite(n) && n > 0;
}

/* Check a value is a finite non-negative number */
function _isValidKm(val) {
  const n = parseFloat(val);
  return isFinite(n) && n >= 0;
}

/* Non-empty string check */
function _notEmpty(val) {
  return typeof val === 'string' && val.trim() !== '';
}

/* --------------------------------------------------------------------------
   validateExpenseEntry(entry)
   Returns [] if valid, otherwise array of human-readable error strings.
   -------------------------------------------------------------------------- */
function validateExpenseEntry(entry) {
  const errors = [];
  if (!entry) return [_t('missingField')];

  if (!_notEmpty(entry.siteId))      errors.push(_required('siteId'));
  if (!_notEmpty(entry.jobCode))     errors.push(_required('jobCode'));
  if (!_notEmpty(entry.category))    errors.push(_required('category'));
  if (!_notEmpty(entry.subCategory)) errors.push(_required('subCategory'));
  if (!_notEmpty(entry.coordinator)) errors.push(_required('coordinator'));

  if (!_isPositive(entry.amount)) {
    errors.push(_t('zeroAmount'));
  }

  if (!LISTS.projects.includes(entry.projectName)) {
    errors.push(_t('invalidProject'));
  }

  return errors;
}

/* --------------------------------------------------------------------------
   validateFuelEntry(entry)
   Returns [] if valid, otherwise array of human-readable error strings.
   -------------------------------------------------------------------------- */
function validateFuelEntry(entry) {
  const errors = [];
  if (!entry) return [_t('missingField')];

  if (!_notEmpty(entry.siteId))      errors.push(_required('siteId'));
  if (!_notEmpty(entry.jobCode))     errors.push(_required('jobCode'));
  if (!_notEmpty(entry.coordinator)) errors.push(_required('coordinator'));

  const startKm = parseFloat(entry.startKm);
  const endKm   = parseFloat(entry.endKm);

  if (!_isValidKm(entry.startKm)) {
    errors.push(_required('startKm'));
  }

  if (!_isValidKm(entry.endKm) || endKm <= startKm) {
    const label = _t('endKm');
    errors.push(
      _lang() === 'ar'
        ? `${label}: يجب أن يكون أكبر من كيلومتر البداية`
        : `${label}: must be greater than start KM`
    );
  }

  if (!_isPositive(entry.fuelAmount)) {
    errors.push(_t('zeroAmount'));
  }

  if (!LISTS.projects.includes(entry.projectName)) {
    errors.push(_t('invalidProject'));
  }

  return errors;
}

/* --------------------------------------------------------------------------
   validateKmContinuity(fuelEntries)
   Sorts entries by date, checks entry[N].startKm === entry[N-1].endKm.
   Returns [] if no mismatches, otherwise array of { index, entryId, message }.
   Note: index is position in the sorted array, not the original array.
   -------------------------------------------------------------------------- */
function validateKmContinuity(fuelEntries) {
  if (!Array.isArray(fuelEntries) || fuelEntries.length < 2) return [];

  const sorted = fuelEntries.slice().sort((a, b) => {
    const da = _parseEntryDate(a.date);
    const db = _parseEntryDate(b.date);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return _dateCmp(da, db);
  });

  const issues = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevEnd  = parseFloat(prev.endKm);
    const currStart = parseFloat(curr.startKm);

    if (!isFinite(prevEnd) || !isFinite(currStart) || prevEnd !== currStart) {
      const msg = _lang() === 'ar'
        ? `كيلومتر البداية (${currStart}) لا يساوي كيلومتر النهاية السابق (${prevEnd})`
        : `Start KM (${currStart}) does not match previous end KM (${prevEnd})`;

      issues.push({
        index:   i,
        entryId: curr.id || null,
        date:    curr.date || null,
        siteId:  curr.siteId || null,
        message: msg,
      });
    }
  }

  return issues;
}

/* --------------------------------------------------------------------------
   validateExpenseTotals(expenses, declaredTotal)
   Returns { passed, actual, declared, difference }
   -------------------------------------------------------------------------- */
function validateExpenseTotals(expenses, declaredTotal) {
  const actual   = (expenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const declared = parseFloat(declaredTotal) || 0;
  const diff     = Math.round((actual - declared) * 100) / 100; /* avoid float drift */

  return {
    passed:     diff === 0,
    actual:     Math.round(actual * 100) / 100,
    declared,
    difference: diff,
  };
}

/* --------------------------------------------------------------------------
   validateFuelTotals(fuel, declaredFuelTotal, declaredKartaTotal)
   Returns { fuelPassed, kartaPassed, actualFuel, actualKarta, declaredFuel, declaredKarta }
   -------------------------------------------------------------------------- */
function validateFuelTotals(fuel, declaredFuelTotal, declaredKartaTotal) {
  const entries = fuel || [];

  const actualFuel  = entries.reduce((sum, e) => sum + (parseFloat(e.fuelAmount)  || 0), 0);
  const actualKarta = entries.reduce((sum, e) => sum + (parseFloat(e.kartaAmount) || 0), 0);

  const declaredFuel  = parseFloat(declaredFuelTotal)  || 0;
  const declaredKarta = parseFloat(declaredKartaTotal) || 0;

  const fuelDiff  = Math.round((actualFuel  - declaredFuel)  * 100) / 100;
  const kartaDiff = Math.round((actualKarta - declaredKarta) * 100) / 100;

  return {
    fuelPassed:   fuelDiff  === 0,
    kartaPassed:  kartaDiff === 0,
    actualFuel:   Math.round(actualFuel  * 100) / 100,
    actualKarta:  Math.round(actualKarta * 100) / 100,
    declaredFuel,
    declaredKarta,
    fuelDifference:  fuelDiff,
    kartaDifference: kartaDiff,
  };
}

/* --------------------------------------------------------------------------
   validateDateSequence(entries)
   Checks that entries (expenses or fuel — both have a `date` field) are in
   non-decreasing chronological order as they appear in the array.
   Returns [] if in order, otherwise array of { index, entryId, date, message }.
   -------------------------------------------------------------------------- */
function validateDateSequence(entries) {
  if (!Array.isArray(entries) || entries.length < 2) return [];

  const issues = [];

  for (let i = 1; i < entries.length; i++) {
    const prev = _parseEntryDate(entries[i - 1].date);
    const curr = _parseEntryDate(entries[i].date);

    if (!prev || !curr) continue; /* skip unparseable dates */

    if (_dateCmp(curr, prev) < 0) {
      const msg = _lang() === 'ar'
        ? `التاريخ ${entries[i].date} خارج الترتيب الزمني`
        : `Date ${entries[i].date} is out of chronological order`;

      issues.push({
        index:   i,
        entryId: entries[i].id   || null,
        date:    entries[i].date || null,
        message: msg,
      });
    }
  }

  return issues;
}

/* --------------------------------------------------------------------------
   runAllValidations(importData)

   importData shape expected:
   {
     expenses:             [],
     fuel:                 [],
     declaredExpenseTotal: number | undefined,
     declaredFuelTotal:    number | undefined,
     declaredKartaTotal:   number | undefined,
   }

   Returns:
   {
     expenseErrors:   [{ index, entryId, errors: [] }],
     fuelErrors:      [{ index, entryId, errors: [] }],
     kmIssues:        [{ index, entryId, date, siteId, message }],
     totalIssues:     { expense: {...}, fuel: {...} } | null,
     dateIssues:      { expenses: [], fuel: [] },
     totalIssueCount: number,
   }
   -------------------------------------------------------------------------- */
function runAllValidations(importData) {
  const expenses = importData.expenses || [];
  const fuel     = importData.fuel     || [];

  /* Per-entry validation */
  const expenseErrors = [];
  expenses.forEach((entry, i) => {
    const errs = validateExpenseEntry(entry);
    if (errs.length) {
      expenseErrors.push({ index: i, entryId: entry.id || null, errors: errs });
    }
  });

  const fuelErrors = [];
  fuel.forEach((entry, i) => {
    const errs = validateFuelEntry(entry);
    if (errs.length) {
      fuelErrors.push({ index: i, entryId: entry.id || null, errors: errs });
    }
  });

  /* KM continuity across all fuel entries */
  const kmIssues = validateKmContinuity(fuel);

  /* Total matching — only run if declared totals were provided */
  let totalIssues = null;
  const hasDeclaredExpense = importData.declaredExpenseTotal !== undefined;
  const hasDeclaredFuel    = importData.declaredFuelTotal    !== undefined;

  if (hasDeclaredExpense || hasDeclaredFuel) {
    totalIssues = {
      expense: hasDeclaredExpense
        ? validateExpenseTotals(expenses, importData.declaredExpenseTotal)
        : null,
      fuel: hasDeclaredFuel
        ? validateFuelTotals(fuel, importData.declaredFuelTotal, importData.declaredKartaTotal)
        : null,
    };
  }

  /* Date sequence */
  const dateIssues = {
    expenses: validateDateSequence(expenses),
    fuel:     validateDateSequence(fuel),
  };

  /* Total failed checks for quick badge display */
  const totalMismatchCount =
    (totalIssues && totalIssues.expense && !totalIssues.expense.passed ? 1 : 0) +
    (totalIssues && totalIssues.fuel    && !totalIssues.fuel.fuelPassed  ? 1 : 0) +
    (totalIssues && totalIssues.fuel    && !totalIssues.fuel.kartaPassed  ? 1 : 0);

  const totalIssueCount =
    expenseErrors.length +
    fuelErrors.length    +
    kmIssues.length      +
    dateIssues.expenses.length +
    dateIssues.fuel.length     +
    totalMismatchCount;

  return {
    expenseErrors,
    fuelErrors,
    kmIssues,
    totalIssues,
    dateIssues,
    totalIssueCount,
  };
}
