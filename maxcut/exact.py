"""Exact Max-Cut solver for small graphs."""

from __future__ import annotations

from maxcut.graph import Graph
from maxcut.result import CutResult
from maxcut.solvers import cut_value

MAX_EXACT_VERTICES = 22


def exact_maxcut(graph: Graph) -> CutResult:
    """Enumerate all partitions and return the optimal cut (feasible for n <= 22)."""
    n = graph.num_vertices
    if n > MAX_EXACT_VERTICES:
        raise ValueError(
            f"exact solver supports at most {MAX_EXACT_VERTICES} vertices, got {n}"
        )

    if n == 0:
        return CutResult(partition=(), cut_value=0.0, iterations=0, algorithm="exact")

    best_value = -1.0
    best_partition: tuple[bool, ...] | None = None
    iterations = 0

    for mask in range(1 << n):
        partition = tuple(bool(mask >> vertex & 1) for vertex in range(n))
        value = cut_value(graph, partition)
        iterations += 1
        if value > best_value:
            best_value = value
            best_partition = partition

    assert best_partition is not None
    return CutResult(
        partition=best_partition,
        cut_value=best_value,
        iterations=iterations,
        algorithm="exact",
    )
