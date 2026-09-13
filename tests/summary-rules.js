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
function smSheetWeightKg(Lmm, Wmm, Tmm, densGcm3) {
	var d = smNormDensity(densGcm3)
	if (!(Lmm > 0) || !(Wmm > 0) || !(Tmm > 0) || !(d > 0)) return 0
	return (Lmm / 1000) * (Wmm / 1000) * Tmm * d
}

if (Math.abs(smSheetWeightKg(2500, 1250, 2, 7.86) - 49.125) > 0.001) {
	throw new Error('2.5 x 1.25 x 2 x 7.86')
}
if (smSheetWeightKg(2500, 1250, 2, 1) !== 0) throw new Error('ρ=1 (SW default) must not invent weight')
if (Math.abs(smSheetWeightKg(2500, 1250, 2, 7860) - 49.125) > 0.001) {
	throw new Error('7860 kg/m3 same as 7.86')
}

console.log('summary-rules ok')
