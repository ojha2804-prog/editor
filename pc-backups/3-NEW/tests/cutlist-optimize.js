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

var mixed = sc.packPatternsFromPieces({
	materials: [{
		ID: 'M',
		variables: [
			{ alias: 'BOARD_LENGTH', value: '2440' },
			{ alias: 'BOARD_WIDTH', value: '1220' },
			{ alias: 'MAT_NAME', value: 'MIX' },
		],
	}],
	patterns: [],
}, [
	{ L: 800, W: 400, qty: 1, label: 'locked', material: 'M', materialName: 'MIX', thickness: 18, hasGrain: true, boardL: 2440, boardW: 1220 },
	{ L: 500, W: 300, qty: 1, label: 'free', material: 'M', materialName: 'MIX', thickness: 18, hasGrain: false, boardL: 2440, boardW: 1220 },
])
var lockedRot = false, freePlaced = false
;(mixed.patterns || []).forEach(function (p) {
	;(p.layout.rects || []).forEach(function (r) {
		if (r.type !== 'item' || !r.piece) return
		if (r.piece.label === 'locked' && r.rotated) lockedRot = true
		if (r.piece.label === 'free') freePlaced = true
	})
})
if (lockedRot) throw new Error('orientation matters is per piece, not the whole material')
if (!freePlaced) throw new Error('non-grain piece still packs')

if (typeof sc.packIntelliDivide !== 'function') {
	throw new Error('3-NEW must export packIntelliDivide')
}
var loose = []
pantry.forEach(function (p) {
	for (var i = 0; i < p.qty; i++) loose.push(p)
})
;['balanced', 'waste', 'time', 'handling'].forEach(function (goal) {
	var r = sc.packIntelliDivide(loose, 2440, 1220, 15, 5, goal)
	if ((r.unplaced || []).length) throw new Error('intelliDivide ' + goal + ' left unplaced')
	if (!(r.boards && r.boards.length)) throw new Error('intelliDivide ' + goal + ' needs a board')
})
var tailBoard = sc.packIntelliDivide([
	{ L: 2000, W: 400, hasGrain: false, label: 'rip' },
], 2440, 1220, 15, 5, 'waste')
var freeCount = ((tailBoard.boards[0] && tailBoard.boards[0].free) || []).length
if (freeCount < 2) throw new Error('Cutting must count strip-tail waste, free=' + freeCount)

if (typeof sc.packPatternsNesting !== 'function') {
	throw new Error('3-NEW must export packPatternsNesting')
}
var nested = sc.packPatternsNesting(data, pantry)
pantry.forEach(function (p, i) {
	var s = snapshot[i]
	if (p.L !== s.L || p.W !== s.W || p.qty !== s.qty || p.label !== s.label) {
		throw new Error('Nesting page must not modify panel data: ' + p.label)
	}
})
var nPlaced = 0
;(nested.patterns || []).forEach(function (p) {
	var q = p.quantity || 1
	;(p.layout.rects || []).forEach(function (r) {
		if (r.type === 'item') nPlaced += q
	})
})
if (nPlaced !== 13) throw new Error('Nesting CNC pack placed ' + nPlaced)
if (!nested.patterns.some(function (p) { return p.trueShape })) {
	throw new Error('Nesting page is true-shape CNC, not beam-saw strips')
}

var nestMixed = sc.packPatternsNesting({
	materials: [{
		ID: 'M',
		variables: [
			{ alias: 'BOARD_LENGTH', value: '2440' },
			{ alias: 'BOARD_WIDTH', value: '1220' },
			{ alias: 'MAT_NAME', value: 'MIX' },
		],
	}],
	patterns: [],
}, [
	{ L: 800, W: 400, qty: 1, label: 'locked', material: 'M', materialName: 'MIX', thickness: 18, hasGrain: true, boardL: 2440, boardW: 1220 },
	{ L: 500, W: 300, qty: 1, label: 'free', material: 'M', materialName: 'MIX', thickness: 18, hasGrain: false, boardL: 2440, boardW: 1220 },
])
var nestLockedRot = false, nestFreePlaced = false
;(nestMixed.patterns || []).forEach(function (p) {
	;(p.layout.rects || []).forEach(function (r) {
		if (r.type !== 'item' || !r.piece) return
		if (r.piece.label === 'locked' && r.rotated) nestLockedRot = true
		if (r.piece.label === 'free') nestFreePlaced = true
	})
})
if (nestLockedRot) throw new Error('Nesting grain lock is per piece')
if (!nestFreePlaced) throw new Error('Nesting still packs the non-grain piece')

var holeJob = [{
	L: 800, W: 600, qty: 1, label: 'frame', material: 'BS18', materialName: '18MM BS',
	thickness: 18, hasGrain: false, boardL: 2440, boardW: 1220,
	panel: {
		contour: [[0, 0], [800, 0], [800, 600], [0, 600]],
		holes: [[[200, 150], [500, 150], [500, 450], [200, 450]]],
	},
}]
var holeNest = sc.packPatternsNesting(data, holeJob)
var holeRect = null
;(holeNest.patterns || []).forEach(function (p) {
	;(p.layout.rects || []).forEach(function (r) {
		if (r.type === 'item' && r.piece && r.piece.label === 'frame') holeRect = r
	})
})
if (!holeRect || !holeRect.holes || !holeRect.holes.length) {
	throw new Error('Nesting CNC must keep cut-outs on the true outline')
}

var vs = require(path.join(__dirname, '..', 'view-settings.js'))
if (!vs || !Array.isArray(vs.pages)) throw new Error('3-NEW view-settings.js must export pages')
if (!vs.pages.some(function (p) { return p.id === 'pattern-detailed-list' })) {
	throw new Error('Pattern List must be declared in view-settings.js')
}
if (!vs.pages.some(function (p) { return p.id === 'pattern-nesting' && p.url === '/pattern-nesting' })) {
	throw new Error('Nesting must be declared in view-settings.js like Pattern List')
}
var defMenu = (vs.profiles || []).filter(function (pr) { return pr.id === 'default' })[0]
var patterns = defMenu && (defMenu.menu || []).filter(function (m) { return m.id === 'patterns' })[0]
if (!patterns || !(patterns.children || []).some(function (c) { return c.id === 'pattern-nesting' })) {
	throw new Error('Nesting menu must sit under Patterns in view-settings.js')
}
if (!fs.existsSync(path.join(__dirname, '..', 'data-settings.js'))) {
	throw new Error('3-NEW must ship data-settings.js to load the client')
}
var htmlFiles = fs.readdirSync(path.join(__dirname, '..')).filter(function (n) { return /\.html$/i.test(n) })
if (htmlFiles.length) throw new Error('3-NEW must not ship HTML: ' + htmlFiles.join(','))

console.log('cutlist-optimize ok')
