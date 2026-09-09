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
console.log('qty-lock ok')
