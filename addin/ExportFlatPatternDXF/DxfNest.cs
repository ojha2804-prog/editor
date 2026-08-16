using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace ExportFlatPatternDXF
{
    public sealed class DxfParseResult
    {
        public string Geometry = "";
        public double MinX, MinY, MaxX, MaxY;
        public bool Ok => !string.IsNullOrEmpty(Geometry);
    }

    /// <summary>LINE / ARC / CIRCLE / LWPOLYLINE → SVG, matching the VBA parser.</summary>
    public static class DxfParser
    {
        public static DxfParseResult Parse(string path)
        {
            var result = new DxfParseResult
            {
                MinX = 1e30, MinY = 1e30, MaxX = -1e30, MaxY = -1e30
            };
            if (!File.Exists(path)) return result;

            var all = File.ReadAllText(path).Replace("\r\n", "\n");
            var L = all.Split('\n');
            var segs = new List<double[]>();
            var sOut = new StringBuilder();
            var inEnt = false;
            var havePoly = false;
            var polyPts = "";
            var polyClosed = false;

            for (var i = 0; i < L.Length - 1; i += 2)
            {
                var sCode = L[i].Trim();
                var sVal = L[i + 1].Trim();
                if (sCode == "2" && sVal == "ENTITIES") inEnt = true;
                if (sCode == "0" && sVal == "ENDSEC" && inEnt) break;

                if (inEnt && sCode == "0")
                {
                    if (havePoly && polyPts.Length > 0)
                    {
                        sOut.Append("<polyline points=\"").Append(polyPts).Append("\" ");
                        if (!polyClosed) sOut.Append("fill=\"none\" ");
                        sOut.Append("/>\r\n");
                        polyPts = "";
                        havePoly = false;
                    }

                    switch (sVal)
                    {
                        case "LINE":
                            {
                                var x1 = Gv(L, i, "10"); var y1 = Gv(L, i, "20");
                                var x2 = Gv(L, i, "11"); var y2 = Gv(L, i, "21");
                                segs.Add(new[] { x1, -y1, x2, -y2 });
                                Track(x1, -y1, result);
                                Track(x2, -y2, result);
                                break;
                            }
                        case "CIRCLE":
                            {
                                var cx = Gv(L, i, "10"); var cy = Gv(L, i, "20"); var rad = Gv(L, i, "40");
                                sOut.Append("<circle cx=\"").Append(NestMath.Fmt(cx))
                                    .Append("\" cy=\"").Append(NestMath.Fmt(-cy))
                                    .Append("\" r=\"").Append(NestMath.Fmt(rad))
                                    .Append("\" fill=\"none\"/>\r\n");
                                Track(cx - rad, -cy - rad, result);
                                Track(cx + rad, -cy + rad, result);
                                break;
                            }
                        case "ARC":
                            {
                                var cx = Gv(L, i, "10"); var cy = Gv(L, i, "20"); var rad = Gv(L, i, "40");
                                var a1 = Gv(L, i, "50"); var a2 = Gv(L, i, "51");
                                sOut.Append(ArcPath(cx, cy, rad, a1, a2));
                                Track(cx - rad, -cy - rad, result);
                                Track(cx + rad, -cy + rad, result);
                                break;
                            }
                        case "LWPOLYLINE":
                            havePoly = true;
                            polyPts = "";
                            polyClosed = Math.Abs(Gv(L, i, "70") - 1) < 0.5;
                            break;
                    }
                }

                if (inEnt && havePoly && sCode == "10")
                {
                    var px = Num(sVal);
                    if (i + 3 < L.Length && L[i + 2].Trim() == "20")
                    {
                        var py = Num(L[i + 3].Trim());
                        polyPts += NestMath.Fmt(px) + "," + NestMath.Fmt(-py) + " ";
                        Track(px, -py, result);
                    }
                }
            }

            if (havePoly && polyPts.Length > 0)
                sOut.Append("<polyline points=\"").Append(polyPts).Append("\" fill=\"none\"/>\r\n");

            if (segs.Count > 0)
                result.Geometry = ChainSegments(segs) + sOut;
            else
                result.Geometry = sOut.ToString();

            if (result.MinX > 1e29) result.Geometry = "";
            return result;
        }

        static double Num(string s)
        {
            double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var v);
            return v;
        }

        static double Gv(string[] L, int iStart, string code)
        {
            for (var j = iStart + 2; j < L.Length - 1; j += 2)
            {
                if (L[j].Trim() == "0") return 0;
                if (L[j].Trim() == code) return Num(L[j + 1].Trim());
            }
            return 0;
        }

        static void Track(double x, double y, DxfParseResult r)
        {
            if (x < r.MinX) r.MinX = x;
            if (y < r.MinY) r.MinY = y;
            if (x > r.MaxX) r.MaxX = x;
            if (y > r.MaxY) r.MaxY = y;
        }

        static string ArcPath(double cx, double cy, double r, double aStart, double aEnd)
        {
            const double PI = 3.14159265358979;
            var s = aStart * PI / 180;
            var e = aEnd * PI / 180;
            var sx = cx + r * Math.Cos(s); var sy = cy + r * Math.Sin(s);
            var ex = cx + r * Math.Cos(e); var ey = cy + r * Math.Sin(e);
            var sweep = aEnd - aStart;
            while (sweep < 0) sweep += 360;
            var large = sweep > 180 ? 1 : 0;
            return "<path d=\"M " + NestMath.Fmt(sx) + " " + NestMath.Fmt(-sy) +
                   " A " + NestMath.Fmt(r) + " " + NestMath.Fmt(r) +
                   " 0 " + large + " 0 " + NestMath.Fmt(ex) + " " + NestMath.Fmt(-ey) +
                   "\" fill=\"none\"/>\r\n";
        }

        static bool Near2(double ax, double ay, double bx, double by, double tol)
        {
            return Math.Abs(ax - bx) < tol && Math.Abs(ay - by) < tol;
        }

        static string ChainSegments(List<double[]> segs)
        {
            const double TOL = 0.0001;
            var n = segs.Count;
            var used = new bool[n];
            var sOut = new StringBuilder();
            for (var s = 0; s < n; s++)
            {
                if (used[s]) continue;
                used[s] = true;
                var ptsX = new List<double> { segs[s][0], segs[s][2] };
                var ptsY = new List<double> { segs[s][1], segs[s][3] };
                var grew = true;
                while (grew)
                {
                    grew = false;
                    for (var k = 0; k < n; k++)
                    {
                        if (used[k]) continue;
                        var x1 = segs[k][0]; var y1 = segs[k][1];
                        var x2 = segs[k][2]; var y2 = segs[k][3];
                        var last = ptsX.Count - 1;
                        if (Near2(ptsX[last], ptsY[last], x1, y1, TOL))
                        {
                            ptsX.Add(x2); ptsY.Add(y2); used[k] = true; grew = true;
                        }
                        else if (Near2(ptsX[last], ptsY[last], x2, y2, TOL))
                        {
                            ptsX.Add(x1); ptsY.Add(y1); used[k] = true; grew = true;
                        }
                        else if (Near2(ptsX[0], ptsY[0], x2, y2, TOL))
                        {
                            ptsX.Insert(0, x1); ptsY.Insert(0, y1); used[k] = true; grew = true;
                        }
                        else if (Near2(ptsX[0], ptsY[0], x1, y1, TOL))
                        {
                            ptsX.Insert(0, x2); ptsY.Insert(0, y2); used[k] = true; grew = true;
                        }
                    }
                }
                var sPts = new StringBuilder();
                for (var j = 0; j < ptsX.Count; j++)
                    sPts.Append(NestMath.Fmt(ptsX[j])).Append(',').Append(NestMath.Fmt(ptsY[j])).Append(' ');
                var closed = Near2(ptsX[0], ptsY[0], ptsX[ptsX.Count - 1], ptsY[ptsY.Count - 1], TOL);
                if (closed)
                    sOut.Append("<polygon points=\"").Append(sPts.ToString().Trim()).Append("\"/>\r\n");
                else
                    sOut.Append("<polyline points=\"").Append(sPts.ToString().Trim()).Append("\" fill=\"none\"/>\r\n");
            }
            return sOut.ToString();
        }
    }

    public static class NestSvg
    {
        public static string Build(string geom, double minX, double minY, double maxX, double maxY, AddinSettings settings)
        {
            var pw = maxX - minX;
            var ph = maxY - minY;
            if (pw <= 0 || ph <= 0) return "";
            var pick = NestMath.PickSheet(pw, ph, settings);
            if (pick == null) return "";

            var innerL = pick.L - 2 * settings.NestMarginMm;
            var innerW = pick.W - 2 * settings.NestMarginMm;
            var stepX = (pick.Rotated ? ph : pw) + settings.NestGapMm;
            var stepY = (pick.Rotated ? pw : ph) + settings.NestGapMm;
            var sb = new StringBuilder();
            sb.Append("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ")
              .Append(NestMath.Fmt(pick.L)).Append(' ').Append(NestMath.Fmt(pick.W))
              .Append("\" width=\"100%\">\r\n");
            sb.Append("<rect x=\"0\" y=\"0\" width=\"").Append(NestMath.Fmt(pick.L))
              .Append("\" height=\"").Append(NestMath.Fmt(pick.W))
              .Append("\" fill=\"#fff\" stroke=\"#333\" stroke-width=\"3\"/>\r\n");
            sb.Append("<rect x=\"").Append(NestMath.Fmt(settings.NestMarginMm))
              .Append("\" y=\"").Append(NestMath.Fmt(settings.NestMarginMm))
              .Append("\" width=\"").Append(NestMath.Fmt(innerL))
              .Append("\" height=\"").Append(NestMath.Fmt(innerW))
              .Append("\" fill=\"none\" stroke=\"#bbb\" stroke-width=\"1\" stroke-dasharray=\"12,8\"/>\r\n");

            for (var r = 0; r < pick.Rows; r++)
            {
                for (var c = 0; c < pick.Cols; c++)
                {
                    var ox = settings.NestMarginMm + c * stepX;
                    var oy = settings.NestMarginMm + r * stepY;
                    sb.Append("<g transform=\"translate(").Append(NestMath.Fmt(ox)).Append(',').Append(NestMath.Fmt(oy)).Append(')');
                    if (pick.Rotated)
                        sb.Append(" rotate(90) translate(0,").Append(NestMath.Fmt(-ph)).Append(')');
                    sb.Append("\">\r\n<g transform=\"translate(").Append(NestMath.Fmt(-minX)).Append(',')
                      .Append(NestMath.Fmt(-minY)).Append(")\" fill=\"#c7d2fe\" fill-opacity=\"0.75\" stroke=\"#3730a3\" stroke-width=\"2\">\r\n");
                    sb.Append(geom).Append("</g></g>\r\n");
                }
            }

            var util = pick.Util.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture);
            sb.Append("<text x=\"").Append(NestMath.Fmt(settings.NestMarginMm))
              .Append("\" y=\"").Append(NestMath.Fmt(pick.W - 14))
              .Append("\" font-family=\"sans-serif\" font-size=\"34\" fill=\"#555\">")
              .Append(NestMath.Fmt(pick.L)).Append(" x ").Append(NestMath.Fmt(pick.W))
              .Append(" mm  -  ").Append(pick.PerSheet).Append(" per sheet  -  ").Append(util).Append("% used");
            if (pick.Rotated) sb.Append("  -  rotated 90");
            sb.Append("</text>\r\n</svg>\r\n");
            return sb.ToString();
        }
    }
}
