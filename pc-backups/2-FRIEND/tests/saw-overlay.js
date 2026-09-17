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
;['INDEX', 'CUT_L', 'CUT_W', 'P.THK', 'Part Name'].forEach(function (h) {
	if (sc.SAW_OVERLAY_HEAD.indexOf(h) >= 0) throw new Error('old column still present: ' + h)
})
var need = [
	'CODE', 'MATERIAL SPECIFICATIONS', 'COMPONENT NAME',
	'HEIGHT', 'DEPTH', 'WIDTH', 'QTY',
	'THK', 'LENGTH', 'L1', 'W1', 'L2', 'W2', 'REMARKS',
]
need.forEach(function (h) {
	if (sc.SAW_OVERLAY_HEAD.indexOf(h) < 0) throw new Error('missing column ' + h)
})

function v(alias, value) { return { alias: alias, value: String(value) } }
var data = {
	materials: [{
		ID: 'MR20',
		variables: [
			v('BOARD_LENGTH', 2440), v('BOARD_WIDTH', 1220),
			v('MAT_NAME', 'MR#VNRF767#FAB#20MM'), v('MAT_T', 20), v('MAT_TYPE', 'Panel'),
			v('CATEGORY', 'Board'),
		],
	}],
	assemblies: [{
		ID: 'fr1',
		variables: [
			v('TOTYPE', 'FRAME'), v('NAME', 'GF LIVING TV UNIT-01'),
			v('FRAME_H', 250), v('FRAME_D', 355), v('FRAME_W', 600),
		],
		swcps: [{ name: 'Product Quantity', value: '1' }],
		parts: ['p1'],
		assemblies: [],
	}],
	panels: [{
		ID: 'p1', name: 'LH SIDE -EXPO',
		length: 250, width: 355,
		lengthWithoutEdgebands: 248, widthWithoutEdgebands: 353,
		variables: [
			v('PAN_LWOEB', 248), v('PAN_WWOEB', 353),
			v('PAN_L', 250), v('PAN_W', 355), v('NAME', 'LH SIDE -EXPO'),
			v('GROOVE', 'yes'),
		],
		edgebands: ['ebF', 'ebB', 'ebL', 'ebR'],
		swcps: [{ name: 'Description', value: 'LH SIDE -EXPO' }],
	}],
	parts: [{
		ID: 'pt1', panel: 'p1',
		variables: [v('NB', 1), v('NAME', 'LH SIDE -EXPO')],
		swcps: [{ name: 'ID', value: 'GF LIVING TV UNIT1-1' }],
	}],
	stocks: [{
		ID: 'st1', part: 'p1', material: 'MR20', quantity: 1,
		variables: [v('ST_L', 250), v('ST_W', 355), v('ST_T', 20), v('ST_N', 'CORE')],
	}],
	edgebandMaterials: [{
		ID: 'ebm1',
		variables: [
			v('EBMAT_N', '1X25-F767'), v('EBMAT_T', 1), v('EBMAT_H', 25),
			v('EBMAT_CODE', 'F767'),
		],
	}],
	edgebands: [
		{ ID: 'ebF', panel: 'p1', edgebandMaterial: 'ebm1', thickness: 1, variables: [v('EB_STOCKPOSITION', 'F')] },
		{ ID: 'ebB', panel: 'p1', edgebandMaterial: 'ebm1', thickness: 1, variables: [v('EB_STOCKPOSITION', 'B')] },
		{ ID: 'ebL', panel: 'p1', edgebandMaterial: 'ebm1', thickness: 1, variables: [v('EB_STOCKPOSITION', 'L')] },
		{ ID: 'ebR', panel: 'p1', edgebandMaterial: 'ebm1', thickness: 1, variables: [v('EB_STOCKPOSITION', 'R')] },
	],
	swcps: [],
}
var snap = JSON.stringify(data.parts[0].variables)
var rows = sc.collectSawMachineRows(data)
if (JSON.stringify(data.parts[0].variables) !== snap) {
	throw new Error('saw overlay must not rewrite part NB')
}
if (rows.length !== 1) throw new Error('expected one saw row, got ' + rows.length)
if (rows[0].code !== 'GF LIVING TV UNIT1-1') throw new Error('CODE from ID property, got ' + rows[0].code)
if (rows[0].material !== 'MR#VNRF767#FAB#20MM') throw new Error('MATERIAL SPECIFICATIONS, got ' + rows[0].material)
if (rows[0].name !== 'LH SIDE -EXPO') throw new Error('COMPONENT NAME')
if (rows[0].finalL !== 250 || rows[0].finalW !== 355) throw new Error('FINAL SIZE HEIGHT/DEPTH')
if (rows[0].cutL !== 248 || rows[0].cutW !== 353) throw new Error('CUTTING SIZE LENGTH/WIDTH')
if (rows[0].qty !== 1) throw new Error('qty from NB')
if (rows[0].thk !== 20) throw new Error('THK')
if (!rows[0].groove) throw new Error('GROOVE must land in WIDTH')
if (rows[0].l1 !== '1X25-F767' || rows[0].w1 !== '1X25-F767' ||
	rows[0].l2 !== '1X25-F767' || rows[0].w2 !== '1X25-F767') {
	throw new Error('L1/W1/L2/W2 edgeband codes, got ' + [rows[0].l1, rows[0].w1, rows[0].l2, rows[0].w2].join(','))
}

var fs = require('fs')
var src = fs.readFileSync(path.join(__dirname, '..', 'swood-client.js'), 'utf8')
if (src.indexOf('data-act="pdf"') < 0 || src.indexOf('data-act="xls"') < 0) {
	throw new Error('top-right Excel and PDF export must stay on overlay tables')
}
if (src.indexOf('data-act="print"') < 0) {
	throw new Error('Print must stay on the table title bar')
}
if (src.indexOf('applyToAllPages') < 0 || src.indexOf('scaleNB') < 0) {
	throw new Error('do not rewrite QTY LOCK')
}

var vs = require(path.join(__dirname, '..', 'view-settings.js'))
if (!vs.pages.some(function (p) { return p.id === 'saw-machine-data' && p.url === '/saw-machine-data' })) {
	throw new Error('Saw Machine Data must be declared in view-settings.js like Pattern List')
}
var defMenu = (vs.profiles || []).filter(function (pr) { return pr.id === 'default' })[0]
if (!defMenu || !(defMenu.menu || []).some(function (m) { return m.id === 'saw-machine-data' })) {
	throw new Error('Saw Machine Data menu must be in view-settings.js')
}
if (fs.existsSync(path.join(__dirname, '..', 'data-settings.js')) === false) {
	throw new Error('2-FRIEND must ship data-settings.js to load the client')
}
var htmlFiles = fs.readdirSync(path.join(__dirname, '..')).filter(function (n) { return /\.html$/i.test(n) })
if (htmlFiles.length) throw new Error('2-FRIEND must not ship HTML: ' + htmlFiles.join(','))

if (!global.SwoodClient || global.SwoodClient.config.sheetMetalPage !== false) {
	throw new Error('friend pack must turn Sheetmetal pages off')
}
if (vs.pages.some(function (p) { return /sheetmetal/i.test(String(p.id || '') + String(p.url || '')) })) {
	throw new Error('friend view-settings must not expose Sheetmetal pages')
}
;(vs.profiles || []).forEach(function (pr) {
	;(function walk(menu) {
		;(menu || []).forEach(function (m) {
			if (/sheetmetal/i.test(String(m.id || '') + String(m.to || ''))) {
				throw new Error('friend menu still has Sheetmetal: ' + (m.id || m.to))
			}
			walk(m.children)
		})
	})(pr.menu)
})
if (src.indexOf("['Sheetmetal'") < 0 || src.indexOf('mgmtSheetMetalTable') < 0) {
	throw new Error('Summary must keep the Sheetmetal section')
}

console.log('saw-overlay ok')
