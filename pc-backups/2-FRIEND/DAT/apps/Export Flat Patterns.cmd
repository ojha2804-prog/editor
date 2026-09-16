@echo off
setlocal
rem Shop launcher: same as Report.cfg POSTPROCESS.

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

echo VBS     %VBS%
echo REPORT  %REPORT%
echo Macro: D:\SWOOD_LIBRARY 2026\SHEETMETAL CUSTOM PROPERTY MACRO\SheetMetalGeometry.swp
echo.
"%CSCRIPT%" //nologo "%VBS%" "%REPORT%"
echo.
if exist "%REPORT%\db\launcher.log" type "%REPORT%\db\launcher.log"
echo.
echo Reload "%REPORT%\index.html" then open Sheetmetal Layout.
pause
