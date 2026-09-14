@echo off
setlocal EnableExtensions
rem Backup every live customisation file BEFORE a fresh Generate.
rem This script lives in DAT\apps. Friend pack: no hardcoded DAT required.

set DAT=%~dp0..
if not exist "%DAT%\Report.cfg" set DAT=D:\SWOOD_LIBRARY 2026\DATA\DAT
set SWPDIR=%DAT%\apps\MACROS
if not exist "%SWPDIR%\SheetMetalGeometry.swp" set SWPDIR=D:\SWOOD_LIBRARY 2026\SHEETMETAL CUSTOM PROPERTY MACRO
set REPORT=C:\Swood Reports\2026_09\Assem1
if not "%~1"=="" set "REPORT=%~1"

for /f "tokens=1-3 delims=/- " %%a in ("%date%") do set D=%%c-%%a-%%b
for /f "tokens=1-3 delims=:." %%a in ("%time%") do set T=%%a%%b%%c
set T=%T: =0%
set BAK=%DAT%\..\BACKUP\%D%_%T%
if not exist "%DAT%\..\BACKUP" if exist "D:\SWOOD_LIBRARY 2026\DATA\BACKUP" set BAK=D:\SWOOD_LIBRARY 2026\DATA\BACKUP\%D%_%T%
mkdir "%BAK%" 2>nul
mkdir "%BAK%\apps" 2>nul
mkdir "%BAK%\settings" 2>nul
mkdir "%BAK%\macro" 2>nul
mkdir "%BAK%\report-db" 2>nul

echo Backing up to:
echo   %BAK%
echo.

if exist "%DAT%\Report.cfg" copy /Y "%DAT%\Report.cfg" "%BAK%\Report.cfg" >nul & echo OK Report.cfg
if exist "%DAT%\apps\SheetMetalGeometry.vbs" copy /Y "%DAT%\apps\SheetMetalGeometry.vbs" "%BAK%\apps\" >nul & echo OK SheetMetalGeometry.vbs
if exist "%DAT%\apps\Export Flat Patterns.cmd" copy /Y "%DAT%\apps\Export Flat Patterns.cmd" "%BAK%\apps\" >nul & echo OK Export Flat Patterns.cmd
if exist "%DAT%\apps\Run NestingWorks.cmd" copy /Y "%DAT%\apps\Run NestingWorks.cmd" "%BAK%\apps\" >nul & echo OK Run NestingWorks.cmd
if exist "%DAT%\apps\NestingWorks.exe" copy /Y "%DAT%\apps\NestingWorks.exe" "%BAK%\apps\" >nul & echo OK NestingWorks.exe
if exist "%DAT%\report\assets\settings\swood-client.js" copy /Y "%DAT%\report\assets\settings\swood-client.js" "%BAK%\settings\" >nul & echo OK DAT swood-client.js
if exist "%DAT%\report\assets\settings\view-settings.js" copy /Y "%DAT%\report\assets\settings\view-settings.js" "%BAK%\settings\" >nul & echo OK view-settings.js
if exist "%DAT%\report\assets\settings\data-settings.js" copy /Y "%DAT%\report\assets\settings\data-settings.js" "%BAK%\settings\" >nul & echo OK data-settings.js
if exist "%DAT%\apps\SheetMetalGeometry.bas" copy /Y "%DAT%\apps\SheetMetalGeometry.bas" "%BAK%\apps\" >nul & echo OK SheetMetalGeometry.bas
if exist "%SWPDIR%\SheetMetalGeometry.bas" copy /Y "%SWPDIR%\SheetMetalGeometry.bas" "%BAK%\macro\" >nul & echo OK macro SheetMetalGeometry.bas
if exist "%SWPDIR%\SheetMetalGeometry.swp" copy /Y "%SWPDIR%\SheetMetalGeometry.swp" "%BAK%\macro\" >nul & echo OK SheetMetalGeometry.swp
set STUDY=C:\Swood Reports\2026_09\Study Table
if exist "%STUDY%\assets\settings\swood-client.js" copy /Y "%STUDY%\assets\settings\swood-client.js" "%BAK%\settings\swood-client.STUDY.js" >nul & echo OK Study Table swood-client.js
if exist "%REPORT%\assets\settings\swood-client.js" copy /Y "%REPORT%\assets\settings\swood-client.js" "%BAK%\settings\swood-client.REPORT.js" >nul & echo OK report swood-client.js
if exist "%REPORT%\db\sheetmetal-geometry.js" copy /Y "%REPORT%\db\sheetmetal-geometry.js" "%BAK%\report-db\" >nul & echo OK sheetmetal-geometry.js
if exist "%REPORT%\db\sheetmetal-geometry.log" copy /Y "%REPORT%\db\sheetmetal-geometry.log" "%BAK%\report-db\" >nul & echo OK sheetmetal-geometry.log
if exist "%REPORT%\db\launcher.log" copy /Y "%REPORT%\db\launcher.log" "%BAK%\report-db\" >nul & echo OK launcher.log
if exist "%REPORT%\db\nesting-works.js" copy /Y "%REPORT%\db\nesting-works.js" "%BAK%\report-db\" >nul & echo OK nesting-works.js

echo.
echo Backup finished: %BAK%
if /I not "%~2"=="NOPAUSE" pause
