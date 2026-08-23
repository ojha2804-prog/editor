"""Max-Cut combinatorial optimisation library."""

from maxcut.graph import Graph
from maxcut.result import CutResult
from maxcut.solvers import (
    greedy_local_search,
    random_restarts,
    simulated_annealing,
    solve,
)

__all__ = [
    "Graph",
    "CutResult",
    "greedy_local_search",
    "random_restarts",
    "simulated_annealing",
    "solve",
]

__version__ = "0.1.0"
