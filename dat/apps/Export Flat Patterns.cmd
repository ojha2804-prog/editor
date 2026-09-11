@echo off
setlocal
rem ONE SHOT: export real SOLIDWORKS flat patterns into the report dxfs folder.
rem Keep Assem1 open. Do not rebuild. Do not Set Lightweight.

set CSCRIPT=%SystemRoot%\System32\cscript.exe
if exist "%SystemRoot%\Sysnative\cscript.exe" set CSCRIPT=%SystemRoot%\Sysnative\cscript.exe

set VBS=%~dp0SheetMetalGeometry.vbs
if not exist "%VBS%" set "VBS=D:\SWOOD_LIBRARY 2026\DATA\DAT\apps\SheetMetalGeometry.vbs"

set REPORT=
if not "%~1"=="" set "REPORT=%~1"
if not defined REPORT if exist "%~dp0index.html" set "REPORT=%~dp0"
if not defined REPORT if exist "%~dp0last-report.txt" set /p REPORT=<"%~dp0last-report.txt"
if not defined REPORT set "REPORT=C:\Swood Reports\2026_09\Assem1"
if "%REPORT:~-1%"=="\" set "REPORT=%REPORT:~0,-1%"

if not exist "%VBS%" (
  echo Missing the VBS: "%VBS%"
  pause
  exit /b 1
)
if not exist "%REPORT%\index.html" (
  echo That is not a report folder: "%REPORT%"
  echo A report folder contains index.html.
  pause
  exit /b 1
)

echo.
echo VERSION from VBS:
findstr /C:"Const VERSION" "%VBS%"
echo VBS     %VBS%
echo REPORT  %REPORT%
echo.
echo If VERSION is not 6.19.1-sheetmetal-call you copied the wrong file.
echo.
"%CSCRIPT%" //nologo "%VBS%" "%REPORT%" /exportall
echo.
if exist "%REPORT%\db\export-flat-patterns.txt" type "%REPORT%\db\export-flat-patterns.txt"
echo.
echo Reload "%REPORT%\index.html" then open Sheetmetal Layout.
pause
