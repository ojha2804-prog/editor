# SWOOD report editor

DAT is the source of truth for the SwoodReport 3.x client layer. A generated
report folder is only a test fixture.

## Layout

| Path | What |
|---|---|
| [`dat/report/assets/settings/`](dat/report/assets/settings/) | `swood-client.js`, `view-settings.js`, `data-settings.js`, `cost.js` — **edit here** |
| [`dat/Report.cfg`](dat/Report.cfg) | SM_ / MBS_ variables and property mappings |
| [`dat/prtprp/`](dat/prtprp/) | `sheetmetal.prtprp`, `miscellaneous.prtprp` |
| [`reports/Assem1/`](reports/Assem1/) | Assem1 fixture (preview + Node verify) |
| [`tools/verify-report.mjs`](tools/verify-report.mjs) | DOM-stub harness (handoff §10) |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Architecture, quantity chain, known bugs |
| [`docs/INSTALL.md`](docs/INSTALL.md) | Copy files into SWOOD DAT |

Do **not** edit `index.html`, `main*.js`, or `main*.css` inside a generated
report. SWOOD updates must stay safe.

## Preview Assem1 (no SOLIDWORKS)

```bash
npx serve reports/Assem1
```

Open:

- [`/#/summary`](http://localhost:3000/#/summary) — Mgmt / Client 1 / Client 2
- [`/#/weldment-bars`](http://localhost:3000/#/weldment-bars) — Bar Requirement
- [`/#/sheetmetal-layout`](http://localhost:3000/#/sheetmetal-layout) — true-nest (3 sheets)

After JS edits, copy DAT settings into the fixture so preview matches:

```bash
cp dat/report/assets/settings/*.js reports/Assem1/assets/settings/
```

Lock the handoff numbers:

```bash
node tools/verify-report.mjs
node tests/handoff-safety.js
```

The real Generate zip is split (`Assem1.z01` + `Assem1.zip`). See
[`reports/Assem1/README.md`](reports/Assem1/README.md) to join and extract over
the compact fixture.

## Install into SWOOD

Follow [`docs/INSTALL.md`](docs/INSTALL.md). Put the JS files in **DAT**, not
inside a generated report folder.

Eight-point check after Generate (from INSTALL):

- [ ] F12 Console shows `[SwoodClient] product quantities applied to N part(s) … project xN`
- [ ] **Panels** — item count matches distinct panels, not one row per unit
- [ ] **Frames** — Project Qty, Product Qty, Total columns present, footer sums
- [ ] **Sheetmetal Layout** — blanks nested onto shared sheets
- [ ] **Summary** opens on **Mgmt**, sections numbered, empty ones hidden
- [ ] **Client 1** and **Client 2** show the **same total**
- [ ] **Bar Requirement** appears under Weldments in the sidebar
- [ ] Table headers navy with white column titles on every page

`instantiateData` and `useLocalDatabase` stay `false` until those numbers are
proven. After one clean load, flip `useLocalDatabase` to `true` (INSTALL).

## Shop overlay notes

| Topic | Where |
|---|---|
| Bar Requirement lock | `#/weldment-bars` — 720 pieces · 74 bars @ 6 m · ~450.8 kg |
| Glass & Mirror | Overlay page; Assem1 shelf qty 6 |
| Backup folders | `pc-backups/1-ORIGINAL`, `2-FRIEND`, `3-NEW` — do not mix |

Same client also lives at [`swood-client.js`](swood-client.js) (kept in sync
with DAT).
