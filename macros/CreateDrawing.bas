'==============================================================================
' SolidWorks Macro: CreateDrawing
' NOTE: Do NOT keep "Attribute VB_Name = ..." in this file when pasting into
' SolidWorks Macro > New (Module1). That line causes a compile error.
' Prefer: Tools > Macro > New, delete the default code, paste this module.
' Creates a drawing from the active Part or Assembly.
'
' What it does:
'   1. Uses the active Part (.sldprt) or Assembly (.sldasm)
'   2. Opens a new drawing from your template (or SolidWorks default)
'   3. Inserts 3rd-angle standard views + an isometric view
'   4. For assemblies:
'        - AutoExplode (or reuse an existing explode)
'        - Adds a sheet with an exploded isometric view
'        - Inserts a BOM and auto-balloons on that exploded view
'   5. Saves <ModelName>.SLDDRW and exports <ModelName>.pdf + per-sheet images
'
' How to use:
'   Tools > Macro > Edit...  (or New) > Import this .bas module
'   Set DRAWING_TEMPLATE_PATH below if you have a company template
'   Tools > Macro > Run > CreateDrawing.main
'==============================================================================

Option Explicit

' --- CONFIG -----------------------------------------------------------------
' Full path to your .drwdot template. Leave empty to use SolidWorks default.
Private Const DRAWING_TEMPLATE_PATH As String = ""

' Sheet paper size when using a blank/default template (meters)
' A3 landscape ≈ 0.420 x 0.297 ; A4 landscape ≈ 0.297 x 0.210
Private Const SHEET_WIDTH As Double = 0.42
Private Const SHEET_HEIGHT As Double = 0.297

' Projection: True = 3rd angle (ANSI), False = 1st angle (ISO)
Private Const USE_THIRD_ANGLE As Boolean = True

' Add shaded isometric view in the upper-right area (sheet 1)
Private Const ADD_ISOMETRIC As Boolean = True

' Auto-insert model items (dimensions) on the front view for parts
Private Const ADD_MODEL_DIMENSIONS As Boolean = False

' --- Assembly options -------------------------------------------------------
' Insert BOM when the model is an assembly
Private Const ADD_BOM_FOR_ASSEMBLY As Boolean = True

' Add a dedicated sheet with an exploded isometric view (assemblies only)
Private Const ADD_EXPLODED_VIEW As Boolean = True

' Prefer this explode name if it already exists in the assembly ("" = first found)
Private Const PREFERRED_EXPLODE_NAME As String = ""

' If no explode exists, create one with AutoExplode
Private Const AUTO_CREATE_EXPLODE As Boolean = True

' Always run AutoExplode (even if an explode already exists)
Private Const FORCE_AUTO_EXPLODE As Boolean = False

' Auto-balloon the exploded view (requires BOM; assemblies only)
Private Const ADD_AUTO_BALLOONS As Boolean = True

' Balloon layout around the view:
'   1=Square, 2=Circle, 3=Top, 4=Bottom, 5=Left, 6=Right
Private Const BALLOON_LAYOUT As Long = 1

' Name of the exploded drawing sheet
Private Const EXPLODED_SHEET_NAME As String = "Exploded"

' Export outputs next to the drawing after save
Private Const EXPORT_PDF As Boolean = True
Private Const EXPORT_IMAGES As Boolean = True
' Image format: "png" or "jpg"
Private Const IMAGE_EXTENSION As String = "png"

' Overwrite existing drawing if present
Private Const OVERWRITE_EXISTING As Boolean = True
' ----------------------------------------------------------------------------

Dim swApp As SldWorks.SldWorks

Sub main()
    Dim swModel As SldWorks.ModelDoc2
    Dim swDraw As SldWorks.DrawingDoc
    Dim swAsm As SldWorks.AssemblyDoc
    Dim modelPath As String
    Dim drawingPath As String
    Dim docType As Long
    Dim errors As Long
    Dim warnings As Long
    Dim ok As Boolean
    Dim swView As SldWorks.View
    Dim sheetW As Double
    Dim sheetH As Double
    Dim explodeName As String
    Dim explodeView As SldWorks.View
    
    Set swApp = Application.SldWorks
    If swApp Is Nothing Then
        MsgBox "SolidWorks application not found.", vbCritical, "CreateDrawing"
        Exit Sub
    End If
    
    Set swModel = swApp.ActiveDoc
    If swModel Is Nothing Then
        MsgBox "Open a Part or Assembly first, then run this macro.", vbExclamation, "CreateDrawing"
        Exit Sub
    End If
    
    docType = swModel.GetType
    If docType <> swDocPART And docType <> swDocASSEMBLY Then
        MsgBox "Active document must be a Part or Assembly.", vbExclamation, "CreateDrawing"
        Exit Sub
    End If
    
    modelPath = swModel.GetPathName
    If Len(modelPath) = 0 Then
        ok = swModel.Save3(swSaveAsOptions_Silent, errors, warnings)
        modelPath = swModel.GetPathName
        If Len(modelPath) = 0 Then
            MsgBox "Save the model to disk before creating a drawing.", vbExclamation, "CreateDrawing"
            Exit Sub
        End If
    End If
    
    ' Prepare explode on the assembly before creating the drawing
    explodeName = ""
    If docType = swDocASSEMBLY And ADD_EXPLODED_VIEW Then
        Set swAsm = swModel
        explodeName = EnsureExplodedView(swModel, swAsm)
        If Len(explodeName) = 0 Then
            MsgBox "No exploded view available. Create one in the assembly " & _
                   "ConfigurationManager, or enable AUTO_CREATE_EXPLODE.", _
                   vbExclamation, "CreateDrawing"
        Else
            ' Activate the named explode in the model so drawing views can show it
            On Error Resume Next
            swAsm.ShowExploded2 True, explodeName
            On Error GoTo 0
        End If
    End If
    
    drawingPath = BuildDrawingPath(modelPath)
    If FileExists(drawingPath) Then
        If Not OVERWRITE_EXISTING Then
            MsgBox "Drawing already exists:" & vbCrLf & drawingPath, vbInformation, "CreateDrawing"
            Exit Sub
        End If
        CloseDocIfOpen drawingPath
    End If
    
    Set swDraw = CreateNewDrawing()
    If swDraw Is Nothing Then
        MsgBox "Could not create a new drawing. Check DRAWING_TEMPLATE_PATH.", vbCritical, "CreateDrawing"
        Exit Sub
    End If
    
    ' --- Sheet 1: standard orthographic layout ------------------------------
    If USE_THIRD_ANGLE Then
        ok = swDraw.Create3rdAngleViews2(modelPath)
    Else
        ok = swDraw.Create1stAngleViews2(modelPath)
    End If
    
    If Not ok Then
        MsgBox "Failed to insert standard views for:" & vbCrLf & modelPath, vbCritical, "CreateDrawing"
        Exit Sub
    End If
    
    GetSheetSize swDraw, sheetW, sheetH
    
    If ADD_ISOMETRIC Then
        Set swView = swDraw.CreateDrawViewFromModelView3( _
            modelPath, "*Isometric", sheetW * 0.78, sheetH * 0.72, 0#)
        If Not swView Is Nothing Then
            swView.UseSheetScale = True
            swView.SetDisplayMode3 False, swSHADED, False, True
        End If
    End If
    
    If ADD_MODEL_DIMENSIONS And docType = swDocPART Then
        InsertModelItemsOnFirstView swDraw
    End If
    
    ' BOM on sheet 1 only if we are NOT creating a dedicated explode sheet
    If ADD_BOM_FOR_ASSEMBLY And docType = swDocASSEMBLY Then
        If Not (ADD_EXPLODED_VIEW And Len(explodeName) > 0) Then
            InsertBomOnView swDraw, GetFirstModelView(swDraw)
        End If
    End If
    
    ' --- Sheet 2: exploded view + BOM + auto balloons (assemblies) ----------
    If docType = swDocASSEMBLY And ADD_EXPLODED_VIEW And Len(explodeName) > 0 Then
        Set explodeView = AddExplodedSheet(swDraw, modelPath, explodeName)
        
        If Not explodeView Is Nothing Then
            If ADD_BOM_FOR_ASSEMBLY Then
                InsertBomOnView swDraw, explodeView
            End If
            
            If ADD_AUTO_BALLOONS Then
                AutoBalloonView swDraw, explodeView
            End If
        End If
    ElseIf docType = swDocASSEMBLY And ADD_AUTO_BALLOONS Then
        ' No explode sheet: balloon the first model view (needs BOM already)
        AutoBalloonView swDraw, GetFirstModelView(swDraw)
    End If
    
    ' Return to first sheet for a clean finish
    ActivateFirstSheet swDraw
    
    swDraw.ForceRebuild3 False
    ok = swDraw.Extension.SaveAs(drawingPath, 0, swSaveAsOptions_Silent, Nothing, errors, warnings)
    
    If Not ok Then
        MsgBox "Drawing created but save failed (errors=" & errors & ")." & vbCrLf & _
               "Try File > Save As manually.", vbExclamation, "CreateDrawing"
        Exit Sub
    End If
    
    Dim pdfPath As String
    Dim imageSummary As String
    Dim exportMsg As String
    
    pdfPath = ""
    imageSummary = ""
    
    If EXPORT_PDF Then
        pdfPath = ExportDrawingPdf(swDraw, drawingPath)
    End If
    
    If EXPORT_IMAGES Then
        imageSummary = ExportDrawingImages(swDraw, drawingPath)
    End If
    
    exportMsg = "Drawing created:" & vbCrLf & drawingPath
    If Len(explodeName) > 0 Then
        exportMsg = exportMsg & vbCrLf & "Explode used: " & explodeName
    End If
    If Len(pdfPath) > 0 Then
        exportMsg = exportMsg & vbCrLf & "PDF: " & pdfPath
    ElseIf EXPORT_PDF Then
        exportMsg = exportMsg & vbCrLf & "PDF: export failed"
    End If
    If Len(imageSummary) > 0 Then
        exportMsg = exportMsg & vbCrLf & "Images:" & vbCrLf & imageSummary
    ElseIf EXPORT_IMAGES Then
        exportMsg = exportMsg & vbCrLf & "Images: export failed"
    End If
    
    MsgBox exportMsg, vbInformation, "CreateDrawing"
End Sub

' --- helpers ----------------------------------------------------------------

Private Function CreateNewDrawing() As SldWorks.DrawingDoc
    Dim templatePath As String
    Dim doc As Object
    
    templatePath = Trim$(DRAWING_TEMPLATE_PATH)
    
    If Len(templatePath) > 0 And FileExists(templatePath) Then
        Set doc = swApp.NewDocument(templatePath, 0, 0#, 0#)
    Else
        templatePath = swApp.GetUserPreferenceStringValue(swDefaultTemplateDrawing)
        If Len(templatePath) > 0 And FileExists(templatePath) Then
            Set doc = swApp.NewDocument(templatePath, 0, 0#, 0#)
        Else
            Set doc = swApp.NewDocument("", swDwgPaperA3size, SHEET_WIDTH, SHEET_HEIGHT)
        End If
    End If
    
    Set CreateNewDrawing = doc
End Function

Private Function EnsureExplodedView(ByVal swModel As SldWorks.ModelDoc2, _
                                    ByVal swAsm As SldWorks.AssemblyDoc) As String
    Dim names As Variant
    Dim i As Long
    Dim preferred As String
    Dim created As String
    Dim errors As Long
    Dim warnings As Long
    Dim existing As String
    
    preferred = Trim$(PREFERRED_EXPLODE_NAME)
    existing = ""
    
    On Error Resume Next
    names = swAsm.GetExplodedViewNames2("")
    If Not IsArray(names) Then names = swAsm.GetExplodedViewNames
    On Error GoTo 0
    
    If IsArray(names) Then
        If Len(preferred) > 0 Then
            For i = LBound(names) To UBound(names)
                If StrComp(CStr(names(i)), preferred, vbTextCompare) = 0 Then
                    existing = CStr(names(i))
                    Exit For
                End If
            Next i
        End If
        If Len(existing) = 0 Then
            If UBound(names) >= LBound(names) Then
                If Len(CStr(names(LBound(names)))) > 0 Then
                    existing = CStr(names(LBound(names)))
                End If
            End If
        End If
    End If
    
    ' Use existing explode unless FORCE_AUTO_EXPLODE is on
    If Len(existing) > 0 And Not FORCE_AUTO_EXPLODE Then
        EnsureExplodedView = existing
        Exit Function
    End If
    
    If Not AUTO_CREATE_EXPLODE And Not FORCE_AUTO_EXPLODE Then
        EnsureExplodedView = existing
        Exit Function
    End If
    
    ' Create / refresh with AutoExplode
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
            created = CStr(names(UBound(names)))
            EnsureExplodedView = created
            Exit Function
        End If
    End If
    
    EnsureExplodedView = existing
End Function

' Export all sheets to a single PDF next to the drawing
Private Function ExportDrawingPdf(ByVal swDraw As SldWorks.DrawingDoc, _
                                  ByVal drawingPath As String) As String
    Dim swModel As SldWorks.ModelDoc2
    Dim swExpData As Object
    Dim pdfPath As String
    Dim sheetNames As Variant
    Dim errors As Long
    Dim warnings As Long
    Dim ok As Boolean
    
    On Error GoTo fail
    Set swModel = swDraw
    pdfPath = Left$(drawingPath, InStrRev(drawingPath, ".") - 1) & ".pdf"
    
    ' swExportPdfData = 1 (swExportDataFileType_e)
    Set swExpData = swApp.GetExportFileData(1)
    If swExpData Is Nothing Then GoTo fail
    
    sheetNames = swDraw.GetSheetNames
    swExpData.ExportAs3D = False
    swExpData.ViewPdfAfterSaving = False
    ok = swExpData.SetSheets(swExportData_ExportAllSheets, sheetNames)
    
    ok = swModel.Extension.SaveAs(pdfPath, 0, swSaveAsOptions_Silent, swExpData, errors, warnings)
    If ok Then
        ExportDrawingPdf = pdfPath
    Else
        ExportDrawingPdf = ""
    End If
    Exit Function
fail:
    ExportDrawingPdf = ""
End Function

' Export each sheet as an image: <DrawingName>_<SheetName>.png
Private Function ExportDrawingImages(ByVal swDraw As SldWorks.DrawingDoc, _
                                     ByVal drawingPath As String) As String
    Dim swModel As SldWorks.ModelDoc2
    Dim sheetNames As Variant
    Dim i As Long
    Dim sheetName As String
    Dim basePath As String
    Dim imgPath As String
    Dim summary As String
    Dim errors As Long
    Dim warnings As Long
    Dim ok As Boolean
    Dim ext As String
    
    On Error GoTo fail
    Set swModel = swDraw
    ext = LCase$(Trim$(IMAGE_EXTENSION))
    If ext <> "jpg" And ext <> "jpeg" And ext <> "png" And ext <> "tif" And ext <> "bmp" Then
        ext = "png"
    End If
    
    basePath = Left$(drawingPath, InStrRev(drawingPath, ".") - 1)
    sheetNames = swDraw.GetSheetNames
    summary = ""
    
    If Not IsArray(sheetNames) Then
        ExportDrawingImages = ""
        Exit Function
    End If
    
    For i = LBound(sheetNames) To UBound(sheetNames)
        sheetName = CStr(sheetNames(i))
        swDraw.ActivateSheet sheetName
        swModel.ViewZoomtofit2
        
        imgPath = basePath & "_" & SanitizeFileName(sheetName) & "." & ext
        ok = swModel.Extension.SaveAs(imgPath, 0, swSaveAsOptions_Silent, Nothing, errors, warnings)
        
        If ok Then
            If Len(summary) > 0 Then summary = summary & vbCrLf
            summary = summary & "  " & imgPath
        End If
    Next i
    
    ActivateFirstSheet swDraw
    ExportDrawingImages = summary
    Exit Function
fail:
    ExportDrawingImages = ""
End Function

Private Function SanitizeFileName(ByVal name As String) As String
    Dim bad As Variant
    Dim i As Long
    bad = Array("\", "/", ":", "*", "?", """", "<", ">", "|", " ")
    For i = LBound(bad) To UBound(bad)
        name = Replace$(name, CStr(bad(i)), "_")
    Next i
    SanitizeFileName = name
End Function

Private Function AddExplodedSheet(ByVal swDraw As SldWorks.DrawingDoc, _
                                  ByVal modelPath As String, _
                                  ByVal explodeName As String) As SldWorks.View
    Dim ok As Boolean
    Dim sheetW As Double
    Dim sheetH As Double
    Dim swView As SldWorks.View
    Dim firstSheetProps As Variant
    Dim paperSize As Long
    Dim templateType As Long
    Dim firstSheet As SldWorks.Sheet
    
    GetSheetSize swDraw, sheetW, sheetH
    
    ' Copy paper size from sheet 1 when possible
    paperSize = swDwgPaperA3size
    templateType = swDwgTemplateNone
    On Error Resume Next
    Set firstSheet = swDraw.GetCurrentSheet
    firstSheetProps = firstSheet.GetProperties
    If IsArray(firstSheetProps) Then
        If UBound(firstSheetProps) >= 1 Then
            paperSize = CLng(firstSheetProps(0))
            templateType = CLng(firstSheetProps(1))
        End If
    End If
    On Error GoTo 0
    
    ok = swDraw.NewSheet3(EXPLODED_SHEET_NAME, paperSize, templateType, 1, 1, True, "", sheetW, sheetH, "")
    If Not ok Then
        ' Sheet name may already exist — activate / continue
        swDraw.ActivateSheet EXPLODED_SHEET_NAME
    End If
    
    swDraw.ActivateSheet EXPLODED_SHEET_NAME
    GetSheetSize swDraw, sheetW, sheetH
    
    ' Centered isometric on the explode sheet
    Set swView = swDraw.CreateDrawViewFromModelView3( _
        modelPath, "*Isometric", sheetW * 0.45, sheetH * 0.45, 0#)
    
    If swView Is Nothing Then
        Set AddExplodedSheet = Nothing
        Exit Function
    End If
    
    swView.UseSheetScale = True
    swView.SetDisplayMode3 False, swSHADED, False, True
    
    ' Show exploded state (uses the explode active on this view's configuration)
    On Error Resume Next
    swView.ShowExploded = True
    swView.SetKeepLinkedToBOM True
    On Error GoTo 0
    
    Set AddExplodedSheet = swView
End Function

Private Sub InsertBomOnView(ByVal swDraw As SldWorks.DrawingDoc, ByVal swView As SldWorks.View)
    Dim bomFeat As Object
    Dim sheetW As Double
    Dim sheetH As Double
    
    If swView Is Nothing Then Exit Sub
    
    On Error Resume Next
    GetSheetSize swDraw, sheetW, sheetH
    swDraw.ActivateView swView.Name
    
    Set bomFeat = swView.InsertBomTable2( _
        False, _
        0.01, _
        sheetH - 0.01, _
        swBOMConfigurationAnchor_TopLeft, _
        swBomType_TopLevelOnly, _
        "", _
        "")
    On Error GoTo 0
End Sub

Private Sub AutoBalloonView(ByVal swDraw As SldWorks.DrawingDoc, ByVal swView As SldWorks.View)
    Dim swModelDoc As SldWorks.ModelDoc2
    Dim autoballoonParams As Object
    Dim vNotes As Variant
    Dim ok As Boolean
    
    If swView Is Nothing Then Exit Sub
    
    On Error Resume Next
    Set swModelDoc = swDraw
    
    ok = swModelDoc.Extension.SelectByID2(swView.Name, "DRAWINGVIEW", 0, 0, 0, False, 0, Nothing, 0)
    swDraw.ActivateView swView.Name
    
    Set autoballoonParams = swModelDoc.CreateAutoBalloonOptions()
    If autoballoonParams Is Nothing Then Exit Sub
    
    autoballoonParams.Layout = BALLOON_LAYOUT
    autoballoonParams.ReverseDirection = False
    autoballoonParams.IgnoreMultiple = True
    autoballoonParams.InsertMagneticLine = True
    autoballoonParams.LeaderAttachmentToFaces = True
    autoballoonParams.Style = swBS_Circular
    autoballoonParams.Size = swBF_Fit
    autoballoonParams.UpperTextContent = swBalloonTextItemNumber
    autoballoonParams.UpperText = ""
    autoballoonParams.Layername = "-None-"
    autoballoonParams.ItemNumberStart = 1
    autoballoonParams.ItemNumberIncrement = 1
    autoballoonParams.ItemOrder = swBalloonItemNumbers_DoNotChangeItemNumbers
    autoballoonParams.EditBalloons = True
    autoballoonParams.EditBalloonOption = swEditBalloonOption_Resequence
    
    vNotes = swModelDoc.AutoBalloon5(autoballoonParams)
    swModelDoc.ClearSelection2 True
    On Error GoTo 0
End Sub

Private Function GetFirstModelView(ByVal swDraw As SldWorks.DrawingDoc) As SldWorks.View
    Dim swView As SldWorks.View
    
    On Error Resume Next
    Set swView = swDraw.GetFirstView   ' sheet view
    Set swView = swView.GetNextView    ' first model view
    On Error GoTo 0
    Set GetFirstModelView = swView
End Function

Private Sub ActivateFirstSheet(ByVal swDraw As SldWorks.DrawingDoc)
    Dim names As Variant
    On Error Resume Next
    names = swDraw.GetSheetNames
    If IsArray(names) Then
        If UBound(names) >= LBound(names) Then
            swDraw.ActivateSheet CStr(names(LBound(names)))
        End If
    End If
    On Error GoTo 0
End Sub

Private Sub GetSheetSize(ByVal swDraw As SldWorks.DrawingDoc, ByRef sheetW As Double, ByRef sheetH As Double)
    Dim swSheet As SldWorks.Sheet
    Dim props As Variant
    
    On Error GoTo fallback
    Set swSheet = swDraw.GetCurrentSheet
    props = swSheet.GetProperties
    If IsArray(props) Then
        If UBound(props) >= 6 Then
            sheetW = CDbl(props(5))
            sheetH = CDbl(props(6))
            If sheetW > 0 And sheetH > 0 Then Exit Sub
        End If
    End If
    
fallback:
    sheetW = SHEET_WIDTH
    sheetH = SHEET_HEIGHT
End Sub

Private Sub InsertModelItemsOnFirstView(ByVal swDraw As SldWorks.DrawingDoc)
    Dim swView As SldWorks.View
    Dim swModelDoc As SldWorks.ModelDoc2
    Dim ok As Boolean
    
    On Error Resume Next
    Set swView = GetFirstModelView(swDraw)
    If swView Is Nothing Then Exit Sub
    
    swDraw.ActivateView swView.Name
    Set swModelDoc = swDraw
    
    ok = swModelDoc.Extension.InsertModelAnnotations3( _
        swImportModelItemsFromEntireModel, _
        swInsertDimensions, _
        True, True, False, False)
    On Error GoTo 0
End Sub

Private Function BuildDrawingPath(ByVal modelPath As String) As String
    Dim baseName As String
    Dim dotPos As Long
    
    baseName = modelPath
    dotPos = InStrRev(baseName, ".")
    If dotPos > 0 Then
        baseName = Left$(baseName, dotPos - 1)
    End If
    BuildDrawingPath = baseName & ".SLDDRW"
End Function

Private Sub CloseDocIfOpen(ByVal fullPath As String)
    Dim swDoc As SldWorks.ModelDoc2
    Set swDoc = swApp.GetOpenDocumentByName(fullPath)
    If Not swDoc Is Nothing Then
        swApp.CloseDoc swDoc.GetTitle
    End If
End Sub

Private Function FileExists(ByVal fullPath As String) As Boolean
    If Len(Trim$(fullPath)) = 0 Then
        FileExists = False
        Exit Function
    End If
    FileExists = (Dir$(fullPath) <> "")
End Function
