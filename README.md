# editor

Report editor tools for SWOOD reports: sheet-metal flat-pattern DXF export and nesting.

## Sheet-metal flat pattern nesting

SWOOD’s DXF exporter only writes **PANEL** and **PROGRAM** geometry. True sheet-metal flat patterns have to come from the SOLIDWORKS API.

| File | Role |
| --- | --- |
| [`macros/ExportFlatPatternDXF.bas`](macros/ExportFlatPatternDXF.bas) | SOLIDWORKS macro: export every sheet-metal part as DXF, write nest SVGs |
| [`assets/js/sheetmetal-nest.js`](assets/js/sheetmetal-nest.js) | Same stock sizes / gap / margin as the macro (table + drawing stay in step) |
| [`assets/js/sheetmetal-client.js`](assets/js/sheetmetal-client.js) | Report overlay at `#/sheetmetal` |

Ready-to-copy files: [`downloads/`](downloads/). Usage: [`docs/SHEETMETAL.md`](docs/SHEETMETAL.md).

### Nesting rule

Every listed stock sheet is tried for every blank.

- **Drawings** (macro SVG, no job quantity): lowest **stock area per blank**.
- **Table** (report, with quantity): lowest **steel bought** — sheet area × sheets needed. Leftover on the last sheet is why 20 off of 818.5 × 418.5 mm prefers 2500 × 1250.

Worked example, 818.5 × 418.5 mm blank, 20 off, 5 mm gap, 10 mm margin:

| Stock | Per sheet | Sheets | Steel bought |
| --- | --- | --- | --- |
| 2500 × 1250 | 6 | 4 | **12.50 m²** (cheaper) |
| 3000 × 1500 | 9 | 3 | 13.50 m² |

### Tests

```bash
node tests/sheetmetal-nest.test.js
node tests/sheetmetal-client.test.js
node tests/constants-sync.test.js
```
