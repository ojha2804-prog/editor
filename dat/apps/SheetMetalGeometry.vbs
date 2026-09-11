' ============================================================================
' SheetMetalGeometry.vbs  -  launcher  (6.20.0-run-once)
' ----------------------------------------------------------------------------
' Called automatically by Report.cfg:
'     [DXF_SHEETMETAL_PART]
'         POSTPROCESS     = C:\Windows\System32\cscript.exe
'         POSTPROCESSARGS = //nologo "...\SheetMetalGeometry.vbs" "<REPORTPATH>"
'
' It does three things only:
'   1. writes the report path to %TEMP%\swood_sm_reportpath.txt
'   2. calls RunMacro on SheetMetalGeometry.swp  ONCE per Generate
'   3. deletes folded smpart-/front- views after the real flats exist
'
' WHY ONCE
' SWOOD runs this POSTPROCESS once per sheet metal part (12 times on
' Assem1). The VBA already walks the whole assembly. Running it 12 times
' is what made Generate feel stuck. The first call exports everything;
' the next 11 exit immediately (session file in %TEMP%, 10 minutes).
'
' No WScript.Sleep. No ResolveAllLightWeightComponents. No ExitApp.
' No MsgBox during a report run.
'
' WHY VBA, NOT VBSCRIPT ARRAYS
' SOLIDWORKS hands component lists back as SafeArrays of VT_DISPATCH.
' Late-bound VBScript cannot read those elements (Type mismatch 13).
' VBA can. This file is one RunMacro call with no arrays.
'
' INSTALL
'   this file  -> D:\SWOOD_LIBRARY 2026\DATA\DAT\apps\SheetMetalGeometry.vbs
'   the macro  -> D:\SWOOD_LIBRARY 2026\SHEETMETAL CUSTOM PROPERTY MACRO\
'                 SheetMetalGeometry.swp
'   VBA source -> dat\apps\SheetMetalGeometry.bas  (paste into the .swp)
' ============================================================================

Option Explicit

Const VERSION = "6.20.0-run-once"
Const MACRO_PATH = "D:\SWOOD_LIBRARY 2026\SHEETMETAL CUSTOM PROPERTY MACRO\SheetMetalGeometry.swp"
Const HANDOFF = "swood_sm_reportpath.txt"
Const SESSION_SECS = 600
Const DEFAULT_REPORT = "C:\Swood Reports\2026_09\Assem1"

Dim fso, sh, reportPath, tmpFile, logFile, swApp

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

If WScript.Arguments.Count > 0 Then
	reportPath = WScript.Arguments(0)
Else
	reportPath = ReadLastReport()
End If
If Len(reportPath) > 0 Then
	If Right(reportPath, 1) = "\" Then reportPath = Left(reportPath, Len(reportPath) - 1)
End If
If Not IsReportFolder(reportPath) Then reportPath = ReadLastReport()
If Not IsReportFolder(reportPath) And fso.FolderExists(DEFAULT_REPORT) Then
	If fso.FileExists(DEFAULT_REPORT & "\index.html") Then reportPath = DEFAULT_REPORT
End If
If Len(reportPath) = 0 Then WScript.Quit 0
If Not fso.FolderExists(reportPath) Then WScript.Quit 0

If Not fso.FolderExists(reportPath & "\db") Then fso.CreateFolder reportPath & "\db"
logFile = reportPath & "\db\launcher.log"
Note VERSION & " started, report = " & reportPath
RememberReport
CopySelfToReport
WriteHelperCmd

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
On Error GoTo 0

If AlreadyRan() Then
	Note "skip RunMacro - already ran this Generate (once per report, not once per part)"
	CleanUpProjections
	WScript.Quit 0
End If

If Not fso.FileExists(MACRO_PATH) Then
	Note "MACRO NOT FOUND: " & MACRO_PATH
	Note "Paste dat\apps\SheetMetalGeometry.bas into that .swp (module name SheetMetalGeometry)."
	WScript.Quit 0
End If

On Error Resume Next
Set swApp = Nothing
Set swApp = GetObject(, "SldWorks.Application")
If Err.Number <> 0 Then
	Note "GetObject failed: " & Err.Number & " " & Err.Description
	Err.Clear
End If
On Error GoTo 0

If swApp Is Nothing Then
	Note "SOLIDWORKS is not running - nothing to do"
	WScript.Quit 0
End If
Note "attached to SOLIDWORKS"

Dim names, i, ranOk
names = Array("SheetMetalGeometry", "Module1", "main", "SheetMetalGeometry1")
ranOk = False
On Error Resume Next
For i = 0 To UBound(names)
	If Not ranOk Then
		Err.Clear
		ranOk = swApp.RunMacro(MACRO_PATH, names(i), "main")
		If Err.Number <> 0 Then
			Note "RunMacro raised on module '" & names(i) & "': " & Err.Number & " " & Err.Description
			Err.Clear
			ranOk = False
		ElseIf ranOk Then
			Note "macro ran, module '" & names(i) & "'"
		Else
			Note "module '" & names(i) & "' not found in the macro"
		End If
	End If
Next

If Not ranOk Then
	Dim mp, mn, pn, op, e1, w1
	mp = MACRO_PATH
	mn = "SheetMetalGeometry"
	pn = "main"
	op = 0
	e1 = 0
	w1 = 0
	Err.Clear
	ranOk = swApp.RunMacro2(mp, mn, pn, op, e1, w1)
	If Err.Number <> 0 Then
		Note "RunMacro2 also failed: " & Err.Number & " " & Err.Description
		Err.Clear
		ranOk = False
	ElseIf ranOk Then
		Note "macro ran via RunMacro2"
	Else
		Note "RunMacro2 returned false (err=" & e1 & " warn=" & w1 & ")"
	End If
End If
On Error GoTo 0

If Not ranOk Then
	Note "COULD NOT START THE MACRO. Open the .swp and check the module name."
Else
	MarkRan
	Note "done - see db\sheetmetal-geometry.log"
	CleanUpProjections
End If

WScript.Quit 0

Function AlreadyRan()
	Dim p, age
	AlreadyRan = False
	p = SessionFile()
	If Not fso.FileExists(p) Then Exit Function
	On Error Resume Next
	age = DateDiff("s", fso.GetFile(p).DateLastModified, Now)
	On Error GoTo 0
	If age >= 0 And age < SESSION_SECS Then AlreadyRan = True
End Function

Sub MarkRan()
	On Error Resume Next
	Dim ts2
	Set ts2 = fso.CreateTextFile(SessionFile(), True)
	ts2.WriteLine Now & " " & VERSION & " " & reportPath
	ts2.Close
	On Error GoTo 0
End Sub

Function SessionFile()
	Dim s
	s = Replace(Replace(Replace(LCase(reportPath), "\", "_"), ":", ""), " ", "_")
	SessionFile = sh.ExpandEnvironmentStrings("%TEMP%") & "\swood_sm_once_" & s & ".txt"
End Function

Function IsReportFolder(p)
	If p = "" Then
		IsReportFolder = False
	ElseIf Not fso.FolderExists(p) Then
		IsReportFolder = False
	Else
		IsReportFolder = fso.FileExists(p & "\index.html")
	End If
End Function

Function ReadLastReport()
	Dim p, ts3
	ReadLastReport = ""
	p = fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), "last-report.txt")
	If Not fso.FileExists(p) Then Exit Function
	Set ts3 = fso.OpenTextFile(p, 1)
	If Not ts3.AtEndOfStream Then ReadLastReport = Trim(ts3.ReadLine)
	ts3.Close
End Function

Sub RememberReport()
	If Not IsReportFolder(reportPath) Then Exit Sub
	On Error Resume Next
	Dim ts4
	Set ts4 = fso.CreateTextFile(fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), "last-report.txt"), True)
	ts4.WriteLine reportPath
	ts4.Close
	Set ts4 = fso.CreateTextFile(sh.ExpandEnvironmentStrings("%TEMP%") & "\" & HANDOFF, True)
	ts4.WriteLine reportPath
	ts4.Close
	On Error GoTo 0
End Sub

Sub CopySelfToReport()
	Dim dest
	If Not IsReportFolder(reportPath) Then Exit Sub
	dest = reportPath & "\SheetMetalGeometry.vbs"
	On Error Resume Next
	If LCase(dest) <> LCase(WScript.ScriptFullName) Then
		fso.CopyFile WScript.ScriptFullName, dest, True
	End If
	On Error GoTo 0
End Sub

Sub WriteHelperCmd()
	Dim p, s
	If Not IsReportFolder(reportPath) Then Exit Sub
	p = reportPath & "\Export Flat Patterns.cmd"
	s = "@echo off" & vbCrLf & _
		"setlocal" & vbCrLf & _
		"set CSCRIPT=%SystemRoot%\System32\cscript.exe" & vbCrLf & _
		"if exist ""%SystemRoot%\Sysnative\cscript.exe"" set CSCRIPT=%SystemRoot%\Sysnative\cscript.exe" & vbCrLf & _
		"set VBS=%~dp0SheetMetalGeometry.vbs" & vbCrLf & _
		"set REPORT=%~dp0" & vbCrLf & _
		"if ""%REPORT:~-1%""==""\"" set REPORT=%REPORT:~0,-1%" & vbCrLf & _
		"echo VERSION from VBS:" & vbCrLf & _
		"findstr /C:""Const VERSION"" ""%VBS%""" & vbCrLf & _
		"echo If VERSION is not 6.20.0-run-once you copied the wrong file." & vbCrLf & _
		"""%CSCRIPT%"" //nologo ""%VBS%"" ""%REPORT%""" & vbCrLf & _
		"if exist ""%REPORT%\db\launcher.log"" type ""%REPORT%\db\launcher.log""" & vbCrLf & _
		"echo Reload the report, then open Sheetmetal Layout." & vbCrLf & _
		"pause" & vbCrLf
	On Error Resume Next
	Set ts = fso.CreateTextFile(p, True)
	ts.Write s
	ts.Close
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
		If LCase(Left(f.Name, 7)) = "smpart-" Or LCase(Left(f.Name, 6)) = "front-" Then
			fso.DeleteFile f.Path, True
			If Err.Number <> 0 Then
				Err.Clear
			Else
				n = n + 1
			End If
		End If
	Next
	If n > 0 Then Note "removed " & n & " projected-view DXF(s)"
	On Error GoTo 0
End Sub

Sub Note(msg)
	On Error Resume Next
	Dim f
	Set f = fso.OpenTextFile(logFile, 8, True)
	If Err.Number = 0 Then
		f.WriteLine Now & "  " & msg
		f.Close
	End If
	Err.Clear
End Sub
