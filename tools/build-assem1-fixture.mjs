#!/usr/bin/env node
/* Build a compact Assem1-shaped report-data-raw.js for Node / local preview.
   Numbers are chosen so swood-client.js produces the handoff §8 figures. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../reports/Assem1')
function V(alias, value) { return { alias: alias, value: String(value) } }
function CP(name, value, type) {
	return { name: name, type: type || 'Text', value: String(value) }
}

const cabinets = [
	{ n: 1, prod: 8 },
	{ n: 2, prod: 5 },
	{ n: 3, prod: 3 },
	{ n: 4, prod: 2 },
]
const panelTypes = ['Bottom', 'Top', 'Left', 'Right', 'Back', 'Front']
const weldLens = [622, 594, 594, 594]
const smPerCab = 3
const smL = 1200
const smW = 600
const smT = 2
const smMass = (smL / 1000) * (smW / 1000) * (smT / 1000) * 1000

const assemblies = []
const parts = []
const panels = []
const stocks = []
const materials = [
	{
		ID: 'MDF 16',
		name: 'MDF 16',
		variables: [
			V('MAT_NAME', 'MDF 16'), V('MAT_DESC', 'MDF 16 mm'),
			V('MAT_UCOST', '0'), V('PANEL', 'True'), V('MAT_DENSITY', '750'),
		],
	},
	{
		ID: 'PROS_20x20x2',
		name: 'PROS_20x20x2',
		variables: [
			V('MAT_NAME', 'PROS_20x20x2'),
			V('MAT_DESC', 'Square tube 20 x 20 x 2'),
			V('WELDMENT', 'True'), V('METAL', 'True'),
			V('MAT_DENSITY', '1000'), V('MAT_UCOST', '0'),
		],
	},
	{
		ID: 'AISI 304',
		name: 'AISI 304',
		variables: [
			V('MAT_NAME', 'AISI 304'), V('MAT_DESC', 'Stainless sheet'),
			V('MAT_DENSITY', '1000'), V('MAT_UCOST', '0'),
		],
	},
	{
		ID: 'HINGE',
		name: 'HINGE',
		variables: [
			V('MAT_NAME', 'HINGE'), V('MAT_DESC', 'Concealed hinge'),
			V('MAT_UCOST', '0'),
		],
	},
]

assemblies.push({
	ID: 'asm-Assem1',
	name: 'Assem1',
	assemblies: cabinets.map(function (c) { return 'asm-cab-' + c.n }),
	parts: [],
	variables: [V('NAME', 'Assem1'), V('TOTYPE', 'PROJECT'), V('NB', '1')],
	swcps: [CP('Project Quantity', '10', 'Number')],
})

cabinets.forEach(function (c) {
	const cabId = 'asm-cab-' + c.n
	const cabName = 'DOWN_CABINET_ONE_PROD_Assem1_' + c.n
	const childParts = []

	panelTypes.forEach(function (kind) {
		const id = 'p-' + kind.toLowerCase() + '-' + c.n
		childParts.push(id)
		parts.push({
			ID: id,
			name: kind + '_Master_' + cabName,
			panel: 'pan-' + kind.toLowerCase() + '-' + c.n,
			variables: [V('NAME', kind + '_Master_' + cabName), V('NB', '1')],
			swcps: [],
		})
		panels.push({
			ID: 'pan-' + kind.toLowerCase() + '-' + c.n,
			name: kind + '_Master_' + cabName,
			length: 600, width: 400, thickness: 16,
			material: { ID: 'MDF 16', name: 'MDF 16' },
			edgebands: [],
			processZones: [],
			quantity: 1,
			variables: [V('NAME', kind + '_Master_' + cabName), V('NB', '1')],
		})
	})

	const weldId = 'p-weld-' + c.n
	childParts.push(weldId)
	parts.push({
		ID: weldId,
		name: 'Frame_Tube_' + cabName,
		variables: [
			V('NAME', 'Frame_Tube_' + cabName), V('NB', '1'),
			V('MASS', '0.129299'),
		],
		swcps: [],
	})
	weldLens.forEach(function (len, i) {
		stocks.push({
			ID: 'st-weld-' + c.n + '-' + (i + 1),
			part: weldId,
			material: 'PROS_20x20x2',
			quantity: 1,
			variables: [
				V('ST_L', '20'), V('ST_W', '20'), V('ST_T', String(len)),
				V('ST_N', 'Square tube 20 X 20 X 2(' + (i + 1) + ')[1]'),
				V('MBS_TotalLength', '1000'), V('MBS_Weight', '0'),
				V('MBS_Length', String(len)), V('MBS_Cutlist', 'Cut-List-Item' + (i + 1)),
			],
		})
	})

	for (let b = 1; b <= smPerCab; b++) {
		const smId = 'p-sm-' + c.n + '-' + b
		childParts.push(smId)
		const smNb = 1 / (c.prod * 10)
		const smName = 'Sheetmetal_' + cabName + '_Sheet<' + b + '>'
		parts.push({
			ID: smId,
			name: smName,
			variables: [
				V('NAME', smName),
				V('NB', String(smNb)),
				V('SM_Thickness', String(smT)),
				V('SM_BlankLength', String(smL)),
				V('SM_BlankWidth', String(smW)),
				V('SM_BlankArea', String(smL * smW)),
				V('SM_BBoxArea', String(smL * smW)),
				V('SM_Material', 'AISI 304'),
				V('SM_Mass', String(smMass)),
				V('MASS', String(smMass)),
			],
			swcps: [CP('SM Density', '1000')],
		})
	}

	if (c.n === 1) {
		const hwId = 'p-hw-1'
		childParts.push(hwId)
		parts.push({
			ID: hwId,
			name: 'Hinge_' + cabName,
			variables: [V('NAME', 'Hinge_' + cabName), V('NB', '1')],
			swcps: [],
		})
	}

	assemblies.push({
		ID: cabId,
		name: cabName,
		assemblies: [],
		parts: childParts,
		variables: [V('NAME', cabName), V('TOTYPE', 'FRAME'), V('NB', '1')],
		swcps: [CP('Product Quantity', String(c.prod), 'Number'), CP('Frame', 'Yes')],
	})
})

if (parts.length !== 41) {
	throw new Error('expected 41 parts, got ' + parts.length)
}

const geometry = {}
parts.forEach(function (p) {
	if (!/^Sheetmetal_/.test(p.name)) return
	const rect = {
		outer: [[0, 0], [smL, 0], [smL, smW], [0, smW], [0, 0]],
		inner: [],
		thickness: smT,
		material: 'AISI 304',
	}
	geometry[p.name] = rect
})

const report = {
	guid: 'assem1-fixture',
	reportGUID: 'assem1-fixture-report',
	reportVersion: '2026.0.1',
	schemaVersion: 2,
	projectName: 'Assem1',
	projectPath: 'D:\\SWOOD_LIBRARY 2026\\WD\\Assem1.SLDASM',
	reportPath: 'C:\\Swood Reports\\2026_09\\Assem1',
	createdDate: '2026-09-24',
	swcps: [CP('Project Quantity', '10', 'Number'), CP('Project Name', 'Assem1')],
	variables: [],
	assemblies: assemblies,
	parts: parts,
	panels: panels,
	stocks: stocks,
	materials: materials,
	edgebands: [],
	edgebandMaterials: [],
	hardware: [],
	weldments: [],
	panelProcesses: [],
	processZones: [],
	patterns: [],
	cuttingPattern: [],
	sheetmetalParts: [],
}

fs.mkdirSync(path.join(outDir, 'db'), { recursive: true })
fs.writeFileSync(
	path.join(outDir, 'db', 'report-data-raw.js'),
	'var reportDataRaw = ' + JSON.stringify(report, null, 2) + ';\n'
)
fs.writeFileSync(
	path.join(outDir, 'db', 'sheetmetal-geometry.js'),
	'var sheetMetalGeometry = ' + JSON.stringify(geometry, null, 2) + ';\n' +
	'if (typeof window !== "undefined") window.sheetMetalGeometry = sheetMetalGeometry;\n'
)
console.log('wrote', parts.length, 'parts,', panels.length, 'panels,', stocks.length, 'stocks')
