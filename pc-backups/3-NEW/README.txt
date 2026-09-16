3-NEW  —  Cutting page + Nesting page
=====================================

THIS is the only folder to edit for nested-pattern work.

Copy these three files onto DAT (not HTML):

  swood-client.js     pack method + overlay
  view-settings.js    Pattern List + Nesting routes / menu
  data-settings.js    loads swood-client.js

index.html / main.js / main.css stay stock.

1) Pattern List  (#/pattern-detailed-list)  — CUTTING
   Beam / panel saw. Same page as before (search, Category / Material /
   Frame, Trim, Kerf, tiles, waste).
   Solution chips: Balanced | Waste | Time | Handling

2) Nesting  (#/pattern-nesting)  — NESTING
   Same path as Pattern List: view-settings declares the page, the client
   paints CNC true-shape from the live report. Not a separate HTML file.

1-ORIGINAL and 2-FRIEND stay untouched.

Test: node pc-backups/3-NEW/tests/cutlist-optimize.js
