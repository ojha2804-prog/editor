"""Spectral relaxation and Goemans-Williamson rounding."""

from __future__ import annotations

import math
import random

from maxcut.graph import Graph
from maxcut.result import CutResult
from maxcut.solvers import cut_value, greedy_local_search


def _laplacian(graph: Graph) -> list[list[float]]:
    n = graph.num_vertices
    degree = [0.0] * n
    for u in range(n):
        for v in range(n):
            if u != v:
                degree[u] += graph.edge_weight(u, v)

    matrix = [[0.0] * n for _ in range(n)]
    for u in range(n):
        matrix[u][u] = degree[u]
        for v in range(u + 1, n):
            weight = graph.edge_weight(u, v)
            matrix[u][v] = -weight
            matrix[v][u] = -weight
    return matrix


def _top_eigenvectors(matrix: list[list[float]], dimensions: int) -> list[list[float]]:
    try:
        import numpy as np
    except ImportError as exc:
        raise ImportError(
            "spectral solver requires numpy; install with: pip install maxcut-optimiser[spectral]"
        ) from exc

    array = np.asarray(matrix, dtype=float)
    eigenvalues, eigenvectors = np.linalg.eigh(array)
    order = np.argsort(eigenvalues)[::-1]
    top = eigenvectors[:, order[:dimensions]]
    return [top[:, index].tolist() for index in range(dimensions)]


def goemans_williamson(
    graph: Graph,
    *,
    seed: int | None = None,
    rounds: int = 64,
    refine: bool = True,
    dimensions: int | None = None,
) -> CutResult:
    """
    Solve Max-Cut via spectral relaxation and random hyperplane rounding.

    Implements the Goemans-Williamson strategy: embed vertices using the top
    eigenvectors of the graph Laplacian, then round with random hyperplanes.
    """
    if graph.num_vertices == 0:
        return CutResult(partition=(), cut_value=0.0, iterations=0, algorithm="spectral")

    rng = random.Random(seed)
    dims = dimensions or min(5, graph.num_vertices)
    laplacian = _laplacian(graph)
    embeddings = _top_eigenvectors(laplacian, dims)

    best_partition: tuple[bool, ...] | None = None
    best_value = -math.inf

    for _ in range(rounds):
        direction = [rng.gauss(0.0, 1.0) for _ in range(dims)]
        norm = math.sqrt(sum(component * component for component in direction)) or 1.0
        direction = [component / norm for component in direction]

        partition = []
        for vertex in range(graph.num_vertices):
            score = sum(
                embeddings[dim][vertex] * direction[dim] for dim in range(dims)
            )
            partition.append(score >= 0.0)

        if refine:
            refined = greedy_local_search(graph, initial_partition=partition)
            partition = list(refined.partition)
            value = refined.cut_value
        else:
            value = cut_value(graph, partition)

        if value > best_value:
            best_value = value
            best_partition = tuple(partition)

    assert best_partition is not None
    return CutResult(
        partition=best_partition,
        cut_value=best_value,
        iterations=rounds,
        algorithm="spectral",
    )
