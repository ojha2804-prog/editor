'use strict';

var assert = require('assert');
var client = require('../assets/js/sheetmetal-client.js');

var data = {
	swcps: [{ name: 'Project Quantity', value: '2' }],
	materials: [
		{ ID: 'mat-wood', variables: [{ alias: 'MAT_ISFORSAW', value: 'True' }, { alias: 'MAT_NAME', value: 'Oak' }] },
		{ ID: 'mat-steel', variables: [{ alias: 'MAT_ISFORSAW', value: 'False' }, { alias: 'MAT_NAME', value: 'Steel 1.5' }] }
	],
	panels: [
		{ ID: 'p-wood', name: 'Side' },
		{ ID: 'p-steel', name: 'Part4^Assem2' }
	],
	parts: [
		{ panel: 'p-wood', variables: [{ alias: 'NAME', value: 'Side' }, { alias: 'NB', value: '1' }] },
		{
			panel: 'p-steel',
			variables: [
				{ alias: 'NAME', value: 'Part4^Assem2' },
				{ alias: 'NB', value: '10' },
				{ alias: 'CONFIGURATION', value: 'Default' }
			]
		}
	],
	stocks: [
		{
			part: 'p-wood',
			material: 'mat-wood',
			quantity: 1,
			variables: [{ alias: 'ST_L', value: '800' }, { alias: 'ST_W', value: '400' }]
		},
		{
			part: 'p-steel',
			material: 'mat-steel',
			quantity: 10,
			variables: [{ alias: 'ST_L', value: '818.5' }, { alias: 'ST_W', value: '418.5' }]
		}
	]
};

var parts = client.collectSheetMetal(data);
assert.strictEqual(parts.length, 1, 'wood saw stock must be excluded');
assert.strictEqual(parts[0].name, 'Part4^Assem2');
assert.strictEqual(parts[0].config, 'Default');
assert.strictEqual(parts[0].L, 818.5);
assert.strictEqual(parts[0].W, 418.5);
assert.strictEqual(parts[0].qty, 20);
assert.strictEqual(parts[0].svg, 'images/sheetmetal/nest-Part4^Assem2_Default.svg');

assert.strictEqual(client.looksLikeSheetMetal(
	{ MAT_ISFORSAW: 'True' }, {}, {}
), false);
assert.strictEqual(client.looksLikeSheetMetal(
	{ MAT_ISFORSAW: 'False', MAT_NAME: 'Steel' }, {}, {}
), true);

console.log('sheetmetal-client.test.js: all assertions passed');
