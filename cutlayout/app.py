"""Desktop workshop application for panel cutting layout optimisation."""

from __future__ import annotations

from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from cutlayout.csv_import import panels_from_csv
from cutlayout.dxf import write_dxf
from cutlayout.job import Job, load_job, save_job
from cutlayout.models import (
    OptimizationMethod,
    OptimizationPriority,
    OptimizationSettings,
    Panel,
    SheetMaterial,
    WastagePlacement,
)
from cutlayout.optimizer import optimize
from cutlayout.reports import cutting_list, job_summary
from cutlayout.visualize import layout_to_svg

COLOURS = ["#93c5fd", "#86efac", "#fde047", "#fca5a5", "#c4b5fd", "#5eead4", "#fdba74"]


class CutlayoutApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("MaxCut Layout Software")
        self.root.geometry("1200x760")
        self.job_path: str | None = None
        self.result = None
        self._build()
        self._new_job()

    def _build(self) -> None:
        menubar = tk.Menu(self.root)
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="New job", command=self._new_job)
        file_menu.add_command(label="Open job…", command=self._open_job)
        file_menu.add_command(label="Save job", command=self._save_job)
        file_menu.add_command(label="Save job as…", command=self._save_job_as)
        file_menu.add_separator()
        file_menu.add_command(label="Import CSV cutlist…", command=self._import_csv)
        file_menu.add_command(label="Export SVG diagram…", command=self._export_svg)
        file_menu.add_command(label="Export DXF…", command=self._export_dxf)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.root.destroy)
        menubar.add_cascade(label="File", menu=file_menu)
        job_menu = tk.Menu(menubar, tearoff=0)
        job_menu.add_command(label="Optimise layouts", command=self._optimise)
        job_menu.add_command(label="Load kitchen example", command=self._load_example)
        menubar.add_cascade(label="Job", menu=job_menu)
        self.root.config(menu=menubar)

        top = ttk.Frame(self.root, padding=8)
        top.pack(fill="x")
        ttk.Label(top, text="Job").grid(row=0, column=0, sticky="w")
        self.job_name = tk.StringVar(value="Untitled job")
        ttk.Entry(top, textvariable=self.job_name, width=28).grid(row=0, column=1, padx=4)
        ttk.Label(top, text="Material").grid(row=0, column=2, sticky="w")
        self.material_name = tk.StringVar(value="18mm Melamine")
        ttk.Entry(top, textvariable=self.material_name, width=18).grid(row=0, column=3, padx=4)

        fields = ttk.Frame(self.root, padding=(8, 0, 8, 8))
        fields.pack(fill="x")
        self.sheet_width = tk.StringVar(value="2440")
        self.sheet_height = tk.StringVar(value="1220")
        self.kerf = tk.StringVar(value="3.2")
        self.trim = tk.StringVar(value="5")
        self.cost = tk.StringVar(value="42.5")
        self.method = tk.StringVar(value="normal")
        self.wastage = tk.StringVar(value="group_at_bottom")
        self.priority = tk.StringVar(value="max_yield")
        specs = [
            ("Sheet W", self.sheet_width),
            ("Sheet H", self.sheet_height),
            ("Kerf", self.kerf),
            ("Trim", self.trim),
            ("Cost/sheet", self.cost),
        ]
        for column, (label, variable) in enumerate(specs):
            ttk.Label(fields, text=label).grid(row=0, column=column * 2, sticky="e", padx=(0, 4))
            ttk.Entry(fields, textvariable=variable, width=9).grid(row=0, column=column * 2 + 1, padx=(0, 10))
        ttk.Label(fields, text="Method").grid(row=1, column=0, sticky="e", pady=6)
        ttk.Combobox(
            fields,
            textvariable=self.method,
            values=["normal", "multistage_length", "multistage_width"],
            width=18,
            state="readonly",
        ).grid(row=1, column=1, columnspan=2, sticky="w")
        ttk.Label(fields, text="Wastage").grid(row=1, column=3, sticky="e")
        ttk.Combobox(
            fields,
            textvariable=self.wastage,
            values=["group_at_bottom", "maximize"],
            width=16,
            state="readonly",
        ).grid(row=1, column=4, sticky="w")
        ttk.Label(fields, text="Priority").grid(row=1, column=5, sticky="e")
        ttk.Combobox(
            fields,
            textvariable=self.priority,
            values=["max_yield", "fast_cutting"],
            width=14,
            state="readonly",
        ).grid(row=1, column=6, sticky="w")
        ttk.Button(fields, text="Optimise layouts", command=self._optimise).grid(
            row=1, column=7, padx=12
        )

        body = ttk.Panedwindow(self.root, orient="horizontal")
        body.pack(fill="both", expand=True, padx=8, pady=4)

        left = ttk.Frame(body)
        right = ttk.Frame(body)
        body.add(left, weight=1)
        body.add(right, weight=2)

        ttk.Label(left, text="Panels").pack(anchor="w")
        columns = ("label", "width", "height", "qty", "rotate", "grain")
        self.tree = ttk.Treeview(left, columns=columns, show="headings", height=14)
        headings = {
            "label": "Label",
            "width": "W",
            "height": "H",
            "qty": "Qty",
            "rotate": "Rotate",
            "grain": "Grain group",
        }
        widths = {"label": 120, "width": 60, "height": 60, "qty": 40, "rotate": 60, "grain": 100}
        for column in columns:
            self.tree.heading(column, text=headings[column])
            self.tree.column(column, width=widths[column], anchor="center")
        self.tree.pack(fill="both", expand=True)
        editor = ttk.Frame(left)
        editor.pack(fill="x", pady=6)
        self.p_label = tk.StringVar()
        self.p_width = tk.StringVar()
        self.p_height = tk.StringVar()
        self.p_qty = tk.StringVar(value="1")
        self.p_rotate = tk.BooleanVar(value=True)
        self.p_grain = tk.StringVar()
        for text, var, width in [
            ("Label", self.p_label, 12),
            ("W", self.p_width, 6),
            ("H", self.p_height, 6),
            ("Qty", self.p_qty, 4),
            ("Grain", self.p_grain, 10),
        ]:
            ttk.Label(editor, text=text).pack(side="left")
            ttk.Entry(editor, textvariable=var, width=width).pack(side="left", padx=(0, 4))
        ttk.Checkbutton(editor, text="Rotate", variable=self.p_rotate).pack(side="left")
        buttons = ttk.Frame(left)
        buttons.pack(fill="x")
        ttk.Button(buttons, text="Add panel", command=self._add_panel).pack(side="left", padx=2)
        ttk.Button(buttons, text="Remove selected", command=self._remove_panel).pack(side="left", padx=2)

        ttk.Label(right, text="Cutting diagrams").pack(anchor="w")
        self.canvas = tk.Canvas(right, background="#f8fafc", highlightthickness=1, highlightbackground="#94a3b8")
        self.canvas.pack(fill="both", expand=True)
        self.report = tk.Text(right, height=10, wrap="word")
        self.report.pack(fill="x")

        self.status = tk.StringVar(value="Ready. Add panels, then Optimise layouts.")
        ttk.Label(self.root, textvariable=self.status, padding=6).pack(fill="x")

    def _new_job(self) -> None:
        self.job_path = None
        self.result = None
        self.job_name.set("Untitled job")
        for item in self.tree.get_children():
            self.tree.delete(item)
        self.canvas.delete("all")
        self.report.delete("1.0", "end")
        self.status.set("New job")

    def _load_example(self) -> None:
        example = Path(__file__).resolve().parents[1] / "examples" / "kitchen_job.json"
        if not example.exists():
            messagebox.showerror("Example", f"Could not find {example}")
            return
        job = load_job(example)
        self.job_path = str(example)
        self._load_into_form(job)
        self.status.set("Loaded kitchen example")

    def _collect_job(self) -> Job:
        trim = float(self.trim.get() or 0)
        material = SheetMaterial(
            name=self.material_name.get(),
            sheet_width=float(self.sheet_width.get()),
            sheet_height=float(self.sheet_height.get()),
            kerf=float(self.kerf.get()),
            trim_left=trim,
            trim_right=trim,
            trim_top=trim,
            trim_bottom=trim,
            cost_per_sheet=float(self.cost.get() or 0),
        )
        panels: list[Panel] = []
        for item in self.tree.get_children():
            values = self.tree.item(item, "values")
            panels.append(
                Panel(
                    label=str(values[0]),
                    width=float(values[1]),
                    height=float(values[2]),
                    quantity=int(values[3]),
                    can_rotate=str(values[4]).lower() in {"yes", "true", "1"},
                    grain_group=str(values[5]) or None,
                )
            )
        if not panels:
            raise ValueError("Add at least one panel before optimising")
        settings = OptimizationSettings(
            method=OptimizationMethod(self.method.get()),
            priority=OptimizationPriority(self.priority.get()),
            wastage=WastagePlacement(self.wastage.get()),
        )
        return Job(name=self.job_name.get(), material=material, panels=panels, settings=settings)

    def _load_into_form(self, job: Job) -> None:
        self.job_name.set(job.name)
        self.material_name.set(job.material.name)
        self.sheet_width.set(str(job.material.sheet_width))
        self.sheet_height.set(str(job.material.sheet_height))
        self.kerf.set(str(job.material.kerf))
        self.trim.set(str(job.material.trim_left))
        self.cost.set(str(job.material.cost_per_sheet))
        self.method.set(job.settings.method.value)
        self.wastage.set(job.settings.wastage.value)
        self.priority.set(job.settings.priority.value)
        for item in self.tree.get_children():
            self.tree.delete(item)
        for panel in job.panels:
            self.tree.insert(
                "",
                "end",
                values=(
                    panel.label,
                    panel.width,
                    panel.height,
                    panel.quantity,
                    "yes" if panel.can_rotate else "no",
                    panel.grain_group or "",
                ),
            )

    def _add_panel(self) -> None:
        try:
            label = self.p_label.get().strip() or f"Panel {len(self.tree.get_children()) + 1}"
            width = float(self.p_width.get())
            height = float(self.p_height.get())
            quantity = int(self.p_qty.get() or 1)
        except ValueError:
            messagebox.showerror("Panel", "Width, height and quantity must be numbers")
            return
        self.tree.insert(
            "",
            "end",
            values=(
                label,
                width,
                height,
                quantity,
                "yes" if self.p_rotate.get() else "no",
                self.p_grain.get().strip(),
            ),
        )

    def _remove_panel(self) -> None:
        for item in self.tree.selection():
            self.tree.delete(item)

    def _optimise(self) -> None:
        try:
            job = self._collect_job()
            self.result = optimize(job)
        except Exception as exc:
            messagebox.showerror("Optimise", str(exc))
            return
        self._draw_layouts(job)
        self.report.delete("1.0", "end")
        self.report.insert("1.0", job_summary(job, self.result) + "\n\n" + cutting_list(job, self.result))
        extra = f" | Unplaced {len(self.result.unplaced)}" if self.result.unplaced else ""
        self.status.set(
            f"{self.result.sheet_count} sheets  |  yield {self.result.average_yield:.1%}  |  "
            f"cost {self.result.total_cost:.2f}{extra}"
        )

    def _draw_layouts(self, job: Job) -> None:
        self.canvas.delete("all")
        if not self.result:
            return
        self.canvas.update_idletasks()
        canvas_w = max(self.canvas.winfo_width(), 400)
        sheet_w = job.material.sheet_width
        sheet_h = job.material.sheet_height
        scale = min(0.22, (canvas_w - 40) / max(sheet_w * 2.2, 1))
        x = 16.0
        y = 16.0
        row_h = 0.0
        for sheet in self.result.sheets:
            w, h = sheet_w * scale, sheet_h * scale
            if x + w > canvas_w - 16 and x > 16:
                x = 16
                y += row_h + 28
                row_h = 0
            self.canvas.create_rectangle(x, y, x + w, y + h, fill="#e2e8f0", outline="#0f172a")
            self.canvas.create_text(
                x + 6,
                y + 10,
                anchor="w",
                text=f"Sheet {sheet.sheet_index + 1}  {sheet.yield_ratio:.0%}",
                font=("Segoe UI", 9, "bold"),
            )
            for index, placement in enumerate(sheet.placements):
                px = x + placement.x * scale
                py = y + placement.y * scale
                pw = placement.width * scale
                ph = placement.height * scale
                colour = COLOURS[index % len(COLOURS)]
                self.canvas.create_rectangle(px, py, px + pw, py + ph, fill=colour, outline="#1e293b")
                self.canvas.create_text(
                    px + 4,
                    py + 10,
                    anchor="w",
                    text=f"{placement.panel_label}{' R' if placement.rotated else ''}",
                    font=("Segoe UI", 8),
                )
            x += w + 20
            row_h = max(row_h, h)
        self.canvas.config(scrollregion=self.canvas.bbox("all"))

    def _open_job(self) -> None:
        path = filedialog.askopenfilename(filetypes=[("Job JSON", "*.json"), ("All files", "*.*")])
        if not path:
            return
        try:
            job = load_job(path)
        except Exception as exc:
            messagebox.showerror("Open", str(exc))
            return
        self.job_path = path
        self._load_into_form(job)
        self.status.set(f"Opened {path}")

    def _save_job(self) -> None:
        if not self.job_path:
            self._save_job_as()
            return
        try:
            save_job(self._collect_job(), self.job_path)
        except Exception as exc:
            messagebox.showerror("Save", str(exc))
            return
        self.status.set(f"Saved {self.job_path}")

    def _save_job_as(self) -> None:
        path = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("Job JSON", "*.json")])
        if not path:
            return
        self.job_path = path
        self._save_job()

    def _import_csv(self) -> None:
        path = filedialog.askopenfilename(filetypes=[("CSV cutlist", "*.csv"), ("All files", "*.*")])
        if not path:
            return
        try:
            panels = panels_from_csv(path)
        except Exception as exc:
            messagebox.showerror("Import CSV", str(exc))
            return
        for item in self.tree.get_children():
            self.tree.delete(item)
        for panel in panels:
            self.tree.insert(
                "",
                "end",
                values=(
                    panel.label,
                    panel.width,
                    panel.height,
                    panel.quantity,
                    "yes" if panel.can_rotate else "no",
                    panel.grain_group or "",
                ),
            )
        self.status.set(f"Imported {len(panels)} panel types from CSV")

    def _export_svg(self) -> None:
        if not self.result:
            messagebox.showinfo("Export", "Optimise a job first")
            return
        path = filedialog.asksaveasfilename(defaultextension=".svg", filetypes=[("SVG", "*.svg")])
        if path:
            Path(path).write_text(layout_to_svg(self.result))
            self.status.set(f"Exported {path}")

    def _export_dxf(self) -> None:
        if not self.result:
            messagebox.showinfo("Export", "Optimise a job first")
            return
        path = filedialog.asksaveasfilename(defaultextension=".dxf", filetypes=[("DXF", "*.dxf")])
        if path:
            write_dxf(self.result, path)
            self.status.set(f"Exported {path}")


def launch(job_path: str | None = None) -> None:
    root = tk.Tk()
    app = CutlayoutApp(root)
    if job_path:
        job = load_job(job_path)
        app.job_path = job_path
        app._load_into_form(job)
    root.mainloop()


def main_app() -> None:
    launch()


if __name__ == "__main__":
    main_app()
