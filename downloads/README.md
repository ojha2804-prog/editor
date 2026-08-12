# Downloads

SWOOD report pattern re-nest client scripts.

| File | Description |
|------|-------------|
| [pattern-renest-client.js](pattern-renest-client.js) | Simplified version with **SWOOD shelf** and **Cut Rite** nest modes (recommended) |
| [pattern-renest-client-original.js](pattern-renest-client-original.js) | Original upload, unchanged |
| [pattern-renest-client.zip](pattern-renest-client.zip) | Zip of the simplified script |

## Nest algorithms

On the **List of Nested Patterns** page, use the **Nest** toggle:

- **SWOOD shelf** — row-based guillotine packing (matches SWOOD’s own output at quantity 1)
- **Cut Rite** — Homag Cut Rite–style guillotine optimizer (free-rectangle, best short-side fit, multiple sort/split passes)

Both honour grain, trim, and kerf from the project.

## Install

Copy `pattern-renest-client.js` into your report's `assets/js/` folder, then add after the main app script in `index.html`:

```html
<script src="assets/js/pattern-renest-client.js"></script>
```
