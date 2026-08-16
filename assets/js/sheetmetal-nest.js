/* Sheet-metal nest math shared by the report page and the SolidWorks macro.
   Keep SHEETS / PART_GAP / SHEET_MARGIN in step with macros/ExportFlatPatternDXF.bas
   (and the SHEETS block in sheetmetal-client.js). Ranked on stock area consumed
   per blank - not blanks-per-sheet, not utilisation percentage. */
(function (root) {
	'use strict';

	var PART_GAP = 5;
	var SHEET_MARGIN = 10;
	var ALLOW_ROTATION = true;
	var SHEETS = [
		{ L: 2500, W: 1250 },
		{ L: 3000, W: 1500 }
	];

	function safeDiv(avail, size, gap) {
		gap = gap == null ? PART_GAP : gap;
		if (!(size > 0)) return 0;
		return Math.floor((avail + gap) / (size + gap));
	}

	function pickSheet(pw, ph, options) {
		options = options || {};
		var sheets = options.sheets || SHEETS;
		var gap = options.gap == null ? PART_GAP : options.gap;
		var margin = options.margin == null ? SHEET_MARGIN : options.margin;
		var allowRot = options.allowRotation == null ? ALLOW_ROTATION : options.allowRotation;

		var best = null;
		for (var k = 0; k < sheets.length; k++) {
			var sL = sheets[k].L;
			var sW = sheets[k].W;
			var iL = sL - 2 * margin;
			var iW = sW - 2 * margin;
			var cA = safeDiv(iL, pw, gap);
			var rA = safeDiv(iW, ph, gap);
			var cB = allowRot ? safeDiv(iL, ph, gap) : 0;
			var rB = allowRot ? safeDiv(iW, pw, gap) : 0;
			var rot = (cB * rB) > (cA * rA);
			var cols = rot ? cB : cA;
			var rows = rot ? rB : rA;
			if (cols < 1 || rows < 1) continue;
			var perSheet = cols * rows;
			var areaPer = (sL * sW) / perSheet;
			if (!best || areaPer < best.areaPer) {
				best = {
					index: k,
					L: sL,
					W: sW,
					cols: cols,
					rows: rows,
					rotated: rot,
					perSheet: perSheet,
					areaPer: areaPer,
					util: (perSheet * pw * ph) / (sL * sW) * 100
				};
			}
		}
		return best;
	}

	function sheetsNeeded(qty, perSheet) {
		if (!(perSheet > 0) || !(qty > 0)) return 0;
		return Math.ceil(qty / perSheet);
	}

	function stockAreaM2(sheetL, sheetW, nSheets) {
		return (sheetL * sheetW * nSheets) / 1e6;
	}

	// Same candidates as pickSheet, ranked on steel bought for this quantity
	// (sheet area x sheets needed). Area-per-blank ignores leftover on the
	// last sheet, which is why 9-up on 3000 x 1500 looks cheaper than 6-up
	// on 2500 x 1250 until you buy 20 off.
	function pickSheetForJob(pw, ph, qty, options) {
		options = options || {};
		var sheets = options.sheets || SHEETS;
		var gap = options.gap == null ? PART_GAP : options.gap;
		var margin = options.margin == null ? SHEET_MARGIN : options.margin;
		var allowRot = options.allowRotation == null ? ALLOW_ROTATION : options.allowRotation;
		if (!(qty > 0)) return pickSheet(pw, ph, options);

		var best = null;
		for (var k = 0; k < sheets.length; k++) {
			var one = pickSheet(pw, ph, {
				sheets: [sheets[k]],
				gap: gap,
				margin: margin,
				allowRotation: allowRot
			});
			if (!one) continue;
			var needed = sheetsNeeded(qty, one.perSheet);
			var bought = stockAreaM2(one.L, one.W, needed);
			if (!best || bought < best.boughtM2 ||
				(bought === best.boughtM2 && one.areaPer < best.areaPer)) {
				one.index = k;
				one.needed = needed;
				one.boughtM2 = bought;
				best = one;
			}
		}
		return best;
	}

	function safeFileName(s) {
		return String(s == null ? '' : s).replace(/[\\/:*?"<>|]/g, '-').replace(/^\s+|\s+$/g, '');
	}

	function nestFileName(partName, configName) {
		return 'nest-' + safeFileName(partName) + '_' + safeFileName(configName || 'Default') + '.svg';
	}

	var api = {
		PART_GAP: PART_GAP,
		SHEET_MARGIN: SHEET_MARGIN,
		ALLOW_ROTATION: ALLOW_ROTATION,
		SHEETS: SHEETS,
		safeDiv: safeDiv,
		pickSheet: pickSheet,
		pickSheetForJob: pickSheetForJob,
		sheetsNeeded: sheetsNeeded,
		stockAreaM2: stockAreaM2,
		safeFileName: safeFileName,
		nestFileName: nestFileName
	};

	root.SheetMetalNest = api;
	if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
