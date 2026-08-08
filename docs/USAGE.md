# Drawing macro quick reference

## Single model → drawing

```
Active Part/Assembly
        │
        ▼
  New drawing from template
        │
        ├── Create3rdAngleViews2  (Front / Top / Right)
        ├── CreateDrawViewFromModelView3("*Isometric")
        ├── InsertBomTable4       (assemblies only)
        └── SaveAs <Model>.SLDDRW
```

## Typical customize points

1. **Company template** — set `DRAWING_TEMPLATE_PATH` to your `.drwdot`.
2. **1st vs 3rd angle** — `USE_THIRD_ANGLE`.
3. **Title block data** — comes from model custom properties mapped in the template (no macro change needed if properties already exist).
4. **Scale** — controlled by the sheet format / `UseSheetScale` on views.
5. **BOM template** — pass a `.sldbomtbt` path into `InsertBomTable4` if you need a custom layout.
