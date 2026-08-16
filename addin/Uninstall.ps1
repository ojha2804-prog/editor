#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dll = Join-Path $here 'ExportFlatPatternDXF\bin\Release\ExportFlatPatternDXF.dll'
if (-not (Test-Path $dll)) {
    $dll = Join-Path $here 'ExportFlatPatternDXF\bin\Debug\ExportFlatPatternDXF.dll'
}
if (-not (Test-Path $dll)) {
    throw "DLL not found. Pass the built ExportFlatPatternDXF.dll path after a build."
}
$regasm = Join-Path $env:windir 'Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe'
Write-Host "Unregistering $dll"
& $regasm /unregister $dll
Write-Host "Done."
