/* Custom pages show only when Generate wrote that data.
   node tests/sheetmetal-menu.js */
'use strict'

function navVars(obj) {
	var m = {}
	;((obj && obj.variables) || []).forEach(function (x) { m[x.alias] = x.value })
	return m
}
function isSheetMetalPart(part) {
	return (parseFloat(navVars(part).SM_Thickness) || 0) > 0
}
function hasSheetMetalData(data) {
	if (!data) return false
	var parts = data.parts || []
	for (var i = 0; i < parts.length; i++) {
		if (isSheetMetalPart(parts[i])) return true
	}
	return false
}
function matIndex(data) {
	var mats = {}
	;((data && data.materials) || []).forEach(function (m) { mats[m.ID] = navVars(m) })
	return mats
}
function isGlassMirrorMat(mv, name) {
	mv = mv || {}
	if (String(mv.GLASS || '').toLowerCase() === 'true') return true
	if (String(mv.MIRROR || '').toLowerCase() === 'true') return true
	var n = String(name || mv.MAT_NAME || '').toUpperCase()
	if (n === 'GLASS' || n === 'MIRROR') return true
	if (/\bGLASS\b/.test(n) || /(^|[^A-Z])MIRROR/.test(n)) return true
	return false
}
function hasGlassMirrorData(data) {
	if (!data) return false
	var mats = matIndex(data)
	var id
	for (id in mats) { if (isGlassMirrorMat(mats[id], id)) return true }
	var stocks = data.stocks || []
	for (var i = 0; i < stocks.length; i++) {
		if (isGlassMirrorMat(mats[stocks[i].material], stocks[i].material)) return true
	}
	return false
}
function hasSawData(data) {
	if (!data) return false
	var panels = data.panels || []
	if (!panels.length) return false
	var mats = matIndex(data)
	var saw = 0, known = 0
	for (var i = 0; i < panels.length; i++) {
		var p = panels[i]
		var mid = (p.material && (p.material.ID || p.material.id || p.material.name)) || p.material
		var mv = (mid && typeof mid === 'object') ? navVars(mid) : (mats[mid] || {})
		var name = String((p.material && p.material.name) || mv.MAT_NAME || mid || '')
		if (isGlassMirrorMat(mv, name)) { known++; continue }
		if (mid || name) known++
		saw++
	}
	return saw > 0 || known === 0
}
function hasWeldmentData(data) {
	if (!data) return false
	if ((data.weldments || []).length) return true
	var mats = matIndex(data)
	var stocks = data.stocks || []
	for (var i = 0; i < stocks.length; i++) {
		if (String((mats[stocks[i].material] || {}).WELDMENT || '').toLowerCase() === 'true') return true
	}
	return false
}
function hasProcessData(data) {
	if (!data) return false
	return ((data.processZones || []).length > 0) || ((data.panelProcesses || []).length > 0)
}
function customNavDefs() {
	return [
		{ key: 'saw', href: ['saw-machine-data'], has: hasSawData },
		{ key: 'glass', href: ['glass-mirror'], has: hasGlassMirrorData },
		{ key: 'weldBars', href: ['weldment-bars'], has: hasWeldmentData },
		{ key: 'sheetmetal', href: ['sheetmetal-parts', 'sheetmetal-layout', 'sheetmetal-quantities'], has: hasSheetMetalData },
		{ key: 'process', href: ['panel-processes'], has: hasProcessData },
	]
}
function customNavMatch(item, def) {
	var id = String((item && item.id) || '').replace(/-menu$/, '')
	var to = String((item && item.to) || '')
	for (var i = 0; i < def.href.length; i++) {
		var h = def.href[i]
		if (id === h || id.indexOf(h) === 0) return true
		if (to.indexOf(h) >= 0) return true
	}
	return false
}
function customNavForItem(item) {
	if (!item) return null
	var defs = customNavDefs()
	for (var i = 0; i < defs.length; i++) {
		if (customNavMatch(item, defs[i])) return defs[i]
		if ((item.children || []).some(function (ch) { return customNavMatch(ch, defs[i]) })) return defs[i]
	}
	return null
}
function stripEmptyCustomNav(menu, data) {
	return (menu || []).filter(function (x) {
		var def = customNavForItem(x)
		if (def && !def.has(data)) return false
		if (x.children) x.children = stripEmptyCustomNav(x.children, data)
		return true
	})
}
function absorbResidual(rows, residual) {
	if (!(Math.abs(residual) > 0.005) || !rows || !rows.length) return rows
	var share = 0
	for (var i = 0; i < rows.length; i++) share += Math.abs(rows[i].total)
	if (share > 0.005) {
		for (var j = 0; j < rows.length; j++) {
			rows[j].total += residual * (Math.abs(rows[j].total) / share)
		}
	} else {
		rows[0].total += residual
	}
	return rows
}

var woodOnly = {
	parts: [{ ID: 'p1', variables: [{ alias: 'SM_Thickness', value: '0' }] }],
	panels: [{ ID: 'pan1', material: 'MDF' }],
	materials: [{ ID: 'MDF', variables: [{ alias: 'MAT_NAME', value: 'MDF 16mm' }] }],
	stocks: [{ material: 'MDF' }],
	weldments: [],
	panelProcesses: [],
	processZones: [],
}
if (hasSheetMetalData(woodOnly)) throw new Error('wood-only: no sheetmetal')
if (hasGlassMirrorData(woodOnly)) throw new Error('wood-only: no glass')
if (hasWeldmentData(woodOnly)) throw new Error('wood-only: no weldments')
if (hasProcessData(woodOnly)) throw new Error('wood-only: no processes')
if (!hasSawData(woodOnly)) throw new Error('wood-only: Saw stays (panels exist)')

var full = {
	parts: [{ ID: 'sm1', variables: [{ alias: 'SM_Thickness', value: '2' }] }],
	panels: [{ ID: 'pan1', material: 'MDF' }],
	materials: [
		{ ID: 'MDF', variables: [{ alias: 'MAT_NAME', value: 'MDF' }] },
		{ ID: 'GLASS', variables: [{ alias: 'GLASS', value: 'True' }, { alias: 'MAT_NAME', value: 'GLASS' }] },
		{ ID: 'TUBE', variables: [{ alias: 'WELDMENT', value: 'True' }] },
	],
	stocks: [{ material: 'GLASS' }, { material: 'TUBE' }],
	weldments: [{ ID: 'w1' }],
	panelProcesses: [{ name: 'EDGE' }],
	processZones: [{ name: 'z1' }],
}
if (!hasSheetMetalData(full)) throw new Error('SM job shows Sheetmetal')
if (!hasGlassMirrorData(full)) throw new Error('glass stock shows Glass')
if (!hasWeldmentData(full)) throw new Error('weldment shows Bar Requirement')
if (!hasProcessData(full)) throw new Error('zones show Process')
if (!hasSawData(full)) throw new Error('panels show Saw')

var menu = [
	{ id: 'panels', to: '/panels', label: 'Panels' },
	{ id: 'saw-machine-data', to: '/saw-machine-data', label: 'Saw Machine Data' },
	{ id: 'glass-mirror', to: '/glass-mirror', label: 'Glass & Mirror' },
	{ id: 'sheetmetal-parts', to: '/sheetmetal-parts', children: [
		{ id: 'sheetmetal-layout', to: '/sheetmetal-layout' },
		{ id: 'sheetmetal-quantities', to: '/sheetmetal-quantities' },
	] },
	{ id: 'panel-processes', to: '/panel-processes', children: [
		{ id: 'process-zones', to: '/panel-processes/zones' },
	] },
	{ id: 'weldment-bars', to: '/weldment-bars' },
	{ id: 'summary', to: '/summary' },
]
var stripped = stripEmptyCustomNav(menu, woodOnly)
var ids = stripped.map(function (x) { return x.id })
if (ids.indexOf('saw-machine-data') < 0) throw new Error('keep Saw on wood job')
if (ids.indexOf('summary') < 0 || ids.indexOf('panels') < 0) throw new Error('keep native pages')
if (ids.indexOf('glass-mirror') >= 0) throw new Error('hide Glass when no glass')
if (ids.indexOf('sheetmetal-parts') >= 0) throw new Error('hide Sheetmetal when no SM')
if (ids.indexOf('panel-processes') >= 0) throw new Error('hide Process when no zones')
if (ids.indexOf('weldment-bars') >= 0) throw new Error('hide Bar Requirement when no weldments')

var kept = stripEmptyCustomNav(menu, full)
if (kept.length !== 7) throw new Error('full job keeps every custom page, got ' + kept.length)

var rows = [{ name: 'test1', total: 7943.26 }]
absorbResidual(rows, 5487.26)
if (Math.abs(rows[0].total - 13430.52) > 0.02) throw new Error('fold Unassigned into the frame')

console.log('sheetmetal-menu ok')
