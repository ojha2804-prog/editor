Attribute VB_Name = "BatchCreateDrawings"
'==============================================================================
' SolidWorks Macro: BatchCreateDrawings
' Creates drawings for every Part/Assembly in a folder (non-recursive).
'
' Depends on CreateDrawing.bas helpers being available in the same macro
' project, OR run Standalone mode below (self-contained).
'
' Usage:
'   1. Import CreateDrawing.bas and this module into one macro project
'   2. Set FOLDER_PATH
'   3. Run BatchCreateDrawings.main
'==============================================================================

Option Explicit

' Folder containing .sldprt / .sldasm files (no trailing requirement)
Private Const FOLDER_PATH As String = "C:\CAD\Parts"

' Process subfolders too
Private Const INCLUDE_SUBFOLDERS As Boolean = False

' File types to process
Private Const PROCESS_PARTS As Boolean = True
Private Const PROCESS_ASSEMBLIES As Boolean = True

' Skip if drawing already exists
Private Const SKIP_EXISTING As Boolean = True

Dim swApp As SldWorks.SldWorks
Dim gCreated As Long
Dim gSkipped As Long
Dim gFailed As Long

Sub main()
    Dim folder As String
    
    Set swApp = Application.SldWorks
    If swApp Is Nothing Then Exit Sub
    
    folder = Trim$(FOLDER_PATH)
    If Len(folder) = 0 Or Dir$(folder, vbDirectory) = "" Then
        MsgBox "Set FOLDER_PATH to a valid folder in BatchCreateDrawings.bas", _
               vbExclamation, "BatchCreateDrawings"
        Exit Sub
    End If
    
    gCreated = 0
    gSkipped = 0
    gFailed = 0
    
    ProcessFolder folder
    
    MsgBox "Batch complete." & vbCrLf & _
           "Created: " & gCreated & vbCrLf & _
           "Skipped: " & gSkipped & vbCrLf & _
           "Failed:  " & gFailed, vbInformation, "BatchCreateDrawings"
End Sub

Private Sub ProcessFolder(ByVal folder As String)
    Dim fileName As String
    Dim fullPath As String
    Dim subFolder As String
    
    If Right$(folder, 1) <> "\" Then folder = folder & "\"
    
    If PROCESS_PARTS Then
        fileName = Dir$(folder & "*.sldprt")
        Do While Len(fileName) > 0
            ' Skip SolidWorks temp files (~$...)
            If Left$(fileName, 2) <> "~$" Then
                CreateDrawingForFile folder & fileName
            End If
            fileName = Dir$
        Loop
    End If
    
    If PROCESS_ASSEMBLIES Then
        fileName = Dir$(folder & "*.sldasm")
        Do While Len(fileName) > 0
            If Left$(fileName, 2) <> "~$" Then
                CreateDrawingForFile folder & fileName
            End If
            fileName = Dir$
        Loop
    End If
    
    If INCLUDE_SUBFOLDERS Then
        subFolder = Dir$(folder & "*", vbDirectory)
        Do While Len(subFolder) > 0
            If subFolder <> "." And subFolder <> ".." Then
                If (GetAttr(folder & subFolder) And vbDirectory) = vbDirectory Then
                    ProcessFolder folder & subFolder
                End If
            End If
            subFolder = Dir$
        Loop
    End If
End Sub

Private Sub CreateDrawingForFile(ByVal modelPath As String)
    Dim swModel As SldWorks.ModelDoc2
    Dim swDraw As SldWorks.DrawingDoc
    Dim drawingPath As String
    Dim errors As Long
    Dim warnings As Long
    Dim docType As Long
    Dim ok As Boolean
    Dim templatePath As String
    Dim swView As SldWorks.View
    
    drawingPath = Left$(modelPath, InStrRev(modelPath, ".") - 1) & ".SLDDRW"
    
    If SKIP_EXISTING And Dir$(drawingPath) <> "" Then
        gSkipped = gSkipped + 1
        Exit Sub
    End If
    
    On Error GoTo fail
    
    docType = swDocPART
    If LCase$(Right$(modelPath, 7)) = ".sldasm" Then docType = swDocASSEMBLY
    
    Set swModel = swApp.OpenDoc6(modelPath, docType, swOpenDocOptions_Silent, "", errors, warnings)
    If swModel Is Nothing Then GoTo fail
    
    templatePath = swApp.GetUserPreferenceStringValue(swDefaultTemplateDrawing)
    If Len(templatePath) > 0 And Dir$(templatePath) <> "" Then
        Set swDraw = swApp.NewDocument(templatePath, 0, 0#, 0#)
    Else
        Set swDraw = swApp.NewDocument("", swDwgPaperA3size, 0.42, 0.297)
    End If
    If swDraw Is Nothing Then GoTo failCloseModel
    
    ok = swDraw.Create3rdAngleViews2(modelPath)
    If Not ok Then GoTo failCloseAll
    
    Set swView = swDraw.CreateDrawViewFromModelView3(modelPath, "*Isometric", 0.33, 0.22, 0#)
    If Not swView Is Nothing Then
        swView.UseSheetScale = True
        swView.SetDisplayMode3 False, swSHADED, False, True
    End If
    
    swDraw.ForceRebuild3 False
    ok = swDraw.Extension.SaveAs(drawingPath, 0, swSaveAsOptions_Silent, Nothing, errors, warnings)
    
    swApp.CloseDoc swDraw.GetTitle
    swApp.CloseDoc swModel.GetTitle
    
    If ok Then
        gCreated = gCreated + 1
    Else
        gFailed = gFailed + 1
    End If
    Exit Sub
    
failCloseAll:
    On Error Resume Next
    swApp.CloseDoc swDraw.GetTitle
failCloseModel:
    On Error Resume Next
    swApp.CloseDoc swModel.GetTitle
fail:
    gFailed = gFailed + 1
End Sub
