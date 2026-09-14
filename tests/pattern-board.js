/* NestingWorks board size + true-shape parts — node tests/pattern-board.js */
'use strict'

function vars(obj) {
	var m = {}
	;((obj && obj.variables) || []).forEach(function (v) { m[v.alias] = v.value })
	return m
}
function nestMm(n) {
	n = parseFloat(n)
	if (!(n > 0)) return 0
	if (n < 50) return Math.round(n * 1000 * 1000) / 1000
	return n
}
function panelPartShape(panel, L, W) {
	var pv = panel ? vars(panel) : {}
	var shape = String(pv.PAN_SHAPE || pv.SHAPE || '').toLowerCase()
	var rad = parseFloat(pv.PAN_CORNERRADIUS || pv.PAN_RADIUS || pv.CORNER_RADIUS) || 0
	var minSide = Math.min(L, W)
	if ((/circle|disk|round/.test(shape) && Math.abs(L - W) < 1.5) ||
		(minSide > 0 && rad >= minSide / 2 - 0.6 && Math.abs(L - W) < 1.5)) {
		return { type: 'circle', rx: L / 2, ry: W / 2 }
	}
	if (rad > 0.5) return { type: 'roundrect', rx: Math.min(rad, L / 2, W / 2) }
	return { type: 'rect', rx: 0 }
}
function patternBoardSize(p) {
	var v = vars(p)
	var L = nestMm(p.length || v.PAT_L)
	var W = nestMm(p.width || v.PAT_W)
	if (L > 0 && W > 0) return { L: L, W: W }
	return null
}
function resolveBoardSize(data, mv, materialId, materialName) {
	mv = mv || {}
	var best = null, bestArea = 0
	;(data.patterns || []).forEach(function (p) {
		var sz = patternBoardSize(p)
		if (!sz) return
		var area = sz.L * sz.W
		if (area > bestArea) { best = sz; bestArea = area }
	})
	if (best) return best
	return {
		L: parseFloat(mv.BOARD_LENGTH) || 0,
		W: parseFloat(mv.BOARD_WIDTH) || 0,
	}
}

if (nestMm(2.44) !== 2440) throw new Error('metres → mm')
if (nestMm(3050) !== 3050) throw new Error('3050 mm stays mm')
if (nestMm(1.22) !== 1220) throw new Error('1.22 m → 1220')

var lib = resolveBoardSize({
	patterns: [
		{ length: 2080, width: 807, refBoard: 'MDF 16' },
		{ length: 3050, width: 1220, refBoard: 'MDF 16' },
	],
}, { BOARD_LENGTH: 2440, BOARD_WIDTH: 1220 }, 'MDF', 'MDF 16')
if (lib.L !== 3050 || lib.W !== 1220) {
	throw new Error('use NestingWorks / pattern board, not material 2440×1220')
}

var fallback = resolveBoardSize({ patterns: [] }, { BOARD_LENGTH: 2440, BOARD_WIDTH: 1220 })
if (fallback.L !== 2440 || fallback.W !== 1220) throw new Error('material board fallback')

if (panelPartShape({ variables: [{ alias: 'PAN_SHAPE', value: 'Circle' }] }, 80, 80).type !== 'circle') {
	throw new Error('circle shape')
}
if (panelPartShape({ variables: [{ alias: 'PAN_CORNERRADIUS', value: '80' }] }, 400, 200).type !== 'roundrect') {
	throw new Error('rounded rectangle')
}
if (panelPartShape({}, 400, 200).type !== 'rect') throw new Error('plain rectangle')

var nest = {
	patterns: [{
		name: 'Pattern 1',
		length: 3050,
		width: 1932,
		quantity: 1,
		refBoard: 'MDF 16',
		nestedPanels: [
			{ x: 20, y: 20, length: 400, width: 200, panel: 'p1' },
			{ x: 500, y: 20, length: 80, width: 80, panel: 'p2' },
		],
	}],
	panels: [
		{ ID: 'p1', name: 'Top', variables: [{ alias: 'PAN_CORNERRADIUS', value: '80' }] },
		{ ID: 'p2', name: 'Disc', variables: [{ alias: 'PAN_SHAPE', value: 'Circle' }] },
	],
	parts: [],
	materials: [],
	cuttingPattern: [],
}
function nestedOn(obj) { return obj.nestedPanels || [] }
function nestSources(d) { return d.patterns || [] }
if (!patternBoardSize(nest.patterns[0]) || patternBoardSize(nest.patterns[0]).L !== 3050) {
	throw new Error('pattern sheet 3050×1932')
}
if (panelPartShape(nest.panels[0], 400, 200).type !== 'roundrect') throw new Error('top is roundrect')
if (panelPartShape(nest.panels[1], 80, 80).type !== 'circle') throw new Error('disc is circle')

console.log('pattern-board ok')
