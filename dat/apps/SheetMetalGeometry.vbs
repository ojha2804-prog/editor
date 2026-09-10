' SheetMetalGeometry.vbs
'
' Two modes, and only one of them ever talks to SOLIDWORKS.
'
'   cscript SheetMetalGeometry.vbs "<reportPath>"
'       Runs as the SWOOD POSTPROCESS, once per sheet metal part, while
'       SOLIDWORKS is busy generating. Pure file work: no COM, no Sleep,
'       no MsgBox, no launcher. SWOOD's own DXF is a folded *Front view,
'       never an unfold, so it is filed away under dxfs\_trigger and only
'       used as a labelled fallback outline.
'
'   cscript SheetMetalGeometry.vbs "<reportPath>" /exportall
'       Run by hand (Export Flat Patterns.cmd) once Generate has finished
'       and SOLIDWORKS is idle. This is the official shop macro: walk the
'       open assembly and call, for every sheet metal body,
'         ExportToDWG2 path, modelPath, 3, True, alignment(11), _
'                      False, False, 1, bodyName
'       The real unfolds land in dxfs\<PartName>.dxf and Layout picks
'       them up on the next reload.
'
' SOLIDWORKS rejects COM calls while it is generating (RPC_E_CALL_REJECTED),
' which is why the export cannot happen during the report run - and why
' trying it there once cost 12 re-attaches and a hung Generate.

Option Explicit

Const VERSION = "6.18.16-report-folder"
Const PTOL = 0.05
Const swDocPART = 1
Const swDocASSEMBLY = 2
Const swSolidBody = 0
Const swExportActionBody = 3
Const swExportSheetMetalGeometry = 1
Const swComponentFullyResolved = 2
Const swOpenDocSilent = 1

Dim fso, sh, reportPath, dxfDir, trigDir, dbDir, logPath, outPath, exportAll
Dim gSw, resultMsg

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

If WScript.Arguments.Count >= 1 Then
	reportPath = WScript.Arguments(0)
Else
	reportPath = ReadHandOff()
End If
If reportPath = "" Or Not fso.FolderExists(reportPath) Then
	reportPath = ReadHandOff()
End If

exportAll = False
Dim ai
For ai = 0 To WScript.Arguments.Count - 1
	If LCase(Trim(WScript.Arguments(ai))) = "/exportall" Then exportAll = True
Next

' Double-clicking the .cmd in DAT\apps used that folder as the report and
' then hung on ResolveAllLightWeightComponents. A report has index.html.
If Not IsReportFolder(reportPath) Then
	reportPath = ReadLastReport()
End If
If (reportPath = "" Or Not IsReportFolder(reportPath)) And fso.FolderExists("C:\Swood Reports\2026_09\Assem1") Then
	reportPath = "C:\Swood Reports\2026_09\Assem1"
End If
If reportPath = "" Or Not fso.FolderExists(reportPath) Then
	WScript.Quit 1
End If

dxfDir = fso.BuildPath(reportPath, "dxfs")
dbDir = fso.BuildPath(reportPath, "db")
If Not fso.FolderExists(dbDir) Then fso.CreateFolder dbDir
If Not fso.FolderExists(dxfDir) Then fso.CreateFolder dxfDir
trigDir = fso.BuildPath(dxfDir, "_trigger")
If Not fso.FolderExists(trigDir) Then fso.CreateFolder trigDir
logPath = fso.BuildPath(dbDir, "sheetmetal-geometry.log")
outPath = fso.BuildPath(dbDir, "sheetmetal-geometry.js")

If exportAll Then
	Log "started " & VERSION & " /exportall (official unfold from the open assembly)"
Else
	Log "started " & VERSION & " (report pass - no SOLIDWORKS calls)"
End If
Log "  report = " & reportPath

RememberReport
FileTriggers
DropLegacyFiles
ImportMacroFolders
CopySelfToReport
WriteHelperCmd

If exportAll Then ExportEverything

Dim js, nFlat, nFolded
BuildGeometryJs js, nFlat, nFolded
WriteText outPath, js
Log "FINISHED - " & nFlat & " real flat pattern(s), " & nFolded & " folded fallback(s)"
If nFolded > 0 And Not exportAll Then
	Log "  for real unfolds run: " & fso.BuildPath(reportPath, "Export Flat Patterns.cmd")
End If
If exportAll Then WriteResultFile nFlat
WScript.Quit 0

' ---------------------------------------------------------------- paths

Function ReadHandOff()
	ReadHandOff = ReadOneLine(fso.BuildPath(sh.ExpandEnvironmentStrings("%TEMP%"), _
		"swood_sm_reportpath.txt"))
End Function

Function ReadLastReport()
	Dim p
	p = ReadOneLine(fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), "last-report.txt"))
	If p = "" Then p = ReadHandOff()
	ReadLastReport = p
End Function

Function ReadOneLine(path)
	Dim ts
	ReadOneLine = ""
	If Not fso.FileExists(path) Then Exit Function
	Set ts = fso.OpenTextFile(path, 1)
	If Not ts.AtEndOfStream Then ReadOneLine = Trim(ts.ReadLine)
	ts.Close
End Function

Function IsReportFolder(p)
	If p = "" Then
		IsReportFolder = False
	ElseIf Not fso.FolderExists(p) Then
		IsReportFolder = False
	Else
		IsReportFolder = fso.FileExists(fso.BuildPath(p, "index.html"))
	End If
End Function

Sub RememberReport()
	If Not IsReportFolder(reportPath) Then Exit Sub
	On Error Resume Next
	WriteText fso.BuildPath(sh.ExpandEnvironmentStrings("%TEMP%"), "swood_sm_reportpath.txt"), _
		reportPath & vbCrLf
	WriteText fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), "last-report.txt"), _
		reportPath & vbCrLf
	On Error GoTo 0
End Sub

Sub Log(msg)
	On Error Resume Next
	Dim ts
	Set ts = fso.OpenTextFile(logPath, 8, True)
	ts.WriteLine Year(Now) & "-" & Pad(Month(Now)) & "-" & Pad(Day(Now)) & " " & _
		Pad(Hour(Now)) & ":" & Pad(Minute(Now)) & ":" & Pad(Second(Now)) & "  " & msg
	ts.Close
	On Error GoTo 0
End Sub

Function Pad(n)
	If n < 10 Then Pad = "0" & n Else Pad = CStr(n)
End Function

Sub WriteText(path, text)
	Dim ts
	Set ts = fso.CreateTextFile(path, True)
	ts.Write text
	ts.Close
End Sub

' So the .cmd window has something to show besides "Done".
Sub WriteResultFile(nFlat)
	Dim p, t
	p = fso.BuildPath(dbDir, "export-flat-patterns.txt")
	t = VERSION & vbCrLf & Now & vbCrLf
	If resultMsg <> "" Then t = t & resultMsg & vbCrLf
	t = t & "real flat patterns now in dxfs: " & nFlat & vbCrLf
	t = t & "full log: " & logPath & vbCrLf
	WriteText p, t
End Sub

Function IsDxf(fname)
	IsDxf = (LCase(fso.GetExtensionName(fname)) = "dxf")
End Function

Function HasPrefix(fname, prefix)
	HasPrefix = (LCase(Left(fname, Len(prefix))) = LCase(prefix))
End Function

' SWOOD writes its folded *Front view straight into dxfs. Move it out of
' the way so dxfs holds nothing but real flat patterns - the user should
' never have to look at smpart-/front- noise again.
Sub FileTriggers()
	Dim names, i, src, dest, n
	n = 0
	names = DxfNamesIn(dxfDir)
	For i = 0 To UBound(names)
		If HasPrefix(names(i), "front-") Then
			src = fso.BuildPath(dxfDir, names(i))
			dest = fso.BuildPath(trigDir, names(i))
			On Error Resume Next
			If fso.FileExists(dest) Then fso.DeleteFile dest, True
			fso.MoveFile src, dest
			If Err.Number = 0 Then
				n = n + 1
			Else
				' still locked by SWOOD; the next part's run will get it
				Err.Clear
			End If
			On Error GoTo 0
		End If
	Next
	If n > 0 Then Log "  filed " & n & " folded trigger view(s) under dxfs\_trigger"
End Sub

' Snapshot the names first - deleting or moving inside a For Each over
' the live Files collection skips entries.
Function DxfNamesIn(folder)
	Dim f, names
	names = Array()
	If fso.FolderExists(folder) Then
		For Each f In fso.GetFolder(folder).Files
			If IsDxf(f.Name) Then
				ReDim Preserve names(UBound(names) + 1)
				names(UBound(names)) = f.Name
			End If
		Next
	End If
	DxfNamesIn = names
End Function

' smpart-* and flat-* were earlier attempts that also held folded views.
' Delete them so they can never be mistaken for an unfold.
Sub DropLegacyFiles()
	Dim names, i, n
	n = 0
	names = DxfNamesIn(dxfDir)
	For i = 0 To UBound(names)
		If HasPrefix(names(i), "smpart-") Or HasPrefix(names(i), "flat-") Then
			On Error Resume Next
			fso.DeleteFile fso.BuildPath(dxfDir, names(i)), True
			If Err.Number = 0 Then n = n + 1 Else Err.Clear
			On Error GoTo 0
		End If
	Next
	If n > 0 Then Log "  removed " & n & " stale folded-view file(s)"
End Sub

' If the shop macro already writes DXFs somewhere, list that folder (one
' per line) in DAT\apps\sheetmetal-dxf-folders.txt and they are copied in
' as real flat patterns.
Sub ImportMacroFolders()
	Dim listPath, ts, line, folders, i, f, dest, n
	n = 0
	folders = Array()
	listPath = fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), _
		"sheetmetal-dxf-folders.txt")
	If fso.FileExists(listPath) Then
		Set ts = fso.OpenTextFile(listPath, 1)
		Do While Not ts.AtEndOfStream
			line = Trim(ts.ReadLine)
			If line <> "" And Left(line, 1) <> ";" And Left(line, 1) <> "'" Then
				ReDim Preserve folders(UBound(folders) + 1)
				folders(UBound(folders)) = line
			End If
		Loop
		ts.Close
	End If
	If UBound(folders) < 0 Then Exit Sub
	For i = 0 To UBound(folders)
		If Not fso.FolderExists(folders(i)) Then
			Log "  macro folder missing: " & folders(i)
		Else
			For Each f In fso.GetFolder(folders(i)).Files
				If IsDxf(f.Name) Then
					dest = fso.BuildPath(dxfDir, SafeFile(MacroPartName(f.Name)) & ".dxf")
					On Error Resume Next
					If Not fso.FileExists(dest) Then
						f.Copy dest, True
						If Err.Number = 0 Then n = n + 1 Else Err.Clear
					ElseIf f.DateLastModified > fso.GetFile(dest).DateLastModified Then
						f.Copy dest, True
						If Err.Number = 0 Then n = n + 1 Else Err.Clear
					End If
					On Error GoTo 0
				End If
			Next
		End If
	Next
	If n > 0 Then Log "  imported " & n & " macro DXF(s)"
End Sub

' Strips the shop macro suffixes: _Mat-x_Thick-y_Qty-n and _Default
Function MacroPartName(fname)
	Dim s, i, markers, m
	s = fname
	If LCase(Right(s, 4)) = ".dxf" Then s = Left(s, Len(s) - 4)
	If HasPrefix(s, "flat-") Then s = Mid(s, 6)
	markers = Array("_Mat-", "_Thick-", "_Qty-")
	For Each m In markers
		i = InStr(1, s, m, 1)
		If i > 1 Then s = Left(s, i - 1)
	Next
	If LCase(Right(s, 8)) = "_default" Then s = Left(s, Len(s) - 8)
	MacroPartName = s
End Function

' Keep a copy in the report folder so the export never depends on
' guessing APP.USERPATH / %APPDATA%\Swood. That folder is not always
' where SWOOD actually stores DAT\apps.
Sub CopySelfToReport()
	Dim dest
	dest = fso.BuildPath(reportPath, "SheetMetalGeometry.vbs")
	On Error Resume Next
	If LCase(dest) <> LCase(WScript.ScriptFullName) Then
		fso.CopyFile WScript.ScriptFullName, dest, True
	End If
	WriteText fso.BuildPath(dbDir, "vbs-path.txt"), WScript.ScriptFullName & vbCrLf
	On Error GoTo 0
End Sub

' Double-click in the report folder. Uses the VBS sitting next to this
' .cmd (copied above). 64-bit cscript only — 32-bit cannot attach (429).
Sub WriteHelperCmd()
	Dim p, s
	p = fso.BuildPath(reportPath, "Export Flat Patterns.cmd")
	s = "@echo off" & vbCrLf & _
		"setlocal" & vbCrLf & _
		"set CSCRIPT=%SystemRoot%\System32\cscript.exe" & vbCrLf & _
		"if exist ""%SystemRoot%\Sysnative\cscript.exe"" set CSCRIPT=%SystemRoot%\Sysnative\cscript.exe" & vbCrLf & _
		"set VBS=%~dp0SheetMetalGeometry.vbs" & vbCrLf & _
		"set REPORT=%~dp0" & vbCrLf & _
		"if ""%REPORT:~-1%""==""\"" set REPORT=%REPORT:~0,-1%" & vbCrLf & _
		"if not exist ""%VBS%"" (" & vbCrLf & _
		"  echo Missing %VBS%" & vbCrLf & _
		"  echo Copy SheetMetalGeometry.vbs into this report folder and run again." & vbCrLf & _
		"  pause" & vbCrLf & _
		"  exit /b 1" & vbCrLf & _
		")" & vbCrLf & _
		"echo." & vbCrLf & _
		"echo VBS     %VBS%" & vbCrLf & _
		"echo REPORT  %REPORT%" & vbCrLf & _
		"echo Exporting flat patterns from the open SOLIDWORKS assembly." & vbCrLf & _
		"echo Keep SOLIDWORKS open. Assembly must be Resolved, not Lightweight." & vbCrLf & _
		"echo." & vbCrLf & _
		"""%CSCRIPT%"" //nologo ""%VBS%"" ""%REPORT%"" /exportall" & vbCrLf & _
		"echo." & vbCrLf & _
		"if exist ""%REPORT%\db\export-flat-patterns.txt"" type ""%REPORT%\db\export-flat-patterns.txt""" & vbCrLf & _
		"echo." & vbCrLf & _
		"echo Reload the report, then open Sheetmetal Layout." & vbCrLf & _
		"pause" & vbCrLf
	On Error Resume Next
	WriteText p, s
	On Error GoTo 0
End Sub

' ------------------------------------------------- SOLIDWORKS, idle only

Sub ExportEverything()
	Dim model, docType, wrote, seen, nSeen
	Set gSw = Nothing
	Set model = Nothing
	wrote = 0
	nSeen = 0
	resultMsg = ""
	Set seen = CreateObject("Scripting.Dictionary")

	Set gSw = AttachSolidWorks()
	If gSw Is Nothing Then Exit Sub

	On Error Resume Next
	Set model = gSw.ActiveDoc
	If Err.Number <> 0 Then
		resultMsg = "SOLIDWORKS is busy and refused the call (" & Err.Number & " " & Err.Description & ")"
		Log "  " & resultMsg
		Log "  wait until the rebuild finishes, then run Export Flat Patterns.cmd again"
		Err.Clear
		On Error GoTo 0
		Exit Sub
	End If
	On Error GoTo 0
	If model Is Nothing Then
		resultMsg = "no document open - open the assembly first"
		Log "  " & resultMsg
		Exit Sub
	End If

	docType = DocTypeOf(model)
	Log "  active document = " & DocTitle(model) & " (type " & docType & ")"

	If docType = swDocASSEMBLY Then
		' Do not call ResolveAllLightWeightComponents — it hangs SWOOD assemblies.
		Log "  exporting already-open parts first (no assembly-wide resolve)"
		wrote = ProcessOpenDocuments(seen)
		Log "  walking the assembly tree"
		WalkAssembly model, seen, wrote, nSeen
	ElseIf docType = swDocPART Then
		wrote = ProcessPartDoc(model, DocBaseName(model))
		nSeen = 1
	Else
		resultMsg = "active document is neither a part nor an assembly"
		Log "  " & resultMsg
	End If

	wrote = wrote + ProcessOpenDocuments(seen)

	Log "  walked " & nSeen & " component(s), " & seen.Count & " distinct part(s), exported " & wrote
	If wrote = 0 Then
		resultMsg = "exported 0 flat patterns. " & nSeen & " component(s) seen, " & _
			seen.Count & " part(s) loaded. Resolve the assembly (Set to Resolved, not Lightweight) and run again."
		Log "  " & resultMsg
	Else
		resultMsg = "exported " & wrote & " flat pattern(s)"
	End If
End Sub

Function AttachSolidWorks()
	Dim ids, i, app
	ids = Array("SldWorks.Application", _
		"SldWorks.Application.32", "SldWorks.Application.31", "SldWorks.Application.30", _
		"SldWorks.Application.29", "SldWorks.Application.28", "SldWorks.Application.27")
	Set AttachSolidWorks = Nothing
	For i = 0 To UBound(ids)
		Set app = Nothing
		On Error Resume Next
		Err.Clear
		Set app = GetObject(, ids(i))
		If Err.Number = 0 Then
			If Not app Is Nothing Then
				Log "  attached as " & ids(i)
				Set AttachSolidWorks = app
				On Error GoTo 0
				Exit Function
			End If
		End If
		If i = 0 Then Log "  " & ids(i) & " -> " & Err.Number & " " & Err.Description
		Err.Clear
		On Error GoTo 0
	Next
	resultMsg = "cannot attach to SOLIDWORKS. Use the 64-bit cscript (the new .cmd does) and keep SOLIDWORKS open."
	Log "  " & resultMsg
End Function

Function DocTitle(model)
	Dim t
	t = ""
	On Error Resume Next
	t = model.GetTitle
	On Error GoTo 0
	DocTitle = t
End Function

' Name Layout will look for: the file name without extension.
Function DocBaseName(model)
	Dim p, n
	n = ""
	On Error Resume Next
	p = model.GetPathName
	On Error GoTo 0
	If p <> "" Then
		n = fso.GetBaseName(p)
	Else
		n = DocTitle(model)
		If LCase(Right(n, 7)) = ".sldprt" Then n = Left(n, Len(n) - 7)
	End If
	DocBaseName = n
End Function

' Top-level components, then each child's children. Lightweight parts
' are resolved or opened by path - GetModelDoc2 is Nothing until then,
' which is why the previous .cmd attached to Assem1 and exported 0.
Sub WalkAssembly(assyModel, seen, ByRef wrote, ByRef nSeen)
	Dim raw, i, comp
	On Error Resume Next
	raw = assyModel.GetComponents(True)
	On Error GoTo 0
	If IsArray(raw) Then
		For i = LBound(raw) To UBound(raw)
			Set comp = Nothing
			On Error Resume Next
			Set comp = raw(i)
			On Error GoTo 0
			WalkComp comp, seen, wrote, nSeen
		Next
	ElseIf IsObject(raw) Then
		If Not raw Is Nothing Then WalkComp raw, seen, wrote, nSeen
	Else
		Log "  " & DocTitle(assyModel) & ": no top-level components"
	End If
End Sub

Sub WalkComp(comp, seen, ByRef wrote, ByRef nSeen)
	Dim doc, kids, i, name, t, child
	If comp Is Nothing Then Exit Sub
	nSeen = nSeen + 1

	Set doc = OpenPartFromComp(comp)
	If Not doc Is Nothing Then
		t = DocTypeOf(doc)
		If t = swDocPART Then
			name = DocBaseName(doc)
			If name <> "" Then
				If Not seen.Exists(LCase(name)) Then
					seen.Add LCase(name), True
					wrote = wrote + ProcessPartDoc(doc, name)
				End If
			End If
		ElseIf t = swDocASSEMBLY Then
			WalkAssembly doc, seen, wrote, nSeen
		End If
	End If

	On Error Resume Next
	kids = comp.GetChildren
	On Error GoTo 0
	If IsArray(kids) Then
		For i = LBound(kids) To UBound(kids)
			Set child = Nothing
			On Error Resume Next
			Set child = kids(i)
			On Error GoTo 0
			WalkComp child, seen, wrote, nSeen
		Next
	End If
End Sub

Function OpenPartFromComp(comp)
	Dim doc, path, errs, warns
	Set OpenPartFromComp = Nothing
	On Error Resume Next
	Set doc = comp.GetModelDoc2
	If Not doc Is Nothing Then
		Set OpenPartFromComp = doc
		On Error GoTo 0
		Exit Function
	End If
	comp.SetSuppression2 swComponentFullyResolved
	Err.Clear
	Set doc = comp.GetModelDoc2
	If Not doc Is Nothing Then
		Set OpenPartFromComp = doc
		On Error GoTo 0
		Exit Function
	End If
	path = ""
	path = comp.GetPathName
	If path <> "" And Not gSw Is Nothing Then
		errs = 0: warns = 0
		Set doc = gSw.OpenDoc6(path, swDocPART, swOpenDocSilent, "", errs, warns)
		If Not doc Is Nothing Then Set OpenPartFromComp = doc
	End If
	On Error GoTo 0
End Function

' After a report run many parts are already in memory even if the
' assembly tree still reports them as lightweight.
Function ProcessOpenDocuments(seen)
	Dim doc, wrote, name
	wrote = 0
	If gSw Is Nothing Then
		ProcessOpenDocuments = 0
		Exit Function
	End If
	On Error Resume Next
	Set doc = gSw.GetFirstDocument
	On Error GoTo 0
	Do While Not doc Is Nothing
		If DocTypeOf(doc) = swDocPART Then
			name = DocBaseName(doc)
			If name <> "" Then
				If Not seen.Exists(LCase(name)) Then
					seen.Add LCase(name), True
					wrote = wrote + ProcessPartDoc(doc, name)
				End If
			End If
		End If
		On Error Resume Next
		Set doc = doc.GetNext
		On Error GoTo 0
	Loop
	If wrote > 0 Then Log "  also exported " & wrote & " already-open part(s)"
	ProcessOpenDocuments = wrote
End Function

Function DocTypeOf(model)
	Dim t
	t = -1
	On Error Resume Next
	t = model.GetType
	On Error GoTo 0
	DocTypeOf = t
End Function

' Shop macro ProcessPartDoc: one DXF per sheet metal body.
Function ProcessPartDoc(partModel, layoutName)
	Dim vBodies, j, swBody, wrote
	wrote = 0

	On Error Resume Next
	vBodies = partModel.GetBodies2(swSolidBody, False)
	On Error GoTo 0
	If IsArray(vBodies) Then
		For j = LBound(vBodies) To UBound(vBodies)
			Set swBody = Nothing
			On Error Resume Next
			Set swBody = vBodies(j)
			On Error GoTo 0
			wrote = wrote + TryExportBody(partModel, swBody, layoutName, wrote)
		Next
	ElseIf IsObject(vBodies) Then
		If Not vBodies Is Nothing Then
			wrote = wrote + TryExportBody(partModel, vBodies, layoutName, wrote)
		End If
	End If
	If wrote = 0 Then Log "  " & layoutName & ": no sheet metal body"
	ProcessPartDoc = wrote
End Function

Function TryExportBody(partModel, swBody, layoutName, already)
	Dim dest, bodyName
	TryExportBody = 0
	If swBody Is Nothing Then Exit Function
	If Not IsSheetMetalBody(swBody) Then Exit Function
	bodyName = BodyNameOf(swBody)
	If already = 0 Then
		dest = fso.BuildPath(dxfDir, SafeFile(layoutName) & ".dxf")
	Else
		dest = fso.BuildPath(dxfDir, SafeFile(layoutName) & "_" & _
			SafeFile(bodyName) & ".dxf")
	End If
	If ExportBodyDXF(partModel, bodyName, dest) Then TryExportBody = 1
End Function

Function IsSheetMetalBody(swBody)
	Dim v
	v = False
	On Error Resume Next
	v = swBody.IsSheetMetal
	On Error GoTo 0
	IsSheetMetalBody = (v = True)
End Function

Function BodyNameOf(swBody)
	Dim n
	n = ""
	On Error Resume Next
	n = swBody.Name
	On Error GoTo 0
	BodyNameOf = n
End Function

' The official call, argument for argument:
'   action 3 = this body, 1 = sheet metal geometry, body name last.
' The shop macro passes alignmentData(11) - the last element, a plain 0.0,
' which SOLIDWORKS reads as "default alignment". Passing the whole array
' from VBScript would hand it a Variant array instead of doubles, so the
' single element is kept exactly as the macro has it.
Function ExportBodyDXF(partModel, bodyName, dest)
	Dim alignmentData(11), i, ok, modelPath
	ExportBodyDXF = False
	For i = 0 To 11
		alignmentData(i) = CDbl(0)
	Next
	modelPath = ""
	On Error Resume Next
	modelPath = partModel.GetPathName
	On Error GoTo 0
	If modelPath = "" Then modelPath = DocTitle(partModel)

	ok = False
	On Error Resume Next
	ok = partModel.ExportToDWG2(dest, modelPath, swExportActionBody, True, alignmentData(11), _
		False, False, swExportSheetMetalGeometry, bodyName)
	If Err.Number <> 0 Then
		Log "  ExportToDWG2 failed for " & bodyName & " (" & Err.Number & " " & Err.Description & ")"
		Err.Clear
		ok = False
	End If
	On Error GoTo 0

	If ok And fso.FileExists(dest) Then
		Log "  unfold " & fso.GetFileName(dest) & " (" & fso.GetFile(dest).Size & " bytes)"
		ExportBodyDXF = True
	Else
		Log "  no unfold written for body " & bodyName
	End If
End Function

Function SafeFile(s)
	Dim r
	r = s
	r = Replace(r, "\", "-")
	r = Replace(r, "/", "-")
	r = Replace(r, ":", "-")
	r = Replace(r, "*", "-")
	r = Replace(r, "?", "-")
	r = Replace(r, """", "-")
	r = Replace(r, "<", "-")
	r = Replace(r, ">", "-")
	r = Replace(r, "|", "-")
	SafeFile = r
End Function

' ---------------------------------------------------------- geometry js

' Real unfolds sit loose in dxfs. Folded trigger views sit in dxfs\_trigger
' and are only emitted for parts that have no unfold yet, always marked
' folded:true so Layout can say so instead of pretending.
Sub BuildGeometryJs(ByRef jsOut, ByRef nFlat, ByRef nFolded)
	Dim names, i, parts, seen, name
	nFlat = 0
	nFolded = 0
	parts = ""
	Set seen = CreateObject("Scripting.Dictionary")

	names = DxfNamesIn(dxfDir)
	For i = 0 To UBound(names)
		name = MacroPartName(names(i))
		nFlat = nFlat + AddGeom(fso.BuildPath(dxfDir, names(i)), name, False, parts, seen)
	Next

	names = DxfNamesIn(trigDir)
	For i = 0 To UBound(names)
		name = TriggerPartName(names(i))
		nFolded = nFolded + AddGeom(fso.BuildPath(trigDir, names(i)), name, True, parts, seen)
	Next

	jsOut = "/* sheet metal outlines for Layout" & vbCrLf & _
		"   folded:false = real SOLIDWORKS unfold (ExportToDWG2 flat pattern)" & vbCrLf & _
		"   folded:true  = SWOOD *Front view only, run Export Flat Patterns.cmd */" & vbCrLf & _
		"window.sheetMetalGeometry = {" & vbCrLf & parts & vbCrLf & "};" & vbCrLf
End Sub

Function AddGeom(dxfPath, name, folded, ByRef parts, seen)
	Dim alias, geom
	AddGeom = 0
	If name = "" Then Exit Function
	If seen.Exists(LCase(name)) Then Exit Function
	geom = ParseDxfFile(dxfPath)
	If geom = "" Then
		Log "  no outline in " & fso.GetFileName(dxfPath)
		Exit Function
	End If
	geom = Left(geom, Len(geom) - 1) & ",""folded"":" & LCase(CStr(folded)) & "}"
	If parts <> "" Then parts = parts & "," & vbCrLf
	parts = parts & "  " & JsStr(name) & ": " & geom
	seen.Add LCase(name), True
	alias = name
	If LCase(Left(alias, 8)) = "copy of " Then
		alias = Mid(alias, 9)
		If Not seen.Exists(LCase(alias)) Then
			parts = parts & "," & vbCrLf & "  " & JsStr(alias) & ": " & geom
			seen.Add LCase(alias), True
		End If
	End If
	If folded Then
		Log "  folded outline (no unfold yet) " & name
	Else
		Log "  flat pattern " & name
	End If
	AddGeom = 1
End Function

' front-<NAME>_<CONF>.dxf as written by the Report.cfg DXF job
Function TriggerPartName(fname)
	Dim s, i
	s = fname
	If LCase(Right(s, 4)) = ".dxf" Then s = Left(s, Len(s) - 4)
	If HasPrefix(s, "front-") Then s = Mid(s, 7)
	If HasPrefix(s, "smpart-") Then s = Mid(s, 8)
	If HasPrefix(s, "flat-") Then s = Mid(s, 6)
	i = InStrRev(s, "_")
	If i > 1 Then s = Left(s, i - 1)
	TriggerPartName = s
End Function

Function JsStr(s)
	s = Replace(s, "\", "\\")
	s = Replace(s, """", "\""")
	JsStr = """" & s & """"
End Function

' SOLIDWORKS writes plain LINE entities, not just LWPOLYLINE, so the
' segments have to be chained back into rings before anything has an area.
Function ParseDxfFile(path)
	Dim ts, code, val, ent, xs, ys, rings, segs
	Dim x10, y20, x11, y21, has10, has20, has11, has21
	Set ts = fso.OpenTextFile(path, 1)
	ent = ""
	xs = "": ys = ""
	rings = ""
	segs = ""
	has10 = False: has20 = False: has11 = False: has21 = False
	Do While Not ts.AtEndOfStream
		code = Trim(ts.ReadLine)
		If ts.AtEndOfStream Then Exit Do
		val = ts.ReadLine
		If code = "0" Then
			FlushEnt ent, xs, ys, rings, segs, x10, y20, x11, y21, has10, has20, has11, has21
			ent = UCase(Trim(val))
			xs = "": ys = ""
			has10 = False: has20 = False: has11 = False: has21 = False
		ElseIf ent = "LWPOLYLINE" Or ent = "POLYLINE" Then
			If code = "10" Then
				xs = xs & CStr(CDbl(Replace(val, ",", "."))) & ","
			ElseIf code = "20" Then
				ys = ys & CStr(CDbl(Replace(val, ",", "."))) & ","
			End If
		ElseIf ent = "LINE" Then
			If code = "10" Then
				x10 = CDbl(Replace(val, ",", ".")): has10 = True
			ElseIf code = "20" Then
				y20 = CDbl(Replace(val, ",", ".")): has20 = True
			ElseIf code = "11" Then
				x11 = CDbl(Replace(val, ",", ".")): has11 = True
			ElseIf code = "21" Then
				y21 = CDbl(Replace(val, ",", ".")): has21 = True
			End If
		End If
	Loop
	ts.Close
	FlushEnt ent, xs, ys, rings, segs, x10, y20, x11, y21, has10, has20, has11, has21
	If rings = "" And segs <> "" Then rings = ChainLines(segs)
	If rings = "" Then
		ParseDxfFile = ""
		Exit Function
	End If
	Dim arr, i, a, area, best, inners
	best = ""
	area = -1
	inners = ""
	arr = Split(rings, vbTab)
	For i = 0 To UBound(arr)
		If arr(i) <> "" Then
			a = RingArea(arr(i))
			If a > area Then
				If best <> "" Then
					If inners <> "" Then inners = inners & ","
					inners = inners & best
				End If
				area = a
				best = arr(i)
			Else
				If inners <> "" Then inners = inners & ","
				inners = inners & arr(i)
			End If
		End If
	Next
	If best = "" Then
		ParseDxfFile = ""
	Else
		ParseDxfFile = "{""outer"":" & best & ",""inner"":[" & inners & "]}"
	End If
End Function

Sub FlushEnt(ent, xs, ys, ByRef rings, ByRef segs, x10, y20, x11, y21, has10, has20, has11, has21)
	If (ent = "LWPOLYLINE" Or ent = "POLYLINE") And xs <> "" Then
		rings = rings & RingCsv(xs, ys) & vbTab
	End If
	If ent = "LINE" And has10 And has20 And has11 And has21 Then
		segs = segs & CStr(x10) & "," & CStr(y20) & "," & CStr(x11) & "," & CStr(y21) & ";"
	End If
End Sub

Function ChainLines(segs)
	Dim raw, i, j, n, used(), p, q
	Dim x1, y1, x2, y2, ptsX(), ptsY(), pc, grew, k
	Dim hx, hy, tx, ty, rings, closed
	If Right(segs, 1) = ";" Then segs = Left(segs, Len(segs) - 1)
	raw = Split(segs, ";")
	n = UBound(raw)
	If n < 2 Then
		ChainLines = ""
		Exit Function
	End If
	ReDim used(n)
	rings = ""
	For i = 0 To n
		If Not used(i) Then
			p = Split(raw(i), ",")
			If UBound(p) >= 3 Then
				used(i) = True
				ReDim ptsX(n + 2)
				ReDim ptsY(n + 2)
				ptsX(0) = CDbl(p(0)): ptsY(0) = CDbl(p(1))
				ptsX(1) = CDbl(p(2)): ptsY(1) = CDbl(p(3))
				pc = 1
				Do
					grew = False
					hx = ptsX(0): hy = ptsY(0)
					tx = ptsX(pc): ty = ptsY(pc)
					For j = 0 To n
						If Not used(j) Then
							q = Split(raw(j), ",")
							If UBound(q) >= 3 Then
								x1 = CDbl(q(0)): y1 = CDbl(q(1))
								x2 = CDbl(q(2)): y2 = CDbl(q(3))
								If Near(tx, ty, x1, y1) Then
									pc = pc + 1: ptsX(pc) = x2: ptsY(pc) = y2: used(j) = True: grew = True: Exit For
								ElseIf Near(tx, ty, x2, y2) Then
									pc = pc + 1: ptsX(pc) = x1: ptsY(pc) = y1: used(j) = True: grew = True: Exit For
								ElseIf Near(hx, hy, x1, y1) Then
									For k = pc To 0 Step -1
										ptsX(k + 1) = ptsX(k): ptsY(k + 1) = ptsY(k)
									Next
									ptsX(0) = x2: ptsY(0) = y2: pc = pc + 1: used(j) = True: grew = True: Exit For
								ElseIf Near(hx, hy, x2, y2) Then
									For k = pc To 0 Step -1
										ptsX(k + 1) = ptsX(k): ptsY(k + 1) = ptsY(k)
									Next
									ptsX(0) = x1: ptsY(0) = y1: pc = pc + 1: used(j) = True: grew = True: Exit For
								End If
							End If
						End If
					Next
				Loop While grew
				closed = Near(ptsX(0), ptsY(0), ptsX(pc), ptsY(pc))
				If pc >= 3 Then
					If Not closed Then
						pc = pc + 1
						ptsX(pc) = ptsX(0): ptsY(pc) = ptsY(0)
					End If
					rings = rings & PtsToRing(ptsX, ptsY, pc) & vbTab
				End If
			End If
		End If
	Next
	ChainLines = rings
End Function

Function Near(ax, ay, bx, by)
	Near = (Abs(ax - bx) <= PTOL) And (Abs(ay - by) <= PTOL)
End Function

Function PtsToRing(ptsX, ptsY, pc)
	Dim i, s
	s = "["
	For i = 0 To pc
		If i > 0 Then s = s & ","
		s = s & "[" & CStr(ptsX(i)) & "," & CStr(ptsY(i)) & "]"
	Next
	PtsToRing = s & "]"
End Function

Function RingCsv(xs, ys)
	Dim ax, ay, i, n, pts
	If Right(xs, 1) = "," Then xs = Left(xs, Len(xs) - 1)
	If Right(ys, 1) = "," Then ys = Left(ys, Len(ys) - 1)
	ax = Split(xs, ",")
	ay = Split(ys, ",")
	n = UBound(ax)
	If UBound(ay) < n Then n = UBound(ay)
	pts = "["
	For i = 0 To n
		If i > 0 Then pts = pts & ","
		pts = pts & "[" & ax(i) & "," & ay(i) & "]"
	Next
	RingCsv = pts & "]"
End Function

Function RingArea(json)
	Dim s, pairs, i, x1, y1, x2, y2, a, p
	s = Replace(Replace(Replace(json, "[", ""), "]", ""), " ", "")
	pairs = Split(s, "],[")
	a = 0
	For i = 0 To UBound(pairs)
		p = Split(pairs(i), ",")
		If UBound(p) >= 1 Then
			x1 = CDbl(p(0))
			y1 = CDbl(p(1))
			If i = UBound(pairs) Then
				p = Split(pairs(0), ",")
			Else
				p = Split(pairs(i + 1), ",")
			End If
			x2 = CDbl(p(0))
			y2 = CDbl(p(1))
			a = a + (x1 * y2 - x2 * y1)
		End If
	Next
	If a < 0 Then a = -a
	RingArea = a / 2
End Function
