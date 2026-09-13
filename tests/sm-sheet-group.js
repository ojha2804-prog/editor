/* Unique Layout grouping — node tests/sm-sheet-group.js */
'use strict'

function smSheetSig(sh) {
	if (sh.legacy) {
		return 'L|' + (sh.row && sh.row.name) + '|' + sh.on
	}
	var bits = (sh.placed || []).map(function (p) {
		return String(p.row && p.row.name) + ':' +
			Math.round(p.x) + ',' + Math.round(p.y) + ',' +
			Math.round(p.w) + ',' + Math.round(p.h) + ',' +
			Math.round(p.deg || 0)
	})
	bits.sort()
	return (sh.key || '') + '|' + bits.join(';')
}
function smGroupSheets(sheets) {
	var seen = {}, seq = []
	sheets.forEach(function (sh) {
		var sig = smSheetSig(sh)
		if (seen[sig]) { seen[sig].quantity++; return }
		sh.quantity = 1
		seen[sig] = sh
		seq.push(sh)
	})
	return seq
}

var a = { key: 'steel', placed: [
	{ row: { name: 'Sheet Metal' }, x: 10, y: 10, w: 500, h: 1200, deg: 0 },
	{ row: { name: 'Sheet Metal' }, x: 520, y: 10, w: 500, h: 1200, deg: 0 },
]}
var b = { key: 'steel', placed: [
	{ row: { name: 'Sheet Metal' }, x: 520.4, y: 10.1, w: 500, h: 1200, deg: 0 },
	{ row: { name: 'Sheet Metal' }, x: 10.2, y: 10.3, w: 500, h: 1200, deg: 0 },
]}
var c = { key: 'steel', placed: [
	{ row: { name: 'Egg' }, x: 10, y: 10, w: 200, h: 200, deg: 0 },
]}
var g = smGroupSheets([a, b, b, c])
if (g.length !== 2) throw new Error('expected 2 unique patterns, got ' + g.length)
if (g[0].quantity !== 3) throw new Error('4-blank pattern should be ×3, got ' + g[0].quantity)
if (g[1].quantity !== 1) throw new Error('egg remainder stays ×1')
console.log('sm-sheet-group ok')
