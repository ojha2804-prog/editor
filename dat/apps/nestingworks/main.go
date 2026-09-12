package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

type Pt struct{ X, Y float64 }
type Ring []Pt

func (p *Pt) UnmarshalJSON(b []byte) error {
	var xy [2]float64
	if err := json.Unmarshal(b, &xy); err != nil {
		return err
	}
	p.X, p.Y = xy[0], xy[1]
	return nil
}

type Geom struct {
	OK     bool   `json:"ok"`
	Outer  Ring   `json:"outer"`
	Inner  []Ring `json:"inner"`
	Folded    bool    `json:"folded"`
	Virtual   bool    `json:"virtual"`
	Thickness float64 `json:"thickness"`
	Material  string  `json:"material"`
	Grain     string  `json:"grain"`
}

type PartSpec struct {
	Name      string  `json:"name"`
	Qty       int     `json:"qty"`
	Thickness float64 `json:"thickness"`
	Material  string  `json:"material"`
	Grain     string  `json:"grain"`
	Outer     Ring    `json:"-"`
	Inner     []Ring  `json:"-"`
}

type SheetSize struct {
	Label string  `json:"label"`
	L     float64 `json:"L"`
	W     float64 `json:"W"`
}

type Job struct {
	Sheet SheetSize  `json:"sheet"`
	Trim  float64    `json:"trim"`
	Kerf  float64    `json:"kerf"`
	Res   float64    `json:"res"`
	Parts []PartSpec `json:"parts"`
}

type PlacedJSON struct {
	Name   string  `json:"name"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Deg    float64 `json:"deg"`
	W      float64 `json:"w"`
	H      float64 `json:"h"`
	Area   float64 `json:"area"`
	InHole bool    `json:"inHole"`
	Host   string  `json:"host,omitempty"`
}

type SheetJSON struct {
	Key       string       `json:"key"`
	Material  string       `json:"material"`
	Thickness float64      `json:"thickness"`
	L         float64      `json:"L"`
	W         float64      `json:"W"`
	Placed    []PlacedJSON `json:"placed"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: NestingWorks.exe <reportFolder> [L] [W]")
		os.Exit(1)
	}
	report := strings.TrimRight(os.Args[1], `\/`)
	sheet := SheetSize{Label: "2500 x 1250 mm", L: 2500, W: 1250}
	if len(os.Args) >= 4 {
		sheet.L, _ = strconv.ParseFloat(os.Args[2], 64)
		sheet.W, _ = strconv.ParseFloat(os.Args[3], 64)
		sheet.Label = fmt.Sprintf("%.0f x %.0f mm", sheet.L, sheet.W)
	}
	if err := Run(report, sheet); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func Run(report string, sheet SheetSize) error {
	geoPath := filepath.Join(report, "db", "sheetmetal-geometry.js")
	geoms, err := loadGeometry(geoPath)
	if err != nil {
		return fmt.Errorf("read %s: %w", geoPath, err)
	}
	job := Job{Sheet: sheet, Trim: 10, Kerf: 5, Res: 3, Parts: partsFromGeom(geoms)}
	applyReportQty(report, job.Parts)
	if jpath := filepath.Join(report, "db", "nesting-job.json"); fileExists(jpath) {
		if extra, e := loadJob(jpath); e == nil {
			if extra.Sheet.L > 0 {
				job.Sheet = extra.Sheet
			}
			if extra.Trim > 0 {
				job.Trim = extra.Trim
			}
			if extra.Kerf > 0 {
				job.Kerf = extra.Kerf
			}
			merged := mergeJobParts(geoms, extra.Parts)
			if len(merged) > 0 {
				job.Parts = merged
			}
		}
	}
	if len(job.Parts) == 0 {
		return fmt.Errorf("no true-shape outlines in %s", geoPath)
	}
	sheets := nestJob(job)
	out := filepath.Join(report, "db", "nesting-works.js")
	if err := os.MkdirAll(filepath.Dir(out), 0755); err != nil {
		return err
	}
	if err := writeResult(out, job, sheets); err != nil {
		return err
	}
	fmt.Printf("NestingWorks: %d sheet(s), %d part type(s) -> %s\n", len(sheets), len(job.Parts), out)
	return nil
}

func fileExists(p string) bool {
	st, err := os.Stat(p)
	return err == nil && !st.IsDir()
}

func loadGeometry(path string) (map[string]Geom, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	s := string(b)
	i := strings.Index(s, "{")
	j := strings.LastIndex(s, "}")
	if i < 0 || j <= i {
		return nil, fmt.Errorf("not a sheetmetal-geometry.js object")
	}
	var geoms map[string]Geom
	if err := json.Unmarshal([]byte(s[i:j+1]), &geoms); err != nil {
		return nil, err
	}
	out := map[string]Geom{}
	for k, g := range geoms {
		if g.Folded || len(g.Outer) < 3 {
			continue
		}
		out[k] = g
	}
	return out, nil
}

func loadJob(path string) (Job, error) {
	var j Job
	b, err := os.ReadFile(path)
	if err != nil {
		return j, err
	}
	err = json.Unmarshal(b, &j)
	return j, err
}

func normName(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, `\`, "/")
	if i := strings.LastIndex(s, "/"); i >= 0 {
		s = s[i+1:]
	}
	s = strings.TrimSuffix(s, ".sldprt")
	s = regexp.MustCompile(`^copy of\s+`).ReplaceAllString(s, "")
	s = regexp.MustCompile(`(?i)_(mat|thick|qty)-.*$`).ReplaceAllString(s, "")
	s = regexp.MustCompile(`(?i)_default$`).ReplaceAllString(s, "")
	if i := strings.Index(s, "^"); i > 0 {
		s = s[:i]
	}
	return strings.TrimSpace(s)
}

func partsFromGeom(geoms map[string]Geom) []PartSpec {
	seen := map[string]bool{}
	var parts []PartSpec
	for k, g := range geoms {
		base := normName(k)
		if seen[base] {
			continue
		}
		seen[base] = true
		qty, thick, mat, grain := 1, g.Thickness, g.Material, g.Grain
		if grain == "" {
			grain = "any"
		}
		if m := regexp.MustCompile(`(?i)_qty-(\d+)`).FindStringSubmatch(k); len(m) == 2 {
			qty, _ = strconv.Atoi(m[1])
			if qty < 1 {
				qty = 1
			}
		}
		if thick <= 0 {
			if m := regexp.MustCompile(`(?i)_thick-([0-9.]+)`).FindStringSubmatch(k); len(m) == 2 {
				thick, _ = strconv.ParseFloat(m[1], 64)
			}
		}
		if mat == "" {
			if m := regexp.MustCompile(`(?i)_mat-([^_]+)`).FindStringSubmatch(k); len(m) == 2 {
				mat = m[1]
			}
		}
		parts = append(parts, PartSpec{
			Name: k, Qty: qty, Thickness: thick, Material: mat, Grain: grain,
			Outer: g.Outer, Inner: g.Inner,
		})
	}
	return parts
}

func applyReportQty(report string, parts []PartSpec) {
	b, err := os.ReadFile(filepath.Join(report, "db", "report-data-raw.js"))
	if err != nil {
		return
	}
	s := string(b)
	for i := range parts {
		names := []string{parts[i].Name, normName(parts[i].Name)}
		if k := strings.Index(parts[i].Name, "^"); k > 0 {
			names = append(names, parts[i].Name[:k])
		}
		best := parts[i].Qty
		for _, nm := range names {
			if q := findQtyNearName(s, nm); q > best {
				best = q
			}
		}
		parts[i].Qty = best
		if parts[i].Thickness <= 0 {
			for _, nm := range names {
				if t := findFloatNearName(s, nm, `(?:SM_Thickness|["']Thickness["'])`); t > 0 {
					parts[i].Thickness = t
					break
				}
			}
		}
		if parts[i].Grain == "" || parts[i].Grain == "any" {
			for _, nm := range names {
				if g := findGrainNearName(s, nm); g != "" {
					parts[i].Grain = g
					break
				}
			}
		}
	}
}

func findFloatNearName(s, name, fieldRe string) float64 {
	name = strings.TrimSpace(name)
	if len(name) < 2 {
		return 0
	}
	ls := strings.ToLower(s)
	ln := strings.ToLower(name)
	re := regexp.MustCompile(`(?i)` + fieldRe + `\s*:\s*([0-9.]+)`)
	idx := 0
	best := 0.0
	for {
		p := strings.Index(ls[idx:], ln)
		if p < 0 {
			break
		}
		p += idx
		start := p - 800
		if start < 0 {
			start = 0
		}
		end := p + 800
		if end > len(s) {
			end = len(s)
		}
		for _, m := range re.FindAllStringSubmatch(s[start:end], -1) {
			v, _ := strconv.ParseFloat(m[1], 64)
			if v > best {
				best = v
			}
		}
		idx = p + len(ln)
	}
	return best
}

func findGrainNearName(s, name string) string {
	name = strings.TrimSpace(name)
	if len(name) < 2 {
		return ""
	}
	ls := strings.ToLower(s)
	ln := strings.ToLower(name)
	re := regexp.MustCompile(`(?i)(?:SM_Grain|["']Grain Direction["']|["']Grain["'])\s*:\s*["']?([A-Za-z0-9 ]+)`)
	idx := 0
	for {
		p := strings.Index(ls[idx:], ln)
		if p < 0 {
			break
		}
		p += idx
		start := p - 800
		if start < 0 {
			start = 0
		}
		end := p + 800
		if end > len(s) {
			end = len(s)
		}
		if m := re.FindStringSubmatch(s[start:end]); len(m) == 2 {
			return strings.TrimSpace(m[1])
		}
		idx = p + len(ln)
	}
	return ""
}

func findQtyNearName(s, name string) int {
	name = strings.TrimSpace(name)
	if len(name) < 2 {
		return 0
	}
	ls := strings.ToLower(s)
	ln := strings.ToLower(name)
	best, idx := 0, 0
	reNB := regexp.MustCompile(`(?i)(?:["']?(?:NB|SM_Quantity|QUANTITY|quantity)["']?)\s*:\s*([0-9.]+)`)
	for {
		p := strings.Index(ls[idx:], ln)
		if p < 0 {
			break
		}
		p += idx
		start := p - 800
		if start < 0 {
			start = 0
		}
		end := p + 800
		if end > len(s) {
			end = len(s)
		}
		for _, m := range reNB.FindAllStringSubmatch(s[start:end], -1) {
			q, _ := strconv.Atoi(strings.Split(m[1], ".")[0])
			if q > best {
				best = q
			}
		}
		idx = p + len(ln)
	}
	return best
}

func mergeJobParts(geoms map[string]Geom, specs []PartSpec) []PartSpec {
	var out []PartSpec
	for _, sp := range specs {
		g, ok := geoms[sp.Name]
		if !ok {
			want := normName(sp.Name)
			for k, gg := range geoms {
				if normName(k) == want {
					g = gg
					ok = true
					break
				}
			}
		}
		if !ok || len(g.Outer) < 3 {
			continue
		}
		if sp.Qty < 1 {
			sp.Qty = 1
		}
		if sp.Grain == "" {
			sp.Grain = "any"
		}
		sp.Outer, sp.Inner = g.Outer, g.Inner
		out = append(out, sp)
	}
	return out
}

func grainAllows(grain string, deg float64) bool {
	for _, d := range grainRots(grain) {
		if d == deg {
			return true
		}
	}
	return false
}

func grainRots(grain string) []float64 {
	switch strings.ToLower(strings.TrimSpace(grain)) {
	case "length", "l", "x", "0", "horizontal":
		return []float64{0, 180}
	case "width", "w", "y", "90", "vertical":
		return []float64{90, 270}
	default:
		return []float64{0, 90, 180, 270}
	}
}

func rot(r Ring, deg float64) Ring {
	if deg == 0 {
		cp := make(Ring, len(r))
		copy(cp, r)
		return cp
	}
	rad := deg * math.Pi / 180
	c, s := math.Cos(rad), math.Sin(rad)
	out := make(Ring, len(r))
	for i, p := range r {
		out[i] = Pt{p.X*c - p.Y*s, p.X*s + p.Y*c}
	}
	return out
}

func bounds(r Ring) (minX, minY, maxX, maxY float64) {
	minX, minY = math.Inf(1), math.Inf(1)
	maxX, maxY = math.Inf(-1), math.Inf(-1)
	for _, p := range r {
		if p.X < minX {
			minX = p.X
		}
		if p.Y < minY {
			minY = p.Y
		}
		if p.X > maxX {
			maxX = p.X
		}
		if p.Y > maxY {
			maxY = p.Y
		}
	}
	return
}

func shift(r Ring, dx, dy float64) Ring {
	out := make(Ring, len(r))
	for i, p := range r {
		out[i] = Pt{p.X + dx, p.Y + dy}
	}
	return out
}

func area(r Ring) float64 {
	a := 0.0
	n := len(r)
	for i := 0; i < n; i++ {
		p, q := r[i], r[(i+1)%n]
		a += p.X*q.Y - q.X*p.Y
	}
	return math.Abs(a) / 2
}

func netArea(outer Ring, inner []Ring) float64 {
	a := area(outer)
	for _, h := range inner {
		if len(h) > 2 {
			a -= area(h)
		}
	}
	if a < 1 {
		minX, minY, maxX, maxY := bounds(outer)
		a = (maxX - minX) * (maxY - minY)
	}
	return a
}

type profile struct {
	deg, w, h, offX, spanW, spanH float64
	cols                          int
	bottom, top                   []float64
}

func spanAt(ring Ring, X float64) (lo, hi float64, ok bool) {
	lo, hi = math.Inf(1), math.Inf(-1)
	n := len(ring)
	for i := 0; i < n; i++ {
		a, b := ring[i], ring[(i+1)%n]
		x1, y1, x2, y2 := a.X, a.Y, b.X, b.Y
		if x1 == x2 {
			if math.Abs(x1-X) < 1e-9 {
				lo = math.Min(lo, math.Min(y1, y2))
				hi = math.Max(hi, math.Max(y1, y2))
			}
			continue
		}
		if (X < x1 && X < x2) || (X > x1 && X > x2) {
			continue
		}
		y := y1 + ((X-x1)/(x2-x1))*(y2-y1)
		lo = math.Min(lo, y)
		hi = math.Max(hi, y)
	}
	if math.IsInf(lo, 1) {
		return 0, 0, false
	}
	return lo, hi, true
}

func makeProfile(outer Ring, deg, res, gap float64) profile {
	ring := rot(outer, deg)
	minX, minY, maxX, maxY := bounds(ring)
	ring = shift(ring, -minX, -minY)
	w, h := maxX-minX, maxY-minY
	nc := int(math.Max(1, math.Ceil(w/res)))
	bottom := make([]float64, nc)
	top := make([]float64, nc)
	for i := 0; i < nc; i++ {
		x0 := float64(i) * res
		x1 := math.Min(float64(i+1)*res, w)
		lo, hi := math.Inf(1), math.Inf(-1)
		for _, X := range []float64{x0 + 1e-6, (x0 + x1) / 2, x1 - 1e-6} {
			if X < 1e-6 {
				X = 1e-6
			}
			if X > w-1e-6 {
				X = w - 1e-6
			}
			s0, s1, ok := spanAt(ring, X)
			if !ok {
				continue
			}
			lo = math.Min(lo, s0)
			hi = math.Max(hi, s1)
		}
		if math.IsInf(lo, 1) {
			lo, hi = 0, h
		}
		bottom[i], top[i] = lo, hi
	}
	g := int(math.Max(0, math.Round(gap/res)))
	nc2 := nc + 2*g
	B := make([]float64, nc2)
	T := make([]float64, nc2)
	for j := 0; j < nc2; j++ {
		lo2, hi2 := math.Inf(1), math.Inf(-1)
		for m := j - 2*g; m <= j; m++ {
			if m < 0 || m >= nc {
				continue
			}
			lo2 = math.Min(lo2, bottom[m])
			hi2 = math.Max(hi2, top[m])
		}
		if math.IsInf(lo2, 1) {
			B[j], T[j] = math.Inf(1), math.Inf(-1)
		} else {
			B[j], T[j] = lo2-gap, hi2+gap
		}
	}
	return profile{deg, w, h, -float64(g) * res, w + 2*gap, h + 2*gap, nc2, B, T}
}

type item struct {
	spec     PartSpec
	outer    Ring
	inner    []Ring
	area     float64
	hMax     float64
	profiles []profile
}

type holeBin struct {
	host string
	x, y float64
	w, h float64
	used bool
}

type nestSheet struct {
	sky    []float64
	placed []PlacedJSON
	steps  []int
	holes  []holeBin
}

func nestJob(job Job) []SheetJSON {
	groups := map[string][]item{}
	var order []string
	res, trim, gap := job.Res, job.Trim, job.Kerf/2
	usableL := job.Sheet.L - 2*trim
	usableW := job.Sheet.W - 2*trim
	for _, sp := range job.Parts {
		minX, minY, _, _ := bounds(sp.Outer)
		outer := shift(sp.Outer, -minX, -minY)
		var inner []Ring
		for _, h := range sp.Inner {
			if len(h) > 2 {
				inner = append(inner, shift(h, -minX, -minY))
			}
		}
		a := netArea(outer, inner)
		_, _, maxX, maxY := bounds(outer)
		it := item{spec: sp, outer: outer, inner: inner, area: a, hMax: math.Max(maxX, maxY)}
		for _, d := range grainRots(sp.Grain) {
			pr := makeProfile(outer, d, res, gap)
			if pr.spanW <= usableL && pr.spanH <= usableW {
				it.profiles = append(it.profiles, pr)
			}
		}
		key := fmt.Sprintf("%s · %.2f mm", strings.TrimSpace(sp.Material), sp.Thickness)
		if sp.Material == "" {
			key = fmt.Sprintf("sheet · %.2f mm", sp.Thickness)
		}
		n := sp.Qty
		if n < 1 {
			n = 1
		}
		if groups[key] == nil {
			order = append(order, key)
		}
		for i := 0; i < n; i++ {
			groups[key] = append(groups[key], it)
		}
	}
	var out []SheetJSON
	for _, key := range order {
		list := groups[key]
		sort.Slice(list, func(i, j int) bool { return list[i].area > list[j].area })
		shs := nestGroup(list, job, usableL, usableW)
		mat := list[0].spec.Material
		thk := list[0].spec.Thickness
		for _, sh := range shs {
			out = append(out, SheetJSON{
				Key: key, Material: mat, Thickness: thk,
				L: job.Sheet.L, W: job.Sheet.W, Placed: sh.placed,
			})
		}
	}
	return out
}

func nestGroup(items []item, job Job, usableL, usableW float64) []*nestSheet {
	res, trim := job.Res, job.Trim
	cols := int(math.Max(1, math.Floor(usableL/res)))
	var sheets []*nestSheet
	newSheet := func() *nestSheet {
		s := &nestSheet{sky: make([]float64, cols), steps: []int{0}}
		sheets = append(sheets, s)
		return s
	}
	tryHole := func(sh *nestSheet, it item) bool {
		minX, minY, maxX, maxY := bounds(it.outer)
		pw, ph := maxX-minX, maxY-minY
		allow0, allow90 := grainAllows(it.spec.Grain, 0), grainAllows(it.spec.Grain, 90)
		for i := range sh.holes {
			h := &sh.holes[i]
			if h.used {
				continue
			}
			if allow0 && pw+job.Kerf <= h.w && ph+job.Kerf <= h.h {
				h.used = true
				sh.placed = append(sh.placed, PlacedJSON{
					Name: it.spec.Name, X: h.x + job.Kerf/2, Y: h.y + job.Kerf/2,
					Deg: 0, W: pw, H: ph, Area: it.area, InHole: true, Host: h.host,
				})
				return true
			}
			if allow90 && ph+job.Kerf <= h.w && pw+job.Kerf <= h.h {
				h.used = true
				sh.placed = append(sh.placed, PlacedJSON{
					Name: it.spec.Name, X: h.x + job.Kerf/2, Y: h.y + job.Kerf/2,
					Deg: 90, W: ph, H: pw, Area: it.area, InHole: true, Host: h.host,
				})
				return true
			}
		}
		return false
	}
	tryPlace := func(sh *nestSheet, it item) bool {
		if tryHole(sh, it) {
			return true
		}
		var bestC int
		var bestPr *profile
		bestYf := math.Inf(1)
		bestC = 1 << 30
		for pi := range it.profiles {
			pr := &it.profiles[pi]
			lim := cols - pr.cols
			if lim < 0 {
				continue
			}
			cands := map[int]bool{}
			for _, st := range sh.steps {
				c := st
				if c < 0 {
					c = 0
				}
				if c > lim {
					c = lim
				}
				cands[c] = true
				c2 := st - pr.cols
				if c2 >= 0 && c2 <= lim {
					cands[c2] = true
				}
			}
			for c := range cands {
				y := 0.0
				ok := true
				for i := 0; i < pr.cols; i++ {
					if math.IsInf(pr.bottom[i], 1) {
						continue
					}
					need := sh.sky[c+i] - pr.bottom[i]
					if need > y {
						y = need
					}
					if y+pr.h > usableW {
						ok = false
						break
					}
				}
				if !ok {
					continue
				}
				if y < bestYf-1e-9 || (math.Abs(y-bestYf) < 1e-9 && c < bestC) {
					bestYf, bestC, bestPr = y, c, pr
				}
			}
		}
		if bestPr == nil {
			return false
		}
		for i := 0; i < bestPr.cols; i++ {
			if math.IsInf(bestPr.top[i], -1) {
				continue
			}
			t := bestYf + bestPr.top[i]
			if t > sh.sky[bestC+i] {
				sh.sky[bestC+i] = t
			}
		}
		sh.steps = append(sh.steps, bestC, int(math.Min(float64(cols-1), float64(bestC+bestPr.cols))))
		x := trim + float64(bestC)*res - bestPr.offX
		y := trim + bestYf
		sh.placed = append(sh.placed, PlacedJSON{
			Name: it.spec.Name, X: x, Y: y, Deg: bestPr.deg,
			W: bestPr.w, H: bestPr.h, Area: it.area,
		})
		for _, hole := range it.inner {
			if len(hole) < 3 {
				continue
			}
			hr := rot(hole, bestPr.deg)
			minX, minY, maxX, maxY := bounds(hr)
			or := rot(it.outer, bestPr.deg)
			ox, oy, _, _ := bounds(or)
			sh.holes = append(sh.holes, holeBin{
				host: it.spec.Name,
				x:    x + (minX - ox),
				y:    y + (minY - oy),
				w:    maxX - minX,
				h:    maxY - minY,
			})
		}
		return true
	}
	for _, it := range items {
		if len(it.profiles) == 0 {
			continue
		}
		placed := false
		from := 0
		if len(sheets) > 4 {
			from = len(sheets) - 4
		}
		for si := from; si < len(sheets); si++ {
			if tryPlace(sheets[si], it) {
				placed = true
				break
			}
		}
		if !placed {
			tryPlace(newSheet(), it)
		}
	}
	return sheets
}

func writeResult(path string, job Job, sheets []SheetJSON) error {
	type payload struct {
		Engine string      `json:"engine"`
		Sheet  SheetSize   `json:"sheet"`
		Trim   float64     `json:"trim"`
		Kerf   float64     `json:"kerf"`
		Sheets []SheetJSON `json:"sheets"`
	}
	p := payload{Engine: "SwoodNest-NESTINGWorks-rules", Sheet: job.Sheet, Trim: job.Trim, Kerf: job.Kerf, Sheets: sheets}
	b, err := json.MarshalIndent(p, "", " ")
	if err != nil {
		return err
	}
	js := "// db/nesting-works.js\nwindow.nestingWorks = " + string(b) + ";\n"
	return os.WriteFile(path, []byte(js), 0644)
}
