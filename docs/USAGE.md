# Drawing macro quick reference

## Single model → drawing

```
Active Part/Assembly
        │
        ├── (assembly) EnsureExplodedView / AutoExplode
        ├── (assembly) ShowExploded2(True, explodeName)
        ▼
  New drawing from template
        │
        ├── Sheet 1
        │     ├── Create3rdAngleViews2  (Front / Top / Right)
        │     └── CreateDrawViewFromModelView3("*Isometric")
        │
        └── Sheet "Exploded"  (assemblies)
              ├── Isometric + View.ShowExploded = True
              ├── InsertBomTable2
              ├── AutoBalloon5
              └── SaveAs <Model>.SLDDRW
```

## Exploded views

1. If `PREFERRED_EXPLODE_NAME` exists in the assembly, that explode is used.
2. Otherwise the first existing explode is used.
3. If none exist and `AUTO_CREATE_EXPLODE = True`, `AssemblyDoc.AutoExplode` creates one (saved back to the assembly).
4. Drawing view uses `IView.ShowExploded = True`.

Tip: for production drawings, define a named explode manually (with trail lines) and set `PREFERRED_EXPLODE_NAME` — AutoExplode is a convenience, not a substitute for a curated explode.

## Auto balloons

- Applied to the exploded view after the BOM is inserted.
- Item numbers follow the BOM (`swBalloonTextItemNumber`).
- Layout controlled by `BALLOON_LAYOUT` (Square / Circle / Top / …).

## Typical customize points

1. **Company template** — set `DRAWING_TEMPLATE_PATH` to your `.drwdot`.
2. **1st vs 3rd angle** — `USE_THIRD_ANGLE`.
3. **Named explode** — `PREFERRED_EXPLODE_NAME`.
4. **Balloon layout** — `BALLOON_LAYOUT`.
5. **BOM template** — pass a `.sldbomtbt` path into `InsertBomTable2` if you need a custom layout.
6. **Title block data** — model custom properties mapped in the drawing template.
