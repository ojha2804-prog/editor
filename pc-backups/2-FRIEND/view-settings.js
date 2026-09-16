const viewSettings = {
	pages: [
		{
			id: 'table',
			name: 'table',
			url: '/table',
			type: 'table',
			title: 'New Page',
			header: 'New Page',
			resource: 'boardMaterials',
			description: '',
			table: {
				title: 'table',
				columns: [
					{
						field: 'name',
						title: 'name',
						widthGrow: 1,
					},
					{
						field: '_ancestors[_ancestors.length - 1].name',
						title: 'parent',
						widthGrow: 2,
					},
					{
						// field: 'if(_depth != 0, _ancestors[0].name, "TEST")',
						field: 'if(exists(_depth) , if(_depth != 0, _ancestors[0].name, "no parent"), "no depth")',
						// field: 'exists(_depth) ? (_depth != 0 ? _ancestors[0].name : "no parent") : "no depth"',
						title: '_ancestors[0].name',
						widthGrow: 1,
					},
					{
						field: '_depth',
						title: '_depth',
						widthGrow: 1,
						formatter: 'number',
						formatterParams: { precision: 0 },
					},
					{
						field: '_isParent',
						title: '_isParent',
						widthGrow: 1,
						formatter: 'tickCross',
					},
					{
						field: '_isChild',
						title: '_isChild',
						widthGrow: 1,
						formatter: 'tickCross',
					},
					{
						field: '_children.length',
						title: '_children.length',
						widthGrow: 1,
					},
					{
						field: 'quantity',
						title: 'quantity_original',
						formatter: 'number',
						formatterParams: { precision: 0 },
						widthGrow: 1,
					},
					{
						field: 'if(_depth == 0, quantity, if(exists(_children), _children.length * _ancestors[0].quantity, _ancestors[0].quantity))',
						title: 'quantity',
						formatter: 'number',
						formatterParams: { precision: 0 },
						widthGrow: 1,
					},
				],
				treeBy: [
					{
						field: 'material.layers',
						childTreeBy: [
							{
								field: 'name',
							},
						],
					},
				],
				dataTreeStartExpanded: true,
			},
		},
		{
			id: 'bom',
			name: 'bom',
			url: '/bom',
			type: 'table',
			title: 'Bill of Materials',
			resource: 'bom',
			description: '',
			table: {
				title: 'table',
				dataTreeElementColumn: 'name',
				columns: [
					{
						width: 50,
						title: '#',
						formatter: 'rownum',
					},
					{
						field: 'name',
						width: 400,
						title: 'name',
						formatter: 'component',
					},
					{
						field: 'configuration',
						width: 400,
						title: 'configuration',
					},
					{
						field: 'count',
						width: 400,
						title: 'count',
					},
					{
						field: 'test',
						width: 400,
						title: 'test',
						formatter: cell => {
							const data = cell.getData()
							return 4 + 4
						},
					},
				],
				dataTreeChildField: 'children',
				dataTreeStartExpanded: true,
			},
		},
		{
			id: 'materials',
			name: 'Materials',
			url: '/materials',
			type: 'table',
			title: 'Compound Materials',
			resource: 'panelMaterials',
			description: '',
			table: {
				title: 'table',
				columns: [
					{
						field: 'name',
						title: 'name',
						width: 400,
					},
					{
						field: 'thickness',
						title: 'thickness',
						width: 200,
					},
				],
				dataTreeChildField: 'layers',
				dataTreeElementColumn: 'name',
				dataTreeStartExpanded: true,
			},
		},
		{
			id: 'home',
			name: 'home',
			description: 'application home page',
			url: '/',
			type: 'layout',
			title: 'Home Page',
			resource: 'project',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'name',
								prefix: 'Name: ',
								formatter: 'text',
								range: '1,1:3,1',
							},
							{
								field: 'documents.PDF_PROJECT.relativeURI',
								prefix: 'pdf: ',
								formatter: 'link',
								range: '4,1:4,1',
							},
							{
								field: 'swcps.Description',
								prefix: 'Description: ',
								formatter: 'text',
								range: '1,2:4,2',
							},
							{
								field: 'configuration',
								prefix: 'Configuration: ',
								formatter: 'text',
								range: '1,3:4,3',
							},
							{
								field: 'swcps.Comments',
								prefix: 'Comments: ',
								formatter: 'text',
								range: '1,4:4,4',
							},
							{
								field: 'documents.IMG_REPORT.relativeURI',
								formatter: 'image',
								formatterParams: {
									edrawings: 'documents.EDRAWINGS_PROJECT.relativeURI',
								},
								range: '5,1:12,12',
							},
							{
								field: 'isDesign',
								prefix: 'Design:',
								range: '1,5:1,5',
								formatter: 'tickCross',
								formatterParams: {
									disableCrossElement: true,
								},
							},
							{
								field: 'isCam',
								prefix: 'Cam:',
								range: '2,5:2,5',
								formatter: 'tickCross',
								formatterParams: {
									disableCrossElement: true,
								},
							},
							{
								field: 'isNesting',
								prefix: 'Nesting:',
								range: '3,5:4,5',
								formatter: 'tickCross',
								formatterParams: {
									disableCrossElement: true,
								},
							},
							{
								field: 'root',
								formatter: 'chart',
								range: '1,6:4,12',
								formatterParams: {
									legendTitle: 'Project Items',
									fields: [
										{
											field: 'arraySum(quantity, root.frames)',
											legendLabel: 'frames',
										},
										{
											field: 'arraySum(quantity, root.panels)',
											legendLabel: 'panels',
										},
										{
											field: 'arraySum(quantity, root.programs)',
											legendLabel: 'programs',
										},
										{
											field: 'arraySum(quantity, root.sheets)',
											legendLabel: 'sheets',
										},
										{
											field: 'arraySum(quantity, root.programParts)',
											legendLabel: 'programParts',
										},
										{
											field: 'arraySum(quantity, root.patterns)',
											legendLabel: 'patterns',
										},
										{
											field: 'arraySum(quantity, root.hardware)',
											legendLabel: 'hardware',
										},
									],
								},
							},
						],
					},
				},
			],
		},
		{
			id: 'panels',
			name: 'panels',
			description: 'list of all panels in the project',
			url: '/panels',
			type: 'table',
			title: 'List of Panels',
			resource: 'panels',
			table: {
				title: 'Panels',
				dataTreeElementColumn: 'name',
				initialFilter: [],
				splitBy: [
					{
						field: 'material.category',
						buttonLabel: 'Category',
					},
					{
						field: 'frames.name',
						buttonLabel: 'Frame',
						emptyValue: 'No Parent',
					},
					{
						field: 'material.name',
						buttonLabel: 'Material',
					},
				],
				treeBy: [
					{
						field: 'swcps.CombineID',
						flattenSingleChildGroups: false,
						parentValues: [
							{
								field: 'name',
								value: '"Combined Panel " + swcps.CombineID',
							},
						],
						parentCalculations: [
							{
								field: 'quantity',
								type: 'sum',
							},
						],
					},
				],
				columns: [
					{
						field: 'documents.PDF_PANEL.relativeURI',
						title: 'pdf',
						formatter: 'link',
						headerSort: false,
						print: false,
						formatterParams: {
							urlField: 'documents.PDF_PANEL.relativeURI',
							icon: {
								name: 'open_in_new',
							},
							target: '_blank',
						},
						width: 50,
					},
					{
						field: 'programs.length',
						title: '',
						formatter: 'badge',
						width: 40,
					},
					{
						field: 'swcps.ID',
						title: '#',
						hozAlign: 'center',
						width: 70,
					},
					{
						field: 'name',
						title: 'Name',
						formatter: 'link',
						formatterParams: {
							url: '/panels/:key',
						},
					},
					{
						field: 'length',
						title: 'Length',
						width: 90,
						editor: 'adaptable',
					},
					{
						field: 'width',
						title: 'Width',
						width: 90,
					},
					{
						field: 'thickness',
						title: 'Thick',
						width: 90,
					},
					{
						field: 'material.name',
						title: 'Material',
						width: 200,
					},
					{
						field: 'hasGrain',
						title: 'Grain',
						formatter: 'tickCross',
						width: 80,
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 70,
					},
				],
			},
		},
		{
			id: 'panels-damaged',
			name: 'panels-damaged',
			description: 'list of all damaged panels in the project',
			url: '/panels-damaged',
			type: 'table',
			title: 'List of Damaged Panels',
			resource: 'panels',
			filter: {
				condition: 'and',
				rules: [
					{
						label: 'isDamaged',
						field: 'variables.isDamaged',
						operator: 'equal',
						type: 'boolean',
						value: true,
					},
				],
			},
			table: {
				title: 'Panels',
				splitBy: [
					{
						field: 'material.category',
						buttonLabel: 'Category',
					},
					{
						field: 'material.name',
						buttonLabel: 'Material',
					},
				],
				dataTreeElementColumn: 'name',
				columns: [
					{
						field: 'variables.isDamaged',
						title: 'Damaged',
						formatter: 'tickCross',
						width: 110,
						editor: 'tickCross',
					},
					{
						field: 'swcps.ID',
						title: '#',
						hozAlign: 'center',
						width: 70,
					},
					{
						field: 'name',
						title: 'Name',
						formatter: 'link',
						formatterParams: {
							url: '/panels/:key',
						},
					},
					{
						field: 'material.name',
						title: 'Material',
						width: 200,
						editor: 'adaptable',
					},
					{
						field: 'length',
						title: 'Length',
						width: 120,
					},
					{
						field: 'width',
						title: 'Width',
						width: 120,
					},
					{
						field: 'thickness',
						title: 'Thickness',
						width: 120,
					},
					{
						field: 'swcps.Comments',
						title: 'Comments',
						width: 200,
						editor: 'adaptable',
					},
				],
			},
		},
		{
			id: 'panels-filtered',
			name: 'panels-filtered',
			description: 'list of panels with filter, only panels with length > 1000 and width > 500',
			url: '/panels-filtered',
			type: 'table',
			title: 'List of Filtered Panels',
			resource: 'panels',
			filter: {
				condition: 'and',
				rules: [
					{
						label: 'length',
						field: 'length',
						operator: 'greaterthan',
						type: 'number',
						value: 1000,
					},
					{
						label: 'width',
						field: 'width',
						type: 'number',
						operator: 'greaterthan',
						value: 500,
					},
				],
			},
			table: {
				title: 'Panels',
				splitBy: [
					{
						field: 'material.category',
						buttonLabel: 'Category',
					},
					{
						field: 'material.name',
						buttonLabel: 'Material',
					},
				],
				columns: [
					{
						field: 'documents.PDF_PANEL.relativeURI',
						title: 'pdf',
						formatter: 'link',
						headerSort: false,
						print: false,
						formatterParams: {
							urlField: 'documents.PDF_PANEL.relativeURI',
							icon: {
								name: 'open_in_new',
							},
							target: '_blank',
						},
						width: 50,
					},
					{
						field: 'programs.length',
						title: '',
						formatter: 'badge',
						width: 50,
					},
					{
						field: 'swcps.ID',
						title: '#',
						hozAlign: 'center',
						width: 70,
					},
					{
						field: 'name',
						title: 'Part Name',
						formatter: 'link',
						formatterParams: {
							url: '/panels/:key',
						},
					},
					{
						field: 'material.name',
						title: 'Material',
						width: 300,
					},
					{
						field: 'length',
						title: 'Length',
						width: 120,
					},
					{
						field: 'width',
						title: 'Width',
						width: 120,
					},
					{
						field: 'thickness',
						title: 'Thickness',
						width: 120,
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 70,
					},
					{
						field: 'hasGrain',
						title: 'Grain',
						formatter: 'tickCross',
						width: 100,
					},
					{
						field: 'costCore',
						title: 'costCore',
						width: 120,
						formatter: 'money',
						formatterParams: {
							decimal: '.',
							thousand: ',',
						},
					},
				],
			},
		},
		{
			id: 'panels-materials',
			name: 'panels-materials',
			description: 'list of panels grouped by material, a page per material',
			url: '/panel-materials',
			type: 'table',
			resource: 'panels',
			pageBy: {
				field: 'material.name',
			},
			splitBy: [
				{
					field: 'material.category',
					buttonLabel: 'Category',
				},
				{
					field: 'material.name',
					buttonLabel: 'Material',
				},
			],
			table: {
				title: '???',
				columns: [
					{
						field: 'documents.PDF_PANEL.relativeURI',
						title: 'pdf',
						formatter: 'link',
						headerSort: false,
						print: false,
						formatterParams: {
							urlField: 'documents.PDF_PANEL.relativeURI',
							icon: {
								name: 'open_in_new',
							},
							target: '_blank',
						},
						width: 50,
					},
					{
						field: 'programs.length',
						title: '',
						formatter: 'badge',
						width: 50,
					},
					{
						field: 'swcps.ID',
						title: '#',
						hozAlign: 'center',
						width: 70,
					},
					{
						field: 'name',
						title: 'Part Name',
						formatter: 'link',
						formatterParams: {
							url: '/panels/:key',
						},
					},
					{
						field: 'material.name',
						title: 'Material',
						width: 300,
					},
					{
						field: 'length',
						title: 'Length',
						width: 120,
					},
					{
						field: 'width',
						title: 'Width',
						width: 120,
					},
					{
						field: 'thickness',
						title: 'Thickness',
						width: 120,
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 70,
					},
					{
						field: 'hasGrain',
						title: 'Grain',
						formatter: 'tickCross',
						width: 100,
					},
					{
						field: 'costCore',
						title: 'costCore',
						width: 120,
						formatter: 'money',
						formatterParams: {
							decimal: '.',
							thousand: ',',
						},
					},
				],
			},
		},
		{
			id: 'panels-frames',
			name: 'panels-frames',
			description: 'list of panels grouped by frame, a page per frame',
			url: '/panel-frames',
			type: 'table',
			resource: 'panels',
			pageBy: {
				field: 'frames.name',
				emptyValue: 'No Parent',
			},
			splitBy: [
				{
					field: 'material.category',
					buttonLabel: 'Category',
				},
				{
					field: 'material.name',
					buttonLabel: 'Material',
				},
			],
			table: {
				title: '???',
				columns: [
					{
						field: 'documents.PDF_PANEL.relativeURI',
						title: 'pdf',
						formatter: 'link',
						headerSort: false,
						formatterParams: {
							urlField: 'documents.PDF_PANEL.relativeURI',
							icon: {
								name: 'open_in_new',
							},
							target: '_blank',
						},
						width: 50,
					},
					{
						field: 'programs.length',
						title: '',
						formatter: 'badge',
						width: 50,
					},
					{
						field: 'swcps.ID',
						title: '#',
						hozAlign: 'center',
						width: 70,
					},
					{
						field: 'name',
						title: 'Part Name',
						formatter: 'link',
						formatterParams: {
							url: '/panels/:key',
						},
					},
					{
						field: 'material.name',
						title: 'Material',
						width: 300,
					},
					{
						field: 'length',
						title: 'Length',
						width: 120,
					},
					{
						field: 'width',
						title: 'Width',
						width: 120,
					},
					{
						field: 'thickness',
						title: 'Thickness',
						width: 120,
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 70,
					},
					{
						field: 'hasGrain',
						title: 'Grain',
						formatter: 'tickCross',
						width: 100,
					},
					{
						field: 'costCore',
						title: 'costCore',
						width: 120,
						formatter: 'money',
						formatterParams: {
							decimal: '.',
							thousand: ',',
						},
					},
				],
			},
		},
		{
			id: 'stocks',
			name: 'stocks',
			description: 'list of all stocks in the project',
			url: '/stocks',
			type: 'table',
			resource: 'stocks',
			title: 'List of Stocks',
			table: {
				title: 'Stocks',
				dataTreeElementColumn: 'panel.name',
				splitBy: [
					{
						field: 'material.name',
						buttonLabel: 'Material',
					},
					{
						field: 'panel.frames.name',
						buttonLabel: 'Frame',
						emptyValue: 'No Parent',
					},
				],
				treeBy: [
					{
						field: 'swcps.CombineID',
						flattenSingleChildGroups: true,
						parentValues: [
							{
								field: 'name',
								value: '"Combined Panel " + swcps.CombineID',
							},
						],
						parentCalculations: [
							{
								field: 'quantity',
								type: 'sum',
							},
							{
								field: 'material.thickness',
								type: 'sum',
							},
						],
						parentValueIfChildrenDiffer: [
							{
								field: 'swcps.ID',
								value: '',
							},
							{
								field: 'material.thickness',
								value: '',
							},
						],
					},
					{
						field: 'if(material.hasGrain, length + "|" + width + "|" + material.name, max(length, width) + "|" + min(length, width) + "|" + material.name)',
						flattenSingleChildGroups: true,
						parentValues: [
							{
								field: 'name',
								value: '"Combined Stock " + counter',
							},
						],
						parentCalculations: [
							{
								field: 'quantity',
								type: 'sum',
							},
							{
								field: 'material.thickness',
								type: 'sum',
							},
						],
						parentValueIfChildrenDiffer: [
							{
								field: 'swcps.ID',
								value: '',
							},
							{
								field: 'material.thickness',
								value: '',
							},
						],
					},
				],
				columns: [
					{
						field: 'swcps.ID',
						title: '#',
						hozAlign: 'center',
						width: 70,
					},
					{
						field: 'panel.name',
						title: 'Part Name',
						formatter: 'link',
						formatterParams: {
							url: '/panels/:refPart',
						},
					},
					{
						field: 'length',
						title: 'Length',
						width: '200',
					},
					{
						field: 'width',
						title: 'Width',
						width: '200',
					},
					{
						field: 'thickness',
						title: 'Thickness',
						width: '200',
					},
					{
						field: 'material.name',
						title: 'Material',
						width: '250',
					},
					{
						field: 'material.hasGrain',
						title: 'Grain',
						width: 150,
						formatter: 'tickCross',
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 150,
					},
				],
			},
		},
		{
			id: 'laminates',
			name: 'laminates',
			description: 'list of all laminates in the project',
			url: '/stocks/laminates',
			type: 'table',
			resource: 'laminates',
			title: 'List of Laminates',
			table: {
				title: 'Laminates',
				treeBy: [
					{
						field: 'if(material.hasGrain, length + "|" + width + "|" + material.name, max(length, width) + "|" + min(length, width) + "|" + thickness + "|" + material.name)',
						flattenSingleChildGroups: true,
						parentValues: [
							{
								field: 'name',
								value: '"Combined Laminate " + counter',
							},
						],
						parentCalculations: [
							{
								field: 'quantity',
								type: 'sum',
							},
						],
					},
				],
				columns: [
					{
						field: 'name',
						title: 'Name',
						width: 220,
					},
					{
						field: 'panel.name',
						title: 'Panel',
						formatter: 'link',
						formatterParams: {
							url: '/panels/:refPanel',
						},
					},
					{
						field: 'length',
						title: 'Length',
						width: 120,
					},
					{
						field: 'width',
						title: 'Width',
						width: 120,
					},
					{
						field: 'thickness',
						title: 'Thickness',
						width: 120,
					},
					{
						field: 'material.name',
						title: 'Material',
						width: 200,
					},
					{
						field: 'material.hasGrain',
						title: 'Grain',
						formatter: 'tickCross',
						width: 120,
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 120,
					},
				],
			},
		},
		{
			id: 'edgebands',
			name: 'edgebands',
			description: 'list of all edgebands in the project',
			url: '/stocks/edgebands',
			type: 'table',
			resource: 'edgebands',
			title: 'List of Edgebands',
			table: {
				title: 'Edgebands',
				columns: [
					{
						field: 'panel.name',
						title: 'Panel',
						formatter: 'link',
						formatterParams: {
							url: '/panels/:refPanel',
						},
					},
					{
						field: 'length',
						title: 'Length',
						width: 200,
					},
					{
						field: 'width',
						title: 'Width',
						width: 200,
					},
					{
						field: 'thickness',
						title: 'Thickness',
						width: 200,
					},
					{
						field: 'material.name',
						title: 'Material',
						width: 250,
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 100,
					},
				],
				treeBy: [
					{
						field: 'length + "|" + width + "|" + thickness + "|" + material.name',
						flattenSingleChildGroups: true,
						parentValues: [
							{
								field: 'panel.name',
								value: '"Combined Edgeband " + counter',
							},
						],
						parentCalculations: [
							{
								field: 'quantity',
								type: 'sum',
							},
						],
					},
				],
			},
		},
		{
			id: 'patterned-panels',
			name: 'patterned-panels',
			description: 'list of all patterned panels in the project',
			url: '/patterned-panels',
			type: 'table',
			resource: 'panels',
			title: 'List of Patterned Panels',
			filter: {
				condition: 'and',
				rules: [
					{
						label: 'isPatterned',
						field: 'isPatterned',
						operator: 'equal',
						type: 'boolean',
						value: true,
					},
				],
			},
			table: {
				title: 'Patterned Panels',
				dataTreeElementColumn: 'name',
				columns: [
					{
						field: 'documents.PDF_PANEL.relativeURI',
						title: 'pdf',
						formatter: 'link',
						headerSort: false,
						formatterParams: {
							urlField: 'documents.PDF_PANEL.relativeURI',
							icon: {
								name: 'open_in_new',
							},
							target: '_blank',
						},
						width: 50,
					},
					{
						field: 'programs.length',
						title: '',
						formatter: 'badge',
						width: 50,
					},
					{
						field: 'swcps.ID',
						title: '#',
						hozAlign: 'center',
						width: 70,
					},
					{
						field: 'name',
						title: 'Part Name',
						formatter: 'link',
						formatterParams: {
							url: '/panels/:key',
						},
					},
					{
						field: 'length',
						title: 'Length',
						width: 120,
					},
					{
						field: 'width',
						title: 'Width',
						width: 120,
					},
					{
						field: 'thickness',
						title: 'Thickness',
						width: 120,
					},
					{
						field: 'material.name',
						title: 'Material',
						width: 300,
					},
					{
						field: 'hasGrain',
						title: 'Grain',
						formatter: 'tickCross',
						width: 100,
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 70,
					},
				],
			},
		},
		{
			id: 'pattern-details-simplified',
			name: 'pattern-details-simplified',
			description: 'details of a single pattern',
			url: '/patterns-simple/:key',
			resource: 'patterns',
			type: 'layout',
			title: 'Pattern Details',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'pattern',
								formatter: 'pattern',
								range: '4,1:12,6',
								formatterParams: {
									panelLabel: 'swcps.ID',
									showStatistics: true,
									printStatistics: true,
									showCutList: true,
									printCutList: true,
									showPanelLabel: true,
									showPanelDimensions: true,
									showWasteLabel: false,
									showWasteDimensions: false,
									showTrimLabel: false,
									showTrimDimensions: false,
									rotate: 0,
								},
							},
							{
								field: 'name',
								prefix: '',
								range: '1,1:3,1',
							},
							{
								field: 'refBoard',
								prefix: 'Material:  ',
								range: '1,2:3,2',
							},
							{
								field: 'quantityPanels',
								prefix: '# Panels: ',
								range: '1,3:3,3',
							},
							{
								field: 'quantityTrims',
								prefix: '# Trims: ',
								range: '1,4:3,4',
							},
							{
								field: 'quantityWaste',
								prefix: '# Waste:  ',
								range: '1,5:3,5',
							},
						],
					},
				},
			],
		},
		{
			id: 'pattern-detailed-list',
			name: 'pattern-detailed-list',
			description: 'list of simplified patterns',
			url: '/pattern-detailed-list',
			type: 'layout',
			title: 'List of Patterns',
			resource: 'patterns',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'arraySum(quantityPanels, patterns)',
								prefix: 'Total Panels: ',
								formatter: 'text',
								range: '1,1:4,1',
							},
							{
								field: 'none',
								prefix: '',
								range: '5,1:8,8',
								formatter: 'chart',
								formatterParams: {
									legendTitle: 'Quantities',
									fields: [
										{
											field: 'arraySum(quantityPanels, patterns)',
											legendLabel: 'panels',
										},
										{
											field: 'arraySum(quantityWaste, patterns)',
											legendLabel: 'waste',
										},
										{
											field: 'arraySum(quantityTrims, patterns)',
											legendLabel: 'trims',
										},
									],
								},
							},
							{
								field: 'none',
								prefix: '',
								range: '9,1:12,8',
								formatter: 'chart',
								formatterParams: {
									legendTitle: 'Area Usage',
									fields: [
										{
											field: 'arraySum(areaPanels, patterns)',
											legendLabel: 'panels',
										},
										{
											field: 'arraySum(areaWaste, patterns)',
											legendLabel: 'waste',
										},
										{
											field: 'arraySum(areaTrims, patterns)',
											legendLabel: 'trims',
										},
										{
											field: 'arraySum(areaCuts, patterns)',
											legendLabel: 'cuts',
										},
									],
								},
							},
							{
								field: 'format(arraySum(areaPanels, patterns),2) + " m² " + "(" + format(arraySum(areaPanels, patterns)  * 100 / arraySum(areaTotal, patterns) ,0) + "%)"',
								prefix: 'Panels Area: ',
								range: '1,2:4,2',
							},
							{
								field: 'format(arraySum(areaWaste, patterns),2) + " m² " + "(" + format(arraySum(areaWaste, patterns)  * 100 / arraySum(areaTotal, patterns) ,0) + "%)"',
								prefix: 'Waste Area: ',
								range: '1,3:4,3',
							},
							{
								field: 'format(arraySum(areaTrims, patterns),2) + " m² " + "(" + format(arraySum(areaTrims, patterns)  * 100 / arraySum(areaTotal, patterns) ,0) + "%)"',
								prefix: 'Trim Area: ',
								range: '1,4:4,4',
							},
						],
					},
				},
				{
					id: 'loop',
					name: 'loop',
					type: 'loop',
					loop: {
						source: 'pattern-details-simplified',
						breakPages: false,
					},
				},
			],
		},
		{
			id: 'saw-machine-data',
			name: 'saw-machine-data',
			description: 'saw machine cutting data',
			url: '/saw-machine-data',
			type: 'table',
			resource: 'panels',
			title: 'Saw Machine Data',
			header: 'Saw Machine Data',
			table: {
				title: 'List of Saw Machine Data',
				splitBy: [
					{
						field: 'material.category',
						buttonLabel: 'Category',
					},
					{
						field: 'material.name',
						buttonLabel: 'Material',
					},
					{
						field: 'frames.name',
						buttonLabel: 'Frame',
						emptyValue: 'No Parent',
					},
				],
				initialFilter: [
					{
						field: 'material.name',
						type: '!=',
						value: 'GLASS',
					},
					{
						field: 'material.name',
						type: '!=',
						value: 'MIRROR',
					},
				],
				columns: [
					{ field: 'swcps.ID', title: 'CODE', width: 160 },
					{ field: 'material.name', title: 'MATERIAL SPECIFICATIONS', width: 220 },
					{ field: 'name', title: 'COMPONENT NAME', width: 180 },
					{ field: 'length', title: 'HEIGHT', width: 80 },
					{ field: 'width', title: 'DEPTH', width: 80 },
					{ field: 'quantity', title: 'QTY', width: 70 },
					{ field: 'thickness', title: 'THK', width: 70 },
					{ field: 'lengthWithoutEdgebands', title: 'LENGTH', width: 90 },
					{ field: 'widthWithoutEdgebands', title: 'WIDTH', width: 90 },
				],
			},
		},
		{
			id: 'weldments',
			name: 'weldments',
			description: 'list of all weldments in the project',
			url: '/weldments',
			type: 'table',
			resource: 'weldments',
			title: 'List of Weldments',
			table: {
				title: 'Weldments',
				treeBy: [
					{
						field: 'cutlist',
						flattenSingleChildGroups: false,
						parentValues: [
							{
								field: 'name',
								value: 'cutlist',
							},
						],
						parentCalculations: [
							{
								field: 'quantity',
								type: 'sum',
							},
						],
					},
				],
				columns: [
					{
						field: 'name',
						title: 'Part Name',
						width: 'auto',
					},
					{
						field: 'description',
						title: 'Description',
						width: '250',
					},
					{
						field: 'length',
						title: 'Length',
						width: '160',
					},
					{
						field: 'lengthTotal',
						title: 'Length Total',
						width: '160',
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 100,
					},
				],
			},
		},
		{
			id: 'frames',
			name: 'frames',
			description: 'list of all frames in the project',
			url: '/frames',
			type: 'table',
			resource: 'frames',
			title: 'List of Frames',
			table: {
				title: 'Frames',
				dataTreeElementColumn: 'name',
				dataTreeChildField: 'subFrames',
				columns: [
					{
						field: 'swcps.ID',
						title: '#',
						width: 70,
					},
					{
						field: 'documents.PDF_FRAME.relativeURI',
						title: 'pdf',
						width: 50,
						headerSort: false,
						formatter: 'link',
						formatterParams: {
							urlField: 'documents.PDF_FRAME.relativeURI',
							icon: {
								name: 'open_in_new',
							},
							target: '_blank',
						},
					},
					{
						field: 'name',
						title: 'Name',
						width: 'auto',
						formatter: 'link',
						formatterParams: {
							url: '/frames/:key',
							urlChildren: '/sub-frames/:key',
						},
					},
					{
						field: 'swcps.Description',
						title: 'Description',
						width: 'auto',
					},
					{
						field: 'height',
						title: 'Height',
						width: '200',
					},
					{
						field: 'width',
						title: 'Width',
						width: '200',
					},
					{
						field: 'depth',
						title: 'Depth',
						width: '200',
					},
				],
			},
		},
		{
			id: 'sub-frames',
			name: 'sub-frames',
			description: 'list of all subframes in the project',
			url: '/sub-frames',
			type: 'table',
			resource: 'subFrames',
			title: 'List of Sub-Frames',
			table: {
				title: 'subFrames',
				dataTreeElementColumn: 'name',
				dataTreeChildField: 'subFrames',
				columns: [
					{
						field: 'swcps.ID',
						title: '#',
						width: 70,
					},
					{
						field: 'documents.PDF_FRAME.relativeURI',
						title: 'pdf',
						width: 50,
						headerSort: false,
						formatter: 'link',
						formatterParams: {
							urlField: 'documents.PDF_FRAME.relativeURI',
							icon: {
								name: 'open_in_new',
							},
							target: '_blank',
						},
					},
					{
						field: 'name',
						title: 'Name',
						width: 'auto',
						formatter: 'link',
						formatterParams: {
							url: '/sub-frames/:key',
						},
					},
					{
						field: 'swcps.Description',
						title: 'Description',
						width: 'auto',
					},
					{
						field: 'height',
						title: 'Height',
						width: '200',
					},
					{
						field: 'width',
						title: 'Width',
						width: '200',
					},
					{
						field: 'depth',
						title: 'Depth',
						width: '200',
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: '150',
					},
				],
			},
		},
		{
			id: 'programs',
			name: 'programs',
			description: 'list of all programs in the project',
			url: '/programs',
			type: 'table',
			resource: 'programs',
			title: 'List of Programs',
			table: {
				title: 'Programs',
				splitBy: [
					{
						field: 'machine',
						buttonLabel: 'Machine',
					},
				],
				columns: [
					{
						field: 'swcps.ID',
						title: '#',
						hozAlign: 'center',
						width: 70,
					},
					{
						field: 'part.name',
						title: 'Panel Name',
						width: 'auto',
						formatter: 'link',
						formatterParams: {
							url: '/panels/:panel.key',
						},
					},
					{
						field: 'name',
						title: 'Program Name',
						width: '200',
						formatter: 'link',
						formatterParams: {
							url: '/programs/:key',
						},
					},
					{
						field: 'programDocument.relativeURI',
						title: 'Program File Name',
						width: '400',
					},
					{
						field: 'machine',
						title: 'Machine',
						width: '150',
					},
					{
						field: 'panel.material.name',
						title: 'Material',
						width: '200',
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: '75',
					},
				],
			},
		},
		{
			id: 'tools',
			name: 'tools',
			description: 'list of all tools in the project',
			url: '/tools',
			type: 'table',
			resource: 'tools',
			title: 'List of Tools',
			table: {
				title: 'Tools',
				columns: [
					{
						field: 'number',
						title: 'Number',
						width: '20%',
					},
					{
						field: 'name',
						title: 'Name',
						width: '30%',
					},
					{
						field: 'reference',
						title: 'Reference',
						width: '25%',
					},
					{
						field: 'diameter',
						title: 'Diameter',
						width: '25%',
					},
				],
			},
		},
		{
			id: 'spindles',
			name: 'spindles',
			description: 'list of all spindles in the project',
			url: '/spindles',
			type: 'table',
			resource: 'spindles',
			title: 'List of Spindles',
			table: {
				title: 'Spindles',
				columns: [
					{
						field: 'key',
						title: 'key',
					},
					{
						field: 'variables.SPINDLE_NAME',
						title: 'name',
					},
					{
						field: 'variables.SPINDLE_FAMILY',
						title: 'family',
					},
					{
						field: 'variables.SPINDLE_RPM',
						title: 'rpm',
					},
					{
						field: 'variables.SPINDLE_USED',
						title: 'used',
					},
				],
			},
		},
		{
			id: 'sheets',
			name: 'sheets',
			description: 'list of all sheets in the project',
			url: '/sheets',
			type: 'table',
			resource: 'sheets',
			title: 'List of Sheets',
			table: {
				title: 'Sheets',
				columns: [
					{
						field: 'name',
						title: 'Name',
						width: '600',
						formatter: 'link',
						formatterParams: {
							url: '/sheets/:key',
						},
					},
					{
						field: 'length',
						title: 'Length',
						width: 'auto',
					},
					{
						field: 'width',
						title: 'Width',
						width: 'auto',
					},
					{
						field: 'thickness',
						title: 'Thickness',
						width: 'auto',
					},
					{
						field: 'board.name',
						title: 'Material',
						width: 'auto',
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 'auto',
					},
				],
			},
		},
		{
			id: 'program-parts',
			name: 'program-parts',
			description: 'list of all program parts (nested panels) in the project',
			url: '/program-parts',
			type: 'table',
			resource: 'programParts',
			title: 'List of Nested Panels',
			table: {
				title: 'Nested Panels',
				splitBy: [
					{
						field: 'sheet.name',
						buttonLabel: 'Sheet',
					},
				],
				dataTreeElementColumn: 'name',
				treeBy: [
					{
						field: 'name',
						parentCalculations: [
							{
								field: 'quantity',
								type: 'sum',
							},
						],
						flattenSingleChildGroups: true,
					},
				],
				columns: [
					{
						field: 'panel.programs.length',
						title: '',
						formatter: 'badge',
						width: 40,
					},
					{
						field: 'part.swcps.ID',
						title: '#',
						hozAlign: 'center',
						width: 70,
					},
					{
						field: 'name',
						title: 'Name',
						formatter: 'link',
						formatterParams: {
							url: '/program-parts/:key',
						},
					},
					{
						field: 'panel.length',
						title: 'Length',
						width: 100,
					},
					{
						field: 'panel.width',
						title: 'Width',
						width: 100,
					},
					{
						field: 'panel.thickness',
						title: 'Thick',
						width: 100,
					},
					{
						field: 'sheet.board.name',
						title: 'Material',
						width: 300,
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 150,
					},
				],
			},
		},
		{
			id: 'patterns',
			name: 'patterns',
			description: 'list of all patterns in the project',
			url: '/patterns',
			type: 'table',
			resource: 'patterns',
			title: 'List of Patterns',
			table: {
				title: 'Patterns',
				columns: [
					{
						field: 'name',
						title: 'Name',
						width: 'auto',
						formatter: 'link',
						formatterParams: {
							url: '/patterns/:key',
						},
					},
					{
						field: 'quantityPanels',
						title: 'quantityPanels',
						width: '200',
					},
					{
						field: 'length',
						title: 'Length',
						width: '200',
					},
					{
						field: 'width',
						title: 'Width',
						width: '200',
					},
					{
						field: 'thickness',
						title: 'Thickness',
						width: '200',
					},
					{
						field: 'refBoard',
						title: 'Material',
						width: '200',
					},
					{
						field: 'quantity',
						title: 'Qty',
						width: 100,
					},
				],
			},
		},
		{
			id: 'hardware',
			name: 'hardware',
			description: 'list of all hardware in the project',
			url: '/hardware',
			type: 'table',
			resource: 'hardware',
			title: 'List of Hardware',
			table: {
				title: 'Hardware',
				splitBy: [
					{
						field: 'frames.name',
						buttonLabel: 'Frame',
					},
				],
				columns: [
					{
						field: 'documents.IMG_HARDWARE.relativeURI',
						title: '',
						formatter: 'image',
						hozAlign: 'center',
						width: 150,
					},
					{
						field: 'name',
						title: 'Name',
						width: 'auto',
						formatter: 'link',
						formatterParams: {
							url: '/hardware/:key',
						},
					},
					{
						field: 'swcps.Description',
						title: 'Description',
						width: 250,
					},
					{
						field: 'swcps.Reference',
						title: 'Reference',
						width: 250,
					},
					{
						field: 'swcps.Supplier',
						title: 'Supplier',
						width: 250,
					},
					{
						field: 'quantityInParent',
						title: 'Qty',
						width: 100,
					},
					{
						field: 'costUnit',
						title: 'Unit Cost',
						width: 200,
						formatter: 'money',
						formatterParams: {
							decimal: '.',
							thousand: ',',
							symbol: '₹',
						},
					},
				],
			},
		},
		{
			id: 'summary',
			name: 'summary',
			description: 'summary of all materials in the project',
			url: '/summary',
			type: 'layout',
			title: 'Summary',
			resource: 'root',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'arraySum(cost, tables)',
								prefix: 'Total Cost: ',
								range: '10,1:12,1',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
							},
						],
					},
				},
				{
					id: 'boards',
					name: 'boards',
					type: 'table',
					resource: 'boardMaterials',
					table: {
						title: 'Boards',
						columns: [
							{
								field: 'name',
								title: 'Material',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '20%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '12%',
							},
							{
								field: 'quantity',
								title: 'Quantity',
								width: '12%',
							},
							{
								field: 'costUnit',
								title: 'Unit Cost',
								width: '14%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
							},
							{
								field: 'cost',
								title: 'Cost',
								width: '12%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
								bottomCalc: 'sum',
								bottomCalcFormatter: 'money',
								bottomCalcFormatterParams: {
									symbol: '₹',
								},
							},
						],
					},
				},
				{
					id: 'panels',
					name: 'panels',
					type: 'table',
					resource: 'panelMaterials',
					table: {
						title: 'Materials',
						initialFilter: [
							{
								field: 'quantity',
								type: '!=',
								value: 0,
							},
						],
						groupBy: 'category',
						columns: [
							{
								field: 'name',
								title: 'Material',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '20%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '12%',
							},
							{
								field: 'format(quantity, 3) + " "+ unitOfMeasure',
								title: 'Quantity',
								width: '12%',
							},
							{
								field: 'costUnit',
								title: 'Unit Cost',
								width: '14%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
							},
							{
								field: 'cost',
								title: 'Cost',
								width: '12%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
								bottomCalc: 'sum',
								bottomCalcFormatter: 'money',
								bottomCalcFormatterParams: {
									symbol: '₹',
								},
							},
						],
					},
				},
				{
					id: 'laminates',
					name: 'laminates',
					type: 'table',
					resource: 'laminateMaterials',
					table: {
						title: 'Laminates',
						columns: [
							{
								field: 'name',
								title: 'Material',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '20%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '12%',
							},
							{
								field: 'format(quantity, 2) + " "+ unitOfMeasure',
								title: 'Quantity',
								width: '12%',
							},
							{
								field: 'costUnit',
								title: 'Unit Cost',
								width: '14%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
							},
							{
								field: 'cost',
								title: 'Cost',
								width: '12%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
								bottomCalc: 'sum',
								bottomCalcFormatter: 'money',
								bottomCalcFormatterParams: {
									symbol: '₹',
								},
							},
						],
					},
				},
				{
					id: 'edgebands',
					name: 'edgebands',
					type: 'table',
					resource: 'edgebandMaterials',
					table: {
						title: 'Edgebands',
						columns: [
							{
								field: 'name',
								title: 'Material',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '20%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '12%',
							},
							{
								field: 'format(quantity, 2) + " "+ unitOfMeasure',
								title: 'Quantity',
								width: '12%',
							},
							{
								field: 'costUnit',
								title: 'Unit Cost',
								width: '14%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
							},
							{
								field: 'cost',
								title: 'Cost',
								width: '12%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
								bottomCalc: 'sum',
								bottomCalcFormatter: 'money',
								bottomCalcFormatterParams: {
									symbol: '₹',
								},
							},
						],
					},
				},
				{
					id: 'weldments',
					name: 'weldments',
					type: 'table',
					resource: 'weldmentMaterials',
					table: {
						title: 'Weldments',
						columns: [
							{
								field: 'name',
								title: 'Material',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '32%',
							},
							{
								field: 'format(quantity, 2) + " "+ unitOfMeasure',
								title: 'Quantity',
								width: '12%',
							},
							{
								field: 'costUnit',
								title: 'Unit Cost',
								width: '14%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
							},
							{
								field: 'cost',
								title: 'Cost',
								width: '12%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
								bottomCalc: 'sum',
								bottomCalcFormatter: 'money',
								bottomCalcFormatterParams: {
									symbol: '₹',
								},
							},
						],
					},
				},
				{
					id: 'hardware',
					name: 'hardware',
					type: 'table',
					resource: 'hardware',
					table: {
						title: 'Hardware',
						columns: [
							{
								field: 'name',
								title: 'Name',
								width: 'auto',
							},
							{
								field: 'configuration',
								title: 'Configuration',
								width: '20%',
							},
							{
								field: 'swcps.Reference',
								title: 'Reference',
								width: '12%',
							},
							{
								field: 'quantity',
								title: 'Quantity',
								width: '12%',
							},
							{
								field: 'costUnit',
								title: 'Unit Cost',
								width: '14%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
							},
							{
								field: 'cost',
								title: 'Cost',
								width: '12%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
								bottomCalc: 'sum',
								bottomCalcFormatter: 'money',
								bottomCalcFormatterParams: {
									symbol: '₹',
								},
							},
						],
					},
				},
				{
					id: 'panelProcesses',
					name: 'panelProcesses',
					type: 'table',
					resource: 'panelProcesses',
					table: {
						title: 'Panel Process',
						columns: [
							{
								field: 'name',
								title: 'Name',
								width: '25%',
							},
							{
								field: 'quantity',
								title: 'Quantity',
								width: '25%',
								formatter: 'number',
								formatterParams: {
									precision: 2,
								},
							},
							{
								field: 'costUnit',
								title: 'Unit Cost',
								width: '25%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
							},
							{
								field: 'cost',
								title: 'Cost',
								width: '25%',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
								bottomCalc: 'sum',
								bottomCalcFormatter: 'money',
								bottomCalcFormatterParams: {
									symbol: '₹',
								},
							},
						],
					},
				},
				{
					id: 'main-end',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'arraySum(cost, tables)',
								prefix: 'Total Cost: ',
								range: '10,1:12,1',
								formatter: 'money',
								formatterParams: {
									symbol: '₹',
								},
							},
						],
					},
				},
			],
		},
		{
			id: 'picking-list',
			name: 'picking-list',
			description: 'list of materials for picking',
			url: '/picking-list',
			type: 'layout',
			title: 'Picking List',
			sections: [
				{
					id: 'Boards',
					name: 'Boards',
					type: 'table',
					resource: 'boardMaterials',
					table: {
						title: 'Boards',
						columns: [
							{
								field: 'name',
								title: 'Material',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '20%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '12%',
							},
							{
								field: 'quantity',
								title: 'Quantity',
								width: '12%',
							},
						],
					},
				},
				{
					id: 'Materials',
					name: 'Materials',
					type: 'table',
					resource: 'panelMaterials',
					table: {
						title: 'Materials',
						groupBy: 'category',
						columns: [
							{
								field: 'name',
								title: 'Material',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '20%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '12%',
							},
							{
								field: 'format(quantity, 2) + " "+ unitOfMeasure',
								title: 'Quantity',
								width: '12%',
							},
						],
					},
				},
				{
					id: 'Laminates',
					name: 'Laminates',
					type: 'table',
					resource: 'laminateMaterials',
					table: {
						title: 'Laminates',
						columns: [
							{
								field: 'name',
								title: 'Material',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '20%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '12%',
							},
							{
								field: 'format(quantity, 2) + " "+ unitOfMeasure',
								title: 'Quantity',
								width: '12%',
							},
						],
					},
				},
				{
					id: 'Edgebands',
					name: 'Edgebands',
					type: 'table',
					resource: 'edgebandMaterials',
					table: {
						title: 'Edgebands',
						columns: [
							{
								field: 'name',
								title: 'Material',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '20%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '12%',
							},
							{
								field: 'format(quantity, 2) + " "+ unitOfMeasure',
								title: 'Quantity',
								width: '12%',
							},
						],
					},
				},
				{
					id: 'Weldments',
					name: 'Weldments',
					type: 'table',
					resource: 'weldmentMaterials',
					table: {
						title: 'Weldments',
						columns: [
							{
								field: 'name',
								title: 'Material',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '32%',
							},
							{
								field: 'format(quantity, 2) + " "+ unitOfMeasure',
								title: 'Quantity',
								width: '12%',
							},
						],
					},
				},
				{
					id: 'Hardware',
					name: 'Hardware',
					type: 'table',
					resource: 'hardware',
					table: {
						title: 'Hardware',
						columns: [
							{
								field: 'name',
								title: 'Name',
								width: 'auto',
							},
							{
								field: 'configuration',
								title: 'Configuration',
								width: '20%',
							},
							{
								field: 'swcps.Reference',
								title: 'Reference',
								width: '12%',
							},
							{
								field: 'quantity',
								title: 'Quantity',
								width: '12%',
							},
						],
					},
				},
			],
		},
		{
			id: 'excluded',
			name: 'excluded',
			description: 'list of all excluded items in the project',
			url: '/excluded',
			type: 'table',
			resource: 'excluded',
			title: 'List of Excluded Items',
			table: {
				title: 'Excluded',
				columns: [
					{
						field: 'name',
						title: 'Name',
						width: '40%',
						formatter: 'component',
					},
					{
						field: 'swcps.Description',
						title: 'Description',
						width: '30%',
					},
					{
						field: 'configuration',
						title: 'Configuration',
						width: '30%',
					},
				],
			},
		},
		{
			id: 'panel-details',
			name: 'panel-details',
			description: 'details of a single panel',
			url: '/panels/:key',
			resource: 'panels',
			type: 'layout',
			title: 'Panel Details',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'part.documents.IMG_PART.relativeURI',
								formatter: 'image',
								formatterParams: {
									edrawings: 'documents.EDRAWINGS_PANEL.relativeURI',
								},
								range: '1,1:12,6',
							},
							{
								field: 'swcps.ID',
								prefix: 'id: ',
								range: '4,7:4,7',
							},
							{
								field: 'name',
								prefix: 'Name: ',
								range: '5,7:11,7',
							},
							{
								field: 'documents.PDF_PANEL.relativeURI',
								prefix: 'pdf: ',
								formatter: 'link',
								range: '12,7:12,7',
							},
							{
								field: 'swcps.Description',
								prefix: 'Description: ',
								range: '4,8:7,8',
							},
							{
								field: 'edging',
								prefix: 'Edging: ',
								range: '8,8:12,8',
								formatter: 'edgingCode',
							},
							{
								field: 'material.key',
								prefix: 'Material: ',
								range: '4,10:7,10',
							},
							{
								field: 'length',
								prefix: 'Length: ',
								formatter: 'text',
								range: '4,9:6,9',
							},
							{
								field: 'width',
								prefix: 'Width: ',
								formatter: 'text',
								range: '7,9:9,9',
							},
							{
								field: 'thickness',
								prefix: 'Thickness: ',
								formatter: 'text',
								range: '10,9:12,9',
							},
							{
								field: 'quantity',
								prefix: 'Quantity: ',
								formatter: 'text',
								range: '8,10:12,10',
							},
							{
								field: 'swcps.Comments',
								prefix: 'Comments: ',
								formatter: 'text',
								range: '4,11:12,12',
								wrapText: true,
							},
							{
								field: 'documents.IMG_PANEL.relativeURI',
								formatter: 'image',
								range: '1,7:3,12',
							},
						],
					},
				},
				{
					id: 'layers',
					name: 'layers',
					type: 'table',
					resource: 'layers',
					table: {
						title: 'Layers',
						columns: [
							{
								field: 'name',
								title: 'Name',
								width: '33%',
							},
							{
								field: 'material.name',
								title: 'Material',
								width: '33%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '33%',
							},
						],
					},
				},
				{
					id: 'laminates',
					name: 'laminates',
					type: 'table',
					resource: 'laminates',
					table: {
						title: 'Laminates',
						columns: [
							{
								field: 'name',
								title: 'Laminate',
								width: '33%',
							},
							{
								field: 'material.name',
								title: 'Material',
								width: '33%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '33%',
							},
						],
					},
				},
				{
					id: 'edgebands',
					name: 'edgebands',
					type: 'table',
					resource: 'edgebands',
					table: {
						title: 'Edgebands',
						columns: [
							{
								field: 'name',
								title: 'Edgebands',
								width: '33%',
							},
							{
								field: 'material.name',
								title: 'Material',
								width: '33%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '33%',
							},
						],
					},
				},
				{
					id: 'processZones',
					name: 'processZones',
					type: 'table',
					resource: 'processZones',
					table: {
						title: 'Process Zones',
						columns: [
							{
								field: 'panelProcess.name',
								title: 'Process',
								width: '50%',
							},
							{
								field: 'name',
								title: 'Zone',
								width: '50%',
							},
						],
					},
				},
				{
					id: 'programs',
					name: 'programs',
					type: 'table',
					resource: 'programs',
					table: {
						title: 'Programs',
						columns: [
							{
								field: 'name',
								title: 'Name',
								width: '50%',
								formatter: 'link',
								formatterParams: {
									url: '/programs/:key',
								},
							},
							{
								field: 'machine',
								title: 'Code',
								width: '50%',
							},
						],
					},
				},
			],
		},
		{
			id: 'program-details',
			name: 'program-details',
			description: 'details of a single program',
			url: '/programs/:key',
			resource: 'programs',
			type: 'layout',
			title: 'Program Details',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'part.documents.IMG_PART.relativeURI',
								formatter: 'image',
								formatterParams: {
									edrawings: 'panel.documents.EDRAWINGS_PANEL.relativeURI',
								},
								range: '1,1:12,6',
							},
							{
								field: 'name',
								prefix: 'Name: ',
								range: '4,7:11,7',
							},
							{
								field: 'programDocument.relativeURI',
								prefix: 'code: ',
								formatter: 'link',
								range: '12,7:12,7',
							},
							{
								field: 'swcps.Description',
								prefix: 'Description: ',
								range: '4,8:8,8',
							},
							{
								field: 'configuration',
								prefix: 'Configuration: ',
								range: '9,8:12,8',
							},
							{
								field: 'material.name',
								prefix: 'Material: ',
								range: '4,10:8,10',
							},
							{
								field: 'length',
								prefix: 'Length: ',
								formatter: 'text',
								range: '4,9:6,9',
							},
							{
								field: 'width',
								prefix: 'Width: ',
								formatter: 'text',
								range: '7,9:9,9',
							},
							{
								field: 'thickness',
								prefix: 'Thickness: ',
								formatter: 'text',
								range: '10,9:12,9',
							},
							{
								field: 'quantity',
								prefix: 'Quantity: ',
								formatter: 'text',
								range: '9,10:12,10',
							},
							{
								field: 'comments',
								prefix: 'Comments: ',
								formatter: 'text',
								range: '4,11:12,12',
							},
							{
								field: 'documents.IMG_PROGRAM.relativeURI',
								formatter: 'image',
								range: '1,7:3,12',
							},
						],
					},
				},
				{
					id: 'tools',
					name: 'tools',
					type: 'table',
					resource: 'tools',
					table: {
						title: 'Tools',
						columns: [
							{
								field: 'name',
								title: 'Name',
							},
							{
								field: 'number',
								title: 'number',
							},
							{
								field: 'diameter',
								title: 'diameter',
							},
						],
					},
				},
			],
		},
		{
			id: 'program-part-details',
			name: 'program-part-details',
			description: 'details of a single program part (nested panel)',
			url: '/program-parts/:key',
			resource: 'programParts',
			type: 'layout',
			title: 'Program Part Details',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'documents.IMG_PROGRAM_PART_HIGHLIGHT.relativeURI',
								formatter: 'image',
								range: '1,1:12,6',
							},
							{
								field: 'swcps.ID',
								prefix: 'id: ',
								range: '4,7:4,7',
							},
							{
								field: 'name',
								prefix: 'Name: ',
								range: '5,7:11,7',
							},
							{
								field: 'documents.PDF_PANEL.relativeURI',
								prefix: 'pdf: ',
								formatter: 'link',
								range: '12,7:12,7',
							},
							{
								field: 'swcps.Description',
								prefix: 'Description: ',
								range: '4,8:7,8',
							},
							{
								field: 'configuration',
								prefix: 'Configuration: ',
								range: '8,8:12,8',
							},
							{
								field: 'panel.material.name',
								prefix: 'Material: ',
								range: '4,10:7,10',
							},
							{
								field: 'panel.length',
								prefix: 'Length: ',
								formatter: 'text',
								range: '4,9:6,9',
							},
							{
								field: 'panel.width',
								prefix: 'Width: ',
								formatter: 'text',
								range: '7,9:9,9',
							},
							{
								field: 'panel.thickness',
								prefix: 'Thickness: ',
								formatter: 'text',
								range: '10,9:12,9',
							},
							{
								field: 'quantity',
								prefix: 'Quantity: ',
								formatter: 'text',
								range: '8,10:12,10',
							},
							{
								field: 'comments',
								prefix: 'Comments: ',
								formatter: 'text',
								range: '4,11:12,12',
							},
							{
								field: 'documents.IMG_PROGRAM_PART.relativeURI',
								formatter: 'image',
								range: '1,7:3,12',
							},
						],
					},
				},
				{
					id: 'panel.layers',
					name: 'panel.layers',
					type: 'table',
					resource: 'panel.layers',
					table: {
						title: 'Layers',
						columns: [
							{
								field: 'name',
								title: 'Name',
								width: '33%',
							},
							{
								field: 'material.name',
								title: 'Material',
								width: '33%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '33%',
							},
						],
					},
				},
				{
					id: 'panel.laminates',
					name: 'panel.laminates',
					type: 'table',
					resource: 'panel.laminates',
					table: {
						title: 'Laminates',
						columns: [
							{
								field: 'name',
								title: 'Laminate',
								width: '33%',
							},
							{
								field: 'material.name',
								title: 'Material',
								width: '33%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '33%',
							},
						],
					},
				},
				{
					id: 'panel.edgebands',
					name: 'panel.edgebands',
					type: 'table',
					resource: 'panel.edgebands',
					table: {
						title: 'Edgebands',
						columns: [
							{
								field: 'name',
								title: 'Edgebands',
								width: '33%',
							},
							{
								field: 'material.name',
								title: 'Material',
								width: '33%',
							},
							{
								field: 'thickness',
								title: 'Thickness',
								width: '33%',
							},
						],
					},
				},
				{
					id: 'panel.processZones',
					name: 'panel.processZones',
					type: 'table',
					resource: 'panel.processZones',
					table: {
						title: 'Panel Process',
						columns: [
							{
								field: 'name',
								title: 'Process',
								width: '50%',
							},
							{
								field: 'ZoneName',
								title: 'Zone',
								width: '50%',
							},
						],
					},
				},
				{
					id: 'panel.programs',
					name: 'panel.programs',
					type: 'table',
					resource: 'panel.programs',
					table: {
						title: 'Programs',
						columns: [
							{
								field: 'name',
								title: 'Name',
								width: '50%',
								formatter: 'link',
								formatterParams: {
									url: '/programs/:key',
								},
							},
							{
								field: 'machine',
								title: 'Code',
								width: '50%',
							},
						],
					},
				},
			],
		},
		{
			id: 'frame-details',
			name: 'frame-details',
			description: 'details of a single frame',
			url: '/frames/:key',
			resource: 'frames',
			type: 'layout',
			title: 'Frame Details',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'documents.IMG_FRAME.relativeURI',
								formatter: 'image',
								formatterParams: {
									edrawings: 'documents.EDRAWINGS_FRAME.relativeURI',
								},
								range: '1,1:12,6',
							},
							{
								field: 'swcps.ID',
								prefix: 'id: ',
								range: '4,7:4,7',
							},
							{
								field: 'name',
								prefix: 'Name: ',
								range: '5,7:11,7',
							},
							{
								field: 'documents.PDF_FRAME.relativeURI',
								prefix: 'pdf: ',
								formatter: 'link',
								range: '12,7:12,7',
							},
							{
								field: 'swcps.Description',
								prefix: 'Description: ',
								range: '4,8:8,8',
							},
							{
								field: 'configuration',
								prefix: 'Configuration: ',
								range: '9,8:12,8',
							},
							{
								field: 'panels',
								prefix: 'Materials: ',
								range: '4,10:8,10',
								formatter: 'list',
								formatterParams: {
									valueMap: 'material.name',
									removeDuplicates: true,
									delimiter: ' | ',
								},
							},
							{
								field: 'quantity',
								prefix: 'Quantity: ',
								formatter: 'text',
								range: '9,10:12,10',
							},
							{
								field: 'swcps.Comments',
								prefix: 'Comments: ',
								range: '4,11:12,12',
								wrapText: true,
							},
							{
								field: 'documents.IMG_FRAME.relativeURI',
								formatter: 'image',
								range: '1,7:3,12',
							},
							{
								field: 'height',
								prefix: 'Height: ',
								range: '4,9:6,9',
							},
							{
								field: 'width',
								prefix: 'Width: ',
								range: '7,9:9,9',
							},
							{
								field: 'depth',
								prefix: 'Depth: ',
								range: '10,9:12,9',
							},
						],
					},
				},
				{
					id: 'subFrames',
					name: 'subFrames',
					type: 'table',
					resource: 'subFrames',
					table: {
						title: 'Sub Frames',
						columns: [
							{
								field: 'swcps.ID',
								title: '#',
								width: '10%',
							},
							{
								field: 'name',
								title: 'Part Name',
								width: 'auto',
								formatter: 'link',
								formatterParams: {
									url: '/sub-frames/:key',
								},
							},
							{
								field: 'swcps.Description',
								title: 'Description',
								width: '40%',
							},
						],
					},
				},
				{
					id: 'panels',
					name: 'panels',
					type: 'table',
					resource: 'panels',
					table: {
						title: 'Panels',
						dataTreeElementColumn: 'name',
						treeBy: [
							{
								field: 'swcps.CombineID',
								flattenSingleChildGroups: false,
								parentValues: [
									{
										field: 'name',
										prefix: 'Combined Panel ',
										value: '"Combined Panel " + swcps.CombineID',
									},
								],
								parentCalculations: [
									{
										field: 'quantityInParent',
										type: 'sum',
									},
								],
							},
						],
						columns: [
							{
								field: 'swcps.ID',
								title: '#',
								width: '5%',
							},
							{
								field: 'name',
								title: 'Part Name',
								width: 'auto',
								formatter: 'link',
								formatterParams: {
									url: '/panels/:key',
								},
							},
							{
								field: 'swcps.Description',
								title: 'Description',
								width: '20%',
							},
							{
								field: 'material.name',
								title: 'Material',
								width: '15%',
							},
							{
								field: 'quantityInParent',
								title: 'Qty in Frame',
								width: '10%',
							},
							{
								field: 'quantity',
								title: 'Qty in Project',
								width: '10%',
							},
						],
					},
				},
				{
					id: 'hardware',
					name: 'hardware',
					type: 'table',
					resource: 'hardware',
					table: {
						title: 'Hardware',
						columns: [
							{
								field: 'name',
								title: 'Name',
								width: 'auto',
								formatter: 'link',
								formatterParams: {
									url: '/hardware/:key',
								},
							},
							{
								field: 'swcps.Description',
								title: 'Description',
								width: '25%',
							},
							{
								field: 'configuration',
								title: 'Configuration',
								width: '25%',
							},
							{
								field: 'supplier',
								title: 'Supplier',
								width: '10%',
							},
							{
								field: 'quantityInParent',
								title: 'Qty in Frame',
								width: 150,
							},
							{
								field: 'quantity',
								title: 'Qty in Project',
								width: 150,
							},
						],
					},
				},
				{
					id: 'programs',
					name: 'programs',
					type: 'table',
					resource: 'programs',
					table: {
						title: 'Programs',
						columns: [
							{
								field: 'name',
								title: 'Program',
								width: '50%',
								formatter: 'link',
								formatterParams: {
									url: '/programs/:key',
								},
							},
							{
								field: 'quantity',
								title: 'Qty',
								width: '50%',
							},
						],
					},
				},
				{
					id: 'weldments',
					name: 'weldments',
					type: 'table',
					resource: 'weldments',
					table: {
						title: 'Weldments',
						treeBy: [
							{
								field: 'cutlist',
								flattenSingleChildGroups: false,
								parentValues: [
									{
										field: 'name',
										value: 'cutlist',
									},
								],
								parentCalculations: [
									{
										field: 'quantity',
										type: 'sum',
									},
								],
							},
						],
						columns: [
							{
								field: 'name',
								title: 'Name',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '250',
							},
							{
								field: 'length',
								title: 'Length',
								width: '160',
							},
							{
								field: 'lengthTotal',
								title: 'Length Total',
								width: '160',
							},
							{
								field: 'quantity',
								title: 'Qty',
								width: 100,
							},
						],
					},
				},
			],
		},
		{
			id: 'sub-frame-details',
			name: 'sub-frame-details',
			description: 'details of a single sub frame',
			url: '/sub-frames/:key',
			resource: 'subFrames',
			type: 'layout',
			title: 'Sub Frame Details',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'documents.IMG_SUBFRAME.relativeURI',
								formatter: 'image',
								formatterParams: {
									edrawings: 'documents.EDRAWINGS_SUBFRAME.relativeURI',
								},
								range: '1,1:12,6',
							},
							{
								field: 'swcps.ID',
								prefix: 'id: ',
								range: '4,7:4,7',
							},
							{
								field: 'name',
								prefix: 'Name: ',
								range: '5,7:11,7',
							},
							{
								field: 'documents.PDF_FRAME.relativeURI',
								prefix: 'pdf: ',
								formatter: 'link',
								range: '12,7:12,7',
							},
							{
								field: 'swcps.Description',
								prefix: 'Description: ',
								range: '4,8:8,8',
							},
							{
								field: 'configuration',
								prefix: 'Configuration: ',
								range: '9,8:12,8',
							},
							{
								field: 'panels',
								prefix: 'Materials: ',
								range: '4,9:8,9',
								formatter: 'list',
								formatterParams: {
									valueMap: 'material.name',
									removeDuplicates: true,
									delimiter: ' | ',
								},
							},
							{
								field: 'quantity',
								prefix: 'Quantity: ',
								formatter: 'text',
								range: '9,9:12,9',
							},
							{
								field: 'swcps.Comments',
								prefix: 'Comments: ',
								range: '4,10:12,11',
								wrapText: true,
							},
							{
								field: 'documents.IMG_SUBFRAME.relativeURI',
								formatter: 'image',
								range: '1,7:3,11',
							},
						],
					},
				},
				{
					id: 'subFrames',
					name: 'subFrames',
					type: 'table',
					resource: 'subFrames',
					table: {
						title: 'Sub Frames',
						columns: [
							{
								field: 'swcps.ID',
								title: '#',
								width: '10%',
							},
							{
								field: 'name',
								title: 'Part Name',
								width: 'auto',
								formatter: 'link',
								formatterParams: {
									url: '/sub-frames/:key',
								},
							},
							{
								field: 'swcps.Description',
								title: 'Description',
								width: '40%',
							},
						],
					},
				},
				{
					id: 'panels',
					name: 'panels',
					type: 'table',
					resource: 'panels',
					table: {
						title: 'Panels',
						columns: [
							{
								field: 'swcps.ID',
								title: '#',
								width: '5%',
							},
							{
								field: 'name',
								title: 'Part Name',
								width: 'auto',
								formatter: 'link',
								formatterParams: {
									url: '/panels/:key',
								},
							},
							{
								field: 'swcps.Description',
								title: 'Description',
								width: '20%',
							},
							{
								field: 'material.name',
								title: 'Material',
								width: '15%',
							},
							{
								field: 'quantityInParent',
								title: 'Qty',
								width: '10%',
							},
						],
					},
				},
				{
					id: 'hardware',
					name: 'hardware',
					type: 'table',
					resource: 'hardware',
					table: {
						title: 'Hardware',
						columns: [
							{
								field: 'name',
								title: 'Name',
								formatter: 'link',
								formatterParams: {
									url: '/hardware/:key',
								},
							},
							{
								field: 'configuration',
								title: 'Configuration',
								width: '25%',
							},
							{
								field: 'supplier',
								title: 'Supplier',
								width: '10%',
							},
							{
								field: 'quantityInParent',
								title: 'Qty',
								width: 100,
							},
						],
					},
				},
				{
					id: 'programs',
					name: 'programs',
					type: 'table',
					resource: 'programs',
					table: {
						title: 'Programs',
						columns: [
							{
								field: 'name',
								title: 'Program',
								width: '50%',
								formatter: 'link',
								formatterParams: {
									url: '/programs/:key',
								},
							},
							{
								field: 'quantity',
								title: 'Qty',
								width: '50%',
							},
						],
					},
				},
				{
					id: 'weldments',
					name: 'weldments',
					type: 'table',
					resource: 'weldments',
					table: {
						title: 'Weldments',
						treeBy: [
							{
								field: 'cutlist',
								flattenSingleChildGroups: false,
								parentValues: [
									{
										field: 'name',
										value: 'cutlist',
									},
								],
								parentCalculations: [
									{
										field: 'quantity',
										type: 'sum',
									},
								],
							},
						],
						columns: [
							{
								field: 'name',
								title: 'Name',
								width: 'auto',
							},
							{
								field: 'description',
								title: 'Description',
								width: '250',
							},
							{
								field: 'length',
								title: 'Length',
								width: '160',
							},
							{
								field: 'lengthTotal',
								title: 'Length Total',
								width: '160',
							},
							{
								field: 'cutlist',
								title: 'cutlist',
								width: '250',
							},
							{
								field: 'quantity',
								title: 'Qty',
								width: 100,
							},
						],
					},
				},
			],
		},
		{
			id: 'sheet-details',
			name: 'sheet-details',
			description: 'details of a single nested sheet',
			url: '/sheets/:key',
			resource: 'sheets',
			type: 'layout',
			title: 'Sheet Details',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'documents.IMG_SHEET.relativeURI',
								formatter: 'image',
								formatterParams: {
									edrawings: 'documents.EDRAWINGS_SHEET.relativeURI',
								},
								range: '1,1:12,6',
							},
							{
								field: 'name',
								prefix: 'Name: ',
								range: '1,7:8,7',
							},
							{
								field: 'length',
								prefix: 'Length: ',
								range: '1,8:6,8',
							},
							{
								field: 'width',
								prefix: 'Width: ',
								range: '1,9:6,9',
							},
							{
								field: 'thickness',
								prefix: 'Thickness: ',
								range: '1,10:6,10',
							},
							{
								field: 'quantity',
								prefix: 'Quantity: ',
								formatter: 'text',
								range: '7,8:8,8',
							},
							{
								field: 'refBoard',
								prefix: 'Material: ',
								formatter: 'text',
								range: '7,9:8,9',
							},
							{
								field: 'comments',
								prefix: 'Comments: ',
								formatter: 'text',
								range: '1,11:8,11',
							},
							{
								field: 'programDocument.relativeURI',
								prefix: 'code: ',
								formatter: 'link',
								range: '7,10:8,10',
							},
							{
								field: 'root',
								formatter: 'chart',
								formatterParams: {
									legendTitle: 'Surface Usage',
									fields: [
										{
											field: 'variables.PROG_NSHEETSURFACEUSEDBYPARTS',
											legendLabel: 'panel surface',
										},
										{
											field: 'variables.PROG_NSHEETSURFACEUSEDBYSCRAPS',
											legendLabel: 'waste surface',
										},
									],
								},
								range: '9,7:12,11',
							},
						],
					},
				},
				{
					id: 'programParts',
					name: 'programParts',
					type: 'table',
					resource: 'programParts',
					table: {
						title: 'Panels',
						columns: [
							{
								field: 'programPartId',
								title: 'Nesting ID',
								width: 120,
							},
							{
								field: 'name',
								title: 'Name',
								width: 'auto',
								formatter: 'link',
								formatterParams: {
									url: '/program-parts/:key',
								},
							},
							{
								field: 'part.swcps.Description',
								title: 'Description',
								width: 'auto',
							},
						],
					},
				},
				{
					id: 'tools',
					name: 'tools',
					type: 'table',
					resource: 'tools',
					table: {
						title: 'Tools',
						columns: [
							{
								field: 'name',
								title: 'Name',
							},
							{
								field: 'number',
								title: 'number',
							},
							{
								field: 'diameter',
								title: 'diameter',
							},
						],
					},
				},
			],
		},
		{
			id: 'sheet-details-simplified',
			name: 'sheet-details-simplified',
			description: 'details of a single nested sheet',
			url: '/sheets-simple/:key',
			resource: 'sheets',
			type: 'layout',
			title: 'Sheet Details',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'documents.IMG_SHEET.relativeURI',
								formatter: 'image',
								range: '7,1:12,6',
							},
							{
								field: 'name',
								prefix: 'Name: ',
								range: '1,1:5,1',
							},
							{
								field: 'length',
								prefix: 'Length: ',
								range: '1,2:4,2',
							},
							{
								field: 'quantity',
								prefix: 'Quantity: ',
								formatter: 'text',
								range: '6,1:6,1',
							},
							{
								field: 'refBoard',
								prefix: 'Material: ',
								formatter: 'text',
								range: '1,5:4,5',
							},
							{
								field: 'programDocument.relativeURI',
								prefix: 'code: ',
								formatter: 'link',
								range: '1,6:4,6',
							},
							{
								field: 'root',
								formatter: 'chart',
								formatterParams: {
									legendTitle: 'Surface Usage',
									fields: [
										{
											field: 'variables.PROG_NSHEETSURFACEUSEDBYPARTS',
											legendLabel: 'panel surface',
										},
										{
											field: 'variables.PROG_NSHEETSURFACEUSEDBYSCRAPS',
											legendLabel: 'waste surface',
										},
									],
								},
								range: '5,2:6,6',
							},
							{
								field: 'width',
								prefix: 'Width: ',
								range: '1,3:4,3',
							},
							{
								field: 'thickness',
								prefix: 'Thickness: ',
								range: '1,4:4,4',
							},
						],
					},
				},
			],
		},
		{
			id: 'sheet-detailed-list',
			name: 'sheet detailed list',
			url: '/sheet-detailed-list',
			type: 'layout',
			title: 'Sheet Detailed List',
			resource: 'project',
			sections: [
				{
					id: 'grid',
					name: 'grid',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'SelectField',
								prefix: '',
								range: '1,1:6,5',
								formatter: 'chart',
								formatterParams: {
									fields: [
										{
											field: 'arraySum(totalParts, root.sheets)',
											legendLabel: 'Panels',
										},
										{
											field: 'arraySum(totalOffcuts, root.sheets)',
											legendLabel: 'Offcuts',
										},
									],
									legendTitle: 'Quantities',
								},
							},
							{
								field: 'SelectField',
								prefix: '',
								range: '7,1:12,5',
								formatter: 'chart',
								formatterParams: {
									fields: [
										{
											field: 'variables.NESTING_OFFCUTS_AREA_RATIO',
											legendLabel: 'Offcuts',
										},
										{
											field: 'variables.NESTING_WASTE_AREA_RATIO',
											legendLabel: 'Waste',
										},
										{
											field: 'variables.NESTING_SCRAPS_AREA_RATIO',
											legendLabel: 'Scrap',
										},
									],
									legendTitle: 'Percentages',
								},
							},
						],
					},
					resource: 'project',
				},
				{
					id: 'loop',
					name: 'loop',
					type: 'loop',
					loop: {
						source: 'sheet-details-simplified',
					},
				},
			],
			description: 'List of all sheets',
		},
		{
			id: 'pattern-details',
			name: 'pattern-details',
			description: 'details of a single pattern',
			url: '/patterns/:key',
			resource: 'patterns',
			type: 'layout',
			title: 'Pattern Details',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'pattern',
								formatter: 'pattern',
								range: '1,1:12,6',
								formatterParams: {
									panelLabel: 'swcps.ID',
									showStatistics: true,
									printStatistics: true,
									showCutList: true,
									printCutList: true,
									showPanelLabel: true,
									showPanelDimensions: true,
									showWasteLabel: false,
									showWasteDimensions: false,
									showTrimLabel: false,
									showTrimDimensions: false,
								},
							},
							{
								field: 'name',
								prefix: 'Name: ',
								range: '1,7:8,7',
							},
							{
								field: 'length',
								prefix: 'Length: ',
								range: '1,8:4,8',
							},
							{
								field: 'width',
								prefix: 'Width: ',
								range: '5,8:8,8',
							},
							{
								field: 'thickness',
								prefix: 'Thickness: ',
								range: '1,9:4,9',
							},
							{
								field: 'refBoard',
								prefix: 'Material: ',
								formatter: 'text',
								range: '5,9:8,9',
							},
							{
								field: 'quantityPanels',
								prefix: 'Panels: ',
								range: '1,10:2,10',
							},
							{
								field: 'quantityTrims',
								prefix: 'trims: ',
								range: '3,10:4,10',
							},
							{
								field: 'quantityWaste',
								prefix: 'waste: ',
								range: '5,10:6,10',
							},
							{
								field: 'quantityCuts',
								prefix: 'cuts: ',
								range: '7,10:8,10',
							},
							{
								field: 'comments',
								prefix: 'Comments: ',
								range: '1,11:8,12',
							},
							{
								field: 'root',
								formatter: 'chart',
								range: '9,7:12,12',
								formatterParams: {
									legendTitle: 'Area Usage',
									fields: [
										{
											field: 'areaPanels',
											legendLabel: 'panels',
										},
										{
											field: 'areaWaste',
											legendLabel: 'waste',
										},
										{
											field: 'areaTrims',
											legendLabel: 'trims',
										},
										{
											field: 'areaCuts',
											legendLabel: 'cuts',
										},
									],
								},
							},
						],
					},
				},
				{
					id: 'panels',
					name: 'panels',
					type: 'table',
					resource: 'panels',
					table: {
						title: 'Panels',
						columns: [
							{
								field: 'swcps.ID',
								title: 'id',
								width: '10%',
							},
							{
								field: 'name',
								title: 'Name',
								formatter: 'link',
								formatterParams: {
									url: '/panels/:key',
								},
							},
							{
								field: 'length',
								title: 'Length',
								width: 200,
								editor: 'adaptable',
							},
							{
								field: 'width',
								title: 'Width',
								width: 200,
							},
							{
								field: 'thickness',
								title: 'Thick',
								width: 200,
							},
						],
					},
				},
			],
		},
		{
			id: 'hardware-details',
			name: 'hardware-details',
			description: 'details of a single hardware',
			url: '/hardware/:key',
			resource: 'hardware',
			type: 'layout',
			title: 'Hardware Details',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'documents.IMG_HARDWARE.relativeURI',
								formatter: 'image',
								formatterParams: {
									edrawings: 'documents.EDRAWINGS_HARDWARE.relativeURI',
								},
								range: '1,1:12,6',
							},
							{
								field: 'name',
								prefix: 'Name: ',
								range: '1,7:12,7',
							},
							{
								field: 'swcps.Description',
								prefix: 'Description: ',
								range: '1,8:6,8',
							},
							{
								field: 'configuration',
								prefix: 'Configuration: ',
								range: '7,8:12,8',
							},
							{
								field: 'swcps.Material',
								prefix: 'Material: ',
								range: '1,9:6,9',
							},
							{
								field: 'quantity',
								prefix: 'Quantity: ',
								formatter: 'text',
								range: '7,9:12,9',
							},
							{
								field: 'swcps.Comments',
								prefix: 'Comments: ',
								range: '1,10:12,11',
								wrapText: true,
							},
						],
					},
				},
			],
		},
		{
			id: 'labels-panels',
			name: 'labels-panels',
			description: 'labels for panels',
			url: '/labels-panels',
			type: 'labels',
			resource: 'panels',
			sortBy: [
				{
					field: 'material.name',
					dir: 'desc',
				},
				{
					field: 'swcps.ID',
					dir: 'asc',
				},
			],
			treeBy: [
				{
					field: 'swcps.CombineID',
					flattenSingleChildGroups: false,
					parentValues: [
						{
							field: 'name',
							prefix: 'Combined Panel ',
							value: '"Combined Panel " + swcps.CombineID',
						},
					],
					parentCalculations: [
						{
							field: 'quantity',
							type: 'sum',
						},
					],
				},
			],
			grid: {
				cells: [
					{
						field: 'programs.length',
						formatter: 'badge',
						range: '1,1:1,1',
					},
					{
						field: 'swcps.ID',
						range: '2,1:3,1',
					},
					{
						field: 'name',
						wrapText: true,
						range: '4,1:12,1',
					},
					{
						field: 'documents.IMG_PANEL.relativeURI',
						formatter: 'image',
						range: '7,2:12,5',
					},
					{
						field: 'material.name',
						range: '1,2:6,2',
					},
					{
						field: 'length',
						range: '1,3:6,3',
					},
					{
						field: 'instance + " of " + quantity',
						range: '1,4:6,4',
					},
					{
						field: 'pid',
						formatter: 'qrcode',
						range: '1,5:6,5',
					},
				],
			},
			settings: {
				columns: 2,
				rows: 5,
				pageHeight: 297,
				pageWidth: 210,
				pagePaddingTop: 5,
				pagePaddingBottom: 5,
				pagePaddingLeft: 5,
				pagePaddingRight: 5,
				pageGapVertical: 5,
				pageGapHorizontal: 5,
				labelPadding: 2,
				fontSize: 15,
			},
		},
		{
			id: 'labels-panels-big',
			name: 'labels-panels-big',
			description: 'labels for "big" panels',
			url: '/labels-panels-big',
			type: 'labels',
			resource: 'panels',
			filter: {
				condition: 'and',
				rules: [
					{
						label: 'length',
						field: 'length',
						operator: 'greaterthan',
						type: 'number',
						value: 1000,
					},
					{
						label: 'width',
						field: 'width',
						type: 'number',
						operator: 'greaterthan',
						value: 500,
					},
				],
			},
			grid: {
				cells: [
					{
						field: 'programs.length',
						formatter: 'badge',
						range: '1,1:1,1',
					},
					{
						field: 'swcps.ID',
						range: '2,1:3,1',
					},
					{
						field: 'name',
						wrapText: true,
						range: '4,1:12,1',
					},
					{
						field: 'documents.IMG_PANEL.relativeURI',
						formatter: 'image',
						range: '7,2:12,5',
					},
					{
						field: 'material.name',
						range: '1,2:6,2',
					},
					{
						field: 'swcps.Description',
						range: '1,3:6,3',
					},
					{
						field: 'instance + " of " + instance',
						range: '1,4:6,4',
					},
					{
						field: 'pid',
						formatter: 'qrcode',
						range: '1,5:6,5',
					},
				],
			},
			settings: {
				columns: 2,
				rows: 5,
				pageHeight: 297,
				pageWidth: 210,
				pagePaddingTop: 5,
				pagePaddingBottom: 5,
				pagePaddingLeft: 5,
				pagePaddingRight: 5,
				pageGapVertical: 5,
				pageGapHorizontal: 5,
				labelPadding: 2,
				fontSize: 15,
			},
		},
		{
			id: 'labels-frames',
			name: 'labels-frames',
			description: 'labels for frames',
			url: '/labels-frames',
			type: 'labels',
			resource: 'frames',
			grid: {
				cells: [
					{
						field: 'name',
						range: '3,1:12,1',
					},
					{
						field: 'documents.IMG_FRAME.relativeURI',
						formatter: 'image',
						range: '7,2:12,4',
					},
					{
						field: 'swcps.Description',
						range: '1,2:6,2',
					},
					{
						field: '"assets/custom/company-logo-label.png"',
						formatter: 'image',
						range: '1,1:2,1',
					},
					{
						field: 'height + "x" + width + "x" + depth',
						range: '1,3:6,3',
					},
					{
						field: 'instance + " of " + instance',
						range: '1,4:6,4',
					},
				],
			},
			settings: {
				columns: 2,
				rows: 5,
				pageHeight: 297,
				pageWidth: 210,
				pagePaddingTop: 5,
				pagePaddingBottom: 5,
				pagePaddingLeft: 5,
				pagePaddingRight: 5,
				pageGapVertical: 5,
				pageGapHorizontal: 5,
				labelPadding: 2,
				fontSize: 15,
			},
		},
		{
			id: 'labels-programParts',
			name: 'labels-programParts',
			description: 'labels for program parts (nested panels)',
			url: '/labels-programParts',
			type: 'labels',
			resource: 'programParts',
			grid: {
				cells: [
					{
						field: 'programs.length',
						formatter: 'badge',
						range: '1,1:1,1',
					},
					{
						field: 'swcps.ID',
						range: '2,1:3,1',
					},
					{
						field: 'name',
						wrapText: true,
						range: '4,1:12,1',
					},
					{
						field: 'documents.IMG_PROGRAM_PART.relativeURI',
						formatter: 'image',
						range: '7,2:12,4',
					},
					{
						field: 'swcps.Description',
						range: '1,2:6,2',
					},
					{
						field: 'panel.material.name',
						range: '1,3:6,3',
					},
					{
						field: 'instance + " of " + quantityInProject',
						range: '1,4:6,4',
					},
				],
			},
			settings: {
				columns: 2,
				rows: 5,
				pageHeight: 297,
				pageWidth: 210,
				pagePaddingTop: 5,
				pagePaddingBottom: 5,
				pagePaddingLeft: 5,
				pagePaddingRight: 5,
				pageGapVertical: 5,
				pageGapHorizontal: 5,
				labelPadding: 2,
				fontSize: 15,
			},
		},
		{
			id: 'page',
			name: 'page',
			url: '/page',
			type: 'layout',
			title: 'New Page',
			resource: 'project',
			description: '',
		},
		{
			id: 'panel-detailed-list',
			name: 'panel-detailed-list',
			description: '',
			type: 'loop',
			url: '/panel-detailed-list',
			title: 'Panel Detailed List',
			source: 'panel-details-simplified',
		},
		{
			id: 'panel-details-simplified',
			name: 'panel-details-simplified',
			description: 'source for panel loop page',
			url: '/panel-details-simplified/:key',
			resource: 'panels',
			type: 'layout',
			title: 'Panel Details',
			sections: [
				{
					id: 'main',
					name: 'main',
					type: 'grid',
					grid: {
						cells: [
							{
								field: 'swcps.ID',
								prefix: 'id: ',
								range: '4,1:4,1',
							},
							{
								field: 'name',
								prefix: 'Name: ',
								range: '5,1:11,1',
							},
							{
								field: 'documents.PDF_PANEL.relativeURI',
								prefix: 'pdf: ',
								formatter: 'link',
								range: '12,1:12,1',
							},
							{
								field: 'swcps.Description',
								prefix: 'Description: ',
								range: '4,2:7,2',
							},
							{
								field: 'configuration',
								prefix: 'Configuration: ',
								range: '8,2:12,2',
							},
							{
								field: 'material.key',
								prefix: 'Material: ',
								range: '4,4:7,4',
							},
							{
								field: 'length',
								prefix: 'Length: ',
								formatter: 'text',
								range: '4,3:6,3',
							},
							{
								field: 'width',
								prefix: 'Width: ',
								formatter: 'text',
								range: '7,3:9,3',
							},
							{
								field: 'thickness',
								prefix: 'Thickness: ',
								formatter: 'text',
								range: '10,3:12,3',
							},
							{
								field: 'quantity',
								prefix: 'Quantity: ',
								formatter: 'text',
								range: '8,4:12,4',
							},
							{
								field: 'swcps.Comments',
								prefix: 'Comments: ',
								range: '4,5:12,6',
								wrapText: true,
							},
							{
								field: 'documents.IMG_PANEL.relativeURI',
								formatter: 'image',
								range: '1,1:3,6',
							},
						],
					},
				},
			],
		},
	],
	profiles: [
		{
			id: 'default',
			name: 'default',
			description: 'main profile',
			menu: [
				{
					id: 'home',
					to: '/',
					label: 'Home',
					icon: {
						name: 'home',
					},
					children: [],
				},
				{
					id: 'frames',
					to: '/frames',
					label: 'Frames',
					icon: {
						name: 'door_sliding',
					},
					children: [
						{
							id: 'sub-frames',
							to: '/sub-frames',
							label: 'Sub Frames',
							icon: {
								name: 'door_back',
							},
							children: [],
						},
					],
				},
				{
					id: 'panels',
					to: '/panels',
					label: 'Panels',
					icon: {
						name: 'crop_7_5',
					},
					children: [
						{
							id: 'panel',
							label: 'Detailed List',
							icon: {
								name: 'dehaze',
							},
							collapsed: false,
							to: '/panel-detailed-list',
							children: [],
						},
					],
				},
				{
					id: 'stocks',
					to: '/stocks',
					label: 'Stocks',
					icon: {
						name: 'select_all',
					},
					children: [
						{
							id: 'laminates',
							to: '/stocks/laminates',
							label: 'Laminates',
							icon: {
								name: 'filter_none',
							},
							children: [],
						},
						{
							id: 'edgebands',
							to: '/stocks/edgebands',
							label: 'Edgebands',
							icon: {
								name: 'border_style',
							},
							children: [],
						},
					],
				},
				{
					id: 'saw-machine-data',
					to: '/saw-machine-data',
					label: 'Saw Machine Data',
					icon: {
						name: 'content_cut',
					},
					children: [],
				},
				{
					id: 'weldments',
					to: '/weldments',
					label: 'Weldments',
					icon: {
						name: 'foundation',
					},
					children: [],
				},
				{
					id: 'programs',
					to: '/programs',
					label: 'Programs',
					icon: {
						name: 'precision_manufacturing',
					},
					children: [
						{
							id: 'tools',
							to: '/tools',
							label: 'tools',
							icon: {
								name: 'tools_power_drill',
							},
							children: [],
						},
						{
							id: 'spindles',
							to: '/spindles',
							label: 'spindles',
							icon: {
								name: '360',
							},
							children: [],
						},
					],
				},
				{
					id: 'sheets',
					to: '/sheets',
					label: 'Sheets',
					icon: {
						name: 'view_quilt',
					},
					children: [
						{
							id: 'sheet-details',
							label: 'Sheet Details',
							to: '/sheet-detailed-list',
							icon: {
								name: 'article',
							},
							collapsed: false,
							children: [],
						},
					],
				},
				{
					id: 'program-parts',
					to: '/program-parts',
					label: 'Nested Panels',
					icon: {
						name: 'home',
					},
					children: [],
				},
				{
					id: 'patterns',
					to: '/patterns',
					label: 'Patterns',
					icon: {
						name: 'view_comfy',
					},
					children: [
						{
							id: 'pattern-detailed-list',
							to: '/pattern-detailed-list',
							label: 'Pattern List',
							icon: {
								name: 'dehaze',
							},
							children: [],
						},
						{
							id: 'patterned-panels',
							to: '/patterned-panels',
							label: 'Patterned Panels',
							icon: {
								name: 'carpenter',
							},
							children: [],
						},
					],
				},
				{
					id: 'hardware',
					to: '/hardware',
					label: 'Hardware',
					icon: {
						name: 'hardware',
					},
					children: [],
				},
				{
					id: 'summary',
					to: '/summary',
					label: 'Summary',
					icon: {
						name: 'request_page',
					},
					children: [],
				},
				{
					id: 'labels',
					label: 'Labels',
					icon: {
						name: 'sticky_note_2',
					},
					children: [
						{
							id: 'labels-frames',
							to: '/labels-frames',
							label: 'Frames',
							icon: {
								name: 'view_compact',
							},
							children: [],
						},
						{
							id: 'labels-panels',
							to: '/labels-panels',
							label: 'Panels',
							icon: {
								name: 'view_compact',
							},
							children: [],
						},
						{
							id: 'labels-programParts',
							to: '/labels-programParts',
							label: 'Program Parts',
							icon: {
								name: 'view_compact',
							},
							children: [],
						},
					],
				},
				{
					id: 'data-viewer',
					to: '/data-viewer',
					label: 'Data Viewer',
					icon: {
						name: 'code',
					},
					children: [],
				},
				{
					id: 'excluded',
					to: '/excluded',
					label: 'Excluded',
					icon: {
						name: 'block',
					},
					children: [],
				},
			],
			print: [
				{
					id: 'main-print-option',
				},
				{
					id: 'design-option',
				},
				{
					id: 'cam-option',
				},
				{
					id: 'nest-option',
				},
			],
		},
		{
			id: 'shop',
			description: 'profile for shop floor',
			name: 'Shop Floor',
			menu: [
				{
					id: 'programs',
					label: 'Programs',
					to: '/programs',
					icon: {
						name: 'precision_manufacturing',
					},
					collapsed: false,
					children: [],
				},
				{
					id: 'sheets',
					to: '/sheets',
					label: 'Sheets',
					icon: {
						name: 'view_quilt',
					},
					children: [
						{
							id: 'sheet-details',
							label: 'Sheet Details',
							to: '/sheet-detailed-list',
							icon: {
								name: 'article',
							},
							collapsed: false,
							children: [],
						},
					],
				},
				{
					id: 'program-parts',
					to: '/program-parts',
					label: 'Nested Panels',
					icon: {
						name: 'home',
					},
					children: [],
				},
				{
					id: 'picking-list',
					to: '/picking-list',
					label: 'Picking List',
					icon: {
						name: 'checklist',
					},
					children: [],
				},
				{
					id: 'labels',
					label: 'Labels',
					icon: {
						name: 'sticky_note_2',
					},
					children: [
						{
							id: 'labels-panels',
							to: '/labels-panels',
							label: 'Panels',
							icon: {
								name: 'view_compact',
							},
							children: [],
						},
						{
							id: 'labels-programParts',
							to: '/labels-programParts',
							label: 'Program Parts',
							icon: {
								name: 'view_compact',
							},
							children: [],
						},
					],
				},
			],
			print: [
				{
					id: 'cam-option',
				},
				{
					id: 'nest-option',
				},
			],
		},
	],
	print: {
		headers: [
			{
				id: 'main',
				name: 'main',
				description: 'main header',
				grid: {
					gap: 0,
					fontSize: 10,
					cellHeight: 25,
					cells: [
						{
							field: 'name',
							prefix: 'Project: ',
							range: '10,1:12,1',
						},
						{
							field: 'swcps.Description',
							prefix: 'Description: ',
							formatter: 'text',
							range: '10,2:12,2',
						},
						{
							field: 'swcps.Comments',
							prefix: 'Comments: ',
							formatter: 'text',
							range: '10,3:12,3',
						},
						{
							field: '"assets/custom/company-logo.png"',
							formatter: 'image',
							range: '1,1:2,3',
						},
					],
				},
			},
		],
		groups: [
			{
				id: 'main-group',
				name: 'main group',
				description: 'main page group containing most pages',
				pages: [
					{
						id: 'home',
					},
					{
						id: 'frames',
					},
					{
						id: 'panels',
					},
					{
						id: 'stocks',
					},
					{
						id: 'programs',
					},
					{
						id: 'program-parts',
					},
					{
						id: 'patterned-panels',
					},
					{
						id: 'weldments',
					},
					{
						id: 'hardware',
					},
					{
						id: 'summary',
					},
				],
			},
			{
				id: 'design-group',
				name: 'design-group',
				description: 'group focused on design',
				pages: [
					{
						id: 'home',
					},
					{
						id: 'frames',
					},
					{
						id: 'panels',
					},
					{
						id: 'hardware',
					},
					{
						id: 'summary',
					},
				],
			},
			{
				id: 'cam-group',
				name: 'cam group',
				description: 'group focused on cam',
				pages: [],
			},
			{
				id: 'nest-group',
				name: 'nest group',
				description: 'group focused on nesting',
				pages: [
					{
						id: 'home',
					},
					{
						id: 'programs',
					},
					{
						id: 'sheets',
					},
					{
						id: 'sheet-detailed-list',
					},
				],
			},
		],
		options: [
			{
				id: 'main-print-option',
				name: 'Main',
				description: 'Main print option',
				header: {
					id: 'main',
				},
				group: {
					id: 'main-group',
				},
			},
			{
				id: 'design-option',
				name: 'Design',
				description: 'option focused on design',
				header: {
					id: 'main',
				},
				group: {
					id: 'design-group',
				},
			},
			{
				id: 'cam-option',
				name: 'Cam',
				header: {
					id: 'main',
				},
				group: {
					id: 'cam-group',
				},
				description: 'option focused on cam',
			},
			{
				id: 'nest-option',
				name: 'Nest',
				header: {
					id: 'main',
				},
				group: {
					id: 'nest-group',
				},
				description: 'option focused on nesting',
			},
		],
	},
}

/* --- SWOOD CLIENT HOOK (do not remove) ---------------------------------- */
if (typeof window !== 'undefined') {
	if (window.SwoodClient) window.SwoodClient.apply(viewSettings)
	else window.__SWOOD_CLIENT_TARGET__ = viewSettings
}

try {
	module.exports = viewSettings
} catch {}
