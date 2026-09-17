' ExportFlatPatterns.bas  —  6.19.4
' Tools > Macro > New, delete all, paste THIS WHOLE FILE, Run.
' Dialog title must be 6.19.4-sheetmetal-action.
'
' 6.19.3 opened the WD .SLDPRT (paths matched) then called ExportToDWG2
' with action 3. In SOLIDWORKS 2018+ that is ExportAnnotationViews
' (folded Front), not an unfold, so every call returned False.
' Official sheet-metal call (CodeStack / SW help):
'   PartDoc.ExportToDWG2 dest, path, 1, True, Empty, False, False, 5, Empty
'   1 = swExportToDWG_ExportSheetMetal
'   5 = flat-pattern geometry + bend lines
' Always SaveAs-copy to dxfs\_src and export THAT file so we are not
' in assembly context. CloseDoc only the copy.

Option Explicit

Const MACRO_VER = "6.19.4-sheetmetal-action"
Const swDocPART = 1
Const swDocASSEMBLY = 2
Const swSolidBody = 0
Const swExportToDWG_ExportSheetMetal = 1
Const swExportToDWG_ExportAnnotationViews = 3
Const smGeom = 1
Const smBends = 4
Const swSaveAsCurrentVersion = 0
Const swSaveAsSilentCopy = 3
Const swOpenDocSilent = 1

Dim gFso As Object
Dim gLog As String
Dim gDxfDir As String
Dim gAssyTitle As String
Dim gNOpen As Long
Dim gNSmName As Long
Dim gNSaved As Long
Dim gNOk As Long
Dim gNFail As Long

Sub main()
    Dim swApp As SldWorks.SldWorks
    Dim swModel As ModelDoc2
    Dim report As String
    Dim seen As Object
    Dim wrote As Long
    Dim ts As Object

    Set swApp = Application.SldWorks
    Set swModel = swApp.ActiveDoc
    If swModel Is Nothing Then
        MsgBox "Open Assem1 first.", vbExclamation, MACRO_VER
        Exit Sub
    End If

    Set gFso = CreateObject("Scripting.FileSystemObject")
    report = "C:\Swood Reports\2026_09\Assem1"
    If gFso.FileExists("D:\SWOOD_LIBRARY 2026\DATA\DAT\apps\last-report.txt") Then
        Set ts = gFso.OpenTextFile("D:\SWOOD_LIBRARY 2026\DATA\DAT\apps\last-report.txt", 1)
        If Not ts.AtEndOfStream Then report = Trim(ts.ReadLine)
        ts.Close
    End If
    gDxfDir = report & "\dxfs"
    If Not gFso.FolderExists(gDxfDir) Then gFso.CreateFolder gDxfDir
    If Not gFso.FolderExists(report & "\db") Then gFso.CreateFolder report & "\db"
    gLog = report & "\db\export-macro.log"
    LogLine MACRO_VER & "  " & Now
    LogLine "report " & report

    gAssyTitle = swModel.GetTitle
    gNOpen = 0: gNSmName = 0: gNSaved = 0: gNOk = 0: gNFail = 0
    Set seen = CreateObject("Scripting.Dictionary")
    wrote = ExportOpenParts(swApp, seen)
    If swModel.GetType = swDocASSEMBLY Then
        wrote = wrote + ProcessAssembly(swModel, seen)
    ElseIf swModel.GetType = swDocPART Then
        wrote = wrote + ProcessPart(swModel, PartNameOf(swModel))
    End If

    On Error Resume Next
    swApp.ActivateDoc2 gAssyTitle, True, 0
    On Error GoTo 0

    MsgBox MACRO_VER & vbCrLf & vbCrLf & _
        "Open parts seen: " & gNOpen & vbCrLf & _
        "Named 'sheet metal': " & gNSmName & vbCrLf & _
        "Copies written: " & gNSaved & vbCrLf & _
        "Flat DXFs written: " & gNOk & vbCrLf & _
        "Export failed: " & gNFail & vbCrLf & vbCrLf & _
        "DXFs: " & gDxfDir & vbCrLf & _
        "Log: " & gLog, vbInformation, MACRO_VER
End Sub

Sub LogLine(s As String)
    Dim ts As Object
    On Error Resume Next
    Set ts = gFso.OpenTextFile(gLog, 8, True)
    ts.WriteLine s
    ts.Close
    On Error GoTo 0
End Sub

Function ExportOpenParts(swApp As SldWorks.SldWorks, seen As Object) As Long
    Dim doc As ModelDoc2
    Dim name As String
    Dim wrote As Long
    wrote = 0
    Set doc = swApp.GetFirstDocument
    Do While Not doc Is Nothing
        If doc.GetType = swDocPART Then
            gNOpen = gNOpen + 1
            name = PartNameOf(doc)
            If name <> "" Then
                If Not seen.Exists(LCase$(name)) Then
                    seen.Add LCase$(name), True
                    wrote = wrote + ProcessPart(doc, name)
                End If
            End If
        End If
        Set doc = doc.GetNext
    Loop
    ExportOpenParts = wrote
End Function

Function ProcessAssembly(assy As ModelDoc2, seen As Object) As Long
    Dim comps As Variant
    Dim i As Long
    Dim comp As Component2
    Dim doc As ModelDoc2
    Dim name As String
    Dim wrote As Long
    wrote = 0
    comps = assy.GetComponents(False)
    If IsEmpty(comps) Then
        ProcessAssembly = 0
        Exit Function
    End If
    For i = LBound(comps) To UBound(comps)
        Set comp = comps(i)
        If Not comp Is Nothing Then
            Set doc = comp.GetModelDoc2
            If Not doc Is Nothing Then
                If doc.GetType = swDocPART Then
                    name = PartNameOf(doc)
                    If name <> "" Then
                        If Not seen.Exists(LCase$(name)) Then
                            seen.Add LCase$(name), True
                            wrote = wrote + ProcessPart(doc, name)
                        End If
                    End If
                End If
            End If
        End If
    Next i
    ProcessAssembly = wrote
End Function

Function ProcessPart(partModel As ModelDoc2, layoutName As String) As Long
    Dim tryAnyway As Boolean
    tryAnyway = (InStr(1, LCase$(layoutName), "sheet metal", vbTextCompare) > 0)
    If tryAnyway Then gNSmName = gNSmName + 1
    If (Not tryAnyway) And (Not PartHasSmBody(partModel)) Then
        ProcessPart = 0
        Exit Function
    End If
    ProcessPart = UnfoldFromSaved(partModel, layoutName)
End Function

Function PartHasSmBody(partModel As ModelDoc2) As Boolean
    Dim bodies As Variant
    Dim j As Long
    Dim body As Body2
    Dim sm As Boolean
    PartHasSmBody = False
    On Error Resume Next
    bodies = partModel.GetBodies2(swSolidBody, False)
    If IsEmpty(bodies) Then Exit Function
    If IsArray(bodies) Then
        For j = LBound(bodies) To UBound(bodies)
            Set body = bodies(j)
            sm = False
            sm = body.IsSheetMetal()
            If sm Then
                PartHasSmBody = True
                On Error GoTo 0
                Exit Function
            End If
        Next j
    Else
        Set body = bodies
        PartHasSmBody = body.IsSheetMetal()
    End If
    On Error GoTo 0
End Function

Function UnfoldFromSaved(partModel As ModelDoc2, layoutName As String) As Long
    Dim swApp As SldWorks.SldWorks
    Dim copyPath As String
    Dim opened As ModelDoc2
    Dim swPart As Object
    Dim dest As String
    Dim errs As Long
    Dim warns As Long
    Dim closeCopy As Boolean
    Dim cfg As String
    Dim names As Variant
    Dim how As String
    Dim nBodies As Long
    Dim wrote As Long
    Dim bi As Long
    Dim destBody As String

    UnfoldFromSaved = 0
    Set swApp = Application.SldWorks
    copyPath = MakeDetachedCopy(partModel, layoutName)
    If copyPath = "" Then
        copyPath = SavedModelPath(partModel, layoutName)
    End If
    If copyPath = "" Then
        gNFail = gNFail + 1
        LogLine "  FAIL no .sldprt: " & layoutName
        Exit Function
    End If

    dest = gDxfDir & "\" & SafeName(layoutName) & ".dxf"
    If gFso.FileExists(dest) Then
        On Error Resume Next
        gFso.DeleteFile dest, True
        On Error GoTo 0
    End If

    cfg = ""
    On Error Resume Next
    cfg = partModel.ConfigurationManager.ActiveConfiguration.Name
    On Error GoTo 0

    closeCopy = False
    Set opened = Nothing
    If StrComp(copyPath, CStr(partModel.GetPathName), vbTextCompare) = 0 Then
        Set opened = partModel
    Else
        errs = 0
        warns = 0
        On Error Resume Next
        Set opened = swApp.OpenDoc6(copyPath, swDocPART, swOpenDocSilent, cfg, errs, warns)
        On Error GoTo 0
        If opened Is Nothing Then
            On Error Resume Next
            Set opened = swApp.OpenDoc6(copyPath, swDocPART, swOpenDocSilent, "", errs, warns)
            On Error GoTo 0
        End If
        If Not opened Is Nothing Then
            If opened Is partModel Then
                Set opened = partModel
                closeCopy = False
            ElseIf opened.GetType = swDocPART Then
                closeCopy = True
            End If
        End If
    End If
    If opened Is Nothing Then
        gNFail = gNFail + 1
        LogLine "  FAIL OpenDoc6 " & layoutName & " err=" & errs & " " & copyPath
        Exit Function
    End If

    On Error Resume Next
    swApp.ActivateDoc2 opened.GetTitle, True, 0
    Set swPart = swApp.ActiveDoc
    If swPart Is Nothing Then Set swPart = opened
    On Error GoTo 0

    LogLine "  unfold " & layoutName & " from " & opened.GetPathName & _
        " cfg=" & cfg & " inAssy=" & CStr(opened Is partModel)

    how = ""
    names = BodyNamesOf(opened)
    nBodies = 0
    If Not IsEmpty(names) Then
        If IsArray(names) Then nBodies = UBound(names) - LBound(names) + 1
    End If
    If nBodies > 1 Then
        wrote = 0
        For bi = LBound(names) To UBound(names)
            destBody = gDxfDir & "\" & SafeName(layoutName) & "-" & SafeName(CStr(names(bi))) & ".dxf"
            If TryDxf(swPart, destBody, opened.GetPathName, swExportToDWG_ExportSheetMetal, smGeom + smBends, Array(CStr(names(bi))), "SM-body") Then
                wrote = wrote + 1
                LogLine "  OK body " & CStr(names(bi)) & " " & destBody
            ElseIf TryDxf(swPart, destBody, opened.GetPathName, swExportToDWG_ExportSheetMetal, smGeom, Array(CStr(names(bi))), "SM-body-geom") Then
                wrote = wrote + 1
                LogLine "  OK body-geom " & CStr(names(bi)) & " " & destBody
            End If
        Next bi
        If wrote > 0 Then
            how = "SM-bodies-separate x" & wrote
            dest = gDxfDir & "\" & SafeName(layoutName) & "-" & SafeName(CStr(names(LBound(names)))) & ".dxf"
        End If
    End If
    If how = "" Then
        If TryDxf(swPart, dest, opened.GetPathName, swExportToDWG_ExportSheetMetal, smGeom + smBends, Empty, "SM+bends") Then
            how = "SM+bends"
        ElseIf TryDxf(swPart, dest, opened.GetPathName, swExportToDWG_ExportSheetMetal, smGeom, Empty, "SM-geom") Then
            how = "SM-geom"
        ElseIf Not IsEmpty(names) Then
            If TryDxf(swPart, dest, opened.GetPathName, swExportToDWG_ExportSheetMetal, smGeom + smBends, names, "SM-bodies") Then
                how = "SM-bodies"
            End If
        End If
    End If

    On Error Resume Next
    If closeCopy Then swApp.CloseDoc opened.GetTitle
    If gAssyTitle <> "" Then swApp.ActivateDoc2 gAssyTitle, True, 0
    On Error GoTo 0

    If gFso.FileExists(dest) Then
        gNOk = gNOk + 1
        LogLine "  OK " & how & " " & dest & " " & gFso.GetFile(dest).Size & " bytes"
        UnfoldFromSaved = 1
    Else
        gNFail = gNFail + 1
        LogLine "  FAIL sheet-metal ExportToDWG2 " & layoutName
    End If
End Function

Function TryDxf(swPart As Object, dest As String, modelPath As String, action As Long, opts As Long, spec As Variant, tag As String) As Boolean
    Dim ok As Boolean
    TryDxf = False
    If swPart Is Nothing Then Exit Function
    If gFso.FileExists(dest) Then
        On Error Resume Next
        gFso.DeleteFile dest, True
        On Error GoTo 0
    End If
    ok = False
    On Error Resume Next
    ok = swPart.ExportToDWG2(dest, modelPath, action, True, Empty, False, False, opts, spec)
    LogLine "  try " & tag & " action=" & action & " opts=" & opts & _
        " ok=" & CStr(ok) & " err=" & Err.Number & " file=" & CStr(gFso.FileExists(dest))
    Err.Clear
    On Error GoTo 0
    TryDxf = gFso.FileExists(dest)
End Function

Function BodyNamesOf(partModel As ModelDoc2) As Variant
    Dim bodies As Variant
    Dim j As Long
    Dim n As Long
    Dim body As Body2
    Dim names As Variant
    n = 0
    BodyNamesOf = Empty
    On Error Resume Next
    bodies = partModel.GetBodies2(swSolidBody, False)
    If IsArray(bodies) Then
        For j = LBound(bodies) To UBound(bodies)
            Set body = bodies(j)
            If Not body Is Nothing Then
                If CStr(body.Name) <> "" Then
                    ReDim Preserve names(n)
                    names(n) = CStr(body.Name)
                    n = n + 1
                End If
            End If
        Next j
    End If
    On Error GoTo 0
    If n > 0 Then BodyNamesOf = names
End Function

' Always write dxfs\_src\<name>.sldprt so ExportToDWG2 is not in assembly context.
Function MakeDetachedCopy(partModel As ModelDoc2, layoutName As String) As String
    Dim srcDir As String
    Dim dest As String
    Dim p As String
    Dim ok As Boolean
    Dim errs As Long
    Dim warns As Long

    MakeDetachedCopy = ""
    srcDir = gDxfDir & "\_src"
    If Not gFso.FolderExists(srcDir) Then gFso.CreateFolder srcDir
    dest = srcDir & "\" & SafeName(layoutName) & ".sldprt"
    If gFso.FileExists(dest) Then
        On Error Resume Next
        gFso.DeleteFile dest, True
        On Error GoTo 0
    End If

    errs = 0
    warns = 0
    ok = False
    On Error Resume Next
    ok = partModel.Extension.SaveAs(dest, swSaveAsCurrentVersion, swSaveAsSilentCopy, Nothing, errs, warns)
    On Error GoTo 0
    If gFso.FileExists(dest) Then
        If StrComp(dest, CStr(partModel.GetPathName), vbTextCompare) <> 0 Then
            gNSaved = gNSaved + 1
            LogLine "  detached " & layoutName & " → " & dest
            MakeDetachedCopy = dest
            Exit Function
        End If
    End If

    p = partModel.GetPathName
    If p <> "" Then
        If gFso.FileExists(p) Then
            On Error Resume Next
            gFso.CopyFile p, dest, True
            On Error GoTo 0
            If gFso.FileExists(dest) Then
                If StrComp(dest, p, vbTextCompare) <> 0 Then
                    gNSaved = gNSaved + 1
                    LogLine "  file-copied " & layoutName & " → " & dest
                    MakeDetachedCopy = dest
                    Exit Function
                End If
            End If
        End If
        LogLine "  in-place " & p
        MakeDetachedCopy = p
        Exit Function
    End If

    LogLine "  FAIL detach " & layoutName & " err=" & errs & " warn=" & warns
End Function

Function SavedModelPath(partModel As ModelDoc2, layoutName As String) As String
    SavedModelPath = MakeDetachedCopy(partModel, layoutName)
End Function

Function PartNameOf(doc As ModelDoc2) As String
    Dim p As String
    Dim t As String
    Dim i As Long
    p = doc.GetPathName
    If p <> "" Then
        PartNameOf = gFso.GetBaseName(p)
        Exit Function
    End If
    t = doc.GetTitle
    i = InStr(t, "^")
    If i > 1 Then t = Left$(t, i - 1)
    If LCase$(Right$(t, 7)) = ".sldprt" Then t = Left$(t, Len(t) - 7)
    PartNameOf = t
End Function

Function SafeName(s As String) As String
    Dim r As String
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
    SafeName = r
End Function
