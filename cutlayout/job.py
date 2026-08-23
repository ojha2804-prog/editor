"""Job definition and JSON loading."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from cutlayout.csv_import import panels_from_csv
from cutlayout.models import (
    GrainDirection,
    OptimizationMethod,
    OptimizationPriority,
    OptimizationSettings,
    Panel,
    SheetMaterial,
    WastagePlacement,
)


@dataclass
class Job:
    name: str
    material: SheetMaterial
    panels: list[Panel]
    settings: OptimizationSettings = field(default_factory=OptimizationSettings)

    @classmethod
    def from_dict(cls, data: dict) -> Job:
        material_data = data["material"]
        material = SheetMaterial(
            name=material_data.get("name", "Sheet"),
            sheet_width=float(material_data["sheet_width"]),
            sheet_height=float(material_data["sheet_height"]),
            kerf=float(material_data.get("kerf", 3.0)),
            trim_left=float(material_data.get("trim_left", 0.0)),
            trim_right=float(material_data.get("trim_right", 0.0)),
            trim_top=float(material_data.get("trim_top", 0.0)),
            trim_bottom=float(material_data.get("trim_bottom", 0.0)),
            grain_direction=GrainDirection(
                material_data.get("grain_direction", GrainDirection.ALONG_LENGTH.value)
            ),
            cost_per_sheet=float(material_data.get("cost_per_sheet", 0.0)),
        )

        panels = []
        for item in data.get("panels", []):
            panels.append(
                Panel(
                    label=item["label"],
                    width=float(item["width"]),
                    height=float(item["height"]),
                    quantity=int(item.get("quantity", 1)),
                    material=item.get("material"),
                    can_rotate=bool(item.get("can_rotate", True)),
                    grain_group=item.get("grain_group"),
                    grain_direction=GrainDirection(
                        item.get("grain_direction", GrainDirection.ANY.value)
                    ),
                    tension_long=float(item.get("tension_long", 0.0)),
                    tension_short=float(item.get("tension_short", 0.0)),
                )
            )

        settings_data = data.get("settings", {})
        settings = OptimizationSettings(
            method=OptimizationMethod(
                settings_data.get("method", OptimizationMethod.NORMAL.value)
            ),
            priority=OptimizationPriority(
                settings_data.get("priority", OptimizationPriority.MAX_YIELD.value)
            ),
            wastage=WastagePlacement(
                settings_data.get("wastage", WastagePlacement.MAXIMIZE.value)
            ),
            multistage_levels=int(settings_data.get("multistage_levels", 2)),
        )

        return cls(
            name=data.get("name", "Untitled job"),
            material=material,
            panels=panels,
            settings=settings,
        )


def load_job(path: str | Path) -> Job:
    path = Path(path)
    if path.suffix.lower() == ".csv":
        raise ValueError(
            "CSV files contain panels only; pass a JSON job, or use --csv with a job JSON"
        )
    return Job.from_dict(json.loads(path.read_text()))


def apply_csv_panels(job: Job, csv_path: str | Path) -> Job:
    job.panels = panels_from_csv(csv_path)
    return job
