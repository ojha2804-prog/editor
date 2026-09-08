/* ============================================================================
 * SWOOD CLIENT  —  single-file customisation layer for SwoodReport 3.x
 * ----------------------------------------------------------------------------
 * ONE FILE ON PURPOSE. Nothing is split across other .js files, so there is
 * no load-order to get wrong and no missing-file failure mode.
 *
 * Loaded by a 8-line bootstrap in data-settings.js. Touches nothing else:
 * index.html / main.js / main.css stay stock, so SWOOD updates are safe.
 *
 *   PART 1  CONFIG            - the switches you will actually edit
 *   PART 2  CORE              - page/menu registry + helpers
 *   PART 3  STEP 1            - Saw Machine Data page  (view-settings config)
 *   PART 4  STEP 2            - Pattern re-nest engine (overlay, verbatim)
 *   Weldment bars             - professional lock (click Open), issued nest
 *   Glass & Mirror            - dedicated page; removed from Saw Machine Data
 * ========================================================================== */
;(function (w) {
	'use strict'
	if (w.SwoodClient) return

	/* ======================================================================
	 * PART 1 — CONFIG
	 * ==================================================================== */
	var CONFIG = {
		/* STEP 1 : the Saw Machine Data page. false = page is not created.  */
		sawMachineData: true,

		/* Glass & Mirror page (Saw layout). Glass/mirror panels are taken
		   OFF Saw Machine Data and listed only here. */
		glassMirrorPage: true,

		/* STEP 3 : full Weldments page (section, wall thk, coating areas,
		   cut-list properties). Needs the MBS_* variables in Report.cfg.   */
		weldmentsPage: true,

		/* STEP 4 : Stocks page - no tree, cut sizes without edgebands.     */
		stocksPage: true,

		/* Keep client menu entries visible even when their resource is
		   empty. SwoodReport deletes a menu item when the page with the
		   SAME id has zero rows - that is why Panel & Part Process
		   disappeared the moment no panel had a process on it.
		   See makeMenuPersistent() for how this works.                    */
		alwaysShowMenu: true,

		/* ==================================================================
		 * STEP 6 : SHEET METAL
		 * ------------------------------------------------------------------
		 * A sheet metal part carries a cut list, so its data arrives through
		 * the SM_* variables added to Report.cfg - the same route weldments
		 * use. No DXF and no sheetmetal-geometry.js required: SolidWorks
		 * already reports the NET blank area as 'Bounding Box Area-Blank'.
		 *
		 * blank area -> coating area, nesting and weight all follow.
		 * ================================================================ */
		sheetMetalPage: true,

		sheetMetal: {
			/* Stock sheets offered in the Layout toolbar. ADD A LINE to add a
			   size; the first entry is the default. 'Auto' picks whichever
			   listed sheet gives the least waste for that part.            */
			sheets: [
				{ label: '2500 x 1250 mm', L: 2500, W: 1250 },
				{ label: '3000 x 1500 mm', L: 3000, W: 1500 },
			],
			sheetIndex: 0,       /* -1 = Auto (best fit) */
			trim: 10,            /* edge trim on all four sides, mm */
			kerf: 5,             /* cut gap between blanks, mm */
			perRow: 2,           /* nesting sheets drawn per row */
			/* fall back to the bounding box when the blank area is missing */
			useBoundingBoxIfNoBlank: true,

			/* true = the Layout page only draws parts that have a real flat
			   pattern in db/sheetmetal-geometry.js. Parts without one are
			   listed as missing rather than nested as rectangles, so a
			   rectangle can never be mistaken for a laser-ready nest.     */
			trueShapeOnly: true,

			/* ---------------------------------------------------------- NESTING
			 * true  = real nesting. Blanks of the SAME material and thickness
			 *         share sheets, big parts first, each dropped into the
			 *         lowest free spot on its true outline (see smNestGroup).
			 * false = the old behaviour: every part gets its own sheets and a
			 *         simple rows x columns grid of itself.
			 * ------------------------------------------------------------- */
			trueNest: true,

			/* Column width the nester measures outlines at, mm. Smaller reads
			   concave shapes more finely and packs slightly tighter; cost is
			   roughly linear. 2-5 is sensible. */
			nestResolution: 3,

			/* Rotations tried for each blank. [0,90,180,270] suits most laser
			   work. Use [0,180] for brushed or directional stock, [0] to lock
			   grain direction entirely. */
			nestRotations: [0, 90, 180, 270],

			/* How many already-open sheets a new blank may be dropped back
			   into before a fresh sheet is started. Higher fills gaps better
			   and costs more time on big jobs. */
			nestLookback: 4,

			/* Above this many blanks the resolution is coarsened automatically
			   so the page still renders promptly. */
			nestMaxBlanks: 400,

			/* ------------------------------------------------- GRAIN / BRUSH
			 * Brushed, patterned or directional stock cannot be rotated
			 * freely: the brush lines on every blank have to end up running
			 * the same way. The grain of the SHEET is taken to run along its
			 * LENGTH (the 2500 axis), which is how slit coil arrives.
			 *
			 * HOW TO SET IT ON A PART - a document custom property in
			 * SOLIDWORKS (File > Properties > Custom). No macro needed, and
			 * it can go on the Property Tab Builder form as a dropdown:
			 *
			 *   Grain Direction = Length   grain runs along the flat
			 *                              pattern's own X - rotations 0/180
			 *   Grain Direction = Width    grain runs along its own Y
			 *                              - rotations 90/270
			 *   Grain Direction = Any      no constraint (the default when
			 *                              the property is missing or blank)
			 *
			 * X / 0 / Horizontal are accepted for Length, Y / 90 / Vertical
			 * for Width, and None / Free for Any.
			 *
			 * Report.cfg must publish the property. There is an SM_Grain
			 * block in the [PART] variables for exactly this; without it the
			 * value is still picked up if it reaches the part's swcps.
			 * ------------------------------------------------------------- */
			grainEnabled: true,

			/* Custom property names searched, in order, before the SM_Grain
			   report variable. ADD A NAME to match your own template. */
			grainProperty: ['Grain Direction', 'Grain', 'SM Grain', 'Brush Direction'],

			/* Rotations allowed per grain value. Edit to suit the machine -
			   some shops accept 180 flips on brushed stock, some do not; for
			   a one-way brush use [0] and [90]. */
			grainRotations: {
				length: [0, 180],
				width: [90, 270],
			},

			/* Applied to parts with no grain property set. 'any' | 'length'
			   | 'width'. Set to 'length' to make the WHOLE job directional
			   without touching a single part. */
			grainDefault: 'any',
		},

		/* STEP 5 : Panel & Part Process page + Process Zones child page.
		   R15 dropped these as standalone pages; the data is still there. */
		panelProcessPage: true,

		/* ==================================================================
		 * COATING / SURFACE TREATMENT
		 * ------------------------------------------------------------------
		 * Red oxide, powdercoat, paint, PVD, galvanising - anything charged
		 * by surface area. Works on ANY resource; the rule table below says
		 * how the area is measured and how many sides get covered.
		 *
		 * TO ADD A RESOURCE (sheetmetal, hardware, ...): add one line to
		 * rules. TO CHANGE SIDES: edit the number. TO CHANGE HOW AREA IS
		 * MEASURED: pick another model, or add one to SC.coating.models.
		 *
		 *   model 'profile' - outside perimeter x length   (tube, angle, RHS)
		 *   model 'face'    - length x width               (sheet, panel)
		 *   model 'box'     - full envelope, all 6 faces
		 * ================================================================ */
		coating: {
			enabled: true,

			/* where the process name lives, first non-empty wins.
			   variables come from Report.cfg MBS_* blocks.                 */
			/* filled from the Property Tab Builder dropdowns.
			   'Surface Finish' decides the COST.
			   'RAL Colour'     decides only the swatch shown on screen.  */
			processProperties: ['MBS_Process', 'MBS_Finish', 'MBS_Coating', 'SMX_SurfaceFinish'],
			swcpsProperties: ['Surface Finish', 'Process', 'Coating'],
			colorProperties: ['MBS_RALColour', 'SMX_RALColour', 'RAL Colour'],
			defaultProcess: '',

			/* ------------------------------------------------------------
			 * RATES  (per m2)
			 * SWOOD exports only the processes it actually USED on a panel -
			 * 2 out of the 237 in Q.xml. So a weldment named POWDERCOAT
			 * would find no rate. This table is the price list instead.
			 *
			 *   '*'  = the rate for anything not listed below.
			 * Lookup order: this table -> '*' -> the report's own library.
			 *
			 * TO CHANGE A PRICE: edit one line. TO ADD A PROCESS: add one
			 * line. Names must match Q.xml / the property value exactly.
			 * ---------------------------------------------------------- */
			rates: {
				'*': 150,                      /* every RAL shade not listed */

				/* --- shop processes on steel ---------------------------- */
				'RED OXIDE': 45,        /* primer coat on MS   */
				'PAINT': 120,           /* wet paint topcoat   */
				'POWDERCOAT': 150,      /* powder topcoat      */
				'GALVANISED': 90,
				'BUFFING': 60,          /* SS mirror / satin   */
				'PVD': 900,             /* SS decorative       */

				/* --- premium RAL shades, from Q.xml --------------------- */
				'RAL 3004': 160, 'RAL 3004 - Purple Red': 160,
				'RAL 5013': 160, 'RAL 5013 - Cobalt Blue': 160,
				'RAL 6020': 160, 'RAL 6020 - Chrome Green': 160,
				'RAL 7016': 160, 'RAL 7016 - Anthracite Grey': 160,
				'RAL 8017': 160, 'RAL 8017 - Chocolate Brown': 160,
				'RAL 9005': 160, 'RAL 9005 - Jet Black': 160,

				/* --- lacquer / polish / sanding, from Q.xml ------------- */
				'Clear Lacquared': 80,
				'PU High Gloss Clear Lacquer': 130,
				'PU Matt Clear Lacquer': 75,
				'Hand Miror Polishing': 200,
				'UV Coating Line': 50,
				'Wide belt Sanding': 40,

				/* --- glues (charged per m2 of glue line) ---------------- */
				'Wood Glue': 2.5,
				'D4 Waterproof Wood Glue': 2.8,
				'Hotmelt PUR Glue': 3,
				'Polyurethane glue': 3.4,
			},

			/* ------------------------------------------------------------
			 * COLOUR SWATCHES
			 * The SWOODMat XML has no colour attribute, so the swatch is
			 * resolved here: exact map first, then the RAL family implied
			 * by the category, then nothing.
			 *
			 * TO PIN A COLOUR EXACTLY: add it to colors below. Works for
			 * any process name, not just RAL - 'RED OXIDE', 'PVD GOLD'...
			 * Screen hex can only approximate a physical RAL chip.
			 * ---------------------------------------------------------- */
			showSwatch: true,

			colors: {
				/* --- non-RAL shop processes ---------------------------- */
				'RED OXIDE': '#8B3A2E',
				'POWDERCOAT': '#5B6770',
				'PVD': '#B8912F',
				'Paint': '#C8C8C8',
				'White paint': '#F2F2F0',
				'Clear Lacquared': '#E8E0CC',
				'PU High Gloss Clear Lacquer': '#EDE6D2',
				'PU Matt Clear Lacquer': '#E3DCC8',
				'UV Coating Line': '#DCD8C4',
				'Wide belt Sanding': '#C4B49A',
				'Wood Glue': '#D9C9A3',
				'D4 Waterproof Wood Glue': '#E4D9BC',
				'Hotmelt EVA Glue': '#E8E2CF',
				'Hotmelt PUR Glue': '#DED6BE',
				'Polyurethane glue': '#D6CBA8',
				'Miror Polishing': '#C9CDD1',
				'Hand Miror Polishing': '#D5D9DD',

				/* --- RAL Classic, the shades in common use ------------- */
				'RAL 1013': '#EAE6CA', 'RAL 1015': '#E6D2B5', 'RAL 1018': '#F3E03B',
				'RAL 1021': '#F3BA00', 'RAL 1023': '#FAD201', 'RAL 1028': '#FF9B00',
				'RAL 2004': '#E75B12', 'RAL 2008': '#F44611', 'RAL 2011': '#EC7C25',
				'RAL 3000': '#AB2524', 'RAL 3001': '#A02128', 'RAL 3002': '#A1232B',
				'RAL 3003': '#8D1D2C', 'RAL 3005': '#5E2028', 'RAL 3020': '#C1121C',
				'RAL 4003': '#DE4C8A', 'RAL 4006': '#A03472', 'RAL 4008': '#8A4A7C',
				'RAL 5002': '#20214F', 'RAL 5005': '#1D1E33', 'RAL 5010': '#0E294B',
				'RAL 5012': '#0089B6', 'RAL 5015': '#007CB0', 'RAL 5017': '#005B8C',
				'RAL 6000': '#587E71', 'RAL 6001': '#316E4B', 'RAL 6002': '#28683B',
				'RAL 6005': '#0E4243', 'RAL 6018': '#57A639', 'RAL 6029': '#00683B',
				'RAL 7016': '#383E42', 'RAL 7021': '#2F3234', 'RAL 7032': '#B9B9A8',
				'RAL 7035': '#D7D7D7', 'RAL 7038': '#B5B8B1', 'RAL 7040': '#9DA3A6',
				'RAL 7042': '#8F9695', 'RAL 7047': '#C8C8C7',
				'RAL 8001': '#9C6B30', 'RAL 8014': '#4A3526', 'RAL 8017': '#442F29',
				'RAL 9001': '#EFEBDC', 'RAL 9002': '#DDDED4', 'RAL 9003': '#F4F4F4',
				'RAL 9005': '#0A0A0A', 'RAL 9006': '#A5A5A5', 'RAL 9007': '#8F8F8F',
				'RAL 9010': '#F1ECE1', 'RAL 9011': '#27292B', 'RAL 9016': '#F6F6F6',
				'RAL 9017': '#2A2A2C', 'RAL 9018': '#CFD3CD',
			},

			/* fallback tint by RAL family, so every row still shows something */
			categoryColors: {
				'10XX': '#E8C547', '20XX': '#E8752A', '30XX': '#B02A2A',
				'40XX': '#8A4A7C', '50XX': '#1F5C8B', '60XX': '#3E7A4F',
				'70XX': '#9AA0A2', '80XX': '#7A5230', '90XX': '#CFCFCF',
			},

			/* ------------------------------------------------------------
			 * AUTOMATIC ASSIGNMENT
			 * Nothing to type in SolidWorks for the normal cases - the
			 * material already says what the finish is.
			 *
			 * Order of precedence, first hit wins:
			 *   1. body property   MBS_Process / MBS_Finish / MBS_Coating
			 *   2. cut-list keyword                     (keywords below)
			 *   3. product / project property           swcpsProperties
			 *   4. material rule                        byMaterial below
			 *   5. defaultProcess
			 *
			 * A rule may list SEVERAL coats - MS pipe is primed then
			 * topcoated, and both are charged. Area is counted once per
			 * coat, so 2 coats = 2 x the area cost.
			 *
			 * TO ADD A MATERIAL: add one line. `match` is a regular
			 * expression tested against the material name.
			 * ---------------------------------------------------------- */
			byMaterial: [
				/* mild steel: primer + topcoat */
				{ match: /^PROS_|^MS[_ -]|mild.?steel/i, process: ['RED OXIDE', 'POWDERCOAT'] },
				{ match: /^GI[_ -]|galvani/i,            process: [] },

				/* stainless: no primer, decorative finish only */
				{ match: /^SS[_ -]|stainless|AISI\s*3\d\d|\b304\b|\b316\b/i, process: ['BUFFING'] },

				/* SolidWorks default material names on sheet metal parts */
				{ match: /plain\s*carbon\s*steel|^MS\b|mild/i, process: ['RED OXIDE', 'POWDERCOAT'] },
				{ match: /galvani/i, process: [] },

				/* aluminium */
				{ match: /^AL[_ -]|alumin/i, process: ['POWDERCOAT'] },
			],

			/* words in the cut-list folder name that name a finish */
			keywords: {
				'PVD': ['PVD'],
				'BUFFING': ['BUFF', 'MIRROR', 'SATIN'],
				'GALVANISED': ['GALV', 'GI'],
				'POWDERCOAT': ['PC', 'POWDER'],
				'PAINT': ['PAINT'],
				'RED OXIDE': ['PRIMER', 'RED OXIDE'],
			},

			rules: {
				weldments:       { sides: 1, model: 'profile' },
				sheetmetalParts: { sides: 2, model: 'blank' },
				panels:          { sides: 2, model: 'face' },
				stocks:          { sides: 2, model: 'face' },
			},
		},

		/* ==================================================================
		 * FRAMES
		 * ------------------------------------------------------------------
		 * A SUBFRAME is part of a FRAME. With groupSubFrames:true a panel in
		 * Back_DOWN_CABINET_ONE_PROD_1 is reported under its parent frame
		 * DOWN_CABINET_ONE_PROD, so "split by Frame" gives one group per
		 * product instead of one per sub-assembly.
		 * Set false to go back to grouping by the nearest sub-frame.
		 * Affects Patterns, Patterned Panels and both Process pages.
		 * ================================================================ */
		frames: { groupSubFrames: true },

		/* ==================================================================
		 * SIDEBAR ICONS
		 * Any Material Symbols Outlined name works. Good finishing ones:
		 *   format_paint       paint bucket + brush
		 *   imagesearch_roller paint roller
		 *   brush              brush
		 *   palette            colour palette
		 *   format_color_fill  fill with colour
		 *   colorize           eyedropper
		 *   texture            hatched surface
		 *   water_drop         coating / dip
		 * Browse the full set at fonts.google.com/icons
		 * ================================================================ */
		icons: {
			sawMachineData: 'content_cut',
			glassMirror: 'window',
			panelProcess: 'format_paint',
			processZones: 'palette',
			sheetMetalParts: 'construction',      /* Sheetmetal Parts     */
			sheetMetalLayout: 'grid_on',          /* Sheetmetal Layout    */
			sheetMetalQty: 'table_chart',         /* Sheetmetal Quantities*/
		},

		/* Which document holds the sheet metal part's eDrawings file.
		   Now '' - both eDrawings blocks for parts are commented out in
		   Report.cfg, so there is nothing to point at and the Sheet Metal Part
		   page shows the still image with no 3D toggle.

		   For the record, from report-data-raw.js:
		     EDRAWINGS_SHEETMETAL  status 3, absoluteURI "", exists false
		                           (the typed-object block never produced a file)
		     EDRAWINGS_PART        status 2, exists true
		                           (produced a 2 KB placeholder with no geometry,
		                            plus a 7 MB duplicate of the whole assembly)

		   TO BRING THE 3D VIEWER BACK: un-comment [EDRAWINGS_PART] in
		   Report.cfg, tighten its CONDITION so it stops matching assemblies,
		   and set this to 'documents.EDRAWINGS_PART.relativeURI'. */
		sheetMetalEdrawings: '',

		/* currency symbol used by the cost columns */
		currency: '\u20B9',

		/* ==================================================================
		 * SUMMARY (Mgmt page)
		 * ------------------------------------------------------------------
		 * costFactor is the factory multiplier applied to the grand total.
		 * The box on the page is clamped to min..max and steps by 'step'.
		 * 'factor' elsewhere is the separate CLIENT markup percentage.
		 *
		 * countertopWords: Corian / stone has no material flag of its own,
		 * unlike GLASS and HARDWOOD, so section 5 matches on the material
		 * name or its description. Add your own words here.
		 * ================================================================== */
		/* ==================================================================
		 * WELDMENTS - bar stock
		 * ------------------------------------------------------------------
		 * Tube is bought in fixed lengths, so the useful number is how many
		 * BARS the job consumes, not how many metres. stockLength is the
		 * purchased length in mm, kerf the saw cut, trim the unusable end.
		 *
		 * density is g/cm3 for the procurement weight. SOLIDWORKS reports part
		 * MASS using the material density, and PROS_20x20x2 has MAT_DENSITY
		 * 1000 - the default, i.e. never set - so MASS is really a volume. The
		 * page recovers the true section from it and applies this density.
		 * Set MAT_DENSITY properly in the material library and it is used
		 * instead.
		 *
		 * lock.defaultLocked : page opens as a frozen cutting plan.
		 * lock.freezeOnLock  : while locked, the nest is the issued snapshot
		 *                      and does not recompute.
		 * Click Open (or press Enter) to edit; Issue & lock freezes again.
		 * ================================================================== */
		weldments: {
			stockLength: 6000, kerf: 5, trim: 0, density: 7.85,
			lock: { defaultLocked: true, freezeOnLock: true },
		},

		summary: {
			costFactor: { value: 1.5, min: 1.5, max: 1.75, step: 0.05 },
			countertopWords: ['CORIAN', 'QUARTZ', 'COUNTERTOP', 'WORKTOP',
				'GRANITE', 'MARBLE', 'SOLID SURFACE'],
		},

		/* ==================================================================
		 * QUANTITY  — one property per level, nothing else.
		 * ------------------------------------------------------------------
		 * PRODUCT level  (each TOTYPE=FRAME assembly)
		 *     'Product Quantity'  = how many of THAT product the customer
		 *                           ordered. This is the one you edit daily.
		 * PROJECT level  (the top assembly)
		 *     'Project Quantity'  = how many times the WHOLE order repeats.
		 *                           Normally 1. SWOOD reads this name itself.
		 *
		 *     panel qty = NB  x  Product Quantity  x  Project Quantity
		 *
		 * Project A, products 1/2/3 at 2/8/5 off:
		 *     product 1 assembly -> Product Quantity = 2
		 *     product 2 assembly -> Product Quantity = 8
		 *     product 3 assembly -> Product Quantity = 5
		 *     project assembly   -> Project Quantity = 1
		 *
		 * TO RENAME A PROPERTY LATER: change the string below. To accept an
		 * old name during changeover, add it to the matching fallbacks list -
		 * first match wins, so put the preferred name first.
		 * ================================================================ */
		quantity: {
			productProperty: 'Product Quantity',
			productFallbacks: ['PRODUCT_QTY'],   /* legacy name, delete once models are converted */

			projectProperty: 'Project Quantity',
			projectFallbacks: ['PROJECT_QTY'],   /* legacy name, delete once models are converted */

			/* force a batch for this session only; null = read the model */
			override: null,

			/* true = feed it through SWOOD's own multiplier so Panels, Stocks,
			   Edgebands, Programs, Hardware, Summary, Labels and Saw Machine
			   Data all follow. false = client pages only.                   */
			applyToAllPages: true,
		},

		/* STEP 2 : which stock routes the re-nest engine takes over.
		   Set any of these to false and SWOOD's own page comes back.       */
		takeOver: {
			patterns: true,         /* #/pattern-detailed-list  Nested Patterns */
			patternTable: true,     /* #/patterns               List of Patterns */
			patternedPanels: true,  /* #/patterned-panels       Patterned Panels */
			summary: true,     /* Mgmt / Client 1 / Client 2 overlay */         /* #/summary                costed summary   */
			sheetMetal: true,       /* #/sheetmetal-parts blanks, nesting, coating */
			panelProcesses: true,   /* #/panel-processes  built by the coating
			                           engine, so weldment + sheetmetal
			                           finishes appear, not just panels    */
			sawMachineData: false,  /* NEVER overlay Saw — keep SWOOD's own page */
			glassMirror: true,      /* overlay: glass/mirror only */
		},
	}

	/* ======================================================================
	 * PART 2 — CORE
	 * ==================================================================== */
	var U = {
		/* report-data-raw.js declares `const reportDataRaw`, which lives in the
		   global LEXICAL scope - it never becomes window.reportDataRaw. It has
		   to be read as a bare identifier or every lookup comes back empty. */
		raw: function () {
			try { return (typeof reportDataRaw !== 'undefined') ? reportDataRaw : null } catch (e) { return null }
		},
		num: function (v, p) {
			if (v === null || v === undefined || v === '') return ''
			var n = Number(v)
			return isNaN(n) ? v : n.toFixed(p === undefined ? 0 : p)
		},
		/* edgeband object on a panel row at position F | B | L | R */
		edge: function (row, pos) {
			var eb = row && row.edgebands
			if (!eb || !eb.length) return null
			for (var i = 0; i < eb.length; i++) {
				if (String(eb[i].position || '').toUpperCase() === pos) return eb[i]
			}
			return null
		},
		edgeName: function (row, pos) {
			var e = U.edge(row, pos)
			if (!e) return ''
			var m = e.material && e.material.name ? e.material.name : ''
			if (/\d\s*mm/i.test(m)) return m /* name already carries the thickness */
			var t = e.thickness ? String(parseFloat(Number(e.thickness).toFixed(2))) + 'mm' : ''
			return m && t ? m + '-' + t : m || t
		},
		/* VALSUR : one char per side in F,B,L,R order -> "TTTT" / "TTFF" */
		valsur: function (row) {
			return ['F', 'B', 'L', 'R'].map(function (p) {
				return U.edge(row, p) ? 'T' : 'F'
			}).join('')
		},
		/* project-level SolidWorks custom properties (Client, Customer, ItemNo) */
		projectSwcps: function () {
			if (U._psw) return U._psw
			U._psw = {}
			try {
				var d = U.raw()
				var arr = (d && d.swcps) || []
				for (var i = 0; i < arr.length; i++) U._psw[arr[i].name] = arr[i].value
			} catch (e) {}
			return U._psw
		},
		/* first non-empty value for a key: panel -> parent frame -> project */
		swcpsChain: function (row, keys) {
			var srcs = [row && row.swcps]
			if (row && row.frames) for (var f = 0; f < row.frames.length; f++) srcs.push(row.frames[f].swcps)
			srcs.push(U.projectSwcps())
			for (var i = 0; i < srcs.length; i++) {
				if (!srcs[i]) continue
				for (var k = 0; k < keys.length; k++) {
					var v = srcs[i][keys[k]]
					if (v !== undefined && v !== null && String(v) !== '') return String(v)
				}
			}
			return ''
		},
		reportDate: function () {
			try {
				var r = U.raw()
				var d = r && r.createdDate
				var x = d ? new Date(d) : new Date()
				return x.getDate() + '/' + (x.getMonth() + 1) + '/' + x.getFullYear()
			} catch (e) {
				return ''
			}
		},
		get: function (o, path) {
			var p = String(path).split('.')
			for (var i = 0; i < p.length && o != null; i++) o = o[p[i]]
			return o === undefined || o === null ? '' : o
		},
		/* Parses a tube section out of the SW material or cut-list description.
		   'PROS_40x20x1.5'                       -> {w:40, d:20, t:1.5}
		   'TUBE, RECTANGULAR 40.00 X 20.00 X 1.50' -> same
		   TO SUPPORT ANOTHER NAMING CONVENTION: add a regex to PATTERNS.    */
		section: function (row) {
			if (!row) return null
			if (row.__sec !== undefined) return row.__sec
			var v = row.variables || {}
			var txt = [v.MBS_Material, v.MBS_Description, row.description, row.name].join(' ')
			var PATTERNS = [
				/(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)/,
			]
			var sec = null
			for (var i = 0; i < PATTERNS.length; i++) {
				var m = PATTERNS[i].exec(txt)
				if (m) { sec = { w: parseFloat(m[1]), d: parseFloat(m[2]), t: parseFloat(m[3]) }; break }
			}
			try { Object.defineProperty(row, '__sec', { value: sec, enumerable: false }) } catch (e) {}
			return sec
		},
		/* outside perimeter of the section, mm */
		perimeter: function (row) {
			var s = U.section(row)
			return s ? 2 * (s.w + s.d) : 0
		},
		/* painted / coated area for the whole quantity, m2 */
		coatArea: function (row) {
			var per = U.perimeter(row)
			var len = parseFloat(row && row.length) || 0
			var qty = parseFloat(row && row.quantity) || 0
			return (per * len * qty) / 1e6
		},

		/* panel name by GUID, from the raw data (process zones only carry a ref) */
		panelName: function (id) {
			if (!U._pn) {
				U._pn = {}
				try {
					var d = U.raw()
					;((d && d.panels) || []).forEach(function (p) { U._pn[p.ID] = p.name })
				} catch (e) {}
			}
			return U._pn[id] || ''
		},
		/* process zones rolled up per panel process name.
		   SWOOD hardcodes panelProcess.quantity to 0, so cost is always 0
		   there. The real figures only exist on the zones - summed here. */
		zoneTotals: function (name) {
			if (!U._zt) {
				U._zt = {}
				try {
					var d = U.raw()
					;((d && d.processZones) || []).forEach(function (z) {
						var v = {}
						;(z.variables || []).forEach(function (x) { v[x.alias] = x.value })
						var k = z.panelProcess
						var t = U._zt[k] || (U._zt[k] = { zones: 0, qty: 0, cost: 0, unit: '' })
						t.zones++
						t.qty += parseFloat(v.PROC_ZONE_QTT) || 0
						t.cost += parseFloat(v.PROC_ZONE_COST) || 0
						t.unit = t.unit || v.PROC_ZONE_QTT_UNIT || ''
					})
				} catch (e) {}
			}
			return U._zt[name] || { zones: 0, qty: 0, cost: 0, unit: '' }
		},

		esc: function (t) {
			return String(t === undefined || t === null ? '' : t)
				.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
		},
		/* m2 -> ft2 */
		toSqft: function (m2) {
			var n = parseFloat(m2)
			return isNaN(n) ? '' : (n * 10.7639).toFixed(2)
		},
		/* bottomCalc helper: sum a field across the rows, fixed decimals.
		   Needed for calc-only columns, which have no field to sum. */
		sumBy: function (field, decimals, factor) {
			return function (values, data) {
				var t = 0
				;(data || []).forEach(function (r) { t += parseFloat(U.get(r, field)) || 0 })
				return (t * (factor || 1)).toFixed(decimals === undefined ? 2 : decimals)
			}
		},

		/* anchor to the panel detail page for a panel GUID */
		panelLink: function (guid) {
			var name = U.panelName(guid)
			if (!name) return ''
			if (!guid) return name
			return '<a class="swc-link" href="#/panels/' + guid + '-0">' + name + '</a>'
		},

		calc: function (fn) {
			return function (cell) {
				try {
					return fn(cell.getData(), cell) || ''
				} catch (e) {
					return ''
				}
			}
		},
	}

	/* config array -> tabulator column array */
	function buildColumns(defs) {
		var out = []
		for (var i = 0; i < defs.length; i++) {
			var d = defs[i]
			if (d.enabled === false) continue
			var c = {
				title: d.title,
				width: d.width,
				hozAlign: d.hozAlign,
				headerSort: d.headerSort !== false,
				cssClass: 'swc-col swc-col-' + d.key,
			}
			if (d.field) c.field = d.field
			if (d.calc) {
				c.field = c.field || 'swc_' + d.key
				c.formatter = U.calc(d.calc)
			}
			if (d.formatter) c.formatter = d.formatter
			if (d.formatterParams) c.formatterParams = d.formatterParams
			if (d.bottomCalc) c.bottomCalc = d.bottomCalc
			if (d.bottomCalcParams) c.bottomCalcParams = d.bottomCalcParams
			if (d.bottomCalcFormatter) c.bottomCalcFormatter = d.bottomCalcFormatter
			if (d.bottomCalcFormatterParams) c.bottomCalcFormatterParams = d.bottomCalcFormatterParams
			if (d.print === false) c.print = false
			out.push(c)
		}
		return out
	}

	/* --- quantity helpers ------------------------------------------------ */
	function swcpsMap(list) {
		var m = {}
		;(list || []).forEach(function (c) { m[c.name] = c.value })
		return m
	}

	/* first name in the list that carries a value > 0 */
	function readQty(list, primary, fallbacks) {
		var m = swcpsMap(list)
		var names = [primary].concat(fallbacks || [])
		for (var i = 0; i < names.length; i++) {
			var n = parseFloat(m[names[i]])
			if (n > 0) return n
		}
		return 0
	}

	function projectQty(swcpsList) {
		var q = CONFIG.quantity
		if (q.override > 0) return q.override
		return readQty(swcpsList, q.projectProperty, q.projectFallbacks)
	}

	function productQty(swcpsList) {
		var q = CONFIG.quantity
		return readQty(swcpsList, q.productProperty, q.productFallbacks)
	}

	/* kept for the re-nest engine, which asks for one overall batch number */
	function resolveQty(swcpsList) {
		return projectQty(swcpsList) || productQty(swcpsList)
	}

	var SC = {
		version: '6.16.3',
		config: CONFIG,
		util: U,
		resolveQty: resolveQty,
		projectQty: projectQty,
		productQty: productQty,
		buildColumns: buildColumns,
		columnSets: {},
		_pages: [],
		_menu: [],
		_cols: [],

		registerPage: function (page) {
			SC._pages.push(page)
			return SC
		},
		/* append columns to a page that already exists, instead of replacing
		   it. where: { pageId:'weldments', after:'quantity' | position:'end' } */
		registerColumns: function (pageId, defs, where) {
			SC._cols.push({ pageId: pageId, defs: defs, where: where || {} })
			return SC
		},

		/* where: { profiles:['default','shop'], after:'stocks' } */
		registerMenu: function (item, where) {
			SC._menu.push({ item: item, where: where || {} })
			return SC
		},

		/* ------------------------------------------------------------------
		 * Menu items vanish when their page has no rows. main.js does:
		 *
		 *     const page = pages.find(p => p.id === menuItem.id)
		 *     if (page?.type === 'table' && rows.length === 0) return null
		 *
		 * It looks the page up by ID. Give the menu item a different id and
		 * the lookup misses, the check never runs, and the entry stays put.
		 * Navigation uses `to`, so nothing else changes.
		 * ---------------------------------------------------------------- */
		makeMenuPersistent: function (item) {
			if (!CONFIG.alwaysShowMenu || !item) return item
			if (item.to && item.id && !/-menu$/.test(item.id)) item.id = item.id + '-menu'
			;(item.children || []).forEach(SC.makeMenuPersistent)
			return item
		},

		/* called from the bottom of view-settings.js */
		apply: function (vs) {
			if (!vs || SC._applied) return vs
			SC._applied = true

			SC._pages.forEach(function (p) {
				var ix = vs.pages.findIndex(function (x) { return x.id === p.id })
				if (ix >= 0) vs.pages[ix] = p
				else vs.pages.push(p)
			})

			/* extra columns on existing pages */
			SC._cols.forEach(function (c) {
				var page = vs.pages.find(function (x) { return x.id === c.pageId })
				if (!page || !page.table || !page.table.columns) return
				var cols = page.table.columns
				var add = buildColumns(c.defs).filter(function (n) {
					return !cols.some(function (o) { return o.field === n.field })
				})
				var at = cols.length
				if (c.where.after) {
					var i = cols.findIndex(function (o) { return o.field === c.where.after })
					if (i >= 0) at = i + 1
				} else if (c.where.position === 'start') at = 0
				cols.splice.apply(cols, [at, 0].concat(add))
			})

			SC._menu.forEach(function (m) {
				SC.makeMenuPersistent(m.item)
				var targets = m.where.profiles || ['default']
				vs.profiles.forEach(function (pr) {
					if (targets.indexOf(pr.id) < 0) return
					if (pr.menu.some(function (x) { return x.id === m.item.id })) return
					/* childOf nests the item inside an existing entry; after places
					   it as the next sibling. */
					if (m.where.childOf) {
						var par = pr.menu.find(function (x) { return x.id === m.where.childOf })
						if (par) {
							par.children = par.children || []
							if (!par.children.some(function (x) { return x.id === m.item.id })) par.children.push(m.item)
							return
						}
					}
					var at = pr.menu.length
					if (m.where.after) {
						var i = pr.menu.findIndex(function (x) { return x.id === m.where.after })
						if (i >= 0) at = i + 1
					}
					pr.menu.splice(at, 0, m.item)
				})
			})

			console.log('[SwoodClient ' + SC.version + '] ' + SC._pages.length + ' page(s) applied')
			return vs
		},
	}

	/* ======================================================================
	 * PART 3 — STEP 1 : SAW MACHINE DATA
	 * ----------------------------------------------------------------------
	 * ADD / REMOVE A COLUMN -> edit SAW_COLUMNS. enabled:false hides it and
	 * keeps the definition. Order here is the order on screen.
	 *   field : native path/expression (sortable, searchable, exportable)
	 *   calc  : function(row) -> string, for values with no native path
	 * ==================================================================== */
	var SAW_COLUMNS = [
		{ enabled: true, key: 'index',    title: 'INDEX',            field: 'swcps.ID',               width: 90,  hozAlign: 'center' },
		{ enabled: true, key: 'partname', title: 'Part Name',        field: 'name',                   width: 180,
		  formatter: 'link', formatterParams: { url: '/panels/:key' } },
		{ enabled: true, key: 'cutl',     title: 'CUT_L',            field: 'lengthWithoutEdgebands', width: 90,  hozAlign: 'right' },
		{ enabled: true, key: 'cutw',     title: 'CUT_W',            field: 'widthWithoutEdgebands',  width: 90,  hozAlign: 'right' },
		{ enabled: true, key: 'pthk',     title: 'P.THK',            field: 'thickness',              width: 80,  hozAlign: 'right' },
		{ enabled: true, key: 'qty',      title: 'Qty',              field: 'quantity',               width: 70,  hozAlign: 'right', bottomCalc: 'sum' },
		{ enabled: true, key: 'material', title: 'Material',         field: 'material.name',          width: 180 },
		{ enabled: true, key: 'texture',  title: 'Texture',          field: 'if(hasGrain, 1, 0)',     width: 80,  hozAlign: 'right' },

		{ enabled: true, key: 'edgeF',    title: 'Front Edge',       width: 130, headerSort: false,
		  calc: function (r) { return U.edgeName(r, 'F') } },
		{ enabled: true, key: 'edgeB',    title: 'Back Edge',        width: 130, headerSort: false,
		  calc: function (r) { return U.edgeName(r, 'B') } },
		{ enabled: true, key: 'edgeL',    title: 'Left Edge',        width: 130, headerSort: false,
		  calc: function (r) { return U.edgeName(r, 'L') } },
		{ enabled: true, key: 'edgeR',    title: 'Right Edge',       width: 130, headerSort: false,
		  calc: function (r) { return U.edgeName(r, 'R') } },

		{ enabled: false, key: 'valsur',  title: 'VALSUR',           width: 90,  headerSort: false,
		  calc: function (r) { return U.valsur(r) } },

		{ enabled: true, key: 'finaldim', title: 'Final Dim.',       width: 140, headerSort: false,
		  calc: function (r) { return U.num(r.length) + 'x' + U.num(r.width) + 'x' + U.num(r.thickness) } },

		{ enabled: true, key: 'partdesc', title: 'PART DESCRIPTION', field: 'swcps.Description',      width: 160 },
		{ enabled: true, key: 'product',  title: 'PRODUCT NAME',     width: 160, headerSort: false,
		  calc: function (r) { return U.get(r, 'swcps.Project Name') || U.get(r, 'frames.0.name') } },

		/* CNC = machine / barcode code. Uses the DOW-Pxx index naming. */
		{ enabled: true, key: 'cnc',      title: 'CNC',              width: 110, hozAlign: 'center', headerSort: false,
		  calc: function (r) { return U.swcpsChain(r, ['PanelID', 'ID']) } },

		{ enabled: true, key: 'customer', title: 'CUSTOMER',         width: 140, headerSort: false,
		  calc: function (r) { return U.swcpsChain(r, ['Customer', 'Client']) } },
		{ enabled: true, key: 'position', title: 'POSITION',         width: 120, headerSort: false,
		  calc: function (r) { return U.swcpsChain(r, ['ItemNo', 'Item No', 'Balloon', 'Position']) } },
		{ enabled: true, key: 'date',     title: 'DATE',             width: 110, headerSort: false,
		  calc: function () { return U.reportDate() } },
	]
	SC.columnSets.sawMachineData = SAW_COLUMNS

	/* Native SWOOD table only. Do not set takeOver.sawMachineData. */
	if (CONFIG.sawMachineData) {
		SC.registerPage({
			id: 'saw-machine-data',
			name: 'saw-machine-data',
			description: 'saw machine cutting data (client)',
			url: '/saw-machine-data',
			type: 'table',
			resource: 'panels',
			title: 'Saw Machine Data',
			header: 'Saw Machine Data',
			table: {
				title: 'List of Saw Machine Data',
				splitBy: [
					{ field: 'material.category', buttonLabel: 'Category' },
					{ field: 'material.name', buttonLabel: 'Material' },
					{ field: 'frames.name', buttonLabel: 'Frame', emptyValue: 'No Parent' },
				],
				/* Hide glass/mirror only. Same Tabulator page as before. */
				initialFilter: [
					{ field: 'swcps.GlassMirrorKind', type: '!=', value: 'Glass' },
					{ field: 'swcps.GlassMirrorKind', type: '!=', value: 'Mirror' },
					{ field: 'material.name', type: '!=', value: 'GLASS' },
					{ field: 'material.name', type: '!=', value: 'MIRROR' },
				],
				columns: buildColumns(SAW_COLUMNS),
			},
		})

		SC.registerMenu(
			{
				id: 'saw-machine-data',
				to: '/saw-machine-data',
				label: 'Saw Machine Data',
				icon: { name: (CONFIG.icons && CONFIG.icons.sawMachineData) || 'content_cut' },
				children: [],
			},
			{ profiles: ['default', 'shop'], after: 'stocks' }
		)
	}

	var GM_COLUMNS = [
		{ enabled: true, key: 'gmkind', title: 'Type', field: 'swcps.GlassMirrorKind', width: 90 },
	].concat(SAW_COLUMNS)

	if (CONFIG.glassMirrorPage) {
		SC.registerPage({
			id: 'glass-mirror',
			name: 'glass-mirror',
			description: 'glass and mirror panels only',
			url: '/glass-mirror',
			type: 'table',
			resource: 'panels',
			title: 'Glass & Mirror',
			header: 'Glass & Mirror',
			table: {
				title: 'List of Glass & Mirror',
				splitBy: [
					{ field: 'material.category', buttonLabel: 'Category' },
					{ field: 'frames.name', buttonLabel: 'Frame', emptyValue: 'No Parent' },
					{ field: 'material.name', buttonLabel: 'Material' },
				],
				initialFilter: [],
				columns: buildColumns(GM_COLUMNS),
			},
		})

		SC.registerMenu(
			{
				id: 'glass-mirror',
				to: '/glass-mirror',
				label: 'Glass & Mirror',
				icon: { name: (CONFIG.icons && CONFIG.icons.glassMirror) || 'window' },
				children: [],
			},
			{ profiles: ['default', 'shop'], after: 'saw-machine-data-menu' }
		)
	}

	/* ======================================================================
	 * COATING ENGINE — resource independent
	 * ----------------------------------------------------------------------
	 * SWOOD only creates process ZONES for panels. Weldments and sheetmetal
	 * have none, so the process is named on the body (a cut-list property)
	 * and the area is derived from its geometry here.
	 * ==================================================================== */
	var CUR = { symbol: CONFIG.currency || '\u20B9' }
	var COAT = CONFIG.coating || { enabled: false, rules: {} }

	SC.coating = {
		/* --- surface area models, mm in / m2 out (one side, qty 1) ------- */
		models: {
			profile: function (r) {
				return (U.perimeter(r) * (parseFloat(r.length) || 0)) / 1e6
			},
			/* net flat-pattern area from the cut list, notches and cut-outs
			   already deducted. Falls back to L x W when absent. */
			blank: function (r) {
				if (r && r.blankMm2 > 0) return r.blankMm2 / 1e6
				return SC.coating.models.face(r)
			},
			face: function (r) {
				var L = parseFloat(r.length) || parseFloat(U.get(r, 'panel.length')) || 0
				var W = parseFloat(r.width) || parseFloat(U.get(r, 'panel.width')) || 0
				return (L * W) / 1e6
			},
			box: function (r) {
				var L = parseFloat(r.length) || 0
				var W = parseFloat(r.width) || 0
				var T = parseFloat(r.thickness) || 0
				return (2 * (L * W + L * T + W * T)) / 1e6
			},
		},

		/* category of a process, from SWOOD's exported process library */
		category: function (name) {
			SC.coating._lib || SC.coating.rate(name)   /* builds the cache */
			return (SC.coating._cat && SC.coating._cat[name]) || ''
		},

		/* hex for a process: exact map -> RAL family from its category */
		color: function (name) {
			if (!name) return ''
			var c = COAT.colors || {}
			if (c[name]) return c[name]
			var trimmed = String(name).trim()
			if (c[trimmed]) return c[trimmed]
			var cat = SC.coating.category(name)
			var m = /^(\d0XX)/.exec(cat) || /(\d0XX)/.exec(cat)
			if (m && COAT.categoryColors && COAT.categoryColors[m[1]]) return COAT.categoryColors[m[1]]
			return ''
		},

		/* value of the RAL Colour dropdown, if one was picked */
		pickedColour: function (row) {
			var v = (row && row.variables) || {}
			var names = COAT.colorProperties || []
			for (var i = 0; i < names.length; i++) {
				if (v[names[i]]) return String(v[names[i]]).trim()
			}
			return U.swcpsChain(row, ['RAL Colour']) || ''
		},

		/* name with a colour chip in front of it.
		   colourAs overrides which name the chip is taken from. */
		swatch: function (name, colourAs) {
			if (!name) return ''
			if (COAT.showSwatch === false) return U.esc(name)
			var hex = SC.coating.color(colourAs || name)
			var chip = hex
				? '<span class="swc-swatch" style="background:' + hex + '"></span>'
				: '<span class="swc-swatch swc-swatch-none"></span>'
			return chip + U.esc(name)
		},

		rule: function (resource) {
			return (COAT.rules && COAT.rules[resource]) || { sides: 1, model: 'face' }
		},

		/* material name of a row, whatever resource it came from */
		material: function (row) {
			var v = (row && row.variables) || {}
			return String(v.MBS_Material || U.get(row, 'material.name') || v.ST_MATERIAL || '')
		},

		/* every coat on a row, in application order. See the precedence
		   note in CONFIG.coating. Returns an array of process names. */
		processes: function (row) {
			var v = (row && row.variables) || {}

			/* 1. named on the body - comma separated for two coats */
			var names = COAT.processProperties || []
			for (var i = 0; i < names.length; i++) {
				if (v[names[i]]) {
					return String(v[names[i]]).split(/[,+]/).map(function (x) { return x.trim() }).filter(Boolean)
				}
			}

			/* 2. keyword in the cut-list folder name */
			var text = String(row.cutlist || v.MBS_Cutlist || row.name || '').toUpperCase()
			var kw = COAT.keywords || {}
			for (var proc in kw) {
				var words = kw[proc] || []
				for (var k = 0; k < words.length; k++) {
					if (text.indexOf(String(words[k]).toUpperCase()) >= 0) return [proc]
				}
			}

			/* 3. product / project custom property */
			var sw = U.swcpsChain(row, COAT.swcpsProperties || [])
			if (sw) return sw.split(/[,+]/).map(function (x) { return x.trim() }).filter(Boolean)

			/* 4. material rule */
			var mat = SC.coating.material(row)
			var rules = COAT.byMaterial || []
			for (var m = 0; m < rules.length; m++) {
				if (mat && rules[m].match && rules[m].match.test(mat)) {
					return [].concat(rules[m].process || [])
				}
			}

			/* 5. default */
			return COAT.defaultProcess ? [COAT.defaultProcess] : []
		},

		/* first coat, kept for single-process callers */
		process: function (row) {
			return SC.coating.processes(row)[0] || ''
		},

		/* rate per m2: CONFIG override first, then SWOOD's process library */
		rate: function (name) {
			if (!name) return 0
			var R = COAT.rates || {}
			if (R[name] !== undefined) return parseFloat(R[name]) || 0
			var t = String(name).trim()
			if (R[t] !== undefined) return parseFloat(R[t]) || 0
			if (!SC.coating._lib) {
				SC.coating._lib = {}
				SC.coating._cat = {}
				var d = U.raw()
				;((d && d.panelProcesses) || []).forEach(function (pp) {
					var v = {}
					;(pp.variables || []).forEach(function (x) { v[x.alias] = x.value })
					if (!v.PROC_NAME) return
					SC.coating._lib[v.PROC_NAME] = parseFloat(v.PROC_UCOST) || 0
					SC.coating._cat[v.PROC_NAME] = v.PROC_CAT || ''
				})
			}
			if (SC.coating._lib[name]) return SC.coating._lib[name]
			return R['*'] !== undefined ? parseFloat(R['*']) || 0 : 0
		},

		/* coated sides: per-body override, else the rule */
		sides: function (row, resource) {
			var v = (row && row.variables) || {}
			var o = parseFloat(v.MBS_CoatSides) || parseFloat(v.SMX_CoatSides)
			if (!(o > 0)) o = parseFloat(U.swcpsChain(row, ['Coat Sides', 'CoatSides']))
			return o > 0 ? o : SC.coating.rule(resource).sides
		},

		/* total coated area in m2 for the whole quantity */
		areaM2: function (row, resource) {
			var rule = SC.coating.rule(resource)
			var model = SC.coating.models[rule.model] || SC.coating.models.face
			var one = model(row) || 0
			var qty = parseFloat(row && row.quantity) || 0
			return one * SC.coating.sides(row, resource) * qty
		},

		/* sum of the rates of every coat */
		rateTotal: function (row) {
			var t = 0
			SC.coating.processes(row).forEach(function (n) { t += SC.coating.rate(n) })
			return t
		},

		cost: function (row, resource) {
			return SC.coating.areaM2(row, resource) * SC.coating.rateTotal(row)
		},

		/* the same five columns for any page. Drop into a column list with
		   .concat(SC.coating.columns('weldments'))                        */
		columns: function (resource) {
			return [
				/* PROCESS = what is done (POWDERCOAT / PAINT / RED OXIDE / PVD).
				   SHADE   = which colour (RAL xxxx / GOLD / BLACK). Two
				   separate columns so both can be sorted and exported. */
				/* links across to Panel & Part Process, filtered to this finish */
				{ enabled: true, key: 'coatproc', title: 'Process', width: 190, headerSort: false,
				  calc: function (r) {
					  var n = SC.coating.processes(r).join(' + ')
					  if (!n) return ''
					  return '<a class="swc-link" href="#/panel-processes/zones?q=' +
						  encodeURIComponent(n) + '">' + U.esc(n) + '</a>'
				  } },
				{ enabled: true, key: 'coatshade', title: 'Shade', width: 150, headerSort: false,
				  calc: function (r) {
					  var sh = SC.coating.pickedColour(r)
					  return sh ? SC.coating.swatch(sh) : ''
				  } },
				{ enabled: true, key: 'coatsides', title: 'Sides', width: 80, hozAlign: 'right', headerSort: false,
				  calc: function (r) { return SC.coating.process(r) ? String(SC.coating.sides(r, resource)) : '' } },
				{ enabled: true, key: 'coatm2', title: 'Coat Area m\u00B2', width: 130, hozAlign: 'right', headerSort: false,
				  calc: function (r) { var a = SC.coating.areaM2(r, resource); return a ? a.toFixed(3) : '' },
				  bottomCalc: function (values, data) {
					  var t = 0
					  ;(data || []).forEach(function (r) { t += SC.coating.areaM2(r, resource) })
					  return t.toFixed(3)
				  } },
				{ enabled: true, key: 'coatft2', title: 'Coat Area ft\u00B2', width: 130, hozAlign: 'right', headerSort: false,
				  calc: function (r) { var a = SC.coating.areaM2(r, resource); return a ? U.toSqft(a) : '' },
				  bottomCalc: function (values, data) {
					  var t = 0
					  ;(data || []).forEach(function (r) { t += SC.coating.areaM2(r, resource) })
					  return U.toSqft(t)
				  } },
				{ enabled: true, key: 'coatrate', title: 'Rate/m\u00B2', width: 110, hozAlign: 'right', headerSort: false,
				  calc: function (r) { var x = SC.coating.rateTotal(r); return x ? CUR.symbol + x.toFixed(2) : '' } },
				{ enabled: true, key: 'coatcost', title: 'Coat Cost', width: 130, hozAlign: 'right', headerSort: false,
				  calc: function (r) { var c = SC.coating.cost(r, resource); return c ? CUR.symbol + c.toFixed(2) : '' },
				  bottomCalc: function (values, data) {
					  var t = 0
					  ;(data || []).forEach(function (r) { t += SC.coating.cost(r, resource) })
					  return CUR.symbol + t.toFixed(2)
				  } },
			]
		},
	}

	/* ======================================================================
	 * STEP 3 — WELDMENTS PAGE
	 * ----------------------------------------------------------------------
	 * Section / Width / Depth / Wall Thk are parsed from the SW material or
	 * cut-list description (PROS_40x20x1.5 -> 40 x 20 x 1.5).
	 * Total Length, Coated Perim. and Coat Area are computed here, NOT taken
	 * from SWCLP.TOTAL LENGTH - that is a per-cut-list-folder figure and
	 * repeats the same number on every body, which is what you were seeing.
	 *
	 * Cut-list columns need their MBS_* block in Report.cfg.
	 * ==================================================================== */
	var SQFT_PER_M2 = 10.7639

	var WELDMENT_COLUMNS = [
		{ enabled: true,  key: 'wname',    title: 'Part Name',     field: 'name',                        width: 340 },
		{ enabled: true,  key: 'wsection', title: 'Section',       width: 110, headerSort: false,
		  calc: function (r) { var s = U.section(r); return s ? U.num(s.w) + ' x ' + U.num(s.d) : '' } },
		{ enabled: true,  key: 'wwidth',   title: 'Width',         width: 90, hozAlign: 'right', headerSort: false,
		  calc: function (r) { var s = U.section(r); return s ? U.num(s.w) : '' } },
		{ enabled: true,  key: 'wdepth',   title: 'Depth',         width: 90, hozAlign: 'right', headerSort: false,
		  calc: function (r) { var s = U.section(r); return s ? U.num(s.d) : '' } },
		{ enabled: true,  key: 'wwall',    title: 'Wall Thk',      width: 100, hozAlign: 'right', headerSort: false,
		  calc: function (r) { var s = U.section(r); return s ? String(s.t) : '' } },
		{ enabled: true,  key: 'wmat',     title: 'Material',      field: 'variables.MBS_Material',      width: 170 },
		{ enabled: true,  key: 'wlen',     title: 'Length',        field: 'length',                      width: 100, hozAlign: 'right' },
		{ enabled: true,  key: 'wang1',    title: 'Angle 1',       field: 'angle1',                      width: 110, hozAlign: 'right' },
		{ enabled: true,  key: 'wang2',    title: 'Angle 2',       field: 'angle2',                      width: 110, hozAlign: 'right' },
		{ enabled: true,  key: 'wqty',     title: 'Qty',           field: 'quantity',                    width: 80,  hozAlign: 'right', bottomCalc: 'sum' },
		{ enabled: true,  key: 'wtotlen',  title: 'Total Length',  width: 120, hozAlign: 'right', headerSort: false,
		  calc: function (r) { return U.num((parseFloat(r.length) || 0) * (parseFloat(r.quantity) || 0)) } },
		{ enabled: true,  key: 'wperim',   title: 'Coated Perim.', width: 120, hozAlign: 'right', headerSort: false,
		  calc: function (r) { var p = U.perimeter(r); return p ? U.num(p) : '' } },

		/* ---- cut-list properties (need MBS_* in Report.cfg) ------------- */
		{ enabled: false, key: 'wcutlist',  title: 'Cut-List',   field: 'cutlist',                      width: 260 },
		{ enabled: false, key: 'wangledir', title: 'Angle Dir',  field: 'variables.MBS_AngleDirection', width: 110 },
		{ enabled: false, key: 'wanglerot', title: 'Angle Rot',  field: 'variables.MBS_AngleRotation',  width: 110 },
		{ enabled: false, key: 'wdesc',     title: 'Description', field: 'description',                 width: 260 },
		{ enabled: false, key: 'wweight',   title: 'Weight',     field: 'variables.MBS_Weight',         width: 100, hozAlign: 'right', bottomCalc: 'sum' },
		{ enabled: false, key: 'wbbl',      title: 'BB L',       field: 'variables.MBS_BB_Length',      width: 90,  hozAlign: 'right' },
		{ enabled: false, key: 'wbbw',      title: 'BB W',       field: 'variables.MBS_BB_Width',       width: 90,  hozAlign: 'right' },
		{ enabled: false, key: 'wbbt',      title: 'BB T',       field: 'variables.MBS_BB_Thickness',   width: 90,  hozAlign: 'right' },
	]
	/* coating block appended from the engine - one line to move it to any
	   other page, one line to remove it */
	if (COAT.enabled) WELDMENT_COLUMNS = WELDMENT_COLUMNS.concat(SC.coating.columns('weldments'))
	SC.columnSets.weldments = WELDMENT_COLUMNS

	if (CONFIG.weldmentsPage) {
		SC.registerPage({
			id: 'weldments',
			name: 'weldments',
			description: 'list of all weldments in the project',
			url: '/weldments',
			type: 'table',
			resource: 'weldments',
			title: 'List of Weldments',
			table: {
				title: 'List of Weldments',
				/* NO treeBy. Grouping by cut-list emitted a parent row plus an
				   identical child row for every body - the doubled 40 / 20 / 20
				   lines. One flat row per weldment body instead.            */
				splitBy: [
					{ field: 'variables.MBS_Material', buttonLabel: 'Material' },
					{ field: 'cutlist', buttonLabel: 'Cut-List' },
				],
				columns: buildColumns(WELDMENT_COLUMNS),
			},
		})
	}

	/* ======================================================================
	 * STEP 4 — STOCKS PAGE
	 * ----------------------------------------------------------------------
	 * Two fixes:
	 *  1. treeBy removed. The stock config groups by CombineID and by size,
	 *     which produced a parent row plus one identical child row for every
	 *     panel - the duplicated 'Left_DOWN_CABINET...' lines.
	 *  2. Length / Width now show the SAWN size (without edgebands), which is
	 *     what the saw needs. Headers stay as they were.
	 * Set stocksPage:false in PART 1 to hand the page back to SWOOD.
	 * ==================================================================== */
	var STOCK_COLUMNS = [
		{ enabled: true, key: 'sid',    title: '#',         field: 'swcps.ID',    width: 70, hozAlign: 'center' },
		{ enabled: true, key: 'sname',  title: 'Part Name', field: 'panel.name',  width: 320,
		  formatter: 'link', formatterParams: { url: '/panels/:refPart' } },
		{ enabled: true, key: 'slen',   title: 'Length',    field: 'panel.lengthWithoutEdgebands', width: 140, hozAlign: 'right' },
		{ enabled: true, key: 'swid',   title: 'Width',     field: 'panel.widthWithoutEdgebands',  width: 140, hozAlign: 'right' },
		{ enabled: true, key: 'sthk',   title: 'Thickness', field: 'thickness',   width: 140, hozAlign: 'right' },
		{ enabled: true, key: 'smat',   title: 'Material',  field: 'material.name', width: 220 },
		{ enabled: true, key: 'sgrain', title: 'Grain',     field: 'material.hasGrain', width: 110, formatter: 'tickCross' },
		{ enabled: true, key: 'sqty',   title: 'Qty',       field: 'quantity',    width: 100, hozAlign: 'right', bottomCalc: 'sum' },
		/* the full panel size, if you ever want both on screen */
		{ enabled: false, key: 'sfinl', title: 'Final L',   field: 'panel.length', width: 120, hozAlign: 'right' },
		{ enabled: false, key: 'sfinw', title: 'Final W',   field: 'panel.width',  width: 120, hozAlign: 'right' },
	]
	SC.columnSets.stocks = STOCK_COLUMNS

	if (CONFIG.stocksPage) {
		SC.registerPage({
			id: 'stocks',
			name: 'stocks',
			description: 'list of all stocks in the project',
			url: '/stocks',
			type: 'table',
			resource: 'stocks',
			title: 'List of Stocks',
			table: {
				title: 'List of Stocks',
				splitBy: [
					{ field: 'material.name', buttonLabel: 'Material' },
					{ field: 'panel.frames.name', buttonLabel: 'Frame', emptyValue: 'No Parent' },
				],
				columns: buildColumns(STOCK_COLUMNS),
			},
		})
	}

	/* ======================================================================
	 * STEP 5 — PANEL & PART PROCESS  +  PROCESS ZONES
	 * ----------------------------------------------------------------------
	 * reportDataRaw carries panelProcesses and processZones, but R15's
	 * view-settings only uses them as a sub-table inside Panel Details -
	 * there is no top-level page and no menu entry, which is why the data
	 * exists in Data Viewer but appears nowhere in the sidebar.
	 * These two pages put them back.
	 * ==================================================================== */
	var PANEL_PROCESS_COLUMNS = [
		{ enabled: true, key: 'ppname',  title: 'Name',        width: 180, headerSort: false,
		  calc: function (r) { return SC.coating.swatch(r.name) } },
		{ enabled: true, key: 'ppdesc',  title: 'Description', field: 'description', width: 200 },
		{ enabled: true, key: 'ppcat',   title: 'Category',    field: 'category',    width: 200 },
		{ enabled: true, key: 'ppzones', title: 'Zones',       width: 90,  hozAlign: 'right', headerSort: false,
		  calc: function (r) { var t = U.zoneTotals(r.name); return t.zones || '' } },
		{ enabled: true, key: 'ppqty',   title: 'Qty m\u00B2',  width: 120, hozAlign: 'right', headerSort: false,
		  calc: function (r) { var t = U.zoneTotals(r.name); return t.qty ? t.qty.toFixed(3) : '' } },
		{ enabled: true, key: 'ppqtyft', title: 'Qty ft\u00B2', width: 120, hozAlign: 'right', headerSort: false,
		  calc: function (r) { var t = U.zoneTotals(r.name); return t.qty ? U.toSqft(t.qty) : '' } },
		{ enabled: false, key: 'ppunit', title: 'Unit',        width: 80,  headerSort: false,
		  calc: function (r) { return U.zoneTotals(r.name).unit } },
		{ enabled: true, key: 'ppcostu', title: 'Unit Cost',   field: 'costUnit',    width: 120, hozAlign: 'right',
		  formatter: 'money', formatterParams: CUR },
		{ enabled: true, key: 'ppcost',  title: 'Cost',        width: 130, hozAlign: 'right', headerSort: false,
		  calc: function (r) {
			  var t = U.zoneTotals(r.name)
			  return t.cost ? CUR.symbol + t.cost.toFixed(2) : ''
		  } },
		{ enabled: false, key: 'ppthk',   title: 'Thickness',  field: 'thickness',   width: 110, hozAlign: 'right' },
		{ enabled: false, key: 'ppctype', title: 'Cost Type',  field: 'costType',    width: 120 },
	]
	SC.columnSets.panelProcesses = PANEL_PROCESS_COLUMNS

	var PROCESS_ZONE_COLUMNS = [
		{ enabled: true, key: 'pzname', title: 'Zone',    field: 'name',              width: 150 },
		/* the zone only carries refPanel, so the name is looked up in raw data
		   and linked through to that panel's detail page */
		{ enabled: true, key: 'pzpan',  title: 'Panel / Part Name', width: 300, headerSort: false,
		  calc: function (r) { return U.panelLink(r.refPanel) } },
		{ enabled: true, key: 'pzproc', title: 'Process', width: 150, headerSort: false,
		  calc: function (r) { return SC.coating.swatch(U.get(r, 'panelProcess.name')) } },
		{ enabled: true, key: 'pzdesc', title: 'Finish',  field: 'panelProcess.description', width: 170 },
		/* 4 decimals: SWOOD reports zones like 0.0693 m2, and the default
		   2-decimal display rounded that to 0.07 */
		{ enabled: true, key: 'pzqty',  title: 'Qty m\u00B2', field: 'quantity', width: 120, hozAlign: 'right',
		  formatter: function (cell) {
			  var n = parseFloat(cell.getValue())
			  return isNaN(n) ? '' : n.toFixed(4)
		  },
		  bottomCalc: U.sumBy('quantity', 4) },
		{ enabled: true, key: 'pzqtyft', title: 'Qty ft\u00B2', width: 120, hozAlign: 'right', headerSort: false,
		  calc: function (r) { return U.toSqft(r.quantity) },
		  bottomCalc: U.sumBy('quantity', 2, 10.7639) },
		{ enabled: false, key: 'pzcost', title: 'Cost',    field: 'cost',              width: 130, hozAlign: 'right',
		  formatter: 'money', formatterParams: CUR,
		  bottomCalc: 'sum', bottomCalcFormatter: 'money', bottomCalcFormatterParams: CUR },
		/* SWOOD always reports zones in m2, so the unit column said 'm2' on
		   every row. The unit is in the two headers above instead. */
		{ enabled: false, key: 'pzuom', title: 'Unit',    field: 'unitOfMeasure',     width: 90 },
		{ enabled: false, key: 'pzmask', title: 'Mask',   field: 'mask',              width: 100 },
	]
	SC.columnSets.processZones = PROCESS_ZONE_COLUMNS

	if (CONFIG.sheetMetalPage) {
		var SM_MENU = [
			['sheetmetal-parts', 'Sheetmetal Parts', 'sheetMetalParts'],
			['sheetmetal-layout', 'Sheetmetal Layout', 'sheetMetalLayout'],
			['sheetmetal-quantities', 'Sheetmetal Quantities', 'sheetMetalQty'],
		]
		SM_MENU.forEach(function (m, i) {
			SC.registerMenu(
				{
					id: m[0],
					to: '/' + m[0],
					label: m[1],
					icon: { name: (CONFIG.icons && CONFIG.icons[m[2]]) || 'layers' },
					children: [],
				},
				{ profiles: ['default', 'shop'], after: i === 0 ? 'weldments' : SM_MENU[i - 1][0] + '-menu' }
			)
		})
	}

	if (CONFIG.panelProcessPage) {
		SC.registerPage({
			id: 'panel-processes',
			name: 'panel-processes',
			description: 'list of all panel and part processes in the project',
			url: '/panel-processes',
			type: 'table',
			resource: 'panelProcesses',
			title: 'Panel & Part Process',
			header: 'Panel & Part Process',
			table: {
				title: 'List of Panel & Part Processes',
				splitBy: [{ field: 'category', buttonLabel: 'Category' }],
				columns: buildColumns(PANEL_PROCESS_COLUMNS),
			},
		})

		SC.registerPage({
			id: 'process-zones',
			name: 'process-zones',
			description: 'list of all process zones in the project',
			url: '/panel-processes/zones',
			type: 'table',
			resource: 'processZones',
			title: 'Process Zones',
			header: 'Process Zones',
			table: {
				title: 'List of Process Zones',
				splitBy: [{ field: 'panelProcess.name', buttonLabel: 'Process' }],
				columns: buildColumns(PROCESS_ZONE_COLUMNS),
			},
		})

		/* second page under Weldments: how many stock bars the job needs */
		SC.registerMenu(
			{
				id: 'weldment-bars',
				to: '/weldment-bars',
				label: 'Bar Requirement',
				icon: { name: 'straighten' },
				children: [],
			},
			{ childOf: 'weldments' }
		)

		SC.registerMenu(
			{
				id: 'panel-processes',
				to: '/panel-processes',
				label: 'Panel & Part Process',
				icon: { name: (CONFIG.icons && CONFIG.icons.panelProcess) || 'format_paint' },
				children: [
					{
						id: 'process-zones',
						to: '/panel-processes/zones',
						label: 'Process Zones',
						icon: { name: (CONFIG.icons && CONFIG.icons.processZones) || 'palette' },
						children: [],
					},
				],
			},
			{ profiles: ['default', 'shop'], after: 'weldments' }
		)
	}

	/* ======================================================================
	 * STEP 6 — SHEET METAL PAGES  (native, like Saw Machine Data)
	 * ----------------------------------------------------------------------
	 * These are ordinary view-settings table pages on the `parts` resource,
	 * filtered to rows that carry a real SM_Thickness. That gives them the
	 * same fonts, sorting, search, split buttons, export and print as every
	 * other page - which the overlay versions did not have.
	 *
	 * The nesting numbers (Per Sheet / Sheets / Utilisation) are computed by
	 * the same engine the Layout page uses, so all three agree.
	 *
	 * ADD / REMOVE A COLUMN: edit the arrays below. enabled:false hides one.
	 * ==================================================================== */
	function smVar(r, alias) {
		var v = (r && r.variables) || {}
		var n = parseFloat(v[alias])
		return isNaN(n) ? 0 : n
	}
	function smText(r, alias) {
		var v = (r && r.variables) || {}
		return v[alias] === undefined || v[alias] === null ? '' : String(v[alias])
	}
	/* blank size, preferring the true flat pattern when one exists */
	function smBlank(r) {
		var g = SC.smGeometryFor ? SC.smGeometryFor(r.name) : null
		if (g && g.w > 0) return { L: g.w, W: g.h, geom: true }
		return { L: smVar(r, 'SM_BlankLength'), W: smVar(r, 'SM_BlankWidth'), geom: false }
	}
	function smBlankM2(r) {
		var a = smVar(r, 'SM_BlankArea')
		if (a > 0) return a / 1e6
		var b = smBlank(r)
		return (b.L * b.W) / 1e6
	}
	function smNestOf(r) {
		var b = smBlank(r)
		return SC.smNestFor ? SC.smNestFor(b.L, b.W) : { n: 0, sheet: null, orientation: '' }
	}
	function smQtyOf(r) {
		return parseFloat(r.quantity) || 0
	}

	var SM_IMAGE_COL = { enabled: true, key: 'smimg', title: '', width: 90,
		field: 'documents.IMG_PART.relativeURI', formatter: 'image', headerSort: false }

	var SHEETMETAL_COLUMNS = [
		SM_IMAGE_COL,
		{ enabled: true, key: 'smname',  title: 'Part Name', field: 'name', width: 260,
		  formatter: 'link', formatterParams: { url: '/sheetmetal-parts/:key' } },
		{ enabled: true, key: 'smmat',   title: 'Material',  field: 'variables.SM_Material', width: 160 },
		{ enabled: true, key: 'smthk',   title: 'Thk',       field: 'variables.SM_Thickness', width: 80, hozAlign: 'right' },
		{ enabled: false, key: 'smgauge', title: 'Gauge',    field: 'variables.SM_Gauge', width: 110 },
		/* Grain / brush direction. Blank means the part may be rotated
		   freely. Set the 'Grain Direction' custom property to Length or
		   Width to lock it - see CONFIG.sheetMetal.grainProperty. */
		{ enabled: true, key: 'smgrain', title: 'Grain', width: 100, headerSort: false,
		  calc: function (r) {
		  	var g = smText(r, 'SM_Grain');
		  	if (!g) {
		  		/* Report.cfg may not publish SM_Grain yet - read the raw
		  		   custom property straight off the part in that case */
		  		var want = ((SC.config && SC.config.sheetMetal &&
		  			SC.config.sheetMetal.grainProperty) || ['Grain Direction', 'Grain'])
		  			.map(function (x) { return String(x).toLowerCase().replace(/[^a-z0-9]/g, '') });
		  		;((r && r.swcps) || []).forEach(function (c) {
		  			var k = String(c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
		  			if (!g && want.indexOf(k) >= 0) g = c.value;
		  		});
		  	}
		  	if (!g) return '';
		  	var n = String(g).trim().toLowerCase();
		  	if (/^(length|l|x|0|horizontal)$/.test(n)) return 'Length \u2194';
		  	if (/^(width|w|y|90|vertical)$/.test(n)) return 'Width \u2195';
		  	return '';
		  } },
		{ enabled: true, key: 'smbl',    title: 'Blank L',   width: 100, hozAlign: 'right', headerSort: false,
		  calc: function (r) { return U.num(smBlank(r).L, 1) } },
		{ enabled: true, key: 'smbw',    title: 'Blank W',   width: 100, hozAlign: 'right', headerSort: false,
		  calc: function (r) { return U.num(smBlank(r).W, 1) } },
		{ enabled: true, key: 'smarea',  title: 'Blank m\u00b2', width: 110, hozAlign: 'right', headerSort: false,
		  calc: function (r) { return smBlankM2(r).toFixed(4) } },
		{ enabled: true, key: 'smbends', title: 'Bends',     field: 'variables.SM_Bends', width: 80, hozAlign: 'right' },
		{ enabled: true, key: 'smcuts',  title: 'Cut-outs',  field: 'variables.SM_CutOuts', width: 100, hozAlign: 'right' },
		{ enabled: true, key: 'smcutlen', title: 'Cut Len',  width: 110, hozAlign: 'right', headerSort: false,
		  calc: function (r) { return U.num(smVar(r, 'SM_CutLengthOuter') + smVar(r, 'SM_CutLengthInner'), 0) } },
		{ enabled: true, key: 'smqty',   title: 'Qty',       field: 'quantity', width: 80, hozAlign: 'right', bottomCalc: 'sum' },
		{ enabled: true, key: 'smproc',  title: 'Process',   width: 170, headerSort: false,
		  calc: function (r) { return SC.coating.processes(r).join(' + ') } },
		{ enabled: true, key: 'smshade', title: 'Shade',     width: 150, headerSort: false,
		  calc: function (r) { var sh = SC.coating.pickedColour(r); return sh ? SC.coating.swatch(sh) : '' } },
		{ enabled: true, key: 'smcoat',  title: 'Coat m\u00b2', width: 110, hozAlign: 'right', headerSort: false,
		  calc: function (r) { return SC.coating.areaM2(r, 'sheetmetalParts').toFixed(4) } },
		{ enabled: true, key: 'smcost',  title: 'Coat Cost', width: 130, hozAlign: 'right', headerSort: false,
		  calc: function (r) { var c = SC.coating.cost(r, 'sheetmetalParts'); return c ? CUR.symbol + c.toFixed(2) : '' } },
		{ enabled: false, key: 'smmass', title: 'Mass kg',   width: 110, hozAlign: 'right', headerSort: false,
		  calc: function (r) { return U.num(smVar(r, 'SM_Mass') * smQtyOf(r) / 1000, 2) } },
	]
	SC.columnSets.sheetMetal = SHEETMETAL_COLUMNS

	var SHEETMETAL_QTY_COLUMNS = [
		SM_IMAGE_COL,
		{ enabled: true, key: 'sqname', title: 'Part Name', field: 'name', width: 260,
		  formatter: 'link', formatterParams: { url: '/sheetmetal-parts/:key' } },
		{ enabled: true, key: 'sqmat',  title: 'Material',  field: 'variables.SM_Material', width: 160 },
		{ enabled: true, key: 'sqthk',  title: 'Thk',       field: 'variables.SM_Thickness', width: 80, hozAlign: 'right' },
		{ enabled: true, key: 'sqblank', title: 'Blank',    width: 150, headerSort: false,
		  calc: function (r) { var b = smBlank(r); return U.num(b.L, 1) + ' x ' + U.num(b.W, 1) } },
		{ enabled: true, key: 'sqshape', title: 'Shape',    width: 120, headerSort: false,
		  calc: function (r) { return smBlank(r).geom ? 'True flat pattern' : 'Bounding box' } },
		{ enabled: true, key: 'sqsheet', title: 'Stock Sheet', width: 140, headerSort: false,
		  calc: function (r) { var n = smNestOf(r); return n.sheet ? (n.sheet.L + ' x ' + n.sheet.W) : '' } },
		{ enabled: true, key: 'sqorient', title: 'Orientation', width: 130, headerSort: false,
		  calc: function (r) { return smNestOf(r).orientation || '' } },
		{ enabled: true, key: 'sqqty',  title: 'Qty',       field: 'quantity', width: 80, hozAlign: 'right', bottomCalc: 'sum' },
		{ enabled: true, key: 'sqper',  title: 'Per Sheet', width: 110, hozAlign: 'right', headerSort: false,
		  calc: function (r) { return String(smNestOf(r).n || '') } },
		{ enabled: true, key: 'sqsheets', title: 'Sheets',  width: 100, hozAlign: 'right', headerSort: false,
		  calc: function (r) {
			  var n = smNestOf(r)
			  return n.n ? String(Math.ceil(smQtyOf(r) / n.n)) : ''
		  } },
		{ enabled: true, key: 'squtil', title: 'Utilisation %', width: 130, hozAlign: 'right', headerSort: false,
		  calc: function (r) {
			  var n = smNestOf(r)
			  if (!n.n || !n.sheet) return ''
			  var sheets = Math.ceil(smQtyOf(r) / n.n)
			  var sheetArea = (n.sheet.L * n.sheet.W) / 1e6 * sheets
			  if (!sheetArea) return ''
			  return (100 * smBlankM2(r) * smQtyOf(r) / sheetArea).toFixed(1)
		  } },
		{ enabled: true, key: 'sqscrap', title: 'Scrap m\u00b2', width: 120, hozAlign: 'right', headerSort: false,
		  calc: function (r) {
			  var n = smNestOf(r)
			  if (!n.n || !n.sheet) return ''
			  var sheets = Math.ceil(smQtyOf(r) / n.n)
			  var scrap = (n.sheet.L * n.sheet.W) / 1e6 * sheets - smBlankM2(r) * smQtyOf(r)
			  return Math.max(0, scrap).toFixed(3)
		  } },
	]
	SC.columnSets.sheetMetalQty = SHEETMETAL_QTY_COLUMNS

	/* only parts with a real sheet metal thickness */
	var SM_FILTER = [{ field: 'variables.SM_Thickness', type: '>', value: 0 }]
	var SM_SPLIT = [
		{ field: 'variables.SM_Material', buttonLabel: 'Material' },
		{ field: 'variables.SM_Thickness', buttonLabel: 'Thickness' },
		{ field: 'variables.SM_Frame', buttonLabel: 'Frame', emptyValue: 'No Parent' },
	]

	if (CONFIG.sheetMetalPage) {
		SC.registerPage({
			id: 'sheetmetal-parts',
			name: 'sheetmetal-parts',
			description: 'sheet metal parts, blanks and finishing',
			url: '/sheetmetal-parts',
			type: 'table',
			resource: 'parts',
			title: 'Sheetmetal Parts',
			header: 'Sheetmetal Parts',
			table: {
				title: 'Sheetmetal Parts',
				initialFilter: SM_FILTER,
				splitBy: SM_SPLIT,
				columns: buildColumns(SHEETMETAL_COLUMNS),
			},
		})

		/* ------------------------------------------------------------------
		 * SHEET METAL PART DETAIL - same shape as SwoodReport's Panel Details
		 * (type 'layout' with a ranged grid), so it looks and prints like the
		 * rest of the report. Reached by clicking a part name.
		 *
		 * ADD A FIELD: add a cell. `range` is 'col,row:col,row' on a 12 wide
		 * grid, so 4,8:7,8 is columns 4-7 of row 8.
		 * ---------------------------------------------------------------- */
		/* ------------------------------------------------------------------
		 * SHEET METAL PART DETAIL
		 * A single grid. `type: 'table'` sections were tried and dropped:
		 * on a layout page a table section iterates a CHILD COLLECTION, and a
		 * part has none, so those sections rendered as nothing at all.
		 *
		 * ADD A FIELD: add a cell. `range` is 'col,row:col,row' on a 12 wide
		 * grid. Rows 1-9 are beside the picture, 10+ run full width.
		 * ---------------------------------------------------------------- */
		SC.registerPage({
			id: 'sheetmetal-part-details',
			name: 'sheetmetal-part-details',
			description: 'details of a single sheet metal part',
			url: '/sheetmetal-parts/:key',
			resource: 'parts',
			type: 'layout',
			title: 'Sheet Metal Part',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							/* Image down the whole left half; every field in the
							   right half. Full-width rows put cells UNDER the
							   picture, which is what made the page look broken.
							   Columns 7-9 and 10-12 give two fields per row. */
							{
								field: 'documents.IMG_PART.relativeURI',
								formatter: 'image',
								formatterParams: {
									edrawings: CONFIG.sheetMetalEdrawings,
								},
								range: '1,1:6,16',
							},

							{ field: 'name', prefix: 'Name: ', range: '7,1:12,1' },

							{ field: 'variables.SM_Material', prefix: 'Material: ', range: '7,2:9,2' },
							{ field: 'variables.SM_Thickness', prefix: 'Thickness: ', range: '10,2:12,2' },

							{ field: 'quantity', prefix: 'Quantity: ', range: '7,3:9,3' },
							{ field: 'variables.SM_Gauge', prefix: 'Gauge: ', range: '10,3:12,3' },

							{ field: 'variables.SM_Frame', prefix: 'Frame: ', range: '7,4:12,4' },
							{ field: 'variables.SM_SubFrame', prefix: 'Sub-frame: ', range: '7,5:12,5' },
							{ field: 'configuration', prefix: 'Configuration: ', range: '7,6:12,6' },

							{ field: 'variables.SMX_SurfaceFinish', prefix: 'Surface finish: ', range: '7,7:9,7' },
							{ field: 'variables.SMX_RALColour', prefix: 'Shade: ', range: '10,7:12,7' },

							{ field: 'variables.SMX_CoatSides', prefix: 'Coated sides: ', range: '7,8:9,8' },
							{ field: 'variables.SM_SurfaceTreatment', prefix: 'Surface treatment: ', range: '10,8:12,8' },

							{ field: 'variables.SM_BlankLength', prefix: 'Blank length: ', range: '7,9:9,9' },
							{ field: 'variables.SM_BlankWidth', prefix: 'Blank width: ', range: '10,9:12,9' },

							{ field: 'variables.SM_BlankArea', prefix: 'Blank area mm\u00b2: ', range: '7,10:9,10' },
							{ field: 'variables.SM_BBoxArea', prefix: 'Bounding area mm\u00b2: ', range: '10,10:12,10' },

							{ field: 'variables.SM_Bends', prefix: 'Bends: ', range: '7,11:9,11' },
							{ field: 'variables.SM_BendRadius', prefix: 'Bend radius: ', range: '10,11:12,11' },

							{ field: 'variables.SM_BendAllowance', prefix: 'Bend allowance: ', range: '7,12:9,12' },
							{ field: 'variables.SM_CutOuts', prefix: 'Cut-outs: ', range: '10,12:12,12' },

							{ field: 'variables.SM_CutLengthOuter', prefix: 'Cut length outer: ', range: '7,13:9,13' },
							{ field: 'variables.SM_CutLengthInner', prefix: 'Cut length inner: ', range: '10,13:12,13' },

							{ field: 'variables.SM_Mass', prefix: 'Mass g: ', range: '7,14:9,14' },
							{ field: 'variables.SM_Quantity', prefix: 'Cut-list qty: ', range: '10,14:12,14' },

							{ field: 'variables.SM_CutlistDesc', prefix: 'Cut-list folder: ', range: '7,15:12,15' },
							{ field: 'swcps.Description', prefix: 'Description: ', range: '7,16:12,16' },
						],
					},
				},
			],
		})

		/* A stub page for the Layout route. The page itself is drawn by the
		   overlay, but without a registered route SwoodReport shows its
		   not-found screen first - the dinosaur that flashes up before the
		   sheets appear. Registering it silences that. */
		SC.registerPage({
			id: 'sheetmetal-layout',
			name: 'sheetmetal-layout',
			description: 'sheet metal nesting layout',
			url: '/sheetmetal-layout',
			type: 'table',
			resource: 'parts',
			title: 'Sheetmetal Layout',
			header: 'Sheetmetal Layout',
			table: {
				title: 'Sheetmetal Layout',
				initialFilter: SM_FILTER,
				columns: buildColumns([
					{ enabled: true, key: 'slname', title: 'Part Name', field: 'name', width: 260 },
				]),
			},
		})

		SC.registerPage({
			id: 'sheetmetal-quantities',
			name: 'sheetmetal-quantities',
			description: 'sheet metal nesting quantities',
			url: '/sheetmetal-quantities',
			type: 'table',
			resource: 'parts',
			title: 'Sheetmetal Quantities',
			header: 'Sheetmetal Quantities',
			table: {
				title: 'Sheetmetal Quantities',
				initialFilter: SM_FILTER,
				splitBy: SM_SPLIT,
				columns: buildColumns(SHEETMETAL_QTY_COLUMNS),
			},
		})
	}

	/* ======================================================================
	 * FRAMES — 'Total' column
	 * ----------------------------------------------------------------------
	 * Total = Project Quantity  x  Product Quantity
	 *
	 * WHY THIS LIVES HERE AND NOT IN view-settings.js
	 * Product Quantity sits on the frame, but Project Quantity sits on the
	 * PROJECT, and a table column expression cannot reach up to it. Every
	 * expression form was tried against the real report:
	 *
	 *   quantity * swcps["Product Quantity"]   -> reads swcps[0]. The
	 *       expr-eval index operator is  function (i,e){ return i[e|0] },
	 *       and | 0 turns a string key into 0.
	 *   quantity * get(swcps,"Product Quantity",1) -> correct multiplier,
	 *       but 'quantity' is the frame's own count (1), not the project's.
	 *   get(root,"project.swcps.Project Quantity",1) * ...  -> «error».
	 *       'root' is not a variable in a table column's scope.
	 *
	 * A calc column is plain JavaScript, so it just reads both values.
	 *
	 * TO REMOVE THE COLUMN: delete this whole block.
	 * TO SHOW ONLY THE TOTAL: delete the 'Qty' column from the frames page
	 * in view-settings.js.
	 * ==================================================================== */
	function registerFrameTotal() {

		/* swcps arrives in two shapes: a list of { name, value } in the raw
		   data, and an object keyed by name on a table row. Read either. */
		function readProp(swcps, names) {
			if (!swcps) return 0
			var m = {}
			if (Object.prototype.toString.call(swcps) === '[object Array]') {
				for (var i = 0; i < swcps.length; i++) {
					if (swcps[i]) m[swcps[i].name] = swcps[i].value
				}
			} else {
				m = swcps
			}
			for (var j = 0; j < names.length; j++) {
				var n = parseFloat(m[names[j]])
				if (n > 0) return n
			}
			return 0
		}

		var Q = CONFIG.quantity
		var PROJ_NAMES = [Q.projectProperty].concat(Q.projectFallbacks || [])
		var PROD_NAMES = [Q.productProperty].concat(Q.productFallbacks || [])

		/* Project Quantity, read from the project's own properties. */
		function projectQuantity() {
			try {
				if (Q.override > 0) return Q.override
				var raw = (typeof reportDataRaw !== 'undefined') ? reportDataRaw : null
				if (!raw) return 1
				return readProp(raw.swcps, PROJ_NAMES) || 1
			} catch (e) { return 1 }
		}

		SC.registerColumns('frames', [
			{
				enabled: true,
				key: 'projqty',
				title: 'Project Qty',
				width: 120,
				hozAlign: 'right',
				headerSort: false,
				calc: function () { return String(projectQuantity()) },
			},
			{
				enabled: true,
				key: 'prodqty',
				title: 'Product Qty',
				width: 120,
				hozAlign: 'right',
				headerSort: false,
				calc: function (row) {
					return String(readProp(row && row.swcps, PROD_NAMES) || 1)
				},
			},
			{
				enabled: true,
				key: 'frametotal',
				title: 'Total',
				width: 120,
				hozAlign: 'right',
				headerSort: false,
				calc: function (row) {
					return String(projectQuantity() * (readProp(row && row.swcps, PROD_NAMES) || 1))
				},
				/* bottomCalc:'sum' adds up a FIELD, and this column has no real
				   field - the value comes from calc() - so the stock sum showed 0.
				   Tabulator also accepts a function, which gets the row data. */
				bottomCalc: function (values, data) {
					var proj = projectQuantity()
					var t = 0
					;(data || []).forEach(function (row) {
						t += proj * (readProp(row && row.swcps, PROD_NAMES) || 1)
					})
					return t
				},
			},
		], { pageId: 'frames', after: 'depth' })   /* 'quantity' column was removed */
	}

	registerFrameTotal()   /* must run in THIS IIFE - SC lives here */

	/* ======================================================================
	 * GLOBAL QUANTITY — make every stock page follow the batch size
	 * ----------------------------------------------------------------------
	 * SwoodReport already multiplies every getQuantity() by its own project
	 * quantity, which it reads from ONE SolidWorks custom property:
	 *
	 *     getProjectQuantity = () => swcps['Project Quantity'] ?? 1
	 *
	 * This model has PROJECT_QTY, not 'Project Quantity', so that multiplier
	 * stays at 1 and every page shows 1. Below we write the property into the
	 * raw data the moment it loads and before the app builds its model, which
	 * makes Panels / Stocks / Edgebands / Programs / Hardware / Summary /
	 * Labels / Saw Machine Data all pick up the same batch size.
	 *
	 * PERMANENT FIX: add a custom property literally named 'Project Quantity'
	 * to the assembly in SolidWorks. Then this hook does nothing.
	 * ==================================================================== */
	var SWOOD_QTY_PROP = 'Project Quantity'

	function varMap(o) {
		var m = {}
		;((o && o.variables) || []).forEach(function (v) { m[v.alias] = v.value })
		return m
	}
	function setVar(o, alias, value) {
		var list = (o && o.variables) || []
		for (var i = 0; i < list.length; i++) {
			if (list[i].alias === alias) { list[i].value = String(value); return }
		}
		list.push({ alias: alias, value: String(value) })
	}

	function setSwcp(o, name, value) {
		o.swcps = o.swcps || []
		if (Object.prototype.toString.call(o.swcps) === '[object Array]') {
			for (var i = 0; i < o.swcps.length; i++) {
				if (o.swcps[i] && o.swcps[i].name === name) {
					o.swcps[i].value = String(value)
					return
				}
			}
			o.swcps.push({ name: name, type: 'S', value: String(value) })
			return
		}
		o.swcps[name] = String(value)
	}

	function swcpGet(o, name) {
		if (!o || !o.swcps) return ''
		if (Object.prototype.toString.call(o.swcps) === '[object Array]') {
			for (var i = 0; i < o.swcps.length; i++) {
				if (o.swcps[i] && o.swcps[i].name === name) return String(o.swcps[i].value || '')
			}
			return ''
		}
		return o.swcps[name] != null ? String(o.swcps[name]) : ''
	}

	function glassMirrorKindOf(name, mv, panel) {
		var part = String(swcpGet(panel, 'Mirror') || swcpGet(panel, 'MIRROR') || '').toLowerCase()
		if (part === 'yes' || part === 'true' || part === '1') return 'Mirror'
		var n = String(name || '').toUpperCase()
		var desc = String((mv && (mv.MAT_DESC || mv.MAT_NAME)) || '').toUpperCase()
		var hay = n + ' ' + desc
		if ((mv && String(mv.MIRROR || '').toLowerCase() === 'true') || n === 'MIRROR' || /(^|[^A-Z])MIRROR/.test(hay)) return 'Mirror'
		if ((mv && String(mv.GLASS || '').toLowerCase() === 'true') || n === 'GLASS' || /\bGLASS\b/.test(hay)) return 'Glass'
		return ''
	}

	function stampGlassMirror(d) {
		if (!d || SC._gmStamped) return
		SC._gmStamped = true
		try {
			var byId = {}, byName = {}
			;(d.materials || []).forEach(function (m) {
				byId[m.ID] = m
				if (m.name) byName[m.name] = m
				var mv0 = varMap(m)
				if (mv0.MAT_NAME) byName[mv0.MAT_NAME] = m
			})
			var panelMat = {}
			;(d.stocks || []).forEach(function (st2) {
				if (st2.part && st2.material && !panelMat[st2.part]) panelMat[st2.part] = st2.material
			})
			function resolveMat(panel) {
				var mat = panel.material
				if (mat && typeof mat === 'object') return mat
				var key = mat || panel.materialId || panelMat[panel.ID]
				return byId[key] || byName[key] || null
			}
			function stampOne(panel) {
				var mat = resolveMat(panel)
				var mv = varMap(mat)
				var nm = (mat && mat.name) || mv.MAT_NAME || (typeof panel.material === 'string' ? panel.material : '') || ''
				setSwcp(panel, 'GlassMirrorKind', glassMirrorKindOf(nm, mv, panel))
			}
			var n = 0
			;(d.panels || []).forEach(function (p) { stampOne(p); n++ })
			;(d.stocks || []).forEach(function (s) {
				if (s.panel && typeof s.panel === 'object') stampOne(s.panel)
				var mat = byId[s.material] || byName[s.material] || null
				var mv = varMap(mat)
				var nm = String(s.material || (mat && mat.name) || mv.MAT_NAME || '')
				setSwcp(s, 'GlassMirrorKind', glassMirrorKindOf(nm, mv, s))
			})
			console.log('[SwoodClient] GlassMirrorKind stamped on ' + n + ' panel(s)')
		} catch (e) {
			console.warn('[SwoodClient] GlassMirrorKind stamp failed:', e)
		}
	}

	function patchRawQuantity() {
		if (SC._qtyPatched) return
		var d = null
		try { d = (typeof reportDataRaw !== 'undefined') ? reportDataRaw : null } catch (e) {}
		if (!d) return
		SC._qtyPatched = true

		/* ---- 1. PROJECT level : hand the number to SWOOD's own multiplier -- */
		d.swcps = d.swcps || []
		var pq = projectQty(d.swcps)
		if (pq > 1) {
			var found = null
			for (var i = 0; i < d.swcps.length; i++) {
				if (d.swcps[i].name === SWOOD_QTY_PROP) { found = d.swcps[i]; break }
			}
			if (found) found.value = String(pq)
			else d.swcps.push({ name: SWOOD_QTY_PROP, type: 'Number', value: String(pq) })
		}

		/* ---- 2. PRODUCT level : scale NB inside each product assembly ------ */
		var asmById = {}
		;(d.assemblies || []).forEach(function (a) { asmById[a.ID] = a })

		var factor = {}   /* partID / assemblyID -> multiplier */
		var products = []

		;(d.assemblies || []).forEach(function (a) {
			var q = productQty(a.swcps)
			if (!(q > 1)) return
			var v = varMap(a)
			products.push({ name: v.NAME || a.ID, qty: q })
			/* walk everything under this product */
			var seen = {}
			;(function walk(id) {
				var asm = asmById[id]
				if (!asm || seen[id]) return
				seen[id] = true
				;(asm.parts || []).forEach(function (pid) {
					factor[pid] = Math.max(factor[pid] || 0, q)
				})
				;(asm.assemblies || []).forEach(function (cid) {
					factor[cid] = Math.max(factor[cid] || 0, q)
					walk(cid)
				})
			})(a.ID)
		})

		SC._productFactor = factor
		SC._nbAlreadyHasProduct = false

		if (!products.length) {
			addFrameNames(d)
			stampGlassMirror(d)
			if (pq > 1) console.log('[SwoodClient] project quantity = ' + pq + ' (all pages)')
			return
		}

		var scaled = 0
		;(d.parts || []).forEach(function (p) {
			var f = factor[p.ID]
			if (!f) return
			var nb = parseFloat(varMap(p).NB)
			if (!(nb > 0)) return
			setVar(p, 'NB', nb * f)
			scaled++
		})
		;(d.assemblies || []).forEach(function (a) {
			var f = factor[a.ID]
			if (!f) return
			var nb = parseFloat(varMap(a).NB)
			if (!(nb > 0)) return
			setVar(a, 'NB', nb * f)
		})

		SC._nbAlreadyHasProduct = scaled > 0
		addFrameNames(d)
		stampGlassMirror(d)

		console.log('[SwoodClient] product quantities applied to ' + scaled + ' part(s): ' +
			products.map(function (p) { return p.name + ' x' + p.qty }).join(', ') +
			(pq > 1 ? '  |  project x' + pq : ''))
	}

	/* A part view model has no `frames` property - only panels do - so
	   `frames.name` is always blank on a part page. The frame is known from
	   the assembly tree, so it is written onto each part as SM_Frame /
	   SM_SubFrame before the app builds its model. */
	function addFrameNames(d) {
		try {
			var byId = {}
			;(d.assemblies || []).forEach(function (a) { byId[a.ID] = a })

			function V(o) {
				var m = {}
				;((o && o.variables) || []).forEach(function (x) { m[x.alias] = x.value })
				return m
			}

			var frameOf = {}, subOf = {}
			function walk(id, fn, sn) {
				var a = byId[id]
				if (!a) return
				var v = V(a)
				var f = v.TOTYPE === 'FRAME' ? (v.NAME || fn) : fn
				var sb = v.TOTYPE === 'SUBFRAME' ? (v.NAME || sn) : sn
				;(a.assemblies || []).forEach(function (c) { walk(c, f, sb) })
				;(a.parts || []).forEach(function (pid) {
					if (frameOf[pid] === undefined) { frameOf[pid] = f || ''; subOf[pid] = sb || '' }
				})
			}
			;(d.assemblies || []).forEach(function (a) {
				if (V(a).TOTYPE === 'FRAME') walk(a.ID, V(a).NAME || '', '')
			})

			var n = 0
			;(d.parts || []).forEach(function (pt) {
				pt.variables = pt.variables || []
				var have = {}
				pt.variables.forEach(function (x) { have[x.alias] = 1 })
				if (!have.SM_Frame) {
					pt.variables.push({ alias: 'SM_Frame', value: frameOf[pt.ID] || '' })
					n++
				}
				if (!have.SM_SubFrame) {
					pt.variables.push({ alias: 'SM_SubFrame', value: subOf[pt.ID] || '' })
				}
			})
			if (n) console.log('[SwoodClient] frame name added to ' + n + ' part(s)')
		} catch (e) {
			console.warn('[SwoodClient] frame lookup failed:', e)
		}
	}
	SC.addFrameNames = addFrameNames
	SC.stampGlassMirror = stampGlassMirror
	SC.glassMirrorKindOf = glassMirrorKindOf

	SC.patchRawQuantity = patchRawQuantity

	/* The raw data is injected as a <script> by the app. We wrap that script's
	   onload so our patch runs first, then hand control straight back. */
	function installRawHook() {
		function run() {
			try { patchRawQuantity() } catch (e) { console.warn('[SwoodClient] quantity patch failed:', e) }
			try {
				var d = null
				try { d = (typeof reportDataRaw !== 'undefined') ? reportDataRaw : null } catch (e2) {}
				stampGlassMirror(d)
			} catch (e) { console.warn('[SwoodClient] GlassMirrorKind stamp failed:', e) }
		}
		run()
		if (typeof Node === 'undefined') return

		var orig = Node.prototype.appendChild
		Node.prototype.appendChild = function (node) {
			try {
				if (node && node.tagName === 'SCRIPT' && /report-data-raw\.js/.test(node.src || '')) {
					var prev = node.onload
					node.onload = function () {
						Node.prototype.appendChild = orig /* one shot, then restore */
						run()
						if (prev) return prev.apply(this, arguments)
					}
				}
			} catch (e) {}
			return orig.apply(this, arguments)
		}
	}

	/* Optional true flat-pattern outlines, written by the
	   ExportSheetMetalGeometry macro. Absent = bounding boxes are used. */
	if (CONFIG.sheetMetalPage && typeof document !== 'undefined') {
		var geo = document.createElement('script')
		geo.src = 'db/sheetmetal-geometry.js'
		geo.async = false
		geo.onerror = function () { /* not generated yet - that is fine */ }
		document.head.appendChild(geo)
	}

	/* ------------------------------------------------------------- publish */
	w.SwoodClient = SC
	installRawHook()
	/* late-load safety net: if view-settings.js ran first, apply now */
	if (w.__SWOOD_CLIENT_TARGET__) SC.apply(w.__SWOOD_CLIENT_TARGET__)
})(typeof window !== 'undefined' ? window : this);

/* ============================================================================
 * PART 4 — STEP 2 : PATTERN RE-NEST ENGINE
 * ----------------------------------------------------------------------------
 * Verbatim, working engine. It draws a full-page overlay on top of the stock
 * SwoodReport route, so no page config or main.js change is involved.
 *
 * Routes it can take over are switched in PART 1 -> CONFIG.takeOver.
 * ========================================================================== */
(function () {
	'use strict';

	var STYLE_ID = 'pattern-renest-styles';
	var OVERLAY_ID = 'pattern-renest-overlay';
	var ROUTE_PATTERNS = '#/pattern-detailed-list';
	var ROUTE_SUMMARY = '#/summary';
	var ROUTE_PATTERN_TABLE = '#/patterns';
	var ROUTE_PATTERNED_PANELS = '#/patterned-panels';
	var ROUTE_PANEL_PROCESSES = '#/panel-processes';
	var ROUTE_WELD_BARS = '#/weldment-bars';
	var ROUTE_PROCESS_ZONES = '#/panel-processes/zones';
	var ROUTE_SHEETMETAL = '#/sheetmetal-parts';
	var ROUTE_SM_LAYOUT = '#/sheetmetal-layout';
	var ROUTE_SM_QTY = '#/sheetmetal-quantities';
	var ROUTE_SAW = '#/saw-machine-data';
	var ROUTE_GLASS = '#/glass-mirror';

	var C_PANEL = '#36A2EB';
	var C_WASTE = '#FF6384';
	var C_TRIM = '#FFCE56';
	var C_CUTS = '#4BC0C0';

	var F_PANEL = '#8597EA';
	var F_PANEL_EDGE = '#3f4fa8';
	var F_WASTE = '#F08383';
	var F_WASTE_LINE = '#d95f5f';
	var F_TRIM = '#DAF49E';
	var F_TRIM_LINE = '#a8c95f';

	var DEFAULT_TRIM = 15;
	var DEFAULT_KERF = 5;

	var ZOOM_STEP = 1.4;
	var ZOOM_MIN = 0.25;
	var ZOOM_MAX = 6;

	var PANEL_KEY_SUFFIX = '-0';

	var UNITS = { imperial: false };
	var PAPER = { size: 'A4', landscape: true };

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

	var RATES = {};

	function rateKey(section, name) { return section + '\u0001' + name; }

	function rateFactor(unit) {
		var u = String(unit || '').toLowerCase();
		if (!UNITS.imperial) return 1;
		if (u === 'm2' || u === 'm\u00b2') return 1 / M2_TO_FT2;
		return 1;
	}

	function unitSuffix(unit) {
		var c = convertQty(1, unit);
		return c.unit ? ' /' + c.unit : '';
	}

	function rateCell(section, name, baseRate, unit) {
		var key = rateKey(section, name);
		var base = (key in RATES) ? RATES[key] : baseRate;
		var shown = base * rateFactor(unit);
		return '<input class="pr-rate" type="number" step="0.01" min="0" ' +
			'data-pr="rate" data-sec="' + esc(section) + '" data-name="' + esc(name) + '" ' +
			'data-unit="' + esc(unit || '') + '" value="' + fmt(shown, 2) + '">' +
			'<span class="pr-ru">' + esc(unitSuffix(unit)) + '</span>';
	}

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

	function printDocument(title, bodyHtml, extraCss) {
		var w = window.open('', '_blank');
		if (!w) return;
		w.document.write('<html><head><title>' + esc(title) + '</title><style>' +
			'@page{size:' + PAPER.size + ' ' + (PAPER.landscape ? 'landscape' : 'portrait') + ';margin:10mm;}' +
			'html,body{margin:0;padding:0;font-family:Arial,sans-serif;}' +
			'h2{font-size:15px;margin:0 0 8px;}' +
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

	/* ----------------------------------------------------------------- theme
	 * SwoodReport keeps its dark/light choice in localStorage('theme') and
	 * applies it through MUI at runtime - it never puts a class or an
	 * attribute on <html>, so plain DOM like this overlay cannot see it.
	 * We mirror the flag onto <html data-pr-theme="dark|light"> and key the
	 * overlay's CSS variables off that. Default is dark, which is what the
	 * app itself falls back to when the key has never been written.
	 * ------------------------------------------------------------------ */
	var PR_THEME_MODE = null;

	function prThemeMode() {
		try {
			var t = localStorage.getItem('theme');
			return t === 'light' ? 'light' : 'dark';
		} catch (e) { return 'dark'; }
	}

	function applyPrTheme() {
		var m = prThemeMode();
		if (m === PR_THEME_MODE) return;
		PR_THEME_MODE = m;
		document.documentElement.setAttribute('data-pr-theme', m);
	}

	function watchPrTheme() {
		if (watchPrTheme.on) return;
		watchPrTheme.on = true;
		applyPrTheme();
		/* the app removes and re-adds <link data-syncfusion-theme> on every
		   toggle, so a head observer is a reliable hook */
		try {
			new MutationObserver(applyPrTheme).observe(document.head, { childList: true });
		} catch (e) {}
		window.addEventListener('storage', applyPrTheme);
		/* belt and braces: the toggle is a button, so re-read just after any
		   click. Cheap - applyPrTheme() exits immediately when unchanged.  */
		document.addEventListener('click', function () {
			setTimeout(applyPrTheme, 0);
			setTimeout(applyPrTheme, 150);
		}, true);
	}

	/* Dark values for the variables the overlay CSS already reads, plus the
	   handful of colours that were hard-coded light. Light mode is untouched:
	   the :root block below repeats the existing fallbacks verbatim.      */
	function themeCss() {
		var O = '#' + OVERLAY_ID;
		var light =
			':root{--surface:#fff;--surface-2:#eef2f6;--ink:#16202b;--ink-soft:#4a5b6d;' +
			'--rule:#d4dde5;--brand:#14487f;--brand-dark:#0e3560;--accent:#b45309;' +
			'--stripe:#f1f5f9;--radius:6px;--pr-grid:#81D4FA;--pr-hover:#dbe9f8;' +
			'--pr-total:#e3edf9;--pr-sb-thumb:#b6c2cc;--pr-sb-track:#eef2f5;}';
		var dark =
			'html[data-pr-theme="dark"]{--surface:rgb(15,18,20);--surface-2:#1a1f24;' +
			'--ink:#BFBFC3;--ink-soft:#8b939b;--rule:#2b333b;--brand:#14487f;' +
			'--brand-dark:#0e3560;--accent:#e08a2e;--stripe:#14181c;--radius:6px;' +
			'--pr-grid:rgba(129,212,250,.28);--pr-hover:#1d2833;--pr-total:#16202b;' +
			'--pr-sb-thumb:#3a444e;--pr-sb-track:#14181c;}';
		/* re-point the hard-coded literals at the variables above */
		var wire =
			O + ' .pr-tbl-scroll::-webkit-scrollbar-thumb{background:var(--pr-sb-thumb);}' +
			O + ' .pr-tbl-scroll::-webkit-scrollbar-track{background:var(--pr-sb-track);}' +
			O + ' .pr-tbl th,' + O + ' .pr-tbl td{border-right-color:var(--pr-grid) !important;}' +
			O + ' .pr-tbl tr:hover td{background:var(--pr-hover);}' +
			O + ' .pr-tbl tr.pr-tot td{background:var(--pr-total);}' +
			O + ' .pr-acts button:hover{background:var(--pr-hover);}' +
			O + ' .pr-rate:hover,' + O + ' .pr-rate:focus{background:var(--surface);}';
		/* dark-only tweaks that are not a straight variable swap */
		var darkOnly =
			'html[data-pr-theme="dark"] ' + O + ' .pr-tbl tr.pr-tot td{color:#8fc0f2;border-top-color:#8fc0f2;}' +
			'html[data-pr-theme="dark"] ' + O + ' a.pr-link{color:#7fb2e8;}' +
			'html[data-pr-theme="dark"] ' + O + ' .pr-grp{color:#7fb2e8;}' +
			'html[data-pr-theme="dark"] ' + O + ' .pr-acts button{color:#7fb2e8;}' +
			'html[data-pr-theme="dark"] ' + O + ' .pr-tbl-title{border-bottom-color:#8fc0f2;}' +
			'html[data-pr-theme="dark"] ' + O + ' .swc-swatch{border-color:rgba(255,255,255,.35);}' +
			'html[data-pr-theme="dark"] ' + O + ' .pr-search input::placeholder{color:var(--ink-soft);}' +
			'html[data-pr-theme="dark"] ' + O + ' .pr-rate.edited,' +
			'html[data-pr-theme="dark"] ' + O + ' .pr-tbl input.pr-ucost.pr-edited{background:#2a2318;}' +
			'html[data-pr-theme="dark"] ' + O + ' .quote{border-color:var(--rule);}' +
			'html[data-pr-theme="dark"] ' + O + ' .qtbl td,' +
			'html[data-pr-theme="dark"] ' + O + ' .fwtbl td{border-bottom-color:var(--rule);}' +
			'html[data-pr-theme="dark"] ' + O + ' .fw-note{background:var(--surface-2);border-color:var(--rule);}';
		return light + dark + wire + darkOnly;
	}

	/* --------------------------------------------------- native tables
	 * The stock SwoodReport tables (Tabulator) are driven by a small set of
	 * CSS variables that main.css declares on :root, all transparent:
	 *
	 *   --table-background-color: rgba(0,0,0,0)
	 *   --header-color:  var(--table-background-color)
	 *   --even-color:    var(--table-background-color)
	 *   --odd-color:     rgba(0,0,0,.02)
	 *
	 * That is why every native page renders as flat text on the page
	 * background while the client pages have a navy header and striped rows.
	 * Re-pointing those variables at the client palette is enough to bring
	 * the two into line - no page config and no main.css edit.
	 *
	 * This <style> is appended after main.css, so at equal specificity it
	 * wins; html:root is used to stay ahead of the :root block regardless.
	 *
	 * TO TURN IT OFF: set THEME_NATIVE_TABLES to false.
	 * TO RECOLOUR EVERYTHING (both native and client pages): edit the
	 * --brand / --accent / --stripe values in themeCss() above.
	 * ---------------------------------------------------------------- */
	var THEME_NATIVE_TABLES = true;

	/* Quotation styling for the Client pages. Deliberately unlike the
	   internal tables: generous spacing, one accent rule, right-aligned
	   money, and a totals block that reads like a document footer. */
	/* Weldment nesting sheet - same visual language as the wood and sheet
	   metal cutting patterns: pieces solid, drop shaded and hatched. */
	function weldBarCss() {
		var O = '#' + OVERLAY_ID
		return (
			/* stats strip */
			O + ' .wb-stats{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0 16px;}' +
			O + ' .wb-stat{flex:1 1 150px;min-width:150px;background:var(--surface,#fff);' +
				'border:1px solid var(--rule,#d4dde5);border-left:3px solid var(--brand,#14487f);' +
				'border-radius:var(--radius,6px);padding:10px 14px;}' +
			O + ' .wb-stat span{display:block;font-size:11px;text-transform:uppercase;' +
				'letter-spacing:.06em;color:var(--ink-soft,#4a5b6d);}' +
			O + ' .wb-stat b{display:block;font-size:20px;line-height:1.35;color:var(--ink,#16202b);}' +
			O + ' .wb-stat i{display:block;font-style:normal;font-size:11px;color:var(--ink-soft,#4a5b6d);}' +

			/* nesting sheet */
			O + ' .wb-wrap{padding:12px 14px 16px;}' +
			O + ' .wb-row{display:flex;align-items:center;gap:10px;margin:0 0 6px;}' +
			O + ' .wb-no{flex:0 0 54px;font-size:12px;color:var(--ink-soft,#4a5b6d);text-align:right;}' +
			O + ' .wb-meta{flex:0 0 92px;font-size:12px;color:var(--ink-soft,#4a5b6d);}' +
			O + ' .wb-meta i{display:block;font-style:normal;font-size:11px;}' +
			O + ' .wb-svg{flex:1 1 auto;height:34px;display:block;}' +
			O + ' .wb-ruler{flex:1 1 auto;height:18px;display:block;}' +
			O + ' .wb-rulerow{margin-top:-2px;}' +
			O + ' .wb-bar{fill:var(--surface-2,#eef2f6);stroke:var(--rule,#d4dde5);stroke-width:1;}' +
			O + ' .wb-piece{fill:#9db8e8;stroke:#4a6fa5;stroke-width:1;}' +
			O + ' .wb-drop{fill:#f3dede;stroke:#d9a2a2;stroke-width:1;}' +
			O + ' .wb-lbl{font-size:11px;fill:#16202b;}' +
			O + ' .wb-droplbl{fill:#8a4a4a;}' +
			O + ' .wb-tick{stroke:var(--rule,#d4dde5);stroke-width:1;}' +
			O + ' .wb-tlbl{font-size:10px;fill:var(--ink-soft,#4a5b6d);}' +
			'html[data-pr-theme="dark"] ' + O + ' .wb-piece{fill:#3f5f96;stroke:#7fb2e8;}' +
			'html[data-pr-theme="dark"] ' + O + ' .wb-drop{fill:#4e3232;stroke:#a97070;}' +
			'html[data-pr-theme="dark"] ' + O + ' .wb-lbl{fill:#e6ebf2;}' +
			'html[data-pr-theme="dark"] ' + O + ' .wb-droplbl{fill:#f0c0c0;}' +

			O + ' .wb-doc{max-width:1180px;margin:0 auto 28px;background:var(--surface,#fff);' +
				'border:1px solid var(--rule,#d4dde5);border-radius:6px;padding:22px 26px 28px;' +
				'box-shadow:0 1px 3px rgba(0,0,0,.06);}' +
			O + ' .wb-doc-head{display:flex;justify-content:space-between;align-items:flex-start;' +
				'gap:20px;border-bottom:2px solid var(--brand,#14487f);padding-bottom:14px;margin-bottom:14px;}' +
			O + ' .wb-doc-kicker{font-size:11px;letter-spacing:.14em;text-transform:uppercase;' +
				'color:var(--ink-soft,#4a5b6d);margin:0 0 4px;}' +
			O + ' .wb-doc-title{font-size:26px;font-weight:700;letter-spacing:.02em;' +
				'color:var(--brand,#14487f);margin:0;}' +
			O + ' .wb-doc-meta{font-size:13px;text-align:right;line-height:1.7;color:var(--ink,#16202b);}' +
			O + ' .wb-doc-meta span{display:inline-block;min-width:72px;color:var(--ink-soft,#4a5b6d);}' +
			O + ' .wb-stamp{display:inline-block;margin-top:8px;padding:3px 10px;border-radius:3px;' +
				'font-size:11px;font-weight:700;letter-spacing:.12em;}' +
			O + ' .wb-stamp-locked{color:#8a1f1f;background:#f8e4e4;border:1px solid #d9a2a2;}' +
			O + ' .wb-stamp-open{color:#1f5a32;background:#e4f4ea;border:1px solid #9ec9ad;}' +
			O + ' .wb-chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px;}' +
			O + ' .wb-chip{background:var(--surface-2,#eef2f6);border:1px solid var(--rule,#d4dde5);' +
				'border-radius:4px;padding:6px 10px;font-size:13px;}' +
			O + ' .wb-chip b{margin-right:6px;font-weight:600;color:var(--ink-soft,#4a5b6d);' +
				'font-size:11px;text-transform:uppercase;letter-spacing:.06em;}' +
			O + ' .wb-lock-btn,.wb-issue-btn,.wb-renest-btn{cursor:pointer;border:1px solid var(--brand,#14487f);' +
				'background:var(--brand,#14487f);color:#fff;border-radius:4px;padding:7px 12px;font-size:12px;}' +
			O + ' .wb-lock-btn{background:#fff;color:var(--brand,#14487f);}' +
			O + ' .wb-unlock-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 12px;}' +
			O + ' .wb-cuts{font-size:11px;color:var(--ink-soft,#4a5b6d);margin:-2px 0 8px 64px;}' +
			O + ' .wb-rate-locked{font-variant-numeric:tabular-nums;}' +
			'@media print{' +
				O + ' .wb-lock-btn,' + O + ' .wb-issue-btn,' + O + ' .wb-renest-btn,' +
				O + ' .wb-unlock-row,' + O + ' .pr-bar{display:none !important;}' +
				O + ' .wb-stamp-open{display:none;}' +
			'}'
		)
	}
	function quoteCss() {
		var Q = '#' + OVERLAY_ID + ' .pr-quote'
		return (
			Q + '{max-width:900px;margin:18px auto 40px;background:var(--surface,#fff);' +
				'border:1px solid var(--rule,#d4dde5);border-radius:var(--radius,6px);' +
				'padding:28px 32px;box-shadow:0 1px 3px rgba(0,0,0,.06);}' +

			Q + ' .pr-quote-head{display:flex;justify-content:space-between;align-items:flex-start;' +
				'gap:24px;border-bottom:2px solid var(--brand,#14487f);padding-bottom:14px;margin-bottom:4px;}' +
			Q + ' .pr-quote-title{font-size:26px;font-weight:700;letter-spacing:.02em;' +
				'color:var(--brand,#14487f);}' +
			Q + ' .pr-quote-meta{font-size:13px;text-align:right;line-height:1.7;color:var(--ink,#16202b);}' +
			Q + ' .pr-quote-meta span{display:inline-block;min-width:78px;color:var(--ink-soft,#4a5b6d);}' +
			Q + ' .pr-quote-meta b{margin-left:8px;}' +

			Q + ' .pr-quote-ctl{display:flex;gap:22px;justify-content:flex-end;margin:14px 0 18px;' +
				'font-size:13px;color:var(--ink-soft,#4a5b6d);}' +
			Q + ' .pr-quote-ctl input{width:80px;margin-left:8px;text-align:right;}' +

			Q + ' .pr-qtbl{width:100%;border-collapse:collapse;font-size:14px;}' +
			Q + ' .pr-qtbl th{background:transparent;color:var(--ink-soft,#4a5b6d);font-weight:600;' +
				'text-transform:uppercase;letter-spacing:.06em;font-size:11px;text-align:left;' +
				'padding:0 10px 8px;border-bottom:1px solid var(--rule,#d4dde5);}' +
			Q + ' .pr-qtbl td{padding:11px 10px;border-bottom:1px solid var(--stripe,#f1f5f9);}' +
			Q + ' .pr-qtbl tr:last-child td{border-bottom:none;}' +
			Q + ' .pr-qtbl .pr-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}' +
			Q + ' .pr-qtbl th.pr-num{text-align:right;}' +
			Q + ' .pr-q-sr{width:42px;color:var(--ink-soft,#4a5b6d);}' +

			Q + ' .pr-quote-totals{margin-top:18px;margin-left:auto;width:320px;font-size:14px;}' +
			Q + ' .pr-quote-totals > div{display:flex;justify-content:space-between;padding:7px 10px;}' +
			Q + ' .pr-quote-totals > div span{color:var(--ink-soft,#4a5b6d);}' +
			Q + ' .pr-quote-totals .pr-quote-grand{border-top:2px solid var(--brand,#14487f);' +
				'margin-top:6px;padding-top:11px;font-size:17px;}' +
			Q + ' .pr-quote-totals .pr-quote-grand span{color:var(--brand,#14487f);font-weight:700;}' +
			Q + ' .pr-quote-totals .pr-quote-grand b{color:var(--brand,#14487f);}' +

			Q + ' .pr-quote-note{margin-top:26px;padding-top:14px;border-top:1px solid var(--rule,#d4dde5);' +
				'font-size:12px;line-height:1.6;color:var(--ink-soft,#4a5b6d);}' +

			'@media print{' + Q + '{border:none;box-shadow:none;margin:0;max-width:none;}}'
		)
	}

	function nativeTableCss() {
		if (!THEME_NATIVE_TABLES) return '';

		/* Every colour below is a literal, or a var() WITH a literal fallback.
		 *
		 * The first version of this leaned on main.css's own variables:
		 *     .tabulator .tabulator-header{background-color:var(--header-color)}
		 * while forcing the title text to #fff. When --header-color did not
		 * resolve, the header stayed white and the titles went white with it -
		 * an invisible header row on every native page. Background and text are
		 * now always set together, and neither can silently drop out. */

		var T = '.tabulator';
		var H = T + ' .tabulator-header';
		var BRAND = 'var(--brand,#14487f)';
		var BRAND_D = 'var(--brand-dark,#0e3560)';
		var GRID = 'var(--pr-grid,#81D4FA)';
		var RULE = 'var(--rule,#d4dde5)';
		var HOVER = 'var(--pr-hover,#dbe9f8)';
		var TOTAL = 'var(--pr-total,#e3edf9)';
		var SURF = 'var(--surface,#fff)';
		var SURF2 = 'var(--surface-2,#eef2f6)';
		var INK = 'var(--ink,#16202b)';
		var STRIPE = 'var(--stripe,#f1f5f9)';
		var ACCENT = 'var(--accent,#b45309)';

		return (
			/* row striping still goes through main.css's own variables */
			'html:root{' +
				'--table-background-color:' + SURF + ';' +
				'--odd-color:' + SURF + ';' +
				'--even-color:' + STRIPE + ';' +
				'--table-font-color:' + INK + ';' +
				'--table-font-size:14px;' +
				'--tree-branch-color:' + RULE + ';' +
			'}' +

			/* header: background and text forced together */
			T + '{border:1px solid ' + RULE + ';box-shadow:none;}' +
			H + '{background-color:' + BRAND + ' !important;' +
				'border-bottom:2px solid ' + ACCENT + ' !important;}' +
			H + ' .tabulator-col{background-color:' + BRAND + ' !important;' +
				'border-right:1px solid ' + GRID + ' !important;}' +
			H + ' .tabulator-col:last-of-type{border-right:none !important;}' +
			H + ',' + H + ' .tabulator-col,' + H + ' .tabulator-col-content,' +
				H + ' .tabulator-col-title{color:#fff !important;font-weight:600;}' +
			H + ' .tabulator-col.tabulator-sortable.tabulator-col-sorter-element:hover{' +
				'background-color:' + BRAND_D + ' !important;}' +

			/* sort arrows: the stock greys vanish on navy */
			H + ' .tabulator-col[aria-sort="none"] .tabulator-arrow{' +
				'border-bottom-color:rgba(255,255,255,.45) !important;}' +
			H + ' .tabulator-col[aria-sort="ascending"] .tabulator-arrow{' +
				'border-bottom-color:#ffd9a8 !important;}' +
			H + ' .tabulator-col[aria-sort="descending"] .tabulator-arrow{' +
				'border-top-color:#ffd9a8 !important;}' +

			/* body */
			'.tabulator-row{border-bottom:1px solid ' + RULE + ';}' +
			'.tabulator-row .tabulator-cell{border-right:1px solid ' + GRID + ' !important;}' +
			'.tabulator-row .tabulator-cell:last-of-type{border-right:none !important;}' +
			'.tabulator-row.tabulator-selectable:hover{background:' + HOVER + ' !important;}' +

			/* calculated total row */
			T + ' .tabulator-tableholder .tabulator-table .tabulator-row.tabulator-calcs{' +
				'background:' + TOTAL + ' !important;font-weight:700;' +
				'border-top:2px solid ' + BRAND + ' !important;}' +
			T + ' .tabulator-tableholder .tabulator-table .tabulator-row.tabulator-calcs .tabulator-cell{' +
				'color:' + BRAND + ';}' +
			'html[data-pr-theme="dark"] ' + T +
				' .tabulator-tableholder .tabulator-table .tabulator-row.tabulator-calcs .tabulator-cell{' +
				'color:#8fc0f2;}' +

			/* footer. main.css paints it with --header-color, which would put
			   navy under the horizontal scrollbar. */
			T + ' .tabulator-footer{background:' + SURF2 + ' !important;' +
				'color:' + INK + ' !important;border-top:1px solid ' + RULE + ';}' +
			T + ' .tabulator-footer .tabulator-calcs-holder .tabulator-row{' +
				'background:' + TOTAL + ' !important;}' +
			H + ' .tabulator-calcs-holder .tabulator-row{background:' + TOTAL + ' !important;}'
		);
	}

	/* styles-client.css is referenced by nothing - not index.html, not
	   view-settings.js - so the colour swatches and the sheet metal
	   thumbnail sizing it defines have never applied. Load it here.
	   TO SKIP IT: set LOAD_CLIENT_CSS to false. */
	var LOAD_CLIENT_CSS = true;
	function ensureClientStylesheet() {
		if (!LOAD_CLIENT_CSS) return;
		if (document.getElementById('swc-client-css')) return;
		var l = document.createElement('link');
		l.id = 'swc-client-css';
		l.rel = 'stylesheet';
		l.href = 'assets/css/styles-client.css';
		document.head.appendChild(l);
	}

	function injectStyles() {
		watchPrTheme();
		ensureClientStylesheet();
		if (document.getElementById(STYLE_ID)) return;
		var css =
			'#' + OVERLAY_ID + '{display:none;position:fixed;z-index:500;background:var(--surface,#fff);overflow-y:auto;overflow-x:hidden;font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink,#16202b);padding:20px 24px;}' +
			'#' + OVERLAY_ID + ' .pr-tbl-scroll{overflow-x:scroll;overflow-y:hidden;width:100%;}' +
			'#' + OVERLAY_ID + ' .pr-tbl-scroll table{min-width:max-content;}' +
			'#' + OVERLAY_ID + ' .pr-tbl-scroll::-webkit-scrollbar{height:12px;-webkit-appearance:none;}' +
			'#' + OVERLAY_ID + ' .pr-tbl-scroll::-webkit-scrollbar-thumb{background:#b6c2cc;border-radius:6px;}' +
			'#' + OVERLAY_ID + ' .pr-tbl-scroll::-webkit-scrollbar-track{background:#eef2f5;}' +
			'#' + OVERLAY_ID + ' .pr-tbl th{resize:horizontal;overflow:auto;}' +
			'#' + OVERLAY_ID + ' a.pr-piece{cursor:pointer;}' +
			'#' + OVERLAY_ID + ' a.pr-piece:hover rect{fill:#8fa9e8;}' +
			'#' + OVERLAY_ID + ' .pr-panel{background:var(--surface,#fff);border:1px solid var(--rule,#d4dde5);border-radius:var(--radius,6px);padding:18px;margin-bottom:22px;display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap;}' +
			'#' + OVERLAY_ID + ' .pr-cards{flex:0 0 300px;display:flex;flex-direction:column;gap:12px;}' +
			'#' + OVERLAY_ID + ' .pr-card{background:var(--surface,#fff);border:1px solid var(--rule,#d4dde5);border-radius:var(--radius,6px);padding:11px 14px;font-size:14px;color:var(--ink,#16202b);}' +
			'#' + OVERLAY_ID + ' .pr-card b{font-weight:600;}' +
			'#' + OVERLAY_ID + ' .pr-cv{font-weight:700;color:var(--accent,#b45309);}' +
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
			'#' + OVERLAY_ID + ' .pr-sheets-wrap{overflow-x:auto;overflow-y:visible;}' +
			'#' + OVERLAY_ID + ' .pr-sheets{display:grid;gap:16px;}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="1"]{grid-template-columns:1fr;}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="2"]{grid-template-columns:repeat(2,minmax(0,1fr));}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="3"]{grid-template-columns:repeat(3,minmax(0,1fr));}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="4"]{grid-template-columns:repeat(4,minmax(0,1fr));}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="5"]{grid-template-columns:repeat(5,minmax(0,1fr));}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-cols="6"]{grid-template-columns:repeat(6,minmax(0,1fr));}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-fit="1"] .pr-board svg{height:var(--pr-tileh,120px);width:auto;max-width:100%;margin:0 auto;}' +
			'#' + OVERLAY_ID + ' .pr-sheets[data-fit="1"] .pr-board{display:flex;justify-content:center;}' +
			'#' + OVERLAY_ID + ' .pr-sheets .pr-panel{margin-bottom:0;}' +
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-panel{flex-direction:column;flex-wrap:nowrap;padding:10px;gap:8px;}' +
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-panel > *{width:100%;}' +
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-cards{display:none;}' +
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-board{width:100%;flex:1 1 100%;overflow:visible;}' +
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-board svg{width:100%;}' +
			'#' + OVERLAY_ID + ' .pr-tile-head{display:none;font-size:12px;color:var(--ink,#16202b);line-height:1.5;}' +
			'#' + OVERLAY_ID + ' .pr-sheets:not([data-cols="1"]) .pr-tile-head{display:block;}' +
			'#' + OVERLAY_ID + ' .pr-tile-head b{color:var(--brand,#14487f);}' +
			'#' + OVERLAY_ID + ' .pr-tile-head .pr-cv{font-weight:700;color:var(--accent,#b45309);}' +
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
			
            /* DEEP DIVE FIX: 100% WIDTH BUT WITH READABLE FONT SIZES & HORIZONTAL SCROLL */
            '#' + OVERLAY_ID + ' .summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px;max-width:100%;}' +
			'#' + OVERLAY_ID + ' .pr-tbl-shell{margin-bottom:22px;max-width:100%;width:100%;overflow-x:auto;}' +
			'#' + OVERLAY_ID + ' .quote{background:var(--surface,#fff);border:1px solid #dfe4ea;border-radius:10px;overflow:hidden;max-width:100%;}' +
			'#' + OVERLAY_ID + ' .quote-body{padding:24px 34px 6px;}' +
			'#' + OVERLAY_ID + ' .qsec{margin:0 0 22px;}' +
			'#' + OVERLAY_ID + ' .qsec h3{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:var(--brand,#14487f);margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid var(--brand,#14487f);}' +
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
			'#' + OVERLAY_ID + ' .fw-note{background:#f4f8fc;border:1px solid #dbe6f2;border-radius:8px;padding:11px 15px;margin:0 0 18px;font-size:12px;color:var(--ink-soft,#4a5b6d);line-height:1.6;max-width:100%;}' +
			'#' + OVERLAY_ID + ' table.fwtbl{width:100%;max-width:100%;border-collapse:collapse;font-size:14px;}' +
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
			'#' + OVERLAY_ID + ' .pr-grp{font-weight:700;font-size:15px;color:var(--brand,#14487f);margin:20px 2px 8px;}' +
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
			'#' + OVERLAY_ID + ' .pr-tbl-title{background:var(--surface-2,#eef2f6);border:1px solid var(--rule,#d4dde5);border-bottom:2px solid var(--brand,#14487f);border-radius:var(--radius,6px) var(--radius,6px) 0 0;padding:10px 14px;font-weight:700;font-size:15px;color:var(--ink,#16202b);display:flex;align-items:center;gap:10px;}' +
			'#' + OVERLAY_ID + ' .pr-tbl-title .pr-tt{flex:1 1 0;text-align:center;}' +
			'#' + OVERLAY_ID + ' .pr-tbl-title .pr-meta{font-size:12.5px;font-style:italic;font-weight:400;color:var(--ink-soft,#4a5b6d);white-space:nowrap;}' +
			'#' + OVERLAY_ID + ' .pr-acts{display:flex;align-items:center;gap:4px;}' +
			'#' + OVERLAY_ID + ' .pr-acts button{border:0;background:transparent;color:var(--brand,#14487f);cursor:pointer;padding:4px 5px;border-radius:4px;line-height:0;}' +
			'#' + OVERLAY_ID + ' .pr-acts button:hover{background:#dbe9f8;}' +
			'#' + OVERLAY_ID + ' .pr-tbl input.pr-ucost{width:80px;border:1px solid var(--rule,#d4dde5);border-radius:4px;padding:4px 6px;font-size:14px;text-align:right;font-family:inherit;color:var(--ink,#16202b);background:var(--surface,#fff);}' +
			'#' + OVERLAY_ID + ' .pr-tbl input.pr-ucost:focus{border-color:var(--brand,#14487f);outline:none;box-shadow:0 0 0 2px rgba(20,72,127,.15);}' +
			'#' + OVERLAY_ID + ' .pr-tbl input.pr-ucost.pr-edited{background:#fef9ee;border-color:var(--accent,#b45309);}' +
			'@media print{#' + OVERLAY_ID + '{position:static !important;padding:0;overflow:visible;}' +
				'#' + OVERLAY_ID + ' .pr-bar,#' + OVERLAY_ID + ' .pr-acts{display:none;}}' +
			
            /* DEEP DIVE FIX: Tables Expand to Full Width, Scroll Horizontally, Without Shrinking Font */
            '#' + OVERLAY_ID + ' table.pr-tbl{display:table;min-width:100%;width:100%;border-collapse:collapse;font-size:14px;border:1px solid var(--rule,#d4dde5);border-top:none;border-radius:0 0 var(--radius,6px) var(--radius,6px);}' +
            
            /* DEEP DIVE FIX: Vertical Blue Lines and nowrap to prevent shrink-fit */
			'#' + OVERLAY_ID + ' .pr-tbl th{background:var(--brand,#14487f);color:#fff;font-weight:600;font-size:14px;text-align:left;padding:10px 14px;border-bottom:2px solid var(--accent,#b45309);border-right:1px solid #81D4FA !important;position:relative !important;white-space:nowrap !important;}' +
			'#' + OVERLAY_ID + ' .pr-tbl th + th{box-shadow:inset 1px 0 0 rgba(255,255,255,.2);}' +
			'#' + OVERLAY_ID + ' .pr-tbl th{cursor:pointer;user-select:none;}' +
			'#' + OVERLAY_ID + ' .pr-tbl th:hover{background:var(--brand-dark,#0e3560);}' +
			'#' + OVERLAY_ID + ' .pr-sa{font-size:8px;margin-left:6px;opacity:.6;display:inline-block;vertical-align:middle;}' +
			'#' + OVERLAY_ID + ' .pr-sa.on{opacity:1;color:#ffd9a8;}' +
            
            /* DEEP DIVE FIX: Vertical Blue Lines on Cells and nowrap to prevent shrink-fit */
			'#' + OVERLAY_ID + ' .pr-tbl td{padding:9px 14px;border-bottom:1px solid var(--rule,#d4dde5);color:var(--ink,#16202b);border-right:1px solid #81D4FA !important;white-space:nowrap !important;}' +
            '#' + OVERLAY_ID + ' .pr-tbl th:last-child, #' + OVERLAY_ID + ' .pr-tbl td:last-child {border-right:none !important;}' +
			'#' + OVERLAY_ID + ' .pr-tbl tr.pr-even td{background:var(--stripe,#f1f5f9);}' +
			'#' + OVERLAY_ID + ' .pr-tbl tr:hover td{background:#dbe9f8;}' +
			'#' + OVERLAY_ID + ' .pr-tbl .pr-num{text-align:right;font-variant-numeric:tabular-nums;}' +
			'#' + OVERLAY_ID + ' .pr-tbl tr.pr-tot td{font-weight:700;color:var(--brand,#14487f);background:#e3edf9;border-top:2px solid var(--brand,#14487f);}' +
            
            /* DEEP DIVE FIX: Resize arrow styling */
            '#' + OVERLAY_ID + ' .col-resizer{position:absolute;top:0;right:0;width:8px;cursor:col-resize;user-select:none;height:100%;z-index:100;}' +
            '#' + OVERLAY_ID + ' .col-resizer:hover, #' + OVERLAY_ID + ' .col-resizer.resizing{border-right:2px solid #e74c3c !important;}' +
			'#' + OVERLAY_ID + ' .pr-empty{background:var(--surface,#fff);border:1px dashed var(--rule,#d4dde5);border-radius:var(--radius,6px);padding:40px;text-align:center;color:var(--ink-soft,#4a5b6d);max-width:100%;}' +
			themeCss() + nativeTableCss() + quoteCss() + weldBarCss();
		var style = document.createElement('style');
		style.id = STYLE_ID;
		style.appendChild(document.createTextNode(css));
		document.head.appendChild(style);
	}

	var ICON_SEARCH = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" ' +
		'stroke="#4a5b6d" stroke-width="2"><circle cx="11" cy="11" r="7"/>' +
		'<line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

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

	var UI = {
		patterned: { q: '', split: 'none' },
		table: { q: '', split: 'none' },
		detail: { q: '', split: 'none', perPage: 'all', zoom: 1 },
		process: { q: '', split: 'none' },
		summary: { mode: 'mgmt', view: 'complete', factor: 30, costFactor: 0, discount: 0 },
		weld: { stockLength: 0, kerf: -1, density: 0, q: '', locked: true, issued: null },
		saw: { q: '', split: 'none' },
		gm: { q: '', split: 'none' },
	};

	/* part id -> frame name.
	   CONFIG.frames.groupSubFrames decides whether a SUBFRAME replaces its
	   parent FRAME name or is rolled up into it. */
	function frameNameByPanel(data) {
		var cfg = (window.SwoodClient && window.SwoodClient.config && window.SwoodClient.config.frames) || {};
		var rollUp = cfg.groupSubFrames !== false;
		var byId = indexBy(data.assemblies, 'ID');
		var map = {};
		function walk(id, frameName) {
			var asm = byId[id];
			if (!asm) return;
			var v = vars(asm);
			var t = v.TOTYPE;
			var name = frameName;
			if (t === 'FRAME') name = v.NAME || frameName;
			else if (t === 'SUBFRAME' && !rollUp) name = v.NAME || frameName;
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

	/* part id -> nearest SUBFRAME name (blank when it sits directly in the
	   frame). Used for the Sub-frame split button. */
	function subFrameNameByPart(data) {
		var byId = indexBy(data.assemblies, 'ID');
		var map = {};
		function walk(id, subName) {
			var asm = byId[id];
			if (!asm) return;
			var v = vars(asm);
			var name = v.TOTYPE === 'SUBFRAME' ? (v.NAME || subName) : subName;
			(asm.assemblies || []).forEach(function (cid) { walk(cid, name); });
			(asm.parts || []).forEach(function (pid) {
				if (map[pid] === undefined) map[pid] = name || '';
			});
		}
		(data.assemblies || []).forEach(function (a) {
			var v = vars(a);
			if (v.TOTYPE === 'FRAME') walk(a.ID, '');
		});
		return map;
	}

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

	var rerender = function () {};

	function bindRates(app) {
		app.querySelectorAll('[data-pr="rate"]').forEach(function (el) {
			var unit = el.getAttribute('data-unit');
			var key = rateKey(el.getAttribute('data-sec'), el.getAttribute('data-name'));
			if (key in RATES) el.classList.add('edited');
			el.addEventListener('change', function () {
				var shown = parseFloat(el.value);
				if (isNaN(shown) || shown < 0) return;
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
		var frameOf = frameNameByPanel(data);
		var subOf = subFrameNameByPart(data);

		/* A panel has no refPart and no material key. Its ID *is* the part
		   GUID, and the material sits on its CORE stock. Resolve both once. */
		var panelMat = {};
		(data.stocks || []).forEach(function (st2) {
			if (st2.part && st2.material && !panelMat[st2.part]) panelMat[st2.part] = st2.material;
		});
		function panelInfo(pn) {
			var pid = pn.ID;
			return {
				part: parts[pid] || null,
				materialName: panelMat[pid] || '',
				frame: frameOf[pid] || '',
				subFrame: subOf[pid] || '',
			};
		}
		var partsByPanel = {};
		(data.parts || []).forEach(function (p) { if (p && p.panel) partsByPanel[p.panel] = p; });

		var projectProps = {};
		(data.swcps || []).forEach(function (c) { projectProps[c.name] = c.value; });
		/* PART 1 -> CONFIG.quantity decides which custom property drives this */
		var projectQty = (window.SwoodClient && window.SwoodClient.resolveQty)
			? window.SwoodClient.resolveQty(data.swcps)
			: 0;
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
				category: mv.CATEGORY || '',
				frame: frameOf[st.part] || '',
				subFrame: subOf[st.part] || '',
				boardL: parseFloat(mv.BOARD_LENGTH) || 0,
				boardW: parseFloat(mv.BOARD_WIDTH) || 0,
			});
		});
		return out;
	}

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

	function fillBoard(queue, boardL, boardW, trim, kerf, allowRotate) {
		var free = [{ x: trim, y: trim, L: boardL - trim, W: boardW - trim }];
		var placements = [];
		var guard = 0;

		while (queue.length && guard++ < 20000) {
			var best = null;
			for (var qi = 0; qi < queue.length; qi++) {
				var q = queue[qi];
				for (var fi = 0; fi < free.length; fi++) {
					var fr = free[fi];
					var opts = allowRotate
						? [{ L: q.L, W: q.W, rot: false }, { L: q.W, W: q.L, rot: true }]
						: [{ L: q.L, W: q.W, rot: false }];
					for (var oi = 0; oi < opts.length; oi++) {
						var o = opts[oi];
						if (o.L > fr.L || o.W > fr.W) continue;
						var score = Math.min(fr.L - o.L, fr.W - o.W);
						if (!best || score < best.score ||
							(score === best.score && (fr.L * fr.W) < best.area)) {
							best = { qi: qi, fi: fi, L: o.L, W: o.W, rot: o.rot,
								score: score, area: fr.L * fr.W };
						}
					}
				}
			}
			if (!best) break;

			var target = free[best.fi];
			var piece = queue[best.qi];
			placements.push({ piece: piece, x: target.x, y: target.y,
				L: best.L, W: best.W, rotated: best.rot });
			queue.splice(best.qi, 1);
			var children = splitFree(target, best.L, best.W, kerf);
			free.splice(best.fi, 1);
			free = free.concat(children);
		}
		return { placements: placements, free: free };
	}

	function packOnce(pieces, boardL, boardW, trim, kerf, allowRotate) {
		var queue = pieces.slice();
		var boards = [];
		var guard = 0;
		while (queue.length && guard++ < 5000) {
			var before = queue.length;
			var b = fillBoard(queue, boardL, boardW, trim, kerf, allowRotate);
			if (!b.placements.length) break;
			boards.push(b);
			if (queue.length === before) break;
		}
		return { boards: boards, unplaced: queue };
	}

	function nestBoards(pieces, boardL, boardW, trim, kerf, allowRotate) {
		var orders = [
			function (a, b) { return (b.L * b.W) - (a.L * a.W); },
			function (a, b) { return (b.W - a.W) || (b.L - a.L); },
			function (a, b) { return (b.L - a.L) || (b.W - a.W); },
			function (a, b) { return Math.max(b.L, b.W) - Math.max(a.L, a.W); },
			function (a, b) { return ((b.L + b.W) - (a.L + a.W)); },
		];
		var best = null;
		orders.forEach(function (cmp) {
			var sorted = pieces.slice().sort(cmp);
			var res = packOnce(sorted, boardL, boardW, trim, kerf, allowRotate);
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

	function layoutBoard(board, boardL, boardW, trim, kerf) {
		var rects = [];
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

	function signature(lay) {
		return lay.rects.map(function (r) {
			return r.type + ':' + r.x + ',' + r.y + ',' + r.L + ',' + r.W + (r.label ? ',' + r.label : '');
		}).join('|');
	}

	function buildPatterns(data) {
		var saw = sawSettings(data);
		var panels = collectPanels(data);
		if (!panels.length) return { patterns: [], saw: saw, unplaced: [] };

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

			var pieces = [];
			list.forEach(function (p) {
				for (var i = 0; i < p.qty; i++) pieces.push(p);
			});

			var res = nestBoards(pieces, boardL, boardW, saw.trim, saw.kerf, !first.hasGrain);
			res.unplaced.forEach(function (p) { unplaced.push(p.label + ' (too large for the board)'); });

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

	function donut(title, slices) {
		var total = slices.reduce(function (a, s) { return a + s.value; }, 0);
		var R = 78, r = 46, cx = 90, cy = 90, path = '';
		if (total > 0) {
			var ang = -Math.PI / 2;
			slices.forEach(function (s) {
				if (s.value <= 0) return;
				var sweep = (s.value / total) * Math.PI * 2;
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

		function top(r) { return W - r.y - r.W; }

		lay.rects.forEach(function (r) {
			if (r.type === 'item') return;
			var fill = r.type === 'waste' ? 'url(#pr-h-waste)' : 'url(#pr-h-trim)';
			svg += '<rect x="' + r.x + '" y="' + top(r) + '" width="' + r.L + '" height="' + r.W +
				'" fill="' + fill + '" stroke="#b8b8b8" stroke-width="1.5"/>';
			if (r.type !== 'waste') return;
			var fs = Math.min(r.L, r.W) * 0.26;
			fs = Math.max(14, Math.min(fs, 46));
			if (r.L < fs * 4.2 || r.W < fs * 1.5) return;
			svg += '<text x="' + (r.x + r.L / 2) + '" y="' + (top(r) + r.W / 2 + fs * 0.35) +
				'" font-size="' + fmt(fs, 1) + '" text-anchor="middle" fill="#7a2323" ' +
				'font-family="Arial" font-weight="600">' +
				fmt(r.L, 0) + ' \u00d7 ' + fmt(r.W, 0) + '</text>';
		});

		lay.rects.forEach(function (r) {
			if (r.type !== 'item') return;
			var y = top(r);
			/* every nested piece links through to its panel detail page */
			var guid = r.piece && r.piece.panelGuid;
			if (guid) svg += '<a class="pr-piece" href="#/panels/' + esc(guid) + PANEL_KEY_SUFFIX + '">';
			svg += '<rect x="' + r.x + '" y="' + y + '" width="' + r.L + '" height="' + r.W +
				'" fill="' + F_PANEL + '" stroke="' + F_PANEL_EDGE + '" stroke-width="4"/>';
			var cx = r.x + r.L / 2, cy = y + r.W / 2;
			var fs = Math.max(20, Math.min(r.L, r.W) * 0.11);
			if (p.hasGrain) {
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
			if (guid) svg += '</a>';
		});

		svg += '<rect x="0" y="0" width="' + L + '" height="' + W + '" fill="none" stroke="#6b6b6b" stroke-width="3"/></svg>';
		return svg;
	}

	function card(label, value) {
		return '<div class="pr-card"><b>' + esc(label) + '</b> ' +
			(value === '' ? '' : '<span class="pr-cv">' + esc(value) + '</span>') + '</div>';
	}

	function render(app, data) {
		var st = UI.detail;
		var built = buildPatterns(data);
		var pats = built.patterns;

		/* arrived from the Patterns table? show only that pattern */
		var only = routeParam('p');
		if (only) {
			var picked = pats.filter(function (p) { return p.name === only; });
			if (picked.length) pats = picked;
		}

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

		var summaryBlock = (st.perPage === 'all') ? '' :
			'<div class="pr-panel">' +
				'<div class="pr-cards">' +
					card('Total Panels:', T.nP) +
					areaCard('Panels Area:', T.panels) +
					areaCard('Waste Area:', T.waste) +
					areaCard('Trim Area:', T.trims) +
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
			'<h1 class="MuiTypography-root MuiTypography-h1">' +
			(only ? esc(only) : 'List of Nested Patterns') + '</h1>' +
			(only ? '<div class="pr-bar"><a class="pr-link" href="' + ROUTE_PATTERNS +
				'">&larr; All patterns</a></div>' : '') +
			toolbar(st, [
				{ key: 'category', label: 'Category' },
				{ key: 'material', label: 'Material' },
				{ key: 'frame', label: 'Frame' },
			], { zoom: true, saw: built.saw }) +
			summaryBlock;

		var cols, sheetStyle = '', fitAttr = '';
		if (st.perPage === 'all') {
			cols = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(shown.length))));
			fitAttr = ' data-fit="1"';
		} else {
			cols = st.perPage;
		}
		if (st.zoom > 1) sheetStyle = ' style="width:' + fmt(100 * st.zoom, 4) + '%;"';
		html += '<div class="pr-sheets-wrap"><div class="pr-sheets" data-cols="' + cols + '"' +
			fitAttr + sheetStyle + '>';

		shown.forEach(function (p) {
			var l = p.layout;
			var wastePc = l.areaTotal ? l.areaWaste * 100 / l.areaTotal : 0;
			html += '<div class="pr-panel' + (st.zoom > 1 ? ' pr-wide' : '') + '">' +
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
		if (st.perPage === 'all') {
			var sheetsEl = app.querySelector('.pr-sheets');
			var overlay = document.getElementById(OVERLAY_ID);
			if (sheetsEl && overlay && shown.length) {
				var rows = Math.ceil(shown.length / cols);
				var viewportBottom = overlay.getBoundingClientRect().bottom;
				var gridTop = sheetsEl.getBoundingClientRect().top;
				var avail = viewportBottom - gridTop - 20;
				var perTile = (avail - (rows - 1) * 16) / rows - 40;
				sheetsEl.style.setProperty('--pr-tileh', Math.max(40, perTile) + 'px');

				var over = sheetsEl.getBoundingClientRect().bottom - viewportBottom + 12;
				if (over > 0) {
					var shrunk = Math.max(40, perTile - (over / rows));
					sheetsEl.style.setProperty('--pr-tileh', shrunk + 'px');
				}
			}
		}
		bindBar(app, st);
	}

	function projectQuantity(data) {
		var q = (window.SwoodClient && window.SwoodClient.resolveQty)
			? window.SwoodClient.resolveQty(data.swcps)
			: 0;
		return q > 0 ? q : 1;
	}

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

	function edgebandMaterialName(a) {
		var m = /\[\s*(.+?)\s*\]/.exec(a.name || '');
		return m ? m[1] : (a.name || '');
	}

	function summaryModel(data, patterns) {
		var pq = projectQuantity(data);
		var articles = (data.costing && data.costing.articles) || [];
		var materials = indexBy(data.materials, 'ID');

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
				var areaEach = (p.boardL * p.boardW) / 1e6;
				byBoard[nm] = {
					name: nm,
					description: mv.MAT_DESC || '',
					thickness: mv.MAT_T || '',
					quantity: 0,
					areaEach: areaEach,
					unitCost: areaEach ? ((uc === undefined ? 0 : uc) / areaEach) : 0,
				};
				boards.push(byBoard[nm]);
			}
			byBoard[nm].quantity += p.quantity;
		});
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

		var panelProcess = [];
		try {
			var procByKey = {};
			(data.panelProcesses || []).forEach(function (pp) {
				var pv = vars(pp);
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

	function rateText(v, unit) {
		return money(v, Math.abs(v) < 100 ? 3 : 2) + (unit ? ' /' + unit : '');
	}

	var SUM_ACC = [];

	function summaryTable(title, rows, opts) {
		if (!rows.length) return '';
		var section = opts.section || title;
		var showThk = opts.thickness !== false;
		var areaUnit = UNITS.imperial ? 'ft\u00b2' : 'm\u00b2';
		var head = ['Material', 'Description'].concat(showThk ? ['Thickness'] : [])
			.concat(opts.area ? ['Area each'] : [])
			.concat(['Quantity', 'Unit Cost', 'Cost']);
		var rowCosts = [];
		var body = rows.map(function (r, i) {
			var cq = convertQty(r.quantity, r.unit);
			var q = opts.unitInQty ? fmt(cq.value, 3) + ' ' + (cq.unit || '') : fmt(r.quantity, 0);
			var k = rateKey(section, r.name);
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

	/* Hardware, and reused for Miscellaneous.
	   'section' namespaces the editable rates so Hardware and Miscellaneous
	   overrides never collide. */
	function summaryHardwareTable(rows, title, section) {
		if (!rows.length) return ''
		section = section || title || 'Hardware'
		var head = ['Name', 'Configuration', 'Reference', 'Quantity', 'Unit Cost', 'Cost']
		var rowCosts = []
		var body = rows.map(function (r, i) {
			var key = r.name + '|' + (r.configuration || '')
			var k = rateKey(section, key)
			var cost = (k in RATES) ? r.quantity * RATES[k] : r.cost
			rowCosts.push(cost)
			var cells = [esc(r.name), esc(r.configuration), esc(r.reference),
				fmt(r.quantity, 0),
				rateCell(section, key, r.unitCost, r.unit),
				money(cost)]
			return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
				return '<td class="' + (ci >= 3 ? 'pr-num' : '') + '">' + c + '</td>'
			}).join('') + '</tr>'
		}).join('')
		var sum = rowCosts.reduce(function (a, c) { return a + c }, 0)
		SUM_ACC.push(sum)
		var foot = '<tr class="pr-tot">' + head.map(function (_, ci) {
			return '<td class="' + (ci >= 3 ? 'pr-num' : '') + '">' + (ci === head.length - 1 ? money(sum) : '') + '</td>'
		}).join('') + '</tr>'
		var bar = tableTitleBar(title || 'Hardware', rows.length + ' item' + (rows.length === 1 ? '' : 's'))
		return '<div class="pr-tbl-shell">' + bar.html +
			'<table class="pr-tbl"><thead><tr>' +
			head.map(function (h, ci) { return '<th class="' + (ci >= 3 ? 'pr-num' : '') + '">' + esc(h) + '</th>' }).join('') +
			'</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>'
	}

	/* Panel & Part Process.
	   Name links through to the Panel & Part Process page, quantity follows
	   the m2 / ft2 toggle, and the rate is editable like every other section. */
	function summaryProcessTable(rows, title) {
		if (!rows.length) return ''
		var section = 'PanelProcess'
		var head = ['Name', 'Quantity', 'Unit Cost', 'Cost']
		var rowCosts = []
		var body = rows.map(function (r, i) {
			var cq = convertQty(r.quantity, r.unit || 'm2')
			var k = rateKey(section, r.name)
			var cost = (k in RATES) ? r.quantity * RATES[k] : r.cost
			rowCosts.push(cost)
			var link = '<a class="pr-link" href="' + ROUTE_PANEL_PROCESSES +
				'?q=' + encodeURIComponent(r.name) + '">' + esc(r.name) + '</a>'
			var cells = [link,
				fmt(cq.value, 2) + (cq.unit ? ' ' + esc(cq.unit) : ''),
				rateCell(section, r.name, r.unitCost, cq.unit || r.unit),
				money(cost)]
			return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
				return '<td class="' + (ci >= 1 ? 'pr-num' : '') + '">' + c + '</td>'
			}).join('') + '</tr>'
		}).join('')
		var sum = rowCosts.reduce(function (a, c) { return a + c }, 0)
		SUM_ACC.push(sum)
		var foot = '<tr class="pr-tot">' + head.map(function (_, ci) {
			return '<td class="' + (ci >= 1 ? 'pr-num' : '') + '">' + (ci === head.length - 1 ? money(sum) : '') + '</td>'
		}).join('') + '</tr>'
		var bar = tableTitleBar(title || 'Panel Process', rows.length + ' item' + (rows.length === 1 ? '' : 's'))
		return '<div class="pr-tbl-shell">' + bar.html +
			'<table class="pr-tbl"><thead><tr>' +
			head.map(function (h, ci) { return '<th class="' + (ci >= 1 ? 'pr-num' : '') + '">' + esc(h) + '</th>' }).join('') +
			'</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>'
	}

	function computeFrameCosts(data, patterns, m) {
		var pq = projectQuantity(data);
		var frameOf = frameNameByPanel(data);
		var subOf = subFrameNameByPart(data);

		/* A panel has no refPart and no material key. Its ID *is* the part
		   GUID, and the material sits on its CORE stock. Resolve both once. */
		var panelMat = {};
		(data.stocks || []).forEach(function (st2) {
			if (st2.part && st2.material && !panelMat[st2.part]) panelMat[st2.part] = st2.material;
		});
		function panelInfo(pn) {
			var pid = pn.ID;
			return {
				part: parts[pid] || null,
				materialName: panelMat[pid] || '',
				frame: frameOf[pid] || '',
				subFrame: subOf[pid] || '',
			};
		}
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

	function summaryModeBar(fc) {
		var st = UI.summary;
		var html = '<div class="pr-bar">' +
			'<div class="pr-perpage"><span class="pr-pl">View</span><div class="pr-split">' +
				'<button data-pr="summode" data-v="mgmt"' + (st.mode === 'mgmt' ? ' class="on"' : '') + '>Mgmt</button>' +
				'<button data-pr="summode" data-v="client1"' + (st.mode === 'client1' ? ' class="on"' : '') + '>Client 1</button>' +
				'<button data-pr="summode" data-v="client2"' + (st.mode === 'client2' ? ' class="on"' : '') + '>Client 2</button>' +
				'<button data-pr="summode" data-v="factory"' + (st.mode === 'factory' ? ' class="on"' : '') + '>Factory (internal)</button>' +
			'</div></div>';
		if (st.mode === 'client' || st.mode === 'client2') {
			html += '<div class="pr-perpage"><span class="pr-pl">Layout</span><div class="pr-split">' +
				'<button data-pr="sumview" data-v="complete"' + (st.view === 'complete' ? ' class="on"' : '') + '>Complete Project</button>' +
				'<button data-pr="sumview" data-v="framewise"' + (st.view === 'framewise' ? ' class="on"' : '') + '>Frame-wise</button>' +
			'</div></div>';
		} else if (st.mode === 'factory') {
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

	function factoryWasteCard(fc) {
		if (!fc.boardsFullTotal) return '';
		var pc = fc.boardsFullTotal ? (fc.waste * 100 / fc.boardsFullTotal) : 0;
		return '<div class="pr-card"><b>Cutting Waste / Trim:</b> <span class="pr-cv">' + money(fc.waste) +
			'</span> <span class="pr-pl">(' + fmt(pc, 1) + '% of board cost - included in the Boards total above, shown separately for reference)</span></div>';
	}

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

	/* ==================================================================
	 * MGMT SUMMARY  -  13 sections, each hidden when it has no rows
	 * ------------------------------------------------------------------
	 *   1  Boards            cutting-pattern boards only
	 *   2  Material          used in the job but with NO board in the
	 *                        board library, so it never became a board row
	 *   3  Glass             material flag GLASS = True
	 *   4  Solidwood         material flag HARDWOOD = True
	 *   5  Countertops       matched on name/description keywords below
	 *   6  Laminates         7  Edgebands      8  Weldments
	 *   9  Sheetmetal        MATERIAL only. Coating stays in section 11,
	 *                        so nothing is counted twice.
	 *  10  Hardware         11  Panel & Part Process
	 *  12  Miscellaneous     items with Exclude = Yes that carry a price,
	 *                        costed as Unit Price x Misc Qty
	 *  13  Cost factor       multiplier on the grand total, 1.5 - 1.75
	 *
	 * Glass, Solidwood and Weldment classify themselves - SWOOD already
	 * publishes GLASS / HARDWOOD / METAL / PANEL / PROFILE / WELDMENT on
	 * every material. Countertops have no such flag, hence the keywords.
	 *
	 * TO ADD A COUNTERTOP MATERIAL: add a word to COUNTERTOP_WORDS.
	 * TO CHANGE THE FACTOR RANGE: edit CONFIG.summary.costFactor in PART 1.
	 * ================================================================== */
	/* IIFE #2 has no CONFIG in scope - the config object is reached through
	   window.SwoodClient.config, the same way frames and takeOver do it.
	   Using CONFIG here threw 'CONFIG is not defined' and blanked the page. */
	function sumCfg() {
		return (window.SwoodClient && window.SwoodClient.config && window.SwoodClient.config.summary) || {}
	}

	function countertopWords() {
		return sumCfg().countertopWords ||
			['CORIAN', 'QUARTZ', 'COUNTERTOP', 'WORKTOP', 'GRANITE', 'MARBLE', 'SOLID SURFACE']
	}

	function matFlag(mv, name) { return String(mv[name] || '').toLowerCase() === 'true' }

	function isCountertop(row, mv) {
		var hay = ((row.name || '') + ' ' + (mv.MAT_DESC || row.description || '')).toUpperCase()
		var w = countertopWords()
		for (var i = 0; i < w.length; i++) {
			if (hay.indexOf(w[i]) >= 0) return true
		}
		return false
	}

	function matLookup(data) {
		var byId = indexBy(data.materials, 'ID')
		var byName = {}
		;(data.materials || []).forEach(function (m) {
			if (m.name) byName[m.name] = m
			var mv = vars(m)
			if (mv.MAT_NAME) byName[mv.MAT_NAME] = m
		})
		return { byId: byId, byName: byName }
	}

	function matVarsNamed(lookup, name) {
		return vars(lookup.byName[name] || lookup.byId[name] || {})
	}

	function gmKind(name, mv, panel) {
		var fn = window.SwoodClient && window.SwoodClient.glassMirrorKindOf
		if (fn) return fn(name, mv, panel) || ''
		var n = String(name || '').toUpperCase()
		var desc = String((mv && (mv.MAT_DESC || mv.MAT_NAME)) || '').toUpperCase()
		var hay = n + ' ' + desc
		if (matFlag(mv, 'MIRROR') || n === 'MIRROR' || /(^|[^A-Z])MIRROR/.test(hay)) return 'Mirror'
		if (matFlag(mv, 'GLASS') || n === 'GLASS' || /\bGLASS\b/.test(hay)) return 'Glass'
		return ''
	}

	function panelMatName(p, lookup) {
		var mat = p.material
		if (mat && typeof mat === 'object') return mat.name || vars(mat).MAT_NAME || ''
		var o = lookup.byId[mat] || lookup.byName[mat] || lookup.byId[p.materialId]
		return (o && o.name) || (typeof mat === 'string' ? mat : '') || ''
	}

	/* Piece-count glass/mirror from STOCKS (ST_L / ST_W / ST_T). Raw panels
	   in reportDataRaw have no material or sizes — those live on stocks. */
	function mgmtGlassFromPanels(data, kind) {
		var lookup = matLookup(data)
		var panels = indexBy(data.panels, 'ID')
		var byKey = {}
		var out = []
		function addRow(nm, mv, L, W, T, qty) {
			if (gmKind(nm, mv, null) !== kind) return
			if (!(L > 0 && W > 0) || !(qty > 0)) return
			var key = nm + '|' + L + '|' + W + '|' + T
			if (!byKey[key]) {
				byKey[key] = {
					name: nm,
					description: fmt(L, 0) + ' \u00d7 ' + fmt(W, 0),
					thickness: T ? String(T) : '',
					quantity: 0,
					areaEach: (L * W) / 1e6,
					unit: 'pcs',
					unitCost: parseFloat(mv.MAT_UCOST || mv.MAT_PRICEPERM2) || 0,
					cost: 0,
				}
				out.push(byKey[key])
			}
			byKey[key].quantity += qty
		}
		;(data.stocks || []).forEach(function (st) {
			if (st.multiBodyStockVariables && st.multiBodyStockVariables.length) return
			var mv = vars(lookup.byId[st.material] || lookup.byName[st.material] || {})
			if (String(mv.WELDMENT).toLowerCase() === 'true') return
			var sv = vars(st)
			var L = parseFloat(sv.ST_L) || 0
			var W = parseFloat(sv.ST_W) || 0
			var T = parseFloat(sv.ST_T) || 0
			var panel = panels[st.part]
			var qty = parseFloat(st.quantity) || parseFloat(panel && panel.quantity) || 1
			addRow(String(st.material || ''), mv, L, W, T, qty)
		})
		if (!out.length) {
			;(data.panels || []).forEach(function (p) {
				var nm = panelMatName(p, lookup)
				var mv = matVarsNamed(lookup, nm)
				addRow(nm, mv,
					parseFloat(p.lengthWithoutEdgebands || p.length) || 0,
					parseFloat(p.widthWithoutEdgebands || p.width) || 0,
					parseFloat(p.thickness) || 0,
					parseFloat(p.quantity) || 0)
			})
		}
		out.forEach(function (r) {
			r.cost = r.quantity * r.areaEach * r.unitCost
		})
		return out
	}

	function glassPieceQty(data, st, panel, part) {
		var partVars = part ? vars(part) : {}
		var qty = parseFloat(partVars.NB)
		if (!(qty > 0)) qty = parseFloat(st && st.quantity) || 1
		var SC = window.SwoodClient
		var pid = (part && part.ID) || (st && st.part) || (panel && panel.ID)
		if (!(SC && SC._nbAlreadyHasProduct)) {
			var pf = (SC && SC._productFactor && pid) ? SC._productFactor[pid] : 0
			if (pf > 1) qty = qty * pf
		}
		var proj = (SC && SC.projectQty) ? SC.projectQty(data.swcps) : 0
		if (proj > 1) qty = qty * proj
		return qty
	}

	function collectPanelSawRows(data, onlyGm) {
		var lookup = matLookup(data)
		var panels = indexBy(data.panels, 'ID')
		var frameOf = frameNameByPanel(data)
		var partsByPanel = {}
		;(data.parts || []).forEach(function (p) { if (p && p.panel) partsByPanel[p.panel] = p })
		var rows = []
		function pushRow(kind, id, name, L, W, T, qty, nm, cat, frame, panelGuid) {
			var isGm = kind === 'Glass' || kind === 'Mirror'
			if (onlyGm ? !isGm : isGm) return
			var areaM2 = (L * W * qty) / 1e6
			rows.push({
				kind: kind || 'Panel',
				id: id || '',
				panelGuid: panelGuid || '',
				name: name || '',
				cutL: L, cutW: W, thk: T,
				qty: qty,
				material: nm,
				category: cat || '',
				frame: String(frame || 'No Parent'),
				areaM2: areaM2,
				areaFt2: areaM2 * 10.7639,
				desc: '',
			})
		}
		;(data.stocks || []).forEach(function (st) {
			if (st.multiBodyStockVariables && st.multiBodyStockVariables.length) return
			var matObj = lookup.byId[st.material] || lookup.byName[st.material] || {}
			var mv = vars(matObj)
			if (String(mv.WELDMENT).toLowerCase() === 'true') return
			var sv = vars(st)
			var L = parseFloat(sv.ST_L) || 0
			var W = parseFloat(sv.ST_W) || 0
			var T = parseFloat(sv.ST_T) || 0
			if (!(L > 0 && W > 0)) return
			var panel = panels[st.part] || {}
			var part = partsByPanel[st.part]
			var nm = String(st.material || panelMatName(panel, lookup) || '')
			var kind = gmKind(nm, mv, panel)
			if (!onlyGm && String(mv.MAT_ISFORSAW).toLowerCase() === 'false' && !kind) return
			var cps = mgmtProps(panel.swcps)
			var partProps = mgmtProps(part && part.swcps)
			var cat = mv.CATEGORY || mv.MAT_CAT || mv.MAT_TYPE || ''
			pushRow(kind, partProps.ID || cps.ID || cps.PanelID || '', panel.name || nm, L, W, T,
				glassPieceQty(data, st, panel, part),
				nm, cat, frameOf[st.part] || cps['Project Name'] || '', panel.ID || st.part || '')
		})
		if (rows.length) return rows
		;(data.panels || []).forEach(function (p) {
			var nm = panelMatName(p, lookup)
			var mv = matVarsNamed(lookup, nm)
			var kind = gmKind(nm, mv, p)
			var cps = mgmtProps(p.swcps)
			var L = parseFloat(p.lengthWithoutEdgebands || p.length) || 0
			var W = parseFloat(p.widthWithoutEdgebands || p.width) || 0
			var T = parseFloat(p.thickness) || 0
			var frame = ''
			if (p.frames && p.frames.length) {
				var f0 = p.frames[0]
				frame = (f0 && (f0.name || f0)) || ''
			}
			if (!frame) frame = cps['Project Name'] || 'No Parent'
			var cat = ''
			if (p.material && typeof p.material === 'object') cat = p.material.category || ''
			if (!cat) cat = mv.MAT_CAT || mv.MAT_TYPE || ''
			var part = partsByPanel[p.ID]
			pushRow(kind, cps.ID || cps.PanelID || '', p.name || '', L, W, T,
				glassPieceQty(data, { part: p.ID, quantity: p.quantity }, p, part),
				nm, cat, frame, p.ID)
		})
		return rows
	}

	function renderSawLike(app, data, onlyGm) {
		var st = onlyGm ? UI.gm : UI.saw
		if (!st) st = { q: '', split: 'none' }
		var rows = collectPanelSawRows(data, onlyGm)
		try { console.log('[SwoodClient] ' + (onlyGm ? 'Glass&Mirror' : 'Saw') + ' overlay rows:', rows.length, 'stocks:', ((data && data.stocks) || []).length) } catch (e) {}
		var q = String(st.q || '').toLowerCase()
		if (q) {
			rows = rows.filter(function (r) {
				return (r.name + ' ' + r.material + ' ' + r.frame + ' ' + r.kind).toLowerCase().indexOf(q) >= 0
			})
		}
		var split = st.split || 'none'
		var grouped = []
		if (split === 'none') grouped = [{ title: '', rows: rows }]
		else {
			var key = split === 'category' ? 'category' : split === 'material' ? 'material' : 'frame'
			var map = {}
			rows.forEach(function (r) {
				var k = r[key] || 'No Parent'
				if (!map[k]) {
					map[k] = []
					grouped.push({ title: k, rows: map[k] })
				}
				map[k].push(r)
			})
		}
		function btn(id, label) {
			return '<button type="button" data-gm-split="' + id + '"' +
				(split === id ? ' class="on"' : '') + '>' + label + '</button>'
		}
		var title = onlyGm ? 'Glass & Mirror' : 'Saw Machine Data'
		var hint = onlyGm
			? (rows.length ? rows.length + ' glass / mirror part(s)' : 'No glass or mirror panels in this report.')
			: (rows.length ? rows.length + ' saw part(s) (glass / mirror listed separately)' : 'No saw parts in this report.')
		function idxCell(r) {
			if (!r.id) return ''
			if (!r.panelGuid) return esc(r.id)
			return '<a class="pr-link" href="#/panels/' + esc(r.panelGuid) + PANEL_KEY_SUFFIX + '">' + esc(r.id) + '</a>'
		}
		function nameCell(r) {
			if (!r.panelGuid) return esc(r.name)
			return '<a class="pr-link" href="#/panels/' + esc(r.panelGuid) + PANEL_KEY_SUFFIX + '">' + esc(r.name) + '</a>'
		}
		/* Type + Frame omitted: Split already covers Category / Frame / Material. */
		var head = onlyGm
			? ['INDEX', 'Part Name', 'CUT_L', 'CUT_W', 'P.THK', 'Qty', 'Material', 'Area m\u00b2', 'Area ft\u00b2']
			: ['INDEX', 'Part Name', 'CUT_L', 'CUT_W', 'P.THK', 'Qty', 'Material', 'Frame']
		var numFrom = onlyGm ? 2 : 2
		var numTo = onlyGm ? 8 : 5
		var tables = grouped.map(function (g) {
			if (!g.rows.length) return ''
			var totM2 = 0
			var totFt = 0
			var totQty = 0
			var body = g.rows.map(function (r, i) {
				totM2 += r.areaM2 || 0
				totFt += r.areaFt2 || 0
				totQty += r.qty || 0
				var cells = onlyGm
					? [idxCell(r), nameCell(r), fmt(r.cutL, 1), fmt(r.cutW, 1), fmt(r.thk, 1), fmt(r.qty, 0), esc(r.material), fmt(r.areaM2, 3), fmt(r.areaFt2, 2)]
					: [esc(r.id), esc(r.name), fmt(r.cutL, 1), fmt(r.cutW, 1), fmt(r.thk, 1), fmt(r.qty, 0), esc(r.material), esc(r.frame)]
				return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
					return '<td class="' + (ci >= numFrom && ci <= numTo ? 'pr-num' : '') + '">' + c + '</td>'
				}).join('') + '</tr>'
			}).join('')
			var foot = ''
			if (onlyGm) {
				foot = '<tr class="pr-even"><td></td><td><b>Total</b></td><td></td><td></td><td></td><td class="pr-num"><b>' +
					fmt(totQty, 0) + '</b></td><td></td><td class="pr-num"><b>' + fmt(totM2, 3) +
					'</b></td><td class="pr-num"><b>' + fmt(totFt, 2) + '</b></td></tr>'
			}
			var meta = g.rows.length + ' item' + (g.rows.length === 1 ? '' : 's') +
				(onlyGm ? ' \u2014 ' + fmt(totQty, 0) + ' pc' : '')
			var tb = tableTitleBar(g.title || title, meta)
			return '<div class="pr-tbl-shell">' + tb.html +
				'<table class="pr-tbl"><thead><tr>' +
				head.map(function (h, ci) {
					return '<th class="' + (ci >= numFrom && ci <= numTo ? 'pr-num' : '') + '">' + esc(h) + '</th>'
				}).join('') + '</tr></thead><tbody>' + body + foot + '</tbody></table></div>'
		}).join('')
		app.innerHTML = '<h1 class="MuiTypography-root MuiTypography-h1">' + esc(title) + '</h1>' +
			'<div class="pr-bar"><input class="pr-search gm-q" placeholder="Search..." value="' + esc(st.q || '') + '">' +
			'<span class="pr-pl">Split</span><div class="pr-split">' +
			btn('none', 'None') + btn('category', 'Category') + btn('frame', 'Frame') + btn('material', 'Material') +
			'</div></div>' +
			'<div class="pr-empty" style="padding:8px 0 12px">' + esc(hint) + '</div>' +
			(tables || '<div class="pr-empty"><b>' + esc(hint) + '</b></div>')
		var box = app.querySelector('.gm-q')
		if (box) box.addEventListener('change', function () {
			st.q = box.value; renderSawLike(app, data, onlyGm)
		})
		app.querySelectorAll('[data-gm-split]').forEach(function (b) {
			b.addEventListener('click', function () {
				st.split = b.getAttribute('data-gm-split'); renderSawLike(app, data, onlyGm)
			})
		})
	}

	/* Split the stock-material rows into sections 2, 4 and 5.
	   Glass / Mirror are NOT taken from costing STOCK articles — those
	   miss the piece qty. They are rebuilt from panels in mgmtGlassFromPanels.
	   Anything already represented by a board row in section 1 is dropped. */
	function mgmtSplitMaterials(data, m) {
		var lookup = matLookup(data)
		var onBoard = {}
		m.boards.forEach(function (b) {
			onBoard[String(b.name).replace(/\s*\([^)]*\)\s*$/, '')] = true
		})
		var out = { material: [], glass: [], solidwood: [], countertop: [] }
		m.materials.forEach(function (r) {
			var mv = matVarsNamed(lookup, r.name)
			var kind = gmKind(r.name, mv, null)
			if (kind === 'Glass' || kind === 'Mirror') return
			if (matFlag(mv, 'HARDWOOD')) { out.solidwood.push(r); return }
			if (isCountertop(r, mv)) { out.countertop.push(r); return }
			if (onBoard[r.name]) return
			out.material.push(r)
		})
		return out
	}

	/* Section 8 - weldment LENGTH, recomputed from the stock records.
	
	   SWOOD's costing article for a profile reports ST_L, which on a profile
	   is the 20 mm SECTION, not the length - so every 700 mm tube was being
	   costed as 20 mm and the section read 4.800 m instead of 432.800 m.
	   For profiles the real length is in ST_T:
	
	       ST_L = 20      section width
	       ST_W = 20      section height
	       ST_T = 700     length
	       ST_N = "Square tube 20 X 20 X 2(1)[1]"   a NAME, not a count
	
	   Verified on Assem1: sum(ST_T x productQty) = 43.28 m, x project 10
	   = 432.800 m.
	
	   TO GO BACK to SWOOD's own figure: return m.weldments unchanged. */
	/* Section 8 - weldments, priced the way they are bought: by WEIGHT.
	
	   Quantity is the PURCHASED weight - bars x kg per bar - not the weight
	   that ends up in the parts, because the drop is paid for too. It comes
	   from the same nest as the Bar Requirement page, so the two agree and
	   both follow the stock length / kerf boxes there.
	
	   Length still drives it underneath: piece length is ST_T, not ST_L; on
	   a profile ST_L is the 20 mm section. That bug had the section reading
	   4.800 m instead of 432.800 m. */
	function mgmtWeldments(data, m) {
		try {
			var mats = indexBy(data.materials, 'ID')
			var groups = weldNest(collectWeldPieces(data), weldKgPerM(data))
			if (!groups.length) return m.weldments
			return groups.map(function (g) {
				var mv = vars(mats[g.material] || {})
				var qty = g.boughtKg > 0 ? g.boughtKg : g.usedMm / 1000
				return {
					name: g.material,
					description: (mv.MAT_DESC || '') +
						(g.bars ? '  \u00b7  ' + g.bars + ' bar(s) \u00d7 ' + fmt(weldCfg().stockLength / 1000, 2) + ' m' : ''),
					thickness: '',
					quantity: qty,
					unit: g.boughtKg > 0 ? 'kg' : 'm',
					unitCost: 0,
					cost: 0,
				}
			})
		} catch (e) {
			console.error('weldment weight section skipped:', e)
			return m.weldments
		}
	}
	/* part id -> Product Quantity of the product it belongs to */
	function productFactorByPart(data) {
		var asm = indexBy(data.assemblies, 'ID')
		var fac = {}
		;(data.assemblies || []).forEach(function (a) {
			var q = parseFloat(mgmtProps(a.swcps)['Product Quantity']) || 0
			if (!(q > 1)) return
			var seen = {}
			;(function walk(id) {
				var A = asm[id]
				if (!A || seen[id]) return
				seen[id] = 1
				;(A.parts || []).forEach(function (p) { fac[p] = Math.max(fac[p] || 0, q) })
				;(A.assemblies || []).forEach(function (c) { fac[c] = Math.max(fac[c] || 0, q); walk(c) })
			})(a.ID)
		})
		return fac
	}

	/* Section 9 - sheet metal MATERIAL.
	
	   Columns: Material, Thickness, Sheet Size, No. of Sheets, Weight/sheet,
	   Rate per sheet, Cost.  No m2 / ft2 quantity - sheets are what gets
	   bought.  Coating cost stays in section 11, so nothing is double counted.
	
	   Sheet count comes from the same nester as the Sheetmetal Layout page,
	   so the two always agree.
	
	   Weight = sheet area x thickness x density, density from the material's
	   MAT_DENSITY. If a material has no density the weight cell shows a dash
	   rather than a wrong number.
	
	   The rate is a manual input for now, per sheet. When the cost .js file
	   exists it can fill unitCost here and the manual entry stays as an
	   override, exactly like every other section. */
	function mgmtSheetMetal(data) {
		try {
			var materials = indexBy(data.materials, 'ID')
			var rows = collectSheetMetal(data)
			if (!rows.length) return []

			/* Density per material, taken from the way SWOOD reports part mass:
			   mass g / (blank area mm2 x thickness mm / 1000) = g/cm3.
			   Checked on Assem1: MS 7.816, AISI 304 8.012, and 1.000 for the
			   material with nothing specified - which is SOLIDWORKS' default and
			   a signal that the material needs setting up, not a real density. */
			var smDensity = {}
			rows.forEach(function (r) {
				var mat = (r.material && r.material.name) || ''
				if (!mat || smDensity[mat]) return
				var volCm3 = (r.blankMm2 || 0) * (r.thickness || 0) / 1000
				if (volCm3 > 0 && r.massEach > 0) smDensity[mat] = r.massEach / volCm3
			})
			var nest = smBuildNest(rows)
			var by = {}, out = []
			nest.forEach(function (sh) {
				var first = sh.placed[0] && sh.placed[0].row
				var mat = (first && first.material && first.material.name) || 'Material <not specified>'
				var thk = (first && first.thickness) || 0
				var key = mat + '|' + thk + '|' + sh.sheet.L + 'x' + sh.sheet.W
				if (!by[key]) {
					var mv = vars(materials[mat] || {})
					var dens = smDensity[mat] || parseFloat(mv.MAT_DENSITY) || 0
					var areaM2 = (sh.sheet.L * sh.sheet.W) / 1e6
					by[key] = {
						name: mat,
						description: mv.MAT_DESC || '',
						thickness: thk,
						sheetL: sh.sheet.L, sheetW: sh.sheet.W,
						sheets: 0,
						density: dens,
						/* density is g/cm3; area m2 x thk mm x density = kg */
						/* g/cm3 x (m2 x mm) = kg, the units cancel exactly */
						weight: dens > 0 ? areaM2 * thk * dens : 0,
						unitCost: parseFloat(mv.MAT_UCOST) || 0,
						cost: 0,
					}
					out.push(by[key])
				}
				by[key].sheets += 1
			})
			/* rate is per KG, so cost = sheets x weight/sheet x rate */
			out.forEach(function (r) { r.cost = r.sheets * r.weight * r.unitCost })
			return out
		} catch (e) {
			console.error('sheetmetal summary section skipped:', e)
			return []
		}
	}

	function mgmtSheetMetalTable(rows, title) {
		if (!rows.length) return ''
		var section = 'Sheetmetal'
		var head = ['Material', 'Thickness', 'Sheet Size', 'No. of Sheets',
			'Weight / sheet', 'Total Weight', 'Rate / kg', 'Cost']
		var rowCosts = []
		var body = rows.map(function (r, i) {
			var k = rateKey(section, r.name + '|' + r.thickness)
			var totKg = r.sheets * r.weight
			var cost = (k in RATES) ? totKg * RATES[k] : r.cost
			rowCosts.push(cost)
			var cells = [
				esc(r.name),
				esc(r.thickness),
				fmt(r.sheetL, 0) + ' \u00d7 ' + fmt(r.sheetW, 0) + ' mm',
				fmt(r.sheets, 0),
				r.weight > 0 ? fmt(r.weight, 2) + ' kg' : '\u2014',
				totKg > 0 ? fmt(totKg, 2) + ' kg' : '\u2014',
				rateCell(section, r.name + '|' + r.thickness, r.unitCost, 'kg'),
				money(cost),
			]
			return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
				return '<td class="' + (ci >= 3 ? 'pr-num' : '') + '">' + c + '</td>'
			}).join('') + '</tr>'
		}).join('')
		var sum = rowCosts.reduce(function (a, c) { return a + c }, 0)
		SUM_ACC.push(sum)
		var foot = '<tr class="pr-tot">' + head.map(function (_, ci) {
			return '<td class="' + (ci >= 3 ? 'pr-num' : '') + '">' + (ci === head.length - 1 ? money(sum) : '') + '</td>'
		}).join('') + '</tr>'
		var bar = tableTitleBar(title, rows.length + ' item' + (rows.length === 1 ? '' : 's'))
		return '<div class="pr-tbl-shell">' + bar.html +
			'<table class="pr-tbl"><thead><tr>' +
			head.map(function (h, ci) { return '<th class="' + (ci >= 3 ? 'pr-num' : '') + '">' + esc(h) + '</th>' }).join('') +
			'</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>'
	}

	/* swcps is a { name, value } list in the raw data and an object keyed by
	   name on a model row. Read either. The swcpsMap in PART 1 is in another
	   IIFE and not reachable from here. */
	function mgmtProps(swcps) {
		var m = {}
		if (!swcps) return m
		if (Object.prototype.toString.call(swcps) === '[object Array]') {
			for (var i = 0; i < swcps.length; i++) {
				if (swcps[i]) m[swcps[i].name] = swcps[i].value
			}
			return m
		}
		return swcps
	}

	/* Section 12 - excluded items that carry a price. */
	function mgmtMiscellaneous(data) {
		var pq = projectQuantity(data)
		var rows = []
		;(data.excluded || []).forEach(function (it) {
			var c = mgmtProps(it.swcps)
			var price = parseFloat(c['Unit Price'] || c['UnitPrice'] || c['Price'] || c['Cost']) || 0
			if (!(price > 0)) return               /* no price, nothing to report */
			var qty = parseFloat(c['Misc Qty'] || c['Quantity'] || c['NB']) || 1
			rows.push({
				name: it.name || c.Description || '',
				configuration: c['Misc Category'] || it.configuration || '',
				reference: c.Reference || '',
				quantity: qty * pq,
				unit: c['Misc Unit'] || '',
				unitCost: price,
				cost: qty * pq * price,
			})
		})
		return rows
	}

	/* Section 11 - Panel & Part Process.
	
	   summaryModel builds this from data.processZones, which only covers
	   PANEL zones - so the summary showed 2 processes while the Panel & Part
	   Process page showed 6. The page uses collectCoated + SC.coating, which
	   also sees sheet metal and weldment coatings. Same source here, so the
	   two pages agree by construction. */
	function mgmtProcesses(data, m) {
		try {
			/* SC lives in IIFE #1; every function in here reaches it the same
			   way - var SC = window.SwoodClient. */
			var SC = window.SwoodClient
			var C = SC && SC.coating
			if (!C) return m.panelProcess
			var rows = collectCoated(data)
			if (!rows.length) return m.panelProcess
			var by = {}, out = []
			rows.forEach(function (r) {
				C.processes(r).forEach(function (proc) {
					if (!proc) return
					var rate = C.rate ? (parseFloat(C.rate(proc)) || 0) : 0
					var key = proc + '|' + rate
					if (!by[key]) {
						by[key] = { name: proc, quantity: 0, unit: 'm2', unitCost: rate, cost: 0 }
						out.push(by[key])
					}
					by[key].quantity += C.areaM2(r, r.resource) || 0
				})
			})
			out.forEach(function (r) { r.cost = r.quantity * r.unitCost })

			/* processZones covers PANEL processes (the lacquers); collectCoated
			   covers metal ones. Neither is a superset, so merge by name and
			   keep the processZones figure where a name appears in both -
			   adding them would count the same coating twice. */
			var seen = {}
			var merged = []
			;(m.panelProcess || []).forEach(function (r) {
				seen[String(r.name).toUpperCase()] = true
				merged.push(r)
			})
			out.forEach(function (r) {
				if (seen[String(r.name).toUpperCase()]) return
				merged.push(r)
			})
			return merged.length ? merged : m.panelProcess
		} catch (e) {
			console.error('process section fell back to processZones:', e)
			return m.panelProcess
		}
	}

	function costFactor() {
		var cf = sumCfg().costFactor || {}
		var v = parseFloat(UI.summary.costFactor)
		if (!(v > 0)) v = parseFloat(cf.value) || 1.5
		return v
	}

	function costFactorCard(raw) {
		var cf = sumCfg().costFactor || {}
		var f = costFactor()
		return '<div class="pr-card">' +
			'<b>Cost factor (factory):</b> ' +
			'<input class="pr-rate pr-cf" type="number" step="' + (cf.step || 0.05) + '" ' +
			'min="' + (cf.min || 1.5) + '" max="' + (cf.max || 1.75) + '" value="' + f + '">' +
			' &nbsp; Cost ' + money(raw) +
			' &nbsp;&rarr;&nbsp; <b>' + money(raw * f) + '</b>' +
			'</div>'
	}

	/* Every section, built once. Mgmt renders the tables, Client 1 renders
	   only the labels and totals - so the two can never disagree, including
	   any rate you typed over the top. Each entry captures what the table
	   pushed onto SUM_ACC, which is the figure after RATES overrides. */
	function mgmtSections(data, m) {
		var split = mgmtSplitMaterials(data, m)
		var defs = [
			['1. Boards',                function () { return summaryTable('1. Boards', m.boards, { unitInQty: false, section: 'Boards', area: true, rateUnit: 'm2' }) }],
			['2. Material',              function () { return summaryTable('2. Material', split.material, { unitInQty: true, section: 'Materials' }) }],
			['3. Glass',                 function () { return summaryTable('3. Glass', mgmtGlassFromPanels(data, 'Glass'), { unitInQty: false, section: 'Glass', area: true, rateUnit: 'm2' }) }],
			['3b. Mirror',               function () { return summaryTable('3b. Mirror', mgmtGlassFromPanels(data, 'Mirror'), { unitInQty: false, section: 'Mirror', area: true, rateUnit: 'm2' }) }],
			['4. Solidwood / Hardwood',  function () { return summaryTable('4. Solidwood / Hardwood', split.solidwood, { unitInQty: true, section: 'Solidwood' }) }],
			['5. Countertops / Corian',  function () { return summaryTable('5. Countertops / Corian', split.countertop, { unitInQty: true, section: 'Countertops' }) }],
			['6. Laminates',             function () { return summaryTable('6. Laminates', m.laminates, { unitInQty: true, section: 'Laminates' }) }],
			['7. Edgebands',             function () { return summaryTable('7. Edgebands', m.edgebands, { unitInQty: true, section: 'Edgebands' }) }],
			['8. Weldments',             function () { return summaryTable('8. Weldments', mgmtWeldments(data, m), { unitInQty: true, thickness: false, section: 'Weldments' }) }],
			['9. Sheetmetal',            function () { return mgmtSheetMetalTable(mgmtSheetMetal(data), '9. Sheetmetal') }],
			['10. Hardware',             function () { return summaryHardwareTable(m.hardware, '10. Hardware') }],
			['11. Panel & Part Process', function () { return summaryProcessTable(mgmtProcesses(data, m), '11. Panel & Part Process') }],
			['12. Miscellaneous',        function () { return summaryHardwareTable(mgmtMiscellaneous(data), '12. Miscellaneous', 'Miscellaneous') }],
		]
		var out = []
		defs.forEach(function (d) {
			var before = SUM_ACC.length
			var html = d[1]()
			if (!html) return                       /* no rows - section hides */
			var sum = 0
			for (var i = before; i < SUM_ACC.length; i++) sum += SUM_ACC[i]
			out.push({ label: d[0], html: html, sum: sum })
		})
		return out
	}

	function discountPct() {
		var v = parseFloat(UI.summary.discount)
		return (isNaN(v) || v < 0) ? 0 : v
	}

	/* Quotation chrome shared by Client 1 and Client 2: a header block with
	   the project details, and a totals block. Styling lives in .pr-quote*
	   so the client pages do not look like the internal ones. */
	function quoteHeader(data, title) {
		var c = mgmtProps(data.swcps)
		var d = new Date()
		var rows = [
			['Project', data.projectName || c['Project Name'] || ''],
			['Client', c.Client || c.Customer || ''],
			['Order No.', c['Order Number'] || ''],
			['Date', d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear()],
		]
		return '<div class="pr-quote-head">' +
			'<div class="pr-quote-title">' + esc(title) + '</div>' +
			'<div class="pr-quote-meta">' +
			rows.filter(function (r) { return r[1] !== '' }).map(function (r) {
				return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'
			}).join('') +
			'</div></div>'
	}

	function quoteTotals(afterFactor, disc, discAmt, net) {
		var line = function (lbl, val, cls) {
			return '<div class="' + (cls || '') + '"><span>' + lbl + '</span><b>' + val + '</b></div>'
		}
		return '<div class="pr-quote-totals">' +
			line('Sub-total', money(afterFactor)) +
			(disc > 0 ? line('Discount (' + fmt(disc, 2) + '%)', '- ' + money(discAmt)) : '') +
			line('Total Price', money(net), 'pr-quote-grand') +
			'</div>'
	}

	function quoteControls(f, disc) {
		var cf = sumCfg().costFactor || {}
		return '<div class="pr-quote-ctl">' +
			'<label>Cost factor <input class="pr-rate pr-cf" type="number" step="' + (cf.step || 0.05) +
			'" min="' + (cf.min || 1.5) + '" max="' + (cf.max || 1.75) + '" value="' + f + '"></label>' +
			'<label>Discount <input class="pr-rate pr-disc" type="number" step="0.5" min="0" max="100" value="' + disc + '"> %</label>' +
			'</div>'
	}

	function bindQuoteControls(app, data) {
		var cfIn = app.querySelector('.pr-cf')
		if (cfIn) cfIn.addEventListener('change', function () {
			UI.summary.costFactor = parseFloat(cfIn.value); renderSummary(app, data)
		})
		var dIn = app.querySelector('.pr-disc')
		if (dIn) dIn.addEventListener('change', function () {
			UI.summary.discount = parseFloat(dIn.value); renderSummary(app, data)
		})
	}
	/* ==================================================================
	 * CLIENT 1  -  quotation. One priced line per section.
	 * No quantities, no rates, no internal breakdown.
	 * ================================================================== */
	function renderClient1Summary(app, data, built, m, fc) {
		SUM_ACC = []
		var sections = mgmtSections(data, m)
		var raw = sections.reduce(function (a, x) { return a + x.sum }, 0)
		var f = costFactor(), disc = discountPct()
		var afterFactor = raw * f
		var discAmt = afterFactor * disc / 100
		var net = afterFactor - discAmt

		var body = sections.map(function (x, i) {
			return '<tr>' +
				'<td class="pr-q-sr">' + (i + 1) + '</td>' +
				'<td>' + esc(x.label.replace(/^\d+\.\s*/, '')) + '</td>' +
				'<td class="pr-num">' + money(x.sum * f) + '</td></tr>'
		}).join('')

		app.innerHTML =
			summaryModeBar(fc) +
			'<div class="pr-quote">' +
			quoteHeader(data, 'Quotation') +
			quoteControls(f, disc) +
			'<table class="pr-qtbl"><thead><tr>' +
			'<th class="pr-q-sr">#</th><th>Description</th><th class="pr-num">Amount</th>' +
			'</tr></thead><tbody>' + body + '</tbody></table>' +
			quoteTotals(afterFactor, disc, discAmt, net) +
			'<div class="pr-quote-note">Prices are inclusive of material, edging, machining and finishing as listed. ' +
			'Taxes extra as applicable.</div>' +
			'</div>'

		bindQuoteControls(app, data)
		bindSummaryBar(app, renderSummary, data)
		bindExports(app)
	}

	/* ==================================================================
	 * CLIENT 2  -  quotation, FRAME-WISE.
	 * One line per FRAME. Sub-frames are rolled into their parent, never
	 * listed separately. Costs come from the cutting data - board area x
	 * rate from the patterns, edging length, process area, hardware - plus
	 * the sheet metal belonging to that frame.
	 * ================================================================== */
	/* Frame-wise rows.
	
	   computeFrameCosts covers board, edging, PANEL processes, hardware and
	   the cutting-waste share. It reads data.processZones, which only holds
	   panel zones - so POWDERCOAT, BUFFING, PVD and RED OXIDE were missing,
	   PVD alone being 88k. Those come from collectCoated, which carries a
	   frame on every row. Sheet metal is added the same way.
	
	   Anything still not attributable to a frame goes on one visible
	   'Unassigned / Project-level' line rather than being spread silently,
	   and the line is computed as the RESIDUAL against the section total -
	   so Client 1 and Client 2 always reconcile exactly, even if a future
	   cost type is added and nobody remembers to attribute it here. */
	function client2Rows(data, patterns, m, sectionRaw) {
		var fcRes = computeFrameCosts(data, patterns, m) || {}
		var byFrame = {}
		;(fcRes.frames || []).forEach(function (r) { byFrame[r.name] = r })

		function bump(name, bucket, amt) {
			if (!(amt > 0)) return
			name = name || ''
			if (!name) return false
			if (!byFrame[name]) byFrame[name] = { name: name, board: 0, edge: 0, proc: 0, hw: 0, total: 0 }
			byFrame[name][bucket] = (byFrame[name][bucket] || 0) + amt
			byFrame[name].total += amt
			return true
		}

		/* metal coatings, by frame */
		try {
			var SC = window.SwoodClient
			var C = SC && SC.coating
			if (C) {
				var zoneNames = {}
				;(m.panelProcess || []).forEach(function (r) { zoneNames[String(r.name).toUpperCase()] = true })
				collectCoated(data).forEach(function (r) {
					C.processes(r).forEach(function (proc) {
						if (!proc || zoneNames[String(proc).toUpperCase()]) return   /* already in proc bucket */
						var rate = parseFloat(C.rate(proc)) || 0
						if (!(rate > 0)) return
						bump(r.frame, 'proc', (C.areaM2(r, r.resource) || 0) * rate)
					})
				})
			}
		} catch (e) { console.error('client2 metal processes skipped:', e) }

		/* sheet metal material, by frame */
		try {
			var kgRate = {}, kgPerM2 = {}
			mgmtSheetMetal(data).forEach(function (x) {
				var id = x.name + '|' + x.thickness
				var k = rateKey('Sheetmetal', id)
				kgRate[id] = (k in RATES) ? RATES[k] : x.unitCost
				var sheetM2 = (x.sheetL * x.sheetW) / 1e6
				if (sheetM2 > 0) kgPerM2[id] = x.weight / sheetM2
			})
			collectSheetMetal(data).forEach(function (r) {
				var id = ((r.material && r.material.name) || '') + '|' + r.thickness
				var rate = kgRate[id] || 0, kgm2 = kgPerM2[id] || 0
				if (!(rate > 0) || !(kgm2 > 0)) return
				var m2 = (r.blankMm2 || 0) / 1e6 * (r.quantity || 1)
				bump(r.frame, 'sheet', m2 * kgm2 * rate)
			})
		} catch (e) { console.error('client2 sheet metal skipped:', e) }

		/* weldment material, by frame.
		   The 16 profile stock records all resolve to a frame - 4 per cabinet -
		   so this used to be the whole of the Unassigned line (Rs 3,246).
		   Length is ST_T, not ST_L; see mgmtWeldments for why. */
		try {
			var wpq = projectQuantity(data)
			var wmats = indexBy(data.materials, 'ID')
			var wfac = productFactorByPart(data)
			var wframe = frameNameByPart(data)
			;(data.stocks || []).forEach(function (st) {
				var mv = vars(wmats[st.material] || {})
				if (String(mv.WELDMENT || '').toLowerCase() !== 'true') return
				var lenM = (parseFloat(vars(st).ST_T) || 0) / 1000
				if (!(lenM > 0)) return
				var rate = effWeldRate(st.material, parseFloat(mv.MAT_UCOST) || 0)
				if (!(rate > 0)) return
				bump(wframe[st.part], 'weld', lenM * (wfac[st.part] || 1) * wpq * rate)
			})
		} catch (e) { console.error('client2 weldments skipped:', e) }

		var out = []
		Object.keys(byFrame).forEach(function (k) { if (k) out.push(byFrame[k]) })
		out.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)) })

		/* residual - everything the frames did not account for */
		var attributed = out.reduce(function (a, r) { return a + r.total }, 0)
		var residual = (sectionRaw || 0) - attributed
		if (Math.abs(residual) > 0.005) {
			out.push({ name: 'Unassigned / Project-level', total: residual, unassigned: true })
		}
		return out
	}
	function effWeldRate(materialName, base) {
		var k = rateKey('Weldments', materialName)
		return (k in RATES) ? RATES[k] : base
	}

	/* part id -> owning FRAME name (sub-frames roll up to their parent) */
	function frameNameByPart(data) {
		var asm = indexBy(data.assemblies, 'ID')
		var out = {}
		function walk(id, fn) {
			var A = asm[id]
			if (!A) return
			var c = mgmtProps(A.swcps)
			var f = String(c.Frame || '').toLowerCase() === 'yes' ? (vars(A).NAME || A.name || fn) : fn
			;(A.parts || []).forEach(function (p) { if (!out[p]) out[p] = f })
			;(A.assemblies || []).forEach(function (x) { walk(x, f) })
		}
		;(data.assemblies || []).forEach(function (a) {
			if (String(mgmtProps(a.swcps).Frame || '').toLowerCase() === 'yes') walk(a.ID, vars(a).NAME || a.name || '')
		})
		return out
	}

	/* ==================================================================
	 * WELDMENT BARS  -  how many stock lengths the job consumes
	 * ------------------------------------------------------------------
	 * Tube is bought in fixed lengths (6 m here), so metres of tube is not
	 * a purchasable number. This cuts the required pieces out of bars with
	 * first-fit-decreasing - the standard 1D cutting heuristic, and the one
	 * a saw operator would use by eye - and reports bars, drop and yield.
	 *
	 * Piece length is ST_T, NOT ST_L. On a profile ST_L is the 20 mm
	 * section; see mgmtWeldments for the full explanation.
	 *
	 * TO CHANGE THE PURCHASED LENGTH: CONFIG.weldments.stockLength, or the
	 * box on the page.  kerf is the saw cut lost per piece, trim the
	 * unusable end of each bar.
	 * ================================================================== */
	function weldCfg() {
		var c = (window.SwoodClient && window.SwoodClient.config && window.SwoodClient.config.weldments) || {}
		return {
			stockLength: UI.weld.stockLength > 0 ? UI.weld.stockLength : (parseFloat(c.stockLength) || 6000),
			kerf: UI.weld.kerf >= 0 ? UI.weld.kerf : (parseFloat(c.kerf) || 5),
			density: UI.weld.density > 0 ? UI.weld.density : (parseFloat(c.density) || 7.85),
			trim: parseFloat(c.trim) || 0,
		}
	}

	function weldLockCfg() {
		var c = (window.SwoodClient && window.SwoodClient.config && window.SwoodClient.config.weldments) || {}
		var lock = c.lock || {}
		return {
			defaultLocked: lock.defaultLocked !== false,
			freezeOnLock: lock.freezeOnLock !== false,
		}
	}

	function weldClone(v) {
		return JSON.parse(JSON.stringify(v))
	}

	function weldSnapshot(data) {
		var cfg = weldCfg()
		return {
			cfg: cfg,
			groups: weldNest(collectWeldPieces(data), weldKgPerM(data)),
			issuedAt: new Date().toISOString(),
		}
	}

	function weldEnsureIssued(data) {
		if (!UI.weld.issued) UI.weld.issued = weldSnapshot(data)
		return UI.weld.issued
	}

	/* kg per metre, per material.
	   SOLIDWORKS MASS uses the material density. Where that density is the
	   1000 default the mass is effectively a volume, so divide it out and
	   re-apply a real density. Where MAT_DENSITY is set properly, it is
	   used as-is. MBS_TotalLength is the part's whole tube length in mm. */
	function weldKgPerM(data) {
		var out = {}
		try {
			var cfg = weldCfg()
			var mats = indexBy(data.materials, 'ID')
			var parts = indexBy(data.parts, 'ID')
			;(data.stocks || []).forEach(function (st) {
				var mv = vars(mats[st.material] || {})
				if (String(mv.WELDMENT || '').toLowerCase() !== 'true') return
				if (out[st.material]) return
				var v = vars(st)
				var totalMm = parseFloat(v.MBS_TotalLength) || 0
				var mass = parseFloat(vars(parts[st.part] || {}).MASS) || 0
				if (!(totalMm > 0) || !(mass > 0)) return
				var matDens = parseFloat(mv.MAT_DENSITY) || 0
				/* kg/m as SOLIDWORKS reported it */
				var kgPerM = mass / (totalMm / 1000)
				if (!(matDens > 1000)) kgPerM = kgPerM * cfg.density / 1
				out[st.material] = kgPerM
			})
		} catch (e) { console.error('weldment weight skipped:', e) }
		return out
	}

	/* every profile piece the job needs, already scaled by product x project */
	function collectWeldPieces(data) {
		var out = []
		try {
			var pq = projectQuantity(data)
			var mats = indexBy(data.materials, 'ID')
			var fac = productFactorByPart(data)
			var frame = frameNameByPart(data)
			;(data.stocks || []).forEach(function (st) {
				var mv = vars(mats[st.material] || {})
				if (String(mv.WELDMENT || '').toLowerCase() !== 'true') return
				var v = vars(st)
				var len = parseFloat(v.ST_T) || 0
				if (!(len > 0)) return
				out.push({
					material: st.material,
					description: mv.MAT_DESC || '',
					section: (parseFloat(v.ST_L) || 0) + ' \u00d7 ' + Math.round(parseFloat(v.ST_W) || 0),
					name: v.ST_N || '',
					frame: frame[st.part] || '',
					length: len,
					qty: (fac[st.part] || 1) * pq,
					rate: parseFloat(mv.MAT_UCOST) || 0,
				})
			})
		} catch (e) { console.error('weldment pieces skipped:', e) }
		return out
	}

	/* first-fit decreasing. Returns one entry per material. */
	function weldNest(pieces, kgPerM) {
		var cfg = weldCfg()
		kgPerM = kgPerM || {}
		var usable = cfg.stockLength - cfg.trim
		var byMat = {}
		pieces.forEach(function (p) {
			if (!byMat[p.material]) {
				byMat[p.material] = { material: p.material, description: p.description,
					section: p.section, rate: p.rate, list: [], bars: [], oversize: 0 }
			}
			var g = byMat[p.material]
			for (var i = 0; i < p.qty; i++) g.list.push(p.length)
		})
		var out = []
		Object.keys(byMat).forEach(function (k) {
			var g = byMat[k]
			g.list.sort(function (a, b) { return b - a })          /* decreasing */
			g.list.forEach(function (len) {
				if (len > usable) { g.oversize++; return }           /* will not fit a bar */
				var need = len + cfg.kerf
				var placed = false
				for (var b = 0; b < g.bars.length; b++) {
					if (g.bars[b].free >= need) {
						g.bars[b].free -= need
						g.bars[b].cuts.push(len)
						placed = true
						break
					}
				}
				if (!placed) g.bars.push({ free: usable - need, cuts: [len] })
			})
			var used = g.list.reduce(function (a, v) { return a + v }, 0)
			var bought = g.bars.length * cfg.stockLength
			out.push({
				material: g.material, description: g.description, section: g.section, rate: g.rate,
				kgPerM: kgPerM[g.material] || 0,
				usedKg: (kgPerM[g.material] || 0) * used / 1000,
				boughtKg: (kgPerM[g.material] || 0) * bought / 1000,
				pieces: g.list.length, usedMm: used, bars: g.bars.length,
				boughtMm: bought, dropMm: bought - used,
				yield: bought > 0 ? used / bought * 100 : 0,
				oversize: g.oversize, barList: g.bars,
			})
		})
		return out
	}

	function renderWeldBars(app, data) {
		var lock = weldLockCfg()
		if (UI.weld.locked !== true && UI.weld.locked !== false) UI.weld.locked = lock.defaultLocked
		var locked = UI.weld.locked !== false
		var live = weldSnapshot(data)
		var issued = locked && lock.freezeOnLock ? weldEnsureIssued(data) : (UI.weld.issued || live)
		if (!locked || !lock.freezeOnLock) issued = live
		var cfg = issued.cfg
		var groups = issued.groups

		function chip(label, value) {
			return '<span class="wb-chip"><b>' + esc(label) + '</b>' + esc(value) + '</span>'
		}
		var when = issued.issuedAt ? new Date(issued.issuedAt) : new Date()
		var whenTxt = isNaN(when.getTime()) ? String(issued.issuedAt || '') : when.toLocaleString()
		var job = data.projectName || ''
		var totBars = 0, totUsed = 0, totBought = 0, totKgUsed = 0, totKgBought = 0
		groups.forEach(function (g) {
			totBars += g.bars; totUsed += g.usedMm; totBought += g.boughtMm
			totKgUsed += g.usedKg; totKgBought += g.boughtKg
		})

		var headBlock = '<div class="wb-doc-head">' +
			'<div><div class="wb-doc-kicker">Weldment procurement</div>' +
			'<h1 class="wb-doc-title">Bar Cutting Plan</h1></div>' +
			'<div class="wb-doc-meta">' +
			'<div><span>Project</span><b>' + esc(job) + '</b></div>' +
			'<div><span>Issued</span><b>' + esc(whenTxt) + '</b></div>' +
			'<div><span>Bars</span><b>' + fmt(totBars, 0) + ' \u00d7 ' + fmt(cfg.stockLength / 1000, 2) + ' m</b></div>' +
			'<div><span>Weight</span><b>' + fmt(totKgBought, 1) + ' kg</b></div>' +
			'<div class="wb-stamp ' + (locked ? 'wb-stamp-locked' : 'wb-stamp-open') + '">' +
			(locked ? 'LOCKED' : 'UNLOCKED') + '</div></div></div>'

		var chips = '<div class="wb-chips">' +
			chip('Stock', fmt(cfg.stockLength / 1000, 2) + ' m') +
			chip('Kerf', fmt(cfg.kerf, 1) + ' mm') +
			chip('Density', fmt(cfg.density, 2) + ' g/cm\u00b3') +
			'<button type="button" class="wb-lock-btn"' + (locked ? ' autofocus' : '') + '>' +
			(locked ? 'Open' : 'Lock') + '</button></div>'

		var unlockRow = locked ? '' : (
			'<div class="wb-unlock-row">' +
			'<div class="pr-bar">' +
			'<span class="pr-pl">Stock length</span>' +
			'<input class="pr-rate pr-wl" type="number" step="100" min="100" value="' + cfg.stockLength + '"> mm' +
			'&nbsp;&nbsp;<span class="pr-pl">Kerf</span>' +
			'<input class="pr-rate pr-wk" type="number" step="0.5" min="0" value="' + cfg.kerf + '"> mm' +
			'&nbsp;&nbsp;<span class="pr-pl">Density</span>' +
			'<input class="pr-rate pr-wd" type="number" step="0.05" min="0.5" value="' + cfg.density + '"> g/cm\u00b3' +
			'</div>' +
			'<button type="button" class="wb-renest-btn">Re-nest</button>' +
			'<button type="button" class="wb-issue-btn">Issue &amp; lock</button></div>'
		)

		if (!groups.length) {
			app.innerHTML = '<div class="wb-doc">' + headBlock + chips + unlockRow +
				'<div class="pr-empty"><b>No weldment stock in this project.</b></div></div>'
			bindWeldBars(app, data)
			return
		}

		function stat(label, value, sub) {
			return '<div class="wb-stat"><span>' + label + '</span><b>' + value + '</b>' +
				(sub ? '<i>' + sub + '</i>' : '') + '</div>'
		}
		var cards = '<div class="wb-stats">' +
			stat('Bars required', fmt(totBars, 0), fmt(cfg.stockLength / 1000, 2) + ' m each') +
			stat('Procurement weight', fmt(totKgBought, 1) + ' kg', 'what you order') +
			stat('Weight in parts', fmt(totKgUsed, 1) + ' kg', '') +
			stat('Length used', fmt(totUsed / 1000, 2) + ' m', 'of ' + fmt(totBought / 1000, 2) + ' m bought') +
			stat('Drop', fmt((totBought - totUsed) / 1000, 2) + ' m', fmt(totKgBought - totKgUsed, 1) + ' kg') +
			stat('Yield', fmt(totBought ? totUsed / totBought * 100 : 0, 1) + '%', '') +
			'</div>'
		var head = ['Material', 'Section', 'Pieces', 'Length Used', 'Bars @ ' + fmt(cfg.stockLength / 1000, 2) + ' m',
			'kg / m', 'Weight', 'Drop', 'Yield', 'Rate / kg', 'Cost']
		var rowCosts = []
		var body = groups.map(function (g, i) {
			var k = rateKey('WeldBars', g.material)
			var perKg = (k in RATES) ? RATES[k] : 0
			var cost = g.boughtKg * perKg
			rowCosts.push(cost)
			var rateHtml = locked
				? '<span class="wb-rate-locked">' + money(perKg) + '<span class="pr-ru"> /kg</span></span>'
				: rateCell('WeldBars', g.material, perKg, 'kg')
			var cells = [
				esc(g.material), esc(g.section), fmt(g.pieces, 0),
				fmt(g.usedMm / 1000, 2) + ' m', fmt(g.bars, 0),
				g.kgPerM > 0 ? fmt(g.kgPerM, 3) : '\u2014',
				g.boughtKg > 0 ? fmt(g.boughtKg, 1) + ' kg' : '\u2014',
				fmt(g.dropMm / 1000, 2) + ' m',
				fmt(g.yield, 1) + '%',
				rateHtml,
				money(cost),
			]
			return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
				return '<td class="' + (ci >= 2 ? 'pr-num' : '') + '">' + c + '</td>'
			}).join('') + '</tr>'
		}).join('')
		var sum = rowCosts.reduce(function (a, c) { return a + c }, 0)
		var foot = '<tr class="pr-tot">' + head.map(function (_, ci) {
			return '<td class="' + (ci >= 2 ? 'pr-num' : '') + '">' + (ci === head.length - 1 ? money(sum) : '') + '</td>'
		}).join('') + '</tr>'
		var tb = tableTitleBar('Bar Requirement', groups.length + ' material' + (groups.length === 1 ? '' : 's') +
			(locked ? ' \u00b7 issued' : ' \u00b7 live'))
		var table = '<div class="pr-tbl-shell">' + tb.html +
			'<table class="pr-tbl"><thead><tr>' +
			head.map(function (h, ci) { return '<th class="' + (ci >= 2 ? 'pr-num' : '') + '">' + esc(h) + '</th>' }).join('') +
			'</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>'

		var warn = groups.filter(function (g) { return g.oversize > 0 })
		var warnHtml = warn.length ? '<div class="pr-card"><b>' +
			warn.reduce(function (a, g) { return a + g.oversize }, 0) +
			' piece(s) are longer than one bar and were left out.</b> Raise the stock length.</div>' : ''

		app.innerHTML = '<div class="wb-doc">' + headBlock + chips + unlockRow +
			cards + warnHtml + table + weldBarSheets(groups, cfg) + '</div>'
		bindWeldBars(app, data)
		if (!locked) bindExports(app)
		makeSortable(app)
	}

	/* Nesting sheet, drawn the same way as the wood / sheet metal patterns:
	   one card per bar, pieces to scale, drop shaded at the end. */
	/* Nesting sheet, drawn like the wood / sheet metal cutting patterns:
	   every bar to the same scale, pieces labelled, drop hatched at the end,
	   with a millimetre rule underneath so lengths can be read off. */
	function weldBarSheets(groups, cfg) {
		var W = 1000, H = 34
		var ticks = 6
		return groups.map(function (g) {
			var rule = ''
			for (var t = 0; t <= ticks; t++) {
				var rx = t / ticks * W
				rule += '<line class="wb-tick" x1="' + fmt(rx, 1) + '" y1="0" x2="' + fmt(rx, 1) + '" y2="5"/>' +
					'<text class="wb-tlbl" x="' + fmt(Math.min(Math.max(rx, 12), W - 12), 1) +
					'" y="14" text-anchor="middle">' + fmt(t / ticks * cfg.stockLength, 0) + '</text>'
			}

			var cards = g.barList.map(function (b, i) {
				var x = 0
				var cuts = b.cuts.slice().sort(function (p, q) { return q - p })
				var segs = cuts.map(function (len) {
					var w = len / cfg.stockLength * W
					var r = '<g><rect class="wb-piece" x="' + fmt(x, 2) + '" y="0" width="' +
						fmt(Math.max(w - 1, 1), 2) + '" height="' + H + '"/>' +
						(w > 34 ? '<text class="wb-lbl" x="' + fmt(x + w / 2, 2) + '" y="' + (H / 2 + 4) +
						'" text-anchor="middle">' + fmt(len, 0) + '</text>' : '') + '</g>'
					x += w
					return r
				}).join('')
				var dropW = Math.max(W - x, 0)
				var drop = dropW > 0.5 ? '<rect class="wb-drop" x="' + fmt(x, 2) + '" y="0" width="' +
					fmt(dropW, 2) + '" height="' + H + '"/>' +
					(dropW > 40 ? '<text class="wb-lbl wb-droplbl" x="' + fmt(x + dropW / 2, 2) + '" y="' + (H / 2 + 4) +
					'" text-anchor="middle">' + fmt(b.free, 0) + '</text>' : '') : ''
				var pct = (cfg.stockLength - b.free) / cfg.stockLength * 100
				var cutLine = cuts.map(function (len) { return fmt(len, 0) }).join(' + ')
				if (b.free > 0.5) cutLine += '  \u00b7  drop ' + fmt(b.free, 0)
				return '<div class="wb-row">' +
					'<div class="wb-no">Bar ' + (i + 1) + '</div>' +
					'<svg class="wb-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
					'<rect class="wb-bar" x="0" y="0" width="' + W + '" height="' + H + '"/>' +
					segs + drop + '</svg>' +
					'<div class="wb-meta">' + cuts.length + ' pcs<i>' + fmt(pct, 0) + '% used</i></div>' +
					'</div>' +
					'<div class="wb-cuts">' + esc(cutLine) + '</div>'
			}).join('')

			var ruler = '<div class="wb-row wb-rulerow"><div class="wb-no"></div>' +
				'<svg class="wb-ruler" viewBox="0 0 ' + W + ' 18" preserveAspectRatio="none">' + rule + '</svg>' +
				'<div class="wb-meta"></div></div>'

			var t2 = tableTitleBar('Nesting sheet \u2013 ' + g.material + ' @ ' + fmt(cfg.stockLength / 1000, 2) + ' m',
				g.bars + ' bar' + (g.bars === 1 ? '' : 's') + ' \u00b7 ' + fmt(g.yield, 1) + '% yield')
			return '<div class="pr-tbl-shell">' + t2.html +
				'<div class="wb-wrap">' + cards + ruler + '</div></div>'
		}).join('')
	}
	function bindWeldBars(app, data) {
		var lockBtn = app.querySelector('.wb-lock-btn')
		if (lockBtn) {
			lockBtn.addEventListener('click', function () {
				if (UI.weld.locked !== false) {
					UI.weld.locked = false
				} else {
					UI.weld.issued = weldClone(weldSnapshot(data))
					UI.weld.locked = true
				}
				renderWeldBars(app, data)
			})
			if (UI.weld.locked !== false) {
				try { lockBtn.focus() } catch (e) {}
			}
		}
		var issue = app.querySelector('.wb-issue-btn')
		if (issue) issue.addEventListener('click', function () {
			UI.weld.issued = weldClone(weldSnapshot(data))
			UI.weld.locked = true
			renderWeldBars(app, data)
		})
		var renest = app.querySelector('.wb-renest-btn')
		if (renest) renest.addEventListener('click', function () {
			UI.weld.issued = weldClone(weldSnapshot(data))
			renderWeldBars(app, data)
		})
		var l = app.querySelector('.pr-wl')
		if (l) l.addEventListener('change', function () {
			UI.weld.stockLength = parseFloat(l.value) || 0; renderWeldBars(app, data)
		})
		var dd = app.querySelector('.pr-wd')
		if (dd) dd.addEventListener('change', function () {
			UI.weld.density = parseFloat(dd.value) || 0; renderWeldBars(app, data)
		})
		var k = app.querySelector('.pr-wk')
		if (k) k.addEventListener('change', function () {
			UI.weld.kerf = parseFloat(k.value); renderWeldBars(app, data)
		})
	}

	function renderClient2Summary(app, data, built, m, fc) {
		var f = costFactor(), disc = discountPct()
		SUM_ACC = []
		var sectionRaw = mgmtSections(data, m).reduce(function (a, x) { return a + x.sum }, 0)
		var rows = client2Rows(data, built, m, sectionRaw)
		var qtyOf = frameQuantities(data)

		var afterFactor = 0
		var body = rows.map(function (r, i) {
			var line = r.total * f
			afterFactor += line
			var q = r.unassigned ? 0 : (qtyOf[r.name] || 0)
			return '<tr' + (r.unassigned ? ' class="pr-q-unassigned"' : '') + '>' +
				'<td class="pr-q-sr">' + (i + 1) + '</td>' +
				'<td>' + esc(r.name) + '</td>' +
				'<td class="pr-num">' + (q ? fmt(q, 0) : '') + '</td>' +
				'<td class="pr-num">' + (q ? money(line / q) : '') + '</td>' +
				'<td class="pr-num">' + money(line) + '</td></tr>'
		}).join('')

		var discAmt = afterFactor * disc / 100
		var net = afterFactor - discAmt

		app.innerHTML =
			summaryModeBar(fc) +
			'<div class="pr-quote">' +
			quoteHeader(data, 'Quotation \u2013 Frame-wise') +
			quoteControls(f, disc) +
			'<table class="pr-qtbl"><thead><tr>' +
			'<th class="pr-q-sr">#</th><th>Frame</th>' +
			'<th class="pr-num">Qty</th><th class="pr-num">Rate</th><th class="pr-num">Amount</th>' +
			'</tr></thead><tbody>' + body + '</tbody></table>' +
			quoteTotals(afterFactor, disc, discAmt, net) +
			'<div class="pr-quote-note">Frame prices are built from the cutting data \u2013 board area, ' +
			'edging, machining, finishing, hardware and sheet metal. Sub-frames are included in their parent frame. ' +
			'Taxes extra as applicable.</div>' +
			'</div>'

		bindQuoteControls(app, data)
		bindSummaryBar(app, renderSummary, data)
		bindExports(app)
	}

	/* frame name -> quantity (project x product), for the Qty / Rate columns */
	function frameQuantities(data) {
		var out = {}
		try {
			var pq = projectQuantity(data)
			;(data.assemblies || []).forEach(function (a) {
				var c = mgmtProps(a.swcps)
				if (String(c.Frame || '').toLowerCase() !== 'yes') return
				var nm = vars(a).NAME || a.name || ''
				if (!nm) return
				out[nm] = (parseFloat(c['Product Quantity']) || 1) * pq
			})
		} catch (e) {}
		return out
	}
	function renderMgmtSummary(app, data, built, m, fc) {
		SUM_ACC = []
		var tables = mgmtSections(data, m).map(function (x) { return x.html }).join('')
		var raw = SUM_ACC.reduce(function (a, v) { return a + v }, 0)
		var totalLine = '<div class="pr-card pr-total"><b>Total Cost:</b> ' + money(raw) +
			' &nbsp;|&nbsp; <b>With factor ' + fmt(costFactor(), 2) + ':</b> ' + money(raw * costFactor()) + '</div>'

		app.innerHTML =
			'<h1 class="MuiTypography-root MuiTypography-h1">Summary</h1>' +
			summaryModeBar(fc) +
			totalLine +
			costFactorCard(raw) +
			factoryWasteCard(fc) +
			tables +
			totalLine

		var cfIn = app.querySelector('.pr-cf')
		if (cfIn) {
			cfIn.addEventListener('change', function () {
				UI.summary.costFactor = parseFloat(cfIn.value)
				renderSummary(app, data)
			})
		}
		bindSummaryBar(app, renderSummary, data)
		bindExports(app)
		makeSortable(app)
	}
	function renderSummary(app, data) {
		var built = buildPatterns(data);
		var m = summaryModel(data, built.patterns);
		var fc = computeFrameCosts(data, built.patterns, m);

		if (UI.summary.mode === 'mgmt') { renderMgmtSummary(app, data, built, m, fc); return }
		if (UI.summary.mode === 'client1') { renderClient1Summary(app, data, built, m, fc); return }
		if (UI.summary.mode === 'client2') { renderClient2Summary(app, data, built, m, fc); return }

		if (UI.summary.mode === 'client') {
			if (UI.summary.view === 'framewise' && fc.frames.length) renderClientFramewise(app, data, fc);
			else renderClientComplete(app, data, fc);
			return;
		}

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

	/* ==================================================================
	 * SHEET METAL
	 * ------------------------------------------------------------------
	 * Rows are built from the SM_* cut-list variables in Report.cfg, with
	 * the part's own custom properties as a second source. Any one of the
	 * sheet-metal-only properties identifies a part as sheet metal.
	 *
	 * TO ADD A COLUMN: add a line to SHEETMETAL_COLUMNS below.
	 * ================================================================ */
	function smKey(k) { return String(k).toLowerCase().replace(/[\s\-_]/g, ''); }

	function smProps(obj) {
		var out = {};
		((obj && obj.swcps) || []).forEach(function (c) { out[smKey(c.name)] = c.value; });
		return out;
	}

	/* first of several spellings that has a real value */
	function smPick(props, vars, names, alias) {
		for (var i = 0; i < names.length; i++) {
			var k = smKey(names[i]);
			var val = props[k];
			if (val !== undefined && val !== null && String(val).trim() !== '' &&
				!/not specified/i.test(String(val))) return val;
		}
		if (alias && vars && vars[alias] !== undefined && vars[alias] !== '') return vars[alias];
		return null;
	}

	/* numeric pick: only a real value above zero counts */
	function smNum(props, vars, names, alias) {
		var n = parseFloat(smPick(props, vars, names, alias));
		return n > 0 ? n : 0;
	}

	/* A weldment cut list also gets the SM_* variables, because Report.cfg
	   emits them for every cut-list body - <SWCLP.Sheet Metal Thickness>
	   simply resolves to "0" there. So presence of the variable proves
	   nothing; only a value ABOVE ZERO does.
	   A sheet metal body must have a thickness and a blank area. */
	function isSheetMetal(props, vars) {
		var thk = smNum(props, vars, ['Sheet Metal Thickness'], 'SM_Thickness');
		var blank = smNum(props, vars, ['Bounding Box Area-Blank'], 'SM_BlankArea');
		var bbox = smNum(props, vars, ['Bounding Box Area'], 'SM_BBoxArea');
		if (thk > 0 && (blank > 0 || bbox > 0)) return true;

		/* a gauge is sheet-metal-only, and is text rather than a number */
		var g = smPick(props, vars, ['Sheet Metal Gauge'], 'SM_Gauge');
		if (g !== null && !/^(0|none)?$/i.test(String(g).trim())) return true;

		/* explicit flag, if the template sets one */
		var flag = smPick(props, vars, ['SheetMetal', 'Sheet Metal', 'IsSheetMetal'], 'SM_IsSheetMetal');
		if (flag !== null && /^(yes|true|1)$/i.test(String(flag).trim())) return true;

		return false;
	}

	/* live nesting settings - the Layout toolbar writes here */
	function smCfg() {
		var c = (window.SwoodClient.config && window.SwoodClient.config.sheetMetal) || {};
		var st = UI.smNest || (UI.smNest = {
			sheetIndex: c.sheetIndex === undefined ? 0 : c.sheetIndex,
			trim: c.trim === undefined ? 10 : c.trim,
			kerf: c.kerf === undefined ? 5 : c.kerf,
			perRow: c.perRow || 2,
		});
		st.sheets = c.sheets || [{ label: '2500 x 1250 mm', L: 2500, W: 1250 }];
		return st;
	}

	/* Grid nest: rows and columns in one orientation, the better of the two.
	   Not a true-shape solver - it will not interlock L-shapes - so on
	   irregular blanks it under-reports. On rectangles a grid IS optimal.
	   Treat the sheet count as a floor, never a ceiling. */
	function smGrid(sheetL, sheetW, L, W, trim, kerf) {
		var usableL = sheetL - 2 * trim;
		var usableW = sheetW - 2 * trim;
		function grid(l, w) {
			if (!(l > 0) || !(w > 0)) return { n: 0, cols: 0, rows: 0 };
			var cols = Math.floor((usableL + kerf) / (l + kerf));
			var rows = Math.floor((usableW + kerf) / (w + kerf));
			if (cols < 1 || rows < 1) return { n: 0, cols: 0, rows: 0 };
			return { n: cols * rows, cols: cols, rows: rows };
		}
		var a = grid(L, W), b = grid(W, L);
		if (b.n > a.n) return { n: b.n, cols: b.cols, rows: b.rows, L: W, W: L, orientation: 'rotated 90\u00b0' };
		return { n: a.n, cols: a.cols, rows: a.rows, L: L, W: W, orientation: 'as drawn' };
	}

	/* picks the sheet, honouring Auto */
	function smNest(L, W) {
		var st = smCfg();
		var list = st.sheets;
		var pick = null;
		function tryOne(sh) {
			var g = smGrid(sh.L, sh.W, L, W, st.trim, st.kerf);
			if (!g.n) return;
			var used = (g.n * L * W) / (sh.L * sh.W);
			if (!pick || used > pick.used) {
				pick = { sheet: sh, used: used, g: g };
			}
		}
		if (st.sheetIndex >= 0 && list[st.sheetIndex]) tryOne(list[st.sheetIndex]);
		else list.forEach(tryOne);
		if (!pick) return { n: 0, orientation: '', sheet: list[0], cols: 0, rows: 0, used: 0 };
		return {
			n: pick.g.n, cols: pick.g.cols, rows: pick.g.rows,
			blankL: pick.g.L, blankW: pick.g.W,
			orientation: pick.g.orientation, sheet: pick.sheet, used: pick.used,
		};
	}

	/* 'Length' / 'X' / '0' -> 'length',  'Width' / 'Y' / '90' -> 'width',
	   anything else (including blank) -> 'any' */
	function smGrainNorm(raw) {
		var c = (window.SwoodClient.config && window.SwoodClient.config.sheetMetal) || {};
		var v = String(raw === null || raw === undefined ? '' : raw).trim().toLowerCase();
		if (!v) v = String(c.grainDefault || 'any').toLowerCase();
		if (/^(length|l|x|0|0deg|horizontal|along length|with grain)$/.test(v)) return 'length';
		if (/^(width|w|y|90|90deg|vertical|across|cross grain)$/.test(v)) return 'width';
		return 'any';
	}

	/* rotations a blank is allowed, given its grain */
	function smGrainRotations(grain, all) {
		var c = (window.SwoodClient.config && window.SwoodClient.config.sheetMetal) || {};
		if (c.grainEnabled === false || grain === 'any') return all;
		var map = c.grainRotations || {};
		var list = map[grain];
		if (!list || !list.length) return all;
		/* never widen what nestRotations allows */
		var out = list.filter(function (d) { return all.indexOf(d) >= 0; });
		return out.length ? out : list;
	}

	function smGrainLabel(grain) {
		if (grain === 'length') return 'grain \u2194 sheet length';
		if (grain === 'width') return 'grain \u2195 sheet width';
		return '';
	}

	/* ==================================================================
	 * TRUE-SHAPE NESTER
	 * ------------------------------------------------------------------
	 * The old smNest/smGrid pair answered a different question: "how many
	 * copies of THIS ONE part fit on a sheet in a grid". With one of each
	 * part that is always 1 per sheet, which is why a job of 12 different
	 * blanks came out as 12 sheets at 93% waste.
	 *
	 * This nests properly: every blank of the same material and thickness
	 * competes for the same sheets.
	 *
	 * Method - bottom-left-fill over a column profile ("skyline"):
	 *   1. blanks sorted big first
	 *   2. each outline sampled into columns nestResolution mm wide,
	 *      recording the lowest and highest point of the shape in each
	 *      column, per rotation
	 *   3. the sheet keeps a skyline of used height per column; a blank
	 *      drops to the lowest y where its bottom profile clears the
	 *      skyline, so parts settle into each other's concave edges
	 *   4. candidate x positions are the skyline steps only, not every
	 *      column - same answer, a fraction of the work
	 *   5. a blank that fits nowhere on the open sheets starts a new one
	 *
	 * Each column is treated as a solid vertical span, which over-states
	 * concave shapes. That is the safe direction - blanks can never
	 * overlap - but it will not thread a small part through the middle of
	 * a C-shape or drop one inside another's cut-out. A no-fit-polygon
	 * solver with a genetic search (SVGnest, Deepnest) does that and gets
	 * a few points more utilisation for a lot more runtime; this is the
	 * bottom-left family that CypCut and friends use for their fast pass.
	 * ================================================================ */

	function smRingBounds(ring) {
		var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (var i = 0; i < ring.length; i++) {
			var p = ring[i];
			if (p[0] < minX) minX = p[0];
			if (p[0] > maxX) maxX = p[0];
			if (p[1] < minY) minY = p[1];
			if (p[1] > maxY) maxY = p[1];
		}
		return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
	}

	function smRotRing(ring, deg) {
		if (!deg) return ring;
		var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
		return ring.map(function (p) {
			return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
		});
	}

	function smShiftRing(ring, dx, dy) {
		return ring.map(function (p) { return [p[0] + dx, p[1] + dy]; });
	}

	function smRingArea(ring) {
		var a = 0;
		for (var i = 0; i < ring.length; i++) {
			var p = ring[i], q = ring[(i + 1) % ring.length];
			a += p[0] * q[1] - q[0] * p[1];
		}
		return Math.abs(a) / 2;
	}

	/* y-span of a polygon on the vertical line x = X, or null if missed */
	function smSpanAt(ring, X) {
		var lo = Infinity, hi = -Infinity, n = ring.length;
		for (var i = 0; i < n; i++) {
			var a = ring[i], b = ring[(i + 1) % n];
			var x1 = a[0], y1 = a[1], x2 = b[0], y2 = b[1];
			if (x1 === x2) {
				if (Math.abs(x1 - X) < 1e-9) {
					if (Math.min(y1, y2) < lo) lo = Math.min(y1, y2);
					if (Math.max(y1, y2) > hi) hi = Math.max(y1, y2);
				}
				continue;
			}
			if ((X < x1 && X < x2) || (X > x1 && X > x2)) continue;
			var y = y1 + ((X - x1) / (x2 - x1)) * (y2 - y1);
			if (y < lo) lo = y;
			if (y > hi) hi = y;
		}
		return lo === Infinity ? null : [lo, hi];
	}

	/* column profile of one rotation of one blank, grown by the cut gap */
	function smProfile(outer, deg, res, gap) {
		var ring = smRotRing(outer, deg);
		var b = smRingBounds(ring);
		ring = smShiftRing(ring, -b.minX, -b.minY);
		var w = b.maxX - b.minX, h = b.maxY - b.minY;
		var nc = Math.max(1, Math.ceil(w / res));
		var bottom = new Float64Array(nc), top = new Float64Array(nc);

		for (var i = 0; i < nc; i++) {
			var x0 = i * res, x1 = Math.min((i + 1) * res, w);
			var lo = Infinity, hi = -Infinity;
			var xs = [x0 + 1e-6, (x0 + x1) / 2, x1 - 1e-6];
			for (var k = 0; k < 3; k++) {
				var X = xs[k];
				if (X < 1e-6) X = 1e-6;
				if (X > w - 1e-6) X = w - 1e-6;
				var sp = smSpanAt(ring, X);
				if (!sp) continue;
				if (sp[0] < lo) lo = sp[0];
				if (sp[1] > hi) hi = sp[1];
			}
			if (lo === Infinity) { lo = 0; hi = h; }   /* strip missed: be safe */
			bottom[i] = lo; top[i] = hi;
		}

		/* dilate sideways by g columns and outwards in y by gap - a cheap
		   stand-in for offsetting the polygon itself by half the kerf */
		var g = Math.max(0, Math.round(gap / res));
		var nc2 = nc + 2 * g;
		var B = new Float64Array(nc2), T = new Float64Array(nc2);
		for (var j = 0; j < nc2; j++) {
			var lo2 = Infinity, hi2 = -Infinity;
			for (var m = j - 2 * g; m <= j; m++) {
				if (m < 0 || m >= nc) continue;
				if (bottom[m] < lo2) lo2 = bottom[m];
				if (top[m] > hi2) hi2 = top[m];
			}
			if (lo2 === Infinity) { B[j] = Infinity; T[j] = -Infinity; }
			else { B[j] = lo2 - gap; T[j] = hi2 + gap; }
		}
		return {
			deg: deg, w: w, h: h, cols: nc2, bottom: B, top: T,
			offX: -g * res, spanW: w + 2 * gap, spanH: h + 2 * gap,
		};
	}

	/* Nest one material/thickness group onto sheets.
	   items: [{ row, outer, area, hMax }]  ->  [{ placed: [...] }]      */
	function smNestGroup(items, sheet, opt) {
		var res = opt.res, trim = opt.trim, gap = opt.kerf / 2;
		var usableL = sheet.L - 2 * trim, usableW = sheet.W - 2 * trim;
		var cols = Math.max(1, Math.floor(usableL / res));
		var lookback = opt.lookback || 4;

		items.forEach(function (it) {
			if (it.profiles) return;
			/* a blank on brushed stock only gets the rotations its grain
			   allows - see smGrainRotations */
			it.profiles = (it.rotations || opt.rotations).map(function (d) {
				return smProfile(it.outer, d, res, gap);
			}).filter(function (p) {
				return p.spanW <= usableL && p.spanH <= usableW;
			});
		});

		items = items.slice().sort(function (a, b) {
			return (b.area - a.area) || (b.hMax - a.hMax);
		});

		var sheets = [];
		function newSheet() {
			var s = { sky: new Float64Array(cols), placed: [], steps: [0] };
			sheets.push(s);
			return s;
		}

		function candidates(sh, pcols) {
			var lim = cols - pcols;
			if (lim < 0) return [];
			var out = [], seen = {}, list = sh.steps;
			for (var i = 0; i < list.length; i++) {
				var c = list[i];
				if (c < 0) c = 0;
				if (c > lim) c = lim;
				if (!seen[c]) { seen[c] = 1; out.push(c); }
				var c2 = list[i] - pcols;      /* right-aligned to that step */
				if (c2 >= 0 && c2 <= lim && !seen[c2]) { seen[c2] = 1; out.push(c2); }
			}
			return out;
		}

		function tryPlace(sh, it) {
			var best = null;
			for (var pi = 0; pi < it.profiles.length; pi++) {
				var pr = it.profiles[pi];
				var cs = candidates(sh, pr.cols);
				for (var ci = 0; ci < cs.length; ci++) {
					var c = cs[ci], y = 0;
					for (var i = 0; i < pr.cols; i++) {
						if (pr.bottom[i] === Infinity) continue;
						var need = sh.sky[c + i] - pr.bottom[i];
						if (need > y) { y = need; if (y + pr.h > usableW) break; }
					}
					if (y + pr.h > usableW) continue;
					if (!best || y < best.y - 1e-9 ||
						(Math.abs(y - best.y) < 1e-9 && c < best.c)) {
						best = { y: y, c: c, pr: pr };
						if (y === 0 && c === 0) break;
					}
				}
				if (best && best.y === 0 && best.c === 0) break;
			}
			if (!best) return false;

			for (var i2 = 0; i2 < best.pr.cols; i2++) {
				if (best.pr.top[i2] === -Infinity) continue;
				var t = best.y + best.pr.top[i2];
				if (t > sh.sky[best.c + i2]) sh.sky[best.c + i2] = t;
			}
			sh.steps.push(best.c);
			sh.steps.push(Math.min(cols - 1, best.c + best.pr.cols));
			sh.placed.push({
				row: it.row, deg: best.pr.deg,
				x: trim + best.c * res - best.pr.offX,
				y: trim + best.y,
				w: best.pr.w, h: best.pr.h, area: it.area,
			});
			return true;
		}

		var unfit = [];
		items.forEach(function (it) {
			if (!it.profiles.length) { unfit.push(it.row.name); return; }
			var from = Math.max(0, sheets.length - lookback);
			for (var si = from; si < sheets.length; si++) {
				if (tryPlace(sheets[si], it)) return;
			}
			if (!tryPlace(newSheet(), it)) unfit.push(it.row.name);
		});
		sheets.unfit = unfit;
		return sheets;
	}

	/* Build the whole nest for the rows on screen: group by material and
	   thickness, expand quantities, hand each group to smNestGroup.     */
	function smBuildNest(rows) {
		var st = smCfg();
		var c = (window.SwoodClient.config && window.SwoodClient.config.sheetMetal) || {};
		var sheet = st.sheets[st.sheetIndex >= 0 ? st.sheetIndex : 0] || st.sheets[0];

		var total = 0;
		rows.forEach(function (r) { total += Math.max(1, r.quantity || 1); });
		var res = c.nestResolution || 3;
		var cap = c.nestMaxBlanks || 400;
		if (total > cap) res = res * Math.min(4, Math.ceil(total / cap));

		var opt = {
			res: res, trim: st.trim, kerf: st.kerf,
			rotations: c.nestRotations || [0, 90, 180, 270],
			lookback: c.nestLookback || 4,
		};

		var groups = {}, order = [];
		rows.forEach(function (r) {
			var op = smOutlinePoints(r.geom);
			if (!op || !(op.w > 0)) return;
			var b = smRingBounds(r.geom.outer);
			var outer = smShiftRing(r.geom.outer, -b.minX, -b.minY);
			var area = smRingArea(outer);
			(r.geom.inner || []).forEach(function (h) {
				if (h && h.length > 2) area -= smRingArea(h);
			});
			if (!(area > 0)) area = op.w * op.h;

			var key = (r.material.name || '?') + ' \u00b7 ' + fmt(r.thickness, 2) + ' mm';
			if (!groups[key]) { groups[key] = []; order.push(key); }
			var n = Math.max(1, Math.round(r.quantity || 1));
			var rots = smGrainRotations(r.grain, opt.rotations);
			for (var i = 0; i < n; i++) {
				groups[key].push({
					row: r, outer: outer, area: area,
					hMax: Math.max(op.w, op.h),
					rotations: rots,
				});
			}
		});

		var out = [];
		order.forEach(function (key) {
			var sheets = smNestGroup(groups[key], sheet, opt);
			sheets.forEach(function (sh) {
				out.push({ key: key, sheet: sheet, placed: sh.placed });
			});
			if (sheets.unfit && sheets.unfit.length) {
				out.unfit = (out.unfit || []).concat(sheets.unfit);
			}
		});
		out.resolution = res;
		return out;
	}

	/* one nested sheet drawn to scale, every blank on its true outline */
	function smNestSvg(nest) {
		var st = smCfg();
		var SL = nest.sheet.L, SW = nest.sheet.W, t = st.trim;
		var svg = '<svg viewBox="0 0 ' + SL + ' ' + SW +
			'" preserveAspectRatio="xMidYMid meet" class="sm-sheet">';
		svg += '<rect x="0" y="0" width="' + SL + '" height="' + SW +
			'" fill="#fbe9e9" stroke="#b8b8b8" stroke-width="4"/>';
		svg += '<rect x="' + t + '" y="' + t + '" width="' + (SL - 2 * t) +
			'" height="' + (SW - 2 * t) + '" fill="none" stroke="#d9a3a3" ' +
			'stroke-dasharray="18 12" stroke-width="3"/>';

		/* grain arrow, drawn once per sheet, only when something on it is
		   directional. The sheet's grain runs along its length. */
		var directional = nest.placed.some(function (p) {
			return p.row.grain && p.row.grain !== 'any';
		});
		if (directional) {
			var ay = SW - t / 2, ax0 = t, ax1 = t + Math.min(320, SL / 6);
			svg += '<g stroke="#8a6d3b" stroke-width="3" fill="#8a6d3b">' +
				'<line x1="' + ax0 + '" y1="' + ay + '" x2="' + ax1 + '" y2="' + ay + '"/>' +
				'<polygon points="' + ax1 + ',' + (ay - 8) + ' ' + (ax1 + 18) + ',' + ay +
				' ' + ax1 + ',' + (ay + 8) + '" stroke="none"/>' +
				'<text x="' + (ax1 + 28) + '" y="' + (ay + 7) +
				'" font-size="22" font-family="Arial" stroke="none">grain</text></g>';
		}

		nest.placed.forEach(function (p) {
			var r = p.row;
			var ring = smRotRing(r.geom.outer, p.deg);
			var b = smRingBounds(ring);
			var dx = p.x - b.minX, dy = p.y - b.minY;
			function path(ringIn) {
				var rr = smShiftRing(smRotRing(ringIn, p.deg), dx, dy);
				return 'M' + rr.map(function (q) {
					return fmt(q[0], 2) + ',' + fmt(q[1], 2);
				}).join('L') + 'Z';
			}
			var d = path(r.geom.outer);
			(r.geom.inner || []).forEach(function (h) {
				if (h && h.length > 2) d += path(h);
			});

			var href = r.partGuid ? '#/sheetmetal-parts/' + esc(r.partGuid) + '-0' : '';
			if (href) svg += '<a class="pr-piece" href="' + href + '">';
			svg += '<path d="' + d + '" fill-rule="evenodd" fill="#a8b8e8" ' +
				'stroke="#4a5a9a" stroke-width="4"/>';

			var fs = Math.max(14, Math.min(p.w, p.h) * 0.13);
			var maxChars = Math.floor((p.w * 0.86) / (fs * 0.55));
			var label = String(r.name);
			if (maxChars < 4) label = '';
			else if (label.length > maxChars) label = label.slice(0, maxChars - 1) + '\u2026';
			if (label) {
				svg += '<text x="' + fmt(p.x + p.w / 2, 1) + '" y="' +
					fmt(p.y + p.h / 2 + fs * 0.35, 1) + '" font-size="' + fmt(fs, 0) +
					'" text-anchor="middle" fill="#16202b" font-family="Arial">' +
					esc(label) + '</text>';
			}
			if (href) svg += '</a>';
		});
		return svg + '</svg>';
	}

	/* outline for a part, from sheetmetal-geometry.js, matched loosely on name */
	function smGeometry(name) {
		var all = window.sheetMetalGeometry;
		if (!all || !name) return null;
		if (all[name] && all[name].outer && all[name].outer.length) return all[name];
		var want = String(name).toLowerCase();
		for (var k in all) {
			if (!Object.prototype.hasOwnProperty.call(all, k)) continue;
			var kk = String(k).toLowerCase();
			if (kk === want || want.indexOf(kk) === 0 || kk.indexOf(want) === 0) {
				if (all[k].outer && all[k].outer.length) return all[k];
			}
		}
		return null;
	}

	/* outline normalised to 0,0 and returned as an SVG points list */
	function smOutlinePoints(geom) {
		if (!geom || !geom.outer || !geom.outer.length) return null;
		var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		geom.outer.forEach(function (pt) {
			if (pt[0] < minX) minX = pt[0];
			if (pt[0] > maxX) maxX = pt[0];
			if (pt[1] < minY) minY = pt[1];
			if (pt[1] > maxY) maxY = pt[1];
		});
		function toPts(ring) {
			return ring.map(function (pt) {
				return fmt(pt[0] - minX, 3) + ',' + fmt(pt[1] - minY, 3);
			}).join(' ');
		}
		return {
			w: maxX - minX, h: maxY - minY,
			pts: toPts(geom.outer),
			holes: (geom.inner || []).filter(function (r) { return r && r.length > 2; }).map(toPts),
		};
	}

	function collectSheetMetal(data) {
		var SC = window.SwoodClient;
		var CFGS = (SC.config && SC.config.sheetMetal) || {};
		var pq = SC.projectQty ? (SC.projectQty(data.swcps) || 1) : 1;
		var parts = indexBy(data.parts || [], 'ID');
		var frameOf = frameNameByPanel(data);
		var subOf = subFrameNameByPart(data);
		var out = [];
		var seen = {};

		function add(id, name, props, v, part) {
			if (seen[id]) return;
			/* a body that carries weldment cut-list data is a weldment */
			if (v && (v.MBS_Length || v.MBS_Cutlist) && !(parseFloat(v.SM_Thickness) > 0)) return;
			if (!isSheetMetal(props, v)) return;
			seen[id] = true;

			var pv = part ? vars(part) : {};
			var qty = (parseFloat(pv.NB) || parseFloat(smPick(props, v, ['QUANTITY'], 'SM_Quantity')) || 1) * pq;

			var L = parseFloat(smPick(props, v, ['Bounding Box Length'], 'SM_BlankLength')) || 0;
			var W = parseFloat(smPick(props, v, ['Bounding Box Width'], 'SM_BlankWidth')) || 0;
			var blank = parseFloat(smPick(props, v, ['Bounding Box Area-Blank'], 'SM_BlankArea')) || 0;
			var bbox = parseFloat(smPick(props, v, ['Bounding Box Area'], 'SM_BBoxArea')) || (L * W);
			var areaSource = 'Bounding Box Area-Blank';
			if (!(blank > 0)) {
				if (CFGS.useBoundingBoxIfNoBlank === false) return;
				blank = bbox; areaSource = 'Bounding Box Area';
			}

			/* true outline extents beat the reported bounding box */
			var geomEarly = smGeometry(name);
			var op = smOutlinePoints(geomEarly);
			if (op && op.w > 0 && op.h > 0) { L = op.w; W = op.h; }
			var nest = smNest(L, W);
			var sheets = nest.n > 0 ? Math.ceil(qty / nest.n) : 0;

			out.push({
				resource: 'sheetmetalParts',
				key: id,
				partGuid: id,
				name: name,
				material: { name: smPick(props, v, ['MATERIAL', 'Material'], 'SM_Material') || '' },
				thickness: parseFloat(smPick(props, v, ['Sheet Metal Thickness'], 'SM_Thickness')) || 0,
				gauge: smPick(props, v, ['Sheet Metal Gauge'], 'SM_Gauge') || '',
				grain: smGrainNorm(smPick(props, v,
					(CFGS.grainProperty || ['Grain Direction', 'Grain']), 'SM_Grain')),
				length: L,
				width: W,
				quantity: qty,
				blankMm2: blank,
				areaSource: areaSource,
				bends: parseInt(smPick(props, v, ['Bends'], 'SM_Bends'), 10) || 0,
				cutOuts: parseInt(smPick(props, v, ['Cut Outs'], 'SM_CutOuts'), 10) || 0,
				cutLength: (parseFloat(smPick(props, v, ['Cutting Length-Outer'], 'SM_CutLengthOuter')) || 0) +
					(parseFloat(smPick(props, v, ['Cutting Length-Inner'], 'SM_CutLengthInner')) || 0),
				massEach: parseFloat(smPick(props, v, ['Mass'], 'SM_Mass')) || 0,
				perSheet: nest.n,
				sheets: sheets,
				orientation: nest.orientation,
				nest: nest,
				variables: v,
				swcps: (part && smcpsMapOf(part)) || {},
				frame: frameOf[id] || '',
				subFrame: subOf[id] || '',
				geom: smGeometry(name),
				image: smImage(part),
			});
		}

		/* IMG_PART thumbnail, once Report.cfg allows one for sheet metal */
		function smImage(o) {
			var docs = (o && o.documents) || [];
			for (var i = 0; i < docs.length; i++) {
				if (docs[i].docType === 'IMAGE' && docs[i].exists !== false) {
					return docs[i].relativeURI || docs[i].absoluteURI || '';
				}
			}
			return '';
		}

		function smcpsMapOf(o) {
			var m = {};
			((o && o.swcps) || []).forEach(function (c) { m[c.name] = c.value; });
			return m;
		}

		/* cut-list bodies first, then plain parts */
		(data.stocks || []).forEach(function (st) {
			var v = vars(st);
			var part = parts[st.part] || null;
			var props = smProps(part);
			add(st.ID, v.SM_Description || v.MBS_Cutlist || v.ST_N || (part && vars(part).NAME) || st.ID, props, v, part);
		});
		(data.parts || []).forEach(function (pt) {
			var v = vars(pt);
			add(pt.ID, v.NAME || pt.ID, smProps(pt), v, pt);
		});
		return out;
	}
	window.SwoodClient.collectSheetMetal = collectSheetMetal;
	/* the native Sheetmetal pages use the same nesting engine and the same
	   flat-pattern lookup, so all three pages always agree */
	window.SwoodClient.smNestFor = function (L, W) { return smNest(L, W); };
	window.SwoodClient.smGeometryFor = function (name) {
		return smOutlinePoints(smGeometry(name));
	};

	/* ==================================================================
	 * CLIENT PROCESS PAGES
	 * ------------------------------------------------------------------
	 * SWOOD only builds processZones for PANELS, so both pages were empty.
	 * These collect every coated body - panels, weldments, sheetmetal -
	 * and run them through SwoodClient.coating.
	 *
	 * TO ADD A RESOURCE: add a block to collectCoated().
	 * ================================================================ */
	function collectCoated(data) {
		var SC = window.SwoodClient;
		if (!SC || !SC.coating) return [];
		var out = [];
		var pq = SC.projectQty ? (SC.projectQty(data.swcps) || 1) : 1;
		var mats = indexBy(data.materials || [], 'ID');
		var parts = indexBy(data.parts || [], 'ID');
		/* frameNameByPanel maps PART ids -> frame name, so it covers
		   weldment parts as well as panels */
		var frameOf = frameNameByPanel(data);
		var subOf = subFrameNameByPart(data);

		/* A panel has no refPart and no material key. Its ID *is* the part
		   GUID, and the material sits on its CORE stock. Resolve both once. */
		var panelMat = {};
		(data.stocks || []).forEach(function (st2) {
			if (st2.part && st2.material && !panelMat[st2.part]) panelMat[st2.part] = st2.material;
		});
		function panelInfo(pn) {
			var pid = pn.ID;
			return {
				part: parts[pid] || null,
				materialName: panelMat[pid] || '',
				frame: frameOf[pid] || '',
				subFrame: subOf[pid] || '',
			};
		}

		/* Surface Finish / RAL Colour / Coat Sides are PART custom properties,
		   not cut-list variables, so every row has to carry the owning part's
		   swcps or the finish falls back to the material rule. */
		function swcpsMap(obj) {
			var m = {};
			((obj && obj.swcps) || []).forEach(function (c) { m[c.name] = c.value; });
			return m;
		}

		/* ---- weldments: stocks that carry MBS_* cut-list variables ---- */
		(data.stocks || []).forEach(function (st) {
			var v = vars(st);
			if (!v.MBS_Length && !v.MBS_Cutlist) return;
			var part = parts[st.part] || parts[st.refPart] || null;
			out.push({
				resource: 'weldments',
				key: st.ID,
				partGuid: st.part || '',
				name: v.MBS_Cutlist || v.ST_N || st.ID,
				length: parseFloat(v.MBS_Length) || parseFloat(v.ST_T) || 0,
				width: 0,
				/* the part's NB is scaled by Product Quantity in
				   patchRawQuantity, so prefer it over the cut-list QUANTITY */
				quantity: ((part && parseFloat(vars(part).NB)) || parseFloat(v.MBS_Quantity) || 1) * pq,
				variables: v,
				swcps: swcpsMap(part),
				frame: frameOf[st.part] || '',
				subFrame: subOf[st.part] || '',
				material: { name: v.MBS_Material || st.material || '' },
			});
		});

		/* ---- SWOOD's OWN panel processes -------------------------------
		   These already carry a measured area and a cost, so they are used
		   as-is. Nothing is derived for a panel that has a real zone.    */
		var procById = {};
		(data.panelProcesses || []).forEach(function (pp) {
			var v = vars(pp);
			if (v.PROC_NAME) procById[v.PROC_NAME] = v;
		});
		var panelById = indexBy(data.panels || [], 'ID');
		var nativePanels = {};

		(data.processZones || []).forEach(function (z) {
			var v = vars(z);
			var pan = panelById[z.panel] || null;
			var info = pan ? panelInfo(pan) : { part: null, materialName: '', frame: '' };
			var part = info.part;
			var pv = part ? vars(part) : {};
			var lib = procById[z.panelProcess] || {};
			nativePanels[z.panel] = true;
			/* PROC_ZONE_QTT / PROC_ZONE_COST are for ONE panel. Multiply by
			   NB x Project Quantity (NB already carries Product Quantity). */
			var qty = (parseFloat(pv.NB) || 1) * pq;
			out.push({
				native: true,
				resource: 'panels',
				key: z.ID,
				panelGuid: z.panel || '',
				zone: v.PROC_ZONENAME || '',
				name: (pan && pan.name) || v.PROC_ZONENAME || '',
				process: z.panelProcess || '',
				quantity: qty,
				m2: (parseFloat(v.PROC_ZONE_QTT) || 0) * qty,
				cost: (parseFloat(v.PROC_ZONE_COST) || 0) * qty,
				m2Each: parseFloat(v.PROC_ZONE_QTT) || 0,
				rate: parseFloat(lib.PROC_UCOST) || 0,
				sides: 1,
				variables: v,
				swcps: swcpsMap(part),
				frame: info.frame,
				subFrame: info.subFrame,
				material: { name: info.materialName },
			});
		});

		/* ---- panels ---------------------------------------------------- */
		(data.panels || []).forEach(function (pn) {
			if (nativePanels[pn.ID]) return;   /* SWOOD already costed it */
			var v = vars(pn);
			var info = panelInfo(pn);
			var part = info.part;
			var pv = part ? vars(part) : {};
			out.push({
				resource: 'panels',
				key: pn.ID,
				panelGuid: pn.ID || '',
				name: pn.name || '',
				length: parseFloat(v.PAN_L) || 0,
				width: parseFloat(v.PAN_W) || 0,
				quantity: (parseFloat(pv.NB) || 1) * pq,
				variables: v,
				swcps: swcpsMap(part),
				frame: info.frame,
				subFrame: info.subFrame,
				material: { name: info.materialName },
			});
		});

		/* ---- sheet metal ------------------------------------------------ */
		if (SC.collectSheetMetal) {
			SC.collectSheetMetal(data).forEach(function (r) { out.push(r); });
		}

		/* keep native zones plus any body the coating engine gives a finish */
		return out.filter(function (r) {
			return r.native || SC.coating.processes(r).length > 0;
		});
	}

	/* ------------------------------------------------------------------
	 * SHEET METAL PARTS page
	 * TO ADD / REMOVE A COLUMN: edit SM_COLS. `of(row)` returns the cell.
	 * ---------------------------------------------------------------- */
	var SM_COLS = [
		{ on: true,  title: '',            num: false, of: function (r) {
			return r.image ? '<img class="sm-thumb" src="' + esc(r.image) + '" alt="">' : ''; } },
		{ on: true,  title: 'Part Name',    num: false, of: function (r) {
			return r.partGuid ? '<a class="pr-link" href="#/panels/' + esc(r.partGuid) + PANEL_KEY_SUFFIX + '">' + esc(r.name) + '</a>' : esc(r.name); } },
		{ on: true,  title: 'Material',     num: false, of: function (r) { return esc(r.material.name); } },
		{ on: true,  title: 'Thk',          num: true,  of: function (r) { return fmt(r.thickness, 2); } },
		{ on: false, title: 'Gauge',        num: false, of: function (r) { return esc(r.gauge); } },
		{ on: true,  title: 'Blank L',      num: true,  of: function (r) { return fmt(r.length, 1); } },
		{ on: true,  title: 'Blank W',      num: true,  of: function (r) { return fmt(r.width, 1); } },
		{ on: true,  title: 'Blank m\u00B2', num: true, of: function (r) { return (r.blankMm2 / 1e6).toFixed(4); } },
		{ on: true,  title: 'Bends',        num: true,  of: function (r) { return String(r.bends); } },
		{ on: true,  title: 'Cut-outs',     num: true,  of: function (r) { return String(r.cutOuts); } },
		{ on: true,  title: 'Cut Len',      num: true,  of: function (r) { return fmt(r.cutLength, 0); } },
		{ on: true,  title: 'Qty',          num: true,  of: function (r) { return fmt(r.quantity, 0); } },
		{ on: true,  title: 'Per Sheet',    num: true,  of: function (r) { return String(r.perSheet); } },
		{ on: true,  title: 'Sheets',       num: true,  of: function (r) { return String(r.sheets); } },
		{ on: false, title: 'Orientation',  num: false, of: function (r) { return esc(r.orientation); } },
		{ on: true,  title: 'Process',      num: false, of: function (r) { return esc(window.SwoodClient.coating.processes(r).join(' + ')); } },
		{ on: true,  title: 'Shade',        num: false, of: function (r) { return window.SwoodClient.coating.swatch(window.SwoodClient.coating.pickedColour(r)); } },
		{ on: true,  title: 'Coat m\u00B2', num: true, of: function (r) { return window.SwoodClient.coating.areaM2(r, 'sheetmetalParts').toFixed(4); } },
		{ on: true,  title: 'Coat Cost',    num: true,  of: function (r) {
			var c = window.SwoodClient.coating.cost(r, 'sheetmetalParts');
			return ((window.SwoodClient.config && window.SwoodClient.config.currency) || '\u20B9') + fmt(c, 2); } },
		{ on: false, title: 'Mass kg',      num: true,  of: function (r) { return fmt(r.massEach * r.quantity / 1000, 2); } },
		{ on: false, title: 'Area source',  num: false, of: function (r) { return esc(r.areaSource); } },
	];

	function renderSheetMetal(app, data) {
		var SC = window.SwoodClient;
		var st = UI.sheetMetal || (UI.sheetMetal = { q: '', split: 'none' });
		var cols = SM_COLS.filter(function (c) { return c.on !== false; });

		var rows = collectSheetMetal(data).filter(function (r) {
			return matches(st.q, [r.name, r.material.name, r.gauge, r.frame, r.thickness, r.length, r.width]);
		});

		var SPL = [
			{ key: 'material', label: 'Material', of: function (r) { return r.material.name || 'No Material'; } },
			{ key: 'thickness', label: 'Thickness', of: function (r) { return fmt(r.thickness, 2) + ' mm'; } },
			{ key: 'frame', label: 'Frame', of: function (r) { return r.frame || 'No Parent'; } },
		];
		var sd = null;
		SPL.forEach(function (x) { if (x.key === st.split) sd = x; });

		if (!rows.length) {
			app.innerHTML = '<h1 class="MuiTypography-root MuiTypography-h1">Sheet Metal Parts</h1>' +
				toolbar(st, SPL) +
				'<div class="pr-empty"><h3>No sheet metal parts found</h3>' +
				'<p>Add the SM_* block to Report.cfg and regenerate the report. ' +
				'A part is recognised by its sheet metal cut-list properties.</p></div>';
			bindBar(app, st);
			return;
		}

		var groups = [];
		if (sd) {
			var g = {}, ord = [];
			rows.forEach(function (r) { var k = sd.of(r); if (!g[k]) { g[k] = []; ord.push(k); } g[k].push(r); });
			ord.sort();
			groups = ord.map(function (k) { return { title: k, rows: g[k] }; });
		} else {
			groups = [{ title: 'Sheet Metal Parts', rows: rows }];
		}

		function tbl(title, list) {
			var tot = { blank: 0, sheets: 0, qty: 0, coat: 0, cost: 0 };
			var body = list.map(function (r, i) {
				tot.blank += r.blankMm2 * r.quantity; tot.sheets += r.sheets; tot.qty += r.quantity;
				tot.coat += SC.coating.areaM2(r, 'sheetmetalParts');
				tot.cost += SC.coating.cost(r, 'sheetmetalParts');
				return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' +
					cols.map(function (c) {
						return '<td class="' + (c.num ? 'pr-num' : '') + '">' + c.of(r) + '</td>';
					}).join('') + '</tr>';
			}).join('');

			var cur = (SC.config && SC.config.currency) || '\u20B9';
			var foot = '<tr class="pr-tot">' + cols.map(function (c) {
				var v = '';
				if (c.title === 'Qty') v = fmt(tot.qty, 0);
				else if (c.title === 'Sheets') v = String(tot.sheets);
				else if (c.title === 'Coat m\u00B2') v = tot.coat.toFixed(4);
				else if (c.title === 'Coat Cost') v = cur + fmt(tot.cost, 2);
				return '<td class="' + (c.num ? 'pr-num' : '') + '">' + v + '</td>';
			}).join('') + '</tr>';

			var bar = tableTitleBar(title, list.length + ' item' + (list.length === 1 ? '' : 's') +
				' \u2013 ' + tot.sheets + ' sheet' + (tot.sheets === 1 ? '' : 's'));
			return '<div class="pr-tbl-shell">' + bar.html +
				'<div class="pr-tbl-scroll"><table class="pr-tbl"><thead><tr>' +
				cols.map(function (c) { return '<th class="' + (c.num ? 'pr-num' : '') + '">' + esc(c.title) + '</th>'; }).join('') +
				'</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div></div>';
		}

		app.innerHTML = '<h1 class="MuiTypography-root MuiTypography-h1">Sheet Metal Parts</h1>' +
			toolbar(st, SPL) + groups.map(function (g2) { return tbl(g2.title, g2.rows); }).join('');
		bindBar(app, st);
		bindExports(app);
	}

	/* ------------------------------------------------------------------
	 * SHEETMETAL LAYOUT - one nesting sheet per drawing, like Patterns
	 * ---------------------------------------------------------------- */
	function smToolbar() {
		var st = smCfg();
		var opts = st.sheets.map(function (sh, i) {
			return '<option value="' + i + '"' + (st.sheetIndex === i ? ' selected' : '') + '>' + esc(sh.label) + '</option>';
		}).join('') + '<option value="-1"' + (st.sheetIndex < 0 ? ' selected' : '') + '>Auto (best fit)</option>';
		var rows = [1, 2, 3, 4].map(function (n) {
			return '<button data-sm="perRow" data-v="' + n + '"' + (st.perRow === n ? ' class="on"' : '') + '>' + n + '</button>';
		}).join('') + '<button data-sm="perRow" data-v="0"' + (!st.perRow ? ' class="on"' : '') + '>All</button>';
		return '<div class="pr-bar">' +
			'<label class="pr-lab">Sheet</label><select data-sm="sheet" class="pr-sel">' + opts + '</select>' +
			'<label class="pr-lab">Trim</label><input data-sm="trim" type="number" min="0" step="1" value="' + st.trim + '"><span class="pr-unit">mm</span>' +
			'<label class="pr-lab">Kerf</label><input data-sm="kerf" type="number" min="0" step="0.5" value="' + st.kerf + '"><span class="pr-unit">mm</span>' +
			'<label class="pr-lab">Sheets per row</label><div class="pr-split">' + rows + '</div>' +
			'</div>';
	}

	function bindSmBar(app, redraw) {
		var st = smCfg();
		[].forEach.call(app.querySelectorAll('[data-sm]'), function (el) {
			var k = el.getAttribute('data-sm');
			if (el.tagName === 'BUTTON') {
				el.onclick = function () { st.perRow = parseInt(el.getAttribute('data-v'), 10); redraw(); };
			} else if (el.tagName === 'SELECT') {
				el.onchange = function () { st.sheetIndex = parseInt(el.value, 10); redraw(); };
			} else {
				el.onchange = function () {
					var n = parseFloat(el.value);
					if (!isNaN(n) && n >= 0) { st[k] = n; redraw(); }
				};
			}
		});
	}

	/* one stock sheet drawn to scale, blanks laid out on the grid */
	function smSheetSvg(r, blanksOnThis) {
		var st = smCfg();
		var n = r.nest;
		if (!n || !n.n) return '<div class="pr-empty"><p>Blank does not fit the chosen sheet.</p></div>';
		var SL = n.sheet.L, SW = n.sheet.W, t = st.trim, k = st.kerf;
		var svg = '<svg viewBox="0 0 ' + SL + ' ' + SW + '" preserveAspectRatio="xMidYMid meet" class="sm-sheet">';
		svg += '<rect x="0" y="0" width="' + SL + '" height="' + SW + '" fill="#fbe9e9" stroke="#b8b8b8" stroke-width="4"/>';
		svg += '<rect x="' + t + '" y="' + t + '" width="' + (SL - 2 * t) + '" height="' + (SW - 2 * t) +
			'" fill="none" stroke="#d9a3a3" stroke-dasharray="18 12" stroke-width="3"/>';
		var placed = 0;
		for (var row = 0; row < n.rows; row++) {
			for (var col = 0; col < n.cols; col++) {
				if (placed >= blanksOnThis) break;
				var x = t + col * (n.blankL + k);
				var y = t + row * (n.blankW + k);

				/* the part key SwoodReport uses is <rawId>-<instance>, and
				   with instantiateData off the instance is always 0 */
				var href = r.partGuid ? '#/sheetmetal-parts/' + esc(r.partGuid) + '-0' : '';
				if (href) svg += '<a class="pr-piece" href="' + href + '">';
				var op2 = smOutlinePoints(r.geom);
				if (op2 && op2.w > 0) {
					/* true flat pattern, scaled into the grid cell and rotated
					   with the nest when the blank was turned 90 degrees */
					var rot = (n.orientation.indexOf('rotated') === 0);
					var sx = (rot ? n.blankL / op2.h : n.blankL / op2.w);
					var sy = (rot ? n.blankW / op2.w : n.blankW / op2.h);
					var tf = rot
						? 'translate(' + (x + n.blankL) + ',' + y + ') rotate(90) scale(' + fmt(sy, 5) + ',' + fmt(sx, 5) + ')'
						: 'translate(' + x + ',' + y + ') scale(' + fmt(sx, 5) + ',' + fmt(sy, 5) + ')';
					/* one path, even-odd, so cut-outs read as holes rather than
					   being painted over the blank */
					function ringToPath(p) {
						return 'M' + p.split(' ').join('L') + 'Z';
					}
					var d = ringToPath(op2.pts);
					;(op2.holes || []).forEach(function (h) { d += ringToPath(h); });
					svg += '<path d="' + d + '" fill-rule="evenodd" transform="' + tf +
						'" fill="#a8b8e8" stroke="#4a5a9a" stroke-width="' +
						fmt(4 / Math.max(sx, 0.0001), 2) + '"/>';
				} else {
					svg += '<rect x="' + x + '" y="' + y + '" width="' + n.blankL + '" height="' + n.blankW +
						'" fill="#a8b8e8" stroke="#4a5a9a" stroke-width="4"/>';
				}
				/* label sized so it always fits inside the blank, and clipped
				   to the number of characters the width can actually hold */
				var fs = Math.max(12, Math.min(n.blankL, n.blankW) * 0.11);
				/* a transparent hit area, so the whole blank is clickable and
				   not just the drawn outline */
				if (href) {
					svg += '<rect x="' + x + '" y="' + y + '" width="' + n.blankL +
						'" height="' + n.blankW + '" fill="transparent"/>';
				}
				var maxChars = Math.floor((n.blankL * 0.86) / (fs * 0.55));
				var label = String(r.name);
				if (maxChars < 4) {
					label = '';
				} else if (label.length > maxChars) {
					label = label.slice(0, maxChars - 1) + '\u2026';
				}
				if (label) {
					svg += '<text x="' + (x + n.blankL / 2) + '" y="' + (y + n.blankW / 2 + fs * 0.35) +
						'" font-size="' + fmt(fs, 0) + '" text-anchor="middle" fill="#16202b" ' +
						'font-family="Arial">' + esc(label) + '</text>';
				}
				if (href) svg += '</a>';
				placed++;
			}
		}
		return svg + '</svg>';
	}

	function renderSheetMetalLayout(app, data) {
		var SC = window.SwoodClient;
		var st = smCfg();
		var cfgSM = (SC.config && SC.config.sheetMetal) || {};
		var uiq = UI.smLayout || (UI.smLayout = { q: '', split: 'none' });

		/* arriving from a part name link */
		var seedQ = routeParam('q');
		if (seedQ) {
			if (uiq._seed !== seedQ) { uiq.q = seedQ; uiq._seed = seedQ; }
		} else if (uiq._seed) {
			uiq.q = ''; uiq._seed = null;
		}

		var all = collectSheetMetal(data);
		var rows = all.filter(function (r) {
			return matches(uiq.q, [r.name, r.material.name, r.thickness]);
		});

		function redraw() { renderSheetMetalLayout(app, data); }

		/* true shape only: a part with no flat pattern is not nested */
		var missing = [];
		if (cfgSM.trueShapeOnly !== false) {
			rows = rows.filter(function (r) {
				if (r.geom) return true;
				missing.push(r.name);
				return false;
			});
		}

		/* A part can have a perfect flat pattern and still be invisible here,
		   because every sheet metal page filters on SM_Thickness > 0 and that
		   comes from CopySheetMetalProps, not from the geometry macro. */
		var orphan = [];
		try {
			var geoAll = window.sheetMetalGeometry || {};
			var known = {};
			all.forEach(function (r) { known[String(r.name).toLowerCase()] = 1; });
			for (var gk in geoAll) {
				if (!Object.prototype.hasOwnProperty.call(geoAll, gk)) continue;
				var base = gk.replace(/_Default$/i, '').toLowerCase();
				if (known[base] || known[gk.toLowerCase()]) continue;
				if (orphan.indexOf(base) < 0) orphan.push(base);
			}
		} catch (e) {}

		var orphanWarn = orphan.length
			? '<div class="sm-warn"><b>' + orphan.length + ' part(s) have a flat pattern but no cut-list data:</b> ' +
			  esc(orphan.join(', ')) +
			  '<br>Run <b>CopySheetMetalProps</b> on the assembly, save the parts, then regenerate the report. ' +
			  'Without it these parts have no thickness or blank size and cannot be nested.</div>'
			: '';

		if (!rows.length) {
			app.innerHTML = '<h1 class="MuiTypography-root MuiTypography-h1">Sheetmetal Layout</h1>' +
				smToolbar() +
				'<div class="pr-empty"><h3>' +
				(missing.length ? 'No flat patterns available' : 'No sheet metal parts found') +
				'</h3><p>' +
				(missing.length
					? 'db/sheetmetal-geometry.js has no outline for: ' + esc(missing.join(', ')) +
					  '. Regenerate the report so SheetMetalGeometry exports the flat patterns.'
					: 'Run CopySheetMetalProps on the assembly, save the parts, then regenerate ' +
					  'the report. It writes the cut-list properties every sheet metal page ' +
					  'filters on.') +
				'</p></div>' + orphanWarn;
			bindSmBar(app, redraw);
			return;
		}

		/* ---- the nest ---- */
		var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
		var sheets, legacy = (cfgSM.trueNest === false);
		if (legacy) {
			sheets = [];
			rows.forEach(function (r) {
				var n = r.nest;
				if (!n || !n.n) return;
				var left = r.quantity;
				while (left > 0) {
					var on = Math.min(left, n.n);
					sheets.push({ legacy: true, row: r, on: on, sheet: n.sheet, key: r.name });
					left -= on;
				}
			});
		} else {
			sheets = smBuildNest(rows);
		}
		var ms = ((window.performance && performance.now) ? performance.now() : Date.now()) - t0;

		var tot = { blanks: 0, blankArea: 0, sheetArea: 0 };
		sheets.forEach(function (sh) {
			if (sh.legacy) {
				tot.blanks += sh.on;
				tot.blankArea += (sh.row.blankMm2 * sh.on) / 1e6;
			} else {
				tot.blanks += sh.placed.length;
				sh.placed.forEach(function (p) { tot.blankArea += p.area / 1e6; });
			}
			tot.sheetArea += (sh.sheet.L * sh.sheet.W) / 1e6;
		});

		var waste = tot.sheetArea - tot.blankArea;
		var summary =
			'<div class="pr-panel"><div class="pr-cards">' +
			card('Total Blanks:', String(tot.blanks)) +
			card('Blanks Area:', tot.blankArea.toFixed(2) + ' m\u00b2 (' +
				(tot.sheetArea ? Math.round(100 * tot.blankArea / tot.sheetArea) : 0) + '%)') +
			card('Waste Area:', waste.toFixed(2) + ' m\u00b2 (' +
				(tot.sheetArea ? Math.round(100 * waste / tot.sheetArea) : 0) + '%)') +
			card('Sheets:', String(sheets.length)) +
			'</div>' +
			donut('Quantities', [
				{ label: 'blanks', value: tot.blanks, color: F_PANEL },
				{ label: 'waste', value: Math.max(0, Math.round(waste * 10)), color: C_WASTE },
			]) +
			donut('Area Usage', [
				{ label: 'blanks', value: tot.blankArea, color: F_PANEL },
				{ label: 'waste', value: waste, color: C_WASTE },
			]) +
			'</div>';

		var cols = st.perRow || sheets.length || 1;
		var body = sheets.map(function (sh, i) {
			if (sh.legacy) {
				var r = sh.row, n = r.nest;
				var used = 100 * (r.blankMm2 * sh.on) / (n.sheet.L * n.sheet.W);
				return '<div class="pr-panel sm-card">' +
					'<div class="pr-sheet-head"><b>Sheet ' + (i + 1) + '</b> \u00b7 ' +
					esc(r.material.name) + ' \u00b7 ' + fmt(r.thickness, 2) + ' mm \u00b7 ' +
					sh.on + ' blank' + (sh.on === 1 ? '' : 's') + ' \u00b7 ' +
					n.sheet.L + ' \u00d7 ' + n.sheet.W + ' mm \u00b7 waste <b>' +
					(100 - used).toFixed(1) + '%</b></div>' +
					'<div class="sm-board">' + smSheetSvg(r, sh.on) + '</div>' +
					'<div class="sm-src">Grid nest, single part per sheet</div>' +
					'</div>';
			}

			var area = 0, names = {}, nameOrder = [];
			sh.placed.forEach(function (p) {
				area += p.area;
				var nm = p.row.name;
				if (!names[nm]) { names[nm] = 0; nameOrder.push(nm); }
				names[nm]++;
			});
			var util = 100 * area / (sh.sheet.L * sh.sheet.W);
			var grainOf = {};
			sh.placed.forEach(function (p) { grainOf[p.row.name] = p.row.grain; });
			var mix = nameOrder.map(function (nm) {
				var g = smGrainLabel(grainOf[nm]);
				return '<div class="pr-card"><b>' + names[nm] + '\u00d7</b> ' + esc(nm) +
					(g ? ' <span class="pr-unit">\u00b7 ' + esc(g) + '</span>' : '') + '</div>';
			}).join('');

			return '<div class="pr-panel sm-card">' +
				'<div class="pr-sheet-head"><b>Sheet ' + (i + 1) + '</b> \u00b7 ' + esc(sh.key) +
				' \u00b7 ' + sh.placed.length + ' blank' + (sh.placed.length === 1 ? '' : 's') +
				' \u00b7 ' + sh.sheet.L + ' \u00d7 ' + sh.sheet.W + ' mm \u00b7 used <b>' +
				util.toFixed(1) + '%</b> \u00b7 waste <b>' + (100 - util).toFixed(1) + '%</b></div>' +
				'<div class="pr-cards">' + mix + '</div>' +
				'<div class="sm-board">' + smNestSvg(sh) + '</div>' +
				'<div class="sm-src">True-shape nest from SOLIDWORKS flat patterns \u00b7 ' +
				'trim ' + st.trim + ' mm, kerf ' + st.kerf + ' mm</div>' +
				'</div>';
		}).join('');

		var warn = missing.length
			? '<div class="sm-warn">Not nested \u2013 no flat pattern for: ' +
			  esc(missing.join(', ')) + '</div>'
			: '';
		if (sheets.unfit && sheets.unfit.length) {
			warn += '<div class="sm-warn">Too large for the chosen sheet: ' +
				esc(sheets.unfit.join(', ')) + '</div>';
		}

		var note = legacy
			? '<div class="sm-src">Grid nest (sheetMetal.trueNest is false): one part per sheet.</div>'
			: '<div class="sm-src">Nested ' + tot.blanks + ' blank(s) into ' + sheets.length +
			  ' sheet(s) in ' + Math.round(ms) + ' ms at ' + fmt(sheets.resolution, 0) +
			  ' mm resolution.</div>';

		app.innerHTML = '<h1 class="MuiTypography-root MuiTypography-h1">Sheetmetal Layout</h1>' +
			smToolbar() + orphanWarn + warn + summary + note +
			'<div class="pr-sheets" data-cols="' + cols + '" style="--sm-cols:' + cols + '">' +
			body + '</div>';
		bindSmBar(app, redraw);
	}

	/* ------------------------------------------------------------------
	 * SHEETMETAL QUANTITIES - one row per part, nest summary
	 * ---------------------------------------------------------------- */
	function renderSheetMetalQuantities(app, data) {
		var st = smCfg();
		var uiq = UI.smQty || (UI.smQty = { q: '', split: 'none' });
		var rows = collectSheetMetal(data).filter(function (r) {
			return matches(uiq.q, [r.name, r.material.name, r.thickness]);
		});
		function redraw() { renderSheetMetalQuantities(app, data); }

		var head = ['', 'Part Name', 'Material', 'Thk', 'Blank', 'Stock Sheet', 'Orientation',
			'Qty', 'Per Sheet', 'Sheets', 'Utilisation %', 'Scrap m\u00b2'];
		var tq = 0, tsh = 0, tscrap = 0;
		var body = rows.map(function (r, i) {
			var n = r.nest;
			var sheetArea = n && n.n ? (n.sheet.L * n.sheet.W) / 1e6 * r.sheets : 0;
			var blankArea = (r.blankMm2 * r.quantity) / 1e6;
			var scrap = Math.max(0, sheetArea - blankArea);
			var util = sheetArea ? (100 * blankArea / sheetArea) : 0;
			tq += r.quantity; tsh += r.sheets; tscrap += scrap;
			var cells = [
				(r.image ? '<img class="sm-thumb" src="' + esc(r.image) + '" alt="">' : ''),
				'<a class="pr-link" href="#/panels/' + esc(r.partGuid) + PANEL_KEY_SUFFIX + '">' + esc(r.name) + '</a>',
				esc(r.material.name), fmt(r.thickness, 2),
				fmt(r.length, 1) + ' x ' + fmt(r.width, 1),
				n && n.sheet ? (n.sheet.L + ' x ' + n.sheet.W) : '',
				esc(r.orientation), fmt(r.quantity, 0), String(r.perSheet), String(r.sheets),
				util.toFixed(1), scrap.toFixed(3)];
			return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' + cells.map(function (c, ci) {
				return '<td class="' + (ci >= 3 ? 'pr-num' : '') + '">' + c + '</td>';
			}).join('') + '</tr>';
		}).join('');

		if (!rows.length) {
			app.innerHTML = '<h1 class="MuiTypography-root MuiTypography-h1">Sheetmetal Quantities</h1>' +
				toolbar(uiq, []) + '<div class="pr-empty"><h3>No sheet metal parts found</h3></div>';
			bindBar(app, uiq);
			return;
		}

		var foot = '<tr class="pr-tot"><td colspan="7"></td><td class="pr-num">' + fmt(tq, 0) + '</td>' +
			'<td class="pr-num"></td><td class="pr-num">' + tsh + '</td>' +
			'<td class="pr-num"></td><td class="pr-num">' + tscrap.toFixed(3) + '</td></tr>';
		var bar = tableTitleBar('Sheetmetal Quantities', rows.length + ' item' + (rows.length === 1 ? '' : 's') +
			' \u2013 ' + tsh + ' sheet' + (tsh === 1 ? '' : 's'));
		app.innerHTML = '<h1 class="MuiTypography-root MuiTypography-h1">Sheetmetal Quantities</h1>' +
			toolbar(uiq, []) + smToolbar() +
			'<div class="pr-tbl-shell">' + bar.html + '<div class="pr-tbl-scroll"><table class="pr-tbl"><thead><tr>' +
			head.map(function (h, ci) { return '<th class="' + (ci >= 3 ? 'pr-num' : '') + '">' + esc(h) + '</th>'; }).join('') +
			'</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div></div>';
		bindBar(app, uiq);
		bindSmBar(app, redraw);
		bindExports(app);
	}

	/* Where a coated row's Part Name should link to.
	 *   panels          -> panel detail          #/panels/<guid>-0
	 *   sheetmetalParts -> sheet metal detail     #/sheetmetal-parts/<guid>-0
	 *                      (the same :key the native Sheetmetal Parts page
	 *                       uses in its own Part Name column)
	 *   weldments       -> the Weldments list; parts have no detail route
	 * A sheet metal part is NOT a panel - data.parts gives it panel:null - so
	 * it carries partGuid, never panelGuid. The old panelGuid-only test
	 * therefore left every sheetmetalParts row unlinked.
	 */
	function coatedLink(r) {
		var guid = r.panelGuid || r.partGuid || '';
		if (r.resource === 'sheetmetalParts') {
			return guid ? '#/sheetmetal-parts/' + guid + PANEL_KEY_SUFFIX : '';
		}
		if (r.resource === 'weldments') {
			return '#/weldments';
		}
		return guid ? '#/panels/' + guid + PANEL_KEY_SUFFIX : '';
	}

	function renderClientProcesses(app, data, detail) {
		var SC = window.SwoodClient;
		var C = SC.coating;
		var cur = (SC.config && SC.config.currency) || '\u20B9';
		var st = detail ? (UI.clientZones || (UI.clientZones = { q: '', split: 'none' }))
			: (UI.clientProc || (UI.clientProc = { q: '', split: 'none' }));

		var seed = routeParam('q');
		if (seed) { if (st._seed !== seed) { st.q = seed; st._seed = seed; } }
		else if (st._seed) { st.q = ''; st._seed = null; }

		var rows = collectCoated(data).map(function (r) {
			if (r.native) {
				return {
					resource: r.resource,
					name: r.name,
					zone: r.zone,
					link: coatedLink(r),
					process: r.process,
					shade: C.pickedColour(r),
					sides: r.sides,
					qty: r.quantity,
					m2: r.m2,
					rate: r.rate,
					cost: r.cost,
					frame: r.frame || 'No Parent',
					subFrame: r.subFrame || 'Direct in frame',
					materialName: (r.material && r.material.name) || '',
					category: C.category(r.process) || 'Uncategorised',
				};
			}
			var procs = C.processes(r);
			return {
				resource: r.resource,
				name: r.name,
				link: coatedLink(r),
				process: procs.join(' + '),
				shade: C.pickedColour(r),
				sides: C.sides(r, r.resource),
				qty: r.quantity,
				frame: r.frame || 'No Parent',
				subFrame: r.subFrame || 'Direct in frame',
				materialName: (r.material && r.material.name) || '',
				category: C.category(procs[0]) || (procs[0] ? 'Uncategorised' : ''),
				m2: C.areaM2(r, r.resource),
				rate: C.rateTotal(r),
				cost: C.cost(r, r.resource),
			};
		}).filter(function (r) {
			return matches(st.q, [r.name, r.zone, r.process, r.shade, r.resource, r.frame, r.materialName]);
		});

		var title = detail ? 'Process Zones' : 'Panel & Part Process';

		/* Split buttons for BOTH process pages.
		   TO ADD ONE: add a line. TO REMOVE ONE: delete it.
		   `of` returns the group name for a row.                       */
		var SPLITS = [
			{ key: 'process', label: 'Process', of: function (r) { return r.process || 'No Process'; } },
			{ key: 'shade', label: 'Shade', of: function (r) { return r.shade || 'No Shade'; } },
			{ key: 'frame', label: 'Frame', of: function (r) { return r.frame || 'No Parent'; } },
			{ key: 'subframe', label: 'Sub-frame', of: function (r) { return r.subFrame || 'Direct in frame'; } },
			{ key: 'material', label: 'Material', of: function (r) { return r.materialName || 'No Material'; } },
			/* { key: 'category', label: 'Category', of: function (r) { return r.category || 'Uncategorised'; } }, */
			/* { key: 'type', label: 'Type', of: function (r) { return r.resource; } }, */
		];
		var splitDef = null;
		SPLITS.forEach(function (sp) { if (sp.key === st.split) splitDef = sp; });

		/* one table per split group, or a single table when split is off */
		var groups = [], order = [];
		if (splitDef) {
			var g = {};
			rows.forEach(function (r) {
				var k = splitDef.of(r);
				if (!g[k]) { g[k] = []; order.push(k); }
				g[k].push(r);
			});
			order.sort();
			groups = order.map(function (k) { return { title: k, rows: g[k] }; });
		} else {
			groups = [{ title: title, rows: rows }];
		}

		var cur2 = cur;
		function tableFor(gTitle, list) {
			var head, body, tot = { m2: 0, cost: 0 };
			if (detail) {
				head = ['Type', 'Part Name', 'Zone', 'Process', 'Shade', 'Qty', 'Sides', 'Qty m\u00B2', 'Qty ft\u00B2', 'Rate/m\u00B2', 'Cost'];
				body = list.map(function (r, i) {
					tot.m2 += r.m2; tot.cost += r.cost;
					return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' +
						'<td>' + esc(r.resource) + '</td><td>' +
						(r.link ? '<a class="pr-link" href="' + r.link + '">' + esc(r.name) + '</a>' : esc(r.name)) +
						'</td>' +
						'<td>' + esc(r.zone || 'Whole body') + '</td>' +
						'<td>' + esc(r.process) + '</td><td>' + C.swatch(r.shade) + '</td>' +
						'<td class="pr-num">' + fmt(r.qty, 0) + '</td>' +
						'<td class="pr-num">' + r.sides + '</td>' +
						'<td class="pr-num">' + r.m2.toFixed(4) + '</td>' +
						'<td class="pr-num">' + (r.m2 * 10.7639).toFixed(2) + '</td>' +
						'<td class="pr-num">' + cur2 + fmt(r.rate, 2) + '</td>' +
						'<td class="pr-num">' + cur2 + fmt(r.cost, 2) + '</td></tr>';
				}).join('');
			} else {
				var gg = {}, ord = [];
				list.forEach(function (r) {
					var k = r.process + '\u0000' + (r.shade || '');
					if (!gg[k]) { gg[k] = { process: r.process, shade: r.shade, n: 0, m2: 0, cost: 0, rate: r.rate }; ord.push(k); }
					gg[k].n += (parseFloat(r.qty) || 0); gg[k].m2 += r.m2; gg[k].cost += r.cost;
				});
				head = ['Process', 'Shade', 'Bodies', 'Qty m\u00B2', 'Qty ft\u00B2', 'Rate/m\u00B2', 'Cost'];
				body = ord.map(function (k, i) {
					var r = gg[k];
					tot.m2 += r.m2; tot.cost += r.cost;
					return '<tr class="' + (i % 2 ? 'pr-even' : '') + '">' +
						'<td><a class="pr-link" href="' + ROUTE_PROCESS_ZONES + '?q=' +
						encodeURIComponent(r.process) + '">' + esc(r.process) + '</a></td>' +
						'<td>' + C.swatch(r.shade) + '</td>' +
						'<td class="pr-num">' + fmt(r.n, 0) + '</td>' +
						'<td class="pr-num">' + r.m2.toFixed(4) + '</td>' +
						'<td class="pr-num">' + (r.m2 * 10.7639).toFixed(2) + '</td>' +
						'<td class="pr-num">' + cur2 + fmt(r.rate, 2) + '</td>' +
						'<td class="pr-num">' + cur2 + fmt(r.cost, 2) + '</td></tr>';
				}).join('');
			}

			var span = detail ? 7 : 3;
			var foot = '<tr class="pr-tot"><td colspan="' + span + '"></td>' +
				'<td class="pr-num">' + tot.m2.toFixed(4) + '</td>' +
				'<td class="pr-num">' + (tot.m2 * 10.7639).toFixed(2) + '</td>' +
				'<td class="pr-num"></td>' +
				'<td class="pr-num">' + cur2 + fmt(tot.cost, 2) + '</td></tr>';

			var bar = tableTitleBar(gTitle, list.length + ' item' + (list.length === 1 ? '' : 's'));
			return '<div class="pr-tbl-shell">' + bar.html +
				'<div class="pr-tbl-scroll"><table class="pr-tbl"><thead><tr>' +
				head.map(function (h, ci) { return '<th class="' + (ci >= 2 ? 'pr-num' : '') + '">' + esc(h) + '</th>'; }).join('') +
				'</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div></div>';
		}

		if (!rows.length) {
			app.innerHTML = '<h1 class="MuiTypography-root MuiTypography-h1">' + title + '</h1>' +
				toolbar(st, SPLITS) +
				'<div class="pr-empty"><h3>Nothing is coated yet</h3>' +
				'<p>Set <b>Surface Finish</b> on a body or product, or let a material rule ' +
				'apply one. See CONFIG.coating in swood-client.js.</p></div>';
			bindBar(app, st);
			return;
		}

		app.innerHTML =
			'<h1 class="MuiTypography-root MuiTypography-h1">' + title + '</h1>' +
			toolbar(st, SPLITS) +
			groups.map(function (g2) { return tableFor(g2.title, g2.rows); }).join('');

		bindBar(app, st);
		bindExports(app);
		makeSortable(app);   /* FIX: click-to-sort + asc/desc arrow, same as every
		                        other client page. Was missing, so these two pages
		                        were the only tables with no sort indicator.     */
	}

	function renderPatternedPanels(app, data) {
		var st = UI.patterned;
		var panels = collectPanels(data).filter(function (p) {
			return matches(st.q, [p.panelId, p.name, p.materialName, p.frame,
				p.category, p.L, p.W, p.thickness, p.qty]);
		});

		var head = ['Panel-ID', 'Part Name', 'Length', 'Width', 'Thickness', 'Material', 'Grain', 'Qty'];
		function rowsHtml(list, offset) {
			return list.map(function (p, i) {
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
		printDocument(name, tableEl.outerHTML);
	}

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

	function renderPatternTable(app, data) {
		var st = UI.table;
		var built = buildPatterns(data);
		var materials = indexBy(data.materials, 'ID');

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

		var head = ['Name', 'Quantity panels', 'Length', 'Width', 'Thickness', 'Material',
			'No. of Boards', 'Total Panels'];
		function tableHtml(title, list) {
			var tp = 0, tq = 0, tt = 0;
			var body = list.map(function (p, i) {
				var mv = vars(materials[p.materialId] || {});
				var total = p.layout.nPanels * p.quantity;
				tp += p.layout.nPanels; tq += p.quantity; tt += total;
				/* clicking the name opens the nested view scrolled to it */
				var nameCell = '<a class="pr-link" href="#/pattern-detailed-list?p=' +
					encodeURIComponent(p.name) + '">' + esc(p.name) + '</a>';
				var cells = [nameCell, String(p.layout.nPanels), fmt(p.boardL, 0), fmt(p.boardW, 0),
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
			return '<div class="pr-tbl-shell">' + bar.html +
				'<div class="pr-tbl-scroll"><table class="pr-tbl"><thead><tr>' +
				head.map(function (h, ci) {
					return '<th class="' + (ci >= 1 ? 'pr-num' : '') + '">' + esc(h) + '</th>';
				}).join('') + '</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot +
				'</tfoot></table></div></div>';
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

	function buildOverlay() {
		var existing = document.getElementById(OVERLAY_ID);
		if (existing) return existing;
		var overlay = document.createElement('div');
		overlay.id = OVERLAY_ID;
		overlay.innerHTML = '<div id="pattern-renest-app"></div>';
		document.body.appendChild(overlay);
		return overlay;
	}

	/* DEEP DIVE FIX: Bulletproof Sidebar Refresh Fix */
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
				if (d.width > 0 && d.right > 0) {
					left = d.right;
				} else if (window.innerWidth > 900) {
					left = 250; // Instantly catch the layout on Desktop before the sidebar loads
				}
			} else if (window.innerWidth > 900) {
			    left = 250;
			}
			
			overlay.style.top = top + 'px';
			overlay.style.left = left + 'px';
		} catch (e) {
			overlay.style.top = '0px';
			overlay.style.left = window.innerWidth > 900 ? '250px' : '0px';
		}
		overlay.style.right = '0px';
		overlay.style.bottom = '0px';
	}

	/* ?p=<pattern name> on the nested list shows that ONE pattern.
	   Clicking a name on the Patterns table lands here. */
	function routeParam(key) {
		var h = location.hash || '';
		var q = h.indexOf('?');
		if (q < 0) return '';
		var parts = h.substring(q + 1).split('&');
		for (var i = 0; i < parts.length; i++) {
			var kv = parts[i].split('=');
			if (decodeURIComponent(kv[0]) === key) return decodeURIComponent(kv[1] || '');
		}
		return '';
	}

	/* PART 1 -> CONFIG.takeOver decides which routes this engine owns. */
	function takeOver() {
		return (window.SwoodClient && window.SwoodClient.config && window.SwoodClient.config.takeOver) || {};
	}

	function currentRoute() {
		var h = String(location.hash || '').split('?')[0];
		var T = takeOver();
		if (T.patterns && h.indexOf(ROUTE_PATTERNS) === 0) return 'patterns';
		if (T.summary && h.indexOf(ROUTE_SUMMARY) === 0) return 'summary';
		if (T.patternTable && (h === ROUTE_PATTERN_TABLE || h === ROUTE_PATTERN_TABLE + '/')) return 'patternTable';
		if (T.patternedPanels && (h === ROUTE_PATTERNED_PANELS || h === ROUTE_PATTERNED_PANELS + '/')) return 'patternedPanels';
		if (T.sheetMetal && (h === ROUTE_SM_LAYOUT || h === ROUTE_SM_LAYOUT + '/')) return 'smLayout';
		if (T.panelProcesses && (h === ROUTE_PROCESS_ZONES || h === ROUTE_PROCESS_ZONES + '/')) return 'clientProcessZones';
		if (h === ROUTE_WELD_BARS || h === ROUTE_WELD_BARS + '/') return 'weldBars';
		if (T.sawMachineData && (h === ROUTE_SAW || h === ROUTE_SAW + '/')) return 'sawMachine';
		if (T.glassMirror && (h === ROUTE_GLASS || h === ROUTE_GLASS + '/')) return 'glassMirror';
		if (T.panelProcesses && (h === ROUTE_PANEL_PROCESSES || h === ROUTE_PANEL_PROCESSES + '/')) return 'clientProcesses';
		return null;
	}
	function onRoute() { return currentRoute() !== null; }

	var rerender = function () {};


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
					else if (route === 'smLayout') renderSheetMetalLayout(app, reportDataRaw);
					else if (route === 'weldBars') renderWeldBars(app, reportDataRaw);
					else if (route === 'sawMachine') renderSawLike(app, reportDataRaw, false);
					else if (route === 'glassMirror') renderSawLike(app, reportDataRaw, true);
					else if (route === 'clientProcesses') renderClientProcesses(app, reportDataRaw, false);
					else if (route === 'clientProcessZones') renderClientProcesses(app, reportDataRaw, true);
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

		rerender = function () { draw(0); };

		function sync() {
			try {
				var route = currentRoute();
				if (route) {
					positionOverlay(overlay);
					overlay.style.display = 'block';
					if (drawnFor !== route) { drawnFor = route; draw(); }
				} else {
					overlay.style.display = 'none';
				}
			} catch (e) { console.error('pattern re-nest overlay error:', e); }
		}

		/* ========================================================
		   DEEP DIVE FIX: Sizing Arrows & Mutation Observer
		   ======================================================== */
		function attachResizers() {
			var headers = overlay.querySelectorAll('th, .tabulator-col');
			for (var i = 0; i < headers.length; i++) {
				var th = headers[i];
				if (th.querySelector('.col-resizer')) continue;
				
				var resizer = document.createElement('div');
				resizer.className = 'col-resizer';
				th.appendChild(resizer);

				(function(thElement, resizeHandle) {
					var startX, startWidth;
					resizeHandle.addEventListener('mousedown', function(e) {
						startX = e.clientX;
						startWidth = thElement.offsetWidth;
						document.addEventListener('mousemove', doDrag);
						document.addEventListener('mouseup', stopDrag);
						resizeHandle.classList.add('resizing');
						e.stopPropagation();
					});
					function doDrag(e) {
						var newWidth = startWidth + (e.clientX - startX);
						thElement.style.width = newWidth + 'px';
						thElement.style.minWidth = newWidth + 'px';
						thElement.style.maxWidth = newWidth + 'px';
					}
					function stopDrag() {
						document.removeEventListener('mousemove', doDrag);
						document.removeEventListener('mouseup', stopDrag);
						resizeHandle.classList.remove('resizing');
					}
				})(th, resizer);
			}
		}

		if (typeof MutationObserver !== 'undefined') {
			var layoutObserver = new MutationObserver(function(mutations) {
				var shouldRecalculate = false;
				for (var i = 0; i < mutations.length; i++) {
					if (mutations[i].addedNodes.length > 0) {
						shouldRecalculate = true;
						break;
					}
				}
				if (shouldRecalculate) {
					attachResizers();
					if (onRoute() && overlay.style.display !== 'none') {
					    positionOverlay(overlay);
				    }
				}
			});
			
			window.addEventListener('load', function() {
				var appNode = document.getElementById('app') || document.body;
				layoutObserver.observe(appNode, { childList: true, subtree: true });
			});
		}

		if (typeof ResizeObserver !== 'undefined') {
			var ro = new ResizeObserver(function () {
				if (onRoute() && overlay.style.display !== 'none') {
					positionOverlay(overlay);
				}
			});
			ro.observe(document.body);
		}

		var last = location.hash;
		setInterval(function () {
			if (location.hash !== last) { last = location.hash; sync(); }
		}, 150);

		window.addEventListener('hashchange', function() {
			sync();
			setTimeout(attachResizers, 500);
		});

		window.addEventListener('popstate', sync);
		window.addEventListener('resize', function () { 
			if (onRoute()) positionOverlay(overlay); 
		});
		
		sync();

		window.addEventListener('load', function() {
			setTimeout(attachResizers, 500);
		});
	}

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

/* ============================================================================
 * PART 5 — SHEET METAL DETAIL GUARD
 * ----------------------------------------------------------------------------
 * The Sheetmetal Parts LIST is filtered (SM_FILTER: SM_Thickness > 0), but the
 * detail page registered at /sheetmetal-parts/:key is not, and it cannot be:
 * SwoodReport's keyed-layout component reads the WHOLE resource
 *
 *     const c = du(e.resource, s)          // page.filter is never consulted
 *
 * and hands that same unfiltered array to the < > navigator, which steps
 * through it with a plain modulo. So from a real sheet metal part the arrows
 * walk into panels, the weldment and the dowel, all rendered under the
 * "Sheet Metal Part" heading with every SM_ field showing 0.
 *
 * Fixing that inside main.js is not an option (SWOOD updates overwrite it), so
 * this layer does two things on the detail route only:
 *
 *   1. rebinds < and > to step through sheet metal parts alone
 *   2. bounces a non-sheet-metal key back to the list
 *
 * TO TURN IT OFF: set sheetMetalDetailGuard to false below.
 * TO CHANGE WHAT COUNTS AS SHEET METAL: edit isSheetMetalPart().
 * ========================================================================== */
;(function () {
	'use strict';

	var ENABLED = true;
	var ROUTE = '#/sheetmetal-parts/';
	var KEY_SUFFIX = '-0';

	function raw() {
		try { return (typeof reportDataRaw !== 'undefined') ? reportDataRaw : null } catch (e) { return null }
	}

	/* same rule as SM_FILTER on the list page */
	function isSheetMetalPart(part) {
		var v = {};
		((part && part.variables) || []).forEach(function (x) { v[x.alias] = x.value });
		return (parseFloat(v.SM_Thickness) || 0) > 0;
	}

	/* keys of the sheet metal parts, in resource order */
	function smKeys() {
		var d = raw();
		if (!d || !d.parts) return [];
		return d.parts.filter(isSheetMetalPart).map(function (p) { return p.ID + KEY_SUFFIX });
	}

	function currentKey() {
		var h = String(location.hash || '');
		if (h.indexOf(ROUTE) !== 0) return null;
		return decodeURIComponent(h.slice(ROUTE.length).split('?')[0].replace(/\/$/, ''));
	}

	function go(key) { location.hash = ROUTE + key; }

	/* --- 1. the arrows ---------------------------------------------------
	 * React owns the real handlers, so intercept in the CAPTURE phase and
	 * stop the event before it reaches them.                            */
	document.addEventListener('click', function (ev) {
		if (!ENABLED) return;
		var key = currentKey();
		if (!key) return;

		var btn = ev.target && ev.target.closest && ev.target.closest('[aria-label="previous"],[aria-label="next"]');
		if (!btn) return;

		var keys = smKeys();
		if (keys.length < 2) return;   /* nothing to step through; leave it alone */

		var i = keys.indexOf(key);
		if (i < 0) return;             /* handled by the guard below */

		ev.preventDefault();
		ev.stopPropagation();
		var step = btn.getAttribute('aria-label') === 'next' ? 1 : -1;
		go(keys[(i + step + keys.length) % keys.length]);
	}, true);

	/* --- 2. a key that is not a sheet metal part -------------------------
	 * Reached from a stale link, the Data Viewer, or a hand-typed URL.
	 * Send it to the list rather than render a weldment as sheet metal. */
	function guard() {
		if (!ENABLED) return;
		var key = currentKey();
		if (!key) return;
		var keys = smKeys();
		if (!keys.length) return;      /* no SM parts at all: do not trap the user */
		if (keys.indexOf(key) >= 0) return;
		location.replace(location.pathname + location.search + '#/sheetmetal-parts');
	}

	window.addEventListener('hashchange', function () { setTimeout(guard, 0) });
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () { setTimeout(guard, 300) });
	} else {
		setTimeout(guard, 300);
	}
})();
