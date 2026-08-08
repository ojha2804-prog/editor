#!/usr/bin/env python3
"""Build a sample multi-sheet PDF preview of the drawing macro output."""

from pathlib import Path

from PIL import Image
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
PREVIEWS = ROOT / "output" / "previews"
OUT_PDF = ROOT / "output" / "sample-assembly-drawing.pdf"

SHEETS = [
    ("Sheet1 — Standard views", PREVIEWS / "preview-sheet1-standard-views.png"),
    ("Exploded — AutoExplode + Auto Balloons", PREVIEWS / "preview-sheet2-exploded-balloons.png"),
]


def draw_page(c: canvas.Canvas, title: str, image_path: Path, page_w: float, page_h: float) -> None:
    margin = 24
    header_h = 28

    c.setFillColorRGB(0.12, 0.16, 0.22)
    c.rect(0, page_h - header_h, page_w, header_h, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin, page_h - 19, f"CreateDrawing output preview — {title}")

    img = Image.open(image_path)
    iw, ih = img.size
    max_w = page_w - 2 * margin
    max_h = page_h - header_h - 2 * margin
    scale = min(max_w / iw, max_h / ih)
    dw, dh = iw * scale, ih * scale
    x = (page_w - dw) / 2
    y = margin + (max_h - dh) / 2

    c.drawImage(ImageReader(img), x, y, width=dw, height=dh, preserveAspectRatio=True, mask="auto")
    c.setStrokeColorRGB(0.75, 0.78, 0.82)
    c.rect(x, y, dw, dh, fill=0, stroke=1)
    c.showPage()


def main() -> None:
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    page_w, page_h = landscape(A3)
    c = canvas.Canvas(str(OUT_PDF), pagesize=landscape(A3))

    for title, path in SHEETS:
        if not path.exists():
            raise SystemExit(f"Missing preview image: {path}")
        draw_page(c, title, path, page_w, page_h)

    c.save()
    print(f"Wrote {OUT_PDF}")


if __name__ == "__main__":
    main()
