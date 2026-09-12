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

' A completed marker is report-specific and does not depend on index.html.
If fso.FileExists(doneFile) Then
    Note "already completed for this report - skipping macro"
    CleanUpFrontDxf
    WScript.Quit 0
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
    ' The macro creates flat DXFs synchronously. Mark the report complete only
    ' after RunMacro returns, then remove the temporary projected views.
    On Error Resume Next
    Set runTs = fso.CreateTextFile(doneFile, True)
    If Err.Number = 0 Then
        runTs.WriteLine "completed " & Now
        runTs.Close
    Else
        Note "could not write completion marker: " & Err.Number & " " & Err.Description
        Err.Clear
    End If
    On Error GoTo 0
    CleanUpFrontDxf
    ReleaseRunLock
    Note "done - see db\sheetmetal-geometry.log for what the macro did"
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
