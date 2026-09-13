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
	var cat = String((mv && (mv.CATEGORY || mv.MAT_CAT || mv.MAT_NAME)) || extra || '').toUpperCase()
	return /\bLAMINATE\b|\bVENEER\b/.test(cat)
}
function isCoreStock(st, mv) {
	var sv = vars(st)
	var tag = String(sv.ST_N || sv.ST_DESC || '').toUpperCase()
	var id = String(st.ID || '').toUpperCase()
	if (/\.CORE$/.test(id) || tag === 'CORE') return true
	if (isLayerRole(st)) return false
	return stockThkMm(st, mv) >= 6
}
function isLaminateMaterial(mv) {
	if (!mv) return false
	var t = parseFloat(mv.MAT_T) || 0
	if (t >= 6) return false
	if (swoodMatType(mv) === 1) return true
	return isLaminateSkinName(mv)
}
function isLaminateStock(st, mv) {
	if (isCoreStock(st, mv)) return false
	if (isLayerRole(st)) return true
	var t = stockThkMm(st, mv)
	if (t >= 6) return false
	if (mv && mv.MAT_ISFORSAW === 'True') return false
	if (swoodMatType(mv) === 1 && t > 0 && t < 6) return true
	if (isLaminateSkinName(mv) && t < 6) return true
	return false
}
function isPostLamCompoundName(name, mv) {
	var n = String(name || (mv && mv.MAT_NAME) || '')
	if (/^PL[-_\s]?\d/i.test(n)) return true
	if (/post[\s-]*lam/i.test(n)) return true
	return false
}
function isSawBoardMaterial(mv, name) {
	if (isPostLamCompoundName(name, mv)) return true
	var t = parseFloat(mv && mv.MAT_T) || 0
	if (t >= 6 && parseFloat(mv && mv.BOARD_LENGTH) > 0) return true
	if (mv && mv.MAT_ISFORSAW === 'True' && t >= 6) return true
	return false
}

var core = { ID: 'p.CORE', variables: [{ alias: 'ST_N', value: 'CORE' }, { alias: 'ST_T', value: '16' }] }
var layer = { ID: 'p.LAYER1', variables: [{ alias: 'ST_N', value: 'LAYER1' }, { alias: 'ST_T', value: '0.8' }] }
var lamName = { ID: 'p.X', variables: [{ alias: 'ST_N', value: 'TOP' }, { alias: 'ST_T', value: '0.8' }] }
var mdfNoTag = { ID: 'guid-mdf', variables: [{ alias: 'ST_T', value: '16' }] }
var compound = { ID: 'p.CORE', variables: [{ alias: 'ST_N', value: 'CORE' }, { alias: 'ST_T', value: '17.6' }] }

if (isLaminateStock(core, { MAT_NAME: 'RAW 16 MDF' })) throw new Error('CORE must nest')
if (!isLaminateStock(layer, { MAT_NAME: 'GENERIC Laminate 0.8' })) throw new Error('LAYER1 is laminate')
if (!isLaminateStock(lamName, { MAT_NAME: 'GENERIC Laminate 0.8', CATEGORY: 'LAMINATE' })) {
	throw new Error('LAMINATE category is laminate')
}
if (!isLaminateMaterial({ MAT_TYPE: '1', MAT_NAME: 'GENERIC Laminate 0.8' })) {
	throw new Error('thin MAT_TYPE 1 is laminate')
}
if (isLaminateMaterial({ MAT_TYPE: '0', MAT_NAME: 'RAW 16 MDF', MAT_T: 16 })) {
	throw new Error('MAT_TYPE 0 CORE is not laminate')
}
if (isLaminateStock(core, { MAT_TYPE: '1', MAT_NAME: 'GENERIC Laminate 0.8' })) {
	throw new Error('CORE stock must stay CORE even if material type is 1')
}
if (isLaminateStock(mdfNoTag, { MAT_TYPE: '1', MAT_NAME: 'MDF 16mm', MAT_T: 16, BOARD_LENGTH: 2440, BOARD_WIDTH: 1220 })) {
	throw new Error('16 mm MDF must not nest as laminate (Study Table bug)')
}
if (isLaminateMaterial({ MAT_TYPE: '1', MAT_T: 16, MAT_NAME: 'MDF 16mm' })) {
	throw new Error('16 mm MDF STOCK must not be treated as laminate material')
}
if (!isPostLamCompoundName('PL-16MDF/22091')) throw new Error('PL-16MDF is post-lam compound')
if (!isSawBoardMaterial({ MAT_T: 17.6, BOARD_LENGTH: 2440 }, 'PL-16MDF/22091')) {
	throw new Error('compound belongs on Boards not Material')
}
if (!isSawBoardMaterial({ MAT_T: 16, BOARD_LENGTH: 2440, BOARD_WIDTH: 1220 }, 'MDF 16mm')) {
	throw new Error('MDF 16mm belongs on Boards')
}
if (isLaminateStock(compound, { MAT_NAME: 'PL-16MDF/22091', MAT_T: 17.6, MAT_ISFORSAW: 'False' })) {
	throw new Error('post-lam CORE must not go to Laminates')
}
if (!isCoreStock(compound, { MAT_T: 17.6, MAT_ISFORSAW: 'False' })) {
	throw new Error('post-lam CORE still nests when MAT_ISFORSAW is False')
}

function sheetLabel(material, boardW, boardL) {
	return material + ' (' + boardW + 'x' + boardL + ')'
}
if (sheetLabel('GENERIC Laminate 0.8', 1220, 2440) !== 'GENERIC Laminate 0.8 (1220x2440)') {
	throw new Error('laminate sheet name must include board size')
}

function keepLamSheet(r) {
	if (parseFloat(r.thickness) >= 6 || isPostLamCompoundName(r.name)) return false
	return true
}
if (keepLamSheet({ name: 'MDF 16mm (1220x2440)', thickness: 16 })) {
	throw new Error('MDF sheet row must be stripped from Laminates')
}
if (!keepLamSheet({ name: 'GENERIC Laminate 0.8 (1220x2440)', thickness: 0.8 })) {
	throw new Error('GENERIC LAM sheet row must stay in Laminates')
}

console.log('core-vs-laminate ok')
