"""Workshop web UI for panel cutting layout optimisation."""

from __future__ import annotations

import json
import socket
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


def lan_addresses() -> list[str]:
    """Return IPv4 addresses other devices on the same network can use."""
    addresses: list[str] = []
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            addresses.append(sock.getsockname()[0])
    except OSError:
        pass

    hostname = socket.gethostname()
    try:
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET, socket.SOCK_STREAM):
            address = info[4][0]
            if address not in addresses and not address.startswith("127."):
                addresses.append(address)
    except OSError:
        pass

    return addresses


def access_urls(port: int) -> dict:
    phone_urls = [f"http://{address}:{port}" for address in lan_addresses()]
    return {
        "localhost": f"http://127.0.0.1:{port}",
        "phone": phone_urls,
        "hint": (
            "localhost only works on this computer. On a phone, join the same "
            "Wi-Fi and open one of the phone URLs."
        ),
    }


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

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path in {"/", "/index.html"}:
            self._send_bytes(200, "text/html; charset=utf-8", (STATIC_DIR / "index.html").read_bytes())
            return
        if path == "/api/example":
            csv_text = EXAMPLE_CSV.read_text() if EXAMPLE_CSV.exists() else ""
            self._send_json(200, {"csv": csv_text})
            return
        if path == "/api/access":
            self._send_json(200, access_urls(self.server.server_port))
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


class _Server(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


def serve(host: str = "0.0.0.0", port: int = 8080) -> None:
    server = _Server((host, port), CutlayoutHandler)
    urls = access_urls(port)
    print(f"Cutlayout UI (this computer): {urls['localhost']}")
    if urls["phone"]:
        print("Open on your phone (same Wi-Fi, not localhost):")
        for url in urls["phone"]:
            print(f"  {url}")
    else:
        print("Could not detect a LAN address. Use this computer's Wi-Fi IP, port", port)
    print(urls["hint"])
    server.serve_forever()
