3-NEW  —  Cut List Optimizer Pattern List
=========================================

THIS is the only folder to edit for nested-pattern work.

What changed vs 1-ORIGINAL
--------------------------
List of Nested Patterns (#/pattern-detailed-list) now follows
cutlistoptimizer.com:

  • Cut list table: Length, Width, Qty, Material, Label
  • Group by material
  • Expand Qty into pieces
  • Guillotine saw pack (trim + kerf), fewest boards then least waste
  • Grain locks rotation
  • Overlay always owns this page (does not hide behind NestingWorks)

Copy to test
------------
  See COPY.txt. Only swood-client.js goes onto DAT + the open report.

  pattern-list-preview.html  — open in a browser (no SWOOD needed)

1-ORIGINAL and 2-FRIEND stay untouched.

Test: node pc-backups/3-NEW/tests/cutlist-optimize.js
