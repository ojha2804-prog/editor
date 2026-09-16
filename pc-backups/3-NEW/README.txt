3-NEW  —  Cut List Optimizer pack method
========================================

THIS is the only folder to edit for nested-pattern work.

What changed vs 1-ORIGINAL
--------------------------
List of Nested Patterns (#/pattern-detailed-list) uses the
cutlistoptimizer.com pack METHOD only:

  • Same panel Length / Width / Qty / Material / Label as Generate wrote
  • No extra cut-list table, no rewritten report data
  • Guillotine saw pack (trim + kerf), fewest boards then least waste
  • Grain locks rotation
  • Overlay draws the re-packed sheets (does not replay NestingWorks positions)

Copy to test
------------
  See COPY.txt. Only swood-client.js goes onto DAT + the open report.

  pattern-list-preview.html  — open in a browser (no SWOOD needed)

1-ORIGINAL and 2-FRIEND stay untouched.

Test: node pc-backups/3-NEW/tests/cutlist-optimize.js
