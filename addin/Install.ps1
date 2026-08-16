#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dll = Join-Path $here 'ExportFlatPatternDXF\bin\Release\ExportFlatPatternDXF.dll'
if (-not (Test-Path $dll)) {
    $dll = Join-Path $here 'ExportFlatPatternDXF\bin\Debug\ExportFlatPatternDXF.dll'
}
if (-not (Test-Path $dll)) {
    throw "Build the add-in first (Release x64). Expected: $dll"
}
$regasm = Join-Path $env:windir 'Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe'
if (-not (Test-Path $regasm)) { throw "RegAsm not found: $regasm" }
Write-Host "Registering $dll"
& $regasm /codebase $dll
if ($LASTEXITCODE -ne 0) { throw "RegAsm failed with $LASTEXITCODE" }
Write-Host "Done. Start SOLIDWORKS and enable Tools > Add-Ins > Export Flat Pattern DXF."
