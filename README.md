# SWOOD report editor

Drop-in files for SwoodReport 3.x (Solid Solutions client layer).

## File to copy

**[`swood-client.js`](swood-client.js)** — copy to:

```
<APP.USERPATH>\DAT\report\assets\settings\swood-client.js
```

For a one-off test without regenerating, also copy it into the report folder:

```
<report>\assets\settings\swood-client.js
```

then Ctrl+F5. A report folder is overwritten on the next Generate.

Same file lives at `dat/report/assets/settings/swood-client.js`.

## Bar Cutting Plan (professional lock)

Open **Weldments → Bar Requirement** (`#/weldment-bars`).

| State | What you see |
|---|---|
| **LOCKED** (default) | Issued document: job, date, bar count, weight. Stock / kerf / density are chips. Rates are not editable. Nest does not recompute. |
| Open | Click **Open** (or press Enter). Inputs, Re-nest, and Issue & lock appear. No PIN. |
| **Issue & lock** | Stores the current nest as the issued plan and locks again. |

Assem1 expected figures (unchanged): 720 pieces · 74 bars @ 6 m · ~450.8 kg.

## Glass & Mirror

Sidebar **Glass & Mirror** (under Saw Machine Data). Split by **Category / Frame / Material**. Only panels whose material is GLASS or MIRROR (Assem1: `Shelf_Master Shelves_…` Qty 6).

Those rows are **removed from Saw Machine Data**. Summary **3. Glass** / **3b. Mirror** use the same piece qty, not the old m² stock article.

Optional part checkbox: copy `dat/prtprp/glass-mirror.prtprp` into SOLIDWORKS `lang\english\` and tick **This part is a mirror**.

## Backup folders (`pc-backups/`)

Only three folders. Do not mix them.

| Folder | What it is |
|---|---|
| `1-ORIGINAL/` | Frozen readable working set. Do not edit. |
| `2-FRIEND/` | Obfuscated DAT zip to send. Do not edit. |
| `3-NEW/` | Cut List Optimizer pack method (same panel data). Edit here only. |

To try the new pack method, copy `pc-backups/3-NEW/swood-client.js` onto DAT `report\assets\settings\` and the open report, then Ctrl+F5. The Pattern List page stays the same.

Install notes: [docs/INSTALL.md](docs/INSTALL.md).
