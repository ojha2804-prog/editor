'use strict';

var assert = require('assert');
var nest = require('../assets/js/sheetmetal-nest.js');

// Worked example from ExportFlatPatternDXF.bas:
//   818.5 x 418.5 blank, 20 off
//   2500 x 1250 ->  6 per sheet -> 4 sheets -> 12.50 m2   <- cheaper
//   3000 x 1500 ->  9 per sheet -> 3 sheets -> 13.50 m2
var BLANK_L = 818.5;
var BLANK_W = 418.5;
var QTY = 20;

var small = nest.pickSheet(BLANK_L, BLANK_W, { sheets: [{ L: 2500, W: 1250 }] });
assert.ok(small, '818.5 x 418.5 must fit 2500 x 1250');
assert.strictEqual(small.perSheet, 6);
assert.strictEqual(nest.sheetsNeeded(QTY, small.perSheet), 4);
assert.strictEqual(nest.stockAreaM2(2500, 1250, 4), 12.5);

var large = nest.pickSheet(BLANK_L, BLANK_W, { sheets: [{ L: 3000, W: 1500 }] });
assert.ok(large, '818.5 x 418.5 must fit 3000 x 1500');
assert.strictEqual(large.perSheet, 9);
assert.strictEqual(nest.sheetsNeeded(QTY, large.perSheet), 3);
assert.strictEqual(nest.stockAreaM2(3000, 1500, 3), 13.5);

// Area-per-blank (what the DXF SVG uses, with no job quantity) prefers the
// bigger sheet: 3000x1500 / 9 < 2500x1250 / 6.
var perBlank = nest.pickSheet(BLANK_L, BLANK_W);
assert.ok(perBlank);
assert.strictEqual(perBlank.L, 3000);
assert.strictEqual(perBlank.perSheet, 9);

// With 20 off, leftover on the last sheet flips the answer.
var job = nest.pickSheetForJob(BLANK_L, BLANK_W, QTY);
assert.ok(job);
assert.strictEqual(job.L, 2500);
assert.strictEqual(job.W, 1250);
assert.strictEqual(job.perSheet, 6);
assert.strictEqual(job.needed, 4);
assert.strictEqual(job.boughtM2, 12.5);
assert.strictEqual(job.rotated, false);

var nine = nest.pickSheetForJob(BLANK_L, BLANK_W, 9);
assert.ok(nine);
assert.strictEqual(nine.L, 3000);
assert.strictEqual(nine.needed, 1);

// Gap sits BETWEEN blanks only: n*size + (n-1)*gap <= avail
assert.strictEqual(nest.safeDiv(100, 50, 10), 1); // 50 fits; 50+10+50 = 110 does not
assert.strictEqual(nest.safeDiv(110, 50, 10), 2);
assert.strictEqual(nest.safeDiv(0, 50, 10), 0);
assert.strictEqual(nest.safeDiv(100, 0, 10), 0);

// Rotation off must not swap axes even when that would pack more.
var tall = nest.pickSheet(800, 100, {
	sheets: [{ L: 250, W: 900 }],
	allowRotation: false
});
assert.ok(!tall, '800 x 100 cannot fit 250 x 900 without rotation');

var tallRot = nest.pickSheet(800, 100, {
	sheets: [{ L: 250, W: 900 }],
	allowRotation: true
});
assert.ok(tallRot);
assert.strictEqual(tallRot.rotated, true);
assert.ok(tallRot.perSheet >= 1);

assert.strictEqual(nest.safeFileName('Part4^Assem2'), 'Part4^Assem2');
assert.strictEqual(nest.safeFileName('A/B:C'), 'A-B-C');
assert.strictEqual(nest.nestFileName('Part4^Assem2', 'Default'), 'nest-Part4^Assem2_Default.svg');

// Constants must stay aligned with the VBA header.
assert.strictEqual(nest.PART_GAP, 5);
assert.strictEqual(nest.SHEET_MARGIN, 10);
assert.strictEqual(nest.SHEETS.length, 2);
assert.deepStrictEqual(nest.SHEETS[0], { L: 2500, W: 1250 });
assert.deepStrictEqual(nest.SHEETS[1], { L: 3000, W: 1500 });

console.log('sheetmetal-nest.test.js: all assertions passed');
