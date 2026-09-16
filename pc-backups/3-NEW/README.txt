3-NEW  —  same Pattern List page, Cut List Optimizer pack method
================================================================

THIS is the only folder to edit for nested-pattern work.

The SwoodReport page stays as it is:
  List of Nested Patterns — search, Category / Material / Frame,
  Trim, Kerf, Sheets per row, tiles, waste %.

What changed vs 1-ORIGINAL
--------------------------
Only how parts are placed on the board (cutlistoptimizer.com method):

  • Same panel Length / Width / Qty / Material / Label
  • Guillotine saw pack (trim + kerf), fewest boards then least waste
  • Grain locks rotation
  • No extra table, no rewritten report data

Copy to test
------------
  See COPY.txt. Only swood-client.js goes onto DAT + the open report.

1-ORIGINAL and 2-FRIEND stay untouched.

Test: node pc-backups/3-NEW/tests/cutlist-optimize.js
