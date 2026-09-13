/* Pattern List raw-JSON edgeband/cut-size — node tests/pattern-list-eb.js */
'use strict'

function indexBy(list, key) {
	var m = {}
	;(list || []).forEach(function (x) { m[x[key]] = x })
	return m
}
function vars(obj) {
	var m = {}
	;((obj && obj.variables) || []).forEach(function (v) { m[v.alias] = v.value })
	return m
}
function edgePosKey(eb) {
	var ev = vars(eb)
	var p = String(
		eb.position ||
		ev.EB_STOCKPOSITION ||
		ev.EB_POSITION ||
		ev.POSITION ||
		''
	).trim().toUpperCase()
	if (p === 'F' || p === 'FRONT' || p === '1') return 'F'
	if (p === 'B' || p === 'BACK' || p === '2') return 'B'
	if (p === 'L' || p === 'LEFT' || p === '3') return 'L'
	if (p === 'R' || p === 'RIGHT' || p === '4') return 'R'
	if (p.indexOf('FRONT') >= 0) return 'F'
	if (p.indexOf('BACK') >= 0) return 'B'
	if (p.indexOf('LEFT') >= 0) return 'L'
	if (p.indexOf('RIGHT') >= 0) return 'R'
	return ''
}
function panelEdgeList(panel, data) {
	if (!panel) return []
	var idx = indexBy(data.edgebands, 'ID')
	var listed = panel.edgebands || []
	if (listed.length) {
		return listed.map(function (idOrObj) {
			return (idOrObj && typeof idOrObj === 'object') ? idOrObj : idx[idOrObj]
		}).filter(Boolean)
	}
	return (data.edgebands || []).filter(function (eb) { return eb && eb.panel === panel.ID })
}
function panelEdgeThk(panel, data) {
	var out = { F: 0, B: 0, L: 0, R: 0 }
	var matIdx = indexBy(data.edgebandMaterials, 'ID')
	panelEdgeList(panel, data).forEach(function (eb) {
		var key = edgePosKey(eb)
		if (!key) return
		var ev = vars(eb)
		var mv = vars(matIdx[eb.edgebandMaterial] || {})
		var t = parseFloat(eb.thickness || ev.EB_T || ev.THICKNESS || mv.EBMAT_T) || 0
		if (t > 0) out[key] = t
	})
	return out
}
function panelCutSize(panel, sv, edges) {
	var pv = vars(panel)
	var coreL = parseFloat(panel.lengthWithoutEdgebands || pv.PAN_LWOEB)
	var coreW = parseFloat(panel.widthWithoutEdgebands || pv.PAN_WWOEB)
	var stockL = parseFloat(sv.ST_L) || 0
	var stockW = parseFloat(sv.ST_W) || 0
	if (!(coreL > 0)) coreL = stockL - (edges.F || 0) - (edges.B || 0)
	if (!(coreW > 0)) coreW = stockW - (edges.L || 0) - (edges.R || 0)
	if (!(coreL > 0)) coreL = stockL
	if (!(coreW > 0)) coreW = stockW
	return { L: coreL, W: coreW }
}

var data = {
	edgebandMaterials: [{
		ID: 'Mahogany B.MA1',
		variables: [{ alias: 'EBMAT_T', value: '1' }],
	}],
	edgebands: [
		{ ID: 'p.Edgeband1', panel: 'p', edgebandMaterial: 'Mahogany B.MA1',
			variables: [{ alias: 'EB_STOCKPOSITION', value: 'R' }] },
		{ ID: 'p.Edgeband2', panel: 'p', edgebandMaterial: 'Mahogany B.MA1',
			variables: [{ alias: 'EB_STOCKPOSITION', value: 'L' }] },
		{ ID: 'p.Edgeband3', panel: 'p', edgebandMaterial: 'Mahogany B.MA1',
			variables: [{ alias: 'EB_STOCKPOSITION', value: 'F' }] },
		{ ID: 'p.Edgeband4', panel: 'p', edgebandMaterial: 'Mahogany B.MA1',
			variables: [{ alias: 'EB_STOCKPOSITION', value: 'B' }] },
	],
}
var panel = {
	ID: 'p',
	edgebands: ['p.Edgeband1', 'p.Edgeband2', 'p.Edgeband3', 'p.Edgeband4'],
	variables: [
		{ alias: 'PAN_LWOEB', value: '817' },
		{ alias: 'PAN_WWOEB', value: '591' },
		{ alias: 'PAN_STL', value: '819' },
		{ alias: 'PAN_STW', value: '593' },
	],
}

var old = panelEdgeThk(panel, {
	edgebandMaterials: data.edgebandMaterials,
	edgebands: data.edgebands.map(function (eb) {
		return { ID: eb.ID, panel: eb.panel, edgebandMaterial: eb.edgebandMaterial, variables: [] }
	}),
})
if (old.F || old.B || old.L || old.R) throw new Error('without EB_STOCKPOSITION must not invent sides')

var edges = panelEdgeThk(panel, data)
if (edges.F !== 1 || edges.B !== 1 || edges.L !== 1 || edges.R !== 1) {
	throw new Error('expected 1mm on F/B/L/R, got ' + JSON.stringify(edges))
}

var cut = panelCutSize(panel, { ST_L: '819', ST_W: '593' }, edges)
if (cut.L !== 817 || cut.W !== 591) throw new Error('cut size should be PAN_LWOEB x PAN_WWOEB, got ' + JSON.stringify(cut))

var noVars = { ID: 'q', edgebands: [], variables: [] }
var cut2 = panelCutSize(noVars, { ST_L: '780', ST_W: '1200' }, { F: 2, B: 0, L: 0, R: 0 })
if (cut2.L !== 778 || cut2.W !== 1200) throw new Error('fallback subtract EB from ST, got ' + JSON.stringify(cut2))

console.log('pattern-list-eb ok')
