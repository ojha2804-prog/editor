#!/usr/bin/env python3
"""Command-line interface for the Max-Cut optimiser."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from maxcut import Graph, solve


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
        choices=["auto", "local", "annealing", "restarts"],
        default="auto",
        help="optimisation strategy (default: auto)",
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


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    graph = load_graph(args.input)
    result = solve(
        graph,
        algorithm=args.algorithm,
        seed=args.seed,
        max_iterations=args.iterations,
    )

    total_weight = graph.total_weight()
    if args.json:
        payload = {
            "cut_value": result.cut_value,
            "cut_ratio": result.cut_ratio(total_weight),
            "total_weight": total_weight,
            "algorithm": result.algorithm,
            "iterations": result.iterations,
            "set_a": result.set_a,
            "set_b": result.set_b,
            "partition": list(result.partition),
        }
        print(json.dumps(payload, indent=2))
        return 0

    print(f"Algorithm:   {result.algorithm}")
    print(f"Cut value:   {result.cut_value:.6f}")
    print(f"Cut ratio:   {result.cut_ratio(total_weight):.4f}")
    print(f"Iterations:  {result.iterations}")
    print(f"Set A ({len(result.set_a)}): {result.set_a}")
    print(f"Set B ({len(result.set_b)}): {result.set_b}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
