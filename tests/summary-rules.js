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
	var s = String(raw == null ? '' : raw).replace(/,/g, '')
	var m = s.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/)
	var n = m ? parseFloat(m[0]) : 0
	if (!(n > 0)) return 0
	if (n > 50) n = n / 1000
	return n
}

if (Math.abs(smReadDensityRaw('7850 kg/m^3') - 7.85) > 0.001) throw new Error('SW-MassDensity with units')
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
if (Math.abs(smSheetWeightKg(2500, 1250, 2, 7.85) - 49.0625) > 0.001) {
	throw new Error('library Density 7.85')
}
/* Name guess is NOT a SOLIDWORKS density. Blank until SW-MassDensity / MAT_DENSITY exists. */
function inventByName(name) {
	return 0
}
if (inventByName('Plain Carbon Steel') !== 0) throw new Error('must not invent density from the material name')
if (smSheetWeightKg(2500, 1250, 2, inventByName('Plain Carbon Steel')) !== 0) {
	throw new Error('weight stays blank without a real density')
}

console.log('summary-rules ok')
