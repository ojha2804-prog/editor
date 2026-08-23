"""Max-Cut optimisation algorithms."""

from __future__ import annotations

import math
import random
from typing import Literal, Sequence

from maxcut.graph import Graph
from maxcut.result import CutResult

Algorithm = Literal["auto", "local", "annealing", "restarts"]


def solve(
    graph: Graph,
    *,
    algorithm: Algorithm = "auto",
    seed: int | None = None,
    max_iterations: int = 10_000,
) -> CutResult:
    """Solve Max-Cut using the requested strategy."""
    if algorithm == "auto":
        if graph.num_vertices <= 64:
            return random_restarts(
                graph,
                seed=seed,
                restarts=min(32, max(8, graph.num_vertices)),
                max_iterations=max_iterations,
            )
        return simulated_annealing(graph, seed=seed, max_iterations=max_iterations)

    solvers = {
        "local": greedy_local_search,
        "annealing": simulated_annealing,
        "restarts": random_restarts,
    }
    return solvers[algorithm](graph, seed=seed, max_iterations=max_iterations)


def cut_value(graph: Graph, partition: Sequence[bool]) -> float:
    """Return total weight of edges crossing the partition."""
    total = 0.0
    for u in range(graph.num_vertices):
        for v in range(u + 1, graph.num_vertices):
            if partition[u] != partition[v]:
                total += graph.edge_weight(u, v)
    return total


def _delta_on_flip(graph: Graph, partition: Sequence[bool], vertex: int) -> float:
    """Change in cut value if `vertex` is moved to the other side."""
    gain = 0.0
    for other in range(graph.num_vertices):
        if other == vertex:
            continue
        weight = graph.edge_weight(vertex, other)
        if partition[vertex] == partition[other]:
            gain += weight
        else:
            gain -= weight
    return gain


def greedy_local_search(
    graph: Graph,
    *,
    seed: int | None = None,
    initial_partition: Sequence[bool] | None = None,
    max_iterations: int = 10_000,
) -> CutResult:
    """Hill-climbing via single-vertex flips until no improving move exists."""
    rng = random.Random(seed)
    if initial_partition is None:
        partition = [rng.random() < 0.5 for _ in range(graph.num_vertices)]
    else:
        partition = list(initial_partition)

    iterations = 0
    while iterations < max_iterations:
        best_vertex = -1
        best_gain = 0.0
        for vertex in range(graph.num_vertices):
            gain = _delta_on_flip(graph, partition, vertex)
            if gain > best_gain:
                best_gain = gain
                best_vertex = vertex
        if best_vertex < 0:
            break
        partition[best_vertex] = not partition[best_vertex]
        iterations += 1

    value = cut_value(graph, partition)
    return CutResult(
        partition=tuple(partition),
        cut_value=value,
        iterations=iterations,
        algorithm="local",
    )


def random_restarts(
    graph: Graph,
    *,
    seed: int | None = None,
    restarts: int = 16,
    max_iterations: int = 10_000,
) -> CutResult:
    """Run local search from several random starting partitions."""
    rng = random.Random(seed)
    best: CutResult | None = None

    for restart in range(restarts):
        initial = [rng.random() < 0.5 for _ in range(graph.num_vertices)]
        result = greedy_local_search(
            graph,
            seed=rng.randint(0, 2**31 - 1),
            initial_partition=initial,
            max_iterations=max_iterations,
        )
        if best is None or result.cut_value > best.cut_value:
            best = CutResult(
                partition=result.partition,
                cut_value=result.cut_value,
                iterations=result.iterations + restart,
                algorithm="restarts",
            )

    assert best is not None
    return best


def simulated_annealing(
    graph: Graph,
    *,
    seed: int | None = None,
    max_iterations: int = 10_000,
    initial_temperature: float | None = None,
    cooling_rate: float = 0.995,
) -> CutResult:
    """Simulated annealing with single-vertex flips."""
    rng = random.Random(seed)
    partition = [rng.random() < 0.5 for _ in range(graph.num_vertices)]
    current_value = cut_value(graph, partition)

    if initial_temperature is None:
        sample_deltas = [
            abs(_delta_on_flip(graph, partition, vertex))
            for vertex in range(graph.num_vertices)
        ]
        initial_temperature = max(sample_deltas) or 1.0

    temperature = initial_temperature
    best_partition = list(partition)
    best_value = current_value

    for iteration in range(max_iterations):
        vertex = rng.randrange(graph.num_vertices)
        delta = _delta_on_flip(graph, partition, vertex)
        if delta > 0 or (temperature > 0 and rng.random() < math.exp(delta / temperature)):
            partition[vertex] = not partition[vertex]
            current_value += delta
            if current_value > best_value:
                best_value = current_value
                best_partition = list(partition)
        temperature *= cooling_rate

    return CutResult(
        partition=tuple(best_partition),
        cut_value=best_value,
        iterations=max_iterations,
        algorithm="annealing",
    )
