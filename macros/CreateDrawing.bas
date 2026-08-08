Attribute VB_Name = "CreateDrawing"
'==============================================================================
' SolidWorks Macro: CreateDrawing
' Creates a drawing from the active Part or Assembly.
'
' What it does:
'   1. Uses the active Part (.sldprt) or Assembly (.sldasm)
'   2. Opens a new drawing from your template (or SolidWorks default)
'   3. Inserts 3rd-angle standard views + an isometric view
'   4. Inserts a BOM for assemblies
'   5. Saves the drawing next to the model as <ModelName>.SLDDRW
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

' Add shaded isometric view in the upper-right area
Private Const ADD_ISOMETRIC As Boolean = True

' Insert BOM when the model is an assembly
Private Const ADD_BOM_FOR_ASSEMBLY As Boolean = True

' Auto-insert model items (dimensions) on the front view for parts
Private Const ADD_MODEL_DIMENSIONS As Boolean = False

' Overwrite existing drawing if present
Private Const OVERWRITE_EXISTING As Boolean = True
' ----------------------------------------------------------------------------

Dim swApp As SldWorks.SldWorks

Sub main()
    Dim swModel As SldWorks.ModelDoc2
    Dim swDraw As SldWorks.DrawingDoc
    Dim modelPath As String
    Dim drawingPath As String
    Dim docType As Long
    Dim errors As Long
    Dim warnings As Long
    Dim ok As Boolean
    Dim swView As SldWorks.View
    Dim sheetProps As Variant
    Dim sheetW As Double
    Dim sheetH As Double
    
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
        ' Model must be saved so drawing views can reference it by path
        ok = swModel.Save3(swSaveAsOptions_Silent, errors, warnings)
        modelPath = swModel.GetPathName
        If Len(modelPath) = 0 Then
            MsgBox "Save the model to disk before creating a drawing.", vbExclamation, "CreateDrawing"
            Exit Sub
        End If
    End If
    
    drawingPath = BuildDrawingPath(modelPath)
    If FileExists(drawingPath) Then
        If Not OVERWRITE_EXISTING Then
            MsgBox "Drawing already exists:" & vbCrLf & drawingPath, vbInformation, "CreateDrawing"
            Exit Sub
        End If
        ' Close existing drawing if open so we can overwrite
        CloseDocIfOpen drawingPath
    End If
    
    Set swDraw = CreateNewDrawing()
    If swDraw Is Nothing Then
        MsgBox "Could not create a new drawing. Check DRAWING_TEMPLATE_PATH.", vbCritical, "CreateDrawing"
        Exit Sub
    End If
    
    ' Standard orthographic layout
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
            ' Display modes: swWIREFRAME=0, swHIDDEN=1, swHIDDEN_GREYED=2, swSHADED=3
            swView.SetDisplayMode3 False, swSHADED, False, True
        End If
    End If
    
    If ADD_MODEL_DIMENSIONS And docType = swDocPART Then
        InsertModelItemsOnFirstView swDraw
    End If
    
    If ADD_BOM_FOR_ASSEMBLY And docType = swDocASSEMBLY Then
        InsertBomOnFirstView swDraw
    End If
    
    ' Rebuild and save
    swDraw.ForceRebuild3 False
    ok = swDraw.Extension.SaveAs(drawingPath, 0, swSaveAsOptions_Silent, Nothing, errors, warnings)
    
    If ok Then
        MsgBox "Drawing created:" & vbCrLf & drawingPath, vbInformation, "CreateDrawing"
    Else
        MsgBox "Drawing created but save failed (errors=" & errors & ")." & vbCrLf & _
               "Try File > Save As manually.", vbExclamation, "CreateDrawing"
    End If
End Sub

' --- helpers ----------------------------------------------------------------

Private Function CreateNewDrawing() As SldWorks.DrawingDoc
    Dim templatePath As String
    Dim doc As Object
    
    templatePath = Trim$(DRAWING_TEMPLATE_PATH)
    
    If Len(templatePath) > 0 And FileExists(templatePath) Then
        Set doc = swApp.NewDocument(templatePath, 0, 0#, 0#)
    Else
        ' Fall back to SolidWorks default drawing template from File Locations
        templatePath = swApp.GetUserPreferenceStringValue(swDefaultTemplateDrawing)
        If Len(templatePath) > 0 And FileExists(templatePath) Then
            Set doc = swApp.NewDocument(templatePath, 0, 0#, 0#)
        Else
            ' Last resort: blank drawing with explicit paper size
            Set doc = swApp.NewDocument("", swDwgPaperA3size, SHEET_WIDTH, SHEET_HEIGHT)
        End If
    End If
    
    Set CreateNewDrawing = doc
End Function

Private Sub GetSheetSize(ByVal swDraw As SldWorks.DrawingDoc, ByRef sheetW As Double, ByRef sheetH As Double)
    Dim swSheet As SldWorks.Sheet
    Dim props As Variant
    
    On Error GoTo fallback
    Set swSheet = swDraw.GetCurrentSheet
    props = swSheet.GetProperties
    ' props(5)=width, props(6)=height (meters) for GetProperties / GetProperties2 variants
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
    Set swView = swDraw.GetFirstView          ' sheet itself
    Set swView = swView.GetNextView           ' first model view
    If swView Is Nothing Then Exit Sub
    
    swDraw.ActivateView swView.Name
    Set swModelDoc = swDraw
    
    ' Insert dimensions marked for drawing from the model
    ok = swModelDoc.Extension.InsertModelAnnotations3( _
        swImportModelItemsFromEntireModel, _
        swInsertDimensions, _
        True, True, False, False)
    On Error GoTo 0
End Sub

Private Sub InsertBomOnFirstView(ByVal swDraw As SldWorks.DrawingDoc)
    Dim swView As SldWorks.View
    Dim bomFeat As Object
    Dim sheetW As Double
    Dim sheetH As Double
    
    On Error Resume Next
    Set swView = swDraw.GetFirstView
    Set swView = swView.GetNextView
    If swView Is Nothing Then Exit Sub
    
    GetSheetSize swDraw, sheetW, sheetH
    
    ' Anchor near top-left of sheet; uses SolidWorks default BOM template.
    ' InsertBomTable2 is widely available across SolidWorks versions.
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
