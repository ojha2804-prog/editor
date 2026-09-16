/* CutList Optimizer pack — node pc-backups/3-NEW/tests/cutlist-optimize.js */
'use strict'

function splitFree(fr, L, W, kerf) {
	var out = []
	var restL = fr.L - L - kerf
	var restW = fr.W - W - kerf
	if ((fr.L - L) < (fr.W - W)) {
		if (restL > 0) out.push({ x: fr.x + L + kerf, y: fr.y, L: restL, W: W })
		if (restW > 0) out.push({ x: fr.x, y: fr.y + W + kerf, L: fr.L, W: restW })
	} else {
		if (restL > 0) out.push({ x: fr.x + L + kerf, y: fr.y, L: restL, W: fr.W })
		if (restW > 0) out.push({ x: fr.x, y: fr.y + W + kerf, L: L, W: restW })
	}
	return out
}
function fillBoard(queue, boardL, boardW, trim, kerf, allowRotate) {
	var free = [{ x: trim, y: trim, L: boardL - trim, W: boardW - trim }]
	var placements = []
	var guard = 0
	while (queue.length && guard++ < 20000) {
		var best = null
		for (var qi = 0; qi < queue.length; qi++) {
			var q = queue[qi]
			var opts = allowRotate
				? [{ L: q.L, W: q.W, rot: false }, { L: q.W, W: q.L, rot: true }]
				: [{ L: q.L, W: q.W, rot: false }]
			for (var fi = 0; fi < free.length; fi++) {
				var fr = free[fi]
				for (var oi = 0; oi < opts.length; oi++) {
					var o = opts[oi]
					if (o.L > fr.L || o.W > fr.W) continue
					var score = Math.min(fr.L - o.L, fr.W - o.W)
					if (!best || score < best.score) {
						best = { qi: qi, fi: fi, L: o.L, W: o.W, rot: o.rot, score: score }
					}
				}
			}
		}
		if (!best) break
		var target = free[best.fi]
		var piece = queue[best.qi]
		placements.push({ piece: piece, x: target.x, y: target.y, L: best.L, W: best.W, rotated: best.rot })
		queue.splice(best.qi, 1)
		var children = splitFree(target, best.L, best.W, kerf)
		free.splice(best.fi, 1)
		free = free.concat(children)
	}
	return { placements: placements, free: free }
}

var parts = [
	{ L: 600, W: 400, qty: 2, label: 'Jeffery', materialName: '18MM BS' },
	{ L: 600, W: 400, qty: 5, label: 'Joshua', materialName: '18MM BS' },
	{ L: 650, W: 400, qty: 2, label: 'Lottie', materialName: '18MM BS' },
	{ L: 700, W: 400, qty: 1, label: 'Marion', materialName: '18MM BS' },
	{ L: 800, W: 400, qty: 3, label: 'Aiden', materialName: '18MM BS' },
]
var queue = []
parts.forEach(function (p) {
	for (var i = 0; i < p.qty; i++) queue.push(p)
})
if (queue.length !== 13) throw new Error('Qty expands like CutList Optimizer')

var left = queue.slice()
var sheets = 0
var labels = {}
while (left.length) {
	var before = left.length
	var b = fillBoard(left, 2440, 1220, 15, 5, true)
	if (!b.placements.length) break
	sheets++
	b.placements.forEach(function (pl) { labels[pl.piece.label] = (labels[pl.piece.label] || 0) + 1 })
	if (left.length === before) break
}
if (left.length) throw new Error('unplaced after extra sheets: ' + left.length)
if (sheets < 1) throw new Error('need at least one sheet')
if (labels.Joshua !== 5) throw new Error('Joshua qty 5 on nest')
if (labels.Aiden !== 3) throw new Error('Aiden qty 3 on nest')

var grainQ = [{ L: 800, W: 400, label: 'grain' }]
var grain = fillBoard(grainQ, 2440, 1220, 15, 5, false)
if (grain.placements[0].rotated) throw new Error('grain does not rotate 90')

console.log('cutlist-optimize ok')
