# Sheet-metal flat pattern DXF and nesting

## What you get

1. **ExportFlatPatternDXF** — SOLIDWORKS macro. Walks the active assembly (or part), exports a true flat-pattern DXF per sheet-metal configuration, and writes a nest drawing SVG next to the SWOOD report.
2. **sheetmetal-client.js** — browser overlay on the generated report (`#/sheetmetal`). Printed table uses the same stock list / gap / margin as the macro. Drawings prefer `images/sheetmetal/nest-<Part>_<Config>.svg`; if that file is missing, a rectangle grid is shown from the report blank size.

The model is not modified. SOLIDWORKS flattens internally for export; Flat-Pattern can stay suppressed.

## Install the macro

1. Generate the SWOOD report first (folders under `C:\Swood Reports\<YYYY_MM>\<DocName>`).
2. Open the assembly in SOLIDWORKS.
3. **Tools → Macro → New…** → save as `ExportFlatPatternDXF.swp`.
4. Delete all default text in `Module1`.
5. Paste [`macros/ExportFlatPatternDXF.bas`](../macros/ExportFlatPatternDXF.bas) (do **not** paste `Attribute VB_Name`).
6. Confirm `REPORTS_ROOT` (`C:\Swood Reports` by default).
7. **F5**.

Outputs:

- `<report>\dxfs\sheetmetal\<PartName>_<Config>.dxf`
- `<report>\images\sheetmetal\nest-<PartName>_<Config>.svg`

If no report folder is found, generate the SWOOD report, then run again. The newest month folder that matches the document name is used automatically.

## Install the report page

Copy into the report’s `assets/js/` folder, then add after the main app script in `index.html`:

```html
<script src="assets/js/sheetmetal-nest.js"></script>
<script src="assets/js/sheetmetal-client.js"></script>
```

Open the report and go to `#/sheetmetal` (a **Sheetmetal Nesting** link is added to the side drawer when that control exists).

## Keep numbers in step

Edit stock sizes in **both** places, and keep the arrays the same length:

| Setting | VBA | JavaScript |
| --- | --- | --- |
| Sheet count | `NEST_SHEET_COUNT` | `SHEETS.length` |
| Lengths / widths | `SheetLengths()` / `SheetWidths()` | `SHEETS[].L` / `SHEETS[].W` |
| Gap | `NEST_GAP` | `PART_GAP` |
| Margin | `NEST_MARGIN` | `SHEET_MARGIN` |
| Rotation | `NEST_ALLOW_ROTATION` | `ALLOW_ROTATION` |

`node tests/constants-sync.test.js` fails if those drift.

## DXF contents

`SM_OPTIONS = 69` is outline + bend lines + forming tools. Drop to `1` if the cutter chokes on extra entities.
