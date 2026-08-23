# Max-Cut Optimiser

Heuristic and exact solvers for the **weighted Max-Cut** problem: partition the vertices of an undirected graph into two sets so that the total weight of edges crossing the cut is maximised.

## Algorithms

| Algorithm | Description |
|-----------|-------------|
| `exact` | Brute-force optimum for graphs with ≤ 22 vertices |
| `spectral` | Goemans–Williamson spectral relaxation + hyperplane rounding |
| `local` | Greedy hill-climbing with single-vertex flips |
| `restarts` | Local search from multiple random starts |
| `annealing` | Simulated annealing |
| `tabu` | Tabu search with short-term memory |
| `auto` | Uses `exact` for n ≤ 20, otherwise `restarts` or `annealing` |

## Install

```bash
pip install -e .
pip install -e ".[spectral]"   # numpy for spectral / Goemans-Williamson solver
pip install -e ".[dev]"        # numpy + pytest
```

## CLI

```bash
maxcut examples/petersen.dimacs
maxcut examples/triangle.dimacs --algorithm spectral --seed 0
maxcut examples/petersen.dimacs --compare
maxcut examples/triangle.dimacs --algorithm exact --json
```

Input format is DIMACS (`p edge <n> <m>` followed by `e u v [weight]` lines; vertices are 1-indexed).

## Python API

```python
from maxcut import Graph, solve, compare_all, exact_maxcut, goemans_williamson

graph = Graph.from_edges(
    3,
    [(0, 1, 1.0), (1, 2, 1.0), (0, 2, 1.0)],
)

# Single solver
result = solve(graph, algorithm="restarts", seed=42)

# Guaranteed optimum (small graphs)
optimal = exact_maxcut(graph)

# Compare all applicable methods
ranked = compare_all(graph, seed=42)
print(ranked[0].algorithm, ranked[0].cut_value)
```

## Tests

```bash
pip install -e ".[dev]"
python3 -m pytest
```

## Problem definition

Given an undirected graph `G = (V, E)` with non-negative edge weights `w(u, v)`, find a partition `(S, V \ S)` maximising:

```
Σ w(u, v)  for all edges (u, v) with u ∈ S and v ∉ S
```

Max-Cut is NP-hard. This package provides an exact solver for small instances and fast heuristics (including a Goemans–Williamson-style spectral method) for larger graphs.
