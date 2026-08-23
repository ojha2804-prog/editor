#!/usr/bin/env python3
"""Command-line interface for panel cutting layout optimisation."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from cutlayout import load_job, optimize
from cutlayout.reports import cutting_list, job_summary, material_quantities
from cutlayout.visualize import layout_to_svg


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cutlayout",
        description=(
            "Optimise panel cutting layouts on sheet materials "
            "(plywood, MDF, melamine) with kerf, trim, and grain controls."
        ),
    )
    parser.add_argument("job", help="Job definition JSON file")
    parser.add_argument(
        "--svg",
        metavar="FILE",
        help="write cutting diagram SVG to FILE",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="emit machine-readable JSON output",
    )
    parser.add_argument(
        "--summary-only",
        action="store_true",
        help="print job summary without full cutting list",
    )
    return parser


def _result_to_dict(job, result) -> dict:
    return {
        "job": job.name,
        "sheet_count": result.sheet_count,
        "average_yield": result.average_yield,
        "total_cost": result.total_cost,
        "settings": {
            "method": job.settings.method.value,
            "priority": job.settings.priority.value,
            "wastage": job.settings.wastage.value,
            "multistage_levels": job.settings.multistage_levels,
        },
        "materials": material_quantities(result),
        "sheets": [
            {
                "index": sheet.sheet_index,
                "material": sheet.material.name,
                "yield_ratio": sheet.yield_ratio,
                "waste_area": sheet.waste_area,
                "placements": [
                    {
                        "label": placement.panel_label,
                        "x": placement.x,
                        "y": placement.y,
                        "width": placement.width,
                        "height": placement.height,
                        "rotated": placement.rotated,
                        "finished_width": placement.finished_width,
                        "finished_height": placement.finished_height,
                        "grain_group": placement.grain_group,
                    }
                    for placement in sheet.placements
                ],
            }
            for sheet in result.sheets
        ],
        "unplaced": [
            {
                "label": panel.label,
                "width": panel.width,
                "height": panel.height,
                "cut_width": panel.cut_width(),
                "cut_height": panel.cut_height(),
            }
            for panel in result.unplaced
        ],
    }


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    job = load_job(args.job)
    result = optimize(job)

    if args.json:
        print(json.dumps(_result_to_dict(job, result), indent=2))
    elif args.summary_only:
        print(job_summary(job, result))
    else:
        print(job_summary(job, result))
        print()
        print(cutting_list(job, result))

    if args.svg:
        Path(args.svg).write_text(layout_to_svg(result))

    return 1 if result.unplaced else 0


if __name__ == "__main__":
    raise SystemExit(main())
