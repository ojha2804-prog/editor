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
forbid(vbs, 'VBS', /WScript\.Sleep/i, 'SWOOD blocks on POSTPROCESS — Sleep makes Generate stick after every DXF')
forbid(vbs, 'VBS', /WaitForDxfs/i, 'must not wait for later DXFs; the next file is not written until we exit')
forbid(live, 'VBS', /CreateObject\s*\(\s*"SldWorks/i, 'must not start a new SolidWorks')
forbid(live, 'VBS', /\.Run\b/i, 'must not shell-out (that is how the old VBS started launcher.exe)')
forbid(live, 'VBS', /ExitApp/i, 'must not close SolidWorks')
forbid(live, 'VBS', /CloseDoc/i, 'must not close documents after export')
forbid(live, 'VBS', /ForceRebuild/i, 'must not rebuild the assembly')
forbid(live, 'VBS', /launcher\.exe/i, 'must not start the old launcher')
forbid(live, 'VBS', /MsgBox/i, 'must not pop dialogs during Generate')

if (vbs.indexOf('6.19.2-save-virtual') < 0) throw new Error('VBS missing version stamp')
if (vbs.indexOf('ImportMacroFolders') < 0) throw new Error('VBS must accept DXFs the macro already wrote')
if (vbs.indexOf('sheetmetal-dxf-folders.txt') < 0) throw new Error('VBS must read the folder list')
if (vbs.indexOf('ExportToDWG2') < 0) throw new Error('VBS must use the official ExportToDWG2 call')
if (vbs.indexOf('swExportActionBody') < 0) throw new Error('VBS must use action 3 like the shop macro')
if (vbs.indexOf('alignmentData') < 0) throw new Error('VBS must pass the 12-value alignment matrix')
if (vbs.indexOf('IsSheetMetal()') < 0) throw new Error('VBS must call IsSheetMetal() as a method')
if (vbs.indexOf('GetBodies2') < 0) throw new Error('VBS must read solid bodies like the shop macro')
if (vbs.indexOf('GetObject') < 0) throw new Error('VBS must attach to the running SolidWorks')
if (vbs.indexOf('LINE') < 0) throw new Error('VBS must read LINE entities for SolidWorks DXFs')
if (vbs.indexOf('_trigger') < 0) throw new Error('VBS must quarantine the folded Front view under _trigger')
if (vbs.indexOf('Export Flat Patterns.cmd') < 0) throw new Error('VBS must drop the one-click export helper')
if (vbs.indexOf('SavedModelPath') < 0) throw new Error('VBS must save virtual SWOOD parts before ExportToDWG2')

/* The report pass runs while SolidWorks is generating and rejects COM,
   so every SolidWorks call has to sit behind /exportall. */
var mainBody = live.split(/\nFunction ReadHandOff/)[0]
forbid(mainBody, 'VBS main', /GetObject\s*\(/, 'the POSTPROCESS pass must not touch SolidWorks COM')
forbid(mainBody, 'VBS main', /ExportToDWG2/, 'the POSTPROCESS pass must not export')
if (!/If exportAll Then ExportEverything/.test(mainBody)) {
	throw new Error('the assembly walk must only run in /exportall mode')
}
if (vbs.indexOf('/exportall') < 0) throw new Error('VBS must support the /exportall mode')
if (vbs.indexOf('OfficialWalk') < 0) throw new Error('/exportall must walk the assembly like the shop macro')
forbid(live, 'VBS', /ResolveAllLightWeightComponents/, 'assembly-wide resolve hangs SWOOD assemblies — do not call it')
forbid(live, 'VBS', /SetSuppression2/, 'must not resolve components — that hangs this assembly')
forbid(live, 'VBS', /OpenDoc6/, 'must not OpenDoc6 during export — that hangs this assembly')
if (vbs.indexOf('GetFirstDocument') < 0) throw new Error('/exportall must also export already-open parts')
if (vbs.indexOf('IsReportFolder') < 0) throw new Error('VBS must refuse DAT\\apps as the report folder')
if (vbs.indexOf('last-report.txt') < 0) throw new Error('VBS must remember the real report path')
if (vbs.indexOf('Sysnative') < 0) throw new Error('the helper .cmd must use 64-bit cscript')
if (vbs.indexOf('export-flat-patterns.txt') < 0) throw new Error('the helper .cmd must show a result file')
if (vbs.indexOf('CopySelfToReport') < 0) throw new Error('VBS must copy itself into the report folder')
if (vbs.indexOf('%~dp0SheetMetalGeometry.vbs') < 0) throw new Error('helper .cmd must run the VBS sitting in the report folder')
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
var bas = fs.readFileSync(path.join(__dirname, '..', 'dat', 'apps', 'ExportFlatPatterns.bas'), 'utf8')
if (bas.indexOf('ExportToDWG2') < 0) throw new Error('in-SolidWorks macro must call ExportToDWG2')
if (bas.indexOf('PartNameOf') < 0) throw new Error('macro must name virtual parts from GetTitle')
if (bas.indexOf('GetFirstDocument') < 0) throw new Error('macro must walk already-open parts')
if (bas.indexOf('SavedModelPath') < 0) throw new Error('macro must save virtual parts to disk')
if (bas.indexOf('6.19.2-save-virtual') < 0) throw new Error('macro version must be 6.19.2')

var dxfBlock = cfg.split('[DXF_SHEETMETAL_PART]')[1] || ''
dxfBlock = dxfBlock.split('[')[0]
if (!/AUTOPROCESS\s*=\s*1/.test(dxfBlock)) throw new Error('DXF_SHEETMETAL_PART must stay ON (AUTOPROCESS = 1) for Layout')
if (!/^\s*POSTPROCESS\s*=/m.test(dxfBlock)) throw new Error('DXF_SHEETMETAL_PART POSTPROCESS must be active')
if (dxfBlock.indexOf('SheetMetalGeometry.vbs') < 0) throw new Error('Report.cfg POSTPROCESS must call SheetMetalGeometry.vbs')
if (dxfBlock.indexOf('front-<NAME>') < 0) throw new Error('Report.cfg PATH must mark its DXF as the folded front view')
if (/PATH\s*=.*\\flat-/.test(dxfBlock)) throw new Error('a SWOOD Front view must never be named flat-')
if (/smpart-/.test(dxfBlock)) throw new Error('Report.cfg must not write smpart- Front-view files')
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
if (clientSrc.indexOf("version: '6.19.0'") < 0) throw new Error('client version must match this revision')

var folderList = fs.readFileSync(path.join(__dirname, '..', 'dat', 'apps', 'sheetmetal-dxf-folders.txt'), 'utf8')
if (!/^\s*;/m.test(folderList)) throw new Error('folder list template must be all comments by default')
if (/^\s*[A-Za-z]:\\/m.test(folderList)) throw new Error('folder list must not ship a real active path')

console.log('dxf-postprocess ok')
