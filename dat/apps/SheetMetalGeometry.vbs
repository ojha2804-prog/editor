' =============================================================================
' SwoodReport POSTPROCESS launcher — YOUR FILE, plus one skip so Generate
' does not start the same VBA 12 times.
'
' VBA walks the assembly. This VBS cannot. Do not rewrite the .bas.
'
' Live:
'   D:\SWOOD_LIBRARY 2026\DATA\DAT\apps\SheetMetalGeometry.vbs
'   D:\SWOOD_LIBRARY 2026\SHEETMETAL CUSTOM PROPERTY MACRO\SheetMetalGeometry.swp
'
' Module in the .swp MUST be named SheetMetalGeometry
' =============================================================================

Option Explicit

Const SWP_PATH = "D:\SWOOD_LIBRARY 2026\SHEETMETAL CUSTOM PROPERTY MACRO\SheetMetalGeometry.swp"
Const SW_MACRO_MODULE = "SheetMetalGeometry"
Const SW_MACRO_PROC = "main"
Const HAND_OFF = "swood_sm_reportpath.txt"
Const SESSION_SECS = 600

Dim fso, sh, swApp, model, reportPath, logFile, ok, skipped

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

reportPath = ResolveReport()
If reportPath = "" Then Fail "No report folder. Pass it as argument 1 or Generate from Swood."

logFile = fso.BuildPath(fso.BuildPath(reportPath, "db"), "launcher.log")
LogLine "start " & Now
LogLine "report " & reportPath

ok = WriteHandOff(reportPath)
If Not ok Then Fail "Could not write %TEMP%\" & HAND_OFF

skipped = False
If AlreadyRan(reportPath) Then
  skipped = True
  LogLine "skip RunMacro - already ran this Generate"
  CleanUpProjections reportPath
  WScript.Quit 0
End If

Set swApp = GetSW()
If swApp Is Nothing Then Fail "SOLIDWORKS is not running. Open the assembly, then Generate."

Set model = swApp.ActiveDoc
If model Is Nothing Then Fail "No active SOLIDWORKS document."

LogLine "active " & model.GetTitle()
LogLine "macro  " & SWP_PATH

If Not fso.FileExists(SWP_PATH) Then Fail "Macro not found:" & vbCrLf & SWP_PATH

On Error Resume Next
swApp.RunMacro SWP_PATH, SW_MACRO_MODULE, SW_MACRO_PROC
If Err.Number <> 0 Then
  Err.Clear
  swApp.RunMacro2 SWP_PATH, SW_MACRO_MODULE, SW_MACRO_PROC, 1, 0
End If
If Err.Number <> 0 Then
  LogLine "RunMacro failed " & Err.Number & " " & Err.Description
  Fail "RunMacro failed " & Err.Number & " " & Err.Description & vbCrLf & _
       "Module must be named " & SW_MACRO_MODULE
End If
On Error GoTo 0

MarkRan reportPath
CleanUpProjections reportPath
LogLine "macro ran"
WScript.Quit 0

' -----------------------------------------------------------------------------

Function AlreadyRan(rp)
  Dim p, age
  AlreadyRan = False
  p = SessionFile(rp)
  If Not fso.FileExists(p) Then Exit Function
  On Error Resume Next
  age = DateDiff("s", fso.GetFile(p).DateLastModified, Now)
  On Error GoTo 0
  If age >= 0 And age < SESSION_SECS Then AlreadyRan = True
End Function

Sub MarkRan(rp)
  Dim ts, p
  p = SessionFile(rp)
  On Error Resume Next
  Set ts = fso.CreateTextFile(p, True)
  If Not ts Is Nothing Then
    ts.WriteLine CStr(Now)
    ts.Close
  End If
  On Error GoTo 0
End Sub

Function SessionFile(rp)
  Dim key
  key = Replace(Replace(LCase(rp), "\", "_"), ":", "")
  key = Replace(Replace(key, " ", "_"), "/", "_")
  SessionFile = fso.BuildPath(sh.ExpandEnvironmentStrings("%TEMP%"), "swood_sm_once_" & key & ".txt")
End Function

Function ResolveReport()
  Dim p, n
  ResolveReport = ""
  If WScript.Arguments.Count >= 1 Then
    p = Trim(CStr(WScript.Arguments(0)))
    If Len(p) > 0 Then
      If fso.FileExists(p) Then
        n = LCase(fso.GetFileName(p))
        If Right(n, 4) = ".dxf" Or Right(n, 3) = ".js" Then
          p = fso.GetParentFolderName(p)
          If LCase(fso.GetFileName(p)) = "dxfs" Or LCase(fso.GetFileName(p)) = "db" Then
            p = fso.GetParentFolderName(p)
          End If
        End If
      End If
      If fso.FolderExists(p) Then ResolveReport = p : Exit Function
    End If
  End If
  p = ReadHandOff()
  If Len(p) > 0 And fso.FolderExists(p) Then ResolveReport = p
End Function

Function WriteHandOff(rp)
  Dim ts
  WriteHandOff = False
  On Error Resume Next
  Set ts = fso.CreateTextFile(fso.BuildPath(sh.ExpandEnvironmentStrings("%TEMP%"), HAND_OFF), True)
  If Err.Number <> 0 Then Exit Function
  ts.WriteLine rp
  ts.Close
  WriteHandOff = True
  On Error GoTo 0
End Function

Function ReadHandOff()
  Dim p, ts
  ReadHandOff = ""
  p = fso.BuildPath(sh.ExpandEnvironmentStrings("%TEMP%"), HAND_OFF)
  If Not fso.FileExists(p) Then Exit Function
  On Error Resume Next
  Set ts = fso.OpenTextFile(p, 1)
  If Not ts Is Nothing Then
    If Not ts.AtEndOfStream Then ReadHandOff = Trim(ts.ReadLine)
    ts.Close
  End If
  On Error GoTo 0
End Function

Function GetSW()
  On Error Resume Next
  Set GetSW = GetObject(, "SldWorks.Application")
  On Error GoTo 0
End Function

Sub CleanUpProjections(rp)
  Dim dxfDir, f
  dxfDir = fso.BuildPath(rp, "dxfs")
  If Not fso.FolderExists(dxfDir) Then Exit Sub
  On Error Resume Next
  For Each f In fso.GetFolder(dxfDir).Files
    If LCase(Left(f.Name, 7)) = "smpart-" Then f.Delete True
    If LCase(Left(f.Name, 6)) = "front-" Then f.Delete True
  Next
  On Error GoTo 0
End Sub

Sub LogLine(msg)
  Dim ts, dir
  On Error Resume Next
  dir = fso.GetParentFolderName(logFile)
  If Len(dir) > 0 Then
    If Not fso.FolderExists(dir) Then fso.CreateFolder dir
  End If
  Set ts = fso.OpenTextFile(logFile, 8, True)
  If Not ts Is Nothing Then
    ts.WriteLine FormatDateTime(Now, 3) & "  " & msg
    ts.Close
  End If
  On Error GoTo 0
End Sub

Sub Fail(msg)
  LogLine "FAIL " & msg
  If WScript.Arguments.Count = 0 Then
    MsgBox msg, 16, "SheetMetalGeometry launcher"
  End If
  WScript.Quit 1
End Sub
