"""Max-Cut combinatorial optimisation library."""

from maxcut.exact import exact_maxcut
from maxcut.graph import Graph
from maxcut.result import CutResult
from maxcut.solvers import (
    compare_all,
    greedy_local_search,
    random_restarts,
    simulated_annealing,
    solve,
    tabu_search,
)
from maxcut.spectral import goemans_williamson

__all__ = [
    "Graph",
    "CutResult",
    "compare_all",
    "exact_maxcut",
    "goemans_williamson",
    "greedy_local_search",
    "random_restarts",
    "simulated_annealing",
    "solve",
    "tabu_search",
]

__version__ = "0.2.0"
