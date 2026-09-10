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

if (vbs.indexOf('6.18.8-dxf-layout') < 0) throw new Error('VBS missing version stamp')
if (vbs.indexOf('will not attach to SOLIDWORKS') < 0) throw new Error('VBS missing no-SW log')
if (vbs.indexOf('SOLIDWORKS was not opened') < 0) throw new Error('VBS missing finished log')
if (vbs.indexOf('smpart-') < 0) throw new Error('VBS must read smpart DXFs')
if (vbs.indexOf('flat-') < 0) throw new Error('VBS must also read flat- DXFs')
if (vbs.indexOf('LINE') < 0) throw new Error('VBS must read LINE entities for SolidWorks DXFs')

var dxfBlock = cfg.split('[DXF_SHEETMETAL_PART]')[1] || ''
dxfBlock = dxfBlock.split('[')[0]
if (!/AUTOPROCESS\s*=\s*1/.test(dxfBlock)) throw new Error('DXF_SHEETMETAL_PART must stay ON (AUTOPROCESS = 1) for Layout')
if (!/^\s*POSTPROCESS\s*=/m.test(dxfBlock)) throw new Error('DXF_SHEETMETAL_PART POSTPROCESS must be active')
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

function parseLines(text) {
	var lines = text.replace(/\r/g, '').split('\n')
	var ent = '', segs = [], cur = {}
	for (var i = 0; i + 1 < lines.length; i += 2) {
		var code = String(lines[i]).trim()
		var val = lines[i + 1]
		if (code === '0') {
			if (ent === 'LINE' && cur.x1 != null && cur.y1 != null && cur.x2 != null && cur.y2 != null) {
				segs.push([cur.x1, cur.y1, cur.x2, cur.y2])
			}
			ent = String(val).trim().toUpperCase()
			cur = {}
		} else if (ent === 'LINE') {
			var n = parseFloat(String(val).replace(',', '.'))
			if (code === '10') cur.x1 = n
			else if (code === '20') cur.y1 = n
			else if (code === '11') cur.x2 = n
			else if (code === '21') cur.y2 = n
		}
	}
	if (ent === 'LINE' && cur.x1 != null) segs.push([cur.x1, cur.y1, cur.x2, cur.y2])
	var used = segs.map(function () { return false })
	function near(a, b) { return Math.abs(a[0] - b[0]) <= 0.05 && Math.abs(a[1] - b[1]) <= 0.05 }
	var pts = [[segs[0][0], segs[0][1]], [segs[0][2], segs[0][3]]]
	used[0] = true
	var grew = true
	while (grew) {
		grew = false
		for (var j = 0; j < segs.length; j++) {
			if (used[j]) continue
			var s = segs[j], a = [s[0], s[1]], b = [s[2], s[3]]
			var head = pts[0], tail = pts[pts.length - 1]
			if (near(tail, a)) { pts.push(b); used[j] = true; grew = true; break }
			if (near(tail, b)) { pts.push(a); used[j] = true; grew = true; break }
			if (near(head, a)) { pts.unshift(b); used[j] = true; grew = true; break }
			if (near(head, b)) { pts.unshift(a); used[j] = true; grew = true; break }
		}
	}
	return pts
}
var lineDxf = [
	'0', 'SECTION', '2', 'ENTITIES',
	'0', 'LINE', '10', '0', '20', '0', '11', '100', '21', '0',
	'0', 'LINE', '10', '100', '20', '0', '11', '100', '21', '50',
	'0', 'LINE', '10', '100', '20', '50', '11', '0', '21', '50',
	'0', 'LINE', '10', '0', '20', '50', '11', '0', '21', '0',
	'0', 'ENDSEC', '0', 'EOF', ''
].join('\n')
var chained = parseLines(lineDxf)
if (chained.length < 4) throw new Error('LINE chain too short')
var spanX = Math.max.apply(null, chained.map(function (p) { return p[0] })) -
	Math.min.apply(null, chained.map(function (p) { return p[0] }))
var spanY = Math.max.apply(null, chained.map(function (p) { return p[1] })) -
	Math.min.apply(null, chained.map(function (p) { return p[1] }))
if (spanX !== 100 || spanY !== 50) throw new Error('LINE chain must recover 100x50 blank')

console.log('dxf-postprocess ok')
