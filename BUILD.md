# ExpenseFuel Tracker — Build Plan

> **How to use this file:**
> Each sub-step has one prompt block — copy it and paste it into Claude Code (VS Code).
> One prompt = one file. This keeps every prompt fast and prevents token interruptions.
> Always complete and verify each step before moving to the next.
> CLAUDE.md in the repo root gives Claude Code full context automatically.

---

## Before You Start

1. Create a GitHub repo (e.g. `expensefuel-tracker`) and clone it locally
2. Open the folder in VS Code with Claude Code installed
3. Place `CLAUDE.md` in the repo root
4. Start from Stage 1, Step 1 — paste each prompt, verify, then continue

---

## ─────────────────────────────────────────
## STAGE 1 — Shared Foundation
## ─────────────────────────────────────────

### Step 1-A — /shared/css/common.css

```
Read CLAUDE.md fully.

Create /shared/css/common.css — the full design system for both apps.

Include:
- CSS reset (box-sizing, margin/padding 0, img max-width)
- :root CSS custom properties exactly as defined in CLAUDE.md (all colors, shadows,
  radii, spacing, font sizes, transition)
- Base typography: font-family var(--font), color var(--color-text-primary),
  background var(--color-bg), line-height 1.6
- RTL support block: [dir="rtl"] selectors that flip text-align, padding, margin,
  border sides. Numbers and code fields (.ltr-field) always stay LTR.
- All component classes from CLAUDE.md: .btn and all variants, .card and sub-elements,
  .form-group .form-label .form-input .form-select .form-textarea .form-error .form-hint,
  .badge and all status variants, .stat-card .stat-icon .stat-value .stat-label,
  .table-wrapper table thead tbody row styles (.row-flagged .row-approved),
  .toast and all status variants with slide-in keyframe animation,
  sticky navbar base (.navbar), bottom nav base (.bottom-nav),
  .empty-state (centered icon + message + action button),
  .settings-banner (warning banner shown when settings incomplete),
  .divider (horizontal rule with optional label)
- Responsive helpers: .container (max-width 900px, auto margin, padding),
  .grid-2 (2-col on desktop, 1-col mobile), .grid-3 (3-col desktop, 1-col mobile)
- Utility classes: .text-center .text-right .mt-4 .mb-4 .hidden .flex .flex-col
  .items-center .justify-between .gap-2 .gap-4 .w-full .fw-600 .fw-700
- Mobile-first: base styles for 390px, @media (min-width: 768px) for desktop
```

---

### Step 1-B — /shared/js/translations.js

```
Read CLAUDE.md fully.

Create /shared/js/translations.js as a plain JS global (no ES modules).

Define: const TRANSLATIONS = { en: {...}, ar: {...} }

The EN and AR objects must cover every UI string used across both apps:

Navigation: dashboard, settings, addExpense, addFuel, myEntries, export,
import, reviewExpenses, reviewFuel, back, home

Actions: save, cancel, edit, delete, submit, confirm, clear, approve, flag,
approveAll, flagAll, exportExcel, exportJson, importFile, loadSample, saveReviews

Form labels: name, mobile, project, siteId, jobCode, category, subCategory,
amount, comment, coordinator, trackingNumber, month, day, date, startKm, endKm,
distance, fuelAmount, kartaAmount, area, driver, city, total, newFuel, karta,
description, language, accountType, defaultCoordinator, defaultProject, defaultDriver

Status: pending, approved, flagged, reviewed, notReviewed

Messages: settingsRequired, noEntries, noImports, saveSuccess, deleteSuccess,
exportSuccess, importSuccess, deleteConfirm, clearConfirm, kmMismatch,
zeroAmount, missingField, invalidProject, validationIssues, allApproved,
settingsSaved, loadedSampleData

Dashboard: totalExpenses, totalFuel, expenseEntries, fuelEntries,
reviewProgress, recentEntries, quickActions, importedReports

Export/Import: exportSummary, expenseCount, fuelCount, expenseTotal,
fuelTotal, kartaTotal, dateRange, fieldMember, trackingNum,
clearAfterExport, exportChecklist, approvedEntries, flaggedEntries,
pendingEntries

Approval footer (Arabic only needed, keep EN same):
approval, accountsManager, responsibleManager

App titles: fieldAppTitle (ExpenseFuel — Field), coordAppTitle (ExpenseFuel — Coordinator)

Also define: const DEFAULT_LANG = 'en'
```

---

### Step 1-C — /shared/js/lists.js

```
Read CLAUDE.md fully.

Create /shared/js/lists.js as a plain JS global.

Define: const LISTS = { projects, categories, subCategories, accountTypes, months, areas }

Use exact values from CLAUDE.md reference lists section.

Also add:
- LISTS.days: array of numbers 1–31
- LISTS.years: [current year, current year - 1]
- LISTS.areas: ['delta', 'cairo', 'alex', 'upper egypt', 'sinai', 'canal']

Add a helper function at the bottom:
populateSelect(selectElement, listKey, defaultValue)
— clears the select, adds a blank "Select..." option, then adds options from LISTS[listKey]
— if defaultValue is provided, sets it as selected
```

---

### Step 1-D — /shared/js/utils.js

```
Read CLAUDE.md fully.

Create /shared/js/utils.js as a plain JS global (no ES modules).

Implement these functions:

generateId()
— returns a UUID v4 string using Math.random()

formatDate(day, month, year)
— returns string like "16-Apr-2026"

getCurrentMonth()
— returns current month abbreviation e.g. "Apr"

getCurrentDay()
— returns current day number

getCurrentYear()
— returns current 4-digit year number

saveToStorage(key, data)
— JSON.stringify(data) and save to localStorage

loadFromStorage(key, fallback = null)
— JSON.parse from localStorage, return fallback if null or parse error

getSettings()
— return loadFromStorage('settings', null)

isSettingsComplete()
— return true if settings.name and settings.mobile are non-empty strings

guardSettings(redirectPath)
— if !isSettingsComplete(), redirect to redirectPath (e.g. '../field-app/settings.html')

applyLanguage(lang)
— set document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
— set document.documentElement.setAttribute('lang', lang)
— query all [data-i18n] elements, set their textContent from TRANSLATIONS[lang][key]
— query all [data-i18n-placeholder] elements, set their placeholder attribute
— save lang to localStorage key 'lang'

initLanguage()
— load lang from localStorage key 'lang', fallback to settings.language, fallback to 'en'
— call applyLanguage(lang)
— return the active lang string

showToast(message, type = 'success')
— type: 'success' | 'error' | 'warning' | 'info'
— creates toast element using .toast .toast-[type] classes from common.css
— appends to #toast-container (create it if not present)
— auto-removes after 3000ms with fade-out

formatCurrency(amount)
— returns string like "250 EGP"

formatNumber(num)
— returns number with commas e.g. "1,400"

calculateDistance(startKm, endKm)
— returns endKm - startKm, or 0 if invalid
```

---

### Step 1-E — /shared/js/validations.js

```
Read CLAUDE.md fully.

Create /shared/js/validations.js as a plain JS global.

Implement:

validateExpenseEntry(entry)
— checks: siteId not empty, jobCode not empty, category not empty,
  subCategory not empty, coordinator not empty, amount > 0, projectName in LISTS.projects
— returns array of error message strings (empty array = valid)

validateFuelEntry(entry)
— checks: siteId not empty, jobCode not empty, coordinator not empty,
  startKm is valid number, endKm > startKm, fuelAmount > 0, projectName in LISTS.projects
— returns array of error message strings

validateKmContinuity(fuelEntries)
— sort entries by date ascending
— for each entry N where N > 0: check entry[N].startKm === entry[N-1].endKm
— returns array of { index, entryId, message } objects for each mismatch

validateExpenseTotals(expenses, declaredTotal)
— sum all expense amounts
— returns { passed: bool, actual: number, declared: number, difference: number }

validateFuelTotals(fuel, declaredFuelTotal, declaredKartaTotal)
— sum fuelAmount and kartaAmount separately
— returns { fuelPassed, kartaPassed, actualFuel, actualKarta, declaredFuel, declaredKarta }

validateDateSequence(entries)
— check entries are in chronological date order
— returns array of { index, entryId, message } for out-of-order entries

runAllValidations(importData)
— runs all validation functions on the full import
— returns { expenseErrors, fuelErrors, kmIssues, totalIssues, dateIssues, totalIssueCount }
```

---

## ─────────────────────────────────────────
## STAGE 2 — Field App Shell & Settings
## ─────────────────────────────────────────

### Step 2-A — /field-app/css/app.css

```
Read CLAUDE.md fully.

Create /field-app/css/app.css — field app specific styles that extend common.css.

Include:
- Link/import reference note at top (common.css loaded before this in HTML)
- Navbar customization: app name "ExpenseFuel — Field" in navy bold,
  left side logo area, right side: EN|AR pill toggle + settings icon link
- .lang-toggle: pill button pair (EN | AR), active side fills navy
- Bottom navigation bar (.bottom-nav): 5 tabs — Dashboard (🏠), Expenses (📋),
  Fuel (⛽), Entries (📂), Export (📤)
  Active tab: navy color + small dot indicator below icon
- .dashboard-grid: responsive grid for stat tiles (2 cols mobile, 4 cols desktop)
- .quick-actions: horizontal scroll row of action buttons on mobile
- .recent-list: compact list of recent entries with icon, description, amount, date
- .settings-complete-indicator: small green dot in navbar when settings are filled
- .warning-banner: prominent yellow card shown when settings are missing,
  with an arrow button to go to settings
- Page content area: padding-bottom 80px on mobile (space for bottom nav),
  padding-top 70px (space for sticky navbar)
```

---

### Step 2-B — /field-app/js/app.js

```
Read CLAUDE.md fully.

Create /field-app/js/app.js — runs on every field app page.

On DOMContentLoaded:
1. Call initLanguage() from utils.js
2. Set active class on bottom nav item matching current page filename
3. Check isSettingsComplete() — if false, show .warning-banner element (unhide it)
   and update the settings indicator dot to red; if true, dot is green
4. Language toggle pill: add click handlers to EN and AR buttons,
   on click: call applyLanguage(lang), update active state of pill buttons,
   save to localStorage

Each HTML page will include this script. It handles global init only.
No page-specific logic here.
```

---

### Step 2-C — /field-app/settings.html

```
Read CLAUDE.md fully.

Create /field-app/settings.html — the settings page for field team members.

Structure:
- Standard HTML5 boilerplate
- In <head>: link shared/css/common.css, field-app/css/app.css
- In <head>: script tags for shared/js/utils.js, shared/js/translations.js,
  shared/js/lists.js, then field-app/js/app.js, then field-app/js/settings.js
- SheetJS CDN script tag (needed on all pages)
- Sticky navbar with app name and language toggle
- Page title: data-i18n="settings"
- Form card with these fields (all .form-group .form-label .form-input pattern):
  * Full Name (text, required, data-i18n-placeholder)
  * Mobile Number (tel, required)
  * Tracking Number (number, required, min 1, hint: "Used in exported filenames")
  * Account Type (select: New / VF)
  * Default Coordinator (text, optional)
  * Default Project (select from LISTS.projects, optional, empty option first)
  * Default Driver (text, optional)
  * Language (two radio buttons: English / العربية, styled as toggle)
- Save button (.btn.btn-primary.w-full) + optional Clear All button (.btn-ghost.btn-danger)
- Toast container div#toast-container

No <form> submit — use button onclick only.
```

---

### Step 2-D — /field-app/js/settings.js

```
Read CLAUDE.md fully.

Create /field-app/js/settings.js

loadSettings()
— call getSettings() from utils.js
— if settings exist, populate each form field by its id
— set the correct radio for language
— set selected option on project select

saveSettings()
— read all form field values
— validate: name and mobile and trackingNumber must not be empty
— if invalid: show inline .form-error under each failing field, return
— build settings object per CLAUDE.md data model
— call saveToStorage('settings', settings)
— call applyLanguage(settings.language)
— show success toast via showToast()
— update the navbar settings indicator (green dot)

clearSettings()
— show a confirm dialog styled as a modal (no browser confirm())
— if confirmed: localStorage.removeItem('settings'), reload page

On DOMContentLoaded:
— call loadSettings()
— wire Save button to saveSettings()
— wire Clear button to clearSettings()
— populate LISTS.projects into the project select using populateSelect()
```

---

### Step 2-E — /field-app/index.html (Dashboard)

```
Read CLAUDE.md fully.

Create /field-app/index.html — the field app dashboard.

Structure:
- Standard HTML5 boilerplate, all CSS + JS links same pattern as settings.html
- Also load field-app/js/expenses.js, field-app/js/fuel.js for data access
- Sticky navbar + bottom nav
- If settings not complete: show full-page .warning-banner card with "Go to Settings" button,
  hide the rest of the dashboard content
- If settings complete, show:
  * Welcome heading: "Hello, [first name]" using settings.name
  * 4 .stat-card tiles in .dashboard-grid:
    — Total Expenses (sum of all expense amounts, formatted)
    — Total Fuel (sum of fuelAmount + kartaAmount)
    — Expense Entries (count)
    — Fuel Entries (count)
  * Quick actions row: "+ Add Expense" and "+ Add Fuel" buttons
  * Recent Entries section: last 5 entries combined (expenses + fuel), newest first
    Each row: icon (📋 or ⛽), date, project + site ID, amount/fuel, small edit link
  * Empty state if no entries: friendly message + add buttons
- Bottom nav with Dashboard tab active
- All text via data-i18n attributes
```

---

## ─────────────────────────────────────────
## STAGE 3 — Field App: Add Expense
## ─────────────────────────────────────────

### Step 3-A — /field-app/add-expense.html

```
Read CLAUDE.md fully.

Create /field-app/add-expense.html — the add/edit expense form page.

Structure:
- All CSS + JS links (include expenses.js)
- Sticky navbar, bottom nav (Expenses tab active)
- Page title changes dynamically: "Add Expense" (new) or "Edit Expense" (edit mode)
- Form card with fields in this exact order:
  1. Month (select, LISTS.months, default current month)
  2. Day (number 1–31, default today)
  3. Project Name (select, LISTS.projects, default settings.defaultProject)
  4. Site ID (text, required, class ltr-field)
  5. Job Code (text, required, class ltr-field)
  6. Category (select, LISTS.categories, required)
  7. Sub Category (select, LISTS.subCategories, required)
  8. Item Description (textarea, bilingual hint: Arabic or English)
  9. Amount (number, required, min 1, suffix label "EGP")
  10. Comment (text, optional)
  11. Coordinator (text, default settings.defaultCoordinator)
- Inline .form-error div after each required field (hidden by default)
- Button row: "Save Entry" (.btn-primary), "Save & Add Another" (.btn-secondary), "Cancel" (.btn-ghost)
- Edit mode: shows "Update Entry" button instead, pre-fills all fields
- URL param detection: if ?id=xxx present on load → edit mode
```

---

### Step 3-B — /field-app/js/expenses.js

```
Read CLAUDE.md fully.

Create /field-app/js/expenses.js

getExpenses()
— return loadFromStorage('expenses', [])

saveExpenses(arr)
— saveToStorage('expenses', arr)

getExpenseById(id)
— return getExpenses().find(e => e.id === id) || null

buildExpenseFromForm()
— reads all form fields by id
— returns expense object per CLAUDE.md data model
— sets trackingNumber from getSettings().trackingNumber
— sets date via formatDate(day, month, getCurrentYear())
— sets createdAt to new Date().toISOString()
— generates id via generateId()

validateExpenseForm()
— checks required fields on the form (siteId, jobCode, category, subCategory, amount)
— shows .form-error message under failing fields
— returns true if all valid, false otherwise

addExpense()
— call validateExpenseForm(), return if invalid
— call buildExpenseFromForm()
— push to getExpenses() array, save
— show success toast
— redirect to my-entries.html

addExpenseAndClear()
— same as addExpense but stays on page and clears form after save
— re-populate defaults (month, day, coordinator, project)

updateExpense(id)
— call validateExpenseForm(), return if invalid
— call buildExpenseFromForm(), set id = the existing id
— replace in array, save
— show success toast, redirect to my-entries.html

deleteExpense(id)
— show confirmation modal
— if confirmed: filter out id from array, save, show toast, reload/redirect

getTotalExpenses()
— return sum of all expense amounts

On DOMContentLoaded (only if on add-expense.html):
— populate all selects using populateSelect()
— set defaults from settings
— check URL for ?id= param, if present call loadExpenseForEdit(id)
— wire buttons to their functions

loadExpenseForEdit(id)
— get expense by id
— set all form field values
— switch page to edit mode (change title, show Update button, hide Save & Add Another)
```

---

## ─────────────────────────────────────────
## STAGE 4 — Field App: Add Fuel
## ─────────────────────────────────────────

### Step 4-A — /field-app/add-fuel.html

```
Read CLAUDE.md fully.

Create /field-app/add-fuel.html — the add/edit fuel entry form page.

Same structure pattern as add-expense.html.

Form fields in this exact order:
1. Month (select, LISTS.months, default current month)
2. Day (number 1–31, default today)
3. Project Name (select, LISTS.projects)
4. Site ID (text, required, ltr-field)
5. Job Code (text, required, ltr-field)
6. Start KM (number, required, ltr-field, hint shown if auto-filled)
7. End KM (number, required, ltr-field)
8. Distance (read-only text field showing End KM − Start KM, updates live, label "km")
9. Fuel Amount (number, required, min 1, suffix "EGP")
10. Karta Amount (number, default 0, suffix "EGP")
11. Area (text, optional)
12. Driver (text, default settings.defaultDriver)
13. City (text, optional)
14. Coordinator (text, default settings.defaultCoordinator)

Auto-fill note: if last fuel entry exists, show a small info banner above Start KM:
"Auto-filled from last entry (End KM: [value])" with a dismiss X button.

Same button pattern as expense form.
Bottom nav: Fuel tab active.
```

---

### Step 4-B — /field-app/js/fuel.js

```
Read CLAUDE.md fully.

Create /field-app/js/fuel.js

getFuelEntries()
— return loadFromStorage('fuel', [])

saveFuelEntries(arr)
— saveToStorage('fuel', arr)

getFuelById(id)
— return getFuelEntries().find(e => e.id === id) || null

getLastFuelEntry()
— return last item in getFuelEntries() sorted by date, or null

buildFuelFromForm()
— reads all form fields
— returns fuel entry object per CLAUDE.md data model

validateFuelForm()
— validates required fields and endKm > startKm
— shows inline errors
— if endKm <= startKm: show form-error "End KM must be greater than Start KM"
— returns bool

addFuel()
— validate → build → push → save → toast → redirect to my-entries.html

addFuelAndClear()
— validate → build → push → save → toast → clear form → re-apply defaults + auto-fill startKm

updateFuel(id)
— validate → build → replace in array → save → toast → redirect

deleteFuel(id)
— confirm modal → filter → save → toast → redirect

getFuelTotals()
— return { total: sum of fuelAmount + kartaAmount, newFuel: sum fuelAmount, karta: sum kartaAmount }

liveDistanceUpdate()
— event listener on endKm and startKm inputs
— updates the distance read-only field on every keyup
— if endKm < startKm: add .form-error warning (non-blocking)

autoFillStartKm()
— get last fuel entry, if exists set startKm input value to its endKm
— show the auto-fill info banner

On DOMContentLoaded (only on add-fuel.html):
— populate selects
— set defaults from settings
— call autoFillStartKm()
— attach liveDistanceUpdate() listeners
— check URL for ?id= for edit mode
— wire all buttons
```

---

## ─────────────────────────────────────────
## STAGE 5 — Field App: My Entries
## ─────────────────────────────────────────

### Step 5-A — /field-app/my-entries.html

```
Read CLAUDE.md fully.

Create /field-app/my-entries.html — view, edit, delete all entries.

Structure:
- All CSS + JS links (include expenses.js, fuel.js, entries.js)
- Sticky navbar, bottom nav (Entries tab active)
- Two tabs at top (.tabs): "Expenses" | "Fuel"
  styled as pill tabs — active tab is filled navy, inactive is ghost
- Summary bar below tabs:
  Expenses tab: shows "Total: [sum] EGP | [count] entries"
  Fuel tab: shows "Fuel: [sum] EGP | Karta: [sum] EGP | [count] entries"
- Filter bar (collapsible on mobile):
  Month filter (select), Project filter (select), Search text (searches description/siteId)
  "Clear Filters" link
- Expenses table (shown when Expenses tab active):
  Columns: Date | Project | Site ID | Category | Description | Amount | Actions
  Actions: Edit icon button + Delete icon button
- Fuel table (shown when Fuel tab active):
  Columns: Date | Project | Site ID | Start KM | End KM | Dist | Fuel | Karta | Actions
- Empty state per tab if no entries
- Both tables wrapped in .table-wrapper for horizontal scroll
- All text via data-i18n
```

---

### Step 5-B — /field-app/js/entries.js

```
Read CLAUDE.md fully.

Create /field-app/js/entries.js

State variables at top:
let activeTab = 'expenses'
let filters = { month: '', project: '', search: '' }

renderExpenseTable(entries)
— build table rows from entries array
— each row: formatted date, projectName, siteId, category,
  truncated itemDescription (max 30 chars), formatCurrency(amount), edit+delete buttons
— edit button: navigate to add-expense.html?id=[entry.id]
— delete button: call handleDelete('expense', entry.id)
— inject into #expense-tbody
— update summary bar text

renderFuelTable(entries)
— build table rows: date, projectName, siteId, startKm, endKm,
  calculateDistance(startKm,endKm)+'km', formatCurrency(fuelAmount),
  formatCurrency(kartaAmount), edit+delete buttons
— inject into #fuel-tbody
— update summary bar text

getFilteredExpenses()
— get all expenses, apply filters.month, filters.project, filters.search
— sort by date descending
— return filtered array

getFilteredFuel()
— same pattern for fuel entries

handleDelete(type, id)
— show inline confirmation (replace the row with a confirm bar: "Delete this entry? Yes / No")
— if confirmed: call deleteExpense(id) or deleteFuel(id), re-render

switchTab(tab)
— set activeTab, toggle tab styles, show/hide correct table and summary bar

applyFilters()
— read filter control values, update filters object, re-render active tab

On DOMContentLoaded:
— populate month + project filter selects
— call renderExpenseTable(getFilteredExpenses())
— call renderFuelTable(getFilteredFuel())
— wire tab clicks to switchTab()
— wire filter controls to applyFilters() on change/input
```

---

## ─────────────────────────────────────────
## STAGE 6 — Field App: Export
## ─────────────────────────────────────────

### Step 6-A — /shared/js/excel-export.js

```
Read CLAUDE.md fully.

Create /shared/js/excel-export.js using SheetJS (window.XLSX must be loaded before this).

Build function: generateFieldExcel(settings, expenses, fuel)

This generates an xlsx workbook matching the EXACT original template structure:

Sheet "Expenses Tracking":
- Row 1–2: merged header area — "Expenses Tracking" title, "Account" label,
  account type (New/VF), "VF" label
- Row 3: Name label + settings.name value, "New" label, "Total" label,
  sum of expense amounts
- Row 4: blank
- Row 5: column headers exactly:
  (blank), (blank), Month, Day, Project name, Site ID, Job Code, Category,
  Item Description, Amount, Comment, Coordinator, Tracking #, Name,
  Site Count, Category2, Sub Category, Date
- Rows 6+: one row per expense entry
- Last data row + 1: blank
- Footer rows (4 rows):
  Row -3: إعتماد | (blank) | مدير الحسابات | (blank) | المدير المسؤل | (blank) | Tracking#
  Row -2: (blank) | (blank) | (blank) | (blank) | . | (blank) | settings.trackingNumber
  Row -1: settings.trackingNumber (date cell) | التاريخ:

Sheet "Fuel Tracking":
- Same header structure
- Row 3 totals: total fuel amount, "New" fuel subtotal, "Karta" subtotal
- Column headers exactly:
  (blank), (blank), Month, Day, Project name, Site ID, Job Code,
  Start KM, End KM, Fuel Amount, Area, Driver, City, Karta Amount,
  Coordinator, Tracking #, Name, Site Count, Category2, Sub Category, Date
- Rows: one per fuel entry
- Same Arabic approval footer

Sheet "List":
- Column headers: Month, Day, Project, PC, Category, Name
- Fill with LISTS data

Return the workbook object (caller triggers download separately).

Also build: triggerExcelDownload(workbook, filename)
— uses XLSX.writeFile to trigger browser download

Also build: generateFieldJSON(settings, expenses, fuel)
— returns formatted JSON string per CLAUDE.md JSON export spec
— includes exportedAt, teamMember, trackingNumber, expenses array, fuel array, totals object

Also build: triggerJSONDownload(jsonString, filename)
— creates a Blob and triggers download via anchor click
```

---

### Step 6-B — /field-app/export.html

```
Read CLAUDE.md fully.

Create /field-app/export.html — export page for field team.

Structure:
- All CSS + JS links (include expenses.js, fuel.js, excel-export.js, export.js)
- Sticky navbar, bottom nav (Export tab active)
- Export summary card showing:
  * User name + mobile (from settings)
  * Tracking number
  * Expense entries count + total amount
  * Fuel entries count + fuel total + karta total
  * Date range: first entry date → last entry date
- Warning card (shown if no entries): "No entries to export" with link to add
- Two large export buttons:
  * "Export Excel (.xlsx)" — primary navy button with spreadsheet icon
  * "Export JSON" — secondary button with JSON icon
- After successful export: inline success message with filename appears below button
- Divider + Danger zone:
  * "Clear All Entries" button (.btn-ghost with danger color)
  * Explained as: "Use after your coordinator confirms receipt"
  * Requires typing "CLEAR" in a text input to enable the button (safety gate)
- Toast container
```

---

### Step 6-C — /field-app/js/export.js

```
Read CLAUDE.md fully.

Create /field-app/js/export.js

buildFilename(extension)
— get settings, format: [FirstName]_T[trackingNumber]_[currentMonth][currentYear].[extension]
— replace spaces in name with underscores, take first word only for brevity
— e.g. "Karim_T13_Apr2026.xlsx"

loadExportSummary()
— get settings, expenses, fuel from storage
— build and inject the summary card content
— if no entries: show the warning card, disable export buttons

triggerExcelExport()
— call generateFieldExcel(settings, expenses, fuel)
— call triggerExcelDownload(workbook, buildFilename('xlsx'))
— show success message with filename
— showToast(exportSuccess message)

triggerJSONExport()
— call generateFieldJSON(settings, expenses, fuel)
— call triggerJSONDownload(json, buildFilename('json'))
— show success message with filename
— showToast(exportSuccess message)

setupClearGate()
— watch the "type CLEAR to confirm" input
— enable the Clear button only when input value === 'CLEAR'

clearAllEntries()
— only callable when gate is satisfied
— remove 'expenses' and 'fuel' from localStorage
— show toast, redirect to index.html after 1.5 seconds

On DOMContentLoaded:
— call loadExportSummary()
— wire export buttons
— call setupClearGate()
— wire clear button
```

---

## ─────────────────────────────────────────
## STAGE 7 — Coordinator App Shell & Import
## ─────────────────────────────────────────

### Step 7-A — /coordinator-app/css/app.css

```
Read CLAUDE.md fully.

Create /coordinator-app/css/app.css

Same structure as field-app/css/app.css BUT:
- Override --color-accent (and primary-related usage) to deep green: #065f46
  (add :root override block at top: --color-primary: #065f46; --color-primary-hover: #054a3a;
  --color-primary-light: #d1fae5; --color-primary-subtle: #ecfdf5;)
- Navbar: "ExpenseFuel — Coordinator" title in deep green
- No bottom nav (coordinator app is desktop-first, use sidebar-style or top nav tabs)
- .import-card: large centered drag-and-drop zone with dashed border, icon, and label
  — hover state: fills lightly with primary-subtle color
  — active/dragging state: dashed border turns solid green
- .import-list: list of imported report cards on dashboard
  .import-card-item: card with status pill, team member name, import date, counts,
  review progress bar, action buttons
- .progress-bar: thin bar showing reviewed/total ratio in green
- .review-toolbar: sticky bar above review table with bulk action buttons and progress display
- .checklist-item: flex row with ✅/❌ icon + label + status
```

---

### Step 7-B — /coordinator-app/settings.html + /coordinator-app/js/settings.js

```
Read CLAUDE.md fully.

Create /coordinator-app/settings.html and /coordinator-app/js/settings.js

settings.html:
- Same HTML structure pattern as field-app/settings.html
- Navbar: coordinator app style
- Fields: Coordinator Name (required), Mobile (required), Language toggle
- No bottom nav — link tabs in navbar instead: Dashboard | Import | Settings
- Save and Clear buttons

settings.js:
- loadSettings(): load from localStorage key 'coord_settings', populate form
- saveSettings(): validate name + mobile, save to 'coord_settings', toast
- clearSettings(): confirm modal, clear, reload
- On DOMContentLoaded: loadSettings(), wire buttons
```

---

### Step 7-C — /coordinator-app/js/app.js

```
Read CLAUDE.md fully.

Create /coordinator-app/js/app.js — runs on every coordinator app page.

On DOMContentLoaded:
1. Call initLanguage()
2. Highlight active nav tab based on current filename
3. Check if coord_settings has name set — if not, show settings warning banner
4. Wire language toggle

Define helper: getCoordSettings()
— return loadFromStorage('coord_settings', null)

Define helper: getAllImports()
— iterate localStorage keys, collect all keys starting with 'imported_'
— return array of parsed import objects with their IDs

Define helper: getReviewData(importId)
— return loadFromStorage('review_' + importId, {})

Define helper: saveReviewData(importId, data)
— saveToStorage('review_' + importId, data)
```

---

### Step 7-D — /coordinator-app/import.html

```
Read CLAUDE.md fully.

Create /coordinator-app/import.html — file import page.

Structure:
- All CSS + JS links (include app.js, settings.js, import.js)
- Navbar with tabs, Settings tab active state off, Import active
- Page title: "Import Field Report"
- Large .import-card drag-and-drop zone:
  * Cloud upload icon (SVG or emoji)
  * Label: "Drag & drop Excel or JSON file here"
  * Sub-label: "or"
  * Browse button: triggers hidden file input (accept=".xlsx,.json")
- Supported formats note: ".xlsx (Excel) and .json files supported"
- Preview section (hidden by default, shown after file is parsed):
  * File info: filename, size, detected format
  * Team member name + mobile + tracking number from the file
  * Two counts: X expense entries found | Y fuel entries found
  * Preview tables: first 3 rows of each type
  * "Confirm Import" button (.btn-primary) + "Cancel" button
- Error card (shown if file parse fails): clear error message + retry option
- Toast container
```

---

### Step 7-E — /coordinator-app/js/import.js

```
Read CLAUDE.md fully.

Create /coordinator-app/js/import.js

setupDragDrop()
— add dragover, dragleave, drop event listeners to the drop zone
— on drop: call handleFile(file)
— toggle .dragging class on the zone

handleFile(file)
— detect type from file.name extension
— if .json: call parseJSONFile(file)
— if .xlsx: call parseExcelFile(file)
— else: show error "Unsupported file type"

parseJSONFile(file)
— use FileReader to read text
— JSON.parse the content
— validate structure: must have teamMember, expenses array, fuel array, totals
— if valid: call showPreview(data, 'json')
— if invalid: show error card with details

parseExcelFile(file)
— use FileReader to read as ArrayBuffer
— use XLSX.read(data, {type:'array'}) to parse
— extract "Expenses Tracking" sheet and "Fuel Tracking" sheet
— map rows to expense and fuel entry objects (match column positions from CLAUDE.md export spec)
— reconstruct teamMember from Name column, trackingNumber from footer
— build data object same shape as JSON format
— call showPreview(data, 'xlsx')

showPreview(data, sourceType)
— populate preview section: file info, team member, counts
— render first 3 rows of expenses and fuel as preview tables
— show the preview section, hide the drop zone
— wire Confirm button to confirmImport(data)

confirmImport(data)
— assign importId = generateId()
— add importId, importedAt timestamp, sourceType to data
— saveToStorage('imported_' + importId, data)
— show success toast
— redirect to index.html after 1 second

On DOMContentLoaded:
— call setupDragDrop()
— wire browse button to hidden file input
— wire file input change to handleFile()
```

---

### Step 7-F — /coordinator-app/index.html (Dashboard)

```
Read CLAUDE.md fully.

Create /coordinator-app/index.html — coordinator dashboard.

Structure:
- All CSS + JS links (include app.js, settings.js)
- Navbar with tabs: Dashboard (active) | Import | Settings
- Welcome: "Hello, [coordinator name]"
- Top summary strip: 3 small stat tiles — Total Reports, Pending Review, Fully Approved
- Imports list section:
  * If no imports: empty state card with "Import a Report" button
  * For each import: render an .import-card-item with:
    — Team member name + mobile (from import data)
    — Tracking number badge
    — Import date (formatted)
    — Expense count + total | Fuel count + total
    — Review progress bar: "X / Y entries reviewed" with visual bar
    — Status badge: Pending / In Review / Fully Approved
    — Action buttons row:
      "Review Expenses" → review-expenses.html?importId=[id]
      "Review Fuel" → review-fuel.html?importId=[id]
      "Export Final" → export.html?importId=[id]
      Delete icon button (with confirmation)
- All text data-i18n

JS inline script or separate file:
— call getAllImports() on load
— for each import: calculate review progress from getReviewData(importId)
— render import cards
— wire delete buttons with confirmation
```

---

## ─────────────────────────────────────────
## STAGE 8 — Coordinator App: Review Pages
## ─────────────────────────────────────────

### Step 8-A — /coordinator-app/review-expenses.html

```
Read CLAUDE.md fully.

Create /coordinator-app/review-expenses.html — expense review page.

Receives importId via URL param: ?importId=xxx

Structure:
- All CSS + JS links (include app.js, review.js)
- Navbar with back link to index.html
- Page header: "[Team Member Name] — Expense Review" + tracking number badge
- Auto-validation banner (shown if issues found):
  amber warning card: "⚠️ [N] issues detected — flagged rows are highlighted below"
  list of issue descriptions
- Review toolbar (.review-toolbar):
  Left: progress "X / Y reviewed" + progress bar
  Right: "Approve All" button, "Save Reviews" button (.btn-primary)
- Expenses review table:
  Columns: # | Date | Project | Site ID | Job Code | Category | Description | Amount | Status | Note | 
  Status column: <select> per row with options: Pending / Approved / Flagged
  Note column: <input type="text"> per row for coordinator comment
  .row-flagged and .row-approved visual styling
- Save Reviews button at bottom too
- Toast container

All status changes save to state (not to localStorage until "Save Reviews" is clicked)
```

---

### Step 8-B — /coordinator-app/review-fuel.html

```
Read CLAUDE.md fully.

Create /coordinator-app/review-fuel.html — fuel review page.

Same structure as review-expenses.html but for fuel entries.

Fuel review table columns:
# | Date | Project | Site ID | Job Code | Start KM | End KM | Distance | Fuel | Karta | Area | Driver | Status | Note

KM mismatch rows: automatically highlighted in amber (.row-warning class)
with a small warning icon and pre-filled note "KM gap detected"

Totals row at bottom of table:
"Totals: — — — — — — — [sum fuel] [sum karta] — —"

Same toolbar and save pattern as expense review.
```

---

### Step 8-C — /coordinator-app/js/review.js

```
Read CLAUDE.md fully.

Create /coordinator-app/js/review.js — handles both review pages.

State:
let importId = null
let importData = null
let reviewData = {}   // keyed by entry id: { status, note }
let entryType = null  // 'expenses' or 'fuel'

initReviewPage()
— read importId from URL params
— detect current page to set entryType
— load importData from 'imported_' + importId
— load existing reviewData from 'review_' + importId (so saved progress is restored)
— run auto-validation via runAllValidations(importData)
— auto-flag entries with detected issues (set status='flagged', note=issue message)
  but only for entries that are still 'pending' (don't overwrite coordinator edits)
— show validation banner if issues found
— render the review table
— update progress display

renderExpenseReview(expenses)
— for each expense: create table row
— status select: set value from reviewData[entry.id].status or 'pending'
— note input: set value from reviewData[entry.id].note or ''
— add .row-flagged or .row-approved class based on status
— attach change listener to status select: call updateReviewEntry(id, 'status', value)
— attach input listener to note: call updateReviewEntry(id, 'note', value)

renderFuelReview(fuel)
— same pattern for fuel
— add .row-warning class and auto-note for KM mismatch entries

updateReviewEntry(id, field, value)
— update reviewData[id][field] = value
— update row styling based on new status
— update progress display

updateProgressDisplay()
— count reviewed (not pending), approved, flagged from reviewData
— update toolbar progress bar and text

approveAll()
— set all entries in reviewData to status='approved'
— re-render table
— update progress

saveReviews()
— saveToStorage('review_' + importId, reviewData)
— showToast('Reviews saved')

On DOMContentLoaded:
— call initReviewPage()
— wire Approve All, Save Reviews buttons
```

---

## ─────────────────────────────────────────
## STAGE 9 — Coordinator App: Export Final
## ─────────────────────────────────────────

### Step 9-A — Update /shared/js/excel-export.js (add coordinator export)

```
Read CLAUDE.md fully.

Open /shared/js/excel-export.js and ADD the coordinator export function (do not remove existing functions).

Add: generateCoordinatorExcel(importData, reviewData)

Logic:
- Filter: approvedExpenses = importData.expenses where reviewData[id].status === 'approved'
- Filter: approvedFuel = importData.fuel where reviewData[id].status === 'approved'
- Filter: flaggedExpenses = importData.expenses where reviewData[id].status === 'flagged'
- Filter: flaggedFuel = importData.fuel where reviewData[id].status === 'flagged'

Sheet "Expenses Tracking":
- Same structure as field export but with ONLY approved expenses
- Add extra column "Coordinator Notes" at end, filled from reviewData[id].note

Sheet "Fuel Tracking":
- Same, only approved fuel entries, extra Coordinator Notes column

Sheet "Flagged Entries":
- Table with all flagged items (expenses + fuel combined)
- Columns: Type | Date | Project | Site ID | Amount/Fuel | Coordinator Note

Sheet "Summary":
- Coordinator name + date of export
- Team member name + tracking number
- Approved expenses: count + total
- Approved fuel: count + fuel total + karta total
- Flagged and excluded: count

Filename: "APPROVED_[MemberName]_T[TrackingNum]_[Month][Year].xlsx"

Return workbook object.
```

---

### Step 9-B — /coordinator-app/export.html

```
Read CLAUDE.md fully.

Create /coordinator-app/export.html — final export page for coordinator.

Receives importId via URL param: ?importId=xxx

Structure:
- All CSS + JS links (include app.js, review.js, export.js)
- Navbar with back link to index.html
- Page header: "Export Final Sheet — [Team Member Name]"
- Pre-export checklist card:
  Each checklist item (.checklist-item) shows ✅ or ❌:
  * All entries reviewed (none left as pending)
  * No flagged expenses
  * No flagged fuel entries
  * KM continuity verified
  * Expense totals match
  * Fuel totals match
- Warning note if any checklist item is ❌ (not blocking — can still export)
- Export summary card:
  * Approved expenses: [count] entries, Total: [amount] EGP
  * Approved fuel: [count] entries, Fuel: [amount] EGP, Karta: [amount] EGP
  * Flagged (excluded): [count] entries
- Large export button: "Export Final Approved Sheet (.xlsx)" (.btn-primary.btn-lg)
- After export: success message with filename shown inline
- Toast container
```

---

### Step 9-C — /coordinator-app/js/export.js

```
Read CLAUDE.md fully.

Create /coordinator-app/js/export.js

let importId = null
let importData = null
let reviewData = {}

initExportPage()
— read importId from URL params
— load importData and reviewData from localStorage
— call buildChecklist()
— call buildExportSummary()

buildChecklist()
— compute each checklist condition:
  allReviewed: no entry in reviewData has status === 'pending'
  noFlaggedExpenses: no expense entry has status === 'flagged'
  noFlaggedFuel: no fuel entry has status === 'flagged'
  kmOk: run validateKmContinuity() on approved fuel entries only, length === 0
  expenseTotalsOk: run validateExpenseTotals() 
  fuelTotalsOk: run validateFuelTotals()
— render each as .checklist-item with ✅ or ❌ icon and label

buildExportSummary()
— count and sum approved/flagged entries
— inject into summary card

buildCoordFilename()
— format: "APPROVED_[memberFirstName]_T[trackingNum]_[Month][Year].xlsx"

triggerFinalExport()
— call generateCoordinatorExcel(importData, reviewData)
— call triggerExcelDownload(workbook, buildCoordFilename())
— show success message with filename
— showToast(exportSuccess)

On DOMContentLoaded:
— call initExportPage()
— wire export button to triggerFinalExport()
```

---

## ─────────────────────────────────────────
## STAGE 10 — Deploy & Final Polish
## ─────────────────────────────────────────

### Step 10-A — /.github/workflows/deploy.yml

```
Read CLAUDE.md fully.

Create /.github/workflows/deploy.yml

GitHub Actions workflow that:
- Triggers on push to main branch
- Uses actions/configure-pages, actions/upload-pages-artifact, actions/deploy-pages
- Uploads the entire repo as static files (no build step)
- Sets permissions: contents read, pages write, id-token write
- Environment: github-pages
- Concurrency: group github-pages, cancel-in-progress true

The result: both field-app/ and coordinator-app/ are accessible via
their respective subfolder GitHub Pages URLs.
```

---

### Step 10-B — /shared/js/sample-data.js

```
Read CLAUDE.md fully.

Create /shared/js/sample-data.js

Define: const SAMPLE_DATA = { expenses: [...], fuel: [...] }

expenses: 5 realistic sample entries using data patterns from CLAUDE.md
(vary projects, categories, amounts, dates across April 2026)

fuel: 5 realistic sample entries with proper KM continuity
(each entry's startKm equals previous entry's endKm, April 2026)

Define function: loadSampleData()
— check if expenses and fuel arrays in localStorage are empty
— if yes: save SAMPLE_DATA.expenses and SAMPLE_DATA.fuel to localStorage
— show toast "Sample data loaded"
— reload page

Add "Load Sample Data" button logic: this button should only appear on index.html
of each app when entries/imports are empty.
```

---

### Step 10-C — /README.md

```
Read CLAUDE.md fully.

Create /README.md in the repo root.

Include:
- Project title: ExpenseFuel Tracker
- One-line description
- Two app URLs (placeholder format): 
  https://YOUR_USERNAME.github.io/expensefuel-tracker/field-app/
  https://YOUR_USERNAME.github.io/expensefuel-tracker/coordinator-app/
- Section: Field Team Workflow (numbered steps: open app → set up settings → add expenses/fuel → export → send file)
- Section: Coordinator Workflow (numbered steps: open coordinator app → set settings → import file → review expenses → review fuel → export final → send to manager)
- Section: How to update reference data (edit /shared/js/lists.js — projects, categories, names)
- Section: Deployment (fork repo → enable GitHub Pages from Settings → push to main)
- Section: Adding a Theme (brief note pointing to CLAUDE.md theme switching section)
- Tech stack list
```

---

### Step 10-D — Final QA Pass

```
Read CLAUDE.md fully.

Perform a final QA pass across both apps. Fix any issues found:

1. Language toggle — verify on every page:
   - EN/AR pill switches correctly
   - RTL layout flips (nav, forms, tables all mirror)
   - All data-i18n elements update
   - Numbers/codes stay LTR in RTL mode

2. Settings guard — verify on every data-entry page:
   - If settings.name is empty, warning banner shows
   - Dashboard shows warning card instead of stats

3. Form validation — verify on all forms:
   - Required fields show inline .form-error (not browser alert)
   - Error clears when user fixes the field
   - Form cannot submit with empty required fields

4. KM auto-fill — verify on add-fuel.html:
   - Start KM auto-fills from last entry's End KM
   - Info banner shows and can be dismissed
   - Live distance updates as user types

5. Excel export — verify:
   - Column order matches original template exactly
   - Arabic approval footer appears on sheets 1 and 2
   - Filename format is correct

6. Import — verify both formats:
   - JSON import parses correctly and shows preview
   - Excel import reads both sheets correctly
   - Invalid files show clear error message

7. Review auto-validation — verify:
   - KM mismatches get auto-flagged with note
   - Zero amounts get flagged
   - Missing fields get flagged
   - Coordinator can change any auto-flag manually

8. Coordinator export — verify:
   - Only approved entries appear in main sheets
   - Flagged entries appear in Flagged sheet
   - Summary sheet has correct counts and totals

9. Toasts — verify on all pages:
   - Appear bottom-right
   - Auto-dismiss after 3 seconds
   - Correct color per type

10. Mobile layout — verify at 390px width:
    - Bottom nav visible and not overlapping content
    - Forms scrollable and usable
    - Tables horizontally scrollable
    - Buttons full-width on mobile
```

---

## Build Summary

| Stage | Steps | Files Created |
|---|---|---|
| 1 — Shared Foundation | 5 steps | common.css, translations.js, lists.js, utils.js, validations.js |
| 2 — Field Shell | 5 steps | app.css, app.js, settings.html, settings.js, index.html |
| 3 — Add Expense | 2 steps | add-expense.html, expenses.js |
| 4 — Add Fuel | 2 steps | add-fuel.html, fuel.js |
| 5 — My Entries | 2 steps | my-entries.html, entries.js |
| 6 — Field Export | 3 steps | excel-export.js, export.html, export.js |
| 7 — Coordinator Shell | 6 steps | app.css, settings, app.js, import.html, import.js, index.html |
| 8 — Review Pages | 3 steps | review-expenses.html, review-fuel.html, review.js |
| 9 — Final Export | 3 steps | excel-export.js (updated), export.html, export.js |
| 10 — Polish | 4 steps | deploy.yml, sample-data.js, README.md, QA fixes |

**Total: 35 focused prompts. Each = 1 file. Each = ~5–10 minutes. Zero risk of interruption.**

---

## Tips

- Start each Claude Code session by typing: "Read CLAUDE.md" — it restores full context
- If a step produces an error: describe it to Claude Code and reference the step number (e.g. "Fix Step 3-B, the validateExpenseForm function isn't showing inline errors")
- Test in browser after every stage, not just at the end
- Stage 6 (Excel export) is the most complex — if it needs tweaking, that's normal
- The coordinator app builds on everything in the field app, so fully test the field app first
