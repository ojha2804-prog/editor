"""Tests for job save/load and the desktop software window."""

from pathlib import Path

import pytest

from cutlayout.job import Job, load_job, save_job


def test_save_job_roundtrip(tmp_path: Path):
    job = load_job("examples/kitchen_job.json")
    path = tmp_path / "saved.json"
    save_job(job, path)
    loaded = load_job(path)
    assert loaded.name == job.name
    assert len(loaded.panels) == len(job.panels)
    assert loaded.material.kerf == job.material.kerf


def test_desktop_app_loads_and_optimises_kitchen_job():
    tkinter = pytest.importorskip("tkinter")
    from cutlayout.app import CutlayoutApp

    root = tkinter.Tk()
    root.withdraw()
    try:
        app = CutlayoutApp(root)
        job = load_job("examples/kitchen_job.json")
        app._load_into_form(job)
        collected = app._collect_job()
        assert collected.name == job.name
        assert len(collected.panels) == len(job.panels)
        app._optimise()
        assert app.result is not None
        assert app.result.sheet_count >= 1
        assert not app.result.unplaced
    finally:
        root.destroy()
