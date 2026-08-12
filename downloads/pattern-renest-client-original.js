/* SwoodReport - Pattern List re-nested from real quantities
   -----------------------------------------------------------------------
   WHY THIS EXISTS

   SWOOD optimises the cutting pattern from each panel's NB. In this project
   NB = 1, while the real build quantity lives in the SolidWorks custom
   property "Project Quantity" (= 10), which the optimizer never reads. The
   result is a pattern holding one panel on one board, which the report then
   multiplies to "10 boards" - ten boards each carrying a single 800x400
   panel, when six fit on one.

   The correct fix is upstream: make the quantity real in the model so SWOOD
   nests it. Where that isn't possible (batch size changing per order), this
   file re-runs the nest in the browser from the same quantities the Cutrite
   page reports, and redraws the Pattern List page from the result.

   WHAT IT DELIBERATELY MATCHES

   Everything is reproduced from view-settings.js 'pattern-detailed-list':
   the Total Panels / Panels Area / Waste Area / Trim Area cards, the
   Quantities and Area Usage donuts, and the per-pattern block with name,
   Material, # Panels, # Trims and # Waste beside the board drawing.

   The nest is guillotine (shelf) packing, because a panel saw cannot make
   anything else, and it builds the same padding/item/waste leaf structure
   SWOOD emits - which is what makes the four area figures comparable.

   Trim and kerf are read from SWOOD's own pattern in this report rather
   than assumed, so the re-nest uses the saw settings the project was
   optimised with. Grain is honoured: a panel on a grained material is never
   rotated, matching SWOOD (grain-direction 1 on every item it placed).

   VERIFIED: forced to quantity 1, this engine reproduces SWOOD's own output
   for this project exactly - 1 panel, 2 trims, 2 waste, 0.32 m2 panels
   (11%), 2.59 m2 waste (87%), 0.04 m2 trim (1%).

   Include after the main app script in index.html:
       <script src="assets/js/pattern-renest-client.js"></script>
   ----------------------------------------------------------------------- */
(function () {
	'use strict';

	var STYLE_ID = 'pattern-renest-styles';
	var OVERLAY_ID = 'pattern-renest-overlay';
	var ROUTE_PATTERNS = '#/pattern-detailed-list';
	var ROUTE_SUMMARY = '#/summary';
	var ROUTE_PATTERN_TABLE = '#/patterns';
	var ROUTE_PATTERNED_PANELS = '#/patterned-panels';
	var ROUTE_PANEL_PROCESSES = '#/panel-processes';

	// Chart.js default palette, sampled from the report's own donuts so the
	// legend colours are identical to the page this replaces.
	var C_PANEL = '#36A2EB';
	var C_WASTE = '#FF6384';
	var C_TRIM = '#FFCE56';
	var C_CUTS = '#4BC0C0';

	// Board drawing colours, sampled from SWOOD's own pattern rendering.
	var F_PANEL = '#8597EA';
	var F_PANEL_EDGE = '#3f4fa8';
	var F_WASTE = '#F08383';
	var F_WASTE_LINE = '#d95f5f';
	var F_TRIM = '#DAF49E';
	var F_TRIM_LINE = '#a8c95f';

	// Fallbacks, used only if this report carries no SWOOD pattern to read
	// the real saw settings from.
	var DEFAULT_TRIM = 15;   // mm stripped off the two datum edges
	var DEFAULT_KERF = 5;    // mm consumed by each cut

	// One zoom step.
	var ZOOM_STEP = 1.4;
	// Below 100% the sheets tile into a grid so a whole job can be seen at once.
	var ZOOM_MIN = 0.25;
	var ZOOM_MAX = 6;

	// The app's business layer stores each record under "<id>-<instance>", so a
	// panel link needs the instance suffix or the route reports the key as
	// missing. Panels are single-instance here, which is why the native Stocks
	// page links to "<guid>-0".
	var PANEL_KEY_SUFFIX = '-0';

	// ---- Units -----------------------------------------------------------
	// Shared by the Summary and Panel Process pages so one toggle can't leave
	// the two disagreeing. Areas convert m2 -> ft2, lengths m -> ft; anything
	// else (pieces, boards) is unitless and passes through untouched.
	var UNITS = { imperial: false };
	// Paper choice for every print action on these pages.
	var PAPER = { size: 'A4', landscape: true };

	// User-entered unit costs, keyed by "<section>|<row name>". Null = use the
	// project's own value. Set through the editable cells in the Summary.
	var COST_OVERRIDES = {};
	function costKey(section, name) { return section + '|' + name; }
	function getOverride(section, name) {
		var k = costKey(section, name);
		return (k in COST_OVERRIDES) ? COST_OVERRIDES[k] : null;
	}
	function setOverride(section, name, val) {
		COST_OVERRIDES[costKey(section, name)] = val;
	}
	var M2_TO_FT2 = 10.763910417;
	var M_TO_FT = 3.280839895;

	// ---- Rate overrides --------------------------------------------------
	// Typed rates are kept in the project's OWN unit (per m2 / per m / per
	// board), whatever unit they were entered in. That way switching the m2/ft2
	// toggle re-displays the same rate rather than compounding a conversion.
	var RATES = {};

	function rateKey(section, name) { return section + '\u0001' + name; }

	// Factor to go from a base-unit rate to a displayed-unit rate.
	function rateFactor(unit) {
		var u = String(unit || '').toLowerCase();
		if (!UNITS.imperial) return 1;
		if (u === 'm2' || u === 'm\u00b2') return 1 / M2_TO_FT2;   // per m2 -> per ft2
		// Linear metres are not converted, so their rate stays per metre.
		return 1;
	}

	function unitSuffix(unit) {
		var c = convertQty(1, unit);
		return c.unit ? ' /' + c.unit : '';
	}

	// Rendered rate cell. Editable: typing a rate recomputes that row's cost as
	// quantity x rate. Left alone, the project's own cost is shown untouched -
	// rows where the source cost isn't exactly quantity x rate keep their
	// stated value instead of being silently recomputed.
	function rateCell(section, name, baseRate, unit) {
		var key = rateKey(section, name);
		var base = (key in RATES) ? RATES[key] : baseRate;
		var shown = base * rateFactor(unit);
		return '<input class="pr-rate" type="number" step="0.01" min="0" ' +
			'data-pr="rate" data-sec="' + esc(section) + '" data-name="' + esc(name) + '" ' +
			'data-unit="' + esc(unit || '') + '" value="' + fmt(shown, 2) + '">' +
			'<span class="pr-ru">' + esc(unitSuffix(unit)) + '</span>';
	}

	// The toggle is square metres to square feet, so it converts AREAS only.
	// Edgebanding is bought and priced by the metre, so leaving linear
	// quantities in metres keeps those rates enterable as you quote them.
	function convertQty(value, unit) {
		var u = String(unit || '').toLowerCase();
		if (!UNITS.imperial) return { value: value, unit: unit || '' };
		if (u === 'm2' || u === 'm\u00b2') return { value: value * M2_TO_FT2, unit: 'ft\u00b2' };
		return { value: value, unit: unit || '' };
	}

	function paperPicker() {
		return '<div class="pr-paper"><span class="pr-pl">Paper</span><div class="pr-split">' +
			['A4', 'A3'].map(function (sz) {
				return '<button data-pr="paper" data-v="' + sz + '"' +
					(PAPER.size === sz ? ' class="on"' : '') + '>' + sz + '</button>';
			}).join('') +
			'<button data-pr="paper" data-v="orient" title="Portrait / landscape">' +
				(PAPER.landscape ? 'Landscape' : 'Portrait') + '</button></div></div>';
	}

	// Everything printed goes through one window so paper size, margins and
	// fit-to-page behave identically on every page.
	function printDocument(title, bodyHtml, extraCss) {
		var w = window.open('', '_blank');
		if (!w) return;
		w.document.write('<html><head><title>' + esc(title) + '</title><style>' +
			'@page{size:' + PAPER.size + ' ' + (PAPER.landscape ? 'landscape' : 'portrait') + ';margin:10mm;}' +
			'html,body{margin:0;padding:0;font-family:Arial,sans-serif;}' +
			'h2{font-size:15px;margin:0 0 8px;}' +
			// Fit to the paper width: tables shrink rather than spilling onto a
			// second sheet, which is what "print fit" has to mean here.
			'table{border-collapse:collapse;width:100%;font-size:10px;table-layout:fixed;}' +
			'th{background:#14487f;color:#fff;text-align:left;}' +
			'th,td{border:1px solid #999;padding:3px 5px;word-wrap:break-word;overflow-wrap:anywhere;}' +
			'tr:nth-child(even) td{background:#f1f5f9;}' +
			'tr,img,svg{page-break-inside:avoid;break-inside:avoid;}' +
			(extraCss || '') +
			'</style></head><body><h2>' + esc(title) + '</h2>' + bodyHtml + '</body></html>');
		w.document.close();
		setTimeout(function () { w.print(); }, 300);
	}

	// Restates a rate against the converted quantity. Driven by the cost the
	// row actually shows, so quantity x rate reconciles to it exactly - which
	// scaling the old rate would not guarantee, because a costing article's
	// cost is authoritative and isn't always quantity x rate to begin with.
	// Falls back to scaling when the row carries no cost to divide.
	function convertRate(unitCost, cost, rawQty, convQty, converted) {
		if (!converted) return unitCost;
		if (cost > 0 && convQty > 0) return cost / convQty;
		if (rawQty > 0 && convQty > 0) return unitCost * (rawQty / convQty);
		return unitCost;
	}

	function unitToggle() {
		return '<div class="pr-split pr-units">' +
			'<button data-pr="units" data-v="m"' + (UNITS.imperial ? '' : ' class="on"') + '>m\u00b2</button>' +
			'<button data-pr="units" data-v="ft"' + (UNITS.imperial ? ' class="on"' : '') + '>ft\u00b2</button>' +
			'</div>';
	}

	function injectStyles() {
		if (document.getElementById(STYLE_ID)) return;
		var css =
			'#' + OVERLAY_ID + '{display:none;position:fixed;z-index:500;background:var(--surface,#fff);overflow-y:auto;overflow-x:hidden;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink,#16202b);padding:20px 24px;}' +
			// Outlined panel around each section, matching .react-grid-item.
			'#' + OVERLAY_ID + ' .pr-panel{background:var(--surface,#fff);border:1px solid var(--rule,#d4dde5);border-radius:var(--radius,6px);padding:18px;margin-bottom:22px;display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap;}' +
			'#' + OVERLAY_ID + ' .pr-cards{flex:0 0 300px;display:flex;flex-direction:column;gap:12px;}' +
			'#' + OVERLAY_ID + ' .pr-card{background:var(--surface,#fff);border:1px solid var(--rule,#d4dde5);border-radius:var(--radius,6px);padding:11px 14px;font-size:14px;color:var(--ink,#16202b);}' +
			'#' + OVERLAY_ID + ' .pr-card b{font-weight:600;}' +
			// Card values read as the answer, not as part of the label.
			'#' + OVERLAY_ID + ' .pr-cv{font-weight:700;color:var(--accent,#b45309);}' +
			// Toolbar - mirrors the Stocks page: search box, filter glyph, split buttons.
			'#' + OVERLAY_ID + ' .pr-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 14px;}' +
			'#' + OVERLAY_ID + ' .pr-search{display:flex;align-items:center;gap:8px;border:1px solid var(--rule,#d4dde5);border-radius:var(--radius,6px);padding:7px 12px;background:var(--surface,#fff);min-width:280px;}' +
			'#' + OVERLAY_ID + ' .pr-search input{border:0;outline:0;font-size:14px;flex:1;background:transparent;color:var(--ink,#16202b);font-family:inherit;}' +
			'#' + OVERLAY_ID + ' .pr-split{display:inline-flex;border:1px solid var(--rule,#d4dde5);border-radius:var(--radius,6px);overflow:hidden;}' +
			'#' + OVERLAY_ID + ' .pr-split button{border:0;background:var(--surface,#fff);padding:8px 15px;font-size:13.5px;cursor:pointer;color:var(--ink,#16202b);font-family:inherit;}' +
			'#' + OVERLAY_ID + ' .pr-split button + button{border-left:1px solid var(--rule,#d4dde5);}' +
			'#' + OVERLAY_ID + ' .pr-split button.on{background:var(--brand,#14487f);color:#fff;font-weight:600;}' +
			'#' + OVERLAY_ID + ' .pr-saw{display:inline-flex;align-items:center;gap:14px;border:1px solid var(--rule,#d4dde5);border-radius:var(--radius,6px);padding:6px 12px;background:var(--surface,#fff);}' +
			'#' + OVERLAY_ID + ' .pr-saw label{font-size:13.5px;color:var(--ink-soft,#4a5b6d);display:inline-flex;align-items:center;gap:6px;}' +
			'#' + OVERLAY_ID + ' .pr-saw input{width:64px;border:1px solid var(--rule,#d4dde5);border-radius:4px;padding:5px 7px;font-size:13.5px;font-family:inherit;color:var(--ink,#16202b);text-align:right;}' +
			'#' + OVERLAY_ID + ' .pr-saw button{border:1px solid var(--rule,#d4dde5);background:var(--surface-2,#eef2f6);border-radius:4px;padding:5px 11px;font-size:13px;cursor:pointer;font-family:inherit;color:var(--brand,#14487f);}' +
			// Below 100% the sheets tile into a grid, so an entire job can be
			// taken in at once instead of scrolling one sheet at a time. The
			// column count comes from the zoom level.
			// Zooming widens the whole sheet block, so every sheet grows by the
			// same factor. One scrollbar on the wrapper moves them all in step -
			// per-sheet scrollbars made it feel like only one sheet had zoomed.
			'#' + OVERLAY_ID + ' .pr-sheets-wrap{overflow-x:auto;overflow-y:visible;}' +
			'#' + OVERLAY_ID + ' .pr-sheets{display:grid;gap:16px;}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="1"]{grid-template-columns:1fr;}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="2"]{grid-template-columns:repeat(2,minmax(0,1fr));}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="3"]{grid-template-columns:repeat(3,minmax(0,1fr));}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="4"]{grid-template-columns:repeat(4,minmax(0,1fr));}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="5"]{grid-template-columns:repeat(5,minmax(0,1fr));}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="6"]{grid-template-columns:repeat(6,minmax(0,1fr));}' +
			// "All" view: every sheet on one screen. Each drawing is capped to a
			// measured tile height so the grid fits the window vertically as
			// well as horizontally - width alone would still overflow downwards.
			'#' + OVERLAY_ID + ' .pr-sheets[data-fit="1"] .pr-board svg{height:var(--pr-tileh,120px);width:auto;max-width:100%;margin:0 auto;}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-fit="1"] .pr-board{display:flex;justify-content:center;}' +
			'#' + OVERLAY_ID + ' .pr-sheets .pr-panel{margin-bottom:0;}' +
			// At tile size the drawing is the point, so the cards collapse to a
			// single line and the sheet takes the rest of the tile.
			// flex-wrap:wrap on a column container wraps overflow into a second
			// column, which threw the drawing out of its tile - these stacked
			// layouts must not wrap.
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-panel{flex-direction:column;flex-wrap:nowrap;padding:10px;gap:8px;}' +
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-panel > *{width:100%;}' +
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-cards{display:none;}' +
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-board{width:100%;flex:1 1 100%;overflow:visible;}' +
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-board svg{width:100%;}' +
			'#' + OVERLAY_ID + ' .pr-tile-head{display:none;font-size:12px;color:var(--ink,#16202b);line-height:1.5;}' +
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-tile-head{display:block;}' +
			'#' + OVERLAY_ID + ' .pr-tile-head b{color:var(--brand,#14487f);}' +
			'#' + OVERLAY_ID + ' .pr-tile-head .pr-cv{font-weight:700;color:var(--accent,#b45309);}' +
			// Past 100% the cards move above the sheet so the plate gets the
			// full page width - the whole board stays visible while enlarging,
			// instead of being clipped into a side column.
			'#' + OVERLAY_ID + ' .pr-panel.pr-wide{flex-direction:column;flex-wrap:nowrap;}' +
			'#' + OVERLAY_ID + ' .pr-panel.pr-wide .pr-cards{flex:1 1 auto;width:100%;flex-direction:row;flex-wrap:wrap;}' +
			'#' + OVERLAY_ID + ' .pr-panel.pr-wide .pr-card{flex:0 0 auto;}' +
			'#' + OVERLAY_ID + ' .pr-panel.pr-wide .pr-board{width:100%;flex:1 1 100%;}' +
			'#' + OVERLAY_ID + ' .pr-units{margin-left:auto;}' +
			'#' + OVERLAY_ID + ' input.pr-rate{width:82px;border:1px solid var(--rule,#d4dde5);border-radius:4px;padding:3px 6px;font-size:13px;font-family:inherit;text-align:right;color:var(--ink,#16202b);background:#fffdf5;}' +
			'#' + OVERLAY_ID + ' input.pr-rate:focus{outline:2px solid var(--accent,#b45309);outline-offset:-1px;}' +
			'@media print{#' + OVERLAY_ID + ' input.pr-rate{border:0;background:transparent;}}' +
			'#' + OVERLAY_ID + ' input.pr-rate{width:88px;border:1px solid var(--rule,#d4dde5);border-radius:4px;padding:3px 6px;font-size:13px;font-family:inherit;text-align:right;color:var(--ink,#16202b);background:var(--surface,#fff);}' +
			'#' + OVERLAY_ID + ' input.pr-rate.edited{border-color:var(--accent,#b45309);font-weight:700;color:var(--accent,#b45309);}' +
			'@media print{#' + OVERLAY_ID + ' input.pr-rate{border:0;padding:0;font-weight:400;color:#000;}}' +
			'#' + OVERLAY_ID + ' .pr-rate{width:78px;border:1px solid transparent;border-radius:4px;padding:3px 5px;font-size:13px;font-family:inherit;text-align:right;background:transparent;color:var(--ink,#16202b);}' +
			'#' + OVERLAY_ID + ' .pr-rate:hover{border-color:var(--rule,#d4dde5);background:#fff;}' +
			'#' + OVERLAY_ID + ' .pr-rate:focus{border-color:var(--brand,#14487f);background:#fff;outline:0;}' +
			'#' + OVERLAY_ID + ' .pr-rate.edited{border-color:var(--accent,#b45309);background:#fff8ef;font-weight:700;}' +
			'#' + OVERLAY_ID + ' .pr-ru{font-size:11px;color:var(--ink-soft,#4a5b6d);margin-left:3px;}' +
			'@media print{#' + OVERLAY_ID + ' .pr-rate{border:0;background:transparent;}}' +
			'#' + OVERLAY_ID + ' .pr-paper{display:inline-flex;align-items:center;gap:9px;}' +
			'#' + OVERLAY_ID + ' .pr-perpage{display:inline-flex;align-items:center;gap:9px;}' +
			'#' + OVERLAY_ID + ' .pr-factor{width:64px;border:1px solid var(--rule,#d4dde5);border-radius:5px;padding:6px 8px;font-size:13px;text-align:right;font-family:inherit;}' +
			'#' + OVERLAY_ID + ' .pr-cv{font-weight:700;color:var(--accent,#b45309);}' +
			// Client "quotation" document - deliberately different chrome from
			// the internal tables (no blue header bars, generous whitespace)
			// so it reads as something to hand over, not an exported report.
			'#' + OVERLAY_ID + ' .quote{background:var(--surface,#fff);border:1px solid #dfe4ea;border-radius:10px;overflow:hidden;max-width:900px;}' +
			'#' + OVERLAY_ID + ' .quote-body{padding:24px 34px 6px;}' +
			'#' + OVERLAY_ID + ' .qsec{margin:0 0 22px;}' +
			'#' + OVERLAY_ID + ' .qsec h3{font-size:12.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--brand,#14487f);margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid var(--brand,#14487f);}' +
			'#' + OVERLAY_ID + ' .qtbl{width:100%;border-collapse:collapse;font-size:14px;}' +
			'#' + OVERLAY_ID + ' .qtbl th{background:none;color:var(--ink-soft,#4a5b6d);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.03em;text-align:left;padding:5px 0;border-bottom:1px solid var(--rule,#d4dde5);}' +
			'#' + OVERLAY_ID + ' .qtbl td{padding:11px 0;border-bottom:1px solid #f0f2f5;background:none !important;}' +
			'#' + OVERLAY_ID + ' .qtbl .item-name{font-weight:600;color:var(--ink,#16202b);}' +
			'#' + OVERLAY_ID + ' .qtbl .item-desc{font-size:12px;color:var(--ink-soft,#4a5b6d);margin-top:2px;}' +
			'#' + OVERLAY_ID + ' .qtbl .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}' +
			'#' + OVERLAY_ID + ' .qsub{display:flex;justify-content:flex-end;padding:6px 0;font-size:13.5px;color:var(--ink-soft,#4a5b6d);}' +
			'#' + OVERLAY_ID + ' .qsub b{color:var(--ink,#16202b);margin-left:14px;min-width:120px;display:inline-block;text-align:right;}' +
			'#' + OVERLAY_ID + ' .quote-totals{margin:0 34px 26px;padding:18px 24px;background:var(--brand,#14487f);border-radius:9px;display:flex;justify-content:space-between;align-items:center;color:#fff;}' +
			'#' + OVERLAY_ID + ' .quote-totals .qt-lbl{font-size:12px;opacity:.85;text-transform:uppercase;letter-spacing:.06em;}' +
			'#' + OVERLAY_ID + ' .quote-totals .qt-val{font-size:26px;font-weight:800;margin-top:2px;}' +
			'#' + OVERLAY_ID + ' .quote-totals .qt-note{font-size:11.5px;opacity:.8;text-align:right;max-width:220px;}' +
			// Frame-wise: a plain table, one row per cabinet.
			'#' + OVERLAY_ID + ' .fw-note{background:#f4f8fc;border:1px solid #dbe6f2;border-radius:8px;padding:11px 15px;margin:0 0 18px;font-size:12px;color:var(--ink-soft,#4a5b6d);line-height:1.6;max-width:900px;}' +
			'#' + OVERLAY_ID + ' table.fwtbl{width:100%;max-width:900px;border-collapse:collapse;font-size:14px;}' +
			'#' + OVERLAY_ID + ' .fwtbl thead th{background:var(--surface-2,#eef2f6);color:var(--ink,#16202b);text-align:left;padding:10px 12px;font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid var(--brand,#14487f);}' +
			'#' + OVERLAY_ID + ' .fwtbl td{padding:13px 12px;border-bottom:1px solid #eef1f4;vertical-align:top;}' +
			'#' + OVERLAY_ID + ' .fwtbl .cab-name{font-weight:700;font-size:14.5px;color:var(--ink,#16202b);}' +
			'#' + OVERLAY_ID + ' .fwtbl .cab-desc{font-size:11.5px;color:var(--ink-soft,#4a5b6d);margin-top:2px;}' +
			'#' + OVERLAY_ID + ' .fwtbl .num{text-align:right;font-variant-numeric:tabular-nums;}' +
			'#' + OVERLAY_ID + ' .fwtbl .unitprice{font-size:11px;color:var(--ink-soft,#4a5b6d);}' +
			'#' + OVERLAY_ID + ' .fwtbl tfoot td{font-weight:800;font-size:15px;color:#fff;background:var(--brand,#14487f);padding:13px 12px;}' +
			'#' + OVERLAY_ID + ' .pr-pl{font-size:13px;color:var(--ink-soft,#4a5b6d);}' +
			'#' + OVERLAY_ID + ' .pr-zoom{display:inline-flex;align-items:center;gap:0;border:1px solid var(--rule,#d4dde5);border-radius:var(--radius,6px);overflow:hidden;margin-left:auto;}' +
			'#' + OVERLAY_ID + ' .pr-zoom button{border:0;background:var(--surface,#fff);padding:8px 13px;font-size:14px;cursor:pointer;color:var(--ink,#16202b);font-family:inherit;}' +
			'#' + OVERLAY_ID + ' .pr-zoom button.on{background:var(--brand,#14487f);color:#fff;font-weight:600;}' +
			'#' + OVERLAY_ID + ' .pr-zoom button + button{border-left:1px solid var(--rule,#d4dde5);}' +
			'#' + OVERLAY_ID + ' .pr-zoom .pr-zl{padding:8px 12px;font-size:13px;font-variant-numeric:tabular-nums;min-width:52px;text-align:center;color:var(--ink-soft,#4a5b6d);}' +
			// Group heading between split sections, as Stocks shows it.
			'#' + OVERLAY_ID + ' .pr-grp{font-weight:700;font-size:15px;color:var(--brand,#14487f);margin:20px 2px 8px;}' +
			// Panel name links to the panel detail page, same target as Stocks.
			'#' + OVERLAY_ID + ' a.pr-link{color:var(--brand,#14487f);font-weight:600;text-decoration:none;}' +
			'#' + OVERLAY_ID + ' a.pr-link:hover{text-decoration:underline;}' +
			'#' + OVERLAY_ID + ' .pr-chart{flex:1 1 320px;min-width:300px;display:flex;align-items:center;justify-content:center;gap:14px;border:1px solid var(--rule,#d4dde5);border-radius:var(--radius,6px);padding:14px;}' +
			'#' + OVERLAY_ID + ' .pr-legend{font-size:12.5px;color:var(--ink,#16202b);}' +
			'#' + OVERLAY_ID + ' .pr-legend .pr-lt{font-weight:600;margin-bottom:7px;}' +
			'#' + OVERLAY_ID + ' .pr-legend div.pr-li{display:flex;align-items:center;gap:7px;margin:3px 0;}' +
			'#' + OVERLAY_ID + ' .pr-sw{width:26px;height:13px;border-radius:2px;display:inline-block;flex:none;}' +
			'#' + OVERLAY_ID + ' .pr-board{flex:1 1 520px;min-width:320px;overflow:visible;}' +
			'#' + OVERLAY_ID + ' .pr-board svg{width:100%;height:auto;display:block;}' +
			'#' + OVERLAY_ID + ' .pr-total{display:inline-block;font-size:15px;margin-bottom:18px;}' +
			'#' + OVERLAY_ID + ' .pr-tbl-shell{margin-bottom:22px;max-width:1100px;}' +
			// Title bar mirrors the Stocks page: name centred, "N items - M
			// instances" and the export/print icons pushed to the right.
			'#' + OVERLAY_ID + ' .pr-tbl-title{background:var(--surface-2,#eef2f6);border:1px solid var(--rule,#d4dde5);border-bottom:2px solid var(--brand,#14487f);border-radius:var(--radius,6px) var(--radius,6px) 0 0;padding:9px 14px;font-weight:700;font-size:15px;color:var(--ink,#16202b);display:flex;align-items:center;gap:10px;}' +
			'#' + OVERLAY_ID + ' .pr-tbl-title .pr-tt{flex:1 1 0;text-align:center;}' +
			'#' + OVERLAY_ID + ' .pr-tbl-title .pr-meta{font-size:12.5px;font-style:italic;font-weight:400;color:var(--ink-soft,#4a5b6d);white-space:nowrap;}' +
			'#' + OVERLAY_ID + ' .pr-acts{display:flex;align-items:center;gap:4px;}' +
			'#' + OVERLAY_ID + ' .pr-acts button{border:0;background:transparent;color:var(--brand,#14487f);cursor:pointer;padding:4px 5px;border-radius:4px;line-height:0;}' +
			'#' + OVERLAY_ID + ' .pr-acts button:hover{background:#dbe9f8;}' +
			// Editable unit-cost cells in the Summary
			'#' + OVERLAY_ID + ' .pr-tbl input.pr-ucost{width:80px;border:1px solid var(--rule,#d4dde5);border-radius:4px;padding:4px 6px;font-size:13px;text-align:right;font-family:inherit;color:var(--ink,#16202b);background:var(--surface,#fff);}' +
			'#' + OVERLAY_ID + ' .pr-tbl input.pr-ucost:focus{border-color:var(--brand,#14487f);outline:none;box-shadow:0 0 0 2px rgba(20,72,127,.15);}' +
			'#' + OVERLAY_ID + ' .pr-tbl input.pr-ucost.pr-edited{background:#fef9ee;border-color:var(--accent,#b45309);}' +
			'@media print{#' + OVERLAY_ID + '{position:static !important;padding:0;overflow:visible;}' +
				'#' + OVERLAY_ID + ' .pr-bar,#' + OVERLAY_ID + ' .pr-acts{display:none;}}' +
			'#' + OVERLAY_ID + ' table.pr-tbl{width:100%;border-collapse:collapse;font-size:var(--table-font-size,14px);border:1px solid var(--rule,#d4dde5);border-top:none;border-radius:0 0 var(--radius,6px) var(--radius,6px);}' +
			'#' + OVERLAY_ID + ' .pr-tbl th{background:var(--brand,#14487f);color:#fff;font-weight:600;font-size:13.5px;text-align:left;padding:9px 10px;border-bottom:2px solid var(--accent,#b45309);}' +
			'#' + OVERLAY_ID + ' .pr-tbl th + th{box-shadow:inset 1px 0 0 rgba(255,255,255,.2);}' +
			'#' + OVERLAY_ID + ' .pr-tbl th{cursor:pointer;user-select:none;white-space:nowrap;}' +
			'#' + OVERLAY_ID + ' .pr-tbl th:hover{background:var(--brand-dark,#0e3560);}' +
			'#' + OVERLAY_ID + ' .pr-sa{font-size:8px;margin-left:6px;opacity:.6;display:inline-block;vertical-align:middle;}' +
			'#' + OVERLAY_ID + ' .pr-sa.on{opacity:1;color:#ffd9a8;}' +
			'#' + OVERLAY_ID + ' .pr-tbl td{padding:7px 10px;border-bottom:1px solid var(--rule,#d4dde5);color:var(--ink,#16202b);}' +
			'#' + OVERLAY_ID + ' .pr-tbl tr.pr-even td{background:var(--stripe,#f1f5f9);}' +
			'#' + OVERLAY_ID + ' .pr-tbl tr:hover td{background:#dbe9f8;}' +
			'#' + OVERLAY_ID + ' .pr-tbl .pr-num{text-align:right;font-variant-numeric:tabular-nums;}' +
			'#' + OVERLAY_ID + ' .pr-tbl tr.pr-tot td{font-weight:700;color:var(--brand,#14487f);background:#e3edf9;border-top:2px solid var(--brand,#14487f);}' +
			'#' + OVERLAY_ID + ' .pr-empty{background:var(--surface,#fff);border:1px dashed var(--rule,#d4dde5);border-radius:var(--radius,6px);padding:40px;text-align:center;color:var(--ink-soft,#4a5b6d);max-width:640px;}';
		var style = document.createElement('style');
		style.id = STYLE_ID;
		style.appendChild(document.createTextNode(css));
		document.head.appendChild(style);
	}

	var ICON_SEARCH = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" ' +
		'stroke="#4a5b6d" stroke-width="2"><circle cx="11" cy="11" r="7"/>' +
		'<line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

	// Same glyphs the Cutrite page uses, which in turn match the Stocks page.
	var ICON_XLS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
		'stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2.5"/>' +
		'<line x1="12" y1="7.5" x2="12" y2="15"/><polyline points="8.5 11.5 12 15 15.5 11.5"/></svg>';
	var ICON_CSV = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">' +
		'<path d="M12 3a1.2 1.2 0 0 1 1.2 1.2v7.3l2.5-2.5a1.2 1.2 0 1 1 1.7 1.7l-4.55 4.55a1.2 1.2 0 0 1-1.7 0' +
		'L6.6 10.7a1.2 1.2 0 1 1 1.7-1.7l2.5 2.5V4.2A1.2 1.2 0 0 1 12 3z"/>' +
		'<rect x="4" y="18" width="16" height="2.4" rx="1.2"/></svg>';
	var ICON_PRINT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">' +
		'<path d="M7 3h10v4H7z"/><path d="M5 9h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v-4H6v4H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z"/>' +
		'<path d="M8 16h8v5H8z"/></svg>';

	// ---- small helpers ---------------------------------------------------
	function esc(s) {
		return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
		});
	}
	function indexBy(list, key) {
		var m = {};
		(list || []).forEach(function (x) { m[x[key]] = x; });
		return m;
	}
	function vars(obj) {
		var m = {};
		((obj && obj.variables) || []).forEach(function (v) { m[v.alias] = v.value; });
		return m;
	}
	function fmt(n, dp) {
		var f = Math.pow(10, dp);
		return (Math.round(n * f) / f).toFixed(dp);
	}

	// ---- 1. What has to be cut ------------------------------------------
	// Same panel-only gate and same quantity rule as the Cutrite page, so the
	// two pages can never disagree about what is being cut or how many.
	// ---- Shared view state ----------------------------------------------
	// Search text and split mode are held per page, so switching pages and
	// coming back doesn't silently drop a filter the user set.
	var UI = {
		patterned: { q: '', split: 'none' },
		table: { q: '', split: 'none' },
		// perPage is the primary control: how many sheets sit side by side,
		// or 'all' to fit the entire job on one screen. It defaults to 'all'
		// because seeing every sheet together is the usual reason to open this
		// page. zoom then magnifies whatever is on screen, all sheets at once.
		detail: { q: '', split: 'none', perPage: 'all', zoom: 1 },
		process: { q: '', split: 'none' },
		// Summary's Factory/Client split. mode: 'factory' | 'client'.
		// view (client only): 'complete' | 'framewise'. factor: % markup
		// applied to factory cost to get the client-facing price.
		summary: { mode: 'factory', view: 'complete', factor: 30 },
	};

	// ---- Frame attribution ----------------------------------------------
	// Panels carry no parent pointer; the link runs the other way, through
	// each assembly's `parts` array. Walking the assembly tree and keeping the
	// nearest FRAME/SUBFRAME ancestor gives every panel its frame name - the
	// same grouping the Stocks page offers under its Frame button.
	function frameNameByPanel(data) {
		var byId = indexBy(data.assemblies, 'ID');
		var map = {};
		function walk(id, frameName) {
			var asm = byId[id];
			if (!asm) return;
			var v = vars(asm);
			var t = v.TOTYPE;
			// A hardware sub-assembly is not a frame; keep the parent's name.
			var name = (t === 'FRAME' || t === 'SUBFRAME') ? (v.NAME || frameName) : frameName;
			// Descend first. A parent's `parts` array also lists everything its
			// sub-assemblies own, so claiming parents-first would label every
			// panel with the top frame. Deepest owner wins instead.
			(asm.assemblies || []).forEach(function (cid) { walk(cid, name); });
			(asm.parts || []).forEach(function (pid) {
				if (!map[pid]) map[pid] = name || '';
			});
		}
		(data.assemblies || []).forEach(function (a) {
			var v = vars(a);
			if (v.TOTYPE === 'FRAME') walk(a.ID, v.NAME || '');
		});
		return map;
	}

	// ---- Toolbar ---------------------------------------------------------
	// Search box, split buttons and (on the drawing page) zoom controls. Built
	// as markup here and wired up by bindBar() after the page is written.
	function toolbar(state, splits, opts) {
		opts = opts || {};
		var html = '<div class="pr-bar">' +
			'<div class="pr-search">' + ICON_SEARCH +
			'<input type="text" placeholder="Search..." value="' + esc(state.q) + '" data-pr="q"></div>';
		if (splits && splits.length) {
			html += '<div class="pr-split">' +
				splits.map(function (sp) {
					return '<button data-pr="split" data-v="' + esc(sp.key) + '"' +
						(state.split === sp.key ? ' class="on"' : '') + '>' + esc(sp.label) + '</button>';
				}).join('') + '</div>';
		}
		if (opts.units) html += unitToggle();
		if (opts.saw) {
			// Editable saw settings. Placeholders show the value actually in
			// force, so an empty box plainly means "using SWOOD's own setting"
			// rather than "zero". Changing either re-nests the whole project.
			var sw = opts.saw;
			html += '<div class="pr-saw">' +
				'<label>Trim <input type="number" min="0" step="1" data-pr="trim" ' +
					'value="' + (SAW_OVERRIDE.trim === null ? '' : SAW_OVERRIDE.trim) + '" ' +
					'placeholder="' + fmt(sw.trim, 0) + '"> mm</label>' +
				'<label>Kerf <input type="number" min="0" step="0.5" data-pr="kerf" ' +
					'value="' + (SAW_OVERRIDE.kerf === null ? '' : SAW_OVERRIDE.kerf) + '" ' +
					'placeholder="' + fmt(sw.kerf, 1) + '"> mm</label>' +
				(sw.edited ? '<button data-pr="sawreset" title="Back to the project\u2019s own settings">Reset</button>' : '') +
				'</div>';
		}
		if (opts.zoom) {
			// Named outright rather than left as +/-, because "zoom" was
			// ambiguous: it can mean magnify one sheet or fit more of them in.
			html += '<div class="pr-perpage"><span class="pr-pl">Sheets per row</span><div class="pr-split">' +
				[1, 2, 3, 4].map(function (n) {
					return '<button data-pr="perpage" data-v="' + n + '"' +
						(state.perPage === n ? ' class="on"' : '') + '>' + n + '</button>';
				}).join('') +
				'<button data-pr="perpage" data-v="all" title="Fit every sheet on one screen"' +
					(state.perPage === 'all' ? ' class="on"' : '') + '>All</button></div></div>';
			html += paperPicker();
			html += '<div class="pr-zoom">' +
				'<button data-pr="sheetprint" title="Print the sheets at this layout">' + ICON_PRINT + '</button>' +
				'<button data-pr="zoom" data-v="out" title="Shrink the drawings">&minus;</button>' +
				'<span class="pr-zl">' + Math.round(state.zoom * 100) + '%</span>' +
				'<button data-pr="zoom" data-v="in" title="Magnify every drawing together">+</button>' +
				'<button data-pr="zoom" data-v="fit" title="Back to 100%">Reset</button></div>';
		}
		return html + '</div>';
	}

	// Re-runs the current page's renderer after a control changes.
	var rerender = function () {};

	// Units and paper are global rather than per page, and the Summary has no
	// search box, so these bind separately from the rest of the toolbar.
	function bindRates(app) {
		app.querySelectorAll('[data-pr="rate"]').forEach(function (el) {
			var unit = el.getAttribute('data-unit');
			var key = rateKey(el.getAttribute('data-sec'), el.getAttribute('data-name'));
			if (key in RATES) el.classList.add('edited');
			el.addEventListener('change', function () {
				var shown = parseFloat(el.value);
				if (isNaN(shown) || shown < 0) return;
				// Store back in the project's own unit.
				var f = rateFactor(unit);
				RATES[key] = f ? shown / f : shown;
				rerender();
			});
		});
	}


	function bindCommon(app) {
		bindRates(app);
		app.querySelectorAll('[data-pr="paper"]').forEach(function (b) {
			b.addEventListener('click', function () {
				var v = b.getAttribute('data-v');
				if (v === 'orient') PAPER.landscape = !PAPER.landscape;
				else PAPER.size = v;
				rerender();
			});
		});
		app.querySelectorAll('[data-pr="units"]').forEach(function (b) {
			b.addEventListener('click', function () {
				UNITS.imperial = b.getAttribute('data-v') === 'ft';
				rerender();
			});
		});
	}

	function bindBar(app, state) {
		var box = app.querySelector('[data-pr="q"]');
		if (box) {
			box.addEventListener('input', function () {
				state.q = box.value;
				var pos = box.selectionStart;
				rerender();
				// Re-rendering replaces the input, so restore focus and caret.
				var again = app.querySelector('[data-pr="q"]');
				if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) {} }
			});
		}
		app.querySelectorAll('[data-pr="split"]').forEach(function (b) {
			b.addEventListener('click', function () {
				var v = b.getAttribute('data-v');
				state.split = (state.split === v) ? 'none' : v;
				rerender();
			});
		});
		['trim', 'kerf'].forEach(function (which) {
			var el = app.querySelector('[data-pr="' + which + '"]');
			if (!el) return;
			el.addEventListener('change', function () {
				var raw = el.value.trim();
				// Blank hands the setting back to SWOOD rather than meaning 0.
				var n = raw === '' ? null : parseFloat(raw);
				SAW_OVERRIDE[which] = (n === null || isNaN(n) || n < 0) ? null : n;
				rerender();
				var again = app.querySelector('[data-pr="' + which + '"]');
				if (again) again.focus();
			});
		});
		var reset = app.querySelector('[data-pr="sawreset"]');
		if (reset) {
			reset.addEventListener('click', function () {
				SAW_OVERRIDE.trim = null; SAW_OVERRIDE.kerf = null;
				rerender();
			});
		}
		var sp = app.querySelector('[data-pr="sheetprint"]');
		if (sp) {
			sp.addEventListener('click', function () {
				var grid = app.querySelector('.pr-sheets');
				if (!grid) return;
				var cols = parseInt(grid.getAttribute('data-cols'), 10) || 1;
				// Reproduce the on-screen arrangement on paper: same number of
				// sheets per row, each drawing scaled to its share of the page
				// width so nothing is cut off at the margin.
				var css = '.p-grid{display:grid;grid-template-columns:repeat(' + cols +
					',1fr);gap:6mm;}' +
					'.p-cell{border:1px solid #bbb;padding:3mm;page-break-inside:avoid;break-inside:avoid;}' +
					'.p-cell h3{font-size:10px;margin:0 0 2mm;font-weight:700;}' +
					'.p-cell svg{width:100%;height:auto;display:block;}';
				var cells = [].map.call(app.querySelectorAll('.pr-sheets .pr-panel'), function (panel) {
					var head = panel.querySelector('.pr-tile-head');
					var cards = panel.querySelector('.pr-cards');
					var label = head && head.innerText.trim()
						? head.innerText.trim()
						: (cards ? cards.innerText.replace(/\s*\n\s*/g, '  \u00b7  ').trim() : '');
					var svg = panel.querySelector('.pr-board svg');
					return '<div class="p-cell"><h3>' + esc(label) + '</h3>' +
						(svg ? svg.outerHTML : '') + '</div>';
				}).join('');
				printDocument('Nested Patterns', '<div class="p-grid">' + cells + '</div>', css);
			});
		}
		bindCommon(app);
		bindRates(app);
		app.querySelectorAll('[data-pr="perpage"]').forEach(function (b) {
			b.addEventListener('click', function () {
				var v = b.getAttribute('data-v');
				state.perPage = (v === 'all') ? 'all' : parseInt(v, 10);
				// Changing the layout resets magnification; otherwise a stale
				// zoom makes the new arrangement overflow for no clear reason.
				state.zoom = 1;
				rerender();
			});
		});
		app.querySelectorAll('[data-pr="zoom"]').forEach(function (b) {
			b.addEventListener('click', function () {
				var v = b.getAttribute('data-v');
				if (v === 'in') state.zoom = Math.min(ZOOM_MAX, state.zoom * ZOOM_STEP);
				else if (v === 'out') state.zoom = Math.max(1, state.zoom / ZOOM_STEP);
				else state.zoom = 1;
				rerender();
			});
		});
	}

	// Case-insensitive match across whichever fields a page cares about.
	function matches(q, fields) {
		if (!q) return true;
		var needle = q.toLowerCase();
		return fields.some(function (f) {
			return String(f == null ? '' : f).toLowerCase().indexOf(needle) >= 0;
		});
	}

	function collectPanels(data) {
		var materials = indexBy(data.materials, 'ID');
		var panels = indexBy(data.panels, 'ID');
		// Attached here rather than per page, so the tables and the pieces
		// inside the nest carry identical frame names.
		var frameOf = frameNameByPanel(data);
		var partsByPanel = {};
		(data.parts || []).forEach(function (p) { if (p && p.panel) partsByPanel[p.panel] = p; });

		var projectProps = {};
		(data.swcps || []).forEach(function (c) { projectProps[c.name] = c.value; });
		var projectQty = parseFloat(projectProps['Project Quantity']) || 0;
		(data.variables || []).forEach(function (v) {
			if (v.alias === 'PROJECT_QTY') projectQty = parseFloat(v.value) || projectQty;
		});

		var out = [];
		(data.stocks || []).forEach(function (st) {
			var panel = panels[st.part];
			if (!panel) return;
			if (st.multiBodyStockVariables && st.multiBodyStockVariables.length) return;
			var mv = vars(materials[st.material] || {});
			if (mv.WELDMENT === 'True') return;
			if (mv.MAT_ISFORSAW === 'False') return;

			var sv = vars(st);
			var part = partsByPanel[st.part];
			var partVars = part ? vars(part) : {};
			var partProps = {};
			((part && part.swcps) || []).forEach(function (c) { partProps[c.name] = c.value; });

			var qty = parseFloat(partVars.NB || st.quantity || 1) || 1;
			if (projectQty) qty = qty * projectQty;

			var L = parseFloat(sv.ST_L), W = parseFloat(sv.ST_W);
			if (!(L > 0) || !(W > 0)) return;

			out.push({
				label: partProps['ID'] || partVars.NAME || panel.name || '',
				panelId: partProps['ID'] || '',
				panelGuid: panel.ID || '',
				name: partVars.NAME || panel.name || '',
				L: L,
				W: W,
				thickness: parseFloat(sv.ST_T) || 0,
				qty: qty,
				material: st.material,
				materialName: mv.MAT_NAME || st.material || '',
				hasGrain: mv.MAT_WITHGRAIN === 'True',
				// The app reads a material's category from variables.CATEGORY,
				// defaulting to '' (main bundle: getCategory). Neither material
				// in this project sets it, so grouping by Category yields one
				// '*' bucket today - it starts working the moment SWOOD's
				// material database populates the field, with no code change.
				category: mv.CATEGORY || '',
				frame: frameOf[st.part] || '',
				boardL: parseFloat(mv.BOARD_LENGTH) || 0,
				boardW: parseFloat(mv.BOARD_WIDTH) || 0,
			});
		});
		return out;
	}

	// ---- 2. Saw settings -------------------------------------------------
	// Read trim and kerf out of SWOOD's own pattern rather than assuming
	// them, so the re-nest cuts to the settings this project was optimised
	// with. The root node's cut-coordinate is the trim; cut-half-thickness
	// is half the kerf.
	// User overrides from the Nested Patterns toolbar. Null means "leave it to
	// SWOOD" - the values read out of the project's own pattern. Setting either
	// one re-nests the whole project, so the Patterns table and the Summary's
	// board count follow the same saw settings as the drawings.
	var SAW_OVERRIDE = { trim: null, kerf: null };

	function sawSettings(data) {
		var trim = DEFAULT_TRIM, kerf = DEFAULT_KERF, found = false;
		var cps = data.cuttingPattern || [];
		for (var i = 0; i < cps.length && !found; i++) {
			var stocks = cps[i].stocks || [];
			for (var j = 0; j < stocks.length && !found; j++) {
				var root = stocks[j];
				if (!root || !root.cut) continue;
				var c = parseFloat(root['cut-coordinate']);
				var h = parseFloat(root['cut-half-thickness']);
				if (c > 0) trim = Math.round(c * 1000 * 1000) / 1000;
				if (h > 0) kerf = Math.round(h * 2 * 1000 * 1000) / 1000;
				found = true;
			}
		}
		var edited = false;
		if (SAW_OVERRIDE.trim !== null && SAW_OVERRIDE.trim >= 0) { trim = SAW_OVERRIDE.trim; edited = true; }
		if (SAW_OVERRIDE.kerf !== null && SAW_OVERRIDE.kerf >= 0) { kerf = SAW_OVERRIDE.kerf; edited = true; }
		return { trim: trim, kerf: kerf, fromSwood: found, edited: edited };
	}

	// ---- 3. Guillotine (shelf) nest -------------------------------------
	// A panel saw can only make edge-to-edge cuts, so the nest is built as
	// horizontal shelves and the pieces within each shelf are cut off left to
	// right. Pieces are taken tallest-first, which is what keeps shelves full.
	//
	// The geometry mirrors SWOOD's: the first cut strips a trim band off the
	// bottom, each cut consumes kerf, and whatever is left over at the end of
	// a shelf or above the last shelf becomes waste.
	// ---- 3. Guillotine nest (free-rectangle) ----------------------------
	// A panel saw can only make edge-to-edge cuts, so every placement has to
	// leave rectangular remainders - but that still allows full guillotine
	// packing, not just fixed-height shelves.
	//
	// This replaced a shelf packer, which had a structural flaw: opening a
	// 700mm-tall shelf and dropping 320mm panels into it abandoned the 380mm
	// strip above them permanently. On a real cabinet that lost 602,600 mm2 -
	// 20% of the board - and pushed panels onto a second sheet that they all
	// fit on. Free-rectangle packing keeps that strip as a usable offcut.
	//
	// Each board holds a list of free rectangles. A piece is placed into the
	// rectangle that wastes least (best short-side fit), then the remainder is
	// split guillotine-style along its shorter leftover axis, which keeps the
	// bigger survivor intact instead of slicing it into two thin ones.
	function splitFree(fr, L, W, kerf) {
		var out = [];
		var restL = fr.L - L - kerf;
		var restW = fr.W - W - kerf;
		if ((fr.L - L) < (fr.W - W)) {
			if (restL > 0) out.push({ x: fr.x + L + kerf, y: fr.y, L: restL, W: W });
			if (restW > 0) out.push({ x: fr.x, y: fr.y + W + kerf, L: fr.L, W: restW });
		} else {
			if (restL > 0) out.push({ x: fr.x + L + kerf, y: fr.y, L: restL, W: fr.W });
			if (restW > 0) out.push({ x: fr.x, y: fr.y + W + kerf, L: L, W: restW });
		}
		return out;
	}

	// Fills one board as full as it can with STRICT guillotine rows: every cut
	// runs the full width or height of what it's cutting, edge to edge - the
	// only kind a panel saw can make in one pass. The free-rectangle packer
	// above breaks pieces apart per-item, so a trailing offcut next to three
	// stacked panels came out as three separate waste rectangles instead of
	// one strip - correct area, but not a cut sequence any saw follows.
	//
	// Row height is set by the tallest piece placed in it; everything in the
	// row shares that height, so the row's leftover length is one rectangle,
	// and the board's final leftover height is one rectangle too.
	function fillBoard(queue, boardL, boardW, trim, kerf, allowRotate) {
		var placements = [];
		var free = [];
		var y = trim;
		var guard = 0;

		while (queue.length && guard++ < 20000) {
			var avail = boardW - y;
			if (avail <= 0) break;

			// Row height starts as a guess - the tallest fitting piece - then
			// gets corrected to whatever was ACTUALLY placed. The guess alone
			// was the bug: seed selection considered a piece's height without
			// checking it would fit the remaining LENGTH too, so a tall piece
			// that only fit height-wise (but never got placed, having no
			// room left after earlier items) still inflated the row. On
			// Assem1 that shrank a genuinely usable 388mm leftover strip to
			// 290mm - just under the 342mm smaller panels waiting to backfill
			// it - so boards that should have mixed two panel types stayed
			// pure and wasteful instead.
			var guessH = 0;
			for (var qi = 0; qi < queue.length; qi++) {
				var q = queue[qi];
				var hs = allowRotate ? [q.W, q.L] : [q.W];
				for (var hi = 0; hi < hs.length; hi++) {
					if (hs[hi] <= avail && hs[hi] > guessH) guessH = hs[hi];
				}
			}
			if (guessH <= 0) break;

			var x = trim;
			var rowItems = [];
			var actualH = 0;
			for (var k = 0; k < queue.length;) {
				var p = queue[k];
				// Unrotated first, always: two boards holding the identical
				// panels should cut the identical way, so they merge into one
				// pattern with a quantity, rather than each looking like a
				// one-off because one board happened to rotate a piece the
				// others didn't.
				var xs = allowRotate ? [{ L: p.L, W: p.W, rot: false }, { L: p.W, W: p.L, rot: true }]
					: [{ L: p.L, W: p.W, rot: false }];
				var placed = false;
				for (var xi = 0; xi < xs.length; xi++) {
					var o = xs[xi];
					if (o.W <= guessH && x + o.L <= boardL - trim + 0.001) {
						placements.push({ piece: p, x: x, y: y, L: o.L, W: o.W, rotated: o.rot });
						rowItems.push(o);
						x += o.L + kerf;
						if (o.W > actualH) actualH = o.W;
						queue.splice(k, 1);
						placed = true;
						break;
					}
				}
				if (!placed) k++;
			}
			if (!rowItems.length) break;
			var rowH = actualH;

			// One offcut for the row - the strip to the right of the last
			// piece - rather than one per item. Runs to the board's right
			// trim edge exactly; no +kerf here, since x already sits one
			// kerf past the last piece.
			var rowRest = (boardL - trim) - x;
			if (rowRest > 0.01) free.push({ x: x, y: y, L: rowRest, W: rowH });

			y += rowH + kerf;
		}

		// One offcut for whatever height is left below the top of the board.
		var bottomRest = (boardW - trim) - (y - kerf);
		if (bottomRest > 0.01) free.push({ x: trim, y: y - kerf, L: boardL - trim, W: bottomRest });

		// Adjacent full-depth offcuts of equal width and x-position, stacked
		// in rows of the same height, are one continuous strip on the real
		// board - the saw makes one length-wise cut, not one per row. Merge
		// them so the drawing (and the waste count) matches the physical cut.
		free.sort(function (a, b) { return a.x - b.x || a.y - b.y; });
		var merged = [];
		free.forEach(function (f) {
			var prev = merged[merged.length - 1];
			if (prev && Math.abs(prev.x - f.x) < 0.5 && Math.abs(prev.L - f.L) < 0.5 &&
				Math.abs((prev.y + prev.W + kerf) - f.y) < 0.5) {
				prev.W += f.W + kerf;
			} else {
				merged.push({ x: f.x, y: f.y, L: f.L, W: f.W });
			}
		});

		return { placements: placements, free: merged };
	}

	function packOnce(pieces, boardL, boardW, trim, kerf, allowRotate) {
		var queue = pieces.slice();
		var boards = [];
		var guard = 0;
		while (queue.length && guard++ < 5000) {
			var before = queue.length;
			var b = fillBoard(queue, boardL, boardW, trim, kerf, allowRotate);
			if (!b.placements.length) break;   // nothing left fits an empty board
			boards.push(b);
			if (queue.length === before) break;
		}
		return { boards: boards, unplaced: queue };
	}

	function nestBoards(pieces, boardL, boardW, trim, kerf, allowRotate) {
		// Greedy packing is order-sensitive, so several sensible orderings are
		// tried and the best result kept. Cheap here (a handful of passes) and
		// it reliably beats any single fixed rule.
		var orders = [
			function (a, b) { return (b.L * b.W) - (a.L * a.W); },              // biggest area first
			function (a, b) { return (b.W - a.W) || (b.L - a.L); },             // tallest, then longest
			function (a, b) { return (b.L - a.L) || (b.W - a.W); },             // longest, then tallest
			function (a, b) { return Math.max(b.L, b.W) - Math.max(a.L, a.W); },// longest side first
			function (a, b) { return ((b.L + b.W) - (a.L + a.W)); },            // biggest perimeter
		];
		var best = null;
		orders.forEach(function (cmp) {
			var sorted = pieces.slice().sort(cmp);
			var res = packOnce(sorted, boardL, boardW, trim, kerf, allowRotate);
			// Fewest boards wins; ties broken by least leftover free area, so
			// the offcuts that remain are as few and as large as possible.
			var leftover = 0;
			res.boards.forEach(function (b) {
				b.free.forEach(function (f) { leftover += f.L * f.W; });
			});
			var key = [res.unplaced.length, res.boards.length, leftover];
			if (!best || key[0] < best.key[0] ||
				(key[0] === best.key[0] && (key[1] < best.key[1] ||
					(key[1] === best.key[1] && key[2] < best.key[2])))) {
				best = { res: res, key: key };
			}
		});
		return best.res;
	}

	// ---- 4. Board geometry + leaf typing --------------------------------
	// Turns a packed board into the flat list of rectangles the drawing needs,
	// typed as SWOOD types them (item / padding / waste) so trim, waste and
	// cut areas are computed on the same basis as the page this replaces.
	// Coordinates are mm from the bottom-left of the board.
	//
	// Every leftover free rectangle is emitted as waste, so panels + trim +
	// waste + saw kerf now account for the whole board. The shelf packer used
	// to leave the strip above a short panel undrawn and uncounted - 20% of a
	// board on a real cabinet - which is exactly the space this reclaims.
	function layoutBoard(board, boardL, boardW, trim, kerf) {
		var rects = [];
		// The two datum edges SWOOD trims first.
		rects.push({ type: 'padding', x: 0, y: 0, L: boardL, W: trim });
		rects.push({ type: 'padding', x: 0, y: trim, L: trim, W: boardW - trim });

		(board.placements || []).forEach(function (pl) {
			rects.push({
				type: 'item', x: pl.x, y: pl.y, L: pl.L, W: pl.W,
				label: pl.piece.label, piece: pl.piece, rotated: pl.rotated,
			});
		});

		(board.free || []).forEach(function (fr) {
			if (fr.L > 0.01 && fr.W > 0.01) {
				rects.push({ type: 'waste', x: fr.x, y: fr.y, L: fr.L, W: fr.W });
			}
		});

		var a = { item: 0, padding: 0, waste: 0 };
		var n = { item: 0, padding: 0, waste: 0 };
		rects.forEach(function (r) { a[r.type] += r.L * r.W; n[r.type]++; });
		var total = boardL * boardW;

		return {
			rects: rects,
			areaTotal: total,
			areaPanels: a.item,
			areaTrims: a.padding,
			areaWaste: a.waste,
			areaCuts: Math.max(0, total - a.item - a.padding - a.waste),
			nPanels: n.item,
			nTrims: n.padding,
			nWaste: n.waste,
		};
	}

	// Identical boards collapse into one pattern with a quantity, the way
	// SWOOD carries `quantity` on a pattern's root stock.
	function signature(lay) {
		return lay.rects.map(function (r) {
			return r.type + ':' + r.x + ',' + r.y + ',' + r.L + ',' + r.W + (r.label ? ',' + r.label : '');
		}).join('|');
	}

	// ---- 5. Build every pattern in the project --------------------------
	function buildPatterns(data) {
		var saw = sawSettings(data);
		var panels = collectPanels(data);
		if (!panels.length) return { patterns: [], saw: saw, unplaced: [] };

		// One nest per material - different boards can't share a pattern.
		// Thickness is rounded to 0.1mm before joining the key: SolidWorks'
		// unit conversion can hand back 19.0000000000002 for one panel and
		// exactly 19 for another cut from the identical stock, and comparing
		// those as raw floats split five WC-SD panels of the same board into
		// two separate nests - 3 on one sheet, 2 on another - when all five
		// fit on one.
		var groups = {}, order = [];
		panels.forEach(function (p) {
			var key = p.material + '|' + fmt(p.thickness, 1);
			if (!groups[key]) { groups[key] = []; order.push(key); }
			groups[key].push(p);
		});

		var patterns = [], unplaced = [];
		order.forEach(function (key) {
			var list = groups[key];
			var first = list[0];
			var boardL = first.boardL, boardW = first.boardW;
			if (!(boardL > 0) || !(boardW > 0)) {
				list.forEach(function (p) { unplaced.push(p.label + ' (no board size on material)'); });
				return;
			}

			// Expand quantities into individual pieces to place.
			var pieces = [];
			list.forEach(function (p) {
				for (var i = 0; i < p.qty; i++) pieces.push(p);
			});

			var res = nestBoards(pieces, boardL, boardW, saw.trim, saw.kerf, !first.hasGrain);
			res.unplaced.forEach(function (p) { unplaced.push(p.label + ' (too large for the board)'); });

			// Lay each board out, then merge identical ones.
			var seen = {}, seq = [];
			res.boards.forEach(function (b) {
				var lay = layoutBoard(b, boardL, boardW, saw.trim, saw.kerf);
				var sig = signature(lay);
				if (seen[sig]) { seen[sig].quantity++; return; }
				var entry = {
					quantity: 1, layout: lay, boardL: boardL, boardW: boardW,
					material: first.materialName, materialId: first.material, hasGrain: first.hasGrain,
				};
				seen[sig] = entry;
				seq.push(entry);
			});
			patterns = patterns.concat(seq);
		});

		patterns.forEach(function (p, i) { p.name = 'Pattern ' + (i + 1); });
		return { patterns: patterns, saw: saw, unplaced: unplaced };
	}

	// ---- 6. Donut chart --------------------------------------------------
	function donut(title, slices) {
		var total = slices.reduce(function (a, s) { return a + s.value; }, 0);
		var R = 78, r = 46, cx = 90, cy = 90, path = '';
		if (total > 0) {
			var ang = -Math.PI / 2;
			slices.forEach(function (s) {
				if (s.value <= 0) return;
				var sweep = (s.value / total) * Math.PI * 2;
				// A full circle can't be drawn as one arc - split it.
				var end = ang + (sweep >= Math.PI * 2 ? Math.PI * 1.999 : sweep);
				var big = sweep > Math.PI ? 1 : 0;
				var x1 = cx + R * Math.cos(ang), y1 = cy + R * Math.sin(ang);
				var x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end);
				var x3 = cx + r * Math.cos(end), y3 = cy + r * Math.sin(end);
				var x4 = cx + r * Math.cos(ang), y4 = cy + r * Math.sin(ang);
				path += '<path d="M' + fmt(x1, 2) + ' ' + fmt(y1, 2) +
					' A' + R + ' ' + R + ' 0 ' + big + ' 1 ' + fmt(x2, 2) + ' ' + fmt(y2, 2) +
					' L' + fmt(x3, 2) + ' ' + fmt(y3, 2) +
					' A' + r + ' ' + r + ' 0 ' + big + ' 0 ' + fmt(x4, 2) + ' ' + fmt(y4, 2) +
					' Z" fill="' + s.color + '"/>';
				ang = end;
			});
		}
		var legend = '<div class="pr-legend"><div class="pr-lt">' + esc(title) + '</div>' +
			slices.map(function (s) {
				return '<div class="pr-li"><span class="pr-sw" style="background:' + s.color + '"></span>' + esc(s.label) + '</div>';
			}).join('') + '</div>';
		return '<div class="pr-chart"><svg viewBox="0 0 180 180" style="max-width:190px">' + path + '</svg>' + legend + '</div>';
	}

	// ---- 7. Board drawing ------------------------------------------------
	function boardSvg(p) {
		var L = p.boardL, W = p.boardW, lay = p.layout;
		var pad = 4;
		var svg = '<svg viewBox="' + (-pad) + ' ' + (-pad) + ' ' + (L + pad * 2) + ' ' + (W + pad * 2) + '">' +
			'<defs>' +
			'<pattern id="pr-h-waste" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
				'<rect width="34" height="34" fill="' + F_WASTE + '"/>' +
				'<line x1="0" y1="0" x2="0" y2="34" stroke="' + F_WASTE_LINE + '" stroke-width="7"/></pattern>' +
			'<pattern id="pr-h-trim" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
				'<rect width="22" height="22" fill="' + F_TRIM + '"/>' +
				'<line x1="0" y1="0" x2="0" y2="22" stroke="' + F_TRIM_LINE + '" stroke-width="6"/></pattern>' +
			'</defs>';

		// SVG y grows downward; board y grows upward from the bottom edge.
		function top(r) { return W - r.y - r.W; }

		lay.rects.forEach(function (r) {
			if (r.type === 'item') return;
			var fill = r.type === 'waste' ? 'url(#pr-h-waste)' : 'url(#pr-h-trim)';
			svg += '<rect x="' + r.x + '" y="' + top(r) + '" width="' + r.L + '" height="' + r.W +
				'" fill="' + fill + '" stroke="#b8b8b8" stroke-width="1.5"/>';
			// Every offcut is labelled with its own length x width, because an
			// unlabelled red block tells the saw operator nothing about whether
			// it's worth keeping. Sized off the block itself so it scales with
			// zoom and stays inside its own rectangle.
			if (r.type !== 'waste') return;
			var fs = Math.min(r.L, r.W) * 0.26;
			fs = Math.max(14, Math.min(fs, 46));
			// Skip when the block is too thin to hold its own label legibly.
			if (r.L < fs * 4.2 || r.W < fs * 1.5) return;
			svg += '<text x="' + (r.x + r.L / 2) + '" y="' + (top(r) + r.W / 2 + fs * 0.35) +
				'" font-size="' + fmt(fs, 1) + '" text-anchor="middle" fill="#7a2323" ' +
				'font-family="Arial" font-weight="600">' +
				fmt(r.L, 0) + ' \u00d7 ' + fmt(r.W, 0) + '</text>';
		});

		lay.rects.forEach(function (r) {
			if (r.type !== 'item') return;
			var y = top(r);
			svg += '<rect x="' + r.x + '" y="' + y + '" width="' + r.L + '" height="' + r.W +
				'" fill="' + F_PANEL + '" stroke="' + F_PANEL_EDGE + '" stroke-width="4"/>';
			var cx = r.x + r.L / 2, cy = y + r.W / 2;
			var fs = Math.max(20, Math.min(r.L, r.W) * 0.11);
			if (p.hasGrain) {
				// Grain runs along the panel's length, which is horizontal
				// unless the piece was rotated (only possible without grain).
				var half = Math.min(r.L * 0.3, 150);
				var ay = cy - fs * 0.75;
				svg += '<text x="' + cx + '" y="' + (cy - fs * 1.7) + '" font-size="' + fs +
					'" text-anchor="middle" fill="#16202b" font-family="Arial">grain</text>' +
					'<line x1="' + (cx - half) + '" y1="' + ay + '" x2="' + (cx + half) + '" y2="' + ay +
					'" stroke="#16202b" stroke-width="3"/>' +
					'<path d="M' + (cx - half) + ' ' + ay + ' l14 -7 v14 z" fill="#16202b"/>' +
					'<path d="M' + (cx + half) + ' ' + ay + ' l-14 -7 v14 z" fill="#16202b"/>';
			}
			svg += '<text x="' + cx + '" y="' + (cy + fs * 0.95) + '" font-size="' + fs +
				'" text-anchor="middle" fill="#16202b" font-family="Arial">' + esc(r.label) + '</text>';
			svg += '<text x="' + cx + '" y="' + (y + r.W - fs * 0.5) + '" font-size="' + (fs * 0.85) +
				'" text-anchor="middle" fill="#16202b" font-family="Arial">' + fmt(r.L, 0) + '</text>';
			svg += '<text x="' + (r.x + r.L - fs * 0.5) + '" y="' + cy + '" font-size="' + (fs * 0.85) +
				'" text-anchor="middle" fill="#16202b" font-family="Arial" transform="rotate(-90 ' +
				(r.x + r.L - fs * 0.5) + ' ' + cy + ')">' + fmt(r.W, 0) + '</text>';
		});

		svg += '<rect x="0" y="0" width="' + L + '" height="' + W + '" fill="none" stroke="#6b6b6b" stroke-width="3"/></svg>';
		return svg;
	}

	// ---- 8. Page ---------------------------------------------------------
	function card(label, value) {
		// The value is what's being read off the card, so it carries the weight.
		return '<div class="pr-card"><b>' + esc(label) + '</b> ' +
			(value === '' ? '' : '<span class="pr-cv">' + esc(value) + '</span>') + '</div>';
	}

	function render(app, data) {
		var st = UI.detail;
		var built = buildPatterns(data);
		var pats = built.patterns;
		if (!pats.length) {
			app.innerHTML = '<div class="pr-empty"><h3>Nothing to nest</h3>' +
				'<p>This project has no saw-cut panels. Weldment and profile cuts are listed on the Weldments page.</p></div>';
			return;
		}

		var T = { panels: 0, waste: 0, trims: 0, cuts: 0, total: 0, nP: 0, nW: 0, nT: 0, boards: 0 };
		pats.forEach(function (p) {
			var q = p.quantity, l = p.layout;
			T.panels += l.areaPanels * q; T.waste += l.areaWaste * q;
			T.trims += l.areaTrims * q; T.cuts += l.areaCuts * q;
			T.total += l.areaTotal * q;
			T.nP += l.nPanels * q; T.nW += l.nWaste * q; T.nT += l.nTrims * q;
			T.boards += q;
		});
		var M2 = 1e6;
		function areaCard(label, mm2) {
			return card(label, fmt(mm2 / M2, 2) + ' m\u00b2 (' + fmt(T.total ? mm2 * 100 / T.total : 0, 0) + '%)');
		}

		// Totals summarise the whole project and stay put while searching -
		// filtering the sheet list shouldn't silently restate the job's totals.
		// Frame/category labels for each sheet, same rules as the table page.
		var materialsIdx = indexBy(data.materials, 'ID');
		pats.forEach(function (p) {
			var mv = vars(materialsIdx[p.materialId] || {});
			p.category = mv.CATEGORY || '';
			var seen = {}, list = [];
			p.layout.rects.forEach(function (r) {
				if (r.type !== 'item' || !r.piece) return;
				var f = r.piece.frame || 'No Parent';
				if (!seen[f]) { seen[f] = 1; list.push(f); }
			});
			p.frameLabel = list.length === 0 ? 'No Parent'
				: list.length === 1 ? list[0]
					: 'Multiple (' + list.length + ')';
		});

		var shown = pats.filter(function (p) {
			return matches(st.q, [p.name, p.material, p.category, p.frameLabel,
				p.layout.nPanels, p.quantity]);
		});
		if (st.split !== 'none') {
			var keyOf = st.split === 'material'
				? function (p) { return p.material || '*'; }
				: st.split === 'category'
					? function (p) { return p.category || '*'; }
					: function (p) { return p.frameLabel || 'No Parent'; };
			shown = shown.slice().sort(function (a, b) {
				var ka = keyOf(a), kb = keyOf(b);
				return ka < kb ? -1 : ka > kb ? 1 : 0;
			});
		}

		// In All view the totals block is dropped: it is a third of the page,
		// and the point of the view is seeing every sheet at once.
		var summaryBlock = (st.perPage === 'all') ? '' :
			'<div class="pr-panel">' +
				'<div class="pr-cards">' +
					card('Total Panels:', T.nP) +
					areaCard('Panels Area:', T.panels) +
					areaCard('Waste Area:', T.waste) +
					areaCard('Trim Area:', T.trims) +
					// Yield/wastage stated outright rather than left to be
					// worked out from the area figures.
					card('Wastage:', fmt(T.total ? T.waste * 100 / T.total : 0, 1) + '%') +
					card('Boards:', T.boards) +
				'</div>' +
				donut('Quantities', [
					{ label: 'panels', value: T.nP, color: C_PANEL },
					{ label: 'waste', value: T.nW, color: C_WASTE },
					{ label: 'trims', value: T.nT, color: C_TRIM },
				]) +
				donut('Area Usage', [
					{ label: 'panels', value: T.panels, color: C_PANEL },
					{ label: 'waste', value: T.waste, color: C_WASTE },
					{ label: 'trims', value: T.trims, color: C_TRIM },
					{ label: 'cuts', value: T.cuts, color: C_CUTS },
				]) +
			'</div>';

		var html =
			'<h1 class="MuiTypography-root MuiTypography-h1">List of Nested Patterns</h1>' +
			toolbar(st, [
				{ key: 'category', label: 'Category' },
				{ key: 'material', label: 'Material' },
				{ key: 'frame', label: 'Frame' },
			], { zoom: true, saw: built.saw }) +
			summaryBlock;

		// Below 100% the sheets tile so a whole job fits the page; at or above
		// it they stay one per row and the block is magnified as a unit.
		var cols, sheetStyle = '', fitAttr = '';
		if (st.perPage === 'all') {
			// Roughly square grid, so tiles stay as large as possible while
			// every sheet still lands on the one screen.
			cols = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(shown.length))));
			fitAttr = ' data-fit="1"';
		} else {
			cols = st.perPage;
		}
		// Magnification widens the whole block, so every sheet grows by the
		// same factor and one scrollbar moves them together.
		if (st.zoom > 1) sheetStyle = ' style="width:' + fmt(100 * st.zoom, 4) + '%;"';
		html += '<div class="pr-sheets-wrap"><div class="pr-sheets" data-cols="' + cols + '"' +
			fitAttr + sheetStyle + '>';

		shown.forEach(function (p) {
			var l = p.layout;
			var wastePc = l.areaTotal ? l.areaWaste * 100 / l.areaTotal : 0;
			html += '<div class="pr-panel' + (st.zoom > 1 ? ' pr-wide' : '') + '">' +
				// Shown only when tiled; the full card stack is hidden by CSS
				// at that size so the numbers stay available without cost.
				'<div class="pr-tile-head"><b>' + esc(p.name) + '</b> \u00b7 ' + esc(p.material) +
					' \u00b7 <span class="pr-cv">' + p.quantity + '</span> board' + (p.quantity === 1 ? '' : 's') +
					' \u00b7 <span class="pr-cv">' + l.nPanels + '</span> panels' +
					' \u00b7 waste <span class="pr-cv">' + fmt(wastePc, 1) + '%</span></div>' +
				'<div class="pr-cards">' +
					card('Pattern:', p.name.replace(/^Pattern\s*/, '')) +
					card('Material:', p.material) +
					card('# No of Boards:', p.quantity) +
					card('# Panels:', l.nPanels) +
					card('# Trims:', l.nTrims) +
					card('# Waste:', l.nWaste) +
					card('Frame:', p.frameLabel) +
					card('Wastage:', fmt(wastePc, 1) + '%') +
				'</div>' +
				'<div class="pr-board">' + boardSvg(p) + '</div>' +
			'</div>';
		});
		html += '</div></div>';

		if (!shown.length) {
			html += '<div class="pr-empty"><h3>No patterns match</h3>' +
				'<p>Clear the search to see every sheet.</p></div>';
		}

		if (built.unplaced.length) {
			html += '<div class="pr-empty"><h3>Not placed</h3><p>' +
				esc(built.unplaced.join('; ')) + '</p></div>';
		}

		app.innerHTML = html;
		// The first zoom step spends itself on the layout: the cards move above
		// the sheet, so the drawing takes the full page width and the complete
		// plate is visibly larger with nothing clipped. Only past that does the
		// SVG scale beyond its container, where sideways scrolling is the
		// point - inspecting one corner of the board.
		// The tile height can only be worked out once the grid is laid out, so
		// it is measured here and fed back as a CSS variable. Without it the
		// sheets fit across the page but still run off the bottom.
		if (st.perPage === 'all') {
			var sheetsEl = app.querySelector('.pr-sheets');
			var overlay = document.getElementById(OVERLAY_ID);
			if (sheetsEl && overlay && shown.length) {
				// Measure against the overlay, not the content element: the
				// overlay is the fixed viewport, while the content grows with
				// its own children and would always look tall enough.
				var rows = Math.ceil(shown.length / cols);
				var viewportBottom = overlay.getBoundingClientRect().bottom;
				var gridTop = sheetsEl.getBoundingClientRect().top;
				var avail = viewportBottom - gridTop - 20;
				var perTile = (avail - (rows - 1) * 16) / rows - 40;
				sheetsEl.style.setProperty('--pr-tileh', Math.max(40, perTile) + 'px');

				// Header text, padding and borders don't scale with the tile
				// height, so a single calculation can still overshoot. Measure
				// the laid-out result once and shrink to fit if it does.
				var over = sheetsEl.getBoundingClientRect().bottom - viewportBottom + 12;
				if (over > 0) {
					var shrunk = Math.max(40, perTile - (over / rows));
					sheetsEl.style.setProperty('--pr-tileh', shrunk + 'px');
				}
			}
		}
		bindBar(app, st);
	}

	// ---- 8b. Summary page ------------------------------------------------
	// The Summary's Boards row is built by the app from costing.articles where
	// type === "CUTTINGPATTERN_BOARD", and the app multiplies quantities by
	// projectQuantity, which it reads from swcps["Project Quantity"] (default
	// 1). For everything that scales linearly - edgeband metres, stock area,
	// profile lengths - that is right. Boards do not scale linearly: ten
	// panels share boards, they don't each need their own. So this rebuilds
	// the page with every other line multiplied exactly as the app does, and
	// the board line taken from the real nest instead.
	function projectQuantity(data) {
		var q = 1;
		(data.swcps || []).forEach(function (c) {
			if (c.name === 'Project Quantity') {
				var n = parseFloat(c.value);
				if (n > 0) q = n;
			}
		});
		return q;
	}

	// Aggregates costing articles of one type by display name, the way the
	// Summary's material tables group them.
	function aggregate(articles, type, nameOf) {
		var out = [], byName = {};
		(articles || []).forEach(function (a) {
			if (a.type !== type) return;
			var nm = nameOf ? nameOf(a) : a.name;
			if (!byName[nm]) {
				byName[nm] = { name: nm, quantity: 0, cost: 0, unit: a.quantityUnit || '', unitCost: a.unitCost || 0 };
				out.push(byName[nm]);
			}
			byName[nm].quantity += a.quantity || 0;
			byName[nm].cost += a.cost || 0;
		});
		return out;
	}

	// Edgeband articles are named "Edgeband1 [ Red-2mm ]"; the Summary groups
	// them by the material in the brackets.
	function edgebandMaterialName(a) {
		var m = /\[\s*(.+?)\s*\]/.exec(a.name || '');
		return m ? m[1] : (a.name || '');
	}

	function summaryModel(data, patterns) {
		var pq = projectQuantity(data);
		var articles = (data.costing && data.costing.articles) || [];
		var materials = indexBy(data.materials, 'ID');

		// Boards: quantity comes from the nest, not from costing x pq - this is
		// the one number this whole file exists to correct. Everything else on
		// this page is read straight from the report's own costing.articles and
		// scaled by Project Quantity exactly as the app itself does it
		// (confirmed against the app bundle's getProjectQuantity()), because
		// those figures were already correct.
		// Board unit cost is per material, not global. Assem1 proves why: its
		// MDF 16 board costs 0 while GENERIC 06/19 cost 900, and GENERIC 16 has
		// no CUTTINGPATTERN_BOARD article at all because SWOOD's own pattern
		// never nested it. Taking the first article's unitCost for everything
		// overcharged MDF 16 and GENERIC 16 by 900 a board.
		//
		// Articles are named "<material> (WIDTHxLENGTH)", so index them on the
		// part before that suffix. A material with no article bills at 0, which
		// is what the native Summary shows for a zero-cost board.
		var boardCostByMaterial = {};
		articles.forEach(function (a) {
			if (a.type !== 'CUTTINGPATTERN_BOARD') return;
			var base = String(a.name || '').replace(/\s*\([^)]*\)\s*$/, '');
			if (base) boardCostByMaterial[base] = a.unitCost || 0;
		});

		var boards = [];
		var byBoard = {};
		patterns.forEach(function (p) {
			var mv = vars(materials[p.materialId] || {});
			var nm = (p.material || '') + ' (' + fmt(p.boardW, 0) + 'x' + fmt(p.boardL, 0) + ')';
			if (!byBoard[nm]) {
				var uc = boardCostByMaterial[p.material];
				var areaEach = (p.boardL * p.boardW) / 1e6;   // m2 per board
				byBoard[nm] = {
					name: nm,
					description: mv.MAT_DESC || '',
					thickness: mv.MAT_T || '',
					quantity: 0,
					areaEach: areaEach,
					// Seeded from the project's per-board price, restated per
					// m2 so it can be quoted per unit area like sheet goods are.
					unitCost: areaEach ? ((uc === undefined ? 0 : uc) / areaEach) : 0,
				};
				boards.push(byBoard[nm]);
			}
			byBoard[nm].quantity += p.quantity;
		});
		// Board cost is boards x area x per-area rate, so the rate reads the way
		// sheet goods are quoted.
		boards.forEach(function (b) { b.cost = b.quantity * b.areaEach * b.unitCost; });

		function scaled(rows) {
			return rows.map(function (r) {
				var mv = vars(materials[r.name] || {});
				var qty = r.quantity * pq;
				return {
					name: r.name,
					description: mv.MAT_DESC || '',
					thickness: mv.MAT_T || '',
					quantity: qty,
					unit: r.unit,
					unitCost: r.unitCost,
					cost: qty * r.unitCost,
				};
			});
		}

		var stock = aggregate(articles, 'STOCK');
		var panelStock = [], weldStock = [];
		scaled(stock).forEach(function (r) {
			var mv = vars(materials[r.name] || {});
			(mv.WELDMENT === 'True' ? weldStock : panelStock).push(r);
		});

		// Laminates share the STOCK/material shape but a separate costing type.
		var laminates = scaled(aggregate(articles, 'LAMINATE'));

		var ebByCode = {};
		(data.edgebandMaterials || []).forEach(function (m) {
			var mv = vars(m);
			if (mv.EBMAT_C) ebByCode[mv.EBMAT_C] = mv;
		});
		var edge = aggregate(articles, 'EDGEBAND', edgebandMaterialName).map(function (r) {
			var mv = ebByCode[r.name] || {};
			var qty = r.quantity * pq;
			return {
				name: r.name, description: mv.EBMAT_D || '', thickness: mv.EBMAT_T || '',
				quantity: qty, unit: r.unit, unitCost: r.unitCost,
				cost: qty * r.unitCost,
			};
		});

		// ---- Hardware and Panel Process --------------------------------
		// Neither Assem2 nor Assem1's sample carries hardware or panel-process
		// data, so these two are implemented from the view-settings.js schema
		// alone and were never checked against a real populated table. They are
		// wrapped so a wrong field-name guess here can only make its own
		// section disappear, never take down Boards/Materials/Edgebands/
		// Weldments/Laminates, which are verified.
		// ---- Hardware ---------------------------------------------------
		// There is no top-level `hardware` array. SWOOD marks hardware by
		// TOTYPE === 'HARDWARE' on ordinary part and assembly records - a
		// single dowel is a part, a hinge assembly is an assembly - so both
		// collections are scanned. Verified against Assem1: NB 50/7/18/6/6 at
		// Project Quantity 30 gives 1500/210/540/180/180, total 2610, which is
		// exactly what the native Hardware table shows.
		var hardware = [];
		try {
			var hwRollup = {};
			[].concat(data.parts || [], data.assemblies || []).forEach(function (o) {
				var v = vars(o);
				if (v.TOTYPE !== 'HARDWARE') return;
				var name = v.NAME || '';
				if (!name) return;
				var cps = {};
				(o.swcps || []).forEach(function (c) { cps[c.name] = c.value; });
				// CONF holds the SolidWorks configuration, written in the
				// install language; the report shows the default in English.
				var conf = v.CONF || '';
				if (conf === 'D\u00e9faut' || conf === 'Defaut') conf = 'Default';
				var unitCost = parseFloat(cps.Cost) || parseFloat(v.TO_UCOST) || 0;
				var key = name + '|' + conf;
				if (!hwRollup[key]) {
					hwRollup[key] = {
						name: name, configuration: conf,
						reference: cps.Reference || cps.Supplier_Reference || '',
						quantity: 0, unitCost: unitCost, cost: 0,
					};
					hardware.push(hwRollup[key]);
				}
				var q = (parseFloat(v.NB) || 0) * pq;
				hwRollup[key].quantity += q;
				hwRollup[key].cost += q * unitCost;
			});
		} catch (e) { console.error('hardware section skipped:', e); hardware = []; }

		// ---- Panel Process ---------------------------------------------
		// Field aliases below are taken from this report's own
		// variableDefinitions.processZones / .panelProcesses, which SWOOD emits
		// even when the arrays are empty:
		//   processZones   PROC_GUID, PROC_ZONE_QTT, PROC_ZONE_QTT_UNIT,
		//                  PROC_ZONE_COST, PROC_ZONENAME, PROC_ZONEMASK
		//   panelProcesses PROC_NAME, PROC_DESC, PROC_CAT, PROC_UCOST,
		//                  PROC_COSTTYPE, PROC_THICKNESS
		// A zone points at its process through PROC_GUID. The Summary rolls the
		// zones up by process name, matching the native page's groupBy - the
		// per-part breakdown lives on the dedicated Panel Process page.
		var panelProcess = [];
		try {
			var procByKey = {};
			(data.panelProcesses || []).forEach(function (pp) {
				var pv = vars(pp);
				// Index on every plausible handle so the zone's PROC_GUID
				// resolves whichever one SWOOD used as the record key.
				[pp.ID, pp.GUID, pv.PROC_GUID].forEach(function (k) {
					if (k) procByKey[k] = pv;
				});
			});
			var rollup = {};
			(data.processZones || []).forEach(function (z) {
				var zv = vars(z);
				var pv = procByKey[zv.PROC_GUID] || procByKey[z.panelProcess] || {};
				var name = pv.PROC_NAME || '';
				if (!name) return;
				var unitCost = parseFloat(pv.PROC_UCOST) || 0;
				var qty = parseFloat(zv.PROC_ZONE_QTT) || 0;
				var cost = parseFloat(zv.PROC_ZONE_COST);
				if (isNaN(cost)) cost = qty * unitCost;
				var key = name + '|' + unitCost;
				if (!rollup[key]) {
					rollup[key] = {
						name: name, unitCost: unitCost, quantity: 0, cost: 0,
						unit: zv.PROC_ZONE_QTT_UNIT || '',
					};
					panelProcess.push(rollup[key]);
				}
				rollup[key].quantity += qty * pq;
				rollup[key].cost = rollup[key].quantity * unitCost;
			});
		} catch (e) { console.error('panel process section skipped:', e); panelProcess = []; }

		var total = 0;
		[boards, panelStock, laminates, edge, weldStock, hardware, panelProcess].forEach(function (g) {
			g.forEach(function (r) { total += r.cost; });
		});

		return {
			pq: pq, boards: boards, materials: panelStock, laminates: laminates,
			edgebands: edge, weldments: weldStock, hardware: hardware, panelProcess: panelProcess,
			total: total,
		};
	}

	function money(v, dp) {
		return '\u20b9' + fmt(v, dp == null ? 2 : dp).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	}

	// A converted rate is a derived figure, not a catalogue price: dividing a
	// cost by a square-foot quantity routinely lands below a rupee, where two
	// decimals would round it into something that no longer reconciles with the
	// cost beside it. Small rates therefore keep three decimals.
	function rateText(v, unit) {
		return money(v, Math.abs(v) < 100 ? 3 : 2) + (unit ? ' /' + unit : '');
	}

	// Each table reports the total it actually charged, so the Total Cost card
	// reflects edited rates instead of the project's original figures.
	var SUM_ACC = [];

	function summaryTable(title, rows, opts) {
		if (!rows.length) return '';
		var section = opts.section || title;
		var showThk = opts.thickness !== false;
		var areaUnit = UNITS.imperial ? 'ft\u00b2' : 'm\u00b2';
		// Boards gain an Area column so the per-area rate beside it reads at a
		// glance: 32.04 ft2 a board at Rs.120 is Rs.3,845.
		var head = ['Material', 'Description'].concat(showThk ? ['Thickness'] : [])
			.concat(opts.area ? ['Area each'] : [])
			.concat(['Quantity', 'Unit Cost', 'Cost']);
		var rowCosts = [];
		var body = rows.map(function (r, i) {
			var cq = convertQty(r.quantity, r.unit);
			var q = opts.unitInQty ? fmt(cq.value, 3) + ' ' + (cq.unit || '') : fmt(r.quantity, 0);
			// Cost tracks an edited rate. Untouched rows keep the project's own
			// cost, because some source rows are not exactly quantity x rate
			// and silently recomputing them would change figures nobody asked
			// to change.
			var k = rateKey(section, r.name);
			// Boards cost quantity x area x rate; everything else quantity x rate.
			var mult = opts.area ? r.quantity * (r.areaEach || 0) : r.quantity;
			var cost = (k in RATES) ? mult * RATES[k] : r.cost;
			rowCosts.push(cost);
			var areaCell = opts.area
				? fmt(convertQty(r.areaEach || 0, 'm2').value, 2) + ' ' + areaUnit
				: null;
			var cells = [esc(r.name), esc(r.description)]
				.concat(showThk ? [esc(r.thickness)] : [])
				.concat(areaCell === null ? [] : [areaCell])
				.concat([q, rateCell(section, r.name, r.unitCost, opts.rateUnit || r.unit), money(cost)]);
			return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
				return '<td class="' + (ci >= head.length - 3 ? 'pr-num' : '') + '">' + c + '</td>';
			}).join('') + '</tr>';
		}).join('');
		var sum = rowCosts.reduce(function (a, c) { return a + c; }, 0);
		SUM_ACC.push(sum);
		var foot = '<tr class="pr-tot">' + head.map(function (_, ci) {
			return '<td class="' + (ci >= head.length - 3 ? 'pr-num' : '') + '">' +
				(ci === head.length - 1 ? money(sum) : '') + '</td>';
		}).join('') + '</tr>';
		var bar = tableTitleBar(title, rows.length + ' item' + (rows.length === 1 ? '' : 's'));
		return '<div class="pr-tbl-shell">' + bar.html +
			'<table class="pr-tbl"><thead><tr>' +
			head.map(function (h, ci) {
				return '<th class="' + (ci >= head.length - 3 ? 'pr-num' : '') + '">' + esc(h) + '</th>';
			}).join('') + '</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>';
	}

	// Hardware's column set (Name, Configuration, Reference, Quantity, Unit
	// Cost, Cost) doesn't match summaryTable's material-row shape, so it gets
	// its own small renderer rather than overloading that one.
	function summaryHardwareTable(rows) {
		if (!rows.length) return '';
		var head = ['Name', 'Configuration', 'Reference', 'Quantity', 'Unit Cost', 'Cost'];
		var body = rows.map(function (r, i) {
			var cells = [esc(r.name), esc(r.configuration), esc(r.reference),
				fmt(r.quantity, 0), money(r.unitCost), money(r.cost)];
			return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
				return '<td class="' + (ci >= 3 ? 'pr-num' : '') + '">' + c + '</td>';
			}).join('') + '</tr>';
		}).join('');
		var sum = rows.reduce(function (a, r) { return a + r.cost; }, 0);
		SUM_ACC.push(sum);
		var foot = '<tr class="pr-tot">' + head.map(function (_, ci) {
			return '<td class="' + (ci >= 3 ? 'pr-num' : '') + '">' + (ci === head.length - 1 ? money(sum) : '') + '</td>';
		}).join('') + '</tr>';
		return '<div class="pr-tbl-shell"><div class="pr-tbl-title">Hardware</div>' +
			'<table class="pr-tbl"><thead><tr>' +
			head.map(function (h, ci) { return '<th class="' + (ci >= 3 ? 'pr-num' : '') + '">' + esc(h) + '</th>'; }).join('') +
			'</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>';
	}

	// Panel Process is a rollup by process name, matching the Summary page's
	// own grouping (Name, Quantity, Unit Cost, Cost) - not the per-part detail
	// seen on the dedicated Panel Process page.
	function summaryProcessTable(rows) {
		if (!rows.length) return '';
		var head = ['Name', 'Quantity', 'Unit Cost', 'Cost'];
		var body = rows.map(function (r, i) {
			var cells = [esc(r.name), fmt(r.quantity, 2) + (r.unit ? ' ' + esc(r.unit) : ''),
				money(r.unitCost), money(r.cost)];
			return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
				return '<td class="' + (ci >= 1 ? 'pr-num' : '') + '">' + c + '</td>';
			}).join('') + '</tr>';
		}).join('');
		var sum = rows.reduce(function (a, r) { return a + r.cost; }, 0);
		SUM_ACC.push(sum);
		var foot = '<tr class="pr-tot">' + head.map(function (_, ci) {
			return '<td class="' + (ci >= 1 ? 'pr-num' : '') + '">' + (ci === head.length - 1 ? money(sum) : '') + '</td>';
		}).join('') + '</tr>';
		return '<div class="pr-tbl-shell"><div class="pr-tbl-title">Panel Process</div>' +
			'<table class="pr-tbl"><thead><tr>' +
			head.map(function (h, ci) { return '<th class="' + (ci >= 1 ? 'pr-num' : '') + '">' + esc(h) + '</th>'; }).join('') +
			'</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>';
	}

	// ---- Per-frame cost attribution --------------------------------------
	// Splits factory cost by frame (cabinet/assembly) using the same
	// parent-assembly walk that already groups Patterns and Patterned Panels
	// by Frame - nothing new to trust, just re-summed per frame instead of
	// per material. For each frame:
	//   board = each of its panels' own area x that material's per-area
	//           board rate (RATES override honoured, else the Boards table's
	//           own rate)
	//   edge  = each panel's own edgeband lengths x their rates
	//   proc  = each panel's own finishing-zone area x the process rate
	//   hw    = each hardware item's own quantity x its rate
	//
	// What this deliberately leaves out: the Materials, Laminates and
	// Weldments sections aren't attributed per panel (their own meaning
	// doesn't map to "this panel used this much"), so a frame's total here is
	// Boards + Edgebands + Panel Process + Hardware only - it will not equal
	// that frame's share of the full Factory total shown elsewhere on this
	// page, and callers should say so rather than imply otherwise.
	//
	// The gap this closes: summing only "each panel's own area" undercounts,
	// because a board's waste and trim belong to no single panel. The
	// shortfall (boardsFullTotal - boardOwnTotal) is spread across frames in
	// proportion to each frame's own board usage, so the returned frame list
	// always sums to exactly boardsFullTotal + edge + proc + hw - nothing
	// left unexplained.
	function computeFrameCosts(data, patterns, m) {
		var pq = projectQuantity(data);
		var frameOf = frameNameByPanel(data);
		var panelRows = collectPanels(data);
		var materials = indexBy(data.materials, 'ID');

		function effRate(section, name, base) {
			var k = rateKey(section, name);
			return (k in RATES) ? RATES[k] : base;
		}

		var boardsByName = {};
		(m.boards || []).forEach(function (b) { boardsByName[b.name] = b; });
		function boardRateFor(materialName, boardL, boardW) {
			var nm = materialName + ' (' + fmt(boardW, 0) + 'x' + fmt(boardL, 0) + ')';
			var row = boardsByName[nm];
			return effRate('Boards', nm, row ? row.unitCost : 0);
		}

		var frames = {};
		function add(name, bucket, amt) {
			name = name || '(unassigned)';
			if (!frames[name]) frames[name] = { board: 0, edge: 0, proc: 0, hw: 0 };
			frames[name][bucket] += amt;
		}

		panelRows.forEach(function (p) {
			var frame = frameOf[p.panelGuid] || '';
			var rate = boardRateFor(p.material, p.boardL, p.boardW);
			var areaM2 = (p.L * p.W) / 1e6;
			add(frame, 'board', areaM2 * rate * p.qty);
		});

		var edgebandsIdx = indexBy(data.edgebands, 'ID');
		var edgebandMaterialsIdx = indexBy(data.edgebandMaterials, 'ID');
		var edgeByName = {};
		(m.edgebands || []).forEach(function (e) { edgeByName[e.name] = e; });
		var partByPanel = {};
		(data.parts || []).forEach(function (x) { if (x && x.panel) partByPanel[x.panel] = x; });
		(data.panels || []).forEach(function (pan) {
			var frame = frameOf[pan.ID] || '';
			var part = partByPanel[pan.ID];
			var nb = part ? (parseFloat(vars(part).NB) || 1) : 1;
			(pan.edgebands || []).forEach(function (id) {
				var eb = edgebandsIdx[id];
				if (!eb) return;
				var ev = vars(eb);
				var code = vars(edgebandMaterialsIdx[eb.edgebandMaterial] || {}).EBMAT_C || '';
				var row = edgeByName[code];
				var rate = effRate('Edgebands', code, row ? row.unitCost : 0);
				var lenM = (parseFloat(ev.EB_L) || 0) / 1000;
				add(frame, 'edge', lenM * rate * nb * pq);
			});
		});

		var procIdx = indexBy(data.panelProcesses, 'ID');
		(data.processZones || []).forEach(function (z) {
			var frame = frameOf[z.panel] || '';
			var zv = vars(z);
			var pv = vars(procIdx[z.panelProcess] || procIdx[zv.PROC_GUID] || {});
			var name = pv.PROC_NAME || '';
			var rate = effRate('PanelProcess', name, parseFloat(pv.PROC_UCOST) || 0);
			var qty = (parseFloat(zv.PROC_ZONE_QTT) || 0) * pq;
			add(frame, 'proc', qty * rate);
		});

		var hwByName = {};
		(m.hardware || []).forEach(function (h) { if (!(h.name in hwByName)) hwByName[h.name] = h; });
		[].concat(data.parts || [], data.assemblies || []).forEach(function (o) {
			var v = vars(o);
			if (v.TOTYPE !== 'HARDWARE') return;
			var frame = frameOf[o.ID] || '';
			var row = hwByName[v.NAME || ''];
			var rate = row ? row.unitCost : 0;
			var qty = (parseFloat(v.NB) || 0) * pq;
			add(frame, 'hw', qty * rate);
		});

		var boardOwnTotal = 0;
		Object.keys(frames).forEach(function (f) { boardOwnTotal += frames[f].board; });
		var boardsFullTotal = (m.boards || []).reduce(function (a, b) { return a + b.cost; }, 0);
		var waste = Math.max(0, boardsFullTotal - boardOwnTotal);

		var list = Object.keys(frames).map(function (f) {
			var c = frames[f];
			var wasteShare = boardOwnTotal ? waste * (c.board / boardOwnTotal) : 0;
			var total = c.board + c.edge + c.proc + c.hw + wasteShare;
			return {
				name: f, board: c.board, edge: c.edge, proc: c.proc, hw: c.hw,
				waste: wasteShare, total: total,
			};
		}).filter(function (r) { return r.name !== '(unassigned)' || r.total > 0.005; });
		list.sort(function (a, b) { return b.total - a.total; });

		var projectTotal = list.reduce(function (a, r) { return a + r.total; }, 0);
		return {
			pq: pq, frames: list, waste: waste,
			boardOwnTotal: boardOwnTotal, boardsFullTotal: boardsFullTotal, projectTotal: projectTotal,
		};
	}

	// ---- Summary mode toolbar ---------------------------------------------
	function summaryModeBar(fc) {
		var st = UI.summary;
		var html = '<div class="pr-bar">' +
			'<div class="pr-perpage"><span class="pr-pl">View</span><div class="pr-split">' +
				'<button data-pr="summode" data-v="factory"' + (st.mode === 'factory' ? ' class="on"' : '') + '>Factory (internal)</button>' +
				'<button data-pr="summode" data-v="client"' + (st.mode === 'client' ? ' class="on"' : '') + '>Client (presentable)</button>' +
			'</div></div>';
		if (st.mode === 'client') {
			html += '<div class="pr-perpage"><span class="pr-pl">Layout</span><div class="pr-split">' +
				'<button data-pr="sumview" data-v="complete"' + (st.view === 'complete' ? ' class="on"' : '') + '>Complete Project</button>' +
				'<button data-pr="sumview" data-v="framewise"' + (st.view === 'framewise' ? ' class="on"' : '') + '>Frame-wise</button>' +
			'</div></div>';
		} else {
			html += '<div class="pr-perpage"><span class="pr-pl">Factory cost factor</span>' +
				'<input type="number" class="pr-factor" data-pr="factor" min="0" step="1" value="' + st.factor + '"> <span class="pr-pl">% markup</span></div>';
		}
		html += unitToggle();
		return html + '</div>';
	}

	function bindSummaryBar(app, renderFn, data) {
		bindCommon(app);
		var st = UI.summary;
		app.querySelectorAll('[data-pr="summode"]').forEach(function (b) {
			b.addEventListener('click', function () { st.mode = b.getAttribute('data-v'); renderFn(app, data); });
		});
		app.querySelectorAll('[data-pr="sumview"]').forEach(function (b) {
			b.addEventListener('click', function () { st.view = b.getAttribute('data-v'); renderFn(app, data); });
		});
		var f = app.querySelector('[data-pr="factor"]');
		if (f) f.addEventListener('change', function () {
			var n = parseFloat(f.value);
			st.factor = (isNaN(n) || n < 0) ? 0 : n;
			renderFn(app, data);
		});
	}

	// A dedicated line for the manufacturing side: total cutting waste/trim
	// cost, sitting on boards but owned by no single panel. Shown only in
	// Factory view - a client never needs to see how much material was lost
	// to offcuts, but the factory needs to see it to price and improve on it.
	function factoryWasteCard(fc) {
		if (!fc.boardsFullTotal) return '';
		var pc = fc.boardsFullTotal ? (fc.waste * 100 / fc.boardsFullTotal) : 0;
		return '<div class="pr-card"><b>Cutting Waste / Trim:</b> <span class="pr-cv">' + money(fc.waste) +
			'</span> <span class="pr-pl">(' + fmt(pc, 1) + '% of board cost - included in the Boards total above, shown separately for reference)</span></div>';
	}

	// ---- Client: complete project ------------------------------------------
	// One quotation, grouped into categories a client reads (not material
	// codes), waste folded silently into the totals - nothing to explain.
	function renderClientComplete(app, data, fc) {
		var f = 1 + UI.summary.factor / 100;
		var boardTotal = 0, edgeTotal = 0, procTotal = 0, hwTotal = 0;
		fc.frames.forEach(function (r) {
			boardTotal += (r.board + r.waste) * f; edgeTotal += r.edge * f;
			procTotal += r.proc * f; hwTotal += r.hw * f;
		});
		var grand = boardTotal + edgeTotal + procTotal + hwTotal;
		var panelCount = collectPanels(data).reduce(function (a, p) { return a + p.qty; }, 0);

		function line(name, desc, qty, amt) {
			return '<tr><td><div class="item-name">' + esc(name) + '</div>' +
				(desc ? '<div class="item-desc">' + esc(desc) + '</div>' : '') + '</td>' +
				'<td class="num">' + esc(qty) + '</td><td class="num">' + money(amt) + '</td></tr>';
		}
		function sec(title, rows) {
			return '<div class="qsec"><h3>' + esc(title) + '</h3><table class="qtbl"><thead><tr><th>Description</th>' +
				'<th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
		}

		var body = sec('Panels & Boards', line('Engineered board panels', panelCount + ' panels cut to size, includes cutting allowance', panelCount + ' pcs', boardTotal)) +
			(edgeTotal > 0.005 ? sec('Edging & Finish', line('Edgebanding & finishing', 'Applied per project specification', '', edgeTotal + procTotal)) : '') +
			(hwTotal > 0.005 ? sec('Hardware', line('Hinges, runners & fixings', 'Assembly hardware', '', hwTotal)) : '');

		app.innerHTML =
			'<h1 class="MuiTypography-root MuiTypography-h1">Summary</h1>' +
			summaryModeBar(fc) +
			'<div class="quote"><div class="quote-body">' + body +
			'<div class="qsub">Subtotal <b>' + money(grand) + '</b></div></div>' +
			'<div class="quote-totals"><div><div class="qt-lbl">Total (incl. margin)</div>' +
			'<div class="qt-val">' + money(grand) + '</div></div>' +
			'<div class="qt-note">Prices in INR. Excludes applicable taxes unless stated.</div></div></div>';
		bindSummaryBar(app, renderSummary, data);
	}

	// ---- Client: frame-wise -------------------------------------------------
	// One row per frame/assembly, priced per unit and for the whole build
	// quantity, waste already folded into each row so nothing is left over.
	function renderClientFramewise(app, data, fc) {
		var f = 1 + UI.summary.factor / 100;
		var pq = fc.pq || 1;
		var grand = 0;
		var body = fc.frames.map(function (r) {
			var amt = r.total * f;
			grand += amt;
			return '<tr><td><div class="cab-name">' + esc(r.name) + '</div>' +
				'<div class="cab-desc">Assembly / frame</div></td>' +
				'<td class="num">' + pq + '</td>' +
				'<td class="num">' + money(amt / pq) + '<div class="unitprice">per unit</div></td>' +
				'<td class="num">' + money(amt) + '</td></tr>';
		}).join('');

		app.innerHTML =
			'<h1 class="MuiTypography-root MuiTypography-h1">Summary</h1>' +
			summaryModeBar(fc) +
			'<div class="fw-note">Each row is priced from its own boards, edgebanding, finishing and hardware ' +
				'at today\u2019s rates, including its fair share of cutting waste, so the rows add up to the exact ' +
				'total. Qty is how many complete builds this project is for; unit price is the cost of one.</div>' +
			'<table class="fwtbl"><thead><tr><th>Frame / Assembly</th><th class="num">Qty</th>' +
				'<th class="num">Unit Price</th><th class="num">Amount</th></tr></thead>' +
				'<tbody>' + body + '</tbody>' +
				'<tfoot><tr><td colspan="3">Total (incl. margin)</td><td class="num">' + money(grand) + '</td></tr></tfoot>' +
			'</table>';
		bindSummaryBar(app, renderSummary, data);
	}

	function renderSummary(app, data) {
		var built = buildPatterns(data);
		var m = summaryModel(data, built.patterns);
		var fc = computeFrameCosts(data, built.patterns, m);

		if (UI.summary.mode === 'client') {
			if (UI.summary.view === 'framewise' && fc.frames.length) renderClientFramewise(app, data, fc);
			else renderClientComplete(app, data, fc);
			return;
		}

		// Build the tables first: their sums include any edited rates, which
		// m.total (computed from the project's own figures) does not.
		SUM_ACC = [];
		var tables =
			summaryTable('Boards', m.boards, { unitInQty: false, section: 'Boards', area: true, rateUnit: 'm2' }) +
			summaryTable('Materials', m.materials, { unitInQty: true, section: 'Materials' }) +
			summaryTable('Laminates', m.laminates, { unitInQty: true, section: 'Laminates' }) +
			summaryTable('Edgebands', m.edgebands, { unitInQty: true, section: 'Edgebands' }) +
			summaryTable('Weldments', m.weldments, { unitInQty: true, thickness: false, section: 'Weldments' }) +
			summaryHardwareTable(m.hardware) +
			summaryProcessTable(m.panelProcess);
		var grand = SUM_ACC.reduce(function (a, v) { return a + v; }, 0);
		var totalLine = '<div class="pr-card pr-total"><b>Total Cost:</b> ' + money(grand) + '</div>';

		// Section set and order match view-settings.js 'summary' exactly:
		// Total Cost, Boards, Materials, Laminates, Edgebands, Weldments,
		// Hardware, Panel Process, Total Cost again. A section that has no
		// rows renders nothing, same as the native page.
		app.innerHTML =
			'<h1 class="MuiTypography-root MuiTypography-h1">Summary</h1>' +
			summaryModeBar(fc) +
			totalLine +
			factoryWasteCard(fc) +
			tables +
			totalLine;
		bindSummaryBar(app, renderSummary, data);
		bindExports(app);
		makeSortable(app);
	}

	// ---- 8d. /patterned-panels - one row per distinct panel -------------
	// Columns mirror view-settings.js 'patterned-panels' exactly: Panel-ID,
	// Part Name, Length, Width, Thickness, Material, Grain, Qty.
	//
	// Reuses collectPanels() unexpanded - one row per distinct panel type,
	// the same list the nest is built from - so this table, Cutrite Data, and
	// the nest can never disagree about which panels exist or how many.
	function renderPatternedPanels(app, data) {
		var st = UI.patterned;
		var panels = collectPanels(data).filter(function (p) {
			return matches(st.q, [p.panelId, p.name, p.materialName, p.frame,
				p.category, p.L, p.W, p.thickness, p.qty]);
		});

		var head = ['Panel-ID', 'Part Name', 'Length', 'Width', 'Thickness', 'Material', 'Grain', 'Qty'];
		function rowsHtml(list, offset) {
			return list.map(function (p, i) {
				// The app re-keys every record as "<id>-<instance>" when it builds
				// its business layer (main bundle: add(key + "-" + instance)),
				// so the raw GUID alone is rejected with "Unable to find item
				// with key ... in resource: panels". The native Stocks page
				// links to <guid>-0, and that is what resolves - verified
				// against this report.
				var nameCell = p.panelGuid
					? '<a class="pr-link" href="#/panels/' + esc(p.panelGuid) + PANEL_KEY_SUFFIX + '">' +
						esc(p.name) + '</a>'
					: esc(p.name);
				var cells = [esc(p.panelId), nameCell, fmt(p.L, 0), fmt(p.W, 0), fmt(p.thickness, 0),
					esc(p.materialName), p.hasGrain ? 'Yes' : 'No', String(p.qty)];
				return '<tr class="' + ((i + offset) % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
					return '<td class="' + (ci >= 2 ? 'pr-num' : '') + '">' + c + '</td>';
				}).join('') + '</tr>';
			}).join('');
		}
		function tableHtml(title, list) {
			var qty = list.reduce(function (a, p) { return a + p.qty; }, 0);
			var foot = '<tr class="pr-tot"><td></td><td></td><td class="pr-num"></td><td class="pr-num"></td>' +
				'<td class="pr-num"></td><td class="pr-num"></td><td class="pr-num"></td>' +
				'<td class="pr-num">' + qty + '</td></tr>';
			var bar = tableTitleBar(title, list.length + ' item' + (list.length === 1 ? '' : 's') +
				' \u2013 ' + qty + ' instances');
			return '<div class="pr-tbl-shell">' + bar.html + '<table class="pr-tbl"><thead><tr>' +
				head.map(function (h, ci) {
					return '<th class="' + (ci >= 2 ? 'pr-num' : '') + '">' + esc(h) + '</th>';
				}).join('') + '</tr></thead><tbody>' + rowsHtml(list, 0) + '</tbody><tfoot>' +
				foot + '</tfoot></table></div>';
		}

		var body;
		if (!panels.length) {
			body = '<div class="pr-empty"><h3>No panels match</h3><p>Clear the search to see them all.</p></div>';
		} else if (st.split !== 'none') {
			// Empty-value labels follow view-settings.js: Frame declares
			// 'No Parent'; Category and Material declare none, so they fall back
			// to the app's own '*' placeholder for a blank group.
			var keyOf = st.split === 'material'
				? function (p) { return p.materialName || '*'; }
				: st.split === 'category'
					? function (p) { return p.category || '*'; }
					: function (p) { return p.frame || 'No Parent'; };
			var groups = {}, order = [];
			panels.forEach(function (p) {
				var k = keyOf(p);
				if (!groups[k]) { groups[k] = []; order.push(k); }
				groups[k].push(p);
			});
			body = order.map(function (k) { return tableHtml(k, groups[k]); }).join('');
		} else {
			body = tableHtml('Patterned Panels', panels);
		}

		app.innerHTML =
			'<h1 class="MuiTypography-root MuiTypography-h1">List of Patterned Panels</h1>' +
			toolbar(st, [
				{ key: 'category', label: 'Category' },
				{ key: 'material', label: 'Material' },
				{ key: 'frame', label: 'Frame' },
			]) +
			body;
		bindBar(app, st);
		bindExports(app);
		makeSortable(app);
	}

	// ---- Table chrome + export -------------------------------------------
	// One title bar for every table page: centred name, "N items - M
	// instances" and the Excel / CSV / print icons, matching Stocks.
	var tblSeq = 0;
	function tableTitleBar(title, meta) {
		var id = 'prt' + (++tblSeq);
		return {
			id: id,
			html: '<div class="pr-tbl-title"><span class="pr-meta"></span>' +
				'<span class="pr-tt">' + esc(title) + '</span>' +
				'<span class="pr-meta">' + esc(meta || '') + '</span>' +
				'<span class="pr-acts">' +
					'<button data-pr="exp" data-act="xls" data-t="' + id + '" title="Save as Excel">' + ICON_XLS + '</button>' +
					'<button data-pr="exp" data-act="csv" data-t="' + id + '" title="Save as CSV">' + ICON_CSV + '</button>' +
					'<button data-pr="exp" data-act="print" data-t="' + id + '" title="Print">' + ICON_PRINT + '</button>' +
				'</span></div>',
		};
	}

	// Exports read the rendered table, so what lands in the file is exactly
	// what is on screen - current search, split and column set included.
	function tableToRows(tableEl) {
		var out = [];
		['thead', 'tbody', 'tfoot'].forEach(function (part) {
			var sec = tableEl.querySelector(part);
			if (!sec) return;
			[].forEach.call(sec.rows, function (tr) {
				var cells = [].map.call(tr.cells, function (td) {
					return (td.innerText || td.textContent || '').trim();
				});
				if (cells.join('')) out.push(cells);
			});
		});
		return out;
	}

	function csvSafe(v) {
		v = String(v == null ? '' : v);
		return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
	}

	function downloadBlob(blob, filename) {
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		a.href = url; a.download = filename;
		document.body.appendChild(a); a.click();
		document.body.removeChild(a);
		setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
	}

	// .xls as an HTML table with the Excel MIME type. Excel opens it natively
	// and it needs no external library - deliberately avoiding a CDN fetch,
	// since these reports are normally opened straight off a local disk.
	function exportTable(tableEl, act, name) {
		var rows = tableToRows(tableEl);
		if (!rows.length) return;
		if (act === 'csv') {
			downloadBlob(new Blob([rows.map(function (r) {
				return r.map(csvSafe).join(',');
			}).join('\r\n')], { type: 'text/csv;charset=utf-8;' }), name + '.csv');
			return;
		}
		if (act === 'xls') {
			var html = '<html><head><meta charset="utf-8"></head><body><table border="1">' +
				rows.map(function (r, i) {
					var tag = i === 0 ? 'th' : 'td';
					return '<tr>' + r.map(function (c) {
						return '<' + tag + '>' + esc(c) + '</' + tag + '>';
					}).join('') + '</tr>';
				}).join('') + '</table></body></html>';
			downloadBlob(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), name + '.xls');
			return;
		}
		// Print through the shared document so paper size and fit apply here
		// exactly as they do to the sheet drawings.
		printDocument(name, tableEl.outerHTML);
	}

	// ---- Sorting ---------------------------------------------------------
	// Applied to the rendered table rather than to each page's source array,
	// so every table - patterns, panels, panel process, summary - gets the
	// same behaviour without each renderer having to carry sort state.
	//
	// Values are compared numerically whenever both look numeric once currency
	// symbols, thousands separators and trailing units are stripped, so 1,080
	// sorts above 946 and "13.50 m2" sorts as 13.5. Otherwise it falls back to
	// a locale-aware string compare.
	function sortValue(text) {
		var t = String(text == null ? '' : text).trim();
		if (t === '' || t === '\u2014' || t === '-') return { n: null, s: '' };
		var cleaned = t.replace(/[\u20b9$,\s]/g, '').replace(/(m2|m\u00b2|ft\u00b2|mm|m|ft|u)$/i, '');
		var n = parseFloat(cleaned);
		return { n: (cleaned !== '' && isFinite(n) && /^-?[\d.]+$/.test(cleaned)) ? n : null, s: t.toLowerCase() };
	}

	function makeSortable(app) {
		app.querySelectorAll('.pr-tbl').forEach(function (table) {
			var head = table.tHead;
			var body = table.tBodies[0];
			if (!head || !body) return;
			[].forEach.call(head.rows[0].cells, function (th, idx) {
				if (th.querySelector('.pr-sa')) return;
				var arrow = document.createElement('span');
				arrow.className = 'pr-sa';
				arrow.innerHTML = '&#9650;';
				th.appendChild(arrow);
				th.addEventListener('click', function () {
					var asc = table.getAttribute('data-sc') !== String(idx) ||
						table.getAttribute('data-sd') !== 'asc';
					table.setAttribute('data-sc', idx);
					table.setAttribute('data-sd', asc ? 'asc' : 'desc');
					var rows = [].slice.call(body.rows);
					rows.sort(function (a, b) {
						var x = sortValue(a.cells[idx] && a.cells[idx].innerText);
						var y = sortValue(b.cells[idx] && b.cells[idx].innerText);
						var r;
						if (x.n !== null && y.n !== null) r = x.n - y.n;
						else if (x.n !== null) r = -1;
						else if (y.n !== null) r = 1;
						else r = x.s.localeCompare(y.s);
						return asc ? r : -r;
					});
					rows.forEach(function (tr, i) {
						// Re-apply striping; the classes were assigned by the
						// original row order and would otherwise band wrongly.
						tr.className = (i % 2) ? 'pr-even' : '';
						body.appendChild(tr);
					});
					[].forEach.call(head.rows[0].cells, function (c, i) {
						var a = c.querySelector('.pr-sa');
						if (!a) return;
						a.className = 'pr-sa' + (i === idx ? ' on' : '');
						a.innerHTML = (i === idx && !asc) ? '&#9660;' : '&#9650;';
					});
				});
			});
		});
	}

	function bindExports(app) {
		app.querySelectorAll('[data-pr="exp"]').forEach(function (b) {
			b.addEventListener('click', function () {
				var shell = b.closest('.pr-tbl-shell');
				var tbl = shell && shell.querySelector('table');
				if (!tbl) return;
				var title = shell.querySelector('.pr-tt');
				exportTable(tbl, b.getAttribute('data-act'),
					(title ? title.textContent : 'table').replace(/[\\/:*?"<>|]/g, '-'));
			});
		});
	}

	// ---- 8c. /patterns - the flat pattern table -------------------------
	// Columns mirror view-settings.js 'patterns': Name, Quantity panels,
	// Length, Width, Thickness, Material, Qty.
	function renderPatternTable(app, data) {
		var st = UI.table;
		var built = buildPatterns(data);
		var materials = indexBy(data.materials, 'ID');

		// A re-nested board can carry panels from several frames at once, so a
		// pattern's Frame is the set of frames it draws from - listed when
		// there are few, counted when there are many. Grouping puts a
		// mixed-frame board under 'Multiple' rather than pretending it belongs
		// to just one, which is the honest answer for a shared sheet.
		built.patterns.forEach(function (p) {
			var mv = vars(materials[p.materialId] || {});
			p.category = mv.CATEGORY || '';
			var names = {}, list = [];
			p.layout.rects.forEach(function (r) {
				if (r.type !== 'item' || !r.piece) return;
				var f = r.piece.frame || 'No Parent';
				if (!names[f]) { names[f] = 1; list.push(f); }
			});
			p.frames = list;
			p.frameLabel = list.length === 0 ? 'No Parent'
				: list.length === 1 ? list[0]
					: 'Multiple (' + list.length + ')';
		});

		var pats = built.patterns.filter(function (p) {
			return matches(st.q, [p.name, p.material, p.category, p.frameLabel,
				p.layout.nPanels, p.quantity, p.boardL, p.boardW]);
		});

		// "Quantity panels" is panels on ONE board; "No. of Boards" is how many
		// of that board get cut. Neither total alone is the job's panel count -
		// that is the two multiplied, which is what Total Panels adds.
		var head = ['Name', 'Quantity panels', 'Length', 'Width', 'Thickness', 'Material',
			'No. of Boards', 'Total Panels'];
		function tableHtml(title, list) {
			var tp = 0, tq = 0, tt = 0;
			var body = list.map(function (p, i) {
				var mv = vars(materials[p.materialId] || {});
				var total = p.layout.nPanels * p.quantity;
				tp += p.layout.nPanels; tq += p.quantity; tt += total;
				var cells = [esc(p.name), String(p.layout.nPanels), fmt(p.boardL, 0), fmt(p.boardW, 0),
					esc(mv.MAT_T || ''), esc(p.material || ''), String(p.quantity), String(total)];
				return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
					return '<td class="' + (ci >= 1 ? 'pr-num' : '') + '">' + c + '</td>';
				}).join('') + '</tr>';
			}).join('');
			var foot = '<tr class="pr-tot"><td></td><td class="pr-num">' + tp + '</td>' +
				'<td class="pr-num"></td><td class="pr-num"></td><td class="pr-num"></td>' +
				'<td class="pr-num"></td><td class="pr-num">' + tq + '</td>' +
				'<td class="pr-num">' + tt + '</td></tr>';
			var bar = tableTitleBar(title, list.length + ' item' + (list.length === 1 ? '' : 's') +
				' \u2013 ' + tq + ' boards \u2013 ' + tt + ' panels');
			return '<div class="pr-tbl-shell">' + bar.html + '<table class="pr-tbl"><thead><tr>' +
				head.map(function (h, ci) {
					return '<th class="' + (ci >= 1 ? 'pr-num' : '') + '">' + esc(h) + '</th>';
				}).join('') + '</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>';
		}

		var body;
		if (!pats.length) {
			body = '<div class="pr-empty"><h3>No patterns match</h3><p>Clear the search to see them all.</p></div>';
		} else if (st.split !== 'none') {
			var keyOf = st.split === 'material'
				? function (p) { return p.material || '*'; }
				: st.split === 'category'
					? function (p) { return p.category || '*'; }
					: function (p) { return p.frameLabel || 'No Parent'; };
			var groups = {}, order = [];
			pats.forEach(function (p) {
				var k = keyOf(p);
				if (!groups[k]) { groups[k] = []; order.push(k); }
				groups[k].push(p);
			});
			body = order.map(function (k) { return tableHtml(k, groups[k]); }).join('');
		} else {
			body = tableHtml('Patterns', pats);
		}

		app.innerHTML =
			'<h1 class="MuiTypography-root MuiTypography-h1">List of Patterns</h1>' +
			toolbar(st, [
				{ key: 'category', label: 'Category' },
				{ key: 'material', label: 'Material' },
				{ key: 'frame', label: 'Frame' },
			]) +
			body;
		bindBar(app, st);
		bindExports(app);
		makeSortable(app);
	}

	// ---- 8e. /panel-processes -------------------------------------------
	// Columns mirror view-settings.js 'panel-processes': Process, Description,
	// Category, Part Name, Zone, Quantity, Unit, Unit Cost, Cost.
	//
	// Two things differ from the native page, both deliberate:
	//   * Part Name links to "<panel guid>-0". The native column points at
	//     ':refPanel', which is the raw GUID - and the app stores panels under
	//     "<id>-<instance>", so that link reports the key as missing.
	//   * Quantity and Cost are multiplied by Project Quantity. The native page
	//     shows one assembly's worth (4.69 m2 here) no matter how many frames
	//     are being built; lacquering 30 frames covers 30x the area.
	function renderPanelProcesses(app, data) {
		var st = UI.process;
		var pq = projectQuantity(data);
		var procById = indexBy(data.panelProcesses, 'ID');
		var panelById = indexBy(data.panels, 'ID');
		var partsByPanel = {};
		(data.parts || []).forEach(function (x) { if (x && x.panel) partsByPanel[x.panel] = x; });

		var rows = (data.processZones || []).map(function (z) {
			var zv = vars(z);
			var pv = vars(procById[z.panelProcess] || procById[zv.PROC_GUID] || {});
			var panel = panelById[z.panel];
			var part = partsByPanel[z.panel];
			var partVars = part ? vars(part) : {};
			var rawQty = (parseFloat(zv.PROC_ZONE_QTT) || 0) * pq;
			var unitCost = parseFloat(pv.PROC_UCOST) || 0;
			var cost = parseFloat(zv.PROC_ZONE_COST);
			cost = (isNaN(cost) ? (parseFloat(zv.PROC_ZONE_QTT) || 0) * unitCost : cost) * pq;
			var conv = convertQty(rawQty, zv.PROC_ZONE_QTT_UNIT || '');
			return {
				process: pv.PROC_NAME || '',
				description: pv.PROC_DESC || '',
				category: pv.PROC_CAT || '',
				partName: partVars.NAME || (panel && panel.name) || '',
				panelGuid: (panel && panel.ID) || '',
				zone: zv.PROC_ZONENAME || '',
				quantity: conv.value,
				unit: conv.unit,
				rawUnit: zv.PROC_ZONE_QTT_UNIT || '',
				baseRate: unitCost,
				baseQty: rawQty,
				unitBase: zv.PROC_ZONE_QTT_UNIT || '',
				unitCost: convertRate(unitCost, cost, rawQty, conv.value,
					conv.unit !== (zv.PROC_ZONE_QTT_UNIT || '')),
				converted: conv.unit !== (zv.PROC_ZONE_QTT_UNIT || ''),
				cost: cost,
			};
		}).filter(function (r) {
			return matches(st.q, [r.process, r.description, r.category, r.partName, r.zone, r.quantity]);
		});

		var head = ['Process', 'Description', 'Category', 'Part Name', 'Zone',
			'Quantity', 'Unit', 'Unit Cost', 'Cost'];
		var NUM_FROM = 5;

		function tableHtml(title, list) {
			var tq = 0, tc = 0;
			var body = list.map(function (r, i) {
				// Every zone of a given process shares one rate, so editing it
				// on any row repoints the whole process.
				var k = rateKey('PanelProcess', r.process);
				var cost = (k in RATES) ? r.baseQty * RATES[k] : r.cost;
				tq += r.quantity; tc += cost;
				var nameCell = r.panelGuid
					? '<a class="pr-link" href="#/panels/' + esc(r.panelGuid) + PANEL_KEY_SUFFIX + '">' +
						esc(r.partName) + '</a>'
					: esc(r.partName);
				var cells = [esc(r.process), esc(r.description), esc(r.category), nameCell, esc(r.zone),
					fmt(r.quantity, 2), esc(r.unit),
					rateCell('PanelProcess', r.process, r.baseRate, r.unitBase), money(cost)];
				return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
					return '<td class="' + (ci >= NUM_FROM ? 'pr-num' : '') + '">' + c + '</td>';
				}).join('') + '</tr>';
			}).join('');
			var foot = '<tr class="pr-tot">' + head.map(function (_, ci) {
				return '<td class="' + (ci >= NUM_FROM ? 'pr-num' : '') + '">' +
					(ci === 5 ? fmt(tq, 2) : ci === head.length - 1 ? money(tc) : '') + '</td>';
			}).join('') + '</tr>';
			// Instances counts zone applications across the whole job: each
			// zone is processed once per frame built.
			var bar = tableTitleBar(title, list.length + ' item' + (list.length === 1 ? '' : 's') +
				' \u2013 ' + (list.length * pq) + ' instances');
			return '<div class="pr-tbl-shell">' + bar.html + '<table class="pr-tbl"><thead><tr>' +
				head.map(function (h, ci) {
					return '<th class="' + (ci >= NUM_FROM ? 'pr-num' : '') + '">' + esc(h) + '</th>';
				}).join('') + '</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>';
		}

		var body;
		if (!rows.length) {
			body = '<div class="pr-empty"><h3>No panel processes</h3>' +
				'<p>This project has no finishing processes applied to its panels.</p></div>';
		} else if (st.split === 'process') {
			var groups = {}, order = [];
			rows.forEach(function (r) {
				var k = r.process || '*';
				if (!groups[k]) { groups[k] = []; order.push(k); }
				groups[k].push(r);
			});
			body = order.map(function (k) { return tableHtml(k, groups[k]); }).join('');
		} else {
			body = tableHtml('Panel Process', rows);
		}

		app.innerHTML =
			'<h1 class="MuiTypography-root MuiTypography-h1">Panel Process</h1>' +
			toolbar(st, [{ key: 'process', label: 'Process' }], { units: true }) +
			body;
		bindBar(app, st);
		bindExports(app);
		makeSortable(app);
	}

	// ---- 9. Overlay plumbing (same approach as the Cutrite page) --------
	function buildOverlay() {
		var existing = document.getElementById(OVERLAY_ID);
		if (existing) return existing;
		var overlay = document.createElement('div');
		overlay.id = OVERLAY_ID;
		overlay.innerHTML = '<div id="pattern-renest-app"></div>';
		document.body.appendChild(overlay);
		return overlay;
	}

	function positionOverlay(overlay) {
		try {
			var appBar = document.querySelector('.MuiAppBar-root');
			var drawer = document.querySelector('.MuiDrawer-paper');
			var top = 0, left = 0;
			if (appBar) {
				var b = appBar.getBoundingClientRect();
				if (b.height > 0) top = b.bottom;
			}
			if (drawer) {
				var d = drawer.getBoundingClientRect();
				if (d.width > 0 && d.right > 0) left = d.right;
			}
			overlay.style.top = top + 'px';
			overlay.style.left = left + 'px';
		} catch (e) {
			overlay.style.top = '0px';
			overlay.style.left = '0px';
		}
		overlay.style.right = '0px';
		overlay.style.bottom = '0px';
	}

	// Which page the overlay is currently standing in for, or null.
	function currentRoute() {
		var h = location.hash;
		if (h.indexOf(ROUTE_PATTERNS) === 0) return 'patterns';
		if (h.indexOf(ROUTE_SUMMARY) === 0) return 'summary';
		// Must be tested after ROUTE_PATTERNS: '#/patterns' is a prefix of
		// nothing else, but '#/pattern-detailed-list' would not match it anyway.
		// Exact-match the table route so '#/patterns/<key>' detail links still
		// fall through to the app's own per-pattern page.
		if (h === ROUTE_PATTERN_TABLE || h === ROUTE_PATTERN_TABLE + '/') return 'patternTable';
		// Exact-match for the same reason as ROUTE_PATTERN_TABLE: a per-panel
		// detail route would start with this prefix too, and that route
		// belongs to the app, not this overlay.
		if (h === ROUTE_PATTERNED_PANELS || h === ROUTE_PATTERNED_PANELS + '/') return 'patternedPanels';
		if (h === ROUTE_PANEL_PROCESSES || h === ROUTE_PANEL_PROCESSES + '/') return 'panelProcesses';
		return null;
	}
	function onRoute() { return currentRoute() !== null; }

	function init() {
		injectStyles();
		var overlay = buildOverlay();
		var app = document.getElementById('pattern-renest-app');
		var drawnFor = null;

		function draw(tries) {
			tries = tries || 0;
			if (typeof reportDataRaw !== 'undefined' && reportDataRaw) {
				try {
					var route = currentRoute();
					if (route === 'summary') renderSummary(app, reportDataRaw);
					else if (route === 'patternTable') renderPatternTable(app, reportDataRaw);
					else if (route === 'patternedPanels') renderPatternedPanels(app, reportDataRaw);
					else if (route === 'panelProcesses') renderPanelProcesses(app, reportDataRaw);
					else render(app, reportDataRaw);
				} catch (e) {
					console.error('pattern re-nest error:', e);
					app.innerHTML = '<div class="pr-empty"><h3>Could not re-nest</h3><p>' + esc(e.message) + '</p></div>';
				}
				return;
			}
			if (tries > 100) {
				app.innerHTML = '<div class="pr-empty"><h3>Report data is taking a while to load</h3>' +
					'<p>Open any other page once, then come back.</p></div>';
				return;
			}
			setTimeout(function () { draw(tries + 1); }, 100);
		}

		// Toolbar controls redraw through the same dispatcher that first drew
		// the page, so search, split and zoom can never diverge from the route.
		rerender = function () { draw(0); };

		function sync() {
			try {
				var route = currentRoute();
				if (route) {
					positionOverlay(overlay);
					overlay.style.display = 'block';
					// Redraw when moving between the two pages this stands in for.
					if (drawnFor !== route) { drawnFor = route; draw(); }
				} else {
					overlay.style.display = 'none';
				}
			} catch (e) { console.error('pattern re-nest overlay error:', e); }
		}

		// The app navigates with history.pushState(), which never fires
		// hashchange, so the hash is polled - same reasoning as the Cutrite page.
		var last = location.hash;
		setInterval(function () {
			if (location.hash !== last) { last = location.hash; sync(); }
		}, 150);
		window.addEventListener('hashchange', sync);
		window.addEventListener('popstate', sync);
		window.addEventListener('resize', function () { if (onRoute()) positionOverlay(overlay); });
		sync();
	}

	// Exposed so the nest can be checked against SWOOD's own figures.
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = {
			buildPatterns: buildPatterns, nestBoards: nestBoards,
			layoutBoard: layoutBoard, summaryModel: summaryModel, projectQuantity: projectQuantity,
			computeFrameCosts: computeFrameCosts,
		};
	}

	if (typeof document !== 'undefined') {
		if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
		else init();
	}
})();
