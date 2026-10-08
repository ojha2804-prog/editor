/* ============================================================================
 * SWOOD COST DEFAULTS  —  optional companion to swood-client.js
 * ----------------------------------------------------------------------------
 * Loaded from IIFE 1 via createElement (same pattern as the data-settings
 * bootstrap). Must NOT be merged into IIFE 2 — that scope cannot see this
 * file, and this file must not close over overlay locals.
 *
 * window.SwoodCost.unitCost[section][material]  →  default unitCost
 *   '*'  = fallback for that section when the material is not listed
 *
 * Apply rule (enforced in swood-client.js resolvedRate):
 *   1. Typed Mgmt cell (RATES) always wins, including 0
 *   2. Live library / MAT_UCOST wins when it is a number > 0
 *   3. This table fills only when that live value is empty
 *
 * Open item 2 (zero rates on sheet metal / edgeband / hardware) is solvable
 * here without regenerating the SolidWorks model.
 * ========================================================================== */
;(function (w) {
	'use strict'
	w.SwoodCost = {
		version: '1.0.0',
		unitCost: {
			/* ₹ / m² */
			Boards: { '*': 1200 },
			Materials: { '*': 800 },
			Material: { '*': 800 },
			Laminates: { '*': 450 },
			'Laminate / Veneer': { '*': 450 },
			Glass: { '*': 900 },
			Mirror: { '*': 1100 },
			Solidwood: { '*': 2500 },
			'Solidwood / Hardwood': { '*': 2500 },
			Countertops: { '*': 3500 },
			'Countertops / Corian': { '*': 3500 },

			/* ₹ / m */
			Edgebands: { '*': 18 },

			/* ₹ / pc */
			Hardware: { '*': 25 },

			/* ₹ / kg  — sheet metal and weldment purchased weight */
			Sheetmetal: {
				'AISI 304': 180,
				'Plain Carbon Steel': 85,
				'*': 90,
			},
			Weldments: {
				'PROS_20x20x2': 75,
				'*': 75,
			},
			WeldBars: {
				'PROS_20x20x2': 75,
				'*': 75,
			},

			PanelProcess: { '*': 0 },
		},
	}
})(typeof window !== 'undefined' ? window : this);
