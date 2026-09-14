SWOOD report DAT pack  —  give this zip to your friend
======================================================

Contents
--------
  1-BACKUP-READABLE\     Your working files BEFORE this pack (readable swood-client.js).
                         Keep this. Do not send it if you only want the friend to have
                         the obfuscated client.

  2-DAT\                 Complete overlay. Copy ON TOP of the friend's existing
                         <APP.USERPATH>\DAT\  (do not delete stock SWOOD files).

  3-SOLIDWORKS-prtprp\   Optional property forms → SolidWorks lang\english\

Friend install (2-DAT)
----------------------
1. In SWOOD, note Data Directory. That folder is <APP.USERPATH>.
   DAT is <APP.USERPATH>\DAT\

2. BACK UP their live DAT (run 2-DAT\apps\BACKUP-LIVE.cmd on their PC).

3. Copy everything inside 2-DAT\ into <APP.USERPATH>\DAT\
   Merge. Keep their stock files (index.html, ReportDataPost.exe, public\, …).

4. Copy SheetMetalGeometry.swp into:
     <APP.USERPATH>\DAT\apps\MACROS\
   VBA module name MUST be SheetMetalGeometry1.

5. Copy 3-SOLIDWORKS-prtprp\*.prtprp into SolidWorks lang\english\  (optional).

6. Clear report IndexedDB: open a report → F12 → Application → Clear site data.

7. Restart SOLIDWORKS. Generate Report.

8. For a report that is already open, also copy
     2-DAT\report\assets\settings\swood-client.js
   to that report's assets\settings\ and press Ctrl+F5.

swood-client.js in 2-DAT is the OBFUSCATED file (SWOOD loads that name).
The readable original is only in 1-BACKUP-READABLE\.

Paths are listed in 2-DAT\PATHS.txt and at the top of 2-DAT\Report.cfg.
Report.cfg uses <APP.USERPATH> so it works on any Data Directory.
Reports still write to C:\Swood Reports\<YEAR>_<MONTH>\<project>.
Change REPORTPATH in Report.cfg if the friend uses another folder.

Do not rewrite QTY LOCK. Do not replace a live [DXF_SHEETMETAL_PART] with
AUTOPROCESS = 0. This pack already has the job ON (front-*.dxf trigger).
