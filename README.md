# MaxCut Layout Software

Desktop panel-cutting software for woodworking and cabinetry, modelled on [MaxCut Software](https://maxcutsoftware.com/optimal-cutting-layouts/).

This is **not** a web page. It is a windowed application: enter panels and sheet sizes, run optimisation, and get cutting diagrams, costing, and exports.

## Run the software

```bash
pip install -e ".[dev]"
cutlayout
```

or:

```bash
cutlayout-app
cutlayout --app examples/kitchen_job.json
```

In the window:

1. **Job → Load kitchen example** (or File → Import CSV)
2. Set sheet size, kerf, trim, method, and wastage
3. Click **Optimise layouts**
4. File → Export SVG / Export DXF for the shop floor or CNC

## Features

| Feature | In the software |
|---------|-----------------|
| Guillotine cutting diagrams | Canvas in the main window |
| Kerf and sheet trim | Job header fields |
| Grain groups | Panel table |
| Tension-free cuts | Job JSON / CSV |
| Normal / multistage methods | Method dropdown |
| Wastage placement | Maximize or group at bottom |
| Cutting list and costing | Report panel |
| CSV import | File menu |
| SVG / DXF export | File menu |
| Save / open jobs | JSON job files |

## Command line (batch)

```bash
cutlayout examples/kitchen_job.json --svg layout.svg --dxf layout.dxf
```

## Tests

```bash
python3 -m pytest
```
