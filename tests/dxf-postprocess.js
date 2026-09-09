/* DXF POSTPROCESS contract — run: node tests/dxf-postprocess.js */
'use strict'
var fs = require('fs')
var path = require('path')

var vbs = fs.readFileSync(path.join(__dirname, '..', 'dat', 'apps', 'SheetMetalGeometry.vbs'), 'utf8')
var cfg = fs.readFileSync(path.join(__dirname, '..', 'dat', 'Report.cfg'), 'utf8')

function forbid(src, label, re, why) {
	if (re.test(src)) throw new Error(label + ': ' + why + '  matched ' + re)
}

forbid(vbs, 'VBS', /WScript\.Sleep/i, 'SWOOD blocks on POSTPROCESS — Sleep makes Generate stick after every DXF')
forbid(vbs, 'VBS', /WaitForDxfs/i, 'must not wait for later DXFs; the next file is not written until we exit')
forbid(vbs, 'VBS', /GetObject/i, 'must not attach to a running COM server')
forbid(vbs, 'VBS', /CreateObject\s*\(\s*"SldWorks/i, 'must not create SolidWorks')
forbid(vbs, 'VBS', /\.Run\b/i, 'must not shell-out (that is how the old VBS started launcher.exe)')
var live = vbs.split(/\r?\n/).filter(function (ln) { return !/^\s*'/.test(ln) }).join('\n')
forbid(live, 'VBS', /launcher\.exe/i, 'must not start the old launcher')
forbid(live, 'VBS', /SldWorks/i, 'must not attach to SOLIDWORKS')

if (vbs.indexOf('6.18.6-dxf-instant') < 0) throw new Error('VBS missing version stamp')
if (vbs.indexOf('will not attach to SOLIDWORKS') < 0) throw new Error('VBS missing no-SW log')
if (vbs.indexOf('SOLIDWORKS was not opened') < 0) throw new Error('VBS missing finished log')
if (vbs.indexOf('smpart-') < 0) throw new Error('VBS must read smpart DXFs')

var dxfBlock = cfg.split('[DXF_SHEETMETAL_PART]')[1] || ''
dxfBlock = dxfBlock.split('[')[0]
if (dxfBlock.indexOf('SheetMetalGeometry.vbs') < 0) throw new Error('Report.cfg POSTPROCESS must call SheetMetalGeometry.vbs')
if (/POSTPROCESS\s*=\s*.*launcher/i.test(dxfBlock)) throw new Error('Report.cfg must not start launcher.exe')
if (dxfBlock.indexOf('cscript.exe') < 0) throw new Error('Report.cfg POSTPROCESS must be cscript')

/* Parser: largest LWPOLYLINE is the outer blank (same rules as the VBS). */
function parseDxf(text) {
	var lines = text.replace(/\r/g, '').split('\n')
	var ent = '', xs = [], ys = [], rings = []
	for (var i = 0; i + 1 < lines.length; i += 2) {
		var code = String(lines[i]).trim()
		var val = lines[i + 1]
		if (code === '0') {
			if ((ent === 'LWPOLYLINE' || ent === 'POLYLINE') && xs.length) rings.push(xs.map(function (x, k) { return [x, ys[k]] }))
			ent = String(val).trim().toUpperCase()
			xs = []
			ys = []
		} else if (ent === 'LWPOLYLINE' || ent === 'POLYLINE') {
			if (code === '10') xs.push(parseFloat(String(val).replace(',', '.')))
			else if (code === '20') ys.push(parseFloat(String(val).replace(',', '.')))
		}
	}
	if ((ent === 'LWPOLYLINE' || ent === 'POLYLINE') && xs.length) rings.push(xs.map(function (x, k) { return [x, ys[k]] }))
	var best = null, area = -1
	rings.forEach(function (ring) {
		var a = 0
		for (var j = 0; j < ring.length; j++) {
			var n = ring[(j + 1) % ring.length]
			a += ring[j][0] * n[1] - n[0] * ring[j][1]
		}
		a = Math.abs(a) / 2
		if (a > area) { area = a; best = ring }
	})
	return best
}

var fixture = [
	'0', 'SECTION', '2', 'ENTITIES',
	'0', 'LWPOLYLINE',
	'10', '0', '20', '0',
	'10', '100', '20', '0',
	'10', '100', '20', '50',
	'10', '0', '20', '50',
	'0', 'LWPOLYLINE',
	'10', '10', '20', '10',
	'10', '20', '20', '10',
	'10', '20', '20', '20',
	'10', '10', '20', '20',
	'0', 'ENDSEC', '0', 'EOF', ''
].join('\n')
var outer = parseDxf(fixture)
if (!outer || outer.length !== 4) throw new Error('outer ring missing')
if (outer[2][0] !== 100 || outer[2][1] !== 50) throw new Error('largest polyline must win')

console.log('dxf-postprocess ok')
