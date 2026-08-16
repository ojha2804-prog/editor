# Sheet-metal flat pattern DXF and nesting

## What you get

1. **ExportFlatPatternDXF add-in** — SOLIDWORKS command (**Tools → Add-Ins**, then the **Export Flat Pattern DXF** button). Same DXF + nest SVG as the macro. See [`addin/README.md`](../addin/README.md).
2. **ExportFlatPatternDXF macro** — paste-in VBA if you do not want to register a DLL.
3. **sheetmetal-client.js** — browser overlay on the generated report (`#/sheetmetal`).

The model is not modified. SOLIDWORKS flattens internally for export; Flat-Pattern can stay suppressed.

## Install the add-in (recommended)

On a Windows PC with Visual Studio and SOLIDWORKS:

1. Open `addin/ExportFlatPatternDXF.sln` → Build **Release** (x64, .NET Framework 4.8).
2. Close SOLIDWORKS. Administrator PowerShell:

```powershell
cd addin
.\Install.ps1
```

3. SOLIDWORKS → **Tools → Add-Ins…** → **Export Flat Pattern DXF**.
4. Open the assembly, generate the SWOOD report, click **Export Flat Pattern DXF**.

Stock sizes live in `addin/ExportFlatPatternDXF/ExportFlatPatternDXF.json` (copied next to the DLL). No rebuild to change them.

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

| Setting | VBA | JavaScript | Add-in JSON |
| --- | --- | --- | --- |
| Sheet count | `NEST_SHEET_COUNT` | `SHEETS.length` | `Sheets.length` |
| Lengths / widths | `SheetLengths()` / `SheetWidths()` | `SHEETS[].L` / `SHEETS[].W` | `Sheets[].L` / `Sheets[].W` |
| Gap | `NEST_GAP` | `PART_GAP` | `NestGapMm` |
| Margin | `NEST_MARGIN` | `SHEET_MARGIN` | `NestMarginMm` |
| Rotation | `NEST_ALLOW_ROTATION` | `ALLOW_ROTATION` | `AllowRotation` |

`node tests/constants-sync.test.js` fails if those drift.

## DXF contents

`SM_OPTIONS = 69` is outline + bend lines + forming tools. Drop to `1` if the cutter chokes on extra entities.
