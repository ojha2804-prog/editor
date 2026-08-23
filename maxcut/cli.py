#!/usr/bin/env python3
"""Command-line interface for the Max-Cut optimiser."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from maxcut import Graph, compare_all, solve


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="maxcut",
        description="Solve the weighted Max-Cut problem on undirected graphs.",
    )
    parser.add_argument(
        "input",
        nargs="?",
        help="DIMACS graph file. Reads stdin when omitted.",
    )
    parser.add_argument(
        "--algorithm",
        choices=["auto", "local", "annealing", "restarts", "tabu", "spectral", "exact"],
        default="auto",
        help="optimisation strategy (default: auto)",
    )
    parser.add_argument(
        "--compare",
        action="store_true",
        help="run all applicable solvers and show a ranked comparison",
    )
    parser.add_argument("--seed", type=int, default=None, help="random seed")
    parser.add_argument(
        "--iterations",
        type=int,
        default=10_000,
        help="maximum iterations for the chosen algorithm",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="emit machine-readable JSON output",
    )
    return parser


def load_graph(path: str | None) -> Graph:
    if path is None or path == "-":
        text = sys.stdin.read()
        if not text.strip():
            raise SystemExit("no graph input provided")
        tmp = Path("/tmp/maxcut-input.dimacs")
        tmp.write_text(text)
        return Graph.from_dimacs(tmp)
    return Graph.from_dimacs(path)


def _result_payload(graph: Graph, result) -> dict:
    total_weight = graph.total_weight()
    return {
        "cut_value": result.cut_value,
        "cut_ratio": result.cut_ratio(total_weight),
        "total_weight": total_weight,
        "algorithm": result.algorithm,
        "iterations": result.iterations,
        "set_a": result.set_a,
        "set_b": result.set_b,
        "partition": list(result.partition),
    }


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    graph = load_graph(args.input)

    if args.compare:
        results = compare_all(graph, seed=args.seed, max_iterations=args.iterations)
        if args.json:
            print(json.dumps([_result_payload(graph, result) for result in results], indent=2))
            return 0

        print(f"Compared {len(results)} solvers on {graph.num_vertices} vertices\n")
        for index, result in enumerate(results, start=1):
            total_weight = graph.total_weight()
            print(
                f"{index}. {result.algorithm:<10} "
                f"cut={result.cut_value:.6f} "
                f"ratio={result.cut_ratio(total_weight):.4f} "
                f"iterations={result.iterations}"
            )
        return 0

    result = solve(
        graph,
        algorithm=args.algorithm,
        seed=args.seed,
        max_iterations=args.iterations,
    )

    if args.json:
        print(json.dumps(_result_payload(graph, result), indent=2))
        return 0

    total_weight = graph.total_weight()
    print(f"Algorithm:   {result.algorithm}")
    print(f"Cut value:   {result.cut_value:.6f}")
    print(f"Cut ratio:   {result.cut_ratio(total_weight):.4f}")
    print(f"Iterations:  {result.iterations}")
    print(f"Set A ({len(result.set_a)}): {result.set_a}")
    print(f"Set B ({len(result.set_b)}): {result.set_b}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
