"""SVG cutting diagram generation."""

from __future__ import annotations

from cutlayout.models import LayoutResult


def layout_to_svg(result: LayoutResult, scale: float = 0.15) -> str:
    """Render all sheet layouts to a single SVG document."""
    if not result.sheets:
        return '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="5" y="20">No sheets</text></svg>'

    margin = 20.0
    gap = 30.0
    x_cursor = margin
    y_cursor = margin
    row_height = 0.0
    max_width = 0.0
    parts: list[str] = []

    for sheet in result.sheets:
        width = sheet.material.sheet_width * scale
        height = sheet.material.sheet_height * scale
        if x_cursor + width + margin > 1200 and x_cursor > margin:
            x_cursor = margin
            y_cursor += row_height + gap
            row_height = 0.0

        parts.append(_sheet_svg(sheet, x_cursor, y_cursor, scale))
        x_cursor += width + gap
        row_height = max(row_height, height)
        max_width = max(max_width, x_cursor)

    total_height = y_cursor + row_height + margin
    header = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{max_width:.0f}" height="{total_height:.0f}" '
        f'viewBox="0 0 {max_width:.0f} {total_height:.0f}">'
    )
    footer = "</svg>"
    return header + "".join(parts) + footer


def _sheet_svg(sheet, origin_x: float, origin_y: float, scale: float) -> str:
    width = sheet.material.sheet_width * scale
    height = sheet.material.sheet_height * scale
    elements = [
        f'<rect x="{origin_x:.2f}" y="{origin_y:.2f}" width="{width:.2f}" '
        f'height="{height:.2f}" fill="#f8fafc" stroke="#334155" stroke-width="1"/>',
        f'<text x="{origin_x + 4:.2f}" y="{origin_y + 14:.2f}" '
        f'font-family="sans-serif" font-size="12" fill="#0f172a">'
        f"Sheet {sheet.sheet_index + 1} ({sheet.yield_ratio:.0%})</text>",
    ]

    colours = ["#bfdbfe", "#bbf7d0", "#fde68a", "#fecaca", "#ddd6fe", "#99f6e4"]
    for index, placement in enumerate(sheet.placements):
        colour = colours[index % len(colours)]
        px = origin_x + placement.x * scale
        py = origin_y + placement.y * scale
        pw = placement.width * scale
        ph = placement.height * scale
        elements.append(
            f'<rect x="{px:.2f}" y="{py:.2f}" width="{pw:.2f}" height="{ph:.2f}" '
            f'fill="{colour}" stroke="#1e293b" stroke-width="0.8"/>'
        )
        label = placement.panel_label
        if placement.rotated:
            label += " (R)"
        elements.append(
            f'<text x="{px + 4:.2f}" y="{py + 14:.2f}" '
            f'font-family="sans-serif" font-size="10" fill="#0f172a">{label}</text>'
        )
    return "".join(elements)
