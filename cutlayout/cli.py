#!/usr/bin/env python3
"""Command-line interface for panel cutting layout optimisation."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from cutlayout.dxf import write_dxf
from cutlayout.job import apply_csv_panels, load_job
from cutlayout.optimizer import optimize
from cutlayout.reports import cutting_list, job_summary
from cutlayout.serialize import result_to_dict
from cutlayout.visualize import layout_to_svg


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cutlayout",
        description=(
            "Optimise panel cutting layouts on sheet materials "
            "(plywood, MDF, melamine) with kerf, trim, and grain controls."
        ),
    )
    parser.add_argument("job", nargs="?", help="Job definition JSON file")
    parser.add_argument(
        "--csv",
        metavar="FILE",
        help="replace job panels from a CSV cutlist",
    )
    parser.add_argument(
        "--svg",
        metavar="FILE",
        help="write cutting diagram SVG to FILE",
    )
    parser.add_argument(
        "--dxf",
        metavar="FILE",
        help="write CNC/CAD DXF cutting diagram to FILE",
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
    parser.add_argument(
        "--serve",
        action="store_true",
        help="start the workshop web UI",
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="web UI bind address (0.0.0.0 allows phones on the same Wi-Fi)",
    )
    parser.add_argument("--port", type=int, default=8080, help="web UI port")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.serve:
        from cutlayout.web import serve

        serve(host=args.host, port=args.port)
        return 0

    if not args.job:
        raise SystemExit("job JSON is required unless --serve is used")

    job = load_job(args.job)
    if args.csv:
        apply_csv_panels(job, args.csv)
    result = optimize(job)

    if args.json:
        print(json.dumps(result_to_dict(job, result), indent=2))
    elif args.summary_only:
        print(job_summary(job, result))
    else:
        print(job_summary(job, result))
        print()
        print(cutting_list(job, result))

    if args.svg:
        Path(args.svg).write_text(layout_to_svg(result))
    if args.dxf:
        write_dxf(result, args.dxf)

    return 1 if result.unplaced else 0


if __name__ == "__main__":
    raise SystemExit(main())
