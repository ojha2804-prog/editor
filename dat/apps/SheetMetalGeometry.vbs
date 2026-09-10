' SheetMetalGeometry.vbs
' After SWOOD writes smpart-*.dxf (that file is the Front VIEW, not the
' unfold). This script exports ONE real SolidWorks flat-pattern DXF for
' the part that was just written, then builds db\sheetmetal-geometry.js
' so Sheetmetal Layout can draw the actual blank.
'
' One part per start — never walk the assembly and re-export everyone
' (that was the 12×12 blink / Generate hang).
' Never ExitApp, never CloseDoc, never start launcher.exe, never Sleep.

Option Explicit

Const VERSION = "6.18.9-flat-pattern"
Const PTOL = 0.05
Const swDocPART = 1
Const swDocASSEMBLY = 2
Const swExportSheetMetal = 2
Const swSMOptGeometry = 1

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
If Not fso.FolderExists(dxfDir) Then fso.CreateFolder dxfDir
logPath = fso.BuildPath(dbDir, "sheetmetal-geometry.log")
outPath = fso.BuildPath(dbDir, "sheetmetal-geometry.js")

Log "started " & VERSION & " (one flat pattern, then parse DXF)"
Log "  report = " & reportPath

Dim newest
Set newest = NewestSmpart(dxfDir)
If Not newest Is Nothing Then
	ExportOneFlat newest
Else
	Log "  no new smpart DXF — parse whatever flat-/smpart- files exist"
End If

Dim js, count
count = BuildGeometryJs(dxfDir, js)
WriteText outPath, js
Log "FINISHED - " & count & " flat-pattern outline(s) for Layout"
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

Function IsSmpart(fname)
	IsSmpart = (LCase(Left(fname, 7)) = "smpart-" And LCase(fso.GetExtensionName(fname)) = "dxf")
End Function

Function IsFlat(fname)
	IsFlat = (LCase(Left(fname, 5)) = "flat-" And LCase(fso.GetExtensionName(fname)) = "dxf")
End Function

Function NewestSmpart(folder)
	Dim f, best
	Set best = Nothing
	If Not fso.FolderExists(folder) Then
		Set NewestSmpart = Nothing
		Exit Function
	End If
	For Each f In fso.GetFolder(folder).Files
		If IsSmpart(f.Name) Then
			If best Is Nothing Then
				Set best = f
			ElseIf f.DateLastModified > best.DateLastModified Then
				Set best = f
			ElseIf f.DateLastModified = best.DateLastModified And f.Size >= best.Size Then
				Set best = f
			End If
		End If
	Next
	Set NewestSmpart = best
End Function

Sub ExportOneFlat(smpartFile)
	Dim partName, dest, swApp, part, ok, modelName
	partName = PartNameFromDxf(smpartFile.Name)
	dest = fso.BuildPath(dxfDir, "flat-" & SafeFile(partName) & "_Default.dxf")
	Log "  newest smpart = " & smpartFile.Name
	Log "  export one flat pattern → " & fso.GetFileName(dest)

	On Error Resume Next
	Set swApp = GetObject(, "SldWorks.Application")
	If swApp Is Nothing Or Err.Number <> 0 Then
		Log "  SOLIDWORKS not available — Layout will use existing DXFs"
		Err.Clear
		On Error GoTo 0
		Exit Sub
	End If
	Err.Clear
	Set part = FindOnePart(swApp, partName)
	If part Is Nothing Then
		Log "  part not found in the open documents: " & partName
		On Error GoTo 0
		Exit Sub
	End If
	modelName = part.GetPathName
	If modelName = "" Then modelName = part.GetTitle
	ok = part.ExportToDWG2(dest, modelName, swExportSheetMetal, False, Empty, False, False, swSMOptGeometry, Empty)
	If Err.Number <> 0 Then
		Log "  ExportToDWG2 error " & Err.Number & " " & Err.Description
		Err.Clear
		ok = False
	End If
	On Error GoTo 0
	If ok Then
		Log "  flat pattern written"
	Else
		Log "  ExportToDWG2 returned false — parser will try the Front DXF"
	End If
End Sub

Function FindOnePart(swApp, partName)
	Dim doc, docs, i, n, t, comp, comps, path, opened, errs, warns
	Set FindOnePart = Nothing
	On Error Resume Next
	Set doc = swApp.ActiveDoc
	If Not doc Is Nothing Then
		If doc.GetType = swDocPART Then
			If NamesMatch(doc.GetTitle, partName) Or NamesMatch(doc.GetPathName, partName) Then
				Set FindOnePart = doc
				On Error GoTo 0
				Exit Function
			End If
		End If
	End If

	n = swApp.GetDocumentCount
	docs = swApp.GetDocuments
	If IsArray(docs) Then
		For i = LBound(docs) To UBound(docs)
			Set doc = docs(i)
			If Not doc Is Nothing Then
				If doc.GetType = swDocPART Then
					If NamesMatch(doc.GetTitle, partName) Or NamesMatch(doc.GetPathName, partName) Then
						Set FindOnePart = doc
						On Error GoTo 0
						Exit Function
					End If
				End If
			End If
		Next
	End If

	Set doc = swApp.ActiveDoc
	If doc Is Nothing Then
		On Error GoTo 0
		Exit Function
	End If
	If doc.GetType <> swDocASSEMBLY Then
		On Error GoTo 0
		Exit Function
	End If

	comps = doc.GetComponents(False)
	If Not IsArray(comps) Then
		On Error GoTo 0
		Exit Function
	End If
	For i = LBound(comps) To UBound(comps)
		Set comp = comps(i)
		If Not comp Is Nothing Then
			If NamesMatch(comp.Name2, partName) Or NamesMatch(comp.GetPathName, partName) Then
				Set opened = comp.GetModelDoc2
				If opened Is Nothing Then
					path = comp.GetPathName
					If path <> "" Then
						errs = 0: warns = 0
						Set opened = swApp.OpenDoc6(path, swDocPART, 1, "", errs, warns)
					End If
				End If
				If Not opened Is Nothing Then
					Set FindOnePart = opened
					On Error GoTo 0
					Exit Function
				End If
			End If
		End If
	Next
	On Error GoTo 0
End Function

Function NamesMatch(a, b)
	Dim x, y
	x = NormName(a)
	y = NormName(b)
	If x = "" Or y = "" Then
		NamesMatch = False
	ElseIf x = y Then
		NamesMatch = True
	ElseIf InStr(1, x, y, 1) > 0 Then
		NamesMatch = True
	ElseIf InStr(1, y, x, 1) > 0 Then
		NamesMatch = True
	Else
		NamesMatch = False
	End If
End Function

Function NormName(s)
	Dim r, i
	r = LCase(Trim(CStr(s)))
	i = InStrRev(r, "\")
	If i > 0 Then r = Mid(r, i + 1)
	i = InStrRev(r, "/")
	If i > 0 Then r = Mid(r, i + 1)
	If Right(r, 7) = ".sldprt" Then r = Left(r, Len(r) - 7)
	If Right(r, 7) = ".sldasm" Then r = Left(r, Len(r) - 7)
	If Left(r, 8) = "copy of " Then r = Mid(r, 9)
	If Right(r, 8) = "_default" Then r = Left(r, Len(r) - 8)
	r = Replace(r, "_", " ")
	r = Replace(r, "-", " ")
	Do While InStr(r, "  ") > 0
		r = Replace(r, "  ", " ")
	Loop
	NormName = Trim(r)
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

Function BuildGeometryJs(folder, ByRef js)
	Dim f, name, geom, n, parts, seen
	n = 0
	parts = ""
	Set seen = CreateObject("Scripting.Dictionary")
	' Prefer real flat-*.dxf over Front-view smpart-*.dxf
	For Each f In fso.GetFolder(folder).Files
		If IsFlat(f.Name) Then
			n = n + AddGeom(f, parts, seen)
		End If
	Next
	For Each f In fso.GetFolder(folder).Files
		If IsSmpart(f.Name) Then
			n = n + AddGeom(f, parts, seen)
		End If
	Next
	js = "/* sheet-metal flat patterns for Layout — one ExportToDWG2 per part */" & vbCrLf & _
		"window.sheetMetalGeometry = {" & vbCrLf & parts & vbCrLf & "};" & vbCrLf
	BuildGeometryJs = n
End Function

Function AddGeom(f, ByRef parts, seen)
	Dim name, alias, geom
	AddGeom = 0
	name = PartNameFromDxf(f.Name)
	If seen.Exists(LCase(name)) Then Exit Function
	geom = ParseDxfFile(f.Path)
	If geom = "" Then
		Log "  no outline in " & f.Name
		Exit Function
	End If
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
	Log "  outline " & f.Name
	AddGeom = 1
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
