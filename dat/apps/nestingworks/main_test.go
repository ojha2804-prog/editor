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
