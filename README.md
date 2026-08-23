# MaxCut Optimiser

Panel cutting layout optimisation for woodworking and cabinetry — inspired by [MaxCut Software](https://maxcutsoftware.com/optimal-cutting-layouts/). Enter panel and sheet sizes; the engine calculates efficient guillotine cutting layouts with kerf, trim, grain, and wastage controls.

Also includes a separate **graph Max-Cut** solver package (`maxcut`) for combinatorial optimisation problems.

## Panel cutting features

| Feature | Description |
|---------|-------------|
| **Guillotine layouts** | Physically cuttable edge-to-edge cuts for panel saws |
| **Kerf adjustment** | Blade thickness per material |
| **Sheet trim** | Edge allowances on all four sides |
| **Grain direction** | Lock panel orientation; grain groups for drawer fronts |
| **Tension-free cuts** | Rough-cut expansion before final trim |
| **Optimisation methods** | Normal, multistage (length/width first) |
| **Wastage placement** | Maximize yield or group offcuts at bottom |
| **Reports** | Cutting lists, material quantities, job costing |
| **SVG diagrams** | Visual cutting layouts |

## Install

```bash
pip install -e ".[dev]"
```

## Quick start

```bash
cutlayout examples/kitchen_job.json
cutlayout examples/kitchen_job.json --svg output.svg
cutlayout examples/kitchen_job.json --json
```

## Job file format

```json
{
  "name": "Kitchen cabinet job",
  "material": {
    "name": "18mm Melamine",
    "sheet_width": 2440,
    "sheet_height": 1220,
    "kerf": 3.2,
    "trim_left": 5,
    "trim_right": 5,
    "trim_top": 5,
    "trim_bottom": 5,
    "grain_direction": "along_length",
    "cost_per_sheet": 42.5
  },
  "settings": {
    "method": "normal",
    "priority": "max_yield",
    "wastage": "group_at_bottom",
    "multistage_levels": 2
  },
  "panels": [
    {"label": "Side left", "width": 720, "height": 560, "quantity": 2},
    {"label": "Door left", "width": 380, "height": 720, "tension_long": 4, "tension_short": 4}
  ]
}
```

### Settings (matching MaxCut Software)

- **method**: `normal`, `multistage_length`, `multistage_width`
- **priority**: `max_yield` or `fast_cutting`
- **wastage**: `maximize` or `group_at_bottom`
- **multistage_levels**: number of cut-direction stages

## Python API

```python
from cutlayout import load_job, optimize
from cutlayout.reports import cutting_list, job_summary
from cutlayout.visualize import layout_to_svg

job = load_job("examples/kitchen_job.json")
result = optimize(job)

print(job_summary(job, result))
print(cutting_list(job, result))
Path("layout.svg").write_text(layout_to_svg(result))
```

## Graph Max-Cut (separate module)

The `maxcut` package solves the mathematical Max-Cut problem on graphs:

```bash
maxcut examples/petersen.dimacs --compare
```

## Tests

```bash
python3 -m pytest
```

## Is it completely solved?

**Panel cutting** is NP-hard (2D bin packing). This tool produces strong guillotine layouts quickly, but does not guarantee the global optimum on every job. For production use, review layouts and adjust settings (method, wastage, priority) to match your workshop.

**Graph Max-Cut** exact solving is limited to small graphs (≤ 22 vertices); larger graphs use heuristics.
