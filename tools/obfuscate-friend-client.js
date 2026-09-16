/**
 * Obfuscate pc-backups/2-FRIEND/swood-client.js into the friend DAT pack.
 *   node tools/obfuscate-friend-client.js
 */
'use strict'
var fs = require('fs')
var path = require('path')
var JavaScriptObfuscator = require('javascript-obfuscator')
var srcPath = path.join(__dirname, '..', 'pc-backups', '2-FRIEND', 'swood-client.js')
var src = fs.readFileSync(srcPath, 'utf8')
var result = JavaScriptObfuscator.obfuscate(src, {
	compact: true,
	simplify: true,
	identifierNamesGenerator: 'hexadecimal',
	renameGlobals: false,
	transformObjectKeys: false,
	stringArray: true,
	stringArrayRotate: true,
	stringArrayShuffle: true,
	stringArrayWrappersCount: 2,
	stringArrayWrappersType: 'function',
	stringArrayEncoding: ['base64'],
	stringArrayThreshold: 0.85,
	splitStrings: true,
	splitStringsChunkLength: 10,
	numbersToExpressions: true,
	deadCodeInjection: false,
	controlFlowFlattening: false,
	selfDefending: false,
	target: 'browser',
	reservedNames: [
		'^SwoodClient$', '^sheetMetalGeometry$', '^resolveQty$', '^projectQty$',
		'^productQty$', '^config$', '^coating$', '^collectSheetMetal$',
		'^smNestFor$', '^smGeometryFor$', '^addFrameNames$', '^patchRawQuantity$',
		'^scaleNB$', '^partOrderQty$', '^factoryNB$', '^registerPage$',
		'^registerColumns$', '^registerMenu$', '^buildColumns$', '^columnSets$',
		'^makeMenuPersistent$', '^version$', '^util$',
	],
})
var out = '/* SwoodClient obfuscated build — edit pc-backups/2-FRIEND/swood-client.js then re-run obfuscate. */\n' +
	result.getObfuscatedCode() + '\n'
var dests = [
	path.join(__dirname, '..', 'pc-backups', '2-FRIEND', 'DAT', 'report', 'assets', 'settings', 'swood-client.js'),
	path.join(__dirname, '..', 'pc-backups', '2-FRIEND', 'DAT', 'report', 'assets', 'settings', 'swood-client.obfuscated.js'),
]
dests.forEach(function (p) {
	fs.mkdirSync(path.dirname(p), { recursive: true })
	fs.writeFileSync(p, out)
	console.log('wrote', p, Buffer.byteLength(out), 'bytes')
})
