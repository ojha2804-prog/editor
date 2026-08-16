# SOLIDWORKS add-in: Export Flat Pattern DXF

Same output as [`macros/ExportFlatPatternDXF.bas`](../macros/ExportFlatPatternDXF.bas), as a loadable add-in with a toolbar/menu command.

- DXF: `<report>\dxfs\sheetmetal\<Part>_<Config>.dxf`
- Nest SVG: `<report>\images\sheetmetal\nest-<Part>_<Config>.svg`
- Newest folder under `C:\Swood Reports\<YYYY_MM>\<DocName>` (editable in `ExportFlatPatternDXF.json`)

The model is not modified. SOLIDWORKS flattens internally for export.

## Build (Windows, Visual Studio)

1. Open `addin/ExportFlatPatternDXF.sln` in Visual Studio 2019 or later.
2. Target **.NET Framework 4.8**, platform **x64**.
3. Build **Release**.
4. Output: `addin/ExportFlatPatternDXF/bin/Release/ExportFlatPatternDXF.dll`

`SolidWorks.Interop.swpublished.dll` is already in `lib\`. SOLIDWORKS API calls are late-bound, so you do not need the rest of the SOLIDWORKS interop set on the build machine. You still need SOLIDWORKS installed on the PC that **runs** the add-in.

## Install

Close SOLIDWORKS. From an **Administrator** PowerShell:

```powershell
cd path\to\editor\addin
.\Install.ps1
```

Or by hand:

```text
%windir%\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe /codebase "full\path\ExportFlatPatternDXF.dll"
```

Start SOLIDWORKS → **Tools → Add-Ins…** → enable **Export Flat Pattern DXF**.

## Run

1. Generate the SWOOD report.
2. Open the assembly (or a sheet-metal part).
3. Click **Export Flat Pattern DXF** on the command tab / Tools menu.

Edit stock sizes, gap, margin, and `ReportsRoot` in `ExportFlatPatternDXF.json` next to the DLL (no rebuild). Keep those numbers in step with `assets/js/sheetmetal-nest.js`.

## Uninstall

```powershell
.\Uninstall.ps1
```
