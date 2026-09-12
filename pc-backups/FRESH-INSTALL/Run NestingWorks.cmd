@echo off
setlocal
rem True-shape nest for Sheetmetal Layout (NESTINGWorks-style rules).
rem Does not talk to SOLIDWORKS. Reads db\sheetmetal-geometry.js.

set EXE=%~dp0NestingWorks.exe
if not exist "%EXE%" set "EXE=%~dp0nestingworks\NestingWorks.exe"

set REPORT=
if not "%~1"=="" set "REPORT=%~1"
if not defined REPORT if exist "%~dp0index.html" set "REPORT=%~dp0"
if not defined REPORT set "REPORT=C:\Swood Reports\2026_09\Assem1"
if "%REPORT:~-1%"=="\" set "REPORT=%REPORT:~0,-1%"

if not exist "%REPORT%\index.html" (
  echo That is not a report folder: "%REPORT%"
  pause
  exit /b 1
)
if not exist "%REPORT%\db\sheetmetal-geometry.js" (
  echo Missing db\sheetmetal-geometry.js - Generate / run the VBA first.
  pause
  exit /b 1
)
if not exist "%EXE%" (
  echo NestingWorks.exe not found. Copy it next to this .cmd
  pause
  exit /b 1
)

echo REPORT  %REPORT%
"%EXE%" "%REPORT%"
echo.
echo Reload Sheetmetal Layout.
pause
