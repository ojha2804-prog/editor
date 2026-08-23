"""Workshop web UI for panel cutting layout optimisation."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from cutlayout.csv_import import panels_from_csv_text
from cutlayout.dxf import layout_to_dxf
from cutlayout.job import Job, load_job
from cutlayout.models import (
    OptimizationMethod,
    OptimizationPriority,
    OptimizationSettings,
    SheetMaterial,
    WastagePlacement,
)
from cutlayout.optimizer import optimize
from cutlayout.reports import cutting_list, job_summary
from cutlayout.serialize import result_to_dict
from cutlayout.visualize import layout_to_svg

STATIC_DIR = Path(__file__).parent / "static"
EXAMPLE_CSV = Path(__file__).resolve().parents[1] / "examples" / "kitchen_panels.csv"


def _job_from_request(payload: dict) -> Job:
    csv_text = payload.get("csv") or ""
    if payload.get("job_path"):
        return load_job(payload["job_path"])
    panels = panels_from_csv_text(csv_text)
    trim_lr = float(payload.get("trim_lr") or payload.get("trim_left") or 0)
    trim_tb = float(payload.get("trim_tb") or payload.get("trim_top") or 0)
    material = SheetMaterial(
        name=str(payload.get("material_name") or "Sheet"),
        sheet_width=float(payload["sheet_width"]),
        sheet_height=float(payload["sheet_height"]),
        kerf=float(payload.get("kerf") or 3.0),
        trim_left=trim_lr,
        trim_right=trim_lr,
        trim_top=trim_tb,
        trim_bottom=trim_tb,
        cost_per_sheet=float(payload.get("cost_per_sheet") or 0),
    )
    settings = OptimizationSettings(
        method=OptimizationMethod(payload.get("method") or "normal"),
        priority=OptimizationPriority(payload.get("priority") or "max_yield"),
        wastage=WastagePlacement(payload.get("wastage") or "maximize"),
        multistage_levels=int(payload.get("multistage_levels") or 2),
    )
    return Job(
        name=str(payload.get("name") or "Untitled job"),
        material=material,
        panels=panels,
        settings=settings,
    )


class CutlayoutHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path in {"/", "/index.html"}:
            self._send_bytes(200, "text/html; charset=utf-8", (STATIC_DIR / "index.html").read_bytes())
            return
        if path == "/api/example":
            csv_text = EXAMPLE_CSV.read_text() if EXAMPLE_CSV.exists() else ""
            self._send_json(200, {"csv": csv_text})
            return
        self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._send_json(400, {"error": "invalid JSON"})
            return

        if path == "/api/optimize":
            try:
                job = _job_from_request(payload)
                result = optimize(job)
                self._send_json(
                    200,
                    {
                        "result": result_to_dict(job, result),
                        "summary": job_summary(job, result),
                        "cutting_list": cutting_list(job, result),
                        "svg": layout_to_svg(result),
                        "dxf": layout_to_dxf(result),
                    },
                )
            except Exception as exc:  # noqa: BLE001
                self._send_json(400, {"error": str(exc)})
            return

        self._send_json(404, {"error": "not found"})

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self._send_bytes(status, "application/json; charset=utf-8", body)

    def _send_bytes(self, status: int, content_type: str, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def serve(host: str = "127.0.0.1", port: int = 8080) -> None:
    server = ThreadingHTTPServer((host, port), CutlayoutHandler)
    print(f"Cutlayout UI running at http://{host}:{port}")
    server.serve_forever()
