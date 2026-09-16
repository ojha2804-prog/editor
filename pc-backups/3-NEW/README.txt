3-NEW  —  same Pattern List page, Cut List Optimizer pack method
================================================================

THIS is the only folder to edit for nested-pattern work.

The SwoodReport page stays as it is:
  List of Nested Patterns — search, Category / Material / Frame,
  Trim, Kerf, Sheets per row, tiles, waste %.

What changed vs 1-ORIGINAL
--------------------------
Only how parts are placed on the board (panel-saw rules like
cutlistoptimizer.com — not a clone of their solver):

  • Guillotine cuts, kerf, trim, material groups
  • Grain / orientation lock per piece
  • Same panel Length / Width / Qty / Material / Label
  • No extra table, no rewritten report data

Copy to test
------------
  See COPY.txt. Only swood-client.js goes onto DAT + the open report.

1-ORIGINAL and 2-FRIEND stay untouched.

Test: node pc-backups/3-NEW/tests/cutlist-optimize.js
