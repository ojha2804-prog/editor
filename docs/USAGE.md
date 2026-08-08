# Drawing macro quick reference

## Flow

```
Active Assembly
        │
        ├── AutoExplode (or existing explode)
        ├── ShowExploded2
        ▼
  New drawing
        │
        ├── Sheet 1 — orthographic + isometric
        ├── Sheet "Exploded"
        │     ├── Isometric + ShowExploded
        │     ├── BOM
        │     └── AutoBalloon5
        ├── Save <Model>.SLDDRW
        ├── Export <Model>.pdf          (all sheets)
        └── Export <Model>_<Sheet>.png  (one image per sheet)
```

## Files written (example `C:\CAD\Bracket.sldasm`)

| File | Contents |
| --- | --- |
| `Bracket.SLDDRW` | SolidWorks drawing |
| `Bracket.pdf` | Multi-sheet PDF |
| `Bracket_Sheet1.png` | Image of sheet 1 |
| `Bracket_Exploded.png` | Image of exploded + balloons sheet |

## Preview assets in this repo

| Path | Description |
| --- | --- |
| `output/previews/preview-sheet1-standard-views.png` | Illustrative Sheet 1 |
| `output/previews/preview-sheet2-exploded-balloons.png` | Illustrative Exploded + balloons |
| `output/sample-assembly-drawing.pdf` | Combined sample PDF |

## Tips

1. Set `DRAWING_TEMPLATE_PATH` to your company `.drwdot`.
2. Prefer a hand-built explode via `PREFERRED_EXPLODE_NAME`; use AutoExplode as fallback.
3. Balloons need a BOM on the same view (`ADD_BOM_FOR_ASSEMBLY = True`).
4. Turn exports on/off with `EXPORT_PDF` / `EXPORT_IMAGES`.
