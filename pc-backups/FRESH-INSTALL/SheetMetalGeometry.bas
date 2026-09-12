' ============================================================================
' SheetMetalGeometry  -  SOLIDWORKS VBA macro
' ----------------------------------------------------------------------------
' Writes  <report>\db\sheetmetal-geometry.js  holding the TRUE flat pattern
' outline of every sheet metal part in the open assembly. swood-client.js
' reads that file and nests the real blank shape.
'
' WHY VBA AND NOT VBSCRIPT
' SOLIDWORKS returns component lists as SafeArrays of VT_DISPATCH. Late-bound
' VBScript cannot dereference those elements - every read gives "Type
' mismatch" (error 13). VBA binds them properly, so all the array work lives
' here. SheetMetalGeometry.vbs is now only a launcher.
'
' INSTALL
'   Save this as:
'   D:\SWOOD_LIBRARY 2026\SHEETMETAL CUSTOM PROPERTY MACRO\SheetMetalGeometry.swp
'
'   In the VBA editor the module must be named  SheetMetalGeometry
'   (right-click the module in the Project pane, Properties, (Name)).
'   The launcher tries other common names too, so this is a safeguard.
'
' HOW IT RUNS
'   Automatically: Report.cfg POSTPROCESS calls SheetMetalGeometry.vbs, which
'   calls RunMacro2 on this file. Nothing to press.
'   Manually: open the assembly, press F5, pick the report folder.
'
' Everything is logged to <report>\db\sheetmetal-geometry.log
' ============================================================================

Option Explicit

' Set to True only while testing. False = completely silent, which is what
' an automatic report run needs.
Const SHOW_MESSAGE As Boolean = False

Const PATH_HANDOFF As String = "swood_sm_reportpath.txt"
Const ARC_SEG As Long = 12          ' segments per 90 degrees of arc
Const TOL As Double = 0.05          ' mm, point matching when chaining

Dim swApp As Object
Dim gLogOpen As Boolean
Dim gJson As String
Dim gCount As Long
Dim gSeen As String
Dim gExamined As Long
Dim gPlain As Long
Dim gSkipped As Long
Dim gPrevMap As Boolean
Dim gPrevMapOk As Boolean
Dim gReport As String

' ---------------------------------------------------------------------------
Sub main()

    On Error Resume Next

    Set swApp = Application.SldWorks
    If Err.Number <> 0 Then
        MsgBox "Could not reach SOLIDWORKS: " & Err.Number & " " & Err.Description, vbCritical
        Exit Sub
    End If

    gJson = ""
    gCount = 0
    gSeen = "|"
    gExamined = 0
    gPlain = 0
    gSkipped = 0

    gReport = ReportPath()
    If Len(gReport) = 0 Then Exit Sub

    OpenLog
    LogIt "started"
    LogIt "  report = " & gReport

    Dim swModel As Object
    Set swModel = swApp.ActiveDoc

    If swModel Is Nothing Then
        LogIt "  no active document"
        CloseLog
        Exit Sub
    End If

    LogIt "  active doc = " & swModel.GetTitle & "  type=" & swModel.GetType

    Err.Clear
    EnsureFolder gReport & "\dxfs"
    EnsureFolder gReport & "\db"
    If Err.Number <> 0 Then
        LogIt "  folder check: " & Err.Number & " " & Err.Description
        Err.Clear
    End If

    ' 1. whatever is in front
    Err.Clear
    If swModel.GetType = 1 Then
        DoPart swModel
    ElseIf swModel.GetType = 2 Then
        DoAssembly swModel
    End If
    If Err.Number <> 0 Then
        LogIt "ERROR during the walk: " & Err.Number & " " & Err.Description
        Err.Clear
    End If

    ' IMPORTANT: do NOT scan every other open document here.
    ' SWOOD invokes this launcher once per sheet-metal PART. The first
    ' invocation processes the active assembly recursively; the VBS launcher
    ' prevents the remaining PART callbacks from starting another run.

    LogIt "walk complete: " & gExamined & " part(s) examined, " & _
          gPlain & " without a flat pattern, " & gSkipped & " not loaded"

    If gCount > 0 Then
        WriteGeometry
        LogIt "FINISHED - " & gCount & " flat pattern(s) written"
    Else
        LogIt "FINISHED - nothing written"
    End If

    CloseLog

    ' Silent unless SHOW_MESSAGE is switched on. The log is the record.
    If SHOW_MESSAGE Then
        If gCount > 0 Then
            MsgBox "Flat patterns written: " & gCount & vbCrLf & vbCrLf & _
                   gReport & "\db\sheetmetal-geometry.js", vbInformation
        Else
            MsgBox "No flat patterns were written." & vbCrLf & vbCrLf & _
                   "See " & gReport & "\db\sheetmetal-geometry.log", vbExclamation
        End If
    End If

End Sub

' ------------------------------------------------------------- report path --
' The launcher drops the path in %TEMP%. With no hand-off file the user is
' asked, so the macro also works on its own.
Function ReportPath() As String

    Dim f As String
    Dim num As Integer
    Dim line As String

    f = TempFile()

    If Len(Dir(f)) > 0 Then
        num = FreeFile
        Open f For Input As #num
        Line Input #num, line
        Close #num
        Kill f                       ' one-shot, so a manual run always asks
        ReportPath = Trim(line)
        Exit Function
    End If

    Dim shell As Object
    Dim folder As Object
    Set shell = CreateObject("Shell.Application")
    Set folder = shell.BrowseForFolder(0, "Select the report folder (the one with index.html)", 0)
    If folder Is Nothing Then
        ReportPath = ""
    Else
        ReportPath = folder.Self.Path
    End If

End Function

Function TempFile() As String
    TempFile = Environ$("TEMP") & "\" & PATH_HANDOFF
End Function

Sub EnsureFolder(ByVal p As String)
    If Len(Dir(p, vbDirectory)) = 0 Then MkDir p
End Sub

' Walks every document currently open in SOLIDWORKS. Cheap - they are
' already loaded - and it catches parts opened in their own window.
Sub SweepOpenDocs()

    On Error Resume Next

    Dim m As Object
    Dim pth As String
    Dim n As Long

    Set m = swApp.GetFirstDocument
    If Err.Number <> 0 Then Err.Clear

    n = 0
    Do While Not m Is Nothing And n < 500

        n = n + 1

        If m.GetType = 1 Then
            pth = LCase(m.GetPathName)
            If Err.Number <> 0 Then
                pth = ""
                Err.Clear
            End If
            If Len(pth) = 0 Then pth = LCase(m.GetTitle)

            If InStr(1, gSeen, "|" & pth & "|") = 0 Then
                gSeen = gSeen & pth & "|"
                DoPart m
            End If
        End If

        Set m = m.GetNext
        If Err.Number <> 0 Then
            Err.Clear
            Exit Do
        End If

    Loop

    LogIt "  open documents checked: " & n

End Sub

' Walks every assembly currently open in SOLIDWORKS. Running the macro with
' a single part in front used to process only that part - this makes the
' result the same whatever window happens to be active.
Sub DoOpenAssemblies()

    On Error Resume Next

    Dim vDocs As Variant
    Dim i As Long
    Dim d As Object

    vDocs = swApp.GetDocuments
    If Err.Number <> 0 Then
        Err.Clear
        Exit Sub
    End If
    If IsEmpty(vDocs) Then Exit Sub

    For i = 0 To UBound(vDocs)
        Set d = Nothing
        Set d = vDocs(i)
        If Not d Is Nothing Then
            If d.GetType = 2 Then DoAssembly d
        End If
    Next i

End Sub

' Any sheet metal part open on its own, not inside one of those assemblies.
Sub DoOpenParts()

    On Error Resume Next

    Dim vDocs As Variant
    Dim i As Long
    Dim d As Object
    Dim pth As String

    vDocs = swApp.GetDocuments
    If Err.Number <> 0 Then
        Err.Clear
        Exit Sub
    End If
    If IsEmpty(vDocs) Then Exit Sub

    For i = 0 To UBound(vDocs)
        Set d = Nothing
        Set d = vDocs(i)
        If Not d Is Nothing Then
            If d.GetType = 1 Then
                pth = LCase(d.GetPathName)
                If Len(pth) = 0 Then pth = LCase(d.GetTitle)
                If InStr(1, gSeen, "|" & pth & "|") = 0 Then
                    gSeen = gSeen & pth & "|"
                    DoPart d
                End If
            End If
        End If
    Next i

End Sub

' ---------------------------------------------------------------- assembly --
Sub DoAssembly(ByVal swModel As Object)

    On Error Resume Next
    LogIt "  DoAssembly: " & swModel.GetTitle

    Dim swConf As Object
    Dim swRoot As Object
    Dim vKids As Variant
    Dim i As Long

    Set swConf = swModel.GetActiveConfiguration
    If swConf Is Nothing Then
        LogIt "  no active configuration"
        Exit Sub
    End If

    Set swRoot = swConf.GetRootComponent3(True)
    If swRoot Is Nothing Then
        LogIt "  no root component"
        Exit Sub
    End If

    vKids = swRoot.GetChildren
    If IsEmpty(vKids) Then
        LogIt "  root has no children"
        Exit Sub
    End If

    LogIt "  top level components: " & (UBound(vKids) + 1)

    Dim swChild As Object
    For i = 0 To UBound(vKids)
        Set swChild = Nothing
        Set swChild = vKids(i)
        If Not swChild Is Nothing Then Walk swChild
        If Err.Number <> 0 Then
            LogIt "    walk error on child " & i & ": " & Err.Number & " " & Err.Description
            Err.Clear
        End If
    Next i

End Sub

Sub Walk(ByVal swComp As Object)

    On Error Resume Next

    Dim m As Object
    Dim vKids As Variant
    Dim i As Long
    Dim nm As String
    Dim pth As String

    If swComp Is Nothing Then Exit Sub

    nm = swComp.Name2
    If Err.Number <> 0 Then
        nm = "(name unavailable)"
        Err.Clear
    End If

    Set m = swComp.GetModelDoc2
    If Err.Number <> 0 Then Err.Clear

    ' Deliberately NOT resolving lightweight components. Forcing 300 library
    ' hardware parts to load costs about half a second each and none of them
    ' is sheet metal. A sheet metal part in the assembly is already resolved.
    If m Is Nothing Then
        gSkipped = gSkipped + 1
        Exit Sub
    End If

    If Not m Is Nothing Then
        pth = LCase(m.GetPathName)
        If Len(pth) = 0 Then pth = LCase(nm)

        If InStr(1, gSeen, "|" & pth & "|") = 0 Then
            gSeen = gSeen & pth & "|"
            If m.GetType = 1 Then DoPart m
        End If
    End If

    vKids = swComp.GetChildren
    If Err.Number <> 0 Then Err.Clear

    If Not IsEmpty(vKids) Then
        Dim swKid As Object
        For i = 0 To UBound(vKids)
            Set swKid = Nothing
            Set swKid = vKids(i)
            If Not swKid Is Nothing Then Walk swKid
        Next i
    End If

End Sub

' -------------------------------------------------------------------- part --
' The DXF/DWG mapping dialog is what interrupts the export. These toggles
' turn it off, and the originals are put back afterwards so a later manual
' export still behaves the way the user set it up.
Sub QuietExport(ByVal onOff As Boolean)

    On Error Resume Next

    If onOff Then
        gPrevMap = swApp.GetUserPreferenceToggle(swDxfDontShowMap)
        gPrevMapOk = (Err.Number = 0)
        If Err.Number <> 0 Then Err.Clear

        swApp.SetUserPreferenceToggle swDxfDontShowMap, True
        If Err.Number <> 0 Then Err.Clear

        ' belt and braces: tells SOLIDWORKS a command is driving it, which
        ' suppresses several "are you sure" prompts
        swApp.CommandInProgress = True
        If Err.Number <> 0 Then Err.Clear
    Else
        If gPrevMapOk Then
            swApp.SetUserPreferenceToggle swDxfDontShowMap, gPrevMap
            If Err.Number <> 0 Then Err.Clear
        End If
        swApp.CommandInProgress = False
        If Err.Number <> 0 Then Err.Clear
    End If

    On Error GoTo 0

End Sub

Sub DoPart(ByVal swModel As Object)

    On Error Resume Next

    Dim nm As String
    Dim conf As String
    Dim dxfPath As String
    Dim pts As String
    Dim ok As Boolean

    nm = swModel.GetTitle
    If InStrRev(nm, ".") > 0 Then nm = Left(nm, InStrRev(nm, ".") - 1)

    gExamined = gExamined + 1

    If Not HasFlatPattern(swModel) Then
        gPlain = gPlain + 1
        Exit Sub
    End If

    LogIt "  SHEET METAL: " & nm

    conf = swModel.ConfigurationManager.ActiveConfiguration.Name
    dxfPath = gReport & "\dxfs\flat-" & Clean(nm) & "_" & Clean(conf) & ".dxf"

    QuietExport True

    On Error Resume Next
    Err.Clear
    swModel.ExportFlatPatternView dxfPath, 0
    ok = (Err.Number = 0)

    If Not ok Then
        LogIt "    ExportFlatPatternView failed: " & Err.Number & " " & Err.Description
        Err.Clear

        ' -2147417848 is "the object has disconnected from its clients". It
        ' happens on an in-context part (the ^ASSEMBLY ones) that is only
        ' loaded as a component. Bringing it up as a document first fixes it.
        ok = RetryActivated(swModel, dxfPath)
    End If

    If Not ok Then ok = ExportViaDwg(swModel, dxfPath)
    If (Not ok) Or (Len(Dir(dxfPath)) = 0) Then ok = ExportDetached(swModel, dxfPath)
    On Error GoTo 0

    QuietExport False

    If Not ok Then Exit Sub
    If Len(Dir(dxfPath)) = 0 Then
        LogIt "    no DXF produced"
        Exit Sub
    End If

    pts = OutlineFromDxf(dxfPath)
    If Len(pts) = 0 Then
        LogIt "    outline could not be read"
        Exit Sub
    End If

    AddEntry nm & "_" & conf, pts
    AddEntry nm, pts
    gCount = gCount + 1
    LogIt "    ok"

End Sub

' Opens the part as its own window, exports, then puts the assembly back.
Function RetryActivated(ByVal swModel As Object, ByVal dxfPath As String) As Boolean

    On Error Resume Next

    Dim pth As String
    Dim wasActive As String
    Dim errs As Long
    Dim warns As Long
    Dim opened As Object
    Dim swActive As Object

    RetryActivated = False

    Set swActive = swApp.ActiveDoc
    If Not swActive Is Nothing Then wasActive = swActive.GetTitle

    pth = swModel.GetPathName
    If Len(pth) = 0 Then
        LogIt "    no file path - cannot re-open (virtual component)"
        Exit Function
    End If

    Err.Clear
    Set opened = swApp.ActivateDoc3(swModel.GetTitle, False, 0, errs)
    If Err.Number <> 0 Or opened Is Nothing Then
        Err.Clear
        Set opened = swApp.OpenDoc6(pth, 1, 0, "", errs, warns)   ' 1 = part
        If Err.Number <> 0 Then
            LogIt "    could not activate or open it: " & Err.Number & " " & Err.Description
            Err.Clear
            Exit Function
        End If
    End If

    If opened Is Nothing Then Exit Function

    Err.Clear
    opened.ExportFlatPatternView dxfPath, 0
    If Err.Number = 0 Then
        LogIt "    exported after activating the part"
        RetryActivated = True
    Else
        LogIt "    still failed after activating: " & Err.Number & " " & Err.Description
        Err.Clear
    End If

    ' back to whatever was in front
    If Len(wasActive) > 0 Then
        Err.Clear
        swApp.ActivateDoc3 wasActive, False, 0, errs
        If Err.Number <> 0 Then Err.Clear
    End If

End Function

Function ExportViaDwg(ByVal swModel As Object, ByVal dxfPath As String) As Boolean

    Dim align(11) As Double
    Dim i As Long

    ExportViaDwg = False
    For i = 0 To 11
        align(i) = 0
    Next i
    align(3) = 1: align(7) = 1: align(11) = 1

    On Error Resume Next
    Err.Clear
    ' 1 = export sheet metal, True = flat pattern geometry only
    swModel.ExportToDWG2 dxfPath, swModel.GetPathName, 1, True, align, False, False, 0, Null
    If Err.Number <> 0 Then
        LogIt "    ExportToDWG2 failed: " & Err.Number & " " & Err.Description
        Err.Clear
    ElseIf Len(Dir(dxfPath)) > 0 Then
        LogIt "    exported via ExportToDWG2"
        ExportViaDwg = True
    Else
        LogIt "    ExportToDWG2 reported success but wrote no file"
    End If
    On Error GoTo 0

End Function

' Virtual in-context parts (Part1^Study Table) disconnect on ExportFlatPatternView
' and ExportToDWG2 with no file because GetPathName is the assembly. Save a copy
' to disk, open that copy, then export.
Function ExportDetached(ByVal swModel As Object, ByVal dxfPath As String) As Boolean

    On Error Resume Next

    Dim dest As String
    Dim srcDir As String
    Dim wasActive As String
    Dim errs As Long
    Dim warns As Long
    Dim opened As Object
    Dim saved As Object
    Dim swActive As Object
    Dim nm As String
    Dim align(11) As Double
    Dim i As Long

    ExportDetached = False

    Set swActive = swApp.ActiveDoc
    If Not swActive Is Nothing Then wasActive = swActive.GetTitle

    nm = swModel.GetTitle
    If InStrRev(nm, ".") > 0 Then nm = Left(nm, InStrRev(nm, ".") - 1)
    srcDir = gReport & "\dxfs\_src"
    EnsureFolder gReport & "\dxfs"
    EnsureFolder srcDir
    dest = srcDir & "\" & Clean(nm) & ".sldprt"

    Err.Clear
    Set opened = swApp.ActivateDoc3(swModel.GetTitle, False, 0, errs)
    If opened Is Nothing Then Set opened = swModel
    If opened Is Nothing Then
        LogIt "    detached: no document to save"
        Exit Function
    End If

    If Len(Dir(dest)) > 0 Then Kill dest
    Err.Clear
    opened.SaveAs3 dest, 0, 3
    If Err.Number <> 0 Or Len(Dir(dest)) = 0 Then
        LogIt "    detached SaveAs failed: " & Err.Number & " " & Err.Description
        Err.Clear
        If Len(wasActive) > 0 Then swApp.ActivateDoc3 wasActive, False, 0, errs
        Exit Function
    End If
    LogIt "    saved virtual copy: " & dest

    Err.Clear
    Set saved = swApp.OpenDoc6(dest, 1, 0, "", errs, warns)
    If saved Is Nothing Then
        LogIt "    detached OpenDoc6 failed: " & Err.Number & " " & Err.Description
        Err.Clear
        If Len(wasActive) > 0 Then swApp.ActivateDoc3 wasActive, False, 0, errs
        Exit Function
    End If

    Err.Clear
    saved.ExportFlatPatternView dxfPath, 0
    If Err.Number = 0 And Len(Dir(dxfPath)) > 0 Then
        LogIt "    exported detached via ExportFlatPatternView"
        ExportDetached = True
    Else
        Err.Clear
        For i = 0 To 11
            align(i) = 0
        Next i
        align(3) = 1: align(7) = 1: align(11) = 1
        saved.ExportToDWG2 dxfPath, dest, 1, True, align, False, False, 0, Null
        If Err.Number = 0 And Len(Dir(dxfPath)) > 0 Then
            LogIt "    exported detached via ExportToDWG2"
            ExportDetached = True
        Else
            LogIt "    detached export failed: " & Err.Number & " " & Err.Description
            Err.Clear
        End If
    End If

    If Len(wasActive) > 0 Then
        Err.Clear
        swApp.ActivateDoc3 wasActive, False, 0, errs
        If Err.Number <> 0 Then Err.Clear
    End If

    On Error GoTo 0

End Function

Function HasFlatPattern(ByVal swModel As Object) As Boolean

    Dim swFeat As Object
    Dim swSub As Object

    HasFlatPattern = False
    Set swFeat = swModel.FirstFeature

    Do While Not swFeat Is Nothing
        If swFeat.GetTypeName2 = "FlatPattern" Then
            HasFlatPattern = True
            Exit Function
        End If
        Set swSub = swFeat.GetFirstSubFeature
        Do While Not swSub Is Nothing
            If swSub.GetTypeName2 = "FlatPattern" Then
                HasFlatPattern = True
                Exit Function
            End If
            Set swSub = swSub.GetNextSubFeature
        Loop
        Set swFeat = swFeat.GetNextFeature
    Loop

End Function

' ------------------------------------------------------------- DXF reading --
Function OutlineFromDxf(ByVal path As String) As String

    Dim num As Integer
    Dim whole As String
    Dim lines() As String
    Dim segs() As Double
    Dim nSeg As Long
    Dim i As Long, cnt As Long
    Dim code As String, val As String, ent As String
    Dim x1 As Double, y1 As Double, x2 As Double, y2 As Double
    Dim cx As Double, cy As Double, rad As Double, a1 As Double, a2 As Double
    Dim have As Long

    OutlineFromDxf = ""

    num = FreeFile
    Open path For Input As #num
    whole = Input$(LOF(num), #num)
    Close #num
    If Len(whole) = 0 Then Exit Function

    lines = Split(Replace(whole, vbCrLf, vbLf), vbLf)
    cnt = UBound(lines)

    ReDim segs(4000)
    nSeg = 0
    ent = ""
    have = 0

    i = 0
    Do While i < cnt
        code = Trim(lines(i))
        val = ""
        If i + 1 <= cnt Then val = Trim(lines(i + 1))

        If code = "0" Then
            Flush ent, x1, y1, x2, y2, cx, cy, rad, a1, a2, have, segs, nSeg
            ent = UCase(val)
            have = 0
            If ent = "LWPOLYLINE" Or ent = "POLYLINE" Then
                i = ReadPoly(lines, i, cnt, segs, nSeg, 10, 20)
                ent = ""
            ElseIf ent = "SPLINE" Then
                i = ReadPoly(lines, i, cnt, segs, nSeg, 11, 21)
                ent = ""
            End If
        ElseIf code = "10" Then
            If ent = "LINE" Then
                x1 = Dbl(val): have = have Or 1
            ElseIf ent = "ARC" Or ent = "ELLIPSE" Then
                cx = Dbl(val): have = have Or 1
            End If
        ElseIf code = "20" Then
            If ent = "LINE" Then
                y1 = Dbl(val): have = have Or 2
            ElseIf ent = "ARC" Or ent = "ELLIPSE" Then
                cy = Dbl(val): have = have Or 2
            End If
        ElseIf code = "11" Then
            If ent = "LINE" Then
                x2 = Dbl(val): have = have Or 4
            ElseIf ent = "ELLIPSE" Then
                x2 = Dbl(val): have = have Or 4        ' major axis, from centre
            End If
        ElseIf code = "21" Then
            If ent = "LINE" Then
                y2 = Dbl(val): have = have Or 8
            ElseIf ent = "ELLIPSE" Then
                y2 = Dbl(val): have = have Or 8
            End If
        ElseIf code = "40" Then
            If ent = "ARC" Then
                rad = Dbl(val): have = have Or 4
            ElseIf ent = "ELLIPSE" Then
                rad = Dbl(val): have = have Or 16      ' minor/major ratio
            End If
        ElseIf code = "50" Then
            If ent = "ARC" Then a1 = Dbl(val): have = have Or 8
        ElseIf code = "51" Then
            If ent = "ARC" Then a2 = Dbl(val): have = have Or 16
        ElseIf code = "41" Then
            If ent = "ELLIPSE" Then a1 = Dbl(val): have = have Or 32
        ElseIf code = "42" Then
            If ent = "ELLIPSE" Then a2 = Dbl(val): have = have Or 64
        End If

        i = i + 2
    Loop
    Flush ent, x1, y1, x2, y2, cx, cy, rad, a1, a2, have, segs, nSeg

    If nSeg = 0 Then Exit Function

    OutlineFromDxf = AllLoops(segs, nSeg)

End Function

Sub Flush(ByVal ent As String, ByVal x1 As Double, ByVal y1 As Double, _
          ByVal x2 As Double, ByVal y2 As Double, _
          ByVal cx As Double, ByVal cy As Double, ByVal rad As Double, _
          ByVal a1 As Double, ByVal a2 As Double, _
          ByVal have As Long, ByRef segs() As Double, ByRef nSeg As Long)

    Dim sweep As Double, t0 As Double, t1 As Double
    Dim steps As Long, k As Long
    Const PI As Double = 3.14159265358979

    If ent = "LINE" Then
        If (have And 15) = 15 Then AddSeg segs, nSeg, x1, y1, x2, y2

    ElseIf ent = "ELLIPSE" Then
        ' 10/20 centre, 11/21 major axis vector, 40 minor/major, 41/42 params.
        ' The cut-outs SOLIDWORKS writes are ELLIPSE entities - not SPLINE -
        ' which is why the oval was being dropped.
        If (have And 15) = 15 Then
            Dim mx As Double, my As Double, ratio As Double
            Dim ex As Double, ey As Double, px0 As Double, py0 As Double
            Dim p0 As Double, p1 As Double, stepsE As Long, kE As Long
            Dim tt As Double, ct As Double, st As Double
            Const PI2 As Double = 6.28318530717959

            mx = x2: my = y2
            ratio = rad
            If ratio <= 0 Then ratio = 1

            p0 = a1
            p1 = a2
            If p1 <= p0 Then p1 = p0 + PI2

            stepsE = 48
            px0 = 0: py0 = 0
            For kE = 0 To stepsE
                tt = p0 + (p1 - p0) * kE / stepsE
                ct = Cos(tt): st = Sin(tt)
                ' point = centre + major*cos + perpendicular(major)*ratio*sin
                ex = cx + mx * ct - my * ratio * st
                ey = cy + my * ct + mx * ratio * st
                If kE > 0 Then AddSeg segs, nSeg, px0, py0, ex, ey
                px0 = ex: py0 = ey
            Next kE
        End If

    ElseIf ent = "ARC" Then
        If (have And 7) = 7 Then
            sweep = a2 - a1
            Do While sweep < 0
                sweep = sweep + 360
            Loop
            steps = Int(sweep / 90 * ARC_SEG) + 1
            For k = 0 To steps - 1
                t0 = (a1 + sweep * k / steps) * PI / 180
                t1 = (a1 + sweep * (k + 1) / steps) * PI / 180
                AddSeg segs, nSeg, cx + rad * Cos(t0), cy + rad * Sin(t0), _
                                   cx + rad * Cos(t1), cy + rad * Sin(t1)
            Next k
        End If
    End If

End Sub

' Reads a vertex list. codeX/codeY choose control points (10/20) or fit
' points (11/21) for splines.
Function ReadPoly(ByRef lines() As String, ByVal startIdx As Long, ByVal cnt As Long, _
                  ByRef segs() As Double, ByRef nSeg As Long, _
                  ByVal codeX As Long, ByVal codeY As Long) As Long

    Dim xs(1000) As Double, ys(1000) As Double
    Dim n As Long, i As Long, k As Long
    Dim code As String, val As String
    Dim pend As Double, havePend As Boolean

    n = 0
    havePend = False
    i = startIdx + 2

    Do While i < cnt
        code = Trim(lines(i))
        val = ""
        If i + 1 <= cnt Then val = Trim(lines(i + 1))

        If code = "0" Then
            If UCase(val) <> "VERTEX" Then Exit Do
        ElseIf code = CStr(codeX) Then
            pend = Dbl(val): havePend = True
        ElseIf code = CStr(codeY) Then
            If havePend And n < 1000 Then
                xs(n) = pend: ys(n) = Dbl(val)
                n = n + 1
                havePend = False
            End If
        End If
        i = i + 2
    Loop

    For k = 0 To n - 2
        AddSeg segs, nSeg, xs(k), ys(k), xs(k + 1), ys(k + 1)
    Next k
    If n > 2 Then AddSeg segs, nSeg, xs(n - 1), ys(n - 1), xs(0), ys(0)

    ReadPoly = i

End Function

Sub AddSeg(ByRef segs() As Double, ByRef nSeg As Long, _
           ByVal ax As Double, ByVal ay As Double, _
           ByVal bx As Double, ByVal by As Double)

    If nSeg + 4 > UBound(segs) Then ReDim Preserve segs(UBound(segs) + 4000)
    segs(nSeg) = ax: segs(nSeg + 1) = ay
    segs(nSeg + 2) = bx: segs(nSeg + 3) = by
    nSeg = nSeg + 4

End Sub

' ----------------------------------------------------------------- chaining --
' Chains every segment into closed loops. The biggest loop is the blank
' outline; the rest are holes and cut-outs. All of them are normalised by the
' SAME offset, otherwise the holes would not sit in the right place.
Function AllLoops(ByRef segs() As Double, ByVal nSeg As Long) As String

    On Error Resume Next

    ' No Scripting.Dictionary. If CreateObject fails the object is Nothing,
    ' every call on it raises, and the whole statement is skipped silently -
    ' which is how this chain wasted several rounds already. Plain arrays.
    Dim total As Long
    Dim used() As Boolean
    Dim px() As Double, py() As Double
    Dim np As Long
    Dim s As Long, t As Long
    Dim grew As Boolean
    Dim a As Double

    ' loops stored flat: lx/ly hold the points, lStart/lCount index into them
    Dim lx() As Double, ly() As Double
    Dim lStart() As Long, lCount() As Long, lArea() As Double
    Dim nLoop As Long, nPts As Long

    total = nSeg \ 4
    If total = 0 Then Exit Function

    ReDim used(total)
    ReDim lx(total * 2 + 8)
    ReDim ly(total * 2 + 8)
    ReDim lStart(total + 1)
    ReDim lCount(total + 1)
    ReDim lArea(total + 1)
    nLoop = 0
    nPts = 0

    For s = 0 To total - 1
        If Not used(s) Then

            ReDim px(total + 2)
            ReDim py(total + 2)
            used(s) = True
            px(0) = segs(s * 4): py(0) = segs(s * 4 + 1)
            px(1) = segs(s * 4 + 2): py(1) = segs(s * 4 + 3)
            np = 2

            Do
                grew = False
                For t = 0 To total - 1
                    If Not used(t) Then
                        If Near(px(np - 1), py(np - 1), segs(t * 4), segs(t * 4 + 1)) Then
                            px(np) = segs(t * 4 + 2): py(np) = segs(t * 4 + 3)
                            np = np + 1: used(t) = True: grew = True
                        ElseIf Near(px(np - 1), py(np - 1), segs(t * 4 + 2), segs(t * 4 + 3)) Then
                            px(np) = segs(t * 4): py(np) = segs(t * 4 + 1)
                            np = np + 1: used(t) = True: grew = True
                        End If
                    End If
                Next t
            Loop While grew

            If np > 3 Then
                a = Abs(PolyArea(px, py, np))
                If a > 1 Then                      ' ignore slivers
                    If nPts + np > UBound(lx) Then
                        ReDim Preserve lx(nPts + np + 500)
                        ReDim Preserve ly(nPts + np + 500)
                    End If
                    lStart(nLoop) = nPts
                    lCount(nLoop) = np
                    lArea(nLoop) = a
                    Dim k2 As Long
                    For k2 = 0 To np - 1
                        lx(nPts + k2) = px(k2)
                        ly(nPts + k2) = py(k2)
                    Next k2
                    nPts = nPts + np
                    nLoop = nLoop + 1
                End If
            End If

        End If
    Next s

    If nLoop = 0 Then Exit Function

    ' biggest loop is the outline, the rest are holes
    Dim iBest As Long, i As Long
    iBest = 0
    For i = 1 To nLoop - 1
        If lArea(i) > lArea(iBest) Then iBest = i
    Next i

    ' one origin for every loop, taken from the outline, so holes keep
    ' their position inside it
    Dim ox As Double, oy As Double
    ox = lx(lStart(iBest)): oy = ly(lStart(iBest))
    For i = 0 To lCount(iBest) - 1
        If lx(lStart(iBest) + i) < ox Then ox = lx(lStart(iBest) + i)
        If ly(lStart(iBest) + i) < oy Then oy = ly(lStart(iBest) + i)
    Next i

    Dim outer As String, inner As String
    outer = Flat(lx, ly, lStart(iBest), lCount(iBest), ox, oy)

    inner = ""
    For i = 0 To nLoop - 1
        If i <> iBest Then
            If Len(inner) > 0 Then inner = inner & ","
            inner = inner & "[" & Flat(lx, ly, lStart(i), lCount(i), ox, oy) & "]"
        End If
    Next i

    AllLoops = outer & Chr(1) & inner

End Function

Function Flat(ByRef lx() As Double, ByRef ly() As Double, _
              ByVal start As Long, ByVal count As Long, _
              ByVal ox As Double, ByVal oy As Double) As String

    On Error Resume Next

    Dim i As Long, out As String
    out = ""
    For i = 0 To count - 1
        If Len(out) > 0 Then out = out & ","
        out = out & "[" & Num(lx(start + i) - ox) & "," & Num(ly(start + i) - oy) & "]"
    Next i
    Flat = out

End Function

Sub OffsetOf(ByRef px() As Double, ByRef py() As Double, ByVal np As Long, _
             ByRef ox As Double, ByRef oy As Double)
    Dim i As Long
    ox = px(0): oy = py(0)
    For i = 1 To np - 1
        If px(i) < ox Then ox = px(i)
        If py(i) < oy Then oy = py(i)
    Next i
End Sub

Function SerialiseAt(ByRef px() As Double, ByRef py() As Double, ByVal np As Long, _
                     ByVal ox As Double, ByVal oy As Double) As String
    Dim i As Long, out As String
    out = ""
    For i = 0 To np - 1
        If Len(out) > 0 Then out = out & ","
        out = out & "[" & Num(px(i) - ox) & "," & Num(py(i) - oy) & "]"
    Next i
    SerialiseAt = out
End Function

Function Near(ByVal ax As Double, ByVal ay As Double, ByVal bx As Double, ByVal by As Double) As Boolean
    Near = (Abs(ax - bx) <= TOL) And (Abs(ay - by) <= TOL)
End Function

Function PolyArea(ByRef px() As Double, ByRef py() As Double, ByVal np As Long) As Double
    Dim i As Long, a As Double
    a = 0
    For i = 0 To np - 2
        a = a + (px(i) * py(i + 1) - px(i + 1) * py(i))
    Next i
    a = a + (px(np - 1) * py(0) - px(0) * py(np - 1))
    PolyArea = a / 2
End Function

Function Serialise(ByRef px() As Double, ByRef py() As Double, ByVal np As Long) As String
    Dim i As Long, minX As Double, minY As Double, out As String
    minX = px(0): minY = py(0)
    For i = 1 To np - 1
        If px(i) < minX Then minX = px(i)
        If py(i) < minY Then minY = py(i)
    Next i
    out = ""
    For i = 0 To np - 1
        If Len(out) > 0 Then out = out & ","
        out = out & "[" & Num(px(i) - minX) & "," & Num(py(i) - minY) & "]"
    Next i
    Serialise = out
End Function

' ------------------------------------------------------------------- output --
' pts arrives as  outer <Chr(1)> inner
Sub AddEntry(ByVal keyName As String, ByVal pts As String)

    Dim outer As String, inner As String
    Dim p As Long

    p = InStr(pts, Chr(1))
    If p > 0 Then
        outer = Left(pts, p - 1)
        inner = Mid(pts, p + 1)
    Else
        outer = pts
        inner = ""
    End If

    If Len(gJson) > 0 Then gJson = gJson & "," & vbCrLf
    gJson = gJson & " " & Chr(34) & JsEsc(keyName) & Chr(34) & _
            ": { " & Chr(34) & "ok" & Chr(34) & ": true, " & _
            Chr(34) & "outer" & Chr(34) & ": [" & outer & "], " & _
            Chr(34) & "inner" & Chr(34) & ": [" & inner & "] }"

End Sub

Sub WriteGeometry()

    Dim num As Integer
    Dim p As String

    p = gReport & "\db\sheetmetal-geometry.js"
    num = FreeFile
    Open p For Output As #num
    Print #num, "// db/sheetmetal-geometry.js"
    Print #num, "// Generated by SheetMetalGeometry.swp during report generation."
    Print #num, "// True flat pattern outlines in mm. Do not edit by hand."
    Print #num, "window.sheetMetalGeometry = {"
    Print #num, gJson
    Print #num, "};"
    Close #num

End Sub

' ------------------------------------------------------------------ helpers --
' The log is opened, written and closed on every line. A held-open file
' buffers, and a crash then loses everything written so far - which is
' exactly how this macro first appeared to do nothing at all.
Sub OpenLog()
    On Error Resume Next
    Dim n As Integer
    n = FreeFile
    Open LogPath() For Output As #n        ' truncate: fresh log each run
    Close #n
    gLogOpen = (Err.Number = 0)
    If Err.Number <> 0 Then Err.Clear
    On Error GoTo 0
End Sub

Function LogPath() As String
    LogPath = gReport & "\db\sheetmetal-geometry.log"
End Function

Sub LogIt(ByVal msg As String)
    On Error Resume Next
    Dim n As Integer
    n = FreeFile
    Open LogPath() For Append As #n
    Print #n, Format(Now, "yyyy-mm-dd hh:nn:ss") & "  " & msg
    Close #n
    If Err.Number <> 0 Then Err.Clear
    On Error GoTo 0
End Sub

Sub CloseLog()
    ' nothing to do - every line is already on disk
End Sub

' DXF always writes a dot. Str$ does too, unlike CStr under some locales.
Function Num(ByVal v As Double) As String
    Num = Trim(Str$(Int(v * 1000 + 0.5) / 1000))
End Function

Function Dbl(ByVal t As String) As Double
    Dim s As String, i As Long, ch As String
    Dim ip As Double, fr As Double, sc As Double
    Dim neg As Boolean, dot As Boolean

    s = Trim(t)
    ip = 0: fr = 0: sc = 1: neg = False: dot = False

    For i = 1 To Len(s)
        ch = Mid(s, i, 1)
        If ch = "-" And i = 1 Then
            neg = True
        ElseIf ch = "." Or ch = "," Then
            dot = True
        ElseIf ch >= "0" And ch <= "9" Then
            If dot Then
                sc = sc / 10
                fr = fr + CDbl(ch) * sc
            Else
                ip = ip * 10 + CDbl(ch)
            End If
        ElseIf ch = "e" Or ch = "E" Then
            Exit For
        End If
    Next i

    Dbl = ip + fr
    If neg Then Dbl = -Dbl

End Function

Function Clean(ByVal t As String) As String
    Dim s As String, i As Long, ch As String
    s = ""
    For i = 1 To Len(t)
        ch = Mid(t, i, 1)
        If InStr("\/:*?<>|" & Chr(34), ch) > 0 Then ch = "-"
        s = s & ch
    Next i
    Clean = s
End Function

Function JsEsc(ByVal t As String) As String
    JsEsc = Replace(Replace(t, "\", "\\"), Chr(34), "\" & Chr(34))
End Function
