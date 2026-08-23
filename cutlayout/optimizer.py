"""Guillotine cutting layout optimiser."""

from __future__ import annotations

from dataclasses import dataclass, field
from math import isclose

from cutlayout.job import Job
from cutlayout.models import (
    GrainDirection,
    LayoutResult,
    OptimizationMethod,
    OptimizationPriority,
    Panel,
    Placement,
    SheetLayout,
    SheetMaterial,
    WastagePlacement,
)


@dataclass
class _FreeRect:
    x: float
    y: float
    width: float
    height: float
    level: int = 0


@dataclass
class _PanelInstance:
    panel: Panel
    index: int
    width: float
    height: float


@dataclass
class _SheetState:
    layout: SheetLayout
    free_rects: list[_FreeRect] = field(default_factory=list)


def optimize(job: Job) -> LayoutResult:
    """Generate optimal guillotine cutting layouts for a job."""
    instances = _expand_panels(job.panels)
    grain_groups: dict[str, list[_PanelInstance]] = {}
    for instance in instances:
        if instance.panel.grain_group:
            grain_groups.setdefault(instance.panel.grain_group, []).append(instance)

    grouped_ids = {
        instance.index
        for group in grain_groups.values()
        for instance in group
    }
    ordered: list[_PanelInstance] = []
    for group_name in sorted(grain_groups):
        ordered.extend(_order_instances(grain_groups[group_name], job.settings.priority))
    ordered.extend(
        _order_instances(
            [instance for instance in instances if instance.index not in grouped_ids],
            job.settings.priority,
        )
    )

    sheets: list[_SheetState] = []
    unplaced: list[Panel] = []

    for instance in ordered:
        group_name = instance.panel.grain_group
        if not _place_instance(job, instance, sheets, group_name=group_name):
            unplaced.append(instance.panel)

    return LayoutResult(
        sheets=[state.layout for state in sheets],
        unplaced=unplaced,
    )


def _expand_panels(panels: list[Panel]) -> list[_PanelInstance]:
    instances: list[_PanelInstance] = []
    index = 0
    for panel in panels:
        for _ in range(panel.quantity):
            instances.append(
                _PanelInstance(
                    panel=panel,
                    index=index,
                    width=panel.cut_width(),
                    height=panel.cut_height(),
                )
            )
            index += 1
    return instances


def _order_instances(
    instances: list[_PanelInstance],
    priority: OptimizationPriority,
) -> list[_PanelInstance]:
    if priority == OptimizationPriority.FAST_CUTTING:
        return sorted(instances, key=lambda item: max(item.width, item.height), reverse=True)
    return sorted(instances, key=lambda item: item.width * item.height, reverse=True)


def _place_instance(
    job: Job,
    instance: _PanelInstance,
    sheets: list[_SheetState],
    group_name: str | None = None,
) -> bool:
    orientations = _orientations(job, instance)
    if not orientations:
        return False

    best: tuple[float, int, Placement, list[_FreeRect]] | None = None

    for sheet_index, state in enumerate(sheets):
        candidate = _best_placement_in_sheet(
            job,
            instance,
            orientations,
            state.free_rects,
            group_name=group_name,
        )
        if candidate is None:
            continue
        score, placement, updated_rects = candidate
        if best is None or score > best[0]:
            best = (score, sheet_index, placement, updated_rects)

    if best is not None:
        _, sheet_index, placement, updated_rects = best
        sheets[sheet_index].layout.placements.append(placement)
        sheets[sheet_index].free_rects = updated_rects
        return True

    state = _SheetState(
        layout=SheetLayout(sheet_index=len(sheets), material=job.material),
        free_rects=_initial_free_rects(job.material),
    )
    candidate = _best_placement_in_sheet(
        job,
        instance,
        orientations,
        state.free_rects,
        group_name=group_name,
    )
    if candidate is None:
        return False

    _, placement, updated_rects = candidate
    state.layout.placements.append(placement)
    state.free_rects = updated_rects
    sheets.append(state)
    return True


def _orientations(job: Job, instance: _PanelInstance) -> list[tuple[float, float, bool]]:
    panel = instance.panel
    options: list[tuple[float, float, bool]] = []

    def add(width: float, height: float, rotated: bool) -> None:
        if width <= 0 or height <= 0:
            return
        if not panel.can_rotate and rotated:
            return
        if not _grain_allows(panel, job.material, width, height):
            return
        options.append((width, height, rotated))

    add(instance.width, instance.height, False)
    if panel.can_rotate and not isclose(instance.width, instance.height):
        add(instance.height, instance.width, True)

    unique: list[tuple[float, float, bool]] = []
    for option in options:
        if option not in unique:
            unique.append(option)
    return unique


def _grain_allows(
    panel: Panel,
    material: SheetMaterial,
    width: float,
    height: float,
) -> bool:
    if panel.grain_direction == GrainDirection.ANY:
        return True

    if material.grain_direction == GrainDirection.ALONG_LENGTH:
        long_side, short_side = material.usable_width, material.usable_height
    else:
        long_side, short_side = material.usable_height, material.usable_width

    panel_long = max(width, height)
    panel_short = min(width, height)

    if panel.grain_direction == GrainDirection.ALONG_LENGTH:
        return panel_long <= long_side + 1e-6 and panel_short <= short_side + 1e-6
    return panel_long <= short_side + 1e-6 and panel_short <= long_side + 1e-6


def _initial_free_rects(material: SheetMaterial) -> list[_FreeRect]:
    return [
        _FreeRect(
            x=material.trim_left,
            y=material.trim_top,
            width=material.usable_width,
            height=material.usable_height,
        )
    ]


def _best_placement_in_sheet(
    job: Job,
    instance: _PanelInstance,
    orientations: list[tuple[float, float, bool]],
    free_rects: list[_FreeRect],
    group_name: str | None,
) -> tuple[float, Placement, list[_FreeRect]] | None:
    best: tuple[float, Placement, list[_FreeRect]] | None = None

    for rect in free_rects:
        for width, height, rotated in orientations:
            if width > rect.width + 1e-6 or height > rect.height + 1e-6:
                continue
            placement = Placement(
                panel_label=instance.panel.label,
                x=rect.x,
                y=rect.y,
                width=width,
                height=height,
                rotated=rotated,
                finished_width=instance.panel.width,
                finished_height=instance.panel.height,
                grain_group=group_name or instance.panel.grain_group,
            )
            updated_rects = list(free_rects)
            updated_rects.remove(rect)
            updated_rects.extend(
                _split_rect(
                    rect,
                    width,
                    height,
                    job.material.kerf,
                    job.settings.method,
                    job.settings.multistage_levels,
                )
            )
            score = _placement_score(job, rect, width, height, updated_rects)
            if best is None or score > best[0]:
                best = (score, placement, updated_rects)

    return best


def _placement_score(
    job: Job,
    rect: _FreeRect,
    width: float,
    height: float,
    free_rects: list[_FreeRect],
) -> float:
    score = width * height

    if job.settings.wastage == WastagePlacement.GROUP_AT_BOTTOM:
        score += (job.material.sheet_height - rect.y) * 0.01

    if job.settings.priority == OptimizationPriority.FAST_CUTTING:
        score -= len(free_rects) * 5
        score += max((r.width * r.height for r in free_rects), default=0) * 0.001

    leftover_area = sum(r.width * r.height for r in free_rects)
    score -= leftover_area * 0.0001
    return score


def _split_rect(
    rect: _FreeRect,
    placed_width: float,
    placed_height: float,
    kerf: float,
    method: OptimizationMethod,
    multistage_levels: int,
) -> list[_FreeRect]:
    right_width = rect.width - placed_width - kerf
    bottom_height = rect.height - placed_height - kerf
    children: list[_FreeRect] = []
    level = rect.level + 1

    if method == OptimizationMethod.MULTISTAGE_LENGTH:
        vertical_first = rect.level < multistage_levels
    elif method == OptimizationMethod.MULTISTAGE_WIDTH:
        vertical_first = rect.level >= multistage_levels
    else:
        vertical_first = right_width > bottom_height

    if vertical_first:
        if right_width > 0:
            children.append(
                _FreeRect(
                    x=rect.x + placed_width + kerf,
                    y=rect.y,
                    width=right_width,
                    height=rect.height,
                    level=level,
                )
            )
        if bottom_height > 0:
            children.append(
                _FreeRect(
                    x=rect.x,
                    y=rect.y + placed_height + kerf,
                    width=placed_width,
                    height=bottom_height,
                    level=level,
                )
            )
    else:
        if bottom_height > 0:
            children.append(
                _FreeRect(
                    x=rect.x,
                    y=rect.y + placed_height + kerf,
                    width=rect.width,
                    height=bottom_height,
                    level=level,
                )
            )
        if right_width > 0:
            children.append(
                _FreeRect(
                    x=rect.x + placed_width + kerf,
                    y=rect.y,
                    width=right_width,
                    height=placed_height,
                    level=level,
                )
            )

    return [child for child in children if child.width > 0 and child.height > 0]
