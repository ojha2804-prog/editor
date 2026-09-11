' ExportFlatPatterns.bas  —  6.19.2
' Tools > Macro > New, paste THIS WHOLE FILE, Run. Assem1 open.
' The first line of the dialog must say 6.19.2 — otherwise this is not the new file.
'
' Why previous runs exported 0:
'   SWOOD "Copy of SHEET METAL_*" parts are VIRTUAL. GetPathName is empty.
'   ExportToDWG2 refuses to unfold a part that has no file on disk.
' This version SaveAs-copies them to dxfs\_src, then unfolds.

Option Explicit

Const MACRO_VER = "6.19.2-save-virtual"
Const swDocPART = 1
Const swDocASSEMBLY = 2
Const swSolidBody = 0
Const swExportActionBody = 3
Const swExportSheetMetalGeometry = 1
Const swSaveAsCurrentVersion = 0
Const swSaveAsSilentCopy = 3

Dim gFso As Object
Dim gLog As String
Dim gDxfDir As String
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

    gNOpen = 0: gNSmName = 0: gNSaved = 0: gNOk = 0: gNFail = 0
    Set seen = CreateObject("Scripting.Dictionary")
    wrote = ExportOpenParts(swApp, seen)
    If swModel.GetType = swDocASSEMBLY Then
        wrote = wrote + ProcessAssembly(swModel, seen)
    ElseIf swModel.GetType = swDocPART Then
        wrote = wrote + ProcessPart(swModel, PartNameOf(swModel))
    End If

    On Error Resume Next
    swApp.ActivateDoc2 swModel.GetTitle, True, 0
    On Error GoTo 0

    MsgBox MACRO_VER & vbCrLf & vbCrLf & _
        "Open parts seen: " & gNOpen & vbCrLf & _
        "Named 'sheet metal': " & gNSmName & vbCrLf & _
        "Virtual parts saved: " & gNSaved & vbCrLf & _
        "Flat DXFs written: " & gNOk & vbCrLf & _
        "ExportToDWG2 failed: " & gNFail & vbCrLf & vbCrLf & _
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
    Dim bodies As Variant
    Dim j As Long
    Dim body As Body2
    Dim wrote As Long
    Dim tryAnyway As Boolean
    wrote = 0
    tryAnyway = (InStr(1, LCase$(layoutName), "sheet metal", vbTextCompare) > 0)
    If tryAnyway Then gNSmName = gNSmName + 1
    bodies = partModel.GetBodies2(swSolidBody, False)
    If IsEmpty(bodies) Then
        LogLine "  " & layoutName & ": GetBodies2 empty"
        ProcessPart = 0
        Exit Function
    End If
    If IsArray(bodies) Then
        For j = LBound(bodies) To UBound(bodies)
            Set body = bodies(j)
            wrote = wrote + TryBody(partModel, body, layoutName, wrote, tryAnyway)
        Next j
    Else
        Set body = bodies
        wrote = wrote + TryBody(partModel, body, layoutName, wrote, tryAnyway)
    End If
    If wrote = 0 Then LogLine "  " & layoutName & ": 0 unfolds"
    ProcessPart = wrote
End Function

Function TryBody(partModel As ModelDoc2, body As Body2, layoutName As String, already As Long, tryAnyway As Boolean) As Long
    Dim dest As String
    Dim sm As Boolean
    TryBody = 0
    If body Is Nothing Then Exit Function
    sm = False
    On Error Resume Next
    sm = body.IsSheetMetal()
    On Error GoTo 0
    If (Not sm) And (Not tryAnyway) Then Exit Function
    If already = 0 Then
        dest = gDxfDir & "\" & SafeName(layoutName) & ".dxf"
    Else
        dest = gDxfDir & "\" & SafeName(layoutName) & "_" & SafeName(body.Name) & ".dxf"
    End If
    If ExportBody(partModel, body.Name, dest, layoutName) Then TryBody = 1
End Function

Function ExportBody(partModel As ModelDoc2, bodyName As String, dest As String, layoutName As String) As Boolean
    Dim alignmentData(11) As Double
    Dim ok As Boolean
    Dim modelPath As String
    Dim names As Variant
    Dim swApp As SldWorks.SldWorks

    ExportBody = False
    Set swApp = Application.SldWorks
    modelPath = SavedModelPath(partModel, layoutName)
    If modelPath = "" Then
        gNFail = gNFail + 1
        LogLine "  FAIL no .sldprt path: " & layoutName
        Exit Function
    End If

    On Error Resume Next
    swApp.ActivateDoc2 partModel.GetTitle, True, 0
    On Error GoTo 0

    names = Array(bodyName)
    ok = False
    On Error Resume Next
    ok = partModel.ExportToDWG2(dest, modelPath, swExportActionBody, True, alignmentData(11), _
        False, False, swExportSheetMetalGeometry, names)
    If (Not ok) Then
        ok = partModel.ExportToDWG2(dest, modelPath, swExportActionBody, True, alignmentData(11), _
            False, False, swExportSheetMetalGeometry, bodyName)
    End If
    On Error GoTo 0

    If ok And gFso.FileExists(dest) Then
        gNOk = gNOk + 1
        LogLine "  OK " & dest & " " & gFso.GetFile(dest).Size & " bytes"
        ExportBody = True
    Else
        gNFail = gNFail + 1
        LogLine "  FAIL ExportToDWG2 " & layoutName & " body=" & bodyName
    End If
End Function

Function SavedModelPath(partModel As ModelDoc2, layoutName As String) As String
    Dim p As String
    Dim srcDir As String
    Dim dest As String
    Dim ok As Boolean
    Dim errs As Long
    Dim warns As Long

    p = partModel.GetPathName
    If p <> "" Then
        SavedModelPath = p
        Exit Function
    End If

    srcDir = gDxfDir & "\_src"
    If Not gFso.FolderExists(srcDir) Then gFso.CreateFolder srcDir
    dest = srcDir & "\" & SafeName(layoutName) & ".sldprt"
    errs = 0
    warns = 0
    ok = False
    On Error Resume Next
    ok = partModel.Extension.SaveAs(dest, swSaveAsCurrentVersion, swSaveAsSilentCopy, Nothing, errs, warns)
    On Error GoTo 0
    If gFso.FileExists(dest) Then
        gNSaved = gNSaved + 1
        LogLine "  saved virtual " & layoutName & " → " & dest
        SavedModelPath = dest
    Else
        LogLine "  SaveAs failed " & layoutName & " err=" & errs & " warn=" & warns
        SavedModelPath = ""
    End If
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
