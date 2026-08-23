"""Data models for panel cutting layout optimisation."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class OptimizationMethod(str, Enum):
    NORMAL = "normal"
    MULTISTAGE_LENGTH = "multistage_length"
    MULTISTAGE_WIDTH = "multistage_width"


class OptimizationPriority(str, Enum):
    MAX_YIELD = "max_yield"
    FAST_CUTTING = "fast_cutting"


class WastagePlacement(str, Enum):
    MAXIMIZE = "maximize"
    GROUP_AT_BOTTOM = "group_at_bottom"


class GrainDirection(str, Enum):
    ALONG_LENGTH = "along_length"
    ALONG_WIDTH = "along_width"
    ANY = "any"


@dataclass
class SheetMaterial:
    name: str
    sheet_width: float
    sheet_height: float
    kerf: float = 3.0
    trim_left: float = 0.0
    trim_right: float = 0.0
    trim_top: float = 0.0
    trim_bottom: float = 0.0
    grain_direction: GrainDirection = GrainDirection.ALONG_LENGTH
    cost_per_sheet: float = 0.0

    @property
    def usable_width(self) -> float:
        return self.sheet_width - self.trim_left - self.trim_right

    @property
    def usable_height(self) -> float:
        return self.sheet_height - self.trim_top - self.trim_bottom


@dataclass
class Panel:
    label: str
    width: float
    height: float
    quantity: int = 1
    material: str | None = None
    can_rotate: bool = True
    grain_group: str | None = None
    grain_direction: GrainDirection = GrainDirection.ANY
    tension_long: float = 0.0
    tension_short: float = 0.0

    def cut_width(self) -> float:
        return self.width + self.tension_long

    def cut_height(self) -> float:
        return self.height + self.tension_short

    def area(self) -> float:
        return self.cut_width() * self.cut_height()


@dataclass
class OptimizationSettings:
    method: OptimizationMethod = OptimizationMethod.NORMAL
    priority: OptimizationPriority = OptimizationPriority.MAX_YIELD
    wastage: WastagePlacement = WastagePlacement.MAXIMIZE
    multistage_levels: int = 2


@dataclass
class Placement:
    panel_label: str
    x: float
    y: float
    width: float
    height: float
    rotated: bool
    finished_width: float
    finished_height: float
    grain_group: str | None = None


@dataclass
class SheetLayout:
    sheet_index: int
    material: SheetMaterial
    placements: list[Placement] = field(default_factory=list)

    @property
    def used_area(self) -> float:
        return sum(placement.width * placement.height for placement in self.placements)

    @property
    def usable_area(self) -> float:
        return self.material.usable_width * self.material.usable_height

    @property
    def yield_ratio(self) -> float:
        if self.usable_area <= 0:
            return 0.0
        return self.used_area / self.usable_area

    @property
    def waste_area(self) -> float:
        return max(0.0, self.usable_area - self.used_area)


@dataclass
class LayoutResult:
    sheets: list[SheetLayout]
    unplaced: list[Panel]

    @property
    def sheet_count(self) -> int:
        return len(self.sheets)

    @property
    def average_yield(self) -> float:
        if not self.sheets:
            return 0.0
        return sum(sheet.yield_ratio for sheet in self.sheets) / len(self.sheets)

    @property
    def total_cost(self) -> float:
        return sum(sheet.material.cost_per_sheet for sheet in self.sheets)
