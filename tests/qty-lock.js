/* QTY LOCK contract — run: node tests/qty-lock.js */
'use strict'

function scaleNB(obj, factor) {
	if (!obj || !(factor > 0)) return false
	obj.variables = obj.variables || []
	var found = null
	for (var i = 0; i < obj.variables.length; i++) {
		if (obj.variables[i].alias === 'NB') { found = obj.variables[i]; break }
	}
	if (!found) return false
	var raw = found.__swcNb0 != null ? parseFloat(found.__swcNb0) : parseFloat(found.value)
	if (!(raw > 0)) return false
	found.__swcNb0 = raw
	found.value = String(raw * factor)
	return true
}

var part = { variables: [{ alias: 'NB', value: '3' }] }
if (!scaleNB(part, 2) || part.variables[0].value !== '6') throw new Error('first scale failed')
if (!scaleNB(part, 2) || part.variables[0].value !== '6') throw new Error('second scale stacked')
if (!scaleNB(part, 3) || part.variables[0].value !== '9') throw new Error('factor change should use original NB')

function orderQty(factoryNb, productQty, projectQty) {
	return factoryNb * (productQty || 1) * (projectQty || 1)
}
if (orderQty(3, 2, 1) !== 6) throw new Error('3 x product 2 x project 1')
if (orderQty(3, 2, 10) !== 60) throw new Error('3 x product 2 x project 10')
if (orderQty(1, 2, 1) !== 2) throw new Error('1 x product 2 x project 1')
function gmPlateSizes(L, W, T) {
	var a = [L, W, T].filter(function (n) { return n > 0 })
	a.sort(function (x, y) { return x - y })
	if (a.length === 3 && a[0] <= 25 && a[1] > 40 && a[2] > 40 && a[0] * 8 < a[1]) {
		return { cutL: a[2], cutW: a[1], thk: a[0] }
	}
	return { cutL: L, cutW: W, thk: T }
}
var g = gmPlateSizes(861, 374, 8)
if (g.cutL !== 861 || g.cutW !== 374 || g.thk !== 8) throw new Error('glass plate')
var m = gmPlateSizes(4, 522, 692)
if (m.cutL !== 692 || m.cutW !== 522 || m.thk !== 4) throw new Error('mirror plate')
console.log('qty-lock ok')
