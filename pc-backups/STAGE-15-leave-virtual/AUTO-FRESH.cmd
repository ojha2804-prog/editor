@echo off
setlocal
rem One-click prep. Generate itself stays the SWOOD button
rem (SOLIDWORKS must be open). After you click Generate, backup,
rem unfold, and nest run by themselves from SheetMetalGeometry.vbs.

set DAT=D:\SWOOD_LIBRARY 2026\DATA\DAT
set REPORT=C:\Swood Reports\2026_09\Assem1
if not "%~1"=="" set "REPORT=%~1"

echo 1. Backup live files...
call "%~dp0BACKUP-LIVE.cmd" "%REPORT%" NOPAUSE
echo.
echo 2. Ready. In SOLIDWORKS click SWOOD Generate.
echo    Automatic during Generate:
echo      - backup to DATA\BACKUP\auto_*
echo      - VBA flats  db\sheetmetal-geometry.js
echo      - NestingWorks.exe  db\nesting-works.js
echo 3. When Generate finishes, open the report and Sheetmetal Layout.
pause
