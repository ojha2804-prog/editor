# Copy these onto YOUR PC — not required on GitHub

Put them in a folder you control, for example:

```
D:\SWOOD_BACKUP\
```

## Stage files (this pack)

| File | What it is |
|---|---|
| `STAGE-01-before-glass-page.js` | Working client **before** Glass & Mirror (Saw still showed GLASS). Restore this if a page goes blank. |
| `STAGE-02-glass-pages-fixed.js` | Early Glass & Mirror overlay. |
| `STAGE-11-glass-mirror-final.js` | **Last good production** after Glass & Mirror (v6.18.5, mirror sizes, Qty lock). Before DXF timing/stuck. See COPY-STAGE-11.txt. |
| `STAGE-12-sheetmetal-wip.js` | Snapshot of the later Sheetmetal Layout / ExportToDWG2 client (v6.19.0). |
| `STAGE-12-ExportFlatPatterns.bas` | Snapshot of the in-SolidWorks unfold macro. |
| `STAGE-12-SheetMetalGeometry.vbs` | Snapshot of the DXF POSTPROCESS VBS. |
| `../swood-client.js.BAK` | Same as STAGE-01 (side-by-side BAK). |
| `backup/swood-client.pre-glass-mirror.js` | Same as STAGE-01. |
| `backup/swood-client.glass-mirror-final.js` | Same as STAGE-11. |

## Restore on the PC

1. Copy one STAGE file.
2. Rename it to `swood-client.js`.
3. Paste into:

```
D:\SWOOD_LIBRARY 2026\DATA\DAT\report\assets\settings\
```

and also into:

```
C:\Swood Reports\2026_09\Assem1\assets\settings\
```

4. Close the report tab, open `index.html` again (or Ctrl+F5).

## Backup every future change (on the PC only)

Run `backup-to-pc.bat` after you edit, or in Explorer copy `swood-client.js` into:

```
D:\SWOOD_BACKUP\YYYY-MM-DD_note\
```

GitHub: repo **Settings → Danger Zone → Change visibility → Make private**. Stop `git push` if you do not want copies online.
