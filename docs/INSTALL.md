# Install checklist

## Before you start

Back up, so you can always get back to a working state:

```
<APP.USERPATH>\DAT\report\assets\settings\swood-client.js
<APP.USERPATH>\DAT\report\assets\settings\view-settings.js
<APP.USERPATH>\DAT\report\assets\settings\data-settings.js
Report.cfg
```

---

## 1. Copy the files

| File | Destination |
|---|---|
| `swood-client.js` | `<APP.USERPATH>\DAT\report\assets\settings\` |
| `view-settings.js` | `<APP.USERPATH>\DAT\report\assets\settings\` |
| `data-settings.js` | `<APP.USERPATH>\DAT\report\assets\settings\` |
| `cost.js` | `<APP.USERPATH>\DAT\report\assets\settings\` |
| `Report.cfg` | over the live one |
| `sheetmetal.prtprp` | `<SOLIDWORKS>\lang\english\` |
| `miscellaneous.prtprp` | `<SOLIDWORKS>\lang\english\` |

**DAT, not the report folder.** Report folders are rebuilt from DAT on every
generation. Files placed in a report folder are lost on the next run.

## 2. Clear the cached data model — do not skip

The report caches its data model in IndexedDB. Old reports will keep showing
old numbers otherwise, and Ctrl+F5 does not clear it.

Open any existing report → **F12** → **Application** → **Clear site data**.

## 3. Restart SOLIDWORKS

Needed for the two property forms to appear in the Custom Properties tab.

## 4. Generate a report

Normal Generate Report. Nothing here changes how the sheet metal macro runs.

## 5. Check these eight things

- [ ] F12 Console shows `[SwoodClient] product quantities applied to N part(s) … project xN`
- [ ] **Panels** — item count matches distinct panels, not one row per unit
- [ ] **Frames** — Project Qty, Product Qty, Total columns present, footer sums
- [ ] **Sheetmetal Layout** — blanks nested onto shared sheets
- [ ] **Summary** opens on **Mgmt**, sections numbered, empty ones hidden
- [ ] **Client 1** and **Client 2** show the **same total**
- [ ] **Bar Requirement** appears under Weldments in the sidebar
- [ ] Table headers navy with white column titles on every page

---

## Rollback

Restore the four backed-up files and clear site data again. Nothing here
touches `main.js` or any SWOOD binary, so a SWOOD update is unaffected — but
note an update **overwrites** `DAT`, so keep this folder and re-copy after one.

---

## Two settings you will likely want to change

`swood-client.js`, in `CONFIG` near the top:

```js
weldments: { stockLength: 6000, kerf: 5, trim: 0, density: 7.85 }
summary:   { costFactor: { value: 1.5, min: 1.5, max: 1.75, step: 0.05 } }
```

`data-settings.js`, once the numbers are settled:

```js
useLocalDatabase: false   // → true, after one clean load
```

Leaving it `false` rebuilds the model every visit, which is correct but means
edits made inside the report do not persist.

Keep both flags `false` until the eight checks above pass on a clean load.
Then set `useLocalDatabase: true` so the good model is cached.
