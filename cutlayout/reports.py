"""Reports for cutting layouts."""

from __future__ import annotations

from cutlayout.job import Job
from cutlayout.models import LayoutResult


def material_quantities(result: LayoutResult) -> dict:
    by_material: dict[str, dict] = {}
    for sheet in result.sheets:
        name = sheet.material.name
        entry = by_material.setdefault(
            name,
            {
                "material": name,
                "sheet_count": 0,
                "sheet_width": sheet.material.sheet_width,
                "sheet_height": sheet.material.sheet_height,
                "cost_per_sheet": sheet.material.cost_per_sheet,
                "total_cost": 0.0,
                "average_yield": 0.0,
            },
        )
        entry["sheet_count"] += 1
        entry["total_cost"] += sheet.material.cost_per_sheet
        entry["average_yield"] += sheet.yield_ratio

    for entry in by_material.values():
        if entry["sheet_count"]:
            entry["average_yield"] /= entry["sheet_count"]
    return by_material


def cutting_list(job: Job, result: LayoutResult) -> str:
    lines = [f"Cutting list: {job.name}", "=" * 60, ""]
    for sheet in result.sheets:
        lines.append(
            f"Sheet {sheet.sheet_index + 1} ({sheet.material.name}) "
            f"yield={sheet.yield_ratio:.1%} waste={sheet.waste_area:.0f}"
        )
        lines.append("-" * 60)
        for placement in sheet.placements:
            rotation = "rotated" if placement.rotated else "upright"
            tension = ""
            panel = next(
                (item for item in job.panels if item.label == placement.panel_label),
                None,
            )
            if panel and (panel.tension_long or panel.tension_short):
                tension = (
                    f" rough={placement.width:.0f}x{placement.height:.0f}"
                    f" finish={placement.finished_width:.0f}x{placement.finished_height:.0f}"
                )
            lines.append(
                f"  {placement.panel_label:<20} "
                f"x={placement.x:>7.1f} y={placement.y:>7.1f} "
                f"{placement.width:>7.1f} x {placement.height:>7.1f} {rotation}{tension}"
            )
        lines.append("")
    if result.unplaced:
        lines.append("UNPLACED PANELS")
        for panel in result.unplaced:
            lines.append(
                f"  {panel.label} {panel.cut_width():.1f} x {panel.cut_height():.1f}"
            )
    return "\n".join(lines)


def job_summary(job: Job, result: LayoutResult) -> str:
    quantities = material_quantities(result)
    lines = [
        f"Job summary: {job.name}",
        "=" * 60,
        f"Sheets used:      {result.sheet_count}",
        f"Average yield:    {result.average_yield:.1%}",
        f"Total sheet cost: {result.total_cost:.2f}",
        f"Method:           {job.settings.method.value}",
        f"Wastage:          {job.settings.wastage.value}",
        f"Priority:         {job.settings.priority.value}",
        "",
        "Materials",
        "-" * 60,
    ]
    for entry in quantities.values():
        lines.append(
            f"{entry['material']}: {entry['sheet_count']} sheets "
            f"@ {entry['sheet_width']:.0f}x{entry['sheet_height']:.0f} "
            f"(avg yield {entry['average_yield']:.1%}, cost {entry['total_cost']:.2f})"
        )
    return "\n".join(lines)
