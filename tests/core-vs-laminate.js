/* Core vs laminate stocks — node tests/core-vs-laminate.js */
'use strict'

function vars(obj) {
	var m = {}
	;((obj && obj.variables) || []).forEach(function (v) { m[v.alias] = v.value })
	return m
}
function isLaminateStock(st, mv) {
	var sv = vars(st)
	var tag = String(sv.ST_N || sv.ST_DESC || '').toUpperCase()
	var id = String(st.ID || '').toUpperCase()
	if (/\.CORE$/.test(id) || tag === 'CORE') return false
	if (tag.indexOf('LAYER') === 0 || tag.indexOf('LAMINATE') >= 0 || tag.indexOf('VENEER') >= 0) return true
	if (/\.LAYER|\.LAMINATE|\.FACE|\.VEN/.test(id)) return true
	var cat = String((mv && (mv.CATEGORY || mv.MAT_CAT || mv.MAT_NAME)) || '').toUpperCase()
	if (/\bLAMINATE\b/.test(cat)) return true
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
console.log('core-vs-laminate ok')
