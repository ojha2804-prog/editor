/* Hide Sheetmetal / Layout / Quantities when Generate wrote no SM data.
   node tests/sheetmetal-menu.js */
'use strict'

function isSheetMetalPart(part) {
	var v = {}
	;((part && part.variables) || []).forEach(function (x) { v[x.alias] = x.value })
	return (parseFloat(v.SM_Thickness) || 0) > 0
}
function hasSheetMetalData(data) {
	if (!data) return false
	var parts = data.parts || []
	for (var i = 0; i < parts.length; i++) {
		if (isSheetMetalPart(parts[i])) return true
	}
	return false
}
function isSheetmetalNavItem(item) {
	if (!item) return false
	if (/sheetmetal/i.test(String(item.id || '')) || /sheetmetal/i.test(String(item.to || ''))) return true
	return (item.children || []).some(isSheetmetalNavItem)
}
function stripSheetmetalNav(menu) {
	return (menu || []).filter(function (x) {
		if (isSheetmetalNavItem(x)) return false
		if (x.children) x.children = stripSheetmetalNav(x.children)
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
	parts: [
		{ ID: 'p1', variables: [{ alias: 'SM_Thickness', value: '0' }] },
		{ ID: 'p2', variables: [{ alias: 'NAME', value: 'Side' }] },
	],
}
if (hasSheetMetalData(woodOnly)) throw new Error('wood-only report must hide Sheetmetal pages')
if (hasSheetMetalData({ parts: [] })) throw new Error('empty parts is not sheet metal')
if (hasSheetMetalData(null)) throw new Error('no data is not sheet metal')

var withSm = {
	parts: [
		{ ID: 'p1', variables: [{ alias: 'SM_Thickness', value: '0' }] },
		{ ID: 'sm1', variables: [{ alias: 'SM_Thickness', value: '2' }] },
	],
}
if (!hasSheetMetalData(withSm)) throw new Error('SM_Thickness > 0 must show Sheetmetal pages')

var menu = [
	{ id: 'panels', to: '/panels', label: 'Panels', children: [] },
	{ id: 'sheetmetal-parts', to: '/sheetmetal-parts', label: 'Sheetmetal', children: [
		{ id: 'sheetmetal-layout', to: '/sheetmetal-layout', label: 'Layout' },
		{ id: 'sheetmetal-quantities', to: '/sheetmetal-quantities', label: 'Quantities' },
	] },
	{ id: 'summary', to: '/summary', label: 'Summary' },
]
var stripped = stripSheetmetalNav(menu)
if (stripped.length !== 2) throw new Error('strip Sheetmetal parent + children')
if (stripped.some(isSheetmetalNavItem)) throw new Error('no sheetmetal leftovers')
if (stripped[0].id !== 'panels' || stripped[1].id !== 'summary') throw new Error('keep other pages')

var rows = [{ name: 'test1', total: 7943.26 }]
absorbResidual(rows, 5487.26)
if (Math.abs(rows[0].total - 13430.52) > 0.02) throw new Error('fold Unassigned into the frame')
if (rows.some(function (r) { return r.unassigned || /Unassigned/i.test(r.name) })) {
	throw new Error('Unassigned row must not appear')
}

var two = [{ name: 'A', total: 100 }, { name: 'B', total: 300 }]
absorbResidual(two, 40)
if (Math.abs(two[0].total - 110) > 0.01) throw new Error('residual share A')
if (Math.abs(two[1].total - 330) > 0.01) throw new Error('residual share B')

console.log('sheetmetal-menu ok')
