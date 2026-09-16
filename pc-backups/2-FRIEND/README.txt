2-FRIEND  —  give this to your friend
=====================================

  DAT\                              unzipped overlay (swood-client.js is OBFUSCATED)
  swood-client.js                   readable source for this pack (Saw overlay)
  SOLIDWORKS-prtprp\                optional property forms

Saw Machine Data follows the shop cutting-list sheet:
  CODE, MATERIAL SPECIFICATIONS, COMPONENT NAME,
  FINAL SIZE (HEIGHT / DEPTH / WIDTH / QTY),
  CUTTING SIZE (THK / LENGTH / WIDTH / L1 / W1 / L2 / W2),
  REMARKS.
GROOVE is shown in FINAL SIZE WIDTH. Excel / CSV / PDF / Print sit on the
top right of the table title bar.

Install: merge DAT\ onto <APP.USERPATH>\DAT\
Put SheetMetalGeometry.swp in DAT\apps\MACROS\ (module SheetMetalGeometry1).
See DAT\PATHS.txt for every Report.cfg path.

Do not put 3-NEW files in this pack.

Test: node pc-backups/2-FRIEND/tests/saw-overlay.js
