"""Shared serialisation helpers for jobs and layout results."""

from __future__ import annotations

from cutlayout.job import Job
from cutlayout.models import LayoutResult
from cutlayout.reports import material_quantities


def result_to_dict(job: Job, result: LayoutResult) -> dict:
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
                "sheet_width": sheet.material.sheet_width,
                "sheet_height": sheet.material.sheet_height,
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
