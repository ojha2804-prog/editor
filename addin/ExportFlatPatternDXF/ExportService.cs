using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Windows.Forms;

namespace ExportFlatPatternDXF
{
    public sealed class ExportResult
    {
        public int Exported;
        public int Skipped;
        public string OutputFolder = "";
        public string ReportFolder = "";
        public string Log = "";
    }

    /// <summary>
    /// Same pipeline as macros/ExportFlatPatternDXF.bas: newest SWOOD report
    /// folder, true flat-pattern DXF, nest SVG. Does not save or unsuppress the model.
    /// </summary>
    public static class ExportService
    {
        const int SwDocPart = 1;
        const int SwDocAssembly = 2;
        const int SwExportSheetMetal = 1;

        static readonly string[] SheetMetalFeatures =
        {
            "SheetMetal", "FlatPattern", "SMBaseFlange", "SolidToSheetMetal",
            "SMMiteredFlange", "EdgeFlange", "SketchBend", "OneBend"
        };

        public static ExportResult Run(object swApp, AddinSettings settings)
        {
            var result = new ExportResult();
            var log = new StringBuilder();
            var done = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var swModel = Com.Get(swApp, "ActiveDoc");
            if (swModel == null)
            {
                MessageBox.Show("Open the assembly (or a sheet metal part) first, then run again.",
                    "Export Flat Pattern DXF", MessageBoxButtons.OK, MessageBoxIcon.Exclamation);
                return result;
            }

            var docName = NestMath.BaseName(Com.AsStr(Com.Member(swModel, "GetTitle")));
            var reportFolder = FindNewestReport(settings.ReportsRoot, docName);
            if (string.IsNullOrEmpty(reportFolder))
            {
                MessageBox.Show(
                    "No generated report folder found.\r\n\r\nLooked for a folder named:  " + docName +
                    "\r\nUnder:  " + settings.ReportsRoot + "\\<YYYY_MM>\\\r\n\r\n" +
                    "Raw document title: " + Com.AsStr(Com.Member(swModel, "GetTitle")) +
                    "\r\n\r\nGenerate the SWOOD report first.",
                    "Export Flat Pattern DXF", MessageBoxButtons.OK, MessageBoxIcon.Exclamation);
                return result;
            }

            var outputFolder = Path.Combine(reportFolder, "dxfs", "sheetmetal");
            if (!EnsureFolder(outputFolder))
            {
                MessageBox.Show("Could not create or reach:\r\n" + outputFolder,
                    "Export Flat Pattern DXF", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return result;
            }

            result.ReportFolder = reportFolder;
            result.OutputFolder = outputFolder;

            var docType = Com.AsInt(Com.Member(swModel, "GetType"));
            if (docType == SwDocPart)
            {
                ExportOne(swModel, settings, outputFolder, reportFolder, done, result, log);
            }
            else if (docType == SwDocAssembly)
            {
                var swConf = Com.Call(swModel, "GetActiveConfiguration");
                var swRoot = Com.Call(swConf, "GetRootComponent3", true);
                Traverse(swRoot, settings, outputFolder, reportFolder, done, result, log);
            }
            else
            {
                MessageBox.Show("Run this on a part or an assembly, not a drawing.",
                    "Export Flat Pattern DXF", MessageBoxButtons.OK, MessageBoxIcon.Exclamation);
                return result;
            }

            result.Log = log.ToString();
            ShowSummary(result, settings);
            return result;
        }

        static void Traverse(object swComp, AddinSettings settings, string outputFolder, string reportFolder,
            HashSet<string> done, ExportResult result, StringBuilder log)
        {
            object children;
            try { children = Com.Member(swComp, "GetChildren"); }
            catch { return; }
            if (children == null || children is DBNull) return;
            var list = new List<object>();
            if (children is object[] arr)
                list.AddRange(arr);
            else if (children is Array raw)
            {
                foreach (var x in raw) list.Add(x);
            }
            else return;

            foreach (var swChild in list)
            {
                if (swChild == null) continue;
                if (Com.AsInt(Com.Call(swChild, "GetSuppression")) == 0) continue;

                object childModel = null;
                try { childModel = Com.Call(swChild, "GetModelDoc2"); }
                catch { }
                if (childModel == null) continue;

                var t = Com.AsInt(Com.Member(childModel, "GetType"));
                if (t == SwDocPart)
                    ExportOne(childModel, settings, outputFolder, reportFolder, done, result, log);
                else if (t == SwDocAssembly)
                    Traverse(swChild, settings, outputFolder, reportFolder, done, result, log);
            }
        }

        static void ExportOne(object swModel, AddinSettings settings, string outputFolder, string reportFolder,
            HashSet<string> done, ExportResult result, StringBuilder log)
        {
            var sName = NestMath.BaseName(Com.AsStr(Com.Member(swModel, "GetTitle")));
            var mgr = Com.Get(swModel, "ConfigurationManager");
            var active = Com.Get(mgr, "ActiveConfiguration");
            var sConf = Com.AsStr(Com.Get(active, "Name"));
            var key = sName + "|" + sConf;
            if (!done.Add(key)) return;

            if (!IsSheetMetal(swModel))
            {
                result.Skipped++;
                return;
            }

            var sOut = Path.Combine(outputFolder,
                NestMath.SafeFileName(sName) + "_" + NestMath.SafeFileName(sConf) + ".dxf");

            var wrote = TryExportFlatPatternView(swModel, sOut, sName, log)
                        || TryExportToDwg2(swModel, sOut, sName, settings, log);
            if (!File.Exists(sOut)) wrote = false;

            if (wrote)
            {
                result.Exported++;
                log.Append(" + ").Append(NestMath.SafeFileName(sName)).Append('_')
                   .Append(NestMath.SafeFileName(sConf)).Append(".dxf\r\n");
                BuildNestSvg(sOut, NestMath.SafeFileName(sName) + "_" + NestMath.SafeFileName(sConf),
                    reportFolder, settings, log);
            }
            else
            {
                result.Skipped++;
                log.Append(" ! ").Append(sName).Append(" - no DXF written by either method\r\n");
            }
        }

        static bool TryExportFlatPatternView(object swModel, string sOut, string sName, StringBuilder log)
        {
            try
            {
                Com.Call(swModel, "ExportFlatPatternView", sOut, 1);
                if (!File.Exists(sOut))
                {
                    log.Append("   . ").Append(sName).Append(" - ExportFlatPatternView ran but wrote no file\r\n");
                    return false;
                }
                return true;
            }
            catch (Exception ex)
            {
                log.Append("   . ").Append(sName).Append(" - ExportFlatPatternView: ").Append(ex.Message).Append("\r\n");
                return false;
            }
        }

        static bool TryExportToDwg2(object swModel, string sOut, string sName, AddinSettings settings, StringBuilder log)
        {
            try
            {
                var ext = Com.Get(swModel, "Extension");
                if (ext == null)
                {
                    log.Append("   . ").Append(sName).Append(" - no ModelDocExtension\r\n");
                    return false;
                }
                object vAlign = new double[] { 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1 };
                var pathName = Com.AsStr(Com.Call(swModel, "GetPathName"));
                var ret = Com.Call(ext, "ExportToDWG2", sOut, pathName, SwExportSheetMetal, true,
                    vAlign, false, false, settings.SheetMetalOptions, Type.Missing);
                return File.Exists(sOut) || (ret is bool b && b);
            }
            catch (Exception ex)
            {
                log.Append("   . ").Append(sName).Append(" - ExportToDWG2: ").Append(ex.Message).Append("\r\n");
                return false;
            }
        }

        static bool IsSheetMetal(object swModel)
        {
            if (swModel == null) return false;
            if (Com.AsInt(Com.Member(swModel, "GetType")) != SwDocPart) return false;
            var feat = Com.Member(swModel, "FirstFeature");
            while (feat != null)
            {
                var typeName = Com.AsStr(Com.Member(feat, "GetTypeName2"));
                foreach (var n in SheetMetalFeatures)
                    if (string.Equals(n, typeName, StringComparison.OrdinalIgnoreCase))
                        return true;
                feat = Com.Member(feat, "GetNextFeature");
            }
            return false;
        }

        static void BuildNestSvg(string dxfPath, string baseName, string reportFolder, AddinSettings settings, StringBuilder log)
        {
            var parsed = DxfParser.Parse(dxfPath);
            if (!parsed.Ok)
            {
                log.Append("   . ").Append(baseName).Append(" - no drawable geometry found in DXF\r\n");
                return;
            }
            var svg = NestSvg.Build(parsed.Geometry, parsed.MinX, parsed.MinY, parsed.MaxX, parsed.MaxY, settings);
            if (string.IsNullOrEmpty(svg))
            {
                log.Append("   . ").Append(baseName).Append(" - blank does not fit any stock sheet\r\n");
                return;
            }
            var imgDir = Path.Combine(reportFolder, "images", "sheetmetal");
            EnsureFolder(imgDir);
            var outSvg = Path.Combine(imgDir, "nest-" + baseName + ".svg");
            File.WriteAllText(outSvg, svg, new UTF8Encoding(false));
            log.Append("   > nest-").Append(baseName).Append(".svg\r\n");
        }

        public static string FindNewestReport(string reportsRoot, string docName)
        {
            if (string.IsNullOrEmpty(reportsRoot) || !Directory.Exists(reportsRoot)) return "";
            string best = "";
            var bestTime = DateTime.MinValue;
            foreach (var month in Directory.GetDirectories(reportsRoot))
            {
                foreach (var proj in Directory.GetDirectories(month))
                {
                    if (!string.Equals(Path.GetFileName(proj), docName, StringComparison.OrdinalIgnoreCase))
                        continue;
                    var t = Directory.GetLastWriteTime(proj);
                    if (best == "" || t > bestTime)
                    {
                        best = proj;
                        bestTime = t;
                    }
                }
            }
            return best;
        }

        static bool EnsureFolder(string path)
        {
            try
            {
                Directory.CreateDirectory(path);
                return Directory.Exists(path);
            }
            catch { return false; }
        }

        static void ShowSummary(ExportResult result, AddinSettings settings)
        {
            var s = "Flat pattern DXF export finished.\r\n\r\nExported : " + result.Exported +
                    "\r\nSkipped  : " + result.Skipped + "  (not sheet metal, or no flat pattern)\r\n\r\nFolder:\r\n" +
                    result.OutputFolder;
            if (!string.IsNullOrEmpty(result.Log)) s += "\r\n\r\nDetail:\r\n" + result.Log;
            if (result.Exported == 0)
            {
                s += "\r\n\r\nNothing exported. Usual causes:\r\n" +
                     " - the part has no sheet metal features (it is solid/imported geometry)\r\n" +
                     " - the sheet metal body cannot be flattened (check for a failed bend)\r\n" +
                     "Test one part by hand: right-click it > Export to DXF/DWG >\r\n" +
                     "Sheet Metal / Flat pattern. If that fails too, the problem is the model.";
            }
            MessageBox.Show(s, "Export Flat Pattern DXF", MessageBoxButtons.OK, MessageBoxIcon.Information);

            if (settings.OpenReportWhenDone && result.Exported > 0)
            {
                var index = Path.Combine(result.ReportFolder, "index.html");
                if (File.Exists(index))
                    Process.Start(new ProcessStartInfo { FileName = index, UseShellExecute = true });
            }
        }
    }
}
