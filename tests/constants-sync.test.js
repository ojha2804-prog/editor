'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var nest = require('../assets/js/sheetmetal-nest.js');

var bas = fs.readFileSync(path.join(__dirname, '../macros/ExportFlatPatternDXF.bas'), 'utf8');

function constNumber(name) {
	var m = bas.match(new RegExp('Const ' + name + ' As (?:Long|Double|Boolean) = ([^\\r\\n]+)'));
	assert.ok(m, 'missing VBA Const ' + name);
	return m[1].trim();
}

assert.strictEqual(Number(constNumber('NEST_GAP')), nest.PART_GAP);
assert.strictEqual(Number(constNumber('NEST_MARGIN')), nest.SHEET_MARGIN);
assert.strictEqual(constNumber('NEST_ALLOW_ROTATION'), String(nest.ALLOW_ROTATION));
assert.strictEqual(Number(constNumber('NEST_SHEET_COUNT')), nest.SHEETS.length);

var lengths = bas.match(/SheetLengths = Array\(([^)]+)\)/);
var widths = bas.match(/SheetWidths = Array\(([^)]+)\)/);
assert.ok(lengths && widths, 'missing SheetLengths/SheetWidths');
var L = lengths[1].split(',').map(function (s) { return Number(s.replace('#', '').trim()); });
var W = widths[1].split(',').map(function (s) { return Number(s.replace('#', '').trim()); });
assert.deepStrictEqual(L, nest.SHEETS.map(function (s) { return s.L; }));
assert.deepStrictEqual(W, nest.SHEETS.map(function (s) { return s.W; }));

console.log('constants-sync.test.js: VBA and JS stock settings match');
