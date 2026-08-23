"""Graph representation for Max-Cut problems."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence


@dataclass(frozen=True)
class Graph:
    """Undirected weighted graph stored as an upper-triangular adjacency matrix."""

    weights: tuple[tuple[float, ...], ...]

    def __post_init__(self) -> None:
        n = len(self.weights)
        if n == 0:
            return
        if any(len(row) != n for row in self.weights):
            raise ValueError("adjacency matrix must be square")
        for i, row in enumerate(self.weights):
            if row[i] != 0:
                raise ValueError(f"self-loop at vertex {i} is not allowed")
            for j in range(i):
                if row[j] != self.weights[j][i]:
                    raise ValueError("adjacency matrix must be symmetric")

    @property
    def num_vertices(self) -> int:
        return len(self.weights)

    def edge_weight(self, u: int, v: int) -> float:
        if u == v:
            return 0.0
        return self.weights[u][v]

    @classmethod
    def from_edges(
        cls,
        num_vertices: int,
        edges: Iterable[tuple[int, int, float]],
    ) -> Graph:
        matrix = [[0.0] * num_vertices for _ in range(num_vertices)]
        for u, v, weight in edges:
            if not (0 <= u < num_vertices and 0 <= v < num_vertices):
                raise ValueError(f"edge ({u}, {v}) is out of range")
            if u == v:
                raise ValueError(f"self-loop at vertex {u} is not allowed")
            if weight < 0:
                raise ValueError("edge weights must be non-negative")
            matrix[u][v] = weight
            matrix[v][u] = weight
        return cls(tuple(tuple(row) for row in matrix))

    @classmethod
    def from_adjacency(cls, matrix: Sequence[Sequence[float]]) -> Graph:
        return cls(tuple(tuple(float(value) for value in row) for row in matrix))

    @classmethod
    def from_dimacs(cls, path: str | Path) -> Graph:
        """Load a DIMACS max-cut instance (p edge <n> or p col <n>)."""
        path = Path(path)
        num_vertices: int | None = None
        edges: list[tuple[int, int, float]] = []

        for raw_line in path.read_text().splitlines():
            line = raw_line.strip()
            if not line or line.startswith("c"):
                continue
            parts = line.split()
            tag = parts[0].lower()
            if tag == "p":
                if parts[1].lower() not in {"edge", "col"}:
                    raise ValueError(f"unsupported DIMACS problem type: {parts[1]}")
                num_vertices = int(parts[2])
            elif tag == "e":
                if num_vertices is None:
                    raise ValueError("edge line before problem declaration")
                u, v = int(parts[1]) - 1, int(parts[2]) - 1
                weight = float(parts[3]) if len(parts) > 3 else 1.0
                edges.append((u, v, weight))

        if num_vertices is None:
            raise ValueError("missing DIMACS problem declaration")

        return cls.from_edges(num_vertices, edges)

    def total_weight(self) -> float:
        total = 0.0
        for u in range(self.num_vertices):
            for v in range(u + 1, self.num_vertices):
                total += self.weights[u][v]
        return total
