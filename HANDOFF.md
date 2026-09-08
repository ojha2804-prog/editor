# SwoodReport customisation — handoff

SWOOD Report **v3.0.0.R15 prem** · client layer **swood-client.js v6.15.0**
Reference project used throughout: `C:\Swood Reports\2026_09\Assem1`

---

## 1. Files and where they go

| File | Destination | Purpose |
|---|---|---|
| `swood-client.js` | `<APP.USERPATH>\DAT\report\assets\settings\` | the whole customisation layer |
| `view-settings.js` | same | stock page definitions, lightly edited |
| `data-settings.js` | same | two data-model flags |
| `Report.cfg` | wherever the live one is | adds two variables |
| `sheetmetal.prtprp` | `<SOLIDWORKS>\lang\english\` | property form, sheet metal parts |
| `miscellaneous.prtprp` | same | property form, excluded priced items |

**Put the three JS files in `DAT`, not in a report folder.** A report folder is
rebuilt from `DAT` on every generation, so anything edited there is lost on the
next run. This wasted several hours during development — fixes appeared not to
work when in fact they were being overwritten.

For a quick test without regenerating, copy the JS into the report's own
`assets\settings\` **as well** and press Ctrl+F5. Remember it will be
overwritten next generation.

---

## 2. How the layer attaches

```
index.html
  └─ main.js  ── fetches ──►  assets/settings/data-settings.js
                                 └─ injects  assets/settings/swood-client.js
                              fetches ──►  assets/settings/view-settings.js
                                 └─ calls window.SwoodClient.apply(viewSettings)
```

`data-settings.js` is loaded and awaited before `view-settings.js`, which makes
it the earliest safe hook. The loader block at the top of that file must not be
removed.

`swood-client.js` works two ways:

* **`SC.registerPage` / `registerColumns` / `registerMenu`** — declarative
  changes merged into `viewSettings` by `SC.apply()`. Used for native pages.
* **Overlay engine** — draws its own DOM over a route, leaving the stock page
  untouched underneath. Used where the stock page cannot express what is needed.

`CONFIG.takeOver` decides which routes the overlay owns:

```
patterns · patternTable · patternedPanels · summary · sheetMetal · panelProcesses
```

### Routes

```
#/summary              Mgmt / Client 1 / Client 2 / Factory   (overlay)
#/panel-processes      Panel & Part Process                   (overlay)
#/panel-processes/zones Process Zones                         (overlay)
#/sheetmetal-parts     Sheetmetal Parts                       (registered page)
#/sheetmetal-layout    Sheetmetal Layout                      (overlay)
#/sheetmetal-quantities Sheetmetal Quantities                 (registered page)
#/weldment-bars        Bar Requirement                        (overlay)
#/patterns             Pattern list                           (overlay)
```

### The IIFE trap — read before editing

`swood-client.js` is **three separate IIFEs**:

```
line   15 – 1974   IIFE 1   SC, CONFIG, page/column/menu registration
line 1984 – 6269   IIFE 2   the overlay engine, all render* functions
line 6294 – end    IIFE 3   the sheet metal detail guard
```

They do **not** share scope. Code in IIFE 2 cannot see `SC` or `CONFIG`
directly. It must do what the surrounding code already does:

```js
var SC = window.SwoodClient                       // for SC
var cfg = (window.SwoodClient && window.SwoodClient.config &&
           window.SwoodClient.config.summary) || {}   // for CONFIG
```

This was hit three times during development. The symptoms are a blank page with
"CONFIG is not defined", or a feature that silently never registers because a
`ReferenceError` killed the whole IIFE. If a page goes blank after an edit,
check this first.

---

## 3. Configuration

All knobs are in `CONFIG` near the top of `swood-client.js` (IIFE 1).

| Key | Meaning |
|---|---|
| `takeOver` | which routes the overlay owns |
| `quantity` | which custom properties drive project / product quantity |
| `summary.costFactor` | Mgmt & client factor — `{ value: 1.5, min: 1.5, max: 1.75, step: 0.05 }` |
| `summary.countertopWords` | keywords that route a material to section 5 |
| `weldments` | `{ stockLength: 6000, kerf: 5, trim: 0, density: 7.85 }` |
| `coating` | process rate table, area models |
| `sheetMetal` | nesting sheet sizes, trim, kerf, grain rotations |
| `currency` | symbol used by every cost column |

Runtime state (mode, unit toggle, typed rates) lives in `UI` and is not
persisted between page loads by design.

---

## 4. The quantity chain

Every quantity in the report is:

```
NB  ×  Product Quantity  ×  Project Quantity
```

* **Project Quantity** — custom property on the top assembly (`Assem1`), = 10
* **Product Quantity** — custom property on each cabinet, = 8 / 5 / 3 / 2

A hook in `swood-client.js` scales `NB` on every part beneath a product, and
hands Project Quantity to SWOOD's own multiplier. It logs what it did:

```
[SwoodClient] product quantities applied to 41 part(s):
  DOWN_CABINET_ONE_PROD_Assem1_1 x8, ..._2 x5, ..._3 x3, ..._4 x2  |  project x10
```

**To verify quantities are right, read that console line first.** If a product
is missing from it, its parts are not being scaled.

Worked example — `Bottom_..._Assem1_1`: `NB 1 × 8 × 10 = 80`.

---

## 5. The Summary page

Four modes on one route. `mgmtSections()` builds every section once; every mode
renders from that single result, so they cannot disagree — including rates
typed over the top in Mgmt.

### Mgmt — 13 sections, each hidden when empty

| # | Section | Source |
|---|---|---|
| 1 | Boards | cutting-pattern boards only |
| 2 | Material | used in the job, **no board in the library** |
| 3 | Glass | material flag `GLASS = True` |
| 4 | Solidwood / Hardwood | flag `HARDWOOD = True` |
| 5 | Countertops / Corian | keyword match (no flag exists) |
| 6 | Laminates | |
| 7 | Edgebands | |
| 8 | Weldments | **purchased weight in kg**, rate per kg |
| 9 | Sheetmetal | sheets, sheet size, weight/sheet, rate per kg |
| 10 | Hardware | editable rate |
| 11 | Panel & Part Process | `processZones` **merged with** `collectCoated` |
| 12 | Miscellaneous | `Exclude = Yes` items carrying a price |
| 13 | Cost factor | 1.5–1.75, applied to the grand total |

Glass, Hardwood and Weldment classify themselves — SWOOD publishes
`GLASS / HARDWOOD / METAL / PANEL / PROFILE / WELDMENT` on every material.
Countertops has no equivalent flag, hence `CONFIG.summary.countertopWords`.

Section 2 deliberately excludes materials already costed as a board in section
1; including both would double-count.

### Client 1 — quotation, one priced line per section

### Client 2 — quotation, frame-wise

One line per **frame**; sub-frames roll into their parent. Costs come from the
cutting data — board area × rate, edging, processes, hardware, waste share,
sheet metal and weldments — attributed by walking the assembly tree.

**Reconciliation is structural.** The last line is computed as

```js
residual = sectionTotal - attributed
```

so Client 1 and Client 2 always agree. If a new cost type is added later and
nobody attributes it frame-wise, it appears as *Unassigned / Project-level*
instead of vanishing from the quote. Currently the residual is ₹0.00.

---

## 6. Bar Requirement (`#/weldment-bars`)

Tube is bought in fixed lengths, so metres is not a purchasable number. The
page cuts the required pieces from 6 m bars using first-fit-decreasing and
reports bars, weight, drop and yield, with a scaled nesting sheet and a
cutting plan per bar.

Verified on Assem1:

```
PROS_20x20x2   1.015 kg/m
720 pieces · 432.80 m used · 74 bars @ 6 m · drop 11.20 m · yield 97.5%
Procurement weight 450.8 kg
```

Summary section 8 uses the same nest, so the two pages always agree and both
follow the stock-length and kerf boxes.

**Weight had to be derived.** `MBS_Weight` is 0 throughout and `MAT_DENSITY` is
1000 — SOLIDWORKS' default, i.e. never set. Part `MASS` is populated, and at
density 1000 that figure is effectively a volume, so it is divided out and a
real density applied (box on the page, default 7.85 g/cm³). Set `MAT_DENSITY`
properly in the material library and it is used instead.

---

## 7. Bugs found and fixed — keep these in mind

**Weldment length read the wrong field.** On a profile, SWOOD writes
`ST_L = 20` (the section), `ST_W = 20`, and the real length in `ST_T`.
`ST_N` is a name, not a count. The costing article uses `ST_L`, so every
700 mm tube was costed as 20 mm: **4.800 m instead of 432.800 m**, ₹24 instead
of ₹2,164.

**`processZones` is not all processes.** It covers panel zones only. The metal
coatings — POWDERCOAT, BUFFING, PVD, RED OXIDE — live in `collectCoated`.
Section 11 showed 2 of 6 processes and frame-wise totals were 42.8% light,
PVD alone being ₹88,388. Both sources are now merged, keyed by name, keeping
the `processZones` figure where a name appears in both.

**Expression engine cannot index by string.** `view-settings.js` field
expressions run through *expr-eval*, whose index operator is
`function (i, e) { return i[e | 0] }`. The `| 0` turns a string key into `0`,
so `swcps["Product Quantity"]` reads `swcps[0]`. Use the registered
`get(obj, "path", fallback)` helper, which splits on `.` and handles spaces.
`root` is **not** in scope in a table column — referencing it renders «error».

**`useLocalDatabase: true` caches the model in IndexedDB** keyed by project and
returns it on every later load, ignoring `data-settings.js` entirely. Ctrl+F5
does not clear it. This made several correct fixes look like failures.

**`instantiateData: true` explodes every list** — one row per physical instance
with quantity 1. On Assem1 that gave 108 panel rows and 960 hardware rows, and
every Qty collapsed to 1. Left `false`.

---

## 8. Verification checklist

Regenerate, then confirm:

- [ ] Console shows `product quantities applied to 41 part(s) … project x10`
- [ ] Panels — **24 items**, not 108
- [ ] Frames — Project Qty 10, Product Qty 8/5/3/2, Total 80/50/30/20, footer 180
- [ ] Sheetmetal Layout — 3 sheets, not 12
- [ ] Summary → Mgmt — numbered sections, empty ones hidden
- [ ] Summary → Client 1 and Client 2 — **totals identical**
- [ ] Bar Requirement — under Weldments, 74 bars, 450.8 kg
- [ ] Native table headers navy with white titles on every page

---

## 9. Open items

1. **Set `MAT_DENSITY`** on `Plain Carbon Steel` and `AISI 304`. Until then
   sheet metal weight shows a dash — deliberately, rather than a wrong number.
2. **Enter rates** for sheet metal, edgebands and hardware; they read ₹0.00.
3. **`useLocalDatabase`** — once figures are settled, open the report once with
   it `false` so the correct model builds, then set it back to `true`. Leaving
   it `false` means in-report edits do not persist between visits.
4. **Cut-list properties are stale.** `SM_BlankLength`/`Width` are identical
   across all four instances while the true flat patterns differ. Re-run
   `CopySheetMetalProps` and save the parts.
5. **`Material <not specified>` at 4 mm** — a sheet metal material with no
   library entry. It will appear in section 2 once it has a cost.
6. **Cost .js file** — planned. When it lands it can populate `unitCost` on any
   section; manual entries stay as overrides via the `RATES` map.

---

## 10. Testing without SOLIDWORKS

Render functions can be executed against a real report's data in Node with a
small DOM stub — this is how every change above was verified before delivery,
and it catches scope errors and wrong field names in seconds.

```js
global.window = { addEventListener(){}, location:{hash:'#/summary'}, ... }
global.document = { createElement: stub, head: stub(), ... }
eval(fs.readFileSync('report-data-raw.js','utf8')
       .replace('const reportDataRaw =','global.reportDataRaw='))
eval(fs.readFileSync('swood-client.js','utf8'))
// expose renderSummary from inside IIFE 2, call it, inspect app.innerHTML
```

Use it. Reading the code is not enough — two separate scope bugs shipped
because they were only caught in the browser.
