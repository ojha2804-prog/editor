/* Core vs laminate — SWOOD Materials library Material Type. node tests/core-vs-laminate.js */
'use strict'

function vars(obj) {
	var m = {}
	;((obj && obj.variables) || []).forEach(function (v) { m[v.alias] = v.value })
	return m
}
function matLibType(mv) {
	var raw = String((mv && (mv.MAT_TYPE || mv.MAT_SWOODTYPE)) || '').trim().toLowerCase()
	if (raw === '1' || raw.indexOf('laminate') >= 0) return 'laminate'
	if (raw.indexOf('veneer') >= 0) return 'veneer'
	if (raw.indexOf('compound') >= 0) return 'compound'
	if (raw === '0' || raw.indexOf('panel') >= 0) return 'panel'
	return ''
}
function swoodMatType(mv) {
	var k = matLibType(mv)
	if (k === 'laminate' || k === 'veneer') return 1
	var t = mv && (mv.MAT_TYPE != null ? mv.MAT_TYPE : mv.MAT_SWOODTYPE)
	var n = parseInt(t, 10)
	return isNaN(n) ? -1 : n
}
function stockThkMm(st, mv) {
	var sv = st ? vars(st) : {}
	return parseFloat(sv.ST_T) || parseFloat(mv && mv.MAT_T) || 0
}
function isLayerRole(st) {
	var sv = vars(st)
	var tag = String(sv.ST_N || sv.ST_DESC || '').toUpperCase()
	var id = String(st.ID || '').toUpperCase()
	if (/\.CORE$/.test(id) || tag === 'CORE') return false
	if (tag.indexOf('LAYER') === 0) return true
	if (tag.indexOf('LAMINATE') >= 0 || tag.indexOf('VENEER') >= 0) return true
	if (/\.LAYER|\.LAMINATE|\.FACE|\.VEN/.test(id)) return true
	return false
}
function isLaminateSkinName(mv, extra) {
	if (matLibType(mv) === 'laminate' || matLibType(mv) === 'veneer') return true
	var cat = String((mv && (mv.CATEGORY || mv.MAT_CAT || mv.MAT_NAME)) || extra || '').toUpperCase()
	return /\bLAMINATE\b|\bVENEER\b/.test(cat)
}
function isCoreStock(st, mv) {
	return stockPressedType(st, mv) === 'core'
}
function isLaminateMaterial(mv) {
	if (!mv) return false
	var kind = matLibType(mv)
	if (kind === 'laminate' || kind === 'veneer') return true
	if (kind === 'compound' || kind === 'panel') return false
	var t = parseFloat(mv.MAT_T) || 0
	if (t >= 6) return false
	if (swoodMatType(mv) === 1) return true
	return isLaminateSkinName(mv)
}
function isLaminateStock(st, mv) {
	return stockPressedType(st, mv) === 'laminate'
}
function isPostLamCompoundName(name, mv) {
	if (matLibType(mv) === 'compound') return true
	var n = String(name || (mv && mv.MAT_NAME) || '')
	if (/^PL[-_\s]?\d/i.test(n)) return true
	if (/post[\s-]*lam/i.test(n)) return true
	return false
}
function isSawBoardMaterial(mv, name) {
	if (String((mv && mv.GLASS) || '').toLowerCase() === 'true') return false
	if (String((mv && mv.MIRROR) || '').toLowerCase() === 'true') return false
	var kind = matLibType(mv)
	if (kind === 'laminate' || kind === 'veneer') return false
	if (kind === 'compound') return true
	if (kind === 'panel' && (parseFloat(mv && mv.BOARD_LENGTH) > 0 || mv.MAT_ISFORSAW === 'True' || parseFloat(mv && mv.MAT_T) >= 6)) return true
	if (isPostLamCompoundName(name, mv)) return true
	var t = parseFloat(mv && mv.MAT_T) || 0
	if (t >= 6 && parseFloat(mv && mv.BOARD_LENGTH) > 0) return true
	if (mv && mv.MAT_ISFORSAW === 'True' && t >= 6) return true
	return false
}

if (stockPressedType({ ID: 'x', variables: [{ alias: 'ST_N', value: 'Core' }] }, {}) !== 'core') {
	throw new Error('Pressed Type Core')
}
if (stockPressedType({ ID: 'x', variables: [{ alias: 'ST_N', value: 'Laminate' }] }, {}) !== 'laminate') {
	throw new Error('Pressed Type Laminate')
}
if (stockPressedType({ ID: 'x', variables: [{ alias: 'ST_N', value: 'Compound' }] }, {}) !== 'compound') {
	throw new Error('Pressed Type Compound')
}

function stockPressedType(st, mv) {
	var sv = vars(st)
	var tag = String(sv.ST_N || sv.ST_TYPE || sv.ST_DESC || '').trim().toUpperCase()
	var id = String((st && st.ID) || '').toUpperCase()
	if (tag === 'CORE' || /\.CORE$/.test(id)) return 'core'
	if (tag === 'COMPOUND' || tag.indexOf('COMPOUND') === 0) return 'compound'
	if (tag.indexOf('LAYER') === 0) return 'laminate'
	if (tag === 'LAMINATE' || tag.indexOf('LAMINATE') >= 0) return 'laminate'
	if (tag === 'VENEER' || tag.indexOf('VENEER') >= 0) return 'laminate'
	if (/\.LAYER|\.LAMINATE|\.FACE|\.VEN/.test(id)) return 'laminate'
	var kind = matLibType(mv)
	if (kind === 'laminate' || kind === 'veneer') return 'laminate'
	if (kind === 'compound') return 'compound'
	if (kind === 'panel') return 'core'
	if (stockThkMm(st, mv) >= 6) return 'core'
	return ''
}
if (matLibType({ MAT_TYPE: 'Compound' }) !== 'compound') throw new Error('Material Type Compound')
if (matLibType({ MAT_TYPE: 'Laminate' }) !== 'laminate') throw new Error('Material Type Laminate')
if (matLibType({ MAT_TYPE: 'Veneer' }) !== 'veneer') throw new Error('Material Type Veneer')

var core = { ID: 'p.CORE', variables: [{ alias: 'ST_N', value: 'CORE' }, { alias: 'ST_T', value: '16' }] }
var layer = { ID: 'p.LAYER1', variables: [{ alias: 'ST_N', value: 'LAYER1' }, { alias: 'ST_T', value: '0.8' }] }
var lamName = { ID: 'p.X', variables: [{ alias: 'ST_N', value: 'TOP' }, { alias: 'ST_T', value: '0.8' }] }
var mdfNoTag = { ID: 'guid-mdf', variables: [{ alias: 'ST_T', value: '16' }] }
var compound = { ID: 'p.CORE', variables: [{ alias: 'ST_N', value: 'CORE' }, { alias: 'ST_T', value: '17.6' }] }

if (isLaminateStock(core, { MAT_TYPE: 'Panel', MAT_NAME: 'RAW 16 MDF' })) throw new Error('CORE Panel must nest as board')
if (!isLaminateStock(layer, { MAT_TYPE: 'Laminate', MAT_NAME: 'GENERIC Laminate 0.8' })) throw new Error('LAYER Laminate')
if (!isLaminateStock(lamName, { MAT_TYPE: 'Veneer', MAT_NAME: 'Walnut veneer' })) throw new Error('Veneer goes with laminate')
if (isLaminateStock(mdfNoTag, { MAT_TYPE: 'Panel', MAT_NAME: 'MDF 16mm', MAT_T: 16, BOARD_LENGTH: 2440 })) {
	throw new Error('Panel MDF must not nest as laminate')
}
if (isLaminateStock(compound, { MAT_TYPE: 'Compound', MAT_NAME: 'PL-16MDF/22091', MAT_ISFORSAW: 'False' })) {
	throw new Error('Compound CORE must not go to Laminate/Veneer')
}
if (!isSawBoardMaterial({ MAT_TYPE: 'Compound', MAT_T: 17.6, BOARD_LENGTH: 2440 }, 'PL-16MDF/22091')) {
	throw new Error('Compound belongs on Boards')
}
if (!isSawBoardMaterial({ MAT_TYPE: 'Panel', MAT_T: 16, BOARD_LENGTH: 2440 }, 'MDF 16mm')) {
	throw new Error('Panel board belongs on Boards')
}
if (isSawBoardMaterial({ MAT_TYPE: 'Panel', GLASS: 'True', BOARD_LENGTH: 2440 }, 'GLASS')) {
	throw new Error('Glass Panel is not a saw board')
}
if (isLaminateMaterial({ MAT_TYPE: 'Panel', MAT_T: 16 })) throw new Error('Panel is not laminate material')
if (!isLaminateMaterial({ MAT_TYPE: 'Laminate', MAT_T: 0.8 })) throw new Error('Laminate type is laminate material')
if (!isPostLamCompoundName('PL-16MDF/22091', { MAT_TYPE: 'Compound' })) throw new Error('Compound name')

function keepLamSheet(r) {
	if (parseFloat(r.thickness) >= 6 || isPostLamCompoundName(r.name)) return false
	return true
}
if (keepLamSheet({ name: 'MDF 16mm (1220x2440)', thickness: 16 })) throw new Error('MDF out of Laminate/Veneer')
if (!keepLamSheet({ name: 'GENERIC Laminate 0.8 (1220x2440)', thickness: 0.8 })) throw new Error('LAM stays')

/* Compound Top (Pressed): Laminate + Core + Laminate — keep skins.
   Post-lam bought Compound board (no Core children) — skip skins. */
function skipNestedCompoundSkin(nested, compoundCount, coreCount) {
	if (!nested) return false
	if (compoundCount <= 0) return false
	return coreCount === 0
}
if (skipNestedCompoundSkin(true, 1, 2)) throw new Error('Compound Top with cores keeps laminate skins')
if (skipNestedCompoundSkin(true, 1, 1)) throw new Error('Compound Top laminate + MDF + laminate keeps skins')
if (!skipNestedCompoundSkin(true, 1, 0)) throw new Error('post-lam Compound board skips skins')
if (skipNestedCompoundSkin(false, 1, 0)) throw new Error('not nested: keep skins')
if (skipNestedCompoundSkin(true, 0, 0)) throw new Error('standalone laminate layer is a sheet')

console.log('core-vs-laminate ok')
