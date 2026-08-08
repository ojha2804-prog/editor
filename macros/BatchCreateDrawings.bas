'==============================================================================
' SolidWorks Macro: BatchCreateDrawings
' NOTE: Do NOT paste "Attribute VB_Name = ..." into SolidWorks Module1 —
' that line causes a compile error. Use Tools > Macro > New, then paste.
' Creates drawings for every Part/Assembly in a folder.
' Assemblies get an Exploded sheet with BOM + auto-balloons (same idea as
' CreateDrawing.bas). Prefer CreateDrawing.bas for interactive single-file use.
'
' Usage:
'   1. Import this module (and optionally CreateDrawing.bas) into a macro project
'   2. Set FOLDER_PATH
'   3. Run BatchCreateDrawings.main
'==============================================================================

Option Explicit

Private Const FOLDER_PATH As String = "C:\CAD\Parts"
Private Const INCLUDE_SUBFOLDERS As Boolean = False
Private Const PROCESS_PARTS As Boolean = True
Private Const PROCESS_ASSEMBLIES As Boolean = True
Private Const SKIP_EXISTING As Boolean = True

' Assembly extras (match CreateDrawing defaults)
Private Const ADD_EXPLODED_VIEW As Boolean = True
Private Const ADD_BOM As Boolean = True
Private Const ADD_AUTO_BALLOONS As Boolean = True
Private Const AUTO_CREATE_EXPLODE As Boolean = True
Private Const EXPLODED_SHEET_NAME As String = "Exploded"
Private Const EXPORT_PDF As Boolean = True
Private Const EXPORT_IMAGES As Boolean = True
Private Const IMAGE_EXTENSION As String = "png"

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
    Dim subFolder As String
    
    If Right$(folder, 1) <> "\" Then folder = folder & "\"
    
    If PROCESS_PARTS Then
        fileName = Dir$(folder & "*.sldprt")
        Do While Len(fileName) > 0
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
    Dim swAsm As SldWorks.AssemblyDoc
    Dim swDraw As SldWorks.DrawingDoc
    Dim drawingPath As String
    Dim errors As Long
    Dim warnings As Long
    Dim docType As Long
    Dim ok As Boolean
    Dim templatePath As String
    Dim swView As SldWorks.View
    Dim explodeName As String
    Dim explodeView As SldWorks.View
    
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
    
    explodeName = ""
    If docType = swDocASSEMBLY And ADD_EXPLODED_VIEW Then
        Set swAsm = swModel
        explodeName = EnsureExplode(swModel, swAsm)
        If Len(explodeName) > 0 Then
            On Error Resume Next
            swAsm.ShowExploded2 True, explodeName
            On Error GoTo fail
        End If
    End If
    
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
    
    If docType = swDocASSEMBLY And Len(explodeName) > 0 Then
        ok = swDraw.NewSheet3(EXPLODED_SHEET_NAME, swDwgPaperA3size, swDwgTemplateNone, 1, 1, True, "", 0.42, 0.297, "")
        swDraw.ActivateSheet EXPLODED_SHEET_NAME
        
        Set explodeView = swDraw.CreateDrawViewFromModelView3(modelPath, "*Isometric", 0.19, 0.14, 0#)
        If Not explodeView Is Nothing Then
            explodeView.UseSheetScale = True
            explodeView.SetDisplayMode3 False, swSHADED, False, True
            On Error Resume Next
            explodeView.ShowExploded = True
            On Error GoTo failCloseAll
            
            If ADD_BOM Then
                On Error Resume Next
                explodeView.InsertBomTable2 False, 0.01, 0.28, _
                    swBOMConfigurationAnchor_TopLeft, swBomType_TopLevelOnly, "", ""
                On Error GoTo failCloseAll
            End If
            
            If ADD_AUTO_BALLOONS Then
                AutoBalloonSilent swDraw, explodeView
            End If
        End If
    End If
    
    swDraw.ForceRebuild3 False
    ok = swDraw.Extension.SaveAs(drawingPath, 0, swSaveAsOptions_Silent, Nothing, errors, warnings)
    
    If ok Then
        If EXPORT_PDF Then ExportPdfSilent swDraw, drawingPath
        If EXPORT_IMAGES Then ExportImagesSilent swDraw, drawingPath
        gCreated = gCreated + 1
    Else
        gFailed = gFailed + 1
    End If
    
    swApp.CloseDoc swDraw.GetTitle
    swApp.CloseDoc swModel.GetTitle
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

Private Sub ExportPdfSilent(ByVal swDraw As SldWorks.DrawingDoc, ByVal drawingPath As String)
    Dim swModel As SldWorks.ModelDoc2
    Dim swExpData As Object
    Dim pdfPath As String
    Dim sheetNames As Variant
    Dim errors As Long
    Dim warnings As Long
    
    On Error Resume Next
    Set swModel = swDraw
    pdfPath = Left$(drawingPath, InStrRev(drawingPath, ".") - 1) & ".pdf"
    Set swExpData = swApp.GetExportFileData(1)
    sheetNames = swDraw.GetSheetNames
    swExpData.ExportAs3D = False
    swExpData.ViewPdfAfterSaving = False
    swExpData.SetSheets swExportData_ExportAllSheets, sheetNames
    swModel.Extension.SaveAs pdfPath, 0, swSaveAsOptions_Silent, swExpData, errors, warnings
    On Error GoTo 0
End Sub

Private Sub ExportImagesSilent(ByVal swDraw As SldWorks.DrawingDoc, ByVal drawingPath As String)
    Dim swModel As SldWorks.ModelDoc2
    Dim sheetNames As Variant
    Dim i As Long
    Dim sheetName As String
    Dim imgPath As String
    Dim basePath As String
    Dim errors As Long
    Dim warnings As Long
    
    On Error Resume Next
    Set swModel = swDraw
    basePath = Left$(drawingPath, InStrRev(drawingPath, ".") - 1)
    sheetNames = swDraw.GetSheetNames
    If Not IsArray(sheetNames) Then Exit Sub
    
    For i = LBound(sheetNames) To UBound(sheetNames)
        sheetName = CStr(sheetNames(i))
        swDraw.ActivateSheet sheetName
        swModel.ViewZoomtofit2
        imgPath = basePath & "_" & Replace$(Replace$(sheetName, " ", "_"), "/", "_") & "." & IMAGE_EXTENSION
        swModel.Extension.SaveAs imgPath, 0, swSaveAsOptions_Silent, Nothing, errors, warnings
    Next i
    On Error GoTo 0
End Sub

Private Function EnsureExplode(ByVal swModel As SldWorks.ModelDoc2, _
                               ByVal swAsm As SldWorks.AssemblyDoc) As String
    Dim names As Variant
    Dim errors As Long
    Dim warnings As Long
    
    On Error Resume Next
    names = swAsm.GetExplodedViewNames2("")
    If Not IsArray(names) Then names = swAsm.GetExplodedViewNames
    On Error GoTo 0
    
    If IsArray(names) Then
        If UBound(names) >= LBound(names) Then
            If Len(CStr(names(LBound(names)))) > 0 Then
                EnsureExplode = CStr(names(LBound(names)))
                Exit Function
            End If
        End If
    End If
    
    If Not AUTO_CREATE_EXPLODE Then
        EnsureExplode = ""
        Exit Function
    End If
    
    On Error Resume Next
    swAsm.AutoExplode
    On Error GoTo 0
    swModel.EditRebuild3
    swModel.Save3 swSaveAsOptions_Silent, errors, warnings
    
    On Error Resume Next
    names = swAsm.GetExplodedViewNames2("")
    If Not IsArray(names) Then names = swAsm.GetExplodedViewNames
    On Error GoTo 0
    
    If IsArray(names) Then
        If UBound(names) >= LBound(names) Then
            EnsureExplode = CStr(names(UBound(names)))
            Exit Function
        End If
    End If
    EnsureExplode = ""
End Function

Private Sub AutoBalloonSilent(ByVal swDraw As SldWorks.DrawingDoc, ByVal swView As SldWorks.View)
    Dim swModelDoc As SldWorks.ModelDoc2
    Dim opts As Object
    
    On Error Resume Next
    Set swModelDoc = swDraw
    swModelDoc.Extension.SelectByID2 swView.Name, "DRAWINGVIEW", 0, 0, 0, False, 0, Nothing, 0
    swDraw.ActivateView swView.Name
    
    Set opts = swModelDoc.CreateAutoBalloonOptions()
    If opts Is Nothing Then Exit Sub
    
    opts.Layout = 1
    opts.ReverseDirection = False
    opts.IgnoreMultiple = True
    opts.InsertMagneticLine = True
    opts.LeaderAttachmentToFaces = True
    opts.Style = swBS_Circular
    opts.Size = swBF_Fit
    opts.UpperTextContent = swBalloonTextItemNumber
    opts.UpperText = ""
    opts.Layername = "-None-"
    opts.ItemNumberStart = 1
    opts.ItemNumberIncrement = 1
    opts.ItemOrder = swBalloonItemNumbers_DoNotChangeItemNumbers
    opts.EditBalloons = True
    opts.EditBalloonOption = swEditBalloonOption_Resequence
    
    swModelDoc.AutoBalloon5 opts
    swModelDoc.ClearSelection2 True
    On Error GoTo 0
End Sub
