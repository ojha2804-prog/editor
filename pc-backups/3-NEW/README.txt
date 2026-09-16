3-NEW  —  same Pattern List page, intelliDivide Cutting pack
============================================================

THIS is the only folder to edit for nested-pattern work.

The SwoodReport page stays as it is:
  List of Nested Patterns — search, Category / Material / Frame,
  Trim, Kerf, Sheets per row, tiles, waste %.

  Solution chips (intelliDivide Cutting):
  Balanced | Waste | Time | Handling

What changed vs 1-ORIGINAL
--------------------------
HOMAG intelliDivide Cutting method (panel saw), not Nesting (CNC)
and not CutList Optimizer:

  • Several beam-saw plans at once (rips / crosscuts / optional head cut)
  • Pick lowest waste, shortest time, or easiest handling (few recuts)
  • Balanced is the default, as in intelliDivide
  • Same panel Length / Width / Qty / Material / Label
  • Grain lock per piece

This is not HOMAG's cloud solver. It follows the published Cutting
rules on the existing Pattern List page.

Copy to test
------------
  See COPY.txt. Only swood-client.js goes onto DAT + the open report.

1-ORIGINAL and 2-FRIEND stay untouched.

Test: node pc-backups/3-NEW/tests/cutlist-optimize.js
