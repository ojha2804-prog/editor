# Report editor

Browser viewer for **SWOOD Report 3** customisation (client layer
`swood-client.js` v6.15.0) plus generated HTML reports. SOLIDWORKS is not
required to *open* a generated report; it is required to *regenerate* one.

## Layout

| Path | What |
|---|---|
| [HANDOFF.md](HANDOFF.md) | Architecture, quantity chain, summary modes, known bugs |
| [INSTALL.md](INSTALL.md) | Copy files into SWOOD DAT, clear IndexedDB, verify |
| [dat/](dat/) | DAT customisation (`data-settings.js` and related clients) |
| [reports/example/](reports/example/) | Stock SwoodReport Stn3 example (runnable in the browser) |
| [reports/Assem1/](reports/Assem1/) | Drop the extracted Assem1 report here |

## View a report (no SOLIDWORKS)

```bash
python3 -m http.server 5173 --directory reports/example
```

Open http://localhost:5173

Do not open `index.html` as a file. The report is a Vite ES-module app and
needs HTTP.

`data-settings.js` in the example already includes the `swood-client.js`
loader. Until that file is present under `assets/settings/`, the console
shows `swood-client.js not found - running stock report` and the stock
UI still works.

## Install into SWOOD (with SOLIDWORKS)

Follow [INSTALL.md](INSTALL.md). Put the three JS files in **DAT**, not
inside a generated report folder.

## Assem1

`files.zip` is the customisation pack. `Assem1.z01` + `Assem1.zip` is the
split generated report (300 files, ~56 MB uncompressed). See
[reports/Assem1/README.md](reports/Assem1/README.md) to join and extract.

Reference project: `D:\SWOOD_LIBRARY 2026\WD\Assem1.SLDASM` →
`C:\Swood Reports\2026_09\Assem1`.
