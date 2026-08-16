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
assert.strictEqual(constNumber('NEST_ALLOW_ROTATION').toLowerCase(), String(nest.ALLOW_ROTATION));
assert.strictEqual(Number(constNumber('NEST_SHEET_COUNT')), nest.SHEETS.length);

var lengths = bas.match(/SheetLengths = Array\(([^)]+)\)/);
var widths = bas.match(/SheetWidths = Array\(([^)]+)\)/);
assert.ok(lengths && widths, 'missing SheetLengths/SheetWidths');
var L = lengths[1].split(',').map(function (s) { return Number(s.replace('#', '').trim()); });
var W = widths[1].split(',').map(function (s) { return Number(s.replace('#', '').trim()); });
assert.deepStrictEqual(L, nest.SHEETS.map(function (s) { return s.L; }));
assert.deepStrictEqual(W, nest.SHEETS.map(function (s) { return s.W; }));

var cs = fs.readFileSync(path.join(__dirname, '../addin/ExportFlatPatternDXF/Settings.cs'), 'utf8');
assert.ok(cs.indexOf('DefaultGap = 5') !== -1);
assert.ok(cs.indexOf('DefaultMargin = 10') !== -1);
assert.ok(cs.indexOf('L = 2500') !== -1 && cs.indexOf('W = 1250') !== -1);
assert.ok(cs.indexOf('L = 3000') !== -1 && cs.indexOf('W = 1500') !== -1);

var json = JSON.parse(fs.readFileSync(path.join(__dirname, '../addin/ExportFlatPatternDXF/ExportFlatPatternDXF.json'), 'utf8'));
assert.strictEqual(json.NestGapMm, nest.PART_GAP);
assert.strictEqual(json.NestMarginMm, nest.SHEET_MARGIN);
assert.deepStrictEqual(json.Sheets.map(function (s) { return s.L; }), L);
assert.deepStrictEqual(json.Sheets.map(function (s) { return s.W; }), W);

console.log('constants-sync.test.js: VBA, JS, and add-in stock settings match');
