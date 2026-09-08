#!/usr/bin/env python3
"""Serve a SWOOD HTML report over HTTP (required for Vite ES modules)."""
from __future__ import annotations

import argparse
import http.server
import os
import socketserver
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "report",
        nargs="?",
        default="example",
        help="Folder under reports/ (default: example)",
    )
    parser.add_argument("--port", type=int, default=5173)
    args = parser.parse_args()

    directory = ROOT / "reports" / args.report
    if not (directory / "index.html").is_file():
        raise SystemExit(
            f"No index.html in {directory}. Extract Assem1 first, or use: "
            "python3 scripts/serve.py example"
        )

    os.chdir(directory)
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as httpd:
        print(f"Serving {directory} at http://127.0.0.1:{args.port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
