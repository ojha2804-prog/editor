# Max-Cut Optimiser

Heuristic solver for the **weighted Max-Cut** problem: partition the vertices of an undirected graph into two sets so that the total weight of edges crossing the cut is maximised.

## Algorithms

| Algorithm | Description |
|-----------|-------------|
| `local` | Greedy hill-climbing with single-vertex flips |
| `restarts` | Local search from multiple random starts (default for small graphs) |
| `annealing` | Simulated annealing (default for large graphs via `auto`) |
| `auto` | Chooses `restarts` or `annealing` based on graph size |

## Install

```bash
pip install -e .
```

## CLI

```bash
maxcut examples/petersen.dimacs
maxcut examples/triangle.dimacs --algorithm local --seed 0 --json
```

Input format is DIMACS (`p edge <n> <m>` followed by `e u v [weight]` lines; vertices are 1-indexed).

## Python API

```python
from maxcut import Graph, solve

graph = Graph.from_edges(
    3,
    [(0, 1, 1.0), (1, 2, 1.0), (0, 2, 1.0)],
)
result = solve(graph, algorithm="restarts", seed=42)

print(result.cut_value)    # 2.0
print(result.set_a)        # vertices in partition A
print(result.set_b)        # vertices in partition B
```

## Tests

```bash
pip install -e ".[dev]"  # optional, or just use pytest if installed
pytest
```

## Problem definition

Given an undirected graph `G = (V, E)` with non-negative edge weights `w(u, v)`, find a partition `(S, V \ S)` maximising:

```
Σ w(u, v)  for all edges (u, v) with u ∈ S and v ∉ S
```

Max-Cut is NP-hard; this package provides fast heuristics suitable for practical instances rather than guaranteed optima.
