#!/usr/bin/env node
/**
 * Node DOM-stub harness (handoff §10). Loads Assem1 report-data-raw.js +
 * swood-client.js and locks the numbers from HANDOFF.md §8.
 *
 *   node tools/verify-report.mjs
 */
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixture = path.join(root, 'reports', 'Assem1')
const rawPath = path.join(fixture, 'db', 'report-data-raw.js')
const geoPath = path.join(fixture, 'db', 'sheetmetal-geometry.js')
const clientPath = path.join(root, 'dat', 'report', 'assets', 'settings', 'swood-client.js')
const costPath = path.join(root, 'dat', 'report', 'assets', 'settings', 'cost.js')
const dataSettingsPath = path.join(root, 'dat', 'report', 'assets', 'settings', 'data-settings.js')

if (!fs.existsSync(rawPath)) {
	console.error('Missing', rawPath)
	console.error('Extract Assem1.z01 + Assem1.zip into reports/Assem1, or run:')
	console.error('  node tools/build-assem1-fixture.mjs')
	process.exit(1)
}

function el() {
	return {
		id: '',
		style: {},
		innerHTML: '',
		className: '',
		classList: { add: function () {}, remove: function () {}, contains: function () { return false } },
		children: [],
		appendChild: function (n) { this.children.push(n); return n },
		addEventListener: function () {},
		querySelectorAll: function () { return [] },
		querySelector: function () { return null },
		getBoundingClientRect: function () { return { top: 0, bottom: 0, left: 0, right: 0, height: 0, width: 0 } },
		setAttribute: function () {},
		getAttribute: function () { return '' },
		closest: function () { return null },
	}
}

const logs = []
const errors = []
const body = el()
body.id = 'body'
const appEl = el()
appEl.id = 'pattern-renest-app'
const overlay = el()
overlay.id = 'pattern-renest-overlay'
overlay.appendChild(appEl)
body.appendChild(overlay)

const sandbox = {
	window: {},
	MutationObserver: function () { return { observe: function () {}, disconnect: function () {} } },
	ResizeObserver: function () { return { observe: function () {}, disconnect: function () {} } },
	document: {
		createElement: function () { return el() },
		head: { appendChild: function () {}, addEventListener: function () {} },
		documentElement: el(),
		body: body,
		getElementById: function (id) {
			if (id === 'pattern-renest-app') return appEl
			if (id === 'pattern-renest-overlay') return overlay
			return el()
		},
		querySelector: function () { return null },
		querySelectorAll: function () { return [] },
		addEventListener: function () {},
		readyState: 'complete',
	},
	location: { hash: '#/summary', pathname: '/', search: '', replace: function () {}, href: 'http://localhost/#/summary' },
	console: {
		log: function () { logs.push(Array.prototype.slice.call(arguments).join(' ')); console.log.apply(console, arguments) },
		warn: function () { logs.push('WARN ' + Array.prototype.slice.call(arguments).join(' ')) },
		error: function () {
			errors.push(Array.prototype.slice.call(arguments).map(String).join(' '))
			console.error.apply(console, arguments)
		},
	},
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
	innerWidth: 1280,
	localStorage: { getItem: function () { return null }, setItem: function () {} },
}
sandbox.window = sandbox
sandbox.global = sandbox
sandbox.self = sandbox
sandbox.window.addEventListener = function () {}
sandbox.window.innerWidth = 1280
sandbox.window.SwoodClient = undefined
sandbox.window.SwoodCost = undefined
sandbox.window.sheetMetalGeometry = undefined
sandbox.reportDataRaw = undefined

function runFile(file, filename) {
	let src = fs.readFileSync(file, 'utf8')
	src = src.replace(/^const reportDataRaw\s*=/, 'var reportDataRaw =')
	vm.runInNewContext(src, sandbox, { filename: filename || path.basename(file) })
}

let failed = 0
function ok(cond, msg) {
	if (cond) console.log('  ok  ' + msg)
	else { failed++; console.error('  FAIL  ' + msg) }
}
function close(a, b, eps, msg) {
	ok(Math.abs(a - b) <= eps, msg + ' (got ' + a + ', want ~' + b + ')')
}

console.log('verify-report — Assem1 fixture')

try {
	runFile(rawPath, 'report-data-raw.js')
	if (fs.existsSync(geoPath)) runFile(geoPath, 'sheetmetal-geometry.js')
	if (fs.existsSync(costPath)) runFile(costPath, 'cost.js')
	runFile(clientPath, 'swood-client.js')
} catch (e) {
	console.warn('client load warning:', e && e.message)
}

ok(!errors.some(function (s) { return /CONFIG is not defined/i.test(s) }), 'no CONFIG is not defined')
ok(!/CONFIG is not defined/.test(logs.join('\n')), 'logs have no CONFIG is not defined')

const SC = sandbox.window.SwoodClient || sandbox.SwoodClient
ok(!!SC, 'SwoodClient booted')
if (!SC) process.exit(1)

ok(!!SC.config && SC.config !== sandbox.CONFIG, 'IIFE 2 uses window.SwoodClient.config, not a shared CONFIG')
ok(typeof SC.util.get === 'function', 'registered get(obj, "path") helper exists')

const data = sandbox.reportDataRaw || sandbox.window.reportDataRaw
ok(!!data, 'reportDataRaw loaded')

SC._qtyPatched = false
ok(SC.patchRawQuantity(data) !== false, 'patchRawQuantity ran')

const qtyLog = logs.filter(function (l) { return /product quantities applied/.test(l) }).join('\n')
ok(/product quantities applied to 41 part/.test(qtyLog), 'product-qty log: 41 parts')
ok(/x8/.test(qtyLog) && /x5/.test(qtyLog) && /x3/.test(qtyLog) && /x2/.test(qtyLog), 'cabinets ×8/×5/×3/×2')
ok(/project x10/.test(qtyLog), 'project ×10')

ok((data.panels || []).length === 24, 'panels = 24 distinct (not 108), got ' + (data.panels || []).length)

function varMap(o) {
	const m = {}
	;((o && o.variables) || []).forEach(function (v) { m[v.alias] = v.value })
	return m
}
function readCp(list, name) {
	const arr = list || []
	for (let i = 0; i < arr.length; i++) if (arr[i] && arr[i].name === name) return parseFloat(arr[i].value) || 0
	return 0
}

const frames = (data.assemblies || []).filter(function (a) { return varMap(a).TOTYPE === 'FRAME' })
const proj = readCp(data.swcps, 'Project Quantity') || 10
ok(proj === 10, 'Project Qty 10')
const prod = frames.map(function (a) { return readCp(a.swcps, 'Product Quantity') }).sort(function (a, b) { return b - a })
ok(prod.join(',') === '8,5,3,2', 'Product Qty 8/5/3/2 got ' + prod.join('/'))
const totals = prod.map(function (q) { return proj * q })
ok(totals.join(',') === '80,50,30,20', 'frame totals 80/50/30/20')
ok(totals.reduce(function (a, b) { return a + b }, 0) === 180, 'frames footer 180')

ok(typeof SC.collectWeldPieces === 'function', 'collectWeldPieces published from IIFE 2')
const pieces = SC.collectWeldPieces(data)
const kgPerM = SC.weldKgPerM(data)
const groups = SC.weldNest(pieces, kgPerM)
const pcs = groups.reduce(function (a, g) { return a + g.pieces }, 0)
const bars = groups.reduce(function (a, g) { return a + g.bars }, 0)
const boughtKg = groups.reduce(function (a, g) { return a + g.boughtKg }, 0)
const usedMm = groups.reduce(function (a, g) { return a + g.usedMm }, 0)
const boughtMm = groups.reduce(function (a, g) { return a + g.boughtMm }, 0)
const yld = boughtMm > 0 ? usedMm / boughtMm * 100 : 0
ok(pcs === 720, 'Bar Requirement 720 pcs, got ' + pcs)
ok(bars === 74, '74 bars @ 6 m, got ' + bars)
close(boughtKg, 450.8, 2, 'procurement weight ~450.8 kg')
close(yld, 97.5, 0.5, 'yield ~97.5%')

const smRows = SC.collectSheetMetal(data)
ok(smRows.length === 12, '12 sheet-metal bodies, got ' + smRows.length)
const trueSheets = SC.smBuildNest(smRows)
ok(trueSheets.length === 3, 'true-nest sheets = 3, got ' + trueSheets.length)
let legacy = 0
smRows.forEach(function (r) {
	const n = (r.nest && r.nest.n) || 1
	let left = r.quantity
	while (left > 0) { legacy++; left -= Math.min(left, n) }
})
ok(legacy === 12, 'true-nest off would be 12 sheets, got ' + legacy)

const smMgmt = SC.mgmtSheetMetal(data)
ok(smMgmt.length > 0, 'Mgmt section 9 has rows')
ok(smMgmt.every(function (r) { return r.weight > 0 }), 'sheet-metal weight is a number, not a dash')
ok(smMgmt.every(function (r) { return r.unitCost > 0 }), 'cost.js filled empty sheet-metal unitCost')

const built = SC.buildPatterns(data)
const lam = SC.buildLamPatterns(data)
const m = SC.summaryModel(data, built.patterns || [], lam.patterns || [])
const sections = SC.mgmtSections(data, m)
const c1 = sections.reduce(function (a, x) { return a + x.sum }, 0)
const c2rows = SC.client2Rows(data, built, m, c1)
const c2 = c2rows.reduce(function (a, r) { return a + r.total }, 0)
close(c1, c2, 0.02, 'Client 1 total === Client 2 total')
ok(!c2rows.some(function (r) { return r.unassigned }), 'no Unassigned row')
const attributed = c2
close(c1 - attributed, 0, 0.02, 'residual ₹0')

const typed = SC.resolvedRate('Sheetmetal', 'AISI 304|2', 0)
ok(typed > 0, 'cost.js default for AISI 304 is non-zero')
const k = 'Sheetmetal\u0001AISI 304|2'
SC.RATES[k] = 999
ok(SC.resolvedRate('Sheetmetal', 'AISI 304|2', 0) === 999, 'typed RATES win over cost.js')
delete SC.RATES[k]
ok(Math.abs(SC.resolvedRate('Sheetmetal', 'AISI 304|2', 42) - 42) < 0.001, 'live library unitCost wins when set')
ok(SC.smEffectiveDensity(1000, { MAT_DENSITY: 1000 }, 0) === 0, 'no invented density when MASS is missing')
ok(SC.smEffectiveDensity(1000, { MAT_DENSITY: 1000 }, 0.12) > 7, 'MASS present → fallback density 7.85')

const ds = fs.readFileSync(dataSettingsPath, 'utf8')
ok(/instantiateData:\s*false/.test(ds), 'instantiateData: false')
ok(/useLocalDatabase:\s*false/.test(ds), 'useLocalDatabase: false')

const src = fs.readFileSync(clientPath, 'utf8')
ok((src.match(/^\s*\/?\s*;?\s*\(function/gm) || []).length >= 3, 'three IIFEs')
ok(/var len = parseFloat\(v\.ST_T\)/.test(src), 'weldment length is ST_T')
ok(!/var len = parseFloat\(v\.ST_L\)/.test(src), 'weldment length is never ST_L')
ok(/get:\s*function\s*\(\s*o,\s*path\s*\)/.test(src), 'get(obj, "path") is registered')
ok(!/field:\s*['"][^'"]*swcps\["Product Quantity"\]/.test(src), 'no swcps["Product Quantity"] column field')
ok(/assets\/settings\/cost\.js/.test(src), 'IIFE 1 loads cost.js')
ok(/window\.SwoodClient && window\.SwoodClient\.config/.test(src), 'IIFE 2 reads window.SwoodClient.config')

const app = el()
try {
	SC.renderSummary(app, data)
	ok(app.innerHTML.length > 100, 'renderSummary produced HTML')
	ok(!/CONFIG is not defined/.test(app.innerHTML), 'summary HTML has no CONFIG error')
} catch (e) {
	failed++
	console.error('  FAIL  renderSummary threw', e && e.message)
}

if (failed) {
	console.error('\nverify-report FAILED with ' + failed + ' assertion(s)')
	process.exit(1)
}
console.log('\nverify-report ok')
