/* Core vs laminate stocks — node tests/core-vs-laminate.js */
'use strict'

function vars(obj) {
	var m = {}
	;((obj && obj.variables) || []).forEach(function (v) { m[v.alias] = v.value })
	return m
}
function swoodMatType(mv) {
	var t = mv && (mv.MAT_TYPE != null ? mv.MAT_TYPE : mv.MAT_SWOODTYPE)
	var n = parseInt(t, 10)
	return isNaN(n) ? -1 : n
}
function isLaminateMaterial(mv) {
	if (!mv) return false
	if (swoodMatType(mv) === 1) return true
	var cat = String(mv.CATEGORY || mv.MAT_CAT || '').toUpperCase()
	if (/\bLAMINATE\b/.test(cat)) return true
	return false
}
function isLaminateStock(st, mv) {
	var sv = vars(st)
	var tag = String(sv.ST_N || sv.ST_DESC || '').toUpperCase()
	var id = String(st.ID || '').toUpperCase()
	if (/\.CORE$/.test(id) || tag === 'CORE') return false
	if (tag.indexOf('LAYER') === 0 || tag.indexOf('LAMINATE') >= 0 || tag.indexOf('VENEER') >= 0) return true
	if (/\.LAYER|\.LAMINATE|\.FACE|\.VEN/.test(id)) return true
	if (isLaminateMaterial(mv)) return true
	var name = String((mv && (mv.MAT_NAME || mv.MAT_CAT)) || '').toUpperCase()
	if (/\bLAMINATE\b/.test(name)) return true
	return false
}

var core = { ID: 'p.CORE', variables: [{ alias: 'ST_N', value: 'CORE' }] }
var layer = { ID: 'p.LAYER1', variables: [{ alias: 'ST_N', value: 'LAYER1' }] }
var lamName = { ID: 'p.X', variables: [{ alias: 'ST_N', value: 'TOP' }] }
if (isLaminateStock(core, { MAT_NAME: 'RAW 16 MDF' })) throw new Error('CORE must nest')
if (!isLaminateStock(layer, { MAT_NAME: 'GENERIC Laminate 0.8' })) throw new Error('LAYER1 is laminate')
if (!isLaminateStock(lamName, { MAT_NAME: 'GENERIC Laminate 0.8', CATEGORY: 'LAMINATE' })) {
	throw new Error('LAMINATE category is laminate')
}
if (!isLaminateMaterial({ MAT_TYPE: '1', MAT_NAME: 'GENERIC Laminate 0.8' })) {
	throw new Error('MAT_TYPE 1 is laminate (MaterialSwoodType)')
}
if (isLaminateMaterial({ MAT_TYPE: '0', MAT_NAME: 'RAW 16 MDF' })) {
	throw new Error('MAT_TYPE 0 CORE is not laminate')
}
if (isLaminateStock(core, { MAT_TYPE: '1', MAT_NAME: 'GENERIC Laminate 0.8' })) {
	throw new Error('CORE stock must stay CORE even if material type is 1')
}

function sheetLabel(material, boardW, boardL) {
	return material + ' (' + boardW + 'x' + boardL + ')'
}
if (sheetLabel('GENERIC Laminate 0.8', 1220, 2440) !== 'GENERIC Laminate 0.8 (1220x2440)') {
	throw new Error('laminate sheet name must include board size')
}

console.log('core-vs-laminate ok')
