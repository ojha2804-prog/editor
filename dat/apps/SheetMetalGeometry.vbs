' SheetMetalGeometry.vbs
' Called by Report.cfg [DXF_SHEETMETAL_PART] after EACH flat-pattern DXF.
'
' Layout needs those DXFs. Do not turn AUTOPROCESS off.
'
' SWOOD writes the DXF (opens that part once). This script must return
' immediately — SWOOD will not write the next DXF until we exit.
' MUST NOT attach to SOLIDWORKS. MUST NOT start launcher.exe.
'
' Reads dxfs\smpart-*.dxf and dxfs\flat-*.dxf (LWPOLYLINE or LINE)
' and overwrites db\sheetmetal-geometry.js. Last part has the full set.

Option Explicit

Const VERSION = "6.18.8-dxf-layout"
Const PTOL = 0.05

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
nDxf = CountSmDxf(dxfDir)
Log "  sheet-metal DXFs = " & nDxf

If nDxf = 0 Then
	Log "no smpart-/flat- DXF — nothing to write"
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

Function IsSmDxf(fname)
	Dim n, ext
	n = LCase(fname)
	ext = LCase(fso.GetExtensionName(fname))
	If ext <> "dxf" Then
		IsSmDxf = False
	ElseIf Left(n, 7) = "smpart-" Or Left(n, 5) = "flat-" Then
		IsSmDxf = True
	Else
		IsSmDxf = False
	End If
End Function

Function CountSmDxf(folder)
	Dim f, n
	n = 0
	If Not fso.FolderExists(folder) Then
		CountSmDxf = 0
		Exit Function
	End If
	For Each f In fso.GetFolder(folder).Files
		If IsSmDxf(f.Name) Then n = n + 1
	Next
	CountSmDxf = n
End Function

Function BuildGeometryJs(folder, ByRef js)
	Dim f, name, geom, n, parts
	n = 0
	parts = ""
	For Each f In fso.GetFolder(folder).Files
		If IsSmDxf(f.Name) Then
			name = PartNameFromDxf(f.Name)
			geom = ParseDxfFile(f.Path)
			If geom <> "" Then
				If parts <> "" Then parts = parts & "," & vbCrLf
				parts = parts & "  " & JsStr(name) & ": " & geom
				n = n + 1
				Log "  DXF " & f.Name
			Else
				Log "  no outline in " & f.Name
			End If
		End If
	Next
	js = "/* built from sheet-metal DXFs — SOLIDWORKS was not attached */" & vbCrLf & _
		"window.sheetMetalGeometry = {" & vbCrLf & parts & vbCrLf & "};" & vbCrLf
	BuildGeometryJs = n
End Function

Function PartNameFromDxf(fname)
	Dim s, i
	s = fname
	If LCase(Right(s, 4)) = ".dxf" Then s = Left(s, Len(s) - 4)
	If LCase(Left(s, 7)) = "smpart-" Then
		s = Mid(s, 8)
	ElseIf LCase(Left(s, 5)) = "flat-" Then
		s = Mid(s, 6)
	End If
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
	Dim ts, code, val, ent, xs, ys, rings, segs
	Dim x10, y20, x11, y21, has10, has20, has11, has21
	Set ts = fso.OpenTextFile(path, 1)
	ent = ""
	xs = ""
	ys = ""
	rings = ""
	segs = ""
	has10 = False: has20 = False: has11 = False: has21 = False
	Do While Not ts.AtEndOfStream
		code = Trim(ts.ReadLine)
		If ts.AtEndOfStream Then Exit Do
		val = ts.ReadLine
		If code = "0" Then
			If (ent = "LWPOLYLINE" Or ent = "POLYLINE") And xs <> "" Then
				rings = rings & RingCsv(xs, ys) & vbTab
			End If
			If ent = "LINE" And has10 And has20 And has11 And has21 Then
				segs = segs & CStr(x10) & "," & CStr(y20) & "," & CStr(x11) & "," & CStr(y21) & ";"
			End If
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
	If (ent = "LWPOLYLINE" Or ent = "POLYLINE") And xs <> "" Then
		rings = rings & RingCsv(xs, ys) & vbTab
	End If
	If ent = "LINE" And has10 And has20 And has11 And has21 Then
		segs = segs & CStr(x10) & "," & CStr(y20) & "," & CStr(x11) & "," & CStr(y21) & ";"
	End If
	If rings = "" And segs <> "" Then rings = ChainLines(segs)
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
				If (closed And pc >= 3) Or pc >= 3 Then
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
