"""ASCII DXF export for CNC / CAD cutting diagrams."""

from __future__ import annotations

from pathlib import Path

from cutlayout.models import LayoutResult, SheetLayout


def _pair(code: int, value: object) -> str:
    return f"{code}\n{value}\n"


def _line(x1: float, y1: float, x2: float, y2: float, layer: str) -> str:
    return (
        _pair(0, "LINE")
        + _pair(8, layer)
        + _pair(10, f"{x1:.4f}")
        + _pair(20, f"{y1:.4f}")
        + _pair(11, f"{x2:.4f}")
        + _pair(21, f"{y2:.4f}")
    )


def _rectangle(x: float, y: float, width: float, height: float, layer: str) -> str:
    x2, y2 = x + width, y + height
    return (
        _line(x, y, x2, y, layer)
        + _line(x2, y, x2, y2, layer)
        + _line(x2, y2, x, y2, layer)
        + _line(x, y2, x, y, layer)
    )


def _text(x: float, y: float, height: float, content: str, layer: str) -> str:
    safe = content.replace("\n", " ")
    return (
        _pair(0, "TEXT")
        + _pair(8, layer)
        + _pair(10, f"{x:.4f}")
        + _pair(20, f"{y:.4f}")
        + _pair(40, f"{height:.4f}")
        + _pair(1, safe)
    )


def _sheet_entities(sheet: SheetLayout, origin_x: float) -> str:
    material = sheet.material
    # DXF origin is bottom-left; layouts use top-left Y, so flip.
    def flip(y: float, height: float = 0.0) -> float:
        return material.sheet_height - y - height

    parts = [
        _rectangle(origin_x, 0, material.sheet_width, material.sheet_height, "SHEET"),
        _rectangle(
            origin_x + material.trim_left,
            material.trim_bottom,
            material.usable_width,
            material.usable_height,
            "TRIM",
        ),
        _text(
            origin_x + 20,
            material.sheet_height + 40,
            30,
            f"Sheet {sheet.sheet_index + 1}  {material.name}  yield {sheet.yield_ratio:.0%}",
            "LABELS",
        ),
    ]
    for placement in sheet.placements:
        y = flip(placement.y, placement.height)
        parts.append(
            _rectangle(
                origin_x + placement.x,
                y,
                placement.width,
                placement.height,
                "PANELS",
            )
        )
        label = placement.panel_label
        if placement.rotated:
            label += " (R)"
        parts.append(
            _text(
                origin_x + placement.x + 8,
                y + min(30.0, placement.height / 2),
                min(20.0, max(8.0, placement.height / 8)),
                f"{label} {placement.width:.0f}x{placement.height:.0f}",
                "LABELS",
            )
        )
    return "".join(parts)


def layout_to_dxf(result: LayoutResult, gap: float = 80.0) -> str:
    """Return a DXF R12 document with all sheets laid out left-to-right."""
    entities = ""
    origin_x = 0.0
    for sheet in result.sheets:
        entities += _sheet_entities(sheet, origin_x)
        origin_x += sheet.material.sheet_width + gap

    return (
        _pair(0, "SECTION")
        + _pair(2, "HEADER")
        + _pair(9, "$ACADVER")
        + _pair(1, "AC1009")
        + _pair(0, "ENDSEC")
        + _pair(0, "SECTION")
        + _pair(2, "TABLES")
        + _pair(0, "TABLE")
        + _pair(2, "LAYER")
        + _pair(70, 4)
        + _layer("SHEET", 7)
        + _layer("TRIM", 8)
        + _layer("PANELS", 3)
        + _layer("LABELS", 2)
        + _pair(0, "ENDTAB")
        + _pair(0, "ENDSEC")
        + _pair(0, "SECTION")
        + _pair(2, "ENTITIES")
        + entities
        + _pair(0, "ENDSEC")
        + _pair(0, "EOF")
    )


def _layer(name: str, colour: int) -> str:
    return (
        _pair(0, "LAYER")
        + _pair(2, name)
        + _pair(70, 0)
        + _pair(62, colour)
        + _pair(6, "CONTINUOUS")
    )


def write_dxf(result: LayoutResult, path: str | Path) -> None:
    Path(path).write_text(layout_to_dxf(result))
