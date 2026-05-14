# ExpenseFuel Tracker — Claude Code Project Context

## Project Overview
A two-app system for tracking field site expenses and fuel consumption.
Built as plain HTML + JavaScript — no frameworks, no build tools, no Node.js required.
Hosted on GitHub Pages. Works offline. Zero cost.

## Apps in This Repo

### 1. `/field-app/` — Field Team App
Used by field PCs to log daily expenses and fuel entries.
Exports draft reports as both Excel (.xlsx) and JSON files to share with coordinator.

### 2. `/coordinator-app/` — Coordinator App
Imports field team reports, validates entries, flags issues, exports final approved Excel for manager.

### 3. `/shared/` — Shared Code
Common JavaScript and CSS used by both apps.

---

## Tech Stack
- HTML5 + Vanilla JavaScript (ES6+) — no frameworks, no build tools
- CSS3 custom properties — no Tailwind, no Bootstrap
- SheetJS (xlsx.full.min.js) — Excel read/write, loaded from CDN
- LocalStorage — all data persistence, no backend
- Files run directly in browser by opening index.html

---

## Folder Structure

```
repo-root/
├── field-app/
│   ├── index.html           ← Dashboard
│   ├── settings.html        ← User settings
│   ├── add-expense.html     ← Add/edit expense
│   ├── add-fuel.html        ← Add/edit fuel entry
│   ├── my-entries.html      ← View/edit/delete entries
│   ├── export.html          ← Export Excel + JSON
│   ├── css/app.css
│   └── js/
│       ├── app.js           ← Init, nav, language toggle
│       ├── settings.js
│       ├── expenses.js
│       ├── fuel.js
│       ├── entries.js
│       └── export.js
│
├── coordinator-app/
│   ├── index.html           ← Dashboard
│   ├── settings.html
│   ├── import.html          ← Import Excel or JSON
│   ├── review-expenses.html
│   ├── review-fuel.html
│   ├── export.html          ← Export final sheet
│   ├── css/app.css
│   └── js/
│       ├── app.js
│       ├── settings.js
│       ├── import.js
│       ├── review.js
│       └── export.js
│
└── shared/
    ├── js/
    │   ├── translations.js  ← All EN/AR strings
    │   ├── lists.js         ← All dropdown data
    │   ├── excel-export.js  ← Excel generation logic
    │   ├── validations.js   ← Shared validation rules
    │   └── utils.js         ← Helpers, localStorage wrappers
    └── css/
        └── common.css       ← Full design system
```

---

## ✦ Design System — HeroUI Inspired, Navy Blue Light Mode

### Reference
Design is inspired by HeroUI (heroui.com): clean cards with soft shadows,
polished inputs, smooth hover states, generous whitespace, clear hierarchy.
Light mode only. Primary color: Navy Blue.

### CSS Custom Properties — Define in :root

All colors are CSS variables so theme switching can be added later
with zero rework (just override the variables per theme).

```css
:root {
  /* Primary — Navy Blue */
  --color-primary:        #1e3a5f;
  --color-primary-hover:  #16304f;
  --color-primary-light:  #e8eef7;
  --color-primary-subtle: #f0f4fb;

  /* Surfaces */
  --color-bg:             #f8fafc;
  --color-surface:        #ffffff;
  --color-surface-2:      #f1f5f9;
  --color-border:         #e2e8f0;
  --color-border-focus:   #1e3a5f;

  /* Text */
  --color-text-primary:   #0f172a;
  --color-text-secondary: #64748b;
  --color-text-muted:     #94a3b8;
  --color-text-inverse:   #ffffff;

  /* Status */
  --color-success:        #059669;
  --color-success-bg:     #ecfdf5;
  --color-warning:        #d97706;
  --color-warning-bg:     #fffbeb;
  --color-danger:         #dc2626;
  --color-danger-bg:      #fef2f2;
  --color-info:           #0369a1;
  --color-info-bg:        #f0f9ff;

  /* Shadows */
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:  0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg:  0 10px 30px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.05);

  /* Radii */
  --radius-sm: 6px; --radius-md: 10px;
  --radius-lg: 14px; --radius-xl: 20px; --radius-pill: 999px;

  /* Spacing */
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px;
  --sp-5:20px; --sp-6:24px; --sp-8:32px; --sp-10:40px;

  /* Typography */
  --font: 'Segoe UI', system-ui, -apple-system, sans-serif;
  --text-xs:11px; --text-sm:13px; --text-base:15px;
  --text-lg:17px; --text-xl:20px; --text-2xl:24px; --text-3xl:30px;

  --transition: 150ms ease;
}
```

### Theme Switching Note
When a theme switcher UI is added later, it only overrides the :root variables.
Example: `[data-theme="sky"] { --color-primary: #0369a1; }` — nothing else changes.
This is ~50 lines of code when added. No CSS rework needed.

---

### Components

**Buttons:** .btn base (h:40px, radius-md, fw:500), variants: .btn-primary (navy fill),
.btn-secondary (white+border), .btn-ghost (transparent hover), .btn-danger, .btn-sm, .btn-lg

**Cards:** .card (white, shadow-sm, radius-lg, padding sp-6),
.card-header (border-bottom, pb sp-4), .card-title (text-lg fw-600)

**Form Inputs (HeroUI style — label on top, visible border, clean focus ring):**
.form-group (mb sp-4), .form-label (text-sm fw-500), .form-input (h:40px, border color-border,
radius-md, focus: 3px ring color-primary-light + border color-primary),
.form-select, .form-textarea (min-h:80px), .form-error (text-sm red), .form-hint (text-sm muted)

**Badges/Chips (HeroUI Chip style):**
.badge (radius-pill, px:10px, py:2px, text-xs fw-500),
variants: .badge-pending (amber), .badge-approved (green), .badge-flagged (red), .badge-primary (navy)

**Navbar:** sticky top, h:60px, white bg, border-bottom, shadow-sm.
Left: app name bold navy. Right: EN|AR toggle pill, settings icon.

**Bottom nav (field app mobile):** fixed bottom, h:60px, white, border-top, shadow-lg.
5 tabs with icon + label. Active = navy.

**Tables (HeroUI Table style):**
thead: bg surface-2, text-sm fw-600 text-secondary, sticky.
tbody: hover bg primary-subtle, border-bottom.
.row-flagged: bg danger-bg + 3px left border danger.
.row-approved: bg success-bg.

**Stat Tiles (Dashboard):**
.stat-card (card, flex row), .stat-icon (40px circle bg primary-light color primary),
.stat-value (text-2xl fw-700 color primary), .stat-label (text-sm text-secondary)

**Toasts:** fixed bottom-right, shadow-lg, slide-in animation, 4px left border per status.
Auto-dismiss 3 seconds. Stack up to 3.

---

## RTL (Arabic) Support

- `document.documentElement.setAttribute('dir', 'rtl')` when Arabic active
- CSS [dir="rtl"] selectors flip: text-align, padding, margin, border sides
- Directional icons flip with `transform: scaleX(-1)`
- Numbers/codes (Site ID, KM, Amount) stay LTR even in RTL mode
- System font stack supports Arabic script natively

---

## Data Models

### Settings (key: `settings`)
```json
{
  "name": "كريم وليد عبدالرؤوف بدوى",
  "mobile": "01xxxxxxxxx",
  "defaultCoordinator": "eslam mussa",
  "defaultProject": "roll out",
  "defaultDriver": "",
  "accountType": "New",
  "trackingNumber": 13,
  "language": "en"
}
```

### Expense Entry (key: `expenses` → array)
```json
{
  "id": "uuid",
  "month": "Apr", "day": 16,
  "projectName": "roll out", "siteId": "D0510", "jobCode": "EM042",
  "category": "Labor", "subCategory": "Labor",
  "itemDescription": "مشال براكت و لينك",
  "amount": 250, "comment": "", "coordinator": "eslam mussa",
  "trackingNumber": 13, "date": "16-Apr-2026", "createdAt": "ISO string"
}
```

### Fuel Entry (key: `fuel` → array)
```json
{
  "id": "uuid",
  "month": "Apr", "day": 14,
  "projectName": "roll out", "siteId": "D0510", "jobCode": "EM042",
  "startKm": 377927, "endKm": 378217,
  "fuelAmount": 645, "kartaAmount": 50,
  "area": "delta", "driver": "tamer khalil", "city": "",
  "coordinator": "eslam mussa",
  "trackingNumber": 13, "date": "14-Apr-2026", "createdAt": "ISO string"
}
```

### Coordinator Review (added fields on top of original entry)
```json
{ "status": "pending|approved|flagged", "coordinatorNote": "", "reviewedAt": "ISO string" }
```

---

## Reference Lists (lists.js)

- Projects: EXP, ROT, ML, Survey, NFM, Fiber, POC3, MTX, roll out
- Categories: Labor, Material, Copy, Transportation, Medical, Car Oil, WH Rent,
  Allowance, Team Rent, Internet, Car Rent, Mobile & Communication, Accommodation,
  Logistic, Site Guard, Other
- Sub-Categories: Labor, Material, Copy, Transportation, Medical, Car Oil,
  WH Rent, Allowance, Team Rent, Internet, Car Rent
- Account Types: New, VF
- Months: Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec

---

## Bilingual System

```javascript
const TRANSLATIONS = {
  en: { dashboard: "Dashboard", addExpense: "Add Expense", ... },
  ar: { dashboard: "الرئيسية", addExpense: "إضافة مصروف", ... }
};
```
- `applyLanguage(lang)` — sets dir/lang on <html>, updates all [data-i18n] elements
- `initLanguage()` — called on every page load
- Toggle pill in header switches instantly, no reload
- All JS files use globals (no ES module imports)

---

## Export Specs

**JSON filename:** `[Name]_T[TrackingNum]_[Month][Year].json`
**Excel filename:** `[Name]_T[TrackingNum]_[Month][Year].xlsx`

Excel sheets:
- Sheet 1 "Expenses Tracking" — matches original template columns exactly
- Sheet 2 "Fuel Tracking" — matches original template columns exactly
- Sheet 3 "List" — reference data
- Arabic approval footer on sheets 1 & 2: إعتماد | مدير الحسابات | المدير المسؤل | Tracking#

---

## Validation Rules

| Rule | Logic |
|---|---|
| KM Continuity | Entry[N].startKm must equal Entry[N-1].endKm |
| No Zero Amounts | amount and fuelAmount > 0 |
| Required Fields | siteId, jobCode, category, coordinator not empty |
| Valid Project | projectName exists in LISTS.projects |
| Date Sequence | Entries in chronological order |
| Total Match | Sum of entries matches declared total |

---

## LocalStorage Keys

| Key | Contents |
|---|---|
| `settings` | Field user settings |
| `expenses` | Expense entries array |
| `fuel` | Fuel entries array |
| `coord_settings` | Coordinator settings |
| `imported_[id]` | Imported report |
| `review_[id]` | Review statuses |

---

## Critical Rules

1. No Node.js, no npm, no build step — plain `<script src="">` tags only
2. SheetJS CDN: `https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js`
3. All JS as globals: `const TRANSLATIONS = {}` not ES module exports
4. Settings guard: every data-entry page checks settings.name; if empty → redirect to settings.html
5. Mobile-first: all forms work at 390px width
6. No alert() — always use inline errors or toast notifications
