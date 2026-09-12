package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPartInPartAndThickness(t *testing.T) {
	dir := t.TempDir()
	db := filepath.Join(dir, "db")
	os.MkdirAll(db, 0755)
	geo := `window.sheetMetalGeometry = {
 "BIG_Mat-MS_Thick-2_Qty-1": { "ok": true, "outer": [[0,0],[200,0],[200,120],[0,120]], "inner": [[[40,30],[160,30],[160,90],[40,90]]] },
 "SMALL_Mat-MS_Thick-2_Qty-1": { "ok": true, "outer": [[0,0],[50,0],[50,30],[0,30]], "inner": [] },
 "THICK_Mat-SS_Thick-4_Qty-1": { "ok": true, "outer": [[0,0],[80,0],[80,40],[0,40]], "inner": [] }
};`
	os.WriteFile(filepath.Join(db, "sheetmetal-geometry.js"), []byte(geo), 0644)
	if err := Run(dir, SheetSize{L: 2500, W: 1250, Label: "test"}); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(filepath.Join(db, "nesting-works.js"))
	if err != nil {
		t.Fatal(err)
	}
	s := string(b)
	if !strings.Contains(s, "window.nestingWorks") {
		t.Fatal("missing window.nestingWorks")
	}
	if !strings.Contains(s, `"inHole": true`) {
		t.Fatal("expected part-in-part (small blank in cut-out)")
	}
	if strings.Count(s, `"key"`) < 2 {
		t.Fatal("expected separate sheets/groups for 2 mm and 4 mm")
	}
}

func TestReportQtyFromNB(t *testing.T) {
	dir := t.TempDir()
	db := filepath.Join(dir, "db")
	os.MkdirAll(db, 0755)
	geo := `window.sheetMetalGeometry = {
 "Part1_Default": { "ok": true, "outer": [[0,0],[100,0],[100,50],[0,50]], "inner": [] }
};`
	raw := `window.reportDataRaw = { parts: [{ name: "Part1", variables: { NB: 5, SM_Thickness: 3 } }] };`
	os.WriteFile(filepath.Join(db, "sheetmetal-geometry.js"), []byte(geo), 0644)
	os.WriteFile(filepath.Join(db, "report-data-raw.js"), []byte(raw), 0644)
	if err := Run(dir, SheetSize{L: 2500, W: 1250, Label: "test"}); err != nil {
		t.Fatal(err)
	}
	b, _ := os.ReadFile(filepath.Join(db, "nesting-works.js"))
	if n := strings.Count(string(b), `"name": "Part1_Default"`); n != 5 {
		t.Fatalf("expected 5 blanks, got %d\n%s", n, b)
	}
}

func TestVirtualNameQty(t *testing.T) {
	dir := t.TempDir()
	db := filepath.Join(dir, "db")
	os.MkdirAll(db, 0755)
	geo := `window.sheetMetalGeometry = {
 "Part1^Study Table_Default": { "ok": true, "virtual": true, "outer": [[0,0],[100,0],[100,50],[0,50]], "inner": [] }
};`
	raw := `window.reportDataRaw = { parts: [{ name: "Part1", variables: { NB: 3, SM_Thickness: 2 } }] };`
	os.WriteFile(filepath.Join(db, "sheetmetal-geometry.js"), []byte(geo), 0644)
	os.WriteFile(filepath.Join(db, "report-data-raw.js"), []byte(raw), 0644)
	if err := Run(dir, SheetSize{L: 2500, W: 1250, Label: "test"}); err != nil {
		t.Fatal(err)
	}
	b, _ := os.ReadFile(filepath.Join(db, "nesting-works.js"))
	s := string(b)
	if n := strings.Count(s, `"name": "Part1^Study Table_Default"`); n != 3 {
		t.Fatalf("expected 3 virtual blanks, got %d\n%s", n, s)
	}
	if !strings.Contains(s, `"thickness": 2`) && !strings.Contains(s, `"thickness": 2.0`) {
		t.Fatalf("expected thickness group 2 mm\n%s", s)
	}
}

func TestNormVirtualCaret(t *testing.T) {
	if normName("Part1^Study Table_Default") != "part1" {
		t.Fatalf("normName virtual = %q", normName("Part1^Study Table_Default"))
	}
}

func TestGrainLengthOnly0or180(t *testing.T) {
	r := grainRots("Length")
	if len(r) != 2 || r[0] != 0 || r[1] != 180 {
		t.Fatalf("grain length rotations = %v", r)
	}
	r = grainRots("Width")
	if len(r) != 2 || r[0] != 90 || r[1] != 270 {
		t.Fatalf("grain width rotations = %v", r)
	}
}
