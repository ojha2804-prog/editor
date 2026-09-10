@echo off
setlocal
rem Run from DAT\apps or from the report folder. The report is the folder
rem that contains index.html — never DAT\apps itself.

set CSCRIPT=%SystemRoot%\System32\cscript.exe
if exist "%SystemRoot%\Sysnative\cscript.exe" set CSCRIPT=%SystemRoot%\Sysnative\cscript.exe
set VBS=%~dp0SheetMetalGeometry.vbs
if not exist "%VBS%" (
  echo Missing "%VBS%"
  echo Copy SheetMetalGeometry.vbs into this same folder and run again.
  pause
  exit /b 1
)

set REPORT=
if not "%~1"=="" set "REPORT=%~1"
if not defined REPORT if exist "%~dp0index.html" set "REPORT=%~dp0"
if not defined REPORT if exist "%~dp0last-report.txt" set /p REPORT=<"%~dp0last-report.txt"
if not defined REPORT if exist "C:\Swood Reports\2026_09\Assem1\index.html" set "REPORT=C:\Swood Reports\2026_09\Assem1"
if "%REPORT:~-1%"=="\" set "REPORT=%REPORT:~0,-1%"
if not exist "%REPORT%\index.html" (
  echo That is not a report folder: "%REPORT%"
  echo A report folder contains index.html.
  echo Example:
  echo   "Export Flat Patterns.cmd" "C:\Swood Reports\2026_09\Assem1"
  pause
  exit /b 1
)

echo.
echo VBS     %VBS%
echo REPORT  %REPORT%
echo Exporting flat patterns from the open SOLIDWORKS assembly.
echo Do not Set to Lightweight. Do not start a rebuild.
echo.
"%CSCRIPT%" //nologo "%VBS%" "%REPORT%" /exportall
echo.
if exist "%REPORT%\db\export-flat-patterns.txt" type "%REPORT%\db\export-flat-patterns.txt"
echo.
echo Reload the report, then open Sheetmetal Layout.
pause
