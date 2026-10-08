/* Handoff B+C safety pins — node tests/handoff-safety.js */
'use strict'

var fs = require('fs')
var path = require('path')

var client = fs.readFileSync(path.join(__dirname, '..', 'dat/report/assets/settings/swood-client.js'), 'utf8')
var dataSettings = fs.readFileSync(path.join(__dirname, '..', 'dat/report/assets/settings/data-settings.js'), 'utf8')
var cost = fs.readFileSync(path.join(__dirname, '..', 'dat/report/assets/settings/cost.js'), 'utf8')

var iife = client.match(/^\s*\/?\s*;?\s*\(function/gm) || []
if (iife.length < 3) throw new Error('swood-client.js must stay three IIFEs, found ' + iife.length)

if (!/window\.SwoodClient && window\.SwoodClient\.config/.test(client)) {
	throw new Error('IIFE 2 must use window.SwoodClient.config, not a shared CONFIG')
}

if (!/var len = parseFloat\(v\.ST_T\)/.test(client)) {
	throw new Error('weldment length must read ST_T')
}
if (/var len = parseFloat\(v\.ST_L\)/.test(client)) {
	throw new Error('weldment length must never read ST_L')
}

if (!/get:\s*function\s*\(\s*o,\s*path\s*\)/.test(client)) {
	throw new Error('registered get(obj, "path") helper missing')
}
if (/field:\s*['"][^'"]*swcps\["Product Quantity"\]/.test(client)) {
	throw new Error('column field must not use swcps["Product Quantity"]')
}

if (!/instantiateData:\s*false/.test(dataSettings)) {
	throw new Error('keep instantiateData: false until numbers are proven')
}
if (!/useLocalDatabase:\s*false/.test(dataSettings)) {
	throw new Error('keep useLocalDatabase: false until one clean load')
}

if (!/assets\/settings\/cost\.js/.test(client)) {
	throw new Error('IIFE 1 must load cost.js with createElement')
}
if (!/window\.SwoodCost/.test(cost)) {
	throw new Error('cost.js must publish window.SwoodCost, not IIFE 2 locals')
}
if (!/typed Mgmt cell/.test(cost) && !/RATES/.test(client)) {
	throw new Error('typed RATES must remain the override')
}

if (!/function smEffectiveDensity/.test(client)) {
	throw new Error('sheet-metal density fallback missing')
}
if (!/density:\s*7\.85/.test(client)) {
	throw new Error('CONFIG.sheetMetal.density (or weldments.density) 7.85 missing')
}

console.log('handoff-safety ok')
