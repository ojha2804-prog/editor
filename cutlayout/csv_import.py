"""Import panel lists from CSV cutlists."""

from __future__ import annotations

import csv
import io
from pathlib import Path

from cutlayout.models import GrainDirection, Panel

BOOLEAN_TRUE = {"1", "true", "yes", "y", "on"}
COLUMN_ALIASES = {
    "label": {"label", "name", "panel", "part", "item"},
    "width": {"width", "w", "x", "length"},
    "height": {"height", "h", "y", "depth"},
    "quantity": {"quantity", "qty", "count", "n"},
    "can_rotate": {"can_rotate", "rotate", "rotation"},
    "grain_group": {"grain_group", "grain", "group"},
    "grain_direction": {"grain_direction", "grain_dir"},
    "tension_long": {"tension_long", "expand_long", "rough_long"},
    "tension_short": {"tension_short", "expand_short", "rough_short"},
    "material": {"material", "board"},
}


def _normalise_header(name: str) -> str:
    return name.strip().lower().replace(" ", "_")


def _map_headers(fieldnames: list[str] | None) -> dict[str, str]:
    if not fieldnames:
        raise ValueError("CSV file has no header row")
    mapped: dict[str, str] = {}
    for raw in fieldnames:
        key = _normalise_header(raw)
        for canonical, aliases in COLUMN_ALIASES.items():
            if key in aliases:
                mapped[canonical] = raw
                break
    if "label" not in mapped or "width" not in mapped or "height" not in mapped:
        raise ValueError("CSV must include label, width, and height columns")
    return mapped


def _as_bool(value: str, default: bool = True) -> bool:
    if value is None or str(value).strip() == "":
        return default
    return str(value).strip().lower() in BOOLEAN_TRUE


def panels_from_csv_text(text: str) -> list[Panel]:
    reader = csv.DictReader(io.StringIO(text))
    mapping = _map_headers(reader.fieldnames)
    panels: list[Panel] = []
    for row_number, row in enumerate(reader, start=2):
        label = (row.get(mapping["label"]) or "").strip()
        if not label:
            continue
        try:
            width = float(row[mapping["width"]])
            height = float(row[mapping["height"]])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"invalid width/height on CSV row {row_number}") from exc

        quantity_raw = row.get(mapping.get("quantity", ""), "1") if "quantity" in mapping else "1"
        panels.append(
            Panel(
                label=label,
                width=width,
                height=height,
                quantity=int(quantity_raw or 1),
                material=(row.get(mapping["material"]) or None) if "material" in mapping else None,
                can_rotate=_as_bool(row.get(mapping["can_rotate"], "")) if "can_rotate" in mapping else True,
                grain_group=(row.get(mapping["grain_group"]) or None) if "grain_group" in mapping else None,
                grain_direction=GrainDirection(
                    (
                        row.get(mapping["grain_direction"]) or GrainDirection.ANY.value
                    ).strip()
                    or GrainDirection.ANY.value
                    if "grain_direction" in mapping
                    else GrainDirection.ANY.value
                ),
                tension_long=float(row.get(mapping["tension_long"]) or 0)
                if "tension_long" in mapping
                else 0.0,
                tension_short=float(row.get(mapping["tension_short"]) or 0)
                if "tension_short" in mapping
                else 0.0,
            )
        )
    if not panels:
        raise ValueError("CSV contains no panels")
    return panels


def panels_from_csv(path: str | Path) -> list[Panel]:
    return panels_from_csv_text(Path(path).read_text())
