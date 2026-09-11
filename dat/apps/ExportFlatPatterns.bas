' ExportFlatPatterns.bas
' Run FROM INSIDE SOLIDWORKS: Tools > Macro > New, paste this, Run.
' Same ExportToDWG2 call as the shop macro. Writes unfolds into the
' report dxfs folder (C:\Swood Reports\2026_09\Assem1\dxfs by default).
'
' Use this if the cscript .cmd still cannot talk to SOLIDWORKS.

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

    wrote = 0
    If swModel.GetType = swDocASSEMBLY Then
        wrote = ProcessAssembly(swModel, dxfDir, fso)
    ElseIf swModel.GetType = swDocPART Then
        wrote = ProcessPart(swModel, FileBase(swModel.GetPathName, fso), dxfDir, fso)
    End If

    MsgBox "Exported " & wrote & " flat pattern DXF(s) to:" & vbCrLf & dxfDir & vbCrLf & vbCrLf & _
           "Reload the report and open Sheetmetal Layout.", vbInformation
End Sub

Function ProcessAssembly(assy As ModelDoc2, dxfDir As String, fso As Object) As Long
    Dim comps As Variant
    Dim i As Long
    Dim comp As Component2
    Dim doc As ModelDoc2
    Dim seen As Object
    Dim name As String
    Dim wrote As Long
    Set seen = CreateObject("Scripting.Dictionary")
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
                    name = FileBase(doc.GetPathName, fso)
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
    wrote = 0
    bodies = partModel.GetBodies2(swSolidBody, False)
    If IsEmpty(bodies) Then
        ProcessPart = 0
        Exit Function
    End If
    For j = LBound(bodies) To UBound(bodies)
        Set body = bodies(j)
        If Not body Is Nothing Then
            If body.IsSheetMetal Then
                If wrote = 0 Then
                    dest = dxfDir & "\" & SafeName(layoutName) & ".dxf"
                Else
                    dest = dxfDir & "\" & SafeName(layoutName) & "_" & SafeName(body.Name) & ".dxf"
                End If
                If ExportBody(partModel, body.Name, dest) Then wrote = wrote + 1
            End If
        End If
    Next j
    ProcessPart = wrote
End Function

Function ExportBody(partModel As ModelDoc2, bodyName As String, dest As String) As Boolean
    Dim alignmentData(11) As Double
    Dim ok As Boolean
    Dim modelPath As String
    modelPath = partModel.GetPathName
    If modelPath = "" Then modelPath = partModel.GetTitle
    ok = partModel.ExportToDWG2(dest, modelPath, swExportActionBody, True, alignmentData(11), _
        False, False, swExportSheetMetalGeometry, bodyName)
    ExportBody = ok
End Function

Function FileBase(path As String, fso As Object) As String
    If path = "" Then
        FileBase = ""
    Else
        FileBase = fso.GetBaseName(path)
    End If
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
