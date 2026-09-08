# Assem1 sample report

This folder is the drop-in location for the generated SWOOD report
`C:\Swood Reports\2026_09\Assem1`.

The upload was a split zip:

- `Assem1.z01` — first volume (8 MiB)
- `Assem1.zip` — last volume (central directory)

## Extract (when you have both parts)

Put both files in the same directory, then:

```bash
# Join volumes, then extract. 7z handles split zips directly:
7z x Assem1.zip -oAssem1

# Or with Info-ZIP:
zip -s- Assem1.zip -O Assem1-combined.zip
unzip Assem1-combined.zip
```

Skip these bulky generated artefacts if you only need a browser-runnable
report (they are not required by `index.html`):

- `Assem1/steps/Assem1_Default.step` (~7.6 MB)
- `Assem1/edrawings/Assem1_Default.html` (~9.6 MB)
- `Assem1/assets/js/main*.js - Copy.js` duplicates
- `Assem1/programs/*.MPR` / `*.TPS` CNC programs

After extracting, copy `dat/data-settings.js` (and `swood-client.js` /
`view-settings.js` when present) into `Assem1/assets/settings/` for a
quick test, then serve:

```bash
python3 -m http.server 5173 --directory reports/Assem1
```

Open http://localhost:5173 — file:// will not load the Vite ES modules.
