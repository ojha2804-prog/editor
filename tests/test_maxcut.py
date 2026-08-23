"""Tests for the Max-Cut optimiser."""

from maxcut import Graph, solve


def test_triangle_has_optimal_cut():
    graph = Graph.from_dimacs("examples/triangle.dimacs")
    result = solve(graph, algorithm="local", seed=0)
    assert result.cut_value == 2.0


def test_petersen_reaches_optimum():
    graph = Graph.from_dimacs("examples/petersen.dimacs")
    result = solve(graph, algorithm="restarts", seed=42)
    # Brute-force optimum for this Petersen instance is 13
    assert result.cut_value >= 13.0


def test_auto_solver_runs():
    graph = Graph.from_edges(4, [(0, 1, 2), (1, 2, 3), (2, 3, 4), (0, 3, 1)])
    result = solve(graph, seed=1)
    assert result.cut_value > 0
    assert len(result.partition) == 4


def test_graph_validation_rejects_self_loops():
    try:
        Graph.from_edges(2, [(0, 0, 1)])
    except ValueError as exc:
        assert "self-loop" in str(exc)
    else:
        raise AssertionError("expected ValueError")
