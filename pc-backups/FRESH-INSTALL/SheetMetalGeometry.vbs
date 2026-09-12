' ============================================================================
' SheetMetalGeometry.vbs  -  launcher
' ----------------------------------------------------------------------------
' Called automatically by Report.cfg:
'     [DXF_SHEETMETAL_PART]
'         POSTPROCESS     = C:\Windows\System32\cscript.exe
'         POSTPROCESSARGS = //nologo "...\SheetMetalGeometry.vbs" "<REPORTPATH>"
'
' It does two things only:
'   1. writes the report path to %TEMP%\swood_sm_reportpath.txt
'   2. calls RunMacro2 on SheetMetalGeometry.swp
'
' All the real work - walking the assembly, exporting flat patterns, parsing
' the DXFs, writing db\sheetmetal-geometry.js - happens in the VBA macro.
'
' WHY THE SPLIT
' SOLIDWORKS hands component lists back as SafeArrays of VT_DISPATCH. Late
' bound VBScript cannot read those elements: every access fails with
' "Type mismatch" (error 13), from GetChildren and GetComponents alike.
' VBA has no such problem. So VBScript is kept to one method call with no
' arrays in sight.
'
' INSTALL
'   this file  -> anywhere (the path in Report.cfg must match)
'   the macro  -> D:\SWOOD_LIBRARY 2026\SHEETMETAL CUSTOM PROPERTY MACRO\
'                 SheetMetalGeometry.swp
'   Change MACRO_PATH below if you move it.
' ============================================================================

Option Explicit

Const MACRO_PATH = "D:\SWOOD_LIBRARY 2026\SHEETMETAL CUSTOM PROPERTY MACRO\SheetMetalGeometry.swp"
Const HANDOFF = "swood_sm_reportpath.txt"

Dim fso, sh, reportPath, tmpFile, logFile, swApp

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

' ---- where is the report ---------------------------------------------------
If WScript.Arguments.Count > 0 Then
    reportPath = WScript.Arguments(0)
Else
    Dim shellApp, picked
    Set shellApp = CreateObject("Shell.Application")
    Set picked = shellApp.BrowseForFolder(0, "Select the report folder (the one with index.html)", 0)
    If picked Is Nothing Then WScript.Quit 0
    reportPath = picked.Self.Path
End If
If Len(reportPath) = 0 Then WScript.Quit 0

If Not fso.FolderExists(reportPath & "\db") Then fso.CreateFolder reportPath & "\db"
logFile = reportPath & "\db\launcher.log"
Note "launcher started, report = " & reportPath

' ---- hand the path to the macro -------------------------------------------
tmpFile = sh.ExpandEnvironmentStrings("%TEMP%") & "\" & HANDOFF

On Error Resume Next

Dim ts
Set ts = fso.CreateTextFile(tmpFile, True)
If Err.Number <> 0 Then
    Note "could not write the hand-off file: " & Err.Number & " " & Err.Description
    Err.Clear
Else
    ts.WriteLine reportPath
    ts.Close
    Note "hand-off written: " & tmpFile
End If

' ---- macro present? --------------------------------------------------------
If Not fso.FileExists(MACRO_PATH) Then
    Note "MACRO NOT FOUND: " & MACRO_PATH
    Note "Edit MACRO_PATH at the top of this script."
    Fail "The macro was not found:" & vbCrLf & MACRO_PATH
    WScript.Quit 0
End If

' ---- attach to SOLIDWORKS --------------------------------------------------
Set swApp = Nothing
Set swApp = GetObject(, "SldWorks.Application")
If Err.Number <> 0 Then
    Note "GetObject failed: " & Err.Number & " " & Err.Description
    Err.Clear
End If

If swApp Is Nothing Then
    Note "SOLIDWORKS is not running - nothing to do"
    Fail "SOLIDWORKS is not running, so the flat patterns cannot be exported."
    WScript.Quit 0
End If
Note "attached to SOLIDWORKS"

 ' ---- run the macro ---------------------------------------------------------
' SWOOD calls this script once for each sheet-metal part. Only the FIRST
' callback for a report is allowed to run the VBA macro. Later callbacks
' simply remove the temporary front-*.dxf and exit.
Dim runDir, runningFile, doneFile, runTs, isOwner
runDir = reportPath & "\db"
If Not fso.FolderExists(runDir) Then fso.CreateFolder runDir
runningFile = runDir & "\sheetmetal-geometry.running"
doneFile = runDir & "\sheetmetal-geometry.done"

' Skip extra POSTPROCESS calls in THIS Generate. A NEW Generate rewrites
' index.html / system_report.swr first, which makes .done stale.
If fso.FileExists(doneFile) Then
    If Not FreshGenerate(doneFile) Then
        Note "already completed for this report - skipping macro"
        CleanUpFrontDxf
        WScript.Quit 0
    End If
    On Error Resume Next
    fso.DeleteFile doneFile, True
    Err.Clear
    On Error GoTo 0
    Note "new Generate detected - running macro again"
End If

' Atomic create: only one concurrent SWOOD callback becomes the owner.
isOwner = False
On Error Resume Next
Err.Clear
Set runTs = fso.CreateTextFile(runningFile, False)
If Err.Number = 0 Then
    runTs.WriteLine CStr(Now)
    runTs.Close
    isOwner = True
Else
    Err.Clear
End If
On Error GoTo 0

If Not isOwner Then
    Note "another SheetMetalGeometry run is already active - skipping this callback"
    CleanUpFrontDxf
    WScript.Quit 0
End If

AutoBackup

' ---- macro present? --------------------------------------------------------
If Not fso.FileExists(MACRO_PATH) Then
    Note "MACRO NOT FOUND: " & MACRO_PATH
    ReleaseRunLock
    Fail "The macro was not found:" & vbCrLf & MACRO_PATH
    WScript.Quit 0
End If

' ---- attach to SOLIDWORKS --------------------------------------------------
Set swApp = Nothing
On Error Resume Next
Set swApp = GetObject(, "SldWorks.Application")
If Err.Number <> 0 Then
    Note "GetObject failed: " & Err.Number & " " & Err.Description
    Err.Clear
End If
On Error GoTo 0

If swApp Is Nothing Then
    Note "SOLIDWORKS is not running - nothing to do"
    ReleaseRunLock
    Fail "SOLIDWORKS is not running, so the flat patterns cannot be exported."
    WScript.Quit 0
End If
Note "attached to SOLIDWORKS"

' ---- run the actual VBA module --------------------------------------------
Dim ranOk
ranOk = False
On Error Resume Next
Err.Clear
ranOk = swApp.RunMacro(MACRO_PATH, "SheetMetalGeometry1", "main")
If Err.Number <> 0 Then
    Note "RunMacro failed: " & Err.Number & " " & Err.Description
    Err.Clear
    ranOk = False
End If
On Error GoTo 0

If ranOk Then
    Note "macro ran, module 'SheetMetalGeometry1'"
    If fso.FileExists(reportPath & "\db\sheetmetal-geometry.js") Then
        RunNestingWorks
        On Error Resume Next
        Set runTs = fso.CreateTextFile(doneFile, True)
        If Err.Number = 0 Then
            runTs.WriteLine "completed " & Now
            runTs.Close
        End If
        Err.Clear
        On Error GoTo 0
        CleanUpFrontDxf
        CleanUpProjections
        Note "done - flats + nest automatic. See db\sheetmetal-geometry.log"
    Else
        Note "macro ran but wrote no sheetmetal-geometry.js - not marking done"
    End If
    ReleaseRunLock
Else
    Note "COULD NOT START THE MACRO."
    ReleaseRunLock
    Fail "The macro could not be started - see " & logFile
End If

WScript.Quit 0
WScript.Quit 0

' The [DXF_SHEETMETAL_PART] block exists only to trigger this script. The DXF
' it writes is a projected view, not a flat pattern, so it is deleted once the
' real flat-*.dxf files are on disk. Leaving both side by side in dxfs\ is
' just confusing.
Sub CleanUpFrontDxf()

    On Error Resume Next
    Dim dxfDir, folder, f, n
    dxfDir = reportPath & "\dxfs"
    If Not fso.FolderExists(dxfDir) Then Exit Sub
    n = 0
    Set folder = fso.GetFolder(dxfDir)
    For Each f In folder.Files
        If LCase(Left(f.Name, 6)) = "front-" Then
            fso.DeleteFile f.Path, True
            If Err.Number = 0 Then n = n + 1 Else Err.Clear
        End If
    Next
    If n > 0 Then Note "removed " & n & " temporary front DXF(s)"
End Sub

Sub ReleaseRunLock()
    On Error Resume Next
    If fso.FileExists(runningFile) Then fso.DeleteFile runningFile, True
    Err.Clear
End Sub

Function FreshGenerate(donePath)
    Dim idx, swr, doneT, t
    FreshGenerate = False
    On Error Resume Next
    If Not fso.FileExists(reportPath & "\db\sheetmetal-geometry.js") Then
        FreshGenerate = True
        Exit Function
    End If
    doneT = fso.GetFile(donePath).DateLastModified
    idx = reportPath & "\index.html"
    If fso.FileExists(idx) Then
        t = fso.GetFile(idx).DateLastModified
        If t > doneT Then FreshGenerate = True
    End If
    swr = reportPath & "\system_report.swr"
    If fso.FileExists(swr) Then
        t = fso.GetFile(swr).DateLastModified
        If t > doneT Then FreshGenerate = True
    End If
    On Error GoTo 0
End Function

Sub AutoBackup()
    On Error Resume Next
    Dim bak, dat, stamp
    stamp = Replace(Replace(Replace(CStr(Now), "/", "-"), ":", ""), " ", "_")
    bak = "D:\SWOOD_LIBRARY 2026\DATA\BACKUP\auto_" & stamp
    dat = "D:\SWOOD_LIBRARY 2026\DATA\DAT"
    fso.CreateFolder "D:\SWOOD_LIBRARY 2026\DATA\BACKUP"
    fso.CreateFolder bak
    fso.CreateFolder bak & "\apps"
    fso.CreateFolder bak & "\settings"
    fso.CreateFolder bak & "\macro"
    fso.CreateFolder bak & "\report-db"
    If fso.FileExists(dat & "\Report.cfg") Then fso.CopyFile dat & "\Report.cfg", bak & "\Report.cfg", True
    If fso.FileExists(dat & "\apps\SheetMetalGeometry.vbs") Then fso.CopyFile dat & "\apps\SheetMetalGeometry.vbs", bak & "\apps\", True
    If fso.FileExists(MACRO_PATH) Then fso.CopyFile MACRO_PATH, bak & "\macro\", True
    If fso.FileExists(dat & "\report\assets\settings\swood-client.js") Then fso.CopyFile dat & "\report\assets\settings\swood-client.js", bak & "\settings\", True
    If fso.FileExists(reportPath & "\db\sheetmetal-geometry.js") Then fso.CopyFile reportPath & "\db\sheetmetal-geometry.js", bak & "\report-db\", True
    If fso.FileExists(reportPath & "\db\launcher.log") Then fso.CopyFile reportPath & "\db\launcher.log", bak & "\report-db\", True
    If Err.Number = 0 Then Note "backup " & bak Else Note "backup skipped " & Err.Description : Err.Clear
    On Error GoTo 0
End Sub

Sub RunNestingWorks()
    On Error Resume Next
    Dim exe, here, rc
    here = fso.GetParentFolderName(WScript.ScriptFullName)
    exe = here & "\NestingWorks.exe"
    If Not fso.FileExists(exe) Then exe = "D:\SWOOD_LIBRARY 2026\DATA\DAT\apps\NestingWorks.exe"
    If Not fso.FileExists(exe) Then
        Note "NestingWorks.exe not found - Layout will nest in the browser"
        Exit Sub
    End If
    Note "NestingWorks.exe " & reportPath
    rc = sh.Run("""" & exe & """ """ & reportPath & """", 0, True)
    Note "NestingWorks exit " & rc
    Err.Clear
    On Error GoTo 0
End Sub

Sub CleanUpProjections()

    On Error Resume Next

    Dim dxfDir2, folder, f, n
    dxfDir2 = reportPath & "\dxfs"
    If Not fso.FolderExists(dxfDir2) Then Exit Sub

    n = 0
    Set folder = fso.GetFolder(dxfDir2)
    For Each f In folder.Files
        If LCase(Left(f.Name, 7)) = "smpart-" Then
            fso.DeleteFile f.Path, True
            If Err.Number <> 0 Then
                Err.Clear
            Else
                n = n + 1
            End If
        End If
    Next

    If n > 0 Then Note "removed " & n & " projected-view DXF(s)"

End Sub

' ---------------------------------------------------------------------------
Sub Note(msg)
    On Error Resume Next
    Dim f
    Set f = fso.OpenTextFile(logFile, 8, True)      ' 8 = append
    If Err.Number = 0 Then
        f.WriteLine Now & "  " & msg
        f.Close
    End If
    Err.Clear
End Sub

Sub Fail(msg)
    On Error Resume Next
    ' Only interrupt when a person started it, never during a report run.
    If WScript.Arguments.Count = 0 Then MsgBox msg, vbExclamation
    Err.Clear
End Sub
