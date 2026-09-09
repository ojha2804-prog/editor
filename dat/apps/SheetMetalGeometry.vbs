' SheetMetalGeometry.vbs
' Called by Report.cfg [DXF_SHEETMETAL_PART] POSTPROCESS after EACH DXF.
'
' SWOOD waits for this script to EXIT before it writes the next DXF.
' launcher.log proved that: 07:50:12 start → 07:50:28 done → 07:50:32 next.
' So this script MUST return immediately. No Sleep. No lock-and-wait.
'
' MUST NOT attach to SOLIDWORKS and MUST NOT start launcher.exe.
' The old chain re-exported every part on every part (12×12 opens).
' That is why one sheet-metal part blinked ~20 times and Generate stuck.
'
' This run only reads dxfs\smpart-*.dxf that SWOOD already wrote and
' overwrites db\sheetmetal-geometry.js. The last part has the full set.

Option Explicit

Const VERSION = "6.18.6-dxf-instant"

Dim fso, sh, reportPath, dxfDir, dbDir, logPath, outPath
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

If WScript.Arguments.Count >= 1 Then
	reportPath = WScript.Arguments(0)
Else
	reportPath = ReadHandOff()
End If
If reportPath = "" Or Not fso.FolderExists(reportPath) Then
	WScript.Quit 1
End If

dxfDir = fso.BuildPath(reportPath, "dxfs")
dbDir = fso.BuildPath(reportPath, "db")
If Not fso.FolderExists(dbDir) Then fso.CreateFolder dbDir
logPath = fso.BuildPath(dbDir, "sheetmetal-geometry.log")
outPath = fso.BuildPath(dbDir, "sheetmetal-geometry.js")

Log "started " & VERSION & " (DXF only — will not attach to SOLIDWORKS)"
Log "  report = " & reportPath

Dim nDxf
nDxf = CountSmpart(dxfDir)
Log "  smpart DXFs = " & nDxf

If nDxf = 0 Then
	Log "no smpart-*.dxf — nothing to write"
	WScript.Quit 0
End If

Dim js, count
count = BuildGeometryJs(dxfDir, js)
WriteText outPath, js
Log "FINISHED - " & count & " outline(s) from DXF (SOLIDWORKS was not opened)"
WScript.Quit 0

Function ReadHandOff()
	Dim p, ts
	p = fso.BuildPath(sh.ExpandEnvironmentStrings("%TEMP%"), "swood_sm_reportpath.txt")
	ReadHandOff = ""
	If Not fso.FileExists(p) Then Exit Function
	Set ts = fso.OpenTextFile(p, 1)
	If Not ts.AtEndOfStream Then ReadHandOff = Trim(ts.ReadLine)
	ts.Close
End Function

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

Function CountSmpart(folder)
	Dim f, n
	n = 0
	If Not fso.FolderExists(folder) Then
		CountSmpart = 0
		Exit Function
	End If
	For Each f In fso.GetFolder(folder).Files
		If LCase(Left(f.Name, 7)) = "smpart-" And LCase(fso.GetExtensionName(f.Name)) = "dxf" Then
			n = n + 1
		End If
	Next
	CountSmpart = n
End Function

Function BuildGeometryJs(folder, ByRef js)
	Dim f, name, geom, n, parts
	n = 0
	parts = ""
	For Each f In fso.GetFolder(folder).Files
		If LCase(Left(f.Name, 7)) = "smpart-" And LCase(fso.GetExtensionName(f.Name)) = "dxf" Then
			name = PartNameFromDxf(f.Name)
			geom = ParseDxfFile(f.Path)
			If geom <> "" Then
				If parts <> "" Then parts = parts & "," & vbCrLf
				parts = parts & "  " & JsStr(name) & ": " & geom
				n = n + 1
				Log "  DXF " & f.Name
			End If
		End If
	Next
	js = "/* built from smpart DXFs — SOLIDWORKS was not attached */" & vbCrLf & _
		"window.sheetMetalGeometry = {" & vbCrLf & parts & vbCrLf & "};" & vbCrLf
	BuildGeometryJs = n
End Function

Function PartNameFromDxf(fname)
	Dim s, i
	s = fname
	If LCase(Right(s, 4)) = ".dxf" Then s = Left(s, Len(s) - 4)
	If LCase(Left(s, 7)) = "smpart-" Then s = Mid(s, 8)
	i = InStrRev(s, "_")
	If i > 1 Then s = Left(s, i - 1)
	PartNameFromDxf = s
End Function

Function JsStr(s)
	s = Replace(s, "\", "\\")
	s = Replace(s, """", "\""")
	JsStr = """" & s & """"
End Function

Function ParseDxfFile(path)
	Dim ts, code, val, ent, xs, ys, rings
	Set ts = fso.OpenTextFile(path, 1)
	ent = ""
	xs = ""
	ys = ""
	rings = ""
	Do While Not ts.AtEndOfStream
		code = Trim(ts.ReadLine)
		If ts.AtEndOfStream Then Exit Do
		val = ts.ReadLine
		If code = "0" Then
			If (ent = "LWPOLYLINE" Or ent = "POLYLINE") And xs <> "" Then
				rings = rings & RingCsv(xs, ys) & vbTab
			End If
			ent = UCase(Trim(val))
			xs = ""
			ys = ""
		ElseIf ent = "LWPOLYLINE" Or ent = "POLYLINE" Then
			If code = "10" Then
				xs = xs & CStr(CDbl(Replace(val, ",", "."))) & ","
			ElseIf code = "20" Then
				ys = ys & CStr(CDbl(Replace(val, ",", "."))) & ","
			End If
		End If
	Loop
	ts.Close
	If (ent = "LWPOLYLINE" Or ent = "POLYLINE") And xs <> "" Then
		rings = rings & RingCsv(xs, ys) & vbTab
	End If
	If rings = "" Then
		ParseDxfFile = ""
		Exit Function
	End If
	Dim arr, i, a, area, best
	best = ""
	area = -1
	arr = Split(rings, vbTab)
	For i = 0 To UBound(arr)
		If arr(i) <> "" Then
			a = RingArea(arr(i))
			If a > area Then
				area = a
				best = arr(i)
			End If
		End If
	Next
	If best = "" Then
		ParseDxfFile = ""
	Else
		ParseDxfFile = "{""outer"":" & best & ",""inner"":[]}"
	End If
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
