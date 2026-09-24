# Assem1 sample report

Drop-in location for the generated SWOOD report
`C:\Swood Reports\2026_09\Assem1`.

This folder currently holds a **compact fixture** (`db/report-data-raw.js`)
that reproduces the handoff numbers in Node (`node tools/verify-report.mjs`)
and in a local preview. Replace it with the real Generate output when you
have the split zip.

## Extract the real report (when you have both parts)

The upload is a split zip:

- `Assem1.z01` — first volume
- `Assem1.zip` — last volume (central directory)

Put both files in the same directory, then:

```bash
7z x Assem1.zip -oreports/Assem1

# or Info-ZIP:
zip -s- Assem1.zip -O Assem1-combined.zip
unzip Assem1-combined.zip -d reports/Assem1
```

Skip bulky artefacts if you only need a browser-runnable report:

- `steps/Assem1_Default.step`
- `edrawings/Assem1_Default.html`
- `assets/js/main*.js - Copy.js`
- `programs/*.MPR` / `*.TPS`

After extracting, copy DAT settings into this folder so preview matches DAT:

```bash
cp dat/report/assets/settings/swood-client.js reports/Assem1/assets/settings/
cp dat/report/assets/settings/view-settings.js reports/Assem1/assets/settings/
cp dat/report/assets/settings/data-settings.js reports/Assem1/assets/settings/
cp dat/report/assets/settings/cost.js reports/Assem1/assets/settings/
```

Then:

```bash
npx serve reports/Assem1
```

Open `/#/summary`, `/#/weldment-bars`, `/#/sheetmetal-layout`. `file://` will
not load the Vite ES modules of a real Generate folder.

## Rebuild the compact fixture

```bash
node tools/build-assem1-fixture.mjs
```
