/**
 * Rebuild swood-client.obfuscated.js from the readable swood-client.js.
 *   npm i javascript-obfuscator
 *   node tools/obfuscate-swood-client.js
 */
'use strict'
var fs = require('fs')
var path = require('path')
var JavaScriptObfuscator
try {
	JavaScriptObfuscator = require('javascript-obfuscator')
} catch (e) {
	console.error('Install first: npm i javascript-obfuscator')
	process.exit(1)
}
var root = path.join(__dirname, '..')
var src = fs.readFileSync(path.join(root, 'swood-client.js'), 'utf8')
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
var out = '/* SwoodClient obfuscated build — edit swood-client.js then re-run this script. */\n' +
	result.getObfuscatedCode() + '\n'
var dests = [
	path.join(root, 'swood-client.obfuscated.js'),
]
dests.forEach(function (p) {
	fs.mkdirSync(path.dirname(p), { recursive: true })
	fs.writeFileSync(p, out)
	console.log('wrote', p, Buffer.byteLength(out), 'bytes')
})
