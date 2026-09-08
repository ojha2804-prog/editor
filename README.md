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
| Unlock | Button **Unlock**, PIN **`2468`**. Inputs, Re-nest, and Issue & lock appear. |
| **Issue & lock** | Stores the current nest as the issued plan and locks again. |

Change the PIN in `CONFIG.weldments.lock.pin` near the top of `swood-client.js`.

Assem1 expected figures (unchanged): 720 pieces · 74 bars @ 6 m · ~450.8 kg.

Install notes for the rest of the pack: [docs/INSTALL.md](docs/INSTALL.md).
