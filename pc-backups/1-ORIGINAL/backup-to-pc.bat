@echo off
REM Save this on the PC and run it after each swood-client.js edit.
REM Change BACKUP_ROOT and DAT if your paths differ.

set BACKUP_ROOT=D:\SWOOD_BACKUP
set DAT=%APPDATA%\Swood\DAT\report\assets\settings
if not exist "%DAT%\swood-client.js" set DAT=%LOCALAPPDATA%\Swood\DAT\report\assets\settings

set STAMP=%DATE:~-4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set STAMP=%STAMP: =0%
set DEST=%BACKUP_ROOT%\%STAMP%
mkdir "%DEST%" 2>nul
copy /Y "%DAT%\swood-client.js" "%DEST%\swood-client.js"
copy /Y "%DAT%\view-settings.js" "%DEST%\view-settings.js"
copy /Y "%DAT%\data-settings.js" "%DEST%\data-settings.js"
echo Saved to %DEST%
pause
