@echo off
setlocal
rem Drop this file AND SheetMetalGeometry.vbs into the report folder
rem (the folder that contains index.html), then double-click this.
rem Keep SOLIDWORKS open with the assembly Set to Resolved.

set CSCRIPT=%SystemRoot%\System32\cscript.exe
if exist "%SystemRoot%\Sysnative\cscript.exe" set CSCRIPT=%SystemRoot%\Sysnative\cscript.exe
set VBS=%~dp0SheetMetalGeometry.vbs
set REPORT=%~dp0
if "%REPORT:~-1%"=="\" set REPORT=%REPORT:~0,-1%
if not exist "%VBS%" (
  echo Missing "%VBS%"
  echo Copy SheetMetalGeometry.vbs into this same folder and run again.
  pause
  exit /b 1
)
echo.
echo VBS     %VBS%
echo REPORT  %REPORT%
echo Exporting flat patterns from the open SOLIDWORKS assembly.
echo.
"%CSCRIPT%" //nologo "%VBS%" "%REPORT%" /exportall
echo.
if exist "%REPORT%\db\export-flat-patterns.txt" type "%REPORT%\db\export-flat-patterns.txt"
echo.
echo Reload the report, then open Sheetmetal Layout.
pause
