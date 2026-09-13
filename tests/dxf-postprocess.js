/* DXF POSTPROCESS contract — run: node tests/dxf-postprocess.js */
'use strict'
var fs = require('fs')
var path = require('path')

var vbs = fs.readFileSync(path.join(__dirname, '..', 'dat', 'apps', 'SheetMetalGeometry.vbs'), 'utf8')
var cfg = fs.readFileSync(path.join(__dirname, '..', 'dat', 'Report.cfg'), 'utf8')

function forbid(src, label, re, why) {
	if (re.test(src)) throw new Error(label + ': ' + why + '  matched ' + re)
}

var live = vbs.split(/\r?\n/).filter(function (ln) { return !/^\s*'/.test(ln) }).join('\n')
forbid(live, 'VBS', /WScript\.Sleep/i, 'SWOOD blocks on POSTPROCESS — Sleep makes Generate stick after every DXF')
forbid(live, 'VBS', /WaitForDxfs/i, 'must not wait for later DXFs; the next file is not written until we exit')
forbid(live, 'VBS', /CreateObject\s*\(\s*"SldWorks/i, 'must not start a new SolidWorks')
if (/sh\.Run\(/i.test(live) && live.indexOf('NestingWorks.exe') < 0) {
	throw new Error('VBS: sh.Run is only allowed for NestingWorks.exe')
}
forbid(live, 'VBS', /ExitApp/i, 'must not close SolidWorks')
forbid(live, 'VBS', /CloseAllDocuments/i, 'must not close the assembly')
forbid(live, 'VBS', /ForceRebuild/i, 'must not rebuild the assembly')
forbid(live, 'VBS', /launcher\.exe/i, 'must not start the old launcher')
forbid(live, 'VBS', /ResolveAllLightWeightComponents/, 'assembly-wide resolve hangs SWOOD assemblies — do not call it')
forbid(live, 'VBS', /SetSuppression2/, 'must not resolve components — that hangs this assembly')

if (vbs.indexOf('RunNestingWorks') < 0) throw new Error('VBS must run NestingWorks.exe after the VBA')
if (vbs.indexOf('AutoBackup') < 0) throw new Error('VBS must backup live files on the first POSTPROCESS')
if (vbs.indexOf('FreshGenerate') < 0) throw new Error('VBS must run the VBA again on a new Generate')
if (vbs.indexOf('sheetmetal-geometry.running') < 0) throw new Error('VBS must keep a per-report run lock')
if (vbs.indexOf('RunMacro') < 0) throw new Error('VBS must launch the VBA .swp with RunMacro')
if (vbs.indexOf('SheetMetalGeometry1') < 0) throw new Error('VBS must RunMacro module SheetMetalGeometry1')
if (vbs.indexOf('SheetMetalGeometry.swp') < 0) throw new Error('VBS must point at SheetMetalGeometry.swp')
if (vbs.indexOf('SHEETMETAL CUSTOM PROPERTY MACRO') < 0) throw new Error('VBS must use the live .swp folder')
if (vbs.indexOf('GetObject') < 0) throw new Error('VBS must attach to the running SolidWorks')
if (vbs.indexOf('CleanUpFrontDxf') < 0) throw new Error('VBS must delete folded front- views')
if (vbs.indexOf('front-') < 0) throw new Error('VBS must delete front- projections')

var helperCmd = fs.readFileSync(path.join(__dirname, '..', 'dat', 'apps', 'Export Flat Patterns.cmd'), 'utf8')
if (helperCmd.indexOf('%~dp0SheetMetalGeometry.vbs') < 0) throw new Error('portable .cmd must use the VBS beside it')
if (helperCmd.indexOf('%APPDATA%') >= 0) throw new Error('portable .cmd must not guess APPDATA')
if (helperCmd.indexOf('index.html') < 0) throw new Error('portable .cmd must require a report folder')
if (helperCmd.indexOf('C:\\Swood Reports\\2026_09\\Assem1') < 0) {
	throw new Error('portable .cmd must default to the real Assem1 report folder')
}
if (helperCmd.indexOf('D:\\SWOOD_LIBRARY 2026\\DATA\\DAT\\apps\\SheetMetalGeometry.vbs') < 0) {
	throw new Error('portable .cmd must know the live DAT VBS path')
}
if (helperCmd.indexOf('Sysnative') < 0) throw new Error('the helper .cmd must use 64-bit cscript')

var bas = fs.readFileSync(path.join(__dirname, '..', 'dat', 'apps', 'SheetMetalGeometry.bas'), 'utf8')
if (bas.indexOf('ExportFlatPatternView') < 0) throw new Error('macro must keep ExportFlatPatternView')
if (bas.indexOf('ExportToDWG2') < 0) throw new Error('macro must call ExportToDWG2')
if (bas.indexOf('HasFlatPattern') < 0) throw new Error('macro must detect Flat-Pattern features')
if (bas.indexOf('DoAssembly') < 0) throw new Error('macro must walk the assembly')
if (bas.indexOf('DoOpenAssemblies') < 0) throw new Error('shop macro walks every open assembly')
if (bas.indexOf('DoOpenParts') < 0) throw new Error('shop macro walks open parts')
if (bas.indexOf('SweepOpenDocs') < 0) throw new Error('shop macro sweeps open documents')
if (bas.indexOf('RetryActivated') < 0) throw new Error('shop macro retries in-context parts')
if (bas.indexOf('ExportDetached') < 0) throw new Error('macro may still SaveAs a copy of on-disk parts that fail export')
if (bas.indexOf('IsVirtualPart') < 0) throw new Error('macro must detect virtual / ^assembly parts')
if (bas.indexOf('SKIP virtual') < 0) throw new Error('virtual parts must be skipped, not exported')
if (bas.indexOf('virt:') < 0) throw new Error('macro must not treat every virtual part as the same assembly path')
if (bas.indexOf('SHOW_MESSAGE As Boolean = False') < 0) throw new Error('macro must stay silent during Generate')
if (bas.indexOf('sheetmetal-geometry.js') < 0) throw new Error('macro must write sheetmetal-geometry.js')
if (bas.indexOf('ELLIPSE') < 0) throw new Error('macro must read ELLIPSE cut-outs')
if (bas.indexOf('ReadSpline') < 0) throw new Error('macro must read SPLINE fit/control points')
if (bas.indexOf('Dim px(4000)') < 0) throw new Error('spline smoothing must use fixed arrays for SOLIDWORKS VBA')
if (/Dim xs\(\) As Double/.test(bas.split("' Spline")[1] || '')) {
	throw new Error('ReadSpline must not use a dynamic xs() array')
}
if (bas.indexOf('"CIRCLE"') < 0) throw new Error('macro must read CIRCLE cut-outs')
if (bas.indexOf('CreateMassProperty') < 0) throw new Error('macro must read SW-MassDensity via CreateMassProperty')
if (bas.indexOf('Function MassDensityKgM3') < 0) throw new Error('macro must expose MassDensityKgM3')
if (bas.indexOf('"density"') < 0) throw new Error('macro must write density into sheetmetal-geometry.js')



var dxfBlock = cfg.split('[DXF_SHEETMETAL_PART]')[1] || ''
dxfBlock = dxfBlock.split('[')[0]
if (!/AUTOPROCESS\s*=\s*1/.test(dxfBlock)) throw new Error('DXF_SHEETMETAL_PART must stay ON (AUTOPROCESS = 1) for Layout')
if (!/^\s*POSTPROCESS\s*=/m.test(dxfBlock)) throw new Error('DXF_SHEETMETAL_PART POSTPROCESS must be active')
if (dxfBlock.indexOf('SheetMetalGeometry.vbs') < 0) throw new Error('Report.cfg POSTPROCESS must call SheetMetalGeometry.vbs')
if (dxfBlock.indexOf('front-<NAME>') < 0) throw new Error('Report.cfg PATH must be the folded trigger front-')
if (/PATH\s*=.*\\flat-/.test(dxfBlock)) throw new Error('a SWOOD Front view must never be named flat-')
if (/POSTPROCESS\s*=\s*.*launcher/i.test(dxfBlock)) throw new Error('Report.cfg must not start launcher.exe')
if (dxfBlock.indexOf('cscript.exe') < 0) throw new Error('Report.cfg POSTPROCESS must be cscript')
if (cfg.indexOf('<SWCP.SM Density>') < 0) throw new Error('Report.cfg must capture SM Density custom property')
if (bas.indexOf('SM Density') < 0) throw new Error('macro must read SM Density custom property')

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

/* run the real implementation, so the test cannot drift from the client */
var clientSrc = fs.readFileSync(path.join(__dirname, '..', 'swood-client.js'), 'utf8')
var normSrc = clientSrc.match(/function smNormName\(s\) \{[\s\S]*?\n\t\}/)
if (!normSrc) throw new Error('smNormName not found in swood-client.js')
var smNormName = new Function(normSrc[0] + '; return smNormName')()
var a = smNormName('Copy of SHEET METAL_DOWN_CABINET_ONE_PROD_Assem1_1')
var b = smNormName('SHEET METAL_DOWN_CABINET_ONE_PROD_Assem1_1_Default')
if (a !== b) throw new Error('Layout name match must ignore Copy of / _Default')
var c = smNormName('SHEET METAL_DOWN_CABINET_ONE_PROD_Assem1_1_Mat-AISI304_Thick-1_Qty-8')
if (c !== b) throw new Error('Layout must match the shop macro filename pattern')

if (clientSrc.indexOf("all[k].folded") < 0) throw new Error('Layout must ignore folded Front views')
if (clientSrc.indexOf('Export Flat Patterns.cmd') < 0) throw new Error('Layout must say how to get the real unfold')
if (clientSrc.indexOf("version: '6.23.0'") < 0) throw new Error('client version must match this revision')
if (clientSrc.indexOf('db/nesting-works.js') < 0) throw new Error('Layout must load NestingWorks.exe output')
if (clientSrc.indexOf('function smThkGroup') < 0) throw new Error('Layout must group nests by thickness')
if (clientSrc.indexOf('function smPartRotations') < 0) throw new Error('grain vs rectangle vs free rotation must be separate')
if (clientSrc.indexOf('function smAlmostRect') < 0) throw new Error('rectangular blanks must stay 0/90')
if (clientSrc.indexOf('data-sm="rotate"') < 0) throw new Error('Layout toolbar must have Rotation On/Off')
if (clientSrc.indexOf('st.rotate === false ? [0]') < 0) throw new Error('Rotation Off must lock nest to 0 degrees')
if (clientSrc.indexOf('tryHole') < 0) throw new Error('Layout nest must try part-in-part')
if (clientSrc.indexOf('nestLookback: 99') < 0) throw new Error('nester must fill every open sheet before starting a new one')
if (clientSrc.indexOf('want.indexOf(kk)') >= 0) throw new Error('Layout must not reuse another part outline by substring')

var aVirt = smNormName('Part1^Study Table_Default')
if (aVirt !== smNormName('Part1')) throw new Error('virtual Part1^Assembly must match Part1')
if (smNormName('sheet metal _Real') === smNormName('SHEET METAL_DOWN_CABINET')) {
	throw new Error('real part name must not collapse onto other sheet metal names')
}

var nestCmd = fs.readFileSync(path.join(__dirname, '..', 'dat', 'apps', 'Run NestingWorks.cmd'), 'utf8')
if (nestCmd.indexOf('NestingWorks.exe') < 0) throw new Error('helper .cmd must run NestingWorks.exe')
if (!fs.existsSync(path.join(__dirname, '..', 'dat', 'apps', 'NestingWorks.exe'))) {
	throw new Error('NestingWorks.exe must be built for Windows')
}

var folderList = fs.readFileSync(path.join(__dirname, '..', 'dat', 'apps', 'sheetmetal-dxf-folders.txt'), 'utf8')
if (!/^\s*;/m.test(folderList)) throw new Error('folder list template must be all comments by default')
if (/^\s*[A-Za-z]:\\/m.test(folderList)) throw new Error('folder list must not ship a real active path')

console.log('dxf-postprocess ok')
