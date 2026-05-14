# ExpenseFuel Tracker

A two-app system for tracking field site expenses and fuel consumption — built as plain HTML + JavaScript, hosted on GitHub Pages, works offline, zero cost.

---

## Live Apps

| App | URL |
|---|---|
| Field Team | `https://YOUR_USERNAME.github.io/expensefuel-tracker/field-app/` |
| Coordinator | `https://YOUR_USERNAME.github.io/expensefuel-tracker/coordinator-app/` |

Replace `YOUR_USERNAME` and `expensefuel-tracker` with your GitHub username and repository name after forking.

---

## Field Team Workflow

1. **Open the app** — navigate to the field-app URL on any device with a browser.
2. **Set up settings** — tap the settings icon, enter your name, mobile number, tracking number, default project, and preferred language. Save.
3. **Add expenses** — tap "Add Expense" for each site visit cost. Fill in the site ID, job code, category, description, and amount.
4. **Add fuel entries** — tap "Add Fuel" for each refuel. Enter start KM, end KM, fuel amount, and karta amount. KM values must be continuous across entries.
5. **Review your entries** — go to "My Entries" to edit or delete any entry before sending.
6. **Export the report** — go to "Export", then tap "Export Excel" and "Export JSON". Both files are downloaded to your device.
7. **Send the files** — share the downloaded `.xlsx` and `.json` files with your coordinator via WhatsApp, email, or any file-sharing method.

---

## Coordinator Workflow

1. **Open the coordinator app** — navigate to the coordinator-app URL on a desktop browser.
2. **Set up settings** — enter your coordinator name and mobile number. Save.
3. **Import a field report** — go to "Import", drag and drop the field team's `.xlsx` or `.json` file, verify the preview, and confirm import.
4. **Review expenses** — open the imported report from the dashboard and click "Review Expenses". Set each entry to Approved, Flagged, or leave as Pending. Add coordinator notes for flagged items.
5. **Review fuel entries** — click "Review Fuel" for the same report. KM mismatches are automatically highlighted in amber. Approve or flag each entry.
6. **Export the final sheet** — click "Export Final" from the dashboard or the export page. The pre-export checklist shows readiness. Click "Export Final Approved Sheet (.xlsx)" to download the workbook.
7. **Send to manager** — share the downloaded `APPROVED_…xlsx` file with the accounts manager for sign-off.

---

## How to Update Reference Data

All dropdown lists (projects, categories, sub-categories, account types, drivers) are defined in one file:

```
shared/js/lists.js
```

Open the file and edit the arrays inside the `LISTS` object:

```js
const LISTS = {
  projects:    ['EXP', 'ROT', 'ML', 'roll out', ...],
  categories:  ['Labor', 'Material', 'Transportation', ...],
  subCategories: [...],
  accountTypes: ['New', 'VF'],
  months: [...],
};
```

Save the file and push to `main` — the change is live on GitHub Pages within a minute.

---

## Deployment

1. **Fork this repository** on GitHub (or push it to a new repo under your account).
2. **Enable GitHub Pages** — go to your repo → **Settings** → **Pages** → under *Source*, select **GitHub Actions**.
3. **Push to `main`** — the included workflow (`.github/workflows/deploy.yml`) runs automatically and deploys both apps as static files. No build step needed.
4. **Update the URLs** — replace `YOUR_USERNAME` and the repo name in the links above with your actual GitHub username and repository name.

> **First-time note:** the Actions workflow will fail until GitHub Pages is enabled in Settings. Enable it first, then re-run the workflow or push any commit to trigger it.

---

## Adding a Theme

The design system uses CSS custom properties for all colors. To add a new theme, add a single override block to `shared/css/common.css` (or the app-specific CSS):

```css
[data-theme="sky"] {
  --color-primary:        #0369a1;
  --color-primary-hover:  #0284c7;
  --color-primary-light:  #e0f2fe;
  --color-primary-subtle: #f0f9ff;
}
```

Apply it by setting `document.documentElement.setAttribute('data-theme', 'sky')`. No other CSS changes are needed — all components use the variables. See `CLAUDE.md` for the full variable list and coordinator green overrides example.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Scripting | Vanilla JavaScript (ES6+), no frameworks |
| Styling | CSS3 custom properties, no preprocessors |
| Excel read/write | [SheetJS](https://sheetjs.com/) `xlsx.full.min.js` (CDN) |
| Data persistence | `localStorage` — no backend, no database |
| Hosting | GitHub Pages — static file serving |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) |
| Offline | Works without internet after first load (all logic is client-side) |
