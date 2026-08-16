' ============================================================================
'  ExportFlatPatternDXF
'  Batch-exports the TRUE flat pattern of every sheet metal part in the active
'  assembly (or the active part) as DXF, ready for laser cutting.
'
'  NOTE: Do NOT paste "Attribute VB_Name = ..." into SolidWorks Module1 —
'  that line causes a compile error. Tools > Macro > New, delete the default
'  text, paste this file from the header comments downward, then F5.
'
'  WHY THIS EXISTS
'  ---------------
'  SWOOD cannot do this. Its DXF exporter only handles PANEL (a woodworking
'  panel outline) and PROGRAM (a nesting sheet) - there is no part flat-pattern
'  DXF capability in it at all, which is why dxfs\sheetmetal stays empty no
'  matter what goes in Report.cfg. Flat pattern export is a SOLIDWORKS sheet
'  metal function, so it has to be driven through the SOLIDWORKS API.
'
'  This produces geometry identical to right-click > Export to DXF/DWG >
'  Sheet Metal / Flat pattern, just for every part in one pass.
'
'  IT DOES NOT MODIFY YOUR MODEL. SOLIDWORKS flattens internally for the
'  export, so Flat-Pattern can stay suppressed and your assembly keeps showing
'  folded parts. Nothing is unsuppressed, nothing is saved.
'
'  HOW TO RUN
'  ----------
'   1. Open Assem2.SLDASM in SOLIDWORKS.
'   2. Tools > Macro > New...  save as ExportFlatPatternDXF.swp
'   3. Delete whatever is in the editor, paste this whole file in.
'   4. The newest report folder under REPORTS_ROOT is found automatically.
'   5. Press F5.
'
'  Output name matches the report's own convention: <PartName>_<Config>.dxf
'  e.g. Part4^Assem2_Default.dxf
' ============================================================================

Option Explicit

' ---- Where SWOOD writes its reports ----------------------------------------
' The macro finds the NEWEST report folder for the active assembly underneath
' this root by itself, so there is nothing to edit after each generation.
Const REPORTS_ROOT As String = "C:\Swood Reports"

' Open the report in the browser when the export finishes. Set False if you
' would rather it stayed silent.
Const OPEN_REPORT_WHEN_DONE As Boolean = True

' ---- NESTING -------------------------------------------------------------
' Stock sheets you carry, mm. EVERY sheet listed is tried for every part and
' the cheapest is used, judged on stock area consumed per blank - not on
' blanks-per-sheet (which always flatters the bigger sheet) and not on
' utilisation percentage (a ratio that hides how much sheet you bought).
'
' Worked example with the 818.5 x 418.5 blank, 20 off:
'     2500 x 1250 ->  6 per sheet -> 4 sheets -> 12.50 m2   <- cheaper
'     3000 x 1500 ->  9 per sheet -> 3 sheets -> 13.50 m2
' Fewer sheets, but a square metre more steel bought.
'
' TO ADD OR REMOVE A SHEET: edit SheetLengths and SheetWidths at the BOTTOM of
' this file, keep them the same length, and set NEST_SHEET_COUNT to match.
' To force one size only, leave a single entry in each.
'
' They live at the bottom because VBA requires every module-level Const and
' Dim to appear before the first procedure - a Function here makes everything
' after it a compile error.
Const NEST_SHEET_COUNT As Long = 2

' Gap BETWEEN blanks, mm: kerf plus the separation a laser needs so heat from
' one cut does not bleed into the neighbouring part.
Const NEST_GAP As Double = 5

' Unusable border around the sheet, mm: clamp zone and edge trim.
Const NEST_MARGIN As Double = 10

' Allow a blank to turn 90 degrees to fit more per sheet. Set False if the
' material is directional - brushed finish, grain, or a coating with a lay.
Const NEST_ALLOW_ROTATION As Boolean = True

'  Keep these in step with the SHEETS / PART_GAP / SHEET_MARGIN block in
'  assets\js\sheetmetal-nest.js (loaded by sheetmetal-client.js), or the
'  printed table and the drawing on the same page will quote different numbers.
' --------------------------------------------------------------------------


' ---- What to put in the DXF (swSheetMetalOptions_e bitmask) ----------------
'   1  = geometry (the outline - always keep this)
'   2  = hidden edges
'   4  = bend lines
'   8  = sketches
'  64  = forming tools
' 2048 = bounding box
' 1 + 4 + 64 = 69: outline, bend lines and forming tools. Bend lines usually
' go on their own layer so the laser ignores them - drop to 1 if your cutting
' software chokes on the extra entities.
Const SM_OPTIONS As Long = 69

Dim swApp As Object
Dim OUTPUT_FOLDER As String
Dim REPORT_FOLDER As String
Dim nExported As Long
Dim nSkipped As Long
Dim sLog As String
Dim dictDone As Object

Sub main()

    Set swApp = Application.SldWorks
    Set dictDone = CreateObject("Scripting.Dictionary")
    nExported = 0
    nSkipped = 0
    sLog = ""

    Dim swModel As Object
    Set swModel = swApp.ActiveDoc

    If swModel Is Nothing Then
        MsgBox "Open the assembly (or a sheet metal part) first, then run again.", vbExclamation
        Exit Sub
    End If

    ' Locate the newest report folder for this assembly, e.g.
    '   C:\Swood Reports\2026_08\Assem2
    REPORT_FOLDER = FindNewestReport(BaseName(swModel.GetTitle))

    If Len(REPORT_FOLDER) = 0 Then
        MsgBox "No generated report folder found." & vbCrLf & vbCrLf & _
               "Looked for a folder named:  " & BaseName(swModel.GetTitle) & vbCrLf & _
               "Under:  " & REPORTS_ROOT & "\<YYYY_MM>\" & vbCrLf & vbCrLf & _
               "Raw document title: " & swModel.GetTitle & vbCrLf & vbCrLf & _
               "If that folder name looks wrong, tell me what it should be." & vbCrLf & _
               "If it looks right, generate the SWOOD report first.", vbExclamation
        Exit Sub
    End If

    OUTPUT_FOLDER = REPORT_FOLDER & "\dxfs\sheetmetal"

    If Not EnsureFolder(OUTPUT_FOLDER) Then
        MsgBox "Could not create or reach:" & vbCrLf & OUTPUT_FOLDER, vbCritical
        Exit Sub
    End If

    Select Case swModel.GetType
        Case 1  ' swDocPART
            ExportOne swModel

        Case 2  ' swDocASSEMBLY
            Dim swConf As Object, swRoot As Object
            Set swConf = swModel.GetActiveConfiguration
            Set swRoot = swConf.GetRootComponent3(True)
            TraverseComponents swRoot

        Case Else
            MsgBox "Run this on a part or an assembly, not a drawing.", vbExclamation
            Exit Sub
    End Select

    Dim sMsg As String
    sMsg = "Flat pattern DXF export finished." & vbCrLf & vbCrLf & _
           "Exported : " & nExported & vbCrLf & _
           "Skipped  : " & nSkipped & "  (not sheet metal, or no flat pattern)" & vbCrLf & vbCrLf & _
           "Folder:" & vbCrLf & OUTPUT_FOLDER

    If Len(sLog) > 0 Then sMsg = sMsg & vbCrLf & vbCrLf & "Detail:" & vbCrLf & sLog

    If nExported = 0 Then
        sMsg = sMsg & vbCrLf & vbCrLf & _
          "Nothing exported. Usual causes:" & vbCrLf & _
          " - the part has no sheet metal features (it is solid/imported geometry)" & vbCrLf & _
          " - the sheet metal body cannot be flattened (check for a failed bend)" & vbCrLf & _
          "Test one part by hand: right-click it > Export to DXF/DWG >" & vbCrLf & _
          "Sheet Metal / Flat pattern. If that fails too, the problem is the model."
    End If

    MsgBox sMsg, vbInformation, "ExportFlatPatternDXF"

    If OPEN_REPORT_WHEN_DONE And nExported > 0 Then
        Dim sIndex As String
        sIndex = REPORT_FOLDER & "\index.html"
        If CreateObject("Scripting.FileSystemObject").FileExists(sIndex) Then
            CreateObject("WScript.Shell").Run """" & sIndex & """", 1, False
        End If
    End If

End Sub


' --- find the newest report folder for this document ------------------------
'  SWOOD writes to <root>\<YYYY_MM>\<DocName>. Rather than hard-coding a month
'  that goes stale, scan every month folder and keep the most recently written
'  match, so the macro keeps working next month without an edit.
Function FindNewestReport(sDocName As String) As String

    Dim fso As Object, rootF As Object, monthF As Object, projF As Object
    Dim sBest As String, dBest As Date

    Set fso = CreateObject("Scripting.FileSystemObject")
    sBest = ""

    If Not fso.FolderExists(REPORTS_ROOT) Then
        FindNewestReport = ""
        Exit Function
    End If

    Set rootF = fso.GetFolder(REPORTS_ROOT)

    On Error Resume Next
    For Each monthF In rootF.SubFolders
        For Each projF In monthF.SubFolders
            If LCase(projF.Name) = LCase(sDocName) Then
                If sBest = "" Or projF.DateLastModified > dBest Then
                    sBest = projF.Path
                    dBest = projF.DateLastModified
                End If
            End If
        Next
    Next
    On Error GoTo 0

    FindNewestReport = sBest

End Function


' --- walk the assembly tree, including subassemblies ------------------------
'  Each child is visited EXACTLY ONCE.
'
'  The previous version recursed into a subassembly inside the If, and then
'  recursed into the same child again after it - two traversals per node,
'  2^depth overall. On a nested assembly that exhausts memory and takes
'  SOLIDWORKS down with it. If you have that version saved anywhere, delete it.
Sub TraverseComponents(swComp As Object)

    Dim vChildren As Variant
    vChildren = swComp.GetChildren
    If IsEmpty(vChildren) Then Exit Sub
    If Not IsArray(vChildren) Then Exit Sub

    Dim i As Long
    For i = 0 To UBound(vChildren)

        Dim swChild As Object
        Set swChild = vChildren(i)

        ' GetSuppression = 0 means suppressed - no ModelDoc, nothing to do.
        If swChild.GetSuppression <> 0 Then

            Dim swChildModel As Object
            Set swChildModel = Nothing
            On Error Resume Next
            Set swChildModel = swChild.GetModelDoc2
            On Error GoTo 0

            If Not swChildModel Is Nothing Then
                If swChildModel.GetType = 1 Then
                    ' Part: export it. A part has no children, so stop here.
                    ExportOne swChildModel
                ElseIf swChildModel.GetType = 2 Then
                    ' Subassembly: descend once.
                    TraverseComponents swChild
                End If
            End If

        End If

    Next i

End Sub


' --- export one part, if it is sheet metal ---------------------------------
Sub ExportOne(swModel As Object)

    Dim sName As String, sConf As String, sKey As String
    sName = BaseName(swModel.GetTitle)
    sConf = swModel.ConfigurationManager.ActiveConfiguration.Name
    sKey = sName & "|" & sConf

    ' An assembly reuses the same part many times - export it once.
    If dictDone.Exists(sKey) Then Exit Sub
    dictDone.Add sKey, True

    If Not IsSheetMetal(swModel) Then
        nSkipped = nSkipped + 1
        Exit Sub
    End If

    Dim sOut As String
    sOut = OUTPUT_FOLDER & "\" & SafeFileName(sName) & "_" & SafeFileName(sConf) & ".dxf"

    ' Two different APIs can write a flat pattern DXF, and which one a given
    ' build exposes varies. ExportToDWG2 returned error 438 ("object doesn't
    ' support this property or method") here, so try the purpose-built
    ' PartDoc method first and keep ExportToDWG2 as the fallback.
    Dim bRet As Boolean
    bRet = False

    If TryExportFlatPatternView(swModel, sOut, sName) Then
        bRet = True
    ElseIf TryExportToDWG2(swModel, sOut, sName) Then
        bRet = True
    End If

    ' Trust the file on disk, not the return value - some builds report
    ' success without writing, and some write while reporting False.
    If Not FileThere(sOut) Then bRet = False

    If bRet Then
        nExported = nExported + 1
        sLog = sLog & " + " & SafeFileName(sName) & "_" & SafeFileName(sConf) & ".dxf" & vbCrLf
        BuildNestSVG sOut, SafeFileName(sName) & "_" & SafeFileName(sConf)
    Else
        nSkipped = nSkipped + 1
        sLog = sLog & " ! " & sName & " - no DXF written by either method" & vbCrLf
    End If

End Sub


' --- method A: PartDoc.ExportFlatPatternView -------------------------------
'  The API built specifically for this job. Two arguments instead of nine, so
'  far less to go wrong through late binding, and it does not need the part to
'  be the active document.
'
'  Options bitmask (swExportFlatPatternViewOptions_e):
'     0 = geometry only
'     1 = include bend lines
'     4 = include sketches
'  1 is used here so bend lines come through on their own layer.
Function TryExportFlatPatternView(swModel As Object, sOut As String, sName As String) As Boolean

    Dim bOK As Boolean
    bOK = False

    On Error Resume Next
    swModel.ExportFlatPatternView sOut, 1
    If Err.Number <> 0 Then
        sLog = sLog & "   . " & sName & " - ExportFlatPatternView: " & Err.Description & vbCrLf
        Err.Clear
    Else
        bOK = True
    End If
    On Error GoTo 0

    If bOK And Not FileThere(sOut) Then
        sLog = sLog & "   . " & sName & " - ExportFlatPatternView ran but wrote no file" & vbCrLf
        bOK = False
    End If

    TryExportFlatPatternView = bOK

End Function


' --- method B: ModelDocExtension.ExportToDWG2 ------------------------------
'  The nine-argument general exporter. Alignment is passed as a Variant
'  holding a 12-element array; several builds reject a typed Double array
'  through late binding, which is a likely cause of the 438 seen earlier.
Function TryExportToDWG2(swModel As Object, sOut As String, sName As String) As Boolean

    Dim bRet As Boolean, vAlign As Variant, swExt As Object
    bRet = False

    vAlign = Array(0#, 0#, 0#, 1#, 0#, 0#, 0#, 1#, 0#, 0#, 0#, 1#)

    On Error Resume Next
    Set swExt = swModel.Extension
    If swExt Is Nothing Then
        sLog = sLog & "   . " & sName & " - no ModelDocExtension" & vbCrLf
        Err.Clear
        On Error GoTo 0
        TryExportToDWG2 = False
        Exit Function
    End If

    ' arg 3 = 1 -> swExportToDWG_ExportSheetMetal (the flat pattern)
    bRet = swExt.ExportToDWG2(sOut, swModel.GetPathName, 1, True, _
                              vAlign, False, False, SM_OPTIONS, Empty)
    If Err.Number <> 0 Then
        sLog = sLog & "   . " & sName & " - ExportToDWG2: " & Err.Description & vbCrLf
        Err.Clear
        bRet = False
    End If
    On Error GoTo 0

    TryExportToDWG2 = bRet

End Function


Function FileThere(sPath As String) As Boolean
    On Error Resume Next
    FileThere = CreateObject("Scripting.FileSystemObject").FileExists(sPath)
    On Error GoTo 0
End Function


' --- does this part actually have sheet metal features? --------------------
Function IsSheetMetal(swModel As Object) As Boolean

    IsSheetMetal = False
    If swModel Is Nothing Then Exit Function
    If swModel.GetType <> 1 Then Exit Function

    Dim swFeat As Object
    Set swFeat = swModel.FirstFeature

    Do While Not swFeat Is Nothing
        Select Case swFeat.GetTypeName2
            Case "SheetMetal", "FlatPattern", "SMBaseFlange", "SolidToSheetMetal", _
                 "SMMiteredFlange", "EdgeFlange", "SketchBend", "OneBend"
                IsSheetMetal = True
                Exit Function
        End Select
        Set swFeat = swFeat.GetNextFeature
    Loop

End Function


' --- helpers ---------------------------------------------------------------
' Strip any SOLIDWORKS extension. GetTitle returns the name WITH extension
' when Windows is set to show file extensions, and WITHOUT when it is not -
' so both have to be handled. Only .sldprt was stripped before, which made an
' assembly come through as "Assem2.SLDASM" and match no report folder.
Function BaseName(s As String) As String
    Dim t As String, exts As Variant, i As Long, p As Long
    t = Trim(s)
    exts = Array(".sldprt", ".sldasm", ".slddrw")
    For i = 0 To UBound(exts)
        p = InStrRev(LCase(t), CStr(exts(i)))
        If p > 0 Then
            If p = Len(t) - Len(CStr(exts(i))) + 1 Then
                t = Left(t, p - 1)
                Exit For
            End If
        End If
    Next i
    BaseName = Trim(t)
End Function

Function SafeFileName(s As String) As String
    Dim t As String, i As Long
    Dim bad As Variant
    t = s
    bad = Array("\", "/", ":", "*", "?", """", "<", ">", "|")
    For i = 0 To UBound(bad)
        t = Replace(t, CStr(bad(i)), "-")
    Next i
    SafeFileName = Trim(t)
End Function

Function EnsureFolder(sPath As String) As Boolean
    Dim fso As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    On Error Resume Next
    If Not fso.FolderExists(sPath) Then
        Dim parts As Variant, i As Long, sBuild As String
        parts = Split(sPath, "\")
        sBuild = parts(0)
        For i = 1 To UBound(parts)
            sBuild = sBuild & "\" & parts(i)
            If Not fso.FolderExists(sBuild) Then fso.CreateFolder sBuild
        Next i
    End If
    EnsureFolder = fso.FolderExists(sPath)
    On Error GoTo 0
End Function


' ===========================================================================
'  DXF -> nesting SVG
'
'  Reads the flat pattern DXF just exported, grid-nests the TRUE outline onto
'  a stock sheet, and writes an SVG to <report>\images\sheetmetal so the
'  Sheetmetal Nesting page can show real part shapes instead of rectangles.
'
'  SVG rather than injecting geometry into the report's data: the report runs
'  from file://, where the browser refuses to let its JavaScript read a .dxf
'  off disk. An SVG file on disk sidesteps that entirely - it is displayed by
'  the same image formatter that already renders the part thumbnail.
'
'  Entity coverage: LINE, ARC, CIRCLE, LWPOLYLINE (bulges included). That is
'  everything SOLIDWORKS emits for a flat pattern outline. Anything else is
'  ignored rather than guessed at, and noted in the log.
' ===========================================================================



Sub BuildNestSVG(sDxfPath As String, sBaseName As String)

    Dim sGeom As String, minX As Double, minY As Double, maxX As Double, maxY As Double
    sGeom = ParseDXF(sDxfPath, minX, minY, maxX, maxY)

    If Len(sGeom) = 0 Then
        sLog = sLog & "   . " & sBaseName & " - no drawable geometry found in DXF" & vbCrLf
        Exit Sub
    End If

    Dim pw As Double, ph As Double
    pw = maxX - minX
    ph = maxY - minY
    If pw <= 0 Or ph <= 0 Then Exit Sub

    ' --- try every stock sheet, keep the best ------------------------------
    ' Ranked on material consumed per blank - sheet area divided by how many
    ' blanks come off it. That is the per-part cost of steel, and it is the
    ' only measure that answers "which stock is cheaper for this part".
    ' Raw blanks-per-sheet would always favour the bigger sheet; utilisation
    ' percentage is a ratio that hides how much sheet was bought.
    Dim vL As Variant, vW As Variant
    vL = SheetLengths()
    vW = SheetWidths()

    Dim iBest As Long, bestUtil As Double, bestAreaPer As Double
    Dim bestCols As Long, bestRows As Long, bestRot As Boolean
    Dim k As Long

    iBest = -1
    bestUtil = -1
    bestAreaPer = 1E+30

    For k = 0 To NEST_SHEET_COUNT - 1

        Dim sL As Double, sW As Double, iL As Double, iW As Double
        sL = CDbl(vL(k)) : sW = CDbl(vW(k))
        iL = sL - 2 * NEST_MARGIN
        iW = sW - 2 * NEST_MARGIN

        Dim cA As Long, rA As Long, cB As Long, rB As Long
        cA = SafeDiv(iL, pw) : rA = SafeDiv(iW, ph)
        cB = SafeDiv(iL, ph) : rB = SafeDiv(iW, pw)

        If Not NEST_ALLOW_ROTATION Then
            cB = 0 : rB = 0
        End If

        Dim rot As Boolean, cols As Long, rows As Long
        rot = (cB * rB) > (cA * rA)
        If rot Then
            cols = cB : rows = rB
        Else
            cols = cA : rows = rA
        End If

        If cols >= 1 And rows >= 1 Then
            Dim areaPer As Double
            areaPer = (sL * sW) / (cols * rows)   ' mm2 of stock per blank - lower is better
            If iBest < 0 Or areaPer < bestAreaPer Then
                bestAreaPer = areaPer
                bestUtil = (cols * rows * pw * ph) / (sL * sW) * 100
                iBest = k
                bestCols = cols
                bestRows = rows
                bestRot = rot
            End If
        End If

    Next k

    If iBest < 0 Then
        sLog = sLog & "   . " & sBaseName & " - blank (" & Fmt(pw) & " x " & Fmt(ph) & _
               ") does not fit any stock sheet" & vbCrLf
        Exit Sub
    End If

    Dim SHEET_L As Double, SHEET_W As Double
    SHEET_L = CDbl(vL(iBest))
    SHEET_W = CDbl(vW(iBest))

    Dim innerL As Double, innerW As Double
    innerL = SHEET_L - 2 * NEST_MARGIN
    innerW = SHEET_W - 2 * NEST_MARGIN

    ' --- draw it -----------------------------------------------------------
    Dim sSVG As String, r As Long, c As Long, ox As Double, oy As Double
    Dim stepX As Double, stepY As Double

    If bestRot Then
        stepX = ph + NEST_GAP : stepY = pw + NEST_GAP
    Else
        stepX = pw + NEST_GAP : stepY = ph + NEST_GAP
    End If

    sSVG = "<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 " & _
           Fmt(SHEET_L) & " " & Fmt(SHEET_W) & """ width=""100%"">" & vbCrLf
    sSVG = sSVG & "<rect x=""0"" y=""0"" width=""" & Fmt(SHEET_L) & """ height=""" & _
           Fmt(SHEET_W) & """ fill=""#fff"" stroke=""#333"" stroke-width=""3""/>" & vbCrLf
    sSVG = sSVG & "<rect x=""" & Fmt(NEST_MARGIN) & """ y=""" & Fmt(NEST_MARGIN) & _
           """ width=""" & Fmt(innerL) & """ height=""" & Fmt(innerW) & _
           """ fill=""none"" stroke=""#bbb"" stroke-width=""1"" stroke-dasharray=""12,8""/>" & vbCrLf

    For r = 0 To bestRows - 1
        For c = 0 To bestCols - 1
            ox = NEST_MARGIN + c * stepX
            oy = NEST_MARGIN + r * stepY

            sSVG = sSVG & "<g transform=""translate(" & Fmt(ox) & "," & Fmt(oy) & ")"
            If bestRot Then sSVG = sSVG & " rotate(90) translate(0," & Fmt(-ph) & ")"
            sSVG = sSVG & """>" & vbCrLf
            sSVG = sSVG & "<g transform=""translate(" & Fmt(-minX) & "," & Fmt(-minY) & ")"" " & _
                   "fill=""#c7d2fe"" fill-opacity=""0.75"" stroke=""#3730a3"" stroke-width=""2"">" & vbCrLf
            sSVG = sSVG & sGeom
            sSVG = sSVG & "</g></g>" & vbCrLf
        Next c
    Next r

    ' Caption: which stock was chosen, so the drawing is self-explaining when
    ' two parts on the same page ended up on different sheets.
    sSVG = sSVG & "<text x=""" & Fmt(NEST_MARGIN) & """ y=""" & Fmt(SHEET_W - 14) & _
           """ font-family=""sans-serif"" font-size=""34"" fill=""#555"">" & _
           Fmt(SHEET_L) & " x " & Fmt(SHEET_W) & " mm  -  " & (bestCols * bestRows) & _
           " per sheet  -  " & Format$(bestUtil, "0.0") & "% used" & _
           IIf(bestRot, "  -  rotated 90", "") & "</text>" & vbCrLf

    sSVG = sSVG & "</svg>" & vbCrLf

    Dim sImgDir As String, sOutSVG As String
    sImgDir = REPORT_FOLDER & "\images\sheetmetal"
    EnsureFolder sImgDir
    sOutSVG = sImgDir & "\nest-" & sBaseName & ".svg"

    On Error Resume Next
    Dim fso As Object, f As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    Set f = fso.CreateTextFile(sOutSVG, True)
    f.Write sSVG
    f.Close
    On Error GoTo 0

    sLog = sLog & "   > nest-" & sBaseName & ".svg  (" & Fmt(SHEET_L) & "x" & Fmt(SHEET_W) & _
           ", " & (bestCols * bestRows) & " per sheet, " & Format$(bestUtil, "0.0") & "%" & _
           IIf(bestRot, ", rotated 90", "") & ")" & vbCrLf

End Sub


' How many fit along a run, given the gap sits BETWEEN blanks only:
' n blanks need n*size + (n-1)*gap, which rearranges to this.
Function SafeDiv(avail As Double, size As Double) As Long
    If size <= 0 Then
        SafeDiv = 0
    Else
        SafeDiv = Int((avail + NEST_GAP) / (size + NEST_GAP))
    End If
End Function


' --- parse the DXF entity section into SVG path data -----------------------
'  SVG y grows downward, DXF y grows upward, so every y is negated and the
'  caller's translate uses -minY. Without that the nest renders mirrored.
Function ParseDXF(sPath As String, ByRef minX As Double, ByRef minY As Double, _
                  ByRef maxX As Double, ByRef maxY As Double) As String

    Dim fso As Object, ts As Object, sAll As String
    Set fso = CreateObject("Scripting.FileSystemObject")
    If Not fso.FileExists(sPath) Then Exit Function

    Set ts = fso.OpenTextFile(sPath, 1)
    sAll = ts.ReadAll
    ts.Close

    Dim L As Variant
    sAll = Replace(sAll, vbCrLf, vbLf)
    L = Split(sAll, vbLf)

    minX = 1E+30 : minY = 1E+30 : maxX = -1E+30 : maxY = -1E+30

    Dim segX1() As Double, segY1() As Double, segX2() As Double, segY2() As Double
    Dim nSeg As Long
    ReDim segX1(255) : ReDim segY1(255) : ReDim segX2(255) : ReDim segY2(255)
    nSeg = 0

    Dim i As Long, sOut As String, inEnt As Boolean
    Dim sType As String
    Dim x1 As Double, y1 As Double, x2 As Double, y2 As Double
    Dim cx As Double, cy As Double, rad As Double, a1 As Double, a2 As Double
    Dim havePoly As Boolean, polyPts As String, polyClosed As Boolean
    Dim px As Double, py As Double, bulge As Double, lastPx As Double, lastPy As Double
    Dim firstPt As Boolean

    inEnt = False
    i = 0
    Do While i < UBound(L) - 1

        ' Deliberately NOT named 'val'. That shadows VBA's built-in Val()
        ' function, after which Val(val) parses as indexing a String variable
        ' and the module will not compile: "Compile error: Expected array".
        Dim sCode As String, sVal As String
        sCode = Trim(L(i))
        sVal = Trim(L(i + 1))

        If sCode = "2" And sVal = "ENTITIES" Then inEnt = True
        If sCode = "0" And sVal = "ENDSEC" And inEnt Then Exit Do

        If inEnt And sCode = "0" Then

            ' flush a finished polyline
            If havePoly And Len(polyPts) > 0 Then
                sOut = sOut & "<polyline points=""" & polyPts & """ " & _
                       IIf(polyClosed, "", "fill=""none"" ") & "/>" & vbCrLf
                polyPts = "" : havePoly = False
            End If

            sType = sVal

            Select Case sType
                Case "LINE"
                    ' Collected, not emitted. Loose <line> elements cannot be
                    ' filled - SVG only fills a closed shape - so the segments
                    ' are chained into polygons once the file is read.
                    x1 = GV(L, i, "10") : y1 = GV(L, i, "20")
                    x2 = GV(L, i, "11") : y2 = GV(L, i, "21")
                    If nSeg > UBound(segX1) Then
                        ReDim Preserve segX1(UBound(segX1) + 64)
                        ReDim Preserve segY1(UBound(segY1) + 64)
                        ReDim Preserve segX2(UBound(segX2) + 64)
                        ReDim Preserve segY2(UBound(segY2) + 64)
                    End If
                    segX1(nSeg) = x1 : segY1(nSeg) = -y1
                    segX2(nSeg) = x2 : segY2(nSeg) = -y2
                    nSeg = nSeg + 1
                    Track x1, -y1, minX, minY, maxX, maxY
                    Track x2, -y2, minX, minY, maxX, maxY

                Case "CIRCLE"
                    cx = GV(L, i, "10") : cy = GV(L, i, "20") : rad = GV(L, i, "40")
                    sOut = sOut & "<circle cx=""" & Fmt(cx) & """ cy=""" & Fmt(-cy) & _
                           """ r=""" & Fmt(rad) & """ fill=""none""/>" & vbCrLf
                    Track cx - rad, -cy - rad, minX, minY, maxX, maxY
                    Track cx + rad, -cy + rad, minX, minY, maxX, maxY

                Case "ARC"
                    cx = GV(L, i, "10") : cy = GV(L, i, "20") : rad = GV(L, i, "40")
                    a1 = GV(L, i, "50") : a2 = GV(L, i, "51")
                    sOut = sOut & ArcPath(cx, cy, rad, a1, a2)
                    Track cx - rad, -cy - rad, minX, minY, maxX, maxY
                    Track cx + rad, -cy + rad, minX, minY, maxX, maxY

                Case "LWPOLYLINE"
                    havePoly = True : polyPts = "" : polyClosed = False
                    polyClosed = (GV(L, i, "70") = 1)
            End Select

        End If

        ' polyline vertices arrive as repeated 10/20 pairs after the header
        If inEnt And havePoly And sCode = "10" Then
            px = CDbl(Val(sVal))
            If Trim(L(i + 2)) = "20" Then
                py = CDbl(Val(Trim(L(i + 3))))
                polyPts = polyPts & Fmt(px) & "," & Fmt(-py) & " "
                Track px, -py, minX, minY, maxX, maxY
            End If
        End If

        i = i + 2
    Loop

    If havePoly And Len(polyPts) > 0 Then
        sOut = sOut & "<polyline points=""" & polyPts & """ fill=""none""/>" & vbCrLf
    End If

    ' Chain collected LINE segments into closed loops so the blank fills.
    If nSeg > 0 Then
        sOut = ChainSegments(segX1, segY1, segX2, segY2, nSeg) & sOut
    End If

    If minX > 1E+29 Then
        ParseDXF = ""
    Else
        ParseDXF = sOut
    End If

End Function


' --- chain loose segments into polygons ------------------------------------
'  Walks each segment onto whichever end of the growing chain it touches,
'  in either direction, because DXF gives no ordering or consistent winding.
'  A chain that returns to its start becomes a filled <polygon>; one that does
'  not becomes an unfilled <polyline> rather than being silently closed, so a
'  gap in the source shows up as a gap instead of a wrong shape.
Function ChainSegments(x1() As Double, y1() As Double, x2() As Double, y2() As Double, _
                       n As Long) As String

    Const TOL As Double = 0.0001

    Dim used() As Boolean
    ReDim used(n)

    Dim sOut As String
    Dim ptsX() As Double, ptsY() As Double, nPts As Long
    Dim s As Long, k As Long, grew As Boolean, j As Long

    For s = 0 To n - 1
        If Not used(s) Then

            used(s) = True
            ReDim ptsX(n * 2 + 2) : ReDim ptsY(n * 2 + 2)
            ptsX(0) = x1(s) : ptsY(0) = y1(s)
            ptsX(1) = x2(s) : ptsY(1) = y2(s)
            nPts = 2

            grew = True
            Do While grew
                grew = False
                For k = 0 To n - 1
                    If Not used(k) Then

                        If Near2(ptsX(nPts - 1), ptsY(nPts - 1), x1(k), y1(k), TOL) Then
                            ptsX(nPts) = x2(k) : ptsY(nPts) = y2(k)
                            nPts = nPts + 1 : used(k) = True : grew = True

                        ElseIf Near2(ptsX(nPts - 1), ptsY(nPts - 1), x2(k), y2(k), TOL) Then
                            ptsX(nPts) = x1(k) : ptsY(nPts) = y1(k)
                            nPts = nPts + 1 : used(k) = True : grew = True

                        ElseIf Near2(ptsX(0), ptsY(0), x2(k), y2(k), TOL) Then
                            For j = nPts To 1 Step -1
                                ptsX(j) = ptsX(j - 1) : ptsY(j) = ptsY(j - 1)
                            Next j
                            ptsX(0) = x1(k) : ptsY(0) = y1(k)
                            nPts = nPts + 1 : used(k) = True : grew = True

                        ElseIf Near2(ptsX(0), ptsY(0), x1(k), y1(k), TOL) Then
                            For j = nPts To 1 Step -1
                                ptsX(j) = ptsX(j - 1) : ptsY(j) = ptsY(j - 1)
                            Next j
                            ptsX(0) = x2(k) : ptsY(0) = y2(k)
                            nPts = nPts + 1 : used(k) = True : grew = True
                        End If

                    End If
                Next k
            Loop

            Dim sPts As String
            sPts = ""
            For j = 0 To nPts - 1
                sPts = sPts & Fmt(ptsX(j)) & "," & Fmt(ptsY(j)) & " "
            Next j

            If Near2(ptsX(0), ptsY(0), ptsX(nPts - 1), ptsY(nPts - 1), TOL) Then
                sOut = sOut & "<polygon points=""" & Trim(sPts) & """/>" & vbCrLf
            Else
                sOut = sOut & "<polyline points=""" & Trim(sPts) & """ fill=""none""/>" & vbCrLf
            End If

        End If
    Next s

    ChainSegments = sOut

End Function


Function Near2(ax As Double, ay As Double, bx As Double, by As Double, tol As Double) As Boolean
    Near2 = (Abs(ax - bx) < tol) And (Abs(ay - by) < tol)
End Function


' Read the next occurrence of a group code within this entity (stops at the
' next 0 code, so it cannot leak values from the following entity).
Function GV(L As Variant, iStart As Long, sCode As String) As Double
    Dim j As Long
    GV = 0
    For j = iStart + 2 To UBound(L) - 1 Step 2
        If Trim(L(j)) = "0" Then Exit Function
        If Trim(L(j)) = sCode Then
            GV = CDbl(Val(Trim(L(j + 1))))
            Exit Function
        End If
    Next j
End Function


' DXF arcs are centre/radius/angles; SVG needs endpoints plus flags.
Function ArcPath(cx As Double, cy As Double, r As Double, _
                 aStart As Double, aEnd As Double) As String
    Const PI As Double = 3.14159265358979
    Dim s As Double, e As Double, sweep As Double
    Dim sx As Double, sy As Double, ex As Double, ey As Double
    Dim large As Long

    s = aStart * PI / 180
    e = aEnd * PI / 180

    sx = cx + r * Cos(s) : sy = cy + r * Sin(s)
    ex = cx + r * Cos(e) : ey = cy + r * Sin(e)

    sweep = aEnd - aStart
    Do While sweep < 0
        sweep = sweep + 360
    Loop
    large = IIf(sweep > 180, 1, 0)

    ' sweep-flag 0: DXF arcs run counter-clockwise, and negating y flips the
    ' handedness, so counter-clockwise becomes clockwise in SVG space.
    ArcPath = "<path d=""M " & Fmt(sx) & " " & Fmt(-sy) & " A " & Fmt(r) & " " & Fmt(r) & _
              " 0 " & large & " 0 " & Fmt(ex) & " " & Fmt(-ey) & """ fill=""none""/>" & vbCrLf
End Function


Sub Track(x As Double, y As Double, ByRef minX As Double, ByRef minY As Double, _
          ByRef maxX As Double, ByRef maxY As Double)
    If x < minX Then minX = x
    If y < minY Then minY = y
    If x > maxX Then maxX = x
    If y > maxY Then maxY = y
End Sub


' Invariant decimal point - a comma decimal separator would corrupt the SVG.
Function Fmt(d As Double) As String
    Dim s As String
    s = Format$(d, "0.###")
    s = Replace(s, ",", ".")
    Fmt = s
End Function


' ---- STOCK SHEET SIZES ----------------------------------------------------
'  Edit these two to match the stock you carry. Keep them the same length and
'  keep NEST_SHEET_COUNT at the top in step with them.
'
'  They sit at the bottom of the file rather than beside the other settings
'  because VBA requires all module-level Const/Dim declarations to precede the
'  first procedure; a Function among them makes every declaration after it a
'  compile error.
Function SheetLengths() As Variant
    SheetLengths = Array(2500#, 3000#)
End Function

Function SheetWidths() As Variant
    SheetWidths = Array(1250#, 1500#)
End Function
