/* Friend Saw Machine Data overlay — node pc-backups/2-FRIEND/tests/saw-overlay.js */
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
var sc = require(path.join(__dirname, '..', 'swood-client.js'))
if (typeof sc.collectSawMachineRows !== 'function') {
	throw new Error('2-FRIEND must export collectSawMachineRows')
}
if (!Array.isArray(sc.SAW_OVERLAY_HEAD) || sc.SAW_OVERLAY_HEAD.indexOf('VALSUR') >= 0) {
	throw new Error('Saw overlay must use the mentioned columns only')
}
var need = ['INDEX', 'Part Name', 'CUT_L', 'CUT_W', 'P.THK', 'Qty', 'Material']
need.forEach(function (h) {
	if (sc.SAW_OVERLAY_HEAD.indexOf(h) < 0) throw new Error('missing column ' + h)
})

function v(alias, value) { return { alias: alias, value: String(value) } }
var data = {
	materials: [{
		ID: 'BS18',
		variables: [
			v('BOARD_LENGTH', 2440), v('BOARD_WIDTH', 1220),
			v('MAT_NAME', '18MM BS'), v('MAT_T', 18), v('MAT_TYPE', 'Panel'),
			v('CATEGORY', 'Board'),
		],
	}],
	panels: [{
		ID: 'p1', name: 'Side',
		lengthWithoutEdgebands: 600, widthWithoutEdgebands: 400,
		variables: [v('PAN_LWOEB', 600), v('PAN_WWOEB', 400), v('NAME', 'Side')],
		swcps: [{ name: 'Description', value: 'Pantry side' }],
	}],
	parts: [{
		ID: 'pt1', panel: 'p1',
		variables: [v('NB', 2), v('NAME', 'Side')],
		swcps: [{ name: 'ID', value: 'SIDE-01' }],
	}],
	stocks: [{
		ID: 'st1', part: 'p1', material: 'BS18', quantity: 2,
		variables: [v('ST_L', 600), v('ST_W', 400), v('ST_T', 18), v('ST_N', 'CORE')],
	}],
	edgebands: [],
	edgebandMaterials: [],
	swcps: [],
}
var snap = JSON.stringify(data.parts[0].variables)
var rows = sc.collectSawMachineRows(data)
if (JSON.stringify(data.parts[0].variables) !== snap) {
	throw new Error('saw overlay must not rewrite part NB')
}
if (rows.length !== 1) throw new Error('expected one saw row, got ' + rows.length)
if (rows[0].index !== 'SIDE-01') throw new Error('INDEX from ID property')
if (rows[0].cutL !== 600 || rows[0].cutW !== 400) throw new Error('CUT_L / CUT_W')
if (rows[0].qty !== 2) throw new Error('qty from NB')
if (rows[0].material !== '18MM BS') throw new Error('material name')

var fs = require('fs')
var src = fs.readFileSync(path.join(__dirname, '..', 'swood-client.js'), 'utf8')
if (src.indexOf('data-act="pdf"') < 0 || src.indexOf('data-act="xls"') < 0) {
	throw new Error('top-right Excel and PDF export must stay on overlay tables')
}

console.log('saw-overlay ok')
