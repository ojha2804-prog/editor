"""Tests for the Max-Cut optimiser."""

import pytest

from maxcut import Graph, compare_all, exact_maxcut, solve
from maxcut.spectral import goemans_williamson


def test_triangle_has_optimal_cut():
    graph = Graph.from_dimacs("examples/triangle.dimacs")
    result = solve(graph, algorithm="local", seed=0)
    assert result.cut_value == 2.0


def test_exact_finds_triangle_optimum():
    graph = Graph.from_dimacs("examples/triangle.dimacs")
    result = exact_maxcut(graph)
    assert result.cut_value == 2.0
    assert result.algorithm == "exact"


def test_auto_uses_exact_on_small_graph():
    graph = Graph.from_dimacs("examples/triangle.dimacs")
    result = solve(graph)
    assert result.algorithm == "exact"
    assert result.cut_value == 2.0


def test_petersen_reaches_optimum():
    graph = Graph.from_dimacs("examples/petersen.dimacs")
    result = solve(graph, algorithm="restarts", seed=42)
    assert result.cut_value >= 13.0


def test_tabu_search_improves_or_matches_greedy():
    graph = Graph.from_dimacs("examples/petersen.dimacs")
    result = solve(graph, algorithm="tabu", seed=7)
    assert result.cut_value >= 13.0


def test_spectral_solver_runs():
    pytest.importorskip("numpy")
    graph = Graph.from_dimacs("examples/petersen.dimacs")
    result = goemans_williamson(graph, seed=1)
    assert result.cut_value >= 12.0


def test_compare_all_returns_ranked_results():
    pytest.importorskip("numpy")
    graph = Graph.from_dimacs("examples/triangle.dimacs")
    results = compare_all(graph, seed=0)
    assert len(results) >= 4
    assert results[0].cut_value >= results[-1].cut_value
    assert results[0].cut_value == 2.0


def test_auto_solver_runs():
    graph = Graph.from_edges(4, [(0, 1, 2), (1, 2, 3), (2, 3, 4), (0, 3, 1)])
    result = solve(graph, seed=1)
    assert result.cut_value > 0
    assert len(result.partition) == 4


def test_graph_validation_rejects_self_loops():
    with pytest.raises(ValueError, match="self-loop"):
        Graph.from_edges(2, [(0, 0, 1)])


def test_exact_rejects_large_graphs():
    graph = Graph.from_edges(23, [(0, 1, 1.0)])
    with pytest.raises(ValueError, match="at most"):
        exact_maxcut(graph)
