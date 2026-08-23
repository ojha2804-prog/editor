"""Tests for panel cutting layout optimiser."""

import json

from cutlayout import load_job, optimize
from cutlayout.models import OptimizationMethod
from cutlayout.reports import cutting_list, job_summary
from cutlayout.visualize import layout_to_svg


def test_kitchen_job_places_all_panels():
    job = load_job("examples/kitchen_job.json")
    result = optimize(job)
    placed = sum(len(sheet.placements) for sheet in result.sheets)
    requested = sum(panel.quantity for panel in job.panels)
    assert placed == requested
    assert not result.unplaced
    assert result.sheet_count >= 1
    assert result.average_yield > 0.4


def test_kerf_and_trim_reduce_usable_area():
    job = load_job("examples/kitchen_job.json")
    assert job.material.usable_width == 2440 - 10
    assert job.material.usable_height == 1220 - 10


def test_tension_free_expansion_in_cutting_list():
    job = load_job("examples/kitchen_job.json")
    result = optimize(job)
    report = cutting_list(job, result)
    assert "rough=" in report
    assert "Door left" in report


def test_summary_and_svg_generation():
    job = load_job("examples/kitchen_job.json")
    result = optimize(job)
    summary = job_summary(job, result)
    svg = layout_to_svg(result)
    assert "Sheets used" in summary
    assert "<svg" in svg
    assert "Sheet 1" in svg


def test_wastage_group_at_bottom_setting_loads():
    job = load_job("examples/kitchen_job.json")
    assert job.settings.wastage.value == "group_at_bottom"


def test_multistage_length_method_runs():
    job = load_job("examples/kitchen_job.json")
    job.settings.method = OptimizationMethod.MULTISTAGE_LENGTH
    result = optimize(job)
    assert result.sheet_count >= 1


def test_job_json_roundtrip():
    data = json.loads(open("examples/kitchen_job.json").read())
    job = load_job("examples/kitchen_job.json")
    assert job.name == data["name"]
    assert len(job.panels) == len(data["panels"])
