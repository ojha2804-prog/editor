"""Optimisation result types."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CutResult:
    """Partition of vertices and the cut value it achieves."""

    partition: tuple[bool, ...]
    cut_value: float
    iterations: int
    algorithm: str

    @property
    def set_a(self) -> list[int]:
        return [index for index, in_a in enumerate(self.partition) if in_a]

    @property
    def set_b(self) -> list[int]:
        return [index for index, in_a in enumerate(self.partition) if not in_a]

    def cut_ratio(self, total_weight: float) -> float:
        if total_weight <= 0:
            return 0.0
        return self.cut_value / total_weight
