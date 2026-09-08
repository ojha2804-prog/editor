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

## Backup / restore

Before the glass edit:

- `dat/report/assets/settings/backup/swood-client.pre-glass-mirror.js`
- `dat/report/assets/settings/swood-client.js.BAK`

## If Saw or Glass & Mirror is blank

The first Glass filter hid **every** row (the Kind field was empty). Copy **`pc-backups/STAGE-02-glass-pages-fixed.js`** over DAT `swood-client.js` (and the Assem1 report folder) and Ctrl+F5.

To go back to the last good Saw page (glass still on Saw): use **`pc-backups/STAGE-01-before-glass-page.js`**.

Install notes: [docs/INSTALL.md](docs/INSTALL.md).
