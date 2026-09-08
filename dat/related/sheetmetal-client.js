/* SwoodReport - Sheetmetal Nesting page.
   Include after the main app script:
     <script src="assets/js/sheetmetal-nest.js"></script>
     <script src="assets/js/sheetmetal-client.js"></script>

   Keep the SHEETS / PART_GAP / SHEET_MARGIN block in sheetmetal-nest.js in
   step with macros/ExportFlatPatternDXF.bas. The printed table is computed
   here; the drawing prefers the SVG the SolidWorks macro writes to
   images/sheetmetal/nest-<Part>_<Config>.svg (true flat-pattern outline).
   If that file is missing, a rectangle grid is drawn from stock L x W. */
(function () {
	'use strict';

	var Nest = (typeof SheetMetalNest !== 'undefined') ? SheetMetalNest : null;
	var STYLE_ID = 'sheetmetal-nest-styles';
	var OVERLAY_ID = 'sheetmetal-nest-overlay';
	var APP_ID = 'sheetmetal-nest-app';
	var NAV_ID = 'sheetmetal-nest-nav';
	var ROUTE = '#/sheetmetal';

	function esc(s) {
		return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
		});
	}
	function fmt(n, dp) {
		var f = Math.pow(10, dp);
		return (Math.round(n * f) / f).toFixed(dp);
	}
	function vars(obj) {
		var m = {};
		((obj && obj.variables) || []).forEach(function (v) { m[v.alias] = v.value; });
		return m;
	}
	function indexBy(list, key) {
		var m = {};
		(list || []).forEach(function (x) { if (x) m[x[key]] = x; });
		return m;
	}

	function projectQuantity(data) {
		var qty = 0;
		(data.swcps || []).forEach(function (c) {
			if (c.name === 'Project Quantity') qty = parseFloat(c.value) || qty;
		});
		(data.variables || []).forEach(function (v) {
			if (v.alias === 'PROJECT_QTY') qty = parseFloat(v.value) || qty;
		});
		return qty;
	}

	function looksLikeSheetMetal(mv, sv, partVars) {
		if (mv.WELDMENT === 'True') return false;
		if (mv.MAT_ISFORSAW === 'True') return false;
		if (mv.MAT_ISSHEETMETAL === 'True' || sv.SM_THICKNESS || partVars.SM_THICKNESS) return true;
		if (mv.MAT_ISFORSAW === 'False') return true;
		var name = String(mv.MAT_NAME || mv.MAT_DES || '').toLowerCase();
		return /steel|stainless|inox|alu|zinc|sheet.?metal|galvanis|iron|brass|copper/.test(name);
	}

	function collectSheetMetal(data) {
		var materials = indexBy(data.materials, 'ID');
		var panels = indexBy(data.panels, 'ID');
		var partsByPanel = {};
		(data.parts || []).forEach(function (p) { if (p && p.panel) partsByPanel[p.panel] = p; });
		var pq = projectQuantity(data);
		var out = [];
		var seen = {};

		(data.stocks || []).forEach(function (st) {
			var panel = panels[st.part];
			var part = partsByPanel[st.part];
			var mv = vars(materials[st.material] || {});
			var sv = vars(st);
			var partVars = part ? vars(part) : {};
			if (!looksLikeSheetMetal(mv, sv, partVars)) return;

			var partProps = {};
			((part && part.swcps) || []).forEach(function (c) { partProps[c.name] = c.value; });

			var name = partProps['ID'] || partVars.NAME || (panel && panel.name) || st.name || '';
			var conf = partVars.CONFIGURATION || partVars.CONFIG || partProps['Configuration'] || 'Default';
			var key = name + '|' + conf;
			if (seen[key]) return;
			seen[key] = true;

			var L = parseFloat(sv.ST_L || sv.SM_FLAT_L || partVars.ST_L) || 0;
			var W = parseFloat(sv.ST_W || sv.SM_FLAT_W || partVars.ST_W) || 0;
			var qty = parseFloat(partVars.NB || st.quantity || 1) || 1;
			if (pq) qty = qty * pq;

			out.push({
				name: name,
				config: conf,
				L: L,
				W: W,
				thickness: parseFloat(sv.ST_T || sv.SM_THICKNESS) || 0,
				qty: qty,
				materialName: mv.MAT_NAME || st.material || '',
				guid: (panel && panel.ID) || '',
				svg: 'images/sheetmetal/' + (Nest ? Nest.nestFileName(name, conf) : ('nest-' + name + '_' + conf + '.svg'))
			});
		});
		return out;
	}

	function injectStyles() {
		if (document.getElementById(STYLE_ID)) return;
		var css =
			'#' + OVERLAY_ID + '{display:none;position:fixed;z-index:500;background:var(--surface,#fff);overflow:auto;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink,#16202b);padding:20px 24px;}' +
			'#' + OVERLAY_ID + ' h2{margin:0 0 6px;font-size:20px;color:var(--brand,#14487f);}' +
			'#' + OVERLAY_ID + ' .sm-note{color:var(--ink-soft,#4a5b6d);font-size:13px;margin:0 0 16px;max-width:820px;line-height:1.5;}' +
			'#' + OVERLAY_ID + ' table.sm-tbl{width:100%;border-collapse:collapse;font-size:14px;border:1px solid var(--rule,#d4dde5);margin-bottom:22px;}' +
			'#' + OVERLAY_ID + ' .sm-tbl th{background:var(--brand,#14487f);color:#fff;text-align:left;padding:8px 10px;}' +
			'#' + OVERLAY_ID + ' .sm-tbl td{padding:7px 10px;border-bottom:1px solid var(--rule,#d4dde5);}' +
			'#' + OVERLAY_ID + ' .sm-tbl tr:nth-child(even) td{background:#f1f5f9;}' +
			'#' + OVERLAY_ID + ' .sm-num{text-align:right;font-variant-numeric:tabular-nums;}' +
			'#' + OVERLAY_ID + ' .sm-tot td{font-weight:700;background:#e3edf9;border-top:2px solid var(--brand,#14487f);}' +
			'#' + OVERLAY_ID + ' .sm-card{border:1px solid var(--rule,#d4dde5);border-radius:6px;padding:14px;margin-bottom:18px;}' +
			'#' + OVERLAY_ID + ' .sm-card h3{margin:0 0 8px;font-size:15px;}' +
			'#' + OVERLAY_ID + ' .sm-draw{width:100%;max-width:900px;background:#fff;}' +
			'#' + OVERLAY_ID + ' .sm-draw img,#' + OVERLAY_ID + ' .sm-draw svg{width:100%;height:auto;display:block;}' +
			'#' + OVERLAY_ID + ' .sm-empty{border:1px dashed #d4dde5;border-radius:6px;padding:36px;text-align:center;color:#4a5b6d;max-width:640px;}' +
			'#' + NAV_ID + '{display:block;padding:10px 16px;color:var(--brand,#14487f);text-decoration:none;font-weight:600;}' +
			'@media print{#' + OVERLAY_ID + '{position:static !important;padding:0;overflow:visible;}}';
		var style = document.createElement('style');
		style.id = STYLE_ID;
		style.appendChild(document.createTextNode(css));
		document.head.appendChild(style);
	}

	function rectangleNestSvg(part, nest) {
		if (!Nest || !nest) return '';
		var pw = part.L, ph = part.W;
		var stepX = (nest.rotated ? ph : pw) + Nest.PART_GAP;
		var stepY = (nest.rotated ? pw : ph) + Nest.PART_GAP;
		var innerL = nest.L - 2 * Nest.SHEET_MARGIN;
		var innerW = nest.W - 2 * Nest.SHEET_MARGIN;
		var out = [];
		out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + nest.L + ' ' + nest.W + '" width="100%">');
		out.push('<rect x="0" y="0" width="' + nest.L + '" height="' + nest.W + '" fill="#fff" stroke="#333" stroke-width="3"/>');
		out.push('<rect x="' + Nest.SHEET_MARGIN + '" y="' + Nest.SHEET_MARGIN + '" width="' + innerL + '" height="' + innerW + '" fill="none" stroke="#bbb" stroke-width="1" stroke-dasharray="12,8"/>');
		for (var r = 0; r < nest.rows; r++) {
			for (var c = 0; c < nest.cols; c++) {
				var ox = Nest.SHEET_MARGIN + c * stepX;
				var oy = Nest.SHEET_MARGIN + r * stepY;
				var bw = nest.rotated ? ph : pw;
				var bh = nest.rotated ? pw : ph;
				out.push('<rect x="' + ox + '" y="' + oy + '" width="' + bw + '" height="' + bh + '" fill="#c7d2fe" fill-opacity="0.75" stroke="#3730a3" stroke-width="2"/>');
			}
		}
		out.push('<text x="' + Nest.SHEET_MARGIN + '" y="' + (nest.W - 14) + '" font-family="sans-serif" font-size="34" fill="#555">' +
			nest.L + ' x ' + nest.W + ' mm  -  ' + nest.perSheet + ' per sheet  -  ' + fmt(nest.util, 1) + '% used' +
			(nest.rotated ? '  -  rotated 90' : '') + '</text>');
		out.push('</svg>');
		return out.join('');
	}

	function drawingHtml(part, nest) {
		var fallback = rectangleNestSvg(part, nest);
		return '<div class="sm-draw">' +
			'<img alt="nest ' + esc(part.name) + '" src="' + esc(part.svg) + '" ' +
			'onerror="this.style.display=\'none\';this.nextSibling.style.display=\'block\';">' +
			'<div style="display:none">' + fallback + '</div></div>';
	}

	function render(app, data) {
		if (!Nest) {
			app.innerHTML = '<div class="sm-empty"><h3>sheetmetal-nest.js is missing</h3>' +
				'<p>Load it before sheetmetal-client.js.</p></div>';
			return;
		}
		var parts = collectSheetMetal(data || {});
		var rows = [];
		var totalSheetsArea = 0;
		var totalBlanks = 0;
		parts.forEach(function (p) {
			var n = (p.L > 0 && p.W > 0) ? Nest.pickSheetForJob(p.L, p.W, p.qty) : null;
			var needed = n ? (n.needed || Nest.sheetsNeeded(p.qty, n.perSheet)) : 0;
			var area = n ? (n.boughtM2 != null ? n.boughtM2 : Nest.stockAreaM2(n.L, n.W, needed)) : 0;
			totalSheetsArea += area;
			totalBlanks += p.qty;
			rows.push({ part: p, nest: n, needed: needed, area: area });
		});

		var html = '<h2>Sheetmetal Nesting</h2>' +
			'<p class="sm-note">Cheapest stock is the one that consumes the least sheet area per blank ' +
			'(gap ' + Nest.PART_GAP + ' mm, margin ' + Nest.SHEET_MARGIN + ' mm). Drawings use the true ' +
			'flat-pattern SVG from ExportFlatPatternDXF when present; otherwise a rectangle of the report blank.</p>';

		if (!rows.length) {
			html += '<div class="sm-empty"><h3>No sheet-metal parts in this report</h3>' +
				'<p>Generate the SWOOD report, then run <code>ExportFlatPatternDXF</code> in SolidWorks ' +
				'so DXFs land in <code>dxfs/sheetmetal</code> and nest SVGs in <code>images/sheetmetal</code>.</p></div>';
			app.innerHTML = html;
			return;
		}

		html += '<table class="sm-tbl"><thead><tr>' +
			'<th>Part</th><th>Config</th><th class="sm-num">Blank mm</th><th class="sm-num">Qty</th>' +
			'<th>Stock</th><th class="sm-num">Per sheet</th><th class="sm-num">Sheets</th>' +
			'<th class="sm-num">Steel m²</th><th class="sm-num">Used</th></tr></thead><tbody>';
		rows.forEach(function (row) {
			var p = row.part, n = row.nest;
			html += '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.config) + '</td>' +
				'<td class="sm-num">' + (p.L && p.W ? fmt(p.L, 1) + ' × ' + fmt(p.W, 1) : '—') + '</td>' +
				'<td class="sm-num">' + fmt(p.qty, 0) + '</td>';
			if (!n) {
				html += '<td colspan="5">does not fit any stock sheet</td></tr>';
			} else {
				html += '<td>' + n.L + ' × ' + n.W + (n.rotated ? ' (rot 90)' : '') + '</td>' +
					'<td class="sm-num">' + n.perSheet + '</td>' +
					'<td class="sm-num">' + row.needed + '</td>' +
					'<td class="sm-num">' + fmt(row.area, 2) + '</td>' +
					'<td class="sm-num">' + fmt(n.util, 1) + '%</td></tr>';
			}
		});
		html += '<tr class="sm-tot"><td colspan="7">Job total</td><td class="sm-num">' +
			fmt(totalSheetsArea, 2) + '</td><td></td></tr></tbody></table>';

		rows.forEach(function (row) {
			var p = row.part, n = row.nest;
			html += '<div class="sm-card"><h3>' + esc(p.name) + '_' + esc(p.config) +
				(p.materialName ? ' — ' + esc(p.materialName) : '') + '</h3>';
			if (n) html += drawingHtml(p, n);
			else html += '<p class="sm-note">Blank does not fit any configured stock sheet.</p>';
			html += '</div>';
		});

		app.innerHTML = html;
	}

	function buildOverlay() {
		var existing = document.getElementById(OVERLAY_ID);
		if (existing) return existing;
		var overlay = document.createElement('div');
		overlay.id = OVERLAY_ID;
		overlay.innerHTML = '<div id="' + APP_ID + '"></div>';
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

	function ensureNavLink() {
		var drawer = document.querySelector('.MuiDrawer-paper');
		if (!drawer || document.getElementById(NAV_ID)) return;
		var a = document.createElement('a');
		a.id = NAV_ID;
		a.href = ROUTE;
		a.textContent = 'Sheetmetal Nesting';
		drawer.appendChild(a);
	}

	function onRoute() {
		var h = location.hash;
		return h === ROUTE || h === ROUTE + '/' || h.indexOf(ROUTE + '?') === 0;
	}

	function init() {
		injectStyles();
		var overlay = buildOverlay();
		var app = document.getElementById(APP_ID);
		var drawn = false;

		function draw(tries) {
			tries = tries || 0;
			if (typeof reportDataRaw !== 'undefined' && reportDataRaw) {
				try { render(app, reportDataRaw); }
				catch (e) {
					console.error('sheetmetal nest error:', e);
					app.innerHTML = '<div class="sm-empty"><h3>Could not build nesting</h3><p>' +
						esc(e.message) + '</p></div>';
				}
				return;
			}
			if (tries > 100) {
				app.innerHTML = '<div class="sm-empty"><h3>Report data is taking a while to load</h3>' +
					'<p>Open any other page once, then come back to Sheetmetal Nesting.</p></div>';
				return;
			}
			setTimeout(function () { draw(tries + 1); }, 100);
		}

		function sync() {
			ensureNavLink();
			if (onRoute()) {
				positionOverlay(overlay);
				overlay.style.display = 'block';
				if (!drawn) { drawn = true; draw(); }
			} else {
				overlay.style.display = 'none';
			}
		}

		var last = location.hash;
		setInterval(function () {
			if (location.hash !== last) { last = location.hash; drawn = false; sync(); }
		}, 150);
		window.addEventListener('hashchange', sync);
		window.addEventListener('popstate', sync);
		window.addEventListener('resize', function () { if (onRoute()) positionOverlay(overlay); });
		sync();
	}

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = { collectSheetMetal: collectSheetMetal, looksLikeSheetMetal: looksLikeSheetMetal };
	}

	if (typeof document !== 'undefined') {
		if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
		else init();
	}
})();
