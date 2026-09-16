/* CutList Optimizer pack method — node pc-backups/3-NEW/tests/cutlist-optimize.js
   Loads the real 3-NEW client. Panel Length/Width/Qty/Material/Label stay as given. */
'use strict'

function stubBrowser() {
	var noop = function () {}
	var el = function () {
		return { style: {}, src: '', async: false, onerror: null, setAttribute: noop, appendChild: noop, addEventListener: noop }
	}
	if (!global.document) {
		global.document = {
			readyState: 'loading',
			head: { appendChild: noop },
			body: { appendChild: noop },
			addEventListener: noop,
			removeEventListener: noop,
			querySelector: function () { return null },
			querySelectorAll: function () { return [] },
			createElement: el,
			getElementById: function () { return null },
		}
	}
	if (!global.location) {
		global.location = { hash: '', pathname: '/', search: '', href: 'http://local/', replace: noop }
	}
	global.window = global
	if (!global.window.addEventListener) global.window.addEventListener = noop
}

stubBrowser()

var path = require('path')
var fs = require('fs')
var sc = require(path.join(__dirname, '..', 'swood-client.js'))
if (typeof sc.packPatternsFromPieces !== 'function') {
	throw new Error('3-NEW must export packPatternsFromPieces')
}

var pantry = [
	{ L: 600, W: 400, qty: 2, label: 'Jeffery', material: 'BS18', materialName: '18MM BS', thickness: 18, hasGrain: false, boardL: 2440, boardW: 1220 },
	{ L: 600, W: 400, qty: 5, label: 'Joshua', material: 'BS18', materialName: '18MM BS', thickness: 18, hasGrain: false, boardL: 2440, boardW: 1220 },
	{ L: 650, W: 400, qty: 2, label: 'Lottie', material: 'BS18', materialName: '18MM BS', thickness: 18, hasGrain: false, boardL: 2440, boardW: 1220 },
	{ L: 700, W: 400, qty: 1, label: 'Marion', material: 'BS18', materialName: '18MM BS', thickness: 18, hasGrain: false, boardL: 2440, boardW: 1220 },
	{ L: 800, W: 400, qty: 3, label: 'Aiden', material: 'BS18', materialName: '18MM BS', thickness: 18, hasGrain: false, boardL: 2440, boardW: 1220 },
]
var snapshot = pantry.map(function (p) {
	return { L: p.L, W: p.W, qty: p.qty, label: p.label, material: p.material, materialName: p.materialName }
})
var data = {
	materials: [{
		ID: 'BS18',
		variables: [
			{ alias: 'BOARD_LENGTH', value: '2440' },
			{ alias: 'BOARD_WIDTH', value: '1220' },
			{ alias: 'MAT_NAME', value: '18MM BS' },
		],
	}],
	/* NestingWorks positions must be ignored — pack method only, no data rewrite. */
	patterns: [{
		name: 'Pattern 1', length: 2440, width: 1220, quantity: 1,
		nestedPanels: [{ name: 'ignore-me', length: 100, width: 100, positionX: 0, positionY: 0 }],
	}],
}

var built = sc.packPatternsFromPieces(data, pantry)
if (built.cutlist) throw new Error('must not invent a new cutlist table')
pantry.forEach(function (p, i) {
	var s = snapshot[i]
	if (p.L !== s.L || p.W !== s.W || p.qty !== s.qty || p.label !== s.label ||
		p.material !== s.material || p.materialName !== s.materialName) {
		throw new Error('packer must not modify panel data: ' + p.label)
	}
})

var labels = {}
var placed = 0
;(built.patterns || []).forEach(function (p) {
	var q = p.quantity || 1
	;(p.layout.rects || []).forEach(function (r) {
		if (r.type !== 'item' || !r.piece) return
		placed += q
		var lab = r.piece.label
		labels[lab] = (labels[lab] || 0) + q
	})
})
if (placed !== 13) throw new Error('Qty expands for packing only, placed ' + placed)
if (labels.Joshua !== 5) throw new Error('Joshua qty 5 on nest')
if (labels.Aiden !== 3) throw new Error('Aiden qty 3 on nest')
if (built.unplaced && built.unplaced.length) throw new Error('unplaced: ' + built.unplaced.join('; '))
if (!built.patterns.length) throw new Error('need at least one sheet')

if (sc.useNativePatternList(data) !== false) {
	throw new Error('cutlist pack method must own Pattern List layout')
}

var grainPiece = [{
	L: 800, W: 400, qty: 1, label: 'grain', material: 'G', materialName: 'GRAIN',
	thickness: 18, hasGrain: true, boardL: 500, boardW: 900,
}]
var grainData = {
	materials: [{
		ID: 'G',
		variables: [
			{ alias: 'BOARD_LENGTH', value: '500' },
			{ alias: 'BOARD_WIDTH', value: '900' },
			{ alias: 'MAT_NAME', value: 'GRAIN' },
			{ alias: 'MAT_WITHGRAIN', value: 'True' },
		],
	}],
	patterns: [],
}
var grain = sc.packPatternsFromPieces(grainData, grainPiece)
if (!(grain.unplaced && grain.unplaced.length)) {
	var rotated = false
	;(grain.patterns || []).forEach(function (p) {
		;(p.layout.rects || []).forEach(function (r) {
			if (r.type === 'item' && r.rotated) rotated = true
		})
	})
	if (rotated) throw new Error('grain does not rotate 90')
	throw new Error('800x400 grain on 500x900 must not rotate to fit')
}

function esc(s) {
	return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function boardSvg(p) {
	var L = p.boardL, W = p.boardW, lay = p.layout
	var svg = '<svg viewBox="0 0 ' + L + ' ' + W + '" width="100%" preserveAspectRatio="xMidYMid meet">'
	svg += '<rect x="0" y="0" width="' + L + '" height="' + W + '" fill="#f4f1ea" stroke="#5a6a74" stroke-width="8"/>'
	;(lay.rects || []).forEach(function (r) {
		if (r.type === 'item') {
			var y = W - r.y - r.W
			svg += '<rect x="' + r.x + '" y="' + y + '" width="' + r.L + '" height="' + r.W +
				'" fill="#cfe6f5" stroke="#2b4c63" stroke-width="6"/>'
			svg += '<text x="' + (r.x + r.L / 2) + '" y="' + (y + r.W / 2 + 28) +
				'" font-size="48" text-anchor="middle" font-family="Arial" fill="#16202b">' +
				esc(r.label) + '</text>'
		} else if (r.type === 'waste') {
			var wy = W - r.y - r.W
			svg += '<rect x="' + r.x + '" y="' + wy + '" width="' + r.L + '" height="' + r.W +
				'" fill="#f3d6d6" stroke="#c9a0a0" stroke-width="2"/>'
		}
	})
	return svg + '</svg>'
}

var sheets = built.patterns.map(function (p) {
	var wastePc = p.layout.areaTotal ? p.layout.areaWaste * 100 / p.layout.areaTotal : 0
	return '<div class="sheet"><div class="head"><b>' + esc(p.name) + '</b> · ' + esc(p.material) +
		' · ' + p.quantity + ' board · ' + p.layout.nPanels + ' panels · waste ' +
		wastePc.toFixed(1) + '%</div>' + boardSvg(p) + '</div>'
}).join('')

var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>List of Nested Patterns</title>' +
	'<style>' +
	'body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#eef2f4;color:#1a242b}' +
	'main{padding:22px 28px 40px}' +
	'h1{margin:0 0 8px;font-size:28px}' +
	'.note{color:#4a5a63;margin:0 0 18px}' +
	'.sheet{background:#fff;margin:0 0 22px;padding:14px 16px 20px;box-shadow:0 1px 3px rgba(0,0,0,.08)}' +
	'.head{margin:0 0 12px;font-size:14px}' +
	'.sheet svg{max-height:360px}' +
	'</style></head><body>' +
	'<main><h1>List of Nested Patterns</h1>' +
	'<p class="note">Same panel data. Only the pack method changed (Cut List Optimizer guillotine, trim + kerf).</p>' +
	sheets + '</main></body></html>'

fs.writeFileSync(path.join(__dirname, '..', 'pattern-list-preview.html'), html)
console.log('cutlist-optimize ok')
