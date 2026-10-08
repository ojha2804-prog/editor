# Replace the GitHub tree with this pack

The old repo mixed live DAT, three frozen backup folders, root copies of
`swood-client.js`, an obfuscated client, and a friend zip. Use **this pack
only**. Delete the rest on GitHub, then add these files.

## 1. Download the zip

`SWOOD-EDITOR-USEFUL.zip` — live overlay + Assem1 fixture + tests + docs.

## 2. Delete these from GitHub (do not copy them forward)

| Path | Why it goes |
|---|---|
| `pc-backups/` | Frozen 1-ORIGINAL / 2-FRIEND / 3-NEW copies of the same DAT |
| `pc-backups/2-FRIEND/SWOOD-DAT-FRIEND-2026-09-14.zip` | Old snapshot inside a snapshot |
| `swood-client.js` (repo root) | Duplicate of `dat/report/assets/settings/swood-client.js` |
| `swood-client.obfuscated.js` | Generated; do not edit or commit |
| `tools/obfuscate-swood-client.js` | Friend-pack helper, not live DAT |
| `tools/obfuscate-friend-client.js` | Same |

Keep GitHub history if you want a rollback. You do **not** need those folders
in `main` going forward.

## 3. Add / keep these (the zip contents)

```
README.md
.gitignore
docs/HANDOFF.md
docs/INSTALL.md
docs/GITHUB-REPLACE.md
dat/                          ← copy this tree onto live SWOOD DAT
  Report.cfg
  PATHS.txt
  SM_Density.insert.cfg
  report/assets/settings/     swood-client.js, view-settings.js, data-settings.js, cost.js
  prtprp/                     sheetmetal, miscellaneous, glass-mirror
  apps/                       SheetMetalGeometry.bas/.vbs, backup cmds, NestingWorks
reports/Assem1/               local preview + Node fixture
tests/
tools/verify-report.mjs
tools/build-assem1-fixture.mjs
```

## 4. Two ways to refresh GitHub

### A. This branch / PR (already applied here)

The clutter paths are removed on this branch. Merge it, or reset `main` to it.

### B. Empty repo, upload the zip (cleanest)

1. GitHub → the repo → **Add file** is not enough for a full replace.
2. Locally:

```bash
unzip SWOOD-EDITOR-USEFUL.zip -d swood-editor
cd swood-editor
git init
git add .
git commit -m "Fresh SWOOD editor pack (DAT source of truth)"
git branch -M main
git remote add origin https://github.com/ojha2804-prog/editor.git
git push -u origin main --force
```

`--force` rewrites `main`. Only do that if you are sure you do not need the
old backup folders on GitHub. Keep the zip on disk either way.

## 5. After GitHub is fresh — copy onto the PC

Follow [INSTALL.md](INSTALL.md). Short version:

```
dat\report\assets\settings\*   →  <APP.USERPATH>\DAT\report\assets\settings\
dat\apps\*                     →  <APP.USERPATH>\DAT\apps\
dat\prtprp\*                   →  <SOLIDWORKS>\lang\english\
```

`Report.cfg`: copy over the live file only after you have a backup. Then
Generate, clear IndexedDB, Ctrl+F5.
