/* Summary density + boards/materials toggle — node tests/summary-rules.js */
'use strict'

function smNormDensity(n) {
	n = parseFloat(n) || 0
	if (!(n > 0)) return 0
	if (n > 50) n = n / 1000
	if (Math.abs(n - 1) < 0.001) return 0
	return n
}
function smReadDensityRaw(raw) {
	var n = parseFloat(String(raw == null ? '' : raw).replace(/,/g, ''))
	if (!(n > 0)) return 0
	if (n > 50) n = n / 1000
	return n
}

if (Math.abs(smReadDensityRaw('7850') - 7.85) > 0.001) throw new Error('kg/m3 Density CP')
if (Math.abs(smReadDensityRaw('7.85') - 7.85) > 0.001) throw new Error('g/cm3 Density CP')
if (smNormDensity(1000) !== 0) throw new Error('SW default 1000 is unset')
if (Math.abs(smNormDensity(7850) - 7.85) > 0.001) throw new Error('MAT_DENSITY kg/m3')

function pickSections(hasPatterns) {
	return {
		boards: hasPatterns,
		material: !hasPatterns,
	}
}
if (!pickSections(true).boards || pickSections(true).material) throw new Error('patterns: boards only')
if (pickSections(false).boards || !pickSections(false).material) throw new Error('no patterns: material only')

console.log('summary-rules ok')
