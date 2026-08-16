using System;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

namespace ExportFlatPatternDXF
{
    public sealed class SheetSize
    {
        public double L { get; set; }
        public double W { get; set; }
    }

    /// <summary>
    /// Keep stock sizes / gap / margin in step with macros/ExportFlatPatternDXF.bas
    /// and assets/js/sheetmetal-nest.js.
    /// </summary>
    public sealed class AddinSettings
    {
        public const double DefaultGap = 5;
        public const double DefaultMargin = 10;
        public const bool DefaultAllowRotation = true;
        public const int DefaultSmOptions = 69;

        public string ReportsRoot { get; set; } = @"C:\Swood Reports";
        public bool OpenReportWhenDone { get; set; } = true;
        public double NestGapMm { get; set; } = DefaultGap;
        public double NestMarginMm { get; set; } = DefaultMargin;
        public bool AllowRotation { get; set; } = DefaultAllowRotation;
        public int SheetMetalOptions { get; set; } = DefaultSmOptions;
        public List<SheetSize> Sheets { get; set; } = new List<SheetSize>
        {
            new SheetSize { L = 2500, W = 1250 },
            new SheetSize { L = 3000, W = 1500 }
        };

        public static AddinSettings Load(string dllDirectory)
        {
            var path = Path.Combine(dllDirectory ?? "", "ExportFlatPatternDXF.json");
            if (!File.Exists(path)) return new AddinSettings();
            try
            {
                var json = File.ReadAllText(path);
                var loaded = new JavaScriptSerializer().Deserialize<AddinSettings>(json);
                if (loaded == null) return new AddinSettings();
                if (loaded.Sheets == null || loaded.Sheets.Count == 0)
                    loaded.Sheets = new AddinSettings().Sheets;
                return loaded;
            }
            catch
            {
                return new AddinSettings();
            }
        }
    }

    public sealed class NestPick
    {
        public int Index;
        public double L;
        public double W;
        public int Cols;
        public int Rows;
        public bool Rotated;
        public int PerSheet;
        public double AreaPer;
        public double Util;
    }

    public static class NestMath
    {
        public static int SafeDiv(double avail, double size, double gap)
        {
            if (!(size > 0)) return 0;
            return (int)Math.Floor((avail + gap) / (size + gap));
        }

        public static NestPick PickSheet(double pw, double ph, AddinSettings settings)
        {
            NestPick best = null;
            var sheets = settings.Sheets;
            for (var k = 0; k < sheets.Count; k++)
            {
                var sL = sheets[k].L;
                var sW = sheets[k].W;
                var iL = sL - 2 * settings.NestMarginMm;
                var iW = sW - 2 * settings.NestMarginMm;
                var cA = SafeDiv(iL, pw, settings.NestGapMm);
                var rA = SafeDiv(iW, ph, settings.NestGapMm);
                var cB = settings.AllowRotation ? SafeDiv(iL, ph, settings.NestGapMm) : 0;
                var rB = settings.AllowRotation ? SafeDiv(iW, pw, settings.NestGapMm) : 0;
                var rot = (cB * rB) > (cA * rA);
                var cols = rot ? cB : cA;
                var rows = rot ? rB : rA;
                if (cols < 1 || rows < 1) continue;
                var perSheet = cols * rows;
                var areaPer = (sL * sW) / perSheet;
                if (best == null || areaPer < best.AreaPer)
                {
                    best = new NestPick
                    {
                        Index = k,
                        L = sL,
                        W = sW,
                        Cols = cols,
                        Rows = rows,
                        Rotated = rot,
                        PerSheet = perSheet,
                        AreaPer = areaPer,
                        Util = (perSheet * pw * ph) / (sL * sW) * 100
                    };
                }
            }
            return best;
        }

        public static string SafeFileName(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var t = s;
            foreach (var c in "\\/:*?\"<>|")
                t = t.Replace(c, '-');
            return t.Trim();
        }

        public static string BaseName(string title)
        {
            var t = (title ?? "").Trim();
            foreach (var ext in new[] { ".sldprt", ".sldasm", ".slddrw" })
            {
                if (t.EndsWith(ext, StringComparison.OrdinalIgnoreCase))
                {
                    t = t.Substring(0, t.Length - ext.Length);
                    break;
                }
            }
            return t.Trim();
        }

        public static string Fmt(double d)
        {
            return d.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture);
        }
    }
}
