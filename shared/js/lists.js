/* ==========================================================================
   ExpenseFuel Tracker — Reference Lists
   Plain global — no ES module exports. Include before any app JS.
   Usage: LISTS.projects  |  populateSelect(el, 'projects', defaultValue)
   ========================================================================== */

const LISTS = {

  /* From CLAUDE.md — exact values */
  projects: [
    'EXP',
    'ROT',
    'ML',
    'Survey',
    'NFM',
    'Fiber',
    'POC3',
    'MTX',
    'roll out',
  ],

  categories: [
    'Labor',
    'Material',
    'Copy',
    'Transportation',
    'Medical',
    'Car Oil',
    'WH Rent',
    'Allowance',
    'Team Rent',
    'Internet',
    'Car Rent',
    'Mobile & Communication',
    'Accommodation',
    'Logistic',
    'Site Guard',
    'Other',
  ],

  subCategories: [
    'Labor',
    'Material',
    'Copy',
    'Transportation',
    'Medical',
    'Car Oil',
    'WH Rent',
    'Allowance',
    'Team Rent',
    'Internet',
    'Car Rent',
  ],

  accountTypes: [
    'New',
    'VF',
  ],

  months: [
    'Jan', 'Feb', 'Mar', 'Apr',
    'May', 'Jun', 'Jul', 'Aug',
    'Sep', 'Oct', 'Nov', 'Dec',
  ],

  /* Days 1–31 */
  days: Array.from({ length: 31 }, function (_, i) { return i + 1; }),

  /* Current year and previous year — computed at load time */
  years: (function () {
    var y = new Date().getFullYear();
    return [y, y - 1];
  }()),

  areas: [
    'delta',
    'cairo',
    'alex',
    'upper egypt',
    'sinai',
    'canal',
  ],
};

/* ==========================================================================
   populateSelect(selectElement, listKey, defaultValue)

   Clears the <select>, appends a blank placeholder option, then appends one
   <option> per item in LISTS[listKey].  If defaultValue matches an item it is
   marked selected; otherwise the blank option stays selected.

   @param {HTMLSelectElement} selectElement  - the <select> to populate
   @param {string}            listKey        - key into LISTS (e.g. 'projects')
   @param {string|number}     [defaultValue] - value to pre-select (optional)
   ========================================================================== */
function populateSelect(selectElement, listKey, defaultValue) {
  if (!selectElement || !LISTS[listKey]) return;

  var items = LISTS[listKey];
  var matched = false;

  /* Clear existing options */
  selectElement.innerHTML = '';

  /* Blank placeholder */
  var blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'Select...';
  blank.disabled = true;
  blank.selected = true;
  selectElement.appendChild(blank);

  /* One option per list item */
  for (var i = 0; i < items.length; i++) {
    var opt = document.createElement('option');
    opt.value = items[i];
    opt.textContent = items[i];

    if (defaultValue !== undefined && defaultValue !== null &&
        String(items[i]) === String(defaultValue)) {
      opt.selected = true;
      blank.selected = false;
      matched = true;
    }

    selectElement.appendChild(opt);
  }

  return matched;
}
