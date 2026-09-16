2-FRIEND  —  give this to your friend
=====================================

Copy these three files onto DAT (not HTML):

  swood-client.js      Saw overlay (DAT copy is obfuscated)
  view-settings.js     Saw Machine Data route / menu
  data-settings.js     loads swood-client.js

index.html stays stock. Same path as Pattern List: view-settings shows
the page, the client fills it from the live report.

  DAT\                 unzipped overlay (swood-client.js is OBFUSCATED)
  SOLIDWORKS-prtprp\   optional property forms

Install: merge DAT\ onto <APP.USERPATH>\DAT\
See DAT\PATHS.txt for Report.cfg paths.

Do not put 3-NEW files in this pack.

Test: node pc-backups/2-FRIEND/tests/saw-overlay.js
