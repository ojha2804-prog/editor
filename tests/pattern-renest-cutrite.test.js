'use strict';

var nest = require('../assets/js/pattern-renest-client.js');

function piece(L, W, label) {
	return { L: L, W: W, label: label || 'p' };
}

function assert(cond, msg) {
	if (!cond) throw new Error(msg);
}

function noOverlap(placements) {
	for (var i = 0; i < placements.length; i++) {
		for (var j = i + 1; j < placements.length; j++) {
			var a = placements[i], b = placements[j];
			var hit = a.x < b.x + b.L - 0.01 && a.x + a.L > b.x + 0.01 &&
				a.y < b.y + b.W - 0.01 && a.y + a.W > b.y + 0.01;
			if (hit) return false;
		}
	}
	return true;
}

function insideBoard(placements, boardL, boardW, trim) {
	return placements.every(function (pl) {
		return pl.x >= trim - 0.01 && pl.y >= trim - 0.01 &&
			pl.x + pl.L <= boardL - trim + 0.01 &&
			pl.y + pl.W <= boardW - trim + 0.01;
	});
}

// Type 1: same-height parts form one rip strip, then cross-cuts.
(function stripsSameHeight() {
	var q = [];
	for (var i = 0; i < 4; i++) q.push(piece(400, 200, 'A' + i));
	var pack = nest.fillStripsLocal(q.slice(), 1600, 200, 0, false, 0);
	assert(pack.placements.length === 4, 'expected 4 parts in one strip, got ' + pack.placements.length);
	pack.placements.forEach(function (pl) {
		assert(Math.abs(pl.y) < 0.01, 'strip parts should share y=0');
		assert(Math.abs(pl.W - 200) < 0.01, 'strip height should be 200');
	});
})();

// Recut: leftover at the end of a strip takes a different part.
(function recutInStripOffcut() {
	var q = [piece(700, 300, 'wide'), piece(250, 300, 'tail')];
	var pack = nest.fillStripsLocal(q.slice(), 1000, 300, 0, false, 0);
	assert(pack.placements.length === 2, 'recut should place both parts, got ' + pack.placements.length);
	assert(noOverlap(pack.placements), 'recut placements overlap');
})();

// Recut: leftover of a strip takes a part with a different height (3rd stage).
(function recutDifferentHeight() {
	var q = [piece(700, 300, 'wide'), piece(280, 250, 'recut')];
	var pack = nest.fillStripsLocal(q.slice(), 1000, 300, 0, false, 0);
	assert(pack.placements.length === 2, 'strip leftover recut should place the smaller part, got ' + pack.placements.length);
	var small = pack.placements.filter(function (pl) { return pl.piece.label === 'recut'; })[0];
	assert(small && small.x >= 699.9, 'recut part should sit in the strip leftover');
})();

// Head cut: a first through-cut, then independent rips in each section.
(function headCutPlacesBothGroups() {
	var q = [
		piece(400, 500, 'H1'), piece(400, 500, 'H2'),
		piece(800, 200, 'R1'), piece(800, 200, 'R2'), piece(800, 200, 'R3')
	];
	var pack = nest.fillHeadCut(q.slice(), 1200, 1000, 0, false, 400);
	assert(pack && pack.placements.length === 5, 'head cut should place all 5, got ' + (pack && pack.placements.length));
	assert(noOverlap(pack.placements), 'head-cut placements overlap');
	var inHead = pack.placements.filter(function (pl) { return pl.x + pl.L <= 400.01; });
	assert(inHead.length === 2, 'head section should hold the two 400x500 parts');
})();

// Full Cut Rite nest: all parts fit, no overlap, stay inside trim.
(function fullNest() {
	var pieces = [];
	for (var i = 0; i < 6; i++) pieces.push(piece(600, 400, 'P' + i));
	var res = nest.nestBoardsCutrite(pieces, 2800, 2070, 10, 4.4, true);
	var n = 0;
	res.boards.forEach(function (b) {
		n += b.placements.length;
		assert(noOverlap(b.placements), 'nested placements overlap');
		assert(insideBoard(b.placements, 2800, 2070, 10), 'part outside trimmed board');
	});
	assert(n === 6, 'expected all 6 parts placed, got ' + n + ' with ' + res.unplaced.length + ' unplaced');
	assert(res.unplaced.length === 0, 'unexpected unplaced parts');
})();

// Cut Rite must not use more boards than the shelf packer on a simple equal-part job.
(function notWorseThanShelf() {
	var pieces = [];
	for (var i = 0; i < 10; i++) pieces.push(piece(500, 300, 'Q' + i));
	var cut = nest.nestBoardsCutrite(pieces, 2800, 2070, 10, 4.4, true);
	var shelf = nest.nestBoardsShelf(pieces, 2800, 2070, 10, 4.4, true);
	assert(cut.boards.length <= shelf.boards.length,
		'Cut Rite used ' + cut.boards.length + ' boards vs shelf ' + shelf.boards.length);
})();

console.log('pattern-renest-cutrite tests passed');
