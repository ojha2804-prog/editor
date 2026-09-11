' ExportFlatPatterns.bas
' Tools > Macro > New, paste, Run. Assem1 must be open.
' SWOOD sheet-metal parts are often virtual (empty GetPathName).
' This uses GetTitle, walks open documents, and calls IsSheetMetal().

Option Explicit

Const swDocPART = 1
Const swDocASSEMBLY = 2
Const swSolidBody = 0
Const swExportActionBody = 3
Const swExportSheetMetalGeometry = 1

Sub main()
    Dim swApp As SldWorks.SldWorks
    Dim swModel As ModelDoc2
    Dim fso As Object
    Dim report As String
    Dim dxfDir As String
    Dim wrote As Long
    Dim seen As Object

    Set swApp = Application.SldWorks
    Set swModel = swApp.ActiveDoc
    If swModel Is Nothing Then
        MsgBox "Open Assem1 first.", vbExclamation
        Exit Sub
    End If

    Set fso = CreateObject("Scripting.FileSystemObject")
    report = "C:\Swood Reports\2026_09\Assem1"
    If fso.FileExists("D:\SWOOD_LIBRARY 2026\DATA\DAT\apps\last-report.txt") Then
        Dim ts As Object
        Set ts = fso.OpenTextFile("D:\SWOOD_LIBRARY 2026\DATA\DAT\apps\last-report.txt", 1)
        If Not ts.AtEndOfStream Then report = Trim(ts.ReadLine)
        ts.Close
    End If
    dxfDir = report & "\dxfs"
    If Not fso.FolderExists(dxfDir) Then fso.CreateFolder dxfDir

    Set seen = CreateObject("Scripting.Dictionary")
    wrote = ExportOpenParts(swApp, dxfDir, fso, seen)
    If swModel.GetType = swDocASSEMBLY Then
        wrote = wrote + ProcessAssembly(swModel, dxfDir, fso, seen)
    ElseIf swModel.GetType = swDocPART Then
        wrote = wrote + ProcessPart(swModel, PartNameOf(swModel, fso), dxfDir, fso)
    End If

    swApp.ActivateDoc2 swModel.GetTitle, True, 0
    MsgBox "Exported " & wrote & " flat pattern DXF(s) to:" & vbCrLf & dxfDir & vbCrLf & vbCrLf & _
           "Reload the report and open Sheetmetal Layout.", vbInformation
End Sub

Function ExportOpenParts(swApp As SldWorks.SldWorks, dxfDir As String, fso As Object, seen As Object) As Long
    Dim doc As ModelDoc2
    Dim name As String
    Dim wrote As Long
    wrote = 0
    Set doc = swApp.GetFirstDocument
    Do While Not doc Is Nothing
        If doc.GetType = swDocPART Then
            name = PartNameOf(doc, fso)
            If name <> "" Then
                If Not seen.Exists(LCase$(name)) Then
                    seen.Add LCase$(name), True
                    wrote = wrote + ProcessPart(doc, name, dxfDir, fso)
                End If
            End If
        End If
        Set doc = doc.GetNext
    Loop
    ExportOpenParts = wrote
End Function

Function ProcessAssembly(assy As ModelDoc2, dxfDir As String, fso As Object, seen As Object) As Long
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
                    name = PartNameOf(doc, fso)
                    If name <> "" Then
                        If Not seen.Exists(LCase$(name)) Then
                            seen.Add LCase$(name), True
                            wrote = wrote + ProcessPart(doc, name, dxfDir, fso)
                        End If
                    End If
                End If
            End If
        End If
    Next i
    ProcessAssembly = wrote
End Function

Function ProcessPart(partModel As ModelDoc2, layoutName As String, dxfDir As String, fso As Object) As Long
    Dim bodies As Variant
    Dim j As Long
    Dim body As Body2
    Dim dest As String
    Dim wrote As Long
    Dim tryAnyway As Boolean
    wrote = 0
    tryAnyway = (InStr(1, LCase$(layoutName), "sheet metal", vbTextCompare) > 0)
    bodies = partModel.GetBodies2(swSolidBody, False)
    If IsEmpty(bodies) Then
        ProcessPart = 0
        Exit Function
    End If
    If IsArray(bodies) Then
        For j = LBound(bodies) To UBound(bodies)
            Set body = bodies(j)
            wrote = wrote + TryBody(partModel, body, layoutName, dxfDir, fso, wrote, tryAnyway)
        Next j
    Else
        Set body = bodies
        wrote = wrote + TryBody(partModel, body, layoutName, dxfDir, fso, wrote, tryAnyway)
    End If
    ProcessPart = wrote
End Function

Function TryBody(partModel As ModelDoc2, body As Body2, layoutName As String, dxfDir As String, fso As Object, already As Long, tryAnyway As Boolean) As Long
    Dim dest As String
    TryBody = 0
    If body Is Nothing Then Exit Function
    If (Not body.IsSheetMetal()) And (Not tryAnyway) Then Exit Function
    If already = 0 Then
        dest = dxfDir & "\" & SafeName(layoutName) & ".dxf"
    Else
        dest = dxfDir & "\" & SafeName(layoutName) & "_" & SafeName(body.Name) & ".dxf"
    End If
    If ExportBody(partModel, body.Name, dest) Then TryBody = 1
End Function

Function ExportBody(partModel As ModelDoc2, bodyName As String, dest As String) As Boolean
    Dim alignmentData(11) As Double
    Dim ok As Boolean
    Dim modelPath As String
    Dim swApp As SldWorks.SldWorks
    Set swApp = Application.SldWorks
    modelPath = partModel.GetPathName
    If modelPath = "" Then modelPath = partModel.GetTitle
    swApp.ActivateDoc2 partModel.GetTitle, True, 0
    ok = partModel.ExportToDWG2(dest, modelPath, swExportActionBody, True, alignmentData(11), _
        False, False, swExportSheetMetalGeometry, bodyName)
    ExportBody = ok
End Function

Function PartNameOf(doc As ModelDoc2, fso As Object) As String
    Dim p As String
    Dim t As String
    Dim i As Long
    p = doc.GetPathName
    If p <> "" Then
        PartNameOf = fso.GetBaseName(p)
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
