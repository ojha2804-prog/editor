# SolidWorks Drawing Macros

VBA macros that create SolidWorks drawings (`.SLDDRW`) from Parts and Assemblies.

## What you get

| Macro | Purpose |
| --- | --- |
| `macros/CreateDrawing.bas` | Create a drawing from the **active** Part/Assembly |
| `macros/BatchCreateDrawings.bas` | Create drawings for every Part/Assembly in a **folder** |

Each drawing includes:

- 3rd-angle standard views (Front / Top / Right) — switchable to 1st angle
- Shaded isometric view
- Bill of Materials for assemblies
- Optional model dimensions for parts
- Saved next to the model as `<ModelName>.SLDDRW`

## Install (SolidWorks)

1. Open SolidWorks.
2. **Tools → Macro → New…** (or Edit an existing `.swp`).
3. In the VBA editor: **File → Import File…**
4. Import `macros/CreateDrawing.bas` (and optionally `BatchCreateDrawings.bas`).
5. Optional: set `DRAWING_TEMPLATE_PATH` at the top of `CreateDrawing.bas` to your company `.drwdot`.
6. Save the macro project (e.g. `CreateDrawing.swp`).

### Run single drawing

1. Open a Part or Assembly (save it to disk first).
2. **Tools → Macro → Run…** → select the module → `main`.

### Run batch

1. Edit `FOLDER_PATH` in `BatchCreateDrawings.bas`.
2. Run `BatchCreateDrawings.main`.

## Configuration (`CreateDrawing.bas`)

```vb
DRAWING_TEMPLATE_PATH   ' e.g. "C:\Templates\A3_Landscape.drwdot"  ("" = SW default)
USE_THIRD_ANGLE         ' True = ANSI 3rd angle, False = ISO 1st angle
ADD_ISOMETRIC           ' shaded iso view
ADD_BOM_FOR_ASSEMBLY    ' insert BOM on assemblies
ADD_MODEL_DIMENSIONS    ' insert model items on parts
OVERWRITE_EXISTING      ' replace existing .SLDDRW
```

## Requirements

- SolidWorks with VBA macros enabled (**Tools → Options → System Options → Macro**)
- Model must be saved on disk (views reference the file path)
- Drawing template should match your title-block / sheet format standards

## Notes

- Sheet size falls back to A3 landscape if no template is found.
- Batch mode opens/closes each model silently; keep the folder size reasonable.
- API calls used: `NewDocument`, `Create3rdAngleViews2` / `Create1stAngleViews2`, `CreateDrawViewFromModelView3`, `InsertBomTable4`, `InsertModelAnnotations3`.
