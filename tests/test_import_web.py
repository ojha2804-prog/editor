"""Tests for CSV import aliases and the web job builder."""

from cutlayout.csv_import import panels_from_csv_text
from cutlayout.web import _job_from_request


def test_csv_header_aliases():
    panels = panels_from_csv_text(
        "name,w,h,qty,rotate\nDoor,400,800,2,no\n"
    )
    assert len(panels) == 1
    assert panels[0].label == "Door"
    assert panels[0].width == 400
    assert panels[0].quantity == 2
    assert panels[0].can_rotate is False


def test_web_job_builder_from_csv_payload():
    job = _job_from_request(
        {
            "name": "Web job",
            "sheet_width": "2440",
            "sheet_height": "1220",
            "kerf": "3",
            "trim_lr": "5",
            "trim_tb": "5",
            "cost_per_sheet": "10",
            "method": "normal",
            "priority": "max_yield",
            "wastage": "maximize",
            "csv": "label,width,height,quantity\nA,100,50,3\n",
        }
    )
    assert job.name == "Web job"
    assert job.material.usable_width == 2430
    assert sum(panel.quantity for panel in job.panels) == 3
