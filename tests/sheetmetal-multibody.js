/* Sheet-metal multibodies: one report row per Cut-List folder, like weldments.
   node tests/sheetmetal-multibody.js */
'use strict'

var fs = require('fs')
var path = require('path')
var vm = require('vm')

var src = fs.readFileSync(path.join(__dirname, '..', 'dat/report/assets/settings/swood-client.js'), 'utf8')
if (src.indexOf('function expandSheetMetalCutlistParts') < 0) {
	throw new Error('expandSheetMetalCutlistParts missing')
}
if (src.indexOf('function collectSheetMetal') < 0) {
	throw new Error('collectSheetMetal missing')
}

function el() {
	return {
		style: {},
		innerHTML: '',
		className: '',
		appendChild: function () {},
		addEventListener: function () {},
		querySelectorAll: function () { return [] },
		querySelector: function () { return null },
		getBoundingClientRect: function () { return { top: 0, bottom: 800, left: 0, right: 800 } },
		setAttribute: function () {},
		getAttribute: function () { return '' },
	}
}

var sandbox = {
	window: {},
	document: {
		createElement: function () { return el() },
		head: { appendChild: function () {} },
		body: el(),
		getElementById: function () { return el() },
		querySelector: function () { return null },
		querySelectorAll: function () { return [] },
		addEventListener: function () {},
		readyState: 'complete',
	},
	location: { hash: '#/', pathname: '/', search: '', replace: function () {} },
	console: console,
	setTimeout: function (fn) { if (typeof fn === 'function') try { fn() } catch (e) {} },
	clearTimeout: function () {},
	setInterval: function () { return 0 },
	clearInterval: function () {},
	Node: (function () {
		function Node() {}
		Node.prototype = {
			appendChild: function (n) { return n },
			insertBefore: function (n) { return n },
		}
		return Node
	})(),
	performance: { now: function () { return 0 } },
}
sandbox.window = sandbox
sandbox.global = sandbox
sandbox.self = sandbox
sandbox.window.addEventListener = function () {}
sandbox.window.SwoodClient = undefined
sandbox.reportDataRaw = undefined

try {
	vm.runInNewContext(src, sandbox, { filename: 'swood-client.js' })
} catch (e) {
	console.warn('client load warning:', e && e.message)
}

var SC = sandbox.window.SwoodClient || sandbox.SwoodClient
if (!SC) throw new Error('SwoodClient did not boot')
if (!SC.expandSheetMetalCutlistParts) throw new Error('expandSheetMetalCutlistParts not published')
if (!SC.collectSheetMetal) throw new Error('collectSheetMetal not published')

function V(alias, value) { return { alias: alias, value: String(value) } }

var part = {
	ID: 'p-sheetmetal',
	name: 'Sheetmetal',
	quantity: 1,
	variables: [
		V('NAME', 'Sheetmetal'),
		V('NB', '1'),
		V('SM_Thickness', '2'),
		V('SM_BlankLength', '10'),
		V('SM_BlankWidth', '10'),
		V('SM_BlankArea', '100'),
		V('SM_BBoxArea', '100'),
		V('SM_Material', 'LAST BODY ONLY'),
		V('SM_Cutlist', 'Sheet<3>'),
	],
}

function bodyVars(n, L, W) {
	return {
		variables: [
			V('SM_Cutlist', 'Sheet<' + n + '>'),
			V('SM_Thickness', '2'),
			V('SM_BlankLength', L),
			V('SM_BlankWidth', W),
			V('SM_BlankArea', L * W),
			V('SM_BBoxArea', L * W),
			V('SM_Material', 'Plain Carbon Steel'),
			V('SM_Gauge', 'Gauge <not specified>'),
			V('SM_Bends', '1'),
			V('SM_Mass', String(10 * n)),
			V('SM_Quantity', '1'),
			V('SM_Description', 'Sheet'),
		],
	}
}

var data = {
	swcps: [],
	assemblies: [],
	materials: [],
	parts: [part],
	stocks: [{
		ID: 'st-sm',
		part: 'p-sheetmetal',
		multiBodyStockVariables: [
			bodyVars(1, 176.78, 54.29),
			bodyVars(2, 120, 40),
			bodyVars(3, 90, 30),
		],
	}],
}

SC.expandSheetMetalCutlistParts(data)
var expanded = (data.parts || []).filter(function (p) {
	return (parseFloat((p.variables.filter(function (x) { return x.alias === 'SM_Thickness' })[0] || {}).value) || 0) > 0
})
if (expanded.length < 3) {
	throw new Error('native parts must expand to 3 Sheet<n> rows, got ' + expanded.length)
}
var names = expanded.map(function (p) { return p.name || '' }).join(' | ')
if (names.indexOf('Sheet<1>') < 0 || names.indexOf('Sheet<2>') < 0 || names.indexOf('Sheet<3>') < 0) {
	throw new Error('expanded part names must keep Sheet<1>/<2>/<3>, got ' + names)
}

var rows = SC.collectSheetMetal(data)
if (rows.length < 3) {
	throw new Error('collectSheetMetal must list every body, got ' + rows.length)
}
var cuts = rows.map(function (r) { return r.cutlist || (r.variables && r.variables.SM_Cutlist) || '' })
;['Sheet<1>', 'Sheet<2>', 'Sheet<3>'].forEach(function (cl) {
	if (cuts.indexOf(cl) < 0) throw new Error('missing cut-list ' + cl + ' in ' + JSON.stringify(cuts))
})
var lengths = rows.map(function (r) { return Number(r.length) }).sort(function (a, b) { return a - b })
if (lengths[0] === lengths[2]) {
	throw new Error('bodies must keep their own blank sizes, not the last designed body')
}

sandbox.window.sheetMetalCutlists = {
	SheetmetalSolo: [
		{ name: 'Sheet<1>', thickness: 2, length: 50, width: 20, blankArea: 1000, bboxArea: 1000, material: 'Steel', geomKey: 'SheetmetalSolo_Sheet<1>' },
		{ name: 'Sheet<2>', thickness: 2, length: 80, width: 25, blankArea: 2000, bboxArea: 2000, material: 'Steel', geomKey: 'SheetmetalSolo_Sheet<2>' },
	],
}
var solo = {
	swcps: [],
	assemblies: [],
	materials: [],
	parts: [{
		ID: 'p-solo',
		name: 'SheetmetalSolo',
		variables: [
			V('NAME', 'SheetmetalSolo'),
			V('NB', '1'),
			V('SM_Thickness', '2'),
			V('SM_BlankLength', '80'),
			V('SM_BlankWidth', '25'),
			V('SM_BlankArea', '2000'),
			V('SM_BBoxArea', '2000'),
			V('SM_Material', 'Steel'),
		],
	}],
	stocks: [],
}
var soloRows = SC.collectSheetMetal(solo)
if (soloRows.length < 2) {
	throw new Error('geometry cut-lists must expand a part with no stocks, got ' + soloRows.length)
}

var qty = src
if (qty.indexOf('applyToAllPages: true') < 0) throw new Error('must not rewrite QTY LOCK')
if (qty.indexOf('never fall back to the part-level outline') < 0) {
	throw new Error('must not reuse one part DXF/outline for every Sheet<n> body')
}
if (qty.indexOf('SC.partOrderQty') < 0 && qty.indexOf('partOrderQty') < 0) throw new Error('partOrderQty must stay')

console.log('sheetmetal-multibody ok')
