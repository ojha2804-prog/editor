const viewSettings = {
  pages: [
    {
      id: "home",
      name: "home",
      description: "application home page",
      url: "/",
      type: "layout",
      title: "Home Page",
      resource: "project",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "name",
                prefix: "Name: ",
                formatter: "text",
                range: "1,1:4,1",
              },
              {
                field: "swcps.Description",
                prefix: "Description: ",
                formatter: "text",
                range: "1,2:4,2",
              },
              {
                field: "configuration",
                prefix: "Configuration: ",
                formatter: "text",
                range: "1,3:4,3",
              },
              {
                field: "swcps.Comments",
                prefix: "Comments: ",
                formatter: "text",
                range: "1,4:4,4",
              },
              {
                field: "documents.IMG_REPORT.relativeURI",
                formatter: "image",
                formatterParams: {
                  edrawings: "documents.EDRAWINGS_PROJECT.relativeURI",
                },
                range: "5,1:12,12",
              },
              {
                field: "isDesign",
                prefix: "Design:",
                range: "1,5:1,5",
                formatter: "tickCross",
                formatterParams: {
                  disableCrossElement: true,
                },
              },
              {
                field: "isCam",
                prefix: "Cam:",
                range: "2,5:2,5",
                formatter: "tickCross",
                formatterParams: {
                  disableCrossElement: true,
                },
              },
              {
                field: "isNesting",
                prefix: "Nesting:",
                range: "3,5:4,5",
                formatter: "tickCross",
                formatterParams: {
                  disableCrossElement: true,
                },
              },
            ],
          },
        },
      ],
    },
    {
      id: "panels",
      name: "panels",
      description: "list of all panels in the project",
      url: "/panels",
      type: "table",
      title: "List of Panels",
      resource: "panels",
      table: {
        title: "Panels",
        initialFilter: [],
        splitBy: [
          {
            field: "frames.name",
            buttonLabel: "Frame",
            emptyValue: "No Parent",
          },
          {
            field: "material.name",
            buttonLabel: "Material",
          },
          {
            field: "material.category",
            buttonLabel: "Category",
          },
        ],
        columns: [
          {
            field: "name",
            title: "Name",
            formatter: "link",
            width: 400,
            formatterParams: {
              url: "/panels/:key",
            },
          },
          {
            field: "length",
            title: "Length",
            widthGrow: 1,
          },
          {
            field: "width",
            title: "Width",
            widthGrow: 1,
          },
          {
            field: "thickness",
            title: "Thick",
            widthGrow: 1,
          },
          {
            field: "material.name",
            title: "Material",
            widthGrow: 2,
          },
          {
            field: "hasGrain",
            title: "Grain",
            formatter: "tickCross",
            width: 100,
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "stocks",
      name: "stocks",
      description: "list of all stocks in the project",
      url: "/stocks",
      type: "table",
      resource: "stocks",
      title: "List of Stocks",
      table: {
        title: "Stocks",
        dataTreeElementColumn: "panel.name",
        splitBy: [
          {
            field: "material.name",
            buttonLabel: "Material",
          },
          {
            field: "panel.frames.name",
            buttonLabel: "Frame",
            emptyValue: "No Parent",
          },
        ],
        treeBy: [
          {
            field:
              'if(material.hasGrain, length + "|" + width + "|" + material.name, max(length, width) + "|" + min(length, width) + "|" + material.name)',
            flattenSingleChildGroups: true,
            parentValues: [
              {
                field: "name",
                value: '"Combined Stock " + counter',
              },
              {
                field: "swcps.ID",
                value: '""',
                ifChildrenDifferent: true,
              },
            ],
            parentCalculations: [
              {
                field: "quantity",
                type: "sum",
              },
              {
                field: "material.thickness",
                type: "sum",
              },
            ],
          },
        ],
        initialSort: [
          {
            column: "swcps.ID",
            dir: "asc",
          },
        ],
        columns: [
          {
            field: "panel.name",
            title: "Panel Name",
            width: 400,
            formatter: "link",
            formatterParams: {
              url: "/panels/:refPart",
            },
          },
          {
            field: "length",
            title: "Length",
            widthGrow: 1,
          },
          {
            field: "width",
            title: "Width",
            widthGrow: 1,
          },
          {
            field: "thickness",
            title: "Thick",
            widthGrow: 1,
          },
          {
            field: "material.name",
            title: "Material",
            widthGrow: 2,
          },
          {
            field: "material.hasGrain",
            title: "Grain",
            width: 100,
            formatter: "tickCross",
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "laminates",
      name: "laminates",
      description: "list of all laminates in the project",
      url: "/stocks/laminates",
      type: "table",
      resource: "laminates",
      title: "List of Laminates",
      table: {
        title: "Laminates",
        treeBy: [
          {
            field:
              'if(material.hasGrain, length + "|" + width + "|" + material.name, max(length, width) + "|" + min(length, width) + "|" + thickness + "|" + material.name)',
            flattenSingleChildGroups: true,
            parentValues: [
              {
                field: "name",
                value: '"Combined Laminate " + counter',
              },
            ],
            parentCalculations: [
              {
                field: "quantity",
                type: "sum",
              },
            ],
          },
        ],
        columns: [
          {
            field: "name",
            title: "Name",
            width: 200,
          },
          {
            field: "panel.name",
            title: "Panel",
            width: 400,
            formatter: "link",
            formatterParams: {
              url: "/panels/:refPanel",
            },
          },
          {
            field: "length",
            title: "Length",
            widthGrow: 1,
          },
          {
            field: "width",
            title: "Width",
            widthGrow: 1,
          },
          {
            field: "thickness",
            title: "Thick",
            widthGrow: 1,
          },
          {
            field: "material.name",
            title: "Material",
            widthGrow: 2,
          },
          {
            field: "material.hasGrain",
            title: "Grain",
            formatter: "tickCross",
            width: 100,
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "edgebands",
      name: "edgebands",
      description: "list of all edgebands in the project",
      url: "/stocks/edgebands",
      type: "table",
      resource: "edgebands",
      title: "List of Edgebands",
      table: {
        title: "Edgebands",
        columns: [
          {
            field: "panel.name",
            title: "Panel",
            width: 400,
            formatter: "link",
            formatterParams: {
              url: "/panels/:refPanel",
            },
          },
          {
            field: "length",
            title: "Length",
            widthGrow: 1,
          },
          {
            field: "width",
            title: "Width",
            widthGrow: 1,
          },
          {
            field: "thickness",
            title: "Thick",
            widthGrow: 1,
          },
          {
            field: "material.name",
            title: "Material",
            widthGrow: 2,
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
        treeBy: [
          {
            field:
              'length + "|" + width + "|" + thickness + "|" + material.name',
            flattenSingleChildGroups: true,
            parentValues: [
              {
                field: "panel.name",
                value: '"Combined Edgeband " + counter',
              },
            ],
            parentCalculations: [
              {
                field: "quantity",
                type: "sum",
              },
            ],
          },
        ],
      },
    },
    {
      id: "pressed",
      name: "pressed",
      url: "/pressed",
      type: "table",
      title: "Pressed Materials",
      header: "New Page",
      resource: "panelMaterials",
      description: "(pro) List of pressed materials",
      table: {
        title: "Pressed Materials",
        columns: [
          {
            field: "name",
            title: "Name",
            width: 400,
          },
          {
            title: "Thick",
            widthGrow: 1,
            field: "thickness",
          },
          {
            field: 'type == 0 ? "Core" : type == 1 ? "Laminate" : "Compound"',
            title: "Type",
            widthGrow: 1,
          },
          {
            field: "hasGrain",
            title: "Grain",
            widthGrow: 1,
            formatter: "tickCross",
            formatterParams: {
              disableCrossElement: true,
            },
          },
        ],
        dataTreeChildField: "layers",
        dataTreeStartExpanded: true,
      },
      filter: {
        condition: "and",
        rules: [
          {
            label: "type",
            field: "type",
            type: "string",
            operator: "equal",
            value: "2",
          },
        ],
      },
    },
    {
      id: "patterned-panels",
      name: "patterned-panels",
      description: "list of all patterned panels in the project",
      url: "/patterned-panels",
      type: "table",
      resource: "panels",
      title: "List of Patterned Panels",
      filter: {
        condition: "and",
        rules: [
          {
            label: "isPatterned",
            field: "isPatterned",
            operator: "equal",
            type: "boolean",
            value: true,
          },
        ],
      },
      table: {
        title: "Patterned Panels",
        dataTreeElementColumn: "name",
        columns: [
          {
            field: "name",
            title: "Part Name",
            width: 400,
            formatter: "link",
            formatterParams: {
              url: "/panels/:key",
            },
          },
          {
            field: "length",
            title: "Length",
            widthGrow: 1,
          },
          {
            field: "width",
            title: "Width",
            widthGrow: 1,
          },
          {
            field: "thickness",
            title: "Thick",
            widthGrow: 1,
          },
          {
            field: "material.name",
            title: "Material",
            widthGrow: 2,
          },
          {
            field: "hasGrain",
            title: "Grain",
            formatter: "tickCross",
            width: 100,
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "pattern-details-simplified",
      name: "pattern-details-simplified",
      description: "details of a single pattern",
      url: "/patterns-simple/:key",
      resource: "patterns",
      type: "layout",
      title: "Pattern Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            gap: 0,
            borderRadius: 0,
            resource: "patterns",
            cells: [
              {
                field: "pattern",
                formatter: "pattern",
                range: "4,1:12,5",
                formatterParams: {
                  panelLabel: "serialNumbers.NUM_PANEL",
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
                field: "name",
                prefix: "",
                range: "1,1:3,1",
              },
              {
                field: "refBoard",
                prefix: "Material:  ",
                range: "1,2:3,2",
              },
              {
                field: "quantityPanels",
                prefix: "# Panels: ",
                range: "1,3:3,3",
              },
              {
                field: "quantityTrims",
                prefix: "# Trims: ",
                range: "1,4:3,4",
              },
              {
                field: "quantityWaste",
                prefix: "# Waste:  ",
                range: "1,5:3,5",
              },
            ],
          },
        },
      ],
    },
    {
      id: "pattern-detailed-list",
      name: "pattern-detailed-list",
      description: "list of simplified patterns",
      url: "/pattern-detailed-list",
      type: "layout",
      title: "List of Patterns",
      resource: "patterns",
      sections: [
        {
          id: "loop",
          name: "loop",
          type: "loop",
          loop: {
            source: "pattern-details-simplified",
            breakPages: false,
          },
        },
      ],
    },
    {
      id: "linear-pattern-details-simplified",
      name: "linear-pattern-details-simplified",
      description: "(pro) Details of a single linear pattern",
      url: "/linear-patterns-simple/:key",
      resource: "linearPatterns",
      type: "layout",
      title: "Linear Pattern Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "pattern",
                formatter: "linearPattern",
                range: "4,1:12,3",
                formatterParams: {
                  panelLabel: "swcps.ID",
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
                field: '"Linear Pattern " + number',
                prefix: "Name: ",
                range: "1,1:3,1",
              },
              {
                field: "material.description",
                prefix: "Profile:   ",
                range: "1,3:3,3",
              },
              {
                prefix: "Material:  ",
                range: "1,2:3,2",
                field: "material.name",
              },
            ],
            gap: 0,
            borderRadius: 0,
          },
        },
      ],
    },
    {
      id: "linear-patterns",
      name: "linear-patterns",
      url: "/linear-patterns",
      type: "loop",
      title: "List of Linear Patterns",
      source: "linear-pattern-details-simplified",
      breakPages: false,
      description: "(pro) List of linear patterns",
    },
    {
      id: "weldments",
      name: "weldments",
      description: "(pro) list of all weldments in the project",
      url: "/weldments",
      type: "table",
      resource: "weldments",
      title: "List of Weldments",
      table: {
        title: "Weldments",
        initialSort: [
          {
            column: "name",
            dir: "asc",
          },
        ],
        treeBy: [
          {
            field: 'part.name + "|" + cutlist',
            flattenSingleChildGroups: false,
            parentValues: [
              {
                field: "name",
                value: "cutlist",
              },
            ],
            parentCalculations: [
              {
                field: "quantity",
                type: "sum",
              },
            ],
          },
        ],
        columns: [
          {
            field: "name",
            title: "Name",
            width: 400,
          },
          {
            field: "description",
            title: "Description",
            widthGrow: 2,
          },
          {
            field: "length",
            title: "Length",
            widthGrow: 1,
          },
          {
            field: "variables.MBS_Material",
            title: "Material",
            widthGrow: 1,
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "frames",
      name: "frames",
      description: "(pro) list of all frames in the project",
      url: "/frames",
      type: "table",
      resource: "frames",
      title: "List of Frames",
      table: {
        title: "Frames",
        dataTreeElementColumn: "name",
        dataTreeChildField: "subFrames",
        initialSort: [
          {
            column: "swcps.ID",
            dir: "asc",
          },
        ],
        columns: [
          {
            field: "swcps.ID",
            title: "#",
            width: 100,
            hozAlign: "center",
          },
          {
            field: "name",
            title: "Name",
            width: 400,
            formatter: "link",
            formatterParams: {
              url: "/frames/:key",
              urlChildren: "/sub-frames/:key",
            },
          },
          {
            field: "swcps.Description",
            title: "Description",
            widthGrow: 2,
          },
          {
            field: "height",
            title: "Height",
            widthGrow: 1,
          },
          {
            field: "width",
            title: "Width",
            widthGrow: 1,
          },
          {
            field: "depth",
            title: "Depth",
            widthGrow: 1,
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "sub-frames",
      name: "sub-frames",
      description: "(pro) list of all subframes in the project",
      url: "/sub-frames",
      type: "table",
      resource: "subFrames",
      title: "List of Sub-Frames",
      table: {
        title: "subFrames",
        dataTreeElementColumn: "name",
        dataTreeChildField: "subFrames",
        initialSort: [
          {
            column: "swcps.ID",
            dir: "asc",
          },
        ],
        columns: [
          {
            field: "swcps.ID",
            title: "#",
            width: 100,
            hozAlign: "center",
          },
          {
            field: "name",
            title: "Name",
            width: 400,
            formatter: "link",
            formatterParams: {
              url: "/sub-frames/:key",
            },
          },
          {
            field: "swcps.Description",
            title: "Description",
            widthGrow: 2,
          },
          {
            field: "height",
            title: "Height",
            widthGrow: 1,
          },
          {
            field: "width",
            title: "Width",
            widthGrow: 1,
          },
          {
            field: "depth",
            title: "Depth",
            widthGrow: 1,
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "programs",
      name: "programs",
      description: "list of all programs in the project",
      url: "/programs",
      type: "table",
      resource: "programs",
      title: "List of Programs",
      table: {
        title: "Programs",
        splitBy: [
          {
            field: "machine",
            buttonLabel: "Machine",
          },
        ],
        initialSort: [
          {
            column: "swcps.ID",
            dir: "asc",
          },
        ],
        columns: [
          {
            field: "part.name",
            title: "Panel Name",
            width: 400,
            formatter: "link",
            formatterParams: {
              url: "/panels/:panel.key",
            },
          },
          {
            field: "name",
            title: "Program Name",
            widthGrow: 1,
            formatter: "link",
            formatterParams: {
              url: "/programs/:key",
            },
          },
          {
            field: "variables.PROG",
            title: "Program File Name",
            widthGrow: 2,
          },
          {
            field: "machine",
            title: "Machine",
            widthGrow: 1,
          },
          {
            field: "panel.material.name",
            title: "Material",
            widthGrow: 2,
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "tools",
      name: "tools",
      description: "list of all tools in the project",
      url: "/tools",
      type: "table",
      resource: "tools",
      title: "List of Tools",
      table: {
        title: "Tools",
        initialSort: [
          {
            column: "number",
            dir: "asc",
          },
        ],
        columns: [
          {
            field: "number",
            title: "Number",
            width: 100,
          },
          {
            field: "name",
            title: "Name",
            width: 400,
          },
          {
            field: "reference",
            title: "Reference",
            widthGrow: 1,
          },
          {
            field: "diameter",
            title: "Diameter",
            widthGrow: 1,
          },
        ],
      },
    },
    {
      id: "spindles",
      name: "spindles",
      description: "list of all spindles in the project",
      url: "/spindles",
      type: "table",
      resource: "spindles",
      title: "List of Spindles",
      table: {
        title: "Spindles",
        columns: [
          {
            field: "variables.SPINDLE_NAME",
            title: "Name",
            width: 400,
          },
          {
            field: "variables.SPINDLE_FAMILY",
            title: "Family",
            widthGrow: 1,
          },
          {
            field: "variables.SPINDLE_RPM",
            title: "RPM",
            widthGrow: 1,
          },
          {
            field: "variables.SPINDLE_USED",
            title: "Used",
            widthGrow: 1,
          },
        ],
      },
    },
    {
      id: "sheets",
      name: "sheets",
      description: "list of all sheets in the project",
      url: "/sheets",
      type: "table",
      resource: "sheets",
      title: "List of Sheets",
      table: {
        title: "Sheets",
        columns: [
          {
            field: "name",
            title: "Name",
            width: 400,
            formatter: "link",
            formatterParams: {
              url: "/sheets/:key",
            },
          },
          {
            field: "length",
            title: "Length",
            widthGrow: 1,
          },
          {
            field: "width",
            title: "Width",
            widthGrow: 1,
          },
          {
            field: "thickness",
            title: "Thick",
            widthGrow: 1,
          },
          {
            field: "board.name",
            title: "Material",
            widthGrow: 2,
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "program-parts",
      name: "program-parts",
      description: "list of all program parts (nested panels) in the project",
      url: "/program-parts",
      type: "table",
      resource: "programParts",
      title: "List of Nested Panels",
      table: {
        title: "Nested Panels",
        splitBy: [
          {
            field: "sheet.name",
            buttonLabel: "Sheet",
          },
        ],
        dataTreeElementColumn: "name",
        treeBy: [
          {
            field: "name",
            parentCalculations: [
              {
                field: "quantity",
                type: "sum",
              },
            ],
            flattenSingleChildGroups: true,
          },
        ],
        initialSort: [
          {
            column: "part.swcps.ID",
            dir: "asc",
          },
        ],
        columns: [
          {
            field: "name",
            title: "Name",
            width: 400,
            formatter: "link",
            formatterParams: {
              url: "/program-parts/:key",
            },
          },
          {
            field: "panel.length",
            title: "Length",
            widthGrow: 1,
          },
          {
            field: "panel.width",
            title: "Width",
            widthGrow: 1,
          },
          {
            field: "panel.thickness",
            title: "Thick",
            widthGrow: 1,
          },
          {
            field: "sheet.board.name",
            title: "Material",
            widthGrow: 2,
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "patterns",
      name: "patterns",
      description: "list of all patterns in the project",
      url: "/patterns",
      type: "table",
      resource: "patterns",
      title: "List of Patterns",
      table: {
        title: "Patterns",
        columns: [
          {
            field: "name",
            title: "Name",
            width: 400,
            formatter: "link",
            formatterParams: {
              url: "/patterns/:key",
            },
          },
          {
            field: "quantityPanels",
            title: "# Panels",
            widthGrow: 1,
          },
          {
            field: "length",
            title: "Length",
            widthGrow: 1,
          },
          {
            field: "width",
            title: "Width",
            widthGrow: 1,
          },
          {
            field: "thickness",
            title: "Thick",
            widthGrow: 1,
          },
          {
            field: "refBoard",
            title: "Material",
            widthGrow: 2,
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "hardware",
      name: "hardware",
      description: "list of all hardware in the project",
      url: "/hardware",
      type: "table",
      resource: "hardware",
      title: "List of Hardware",
      table: {
        title: "Hardware",
        splitBy: [
          {
            field: "frames.name",
            buttonLabel: "Frame",
          },
        ],
        initialSort: [
          {
            column: "name",
            dir: "asc",
          },
        ],
        columns: [
          {
            field: "documents.IMG_HARDWARE.relativeURI",
            title: "",
            formatter: "image",
            hozAlign: "center",
            width: 75,
          },
          {
            field: "name",
            title: "Name",
            width: 400,
            formatter: "link",
            formatterParams: {
              url: "/hardware/:key",
            },
          },
          {
            field: "configuration",
            title: "Configuration",
            widthGrow: 2,
          },
          {
            field: "swcps.Reference",
            title: "Reference",
            widthGrow: 1,
          },
          {
            field: "swcps.Supplier",
            title: "Supplier",
            widthGrow: 1,
          },
          {
            field: "costUnit",
            title: "Unit Cost",
            widthGrow: 1,
            formatter: "money",
            formatterParams: {
              decimal: ".",
              thousand: ",",
              symbol: "£",
            },
          },
          {
            field: "quantity",
            title: "Qty",
            width: 100,
          },
        ],
      },
    },
    {
      id: "summary",
      name: "summary",
      description: "summary of all materials in the project",
      url: "/summary",
      type: "layout",
      title: "Summary",
      resource: "root",
      sections: [
        {
          id: "boards",
          name: "boards",
          type: "table",
          resource: "boardMaterials",
          table: {
            title: "Boards",
            initialSort: [
              {
                column: "name",
                dir: "asc",
              },
            ],
            columns: [
              {
                field: "name",
                title: "Material",
                width: 400,
              },
              {
                field: "description",
                title: "Description",
                widthGrow: 2,
              },
              {
                field: "thickness",
                title: "Thick",
                widthGrow: 1,
              },
              {
                field: "quantity",
                title: "Quantity",
                widthGrow: 1,
                formatter: "number",
                formatterParams: {
                  precision: 0,
                },
              },
              {
                field: "unitOfMeasure",
                title: "Unit",
                widthGrow: 0.5,
              },
              {
                field: "costUnit",
                title: "Unit Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
              },
              {
                field: "cost",
                title: "Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
                bottomCalc: "sum",
                bottomCalcFormatter: "money",
                bottomCalcFormatterParams: {
                  symbol: "£",
                },
              },
            ],
          },
        },
        {
          id: "panels",
          name: "panels",
          type: "table",
          resource: "panelMaterials",
          table: {
            title: "Materials",
            initialFilter: [
              {
                field: "quantity",
                type: "!=",
                value: "0",
              },
            ],
            initialSort: [
              {
                column: "name",
                dir: "asc",
              },
            ],
            columns: [
              {
                field: "name",
                title: "Material",
                width: 400,
              },
              {
                field: "description",
                title: "Description",
                widthGrow: 2,
              },
              {
                field: "thickness",
                title: "Thick",
                widthGrow: 1,
              },
              {
                field: "quantity",
                title: "Quantity",
                widthGrow: 1,
                formatter: "number",
                formatterParams: {
                  precision: 3,
                },
              },
              {
                field: "unitOfMeasure",
                title: "Unit",
                widthGrow: 0.5,
              },
              {
                field: "costUnit",
                title: "Unit Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
              },
              {
                field: "cost",
                title: "Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
                bottomCalc: "sum",
                bottomCalcFormatter: "money",
                bottomCalcFormatterParams: {
                  symbol: "£",
                },
              },
            ],
          },
        },
        {
          id: "laminates",
          name: "laminates",
          type: "table",
          resource: "laminateMaterials",
          table: {
            title: "Laminates",
            columns: [
              {
                field: "name",
                title: "Material",
                width: 400,
              },
              {
                field: "description",
                title: "Description",
                widthGrow: 2,
              },
              {
                field: "thickness",
                title: "Thick",
                widthGrow: 1,
              },
              {
                field: "quantity",
                title: "Quantity",
                widthGrow: 1,
                formatter: "number",
                formatterParams: {
                  precision: 3,
                },
              },
              {
                field: "unitOfMeasure",
                title: "Unit",
                widthGrow: 0.5,
              },
              {
                field: "costUnit",
                title: "Unit Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
              },
              {
                field: "cost",
                title: "Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
                bottomCalc: "sum",
                bottomCalcFormatter: "money",
                bottomCalcFormatterParams: {
                  symbol: "£",
                },
              },
            ],
          },
        },
        {
          id: "edgebands",
          name: "edgebands",
          type: "table",
          resource: "edgebandMaterials",
          table: {
            title: "Edgebands",
            columns: [
              {
                field: "name",
                title: "Material",
                width: 400,
              },
              {
                field: "description",
                title: "Description",
                widthGrow: 2,
              },
              {
                field: "thickness",
                title: "Thick",
                widthGrow: 1,
              },
              {
                field: "quantity",
                title: "Quantity",
                widthGrow: 1,
                formatter: "number",
                formatterParams: {
                  precision: 2,
                },
              },
              {
                field: "unitOfMeasure",
                title: "Unit",
                widthGrow: 0.5,
              },
              {
                field: "costUnit",
                title: "Unit Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
              },
              {
                field: "cost",
                title: "Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
                bottomCalc: "sum",
                bottomCalcFormatter: "money",
                bottomCalcFormatterParams: {
                  symbol: "£",
                },
              },
            ],
          },
        },
        {
          id: "weldments",
          name: "weldments",
          type: "table",
          resource: "weldmentMaterials",
          table: {
            title: "Weldments",
            columns: [
              {
                field: "description",
                title: "Profile",
                width: 400,
              },
              {
                field: "name",
                title: "Material",
                widthGrow: 3,
              },
              {
                field: 'format(quantity, 2) + " "+ unitOfMeasure',
                title: "Quantity",
                width: 100,
              },
              {
                field: "costUnit",
                title: "Unit Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
              },
              {
                field: "cost",
                title: "Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
                bottomCalc: "sum",
                bottomCalcFormatter: "money",
                bottomCalcFormatterParams: {
                  symbol: "£",
                },
              },
            ],
          },
        },
        {
          id: "hardware",
          name: "hardware",
          type: "table",
          resource: "hardware",
          table: {
            title: "Hardware",
            columns: [
              {
                field: "name",
                title: "Name",
                width: 400,
              },
              {
                field: "configuration",
                title: "Configuration",
                widthGrow: 2,
              },
              {
                field: "swcps.Reference",
                title: "Reference",
                widthGrow: 1,
              },
              {
                field: "quantity",
                title: "Quantity",
                widthGrow: 1,
                formatter: "number",
                formatterParams: {
                  precision: 0,
                },
              },
              {
                field: "",
                title: "",
                widthGrow: 0.5,
              },
              {
                field: "costUnit",
                title: "Unit Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
              },
              {
                field: "cost",
                title: "Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
                bottomCalc: "sum",
                bottomCalcFormatter: "money",
                bottomCalcFormatterParams: {
                  symbol: "£",
                },
              },
            ],
          },
        },
        {
          id: "panelProcesses",
          name: "panelProcesses",
          type: "table",
          resource: "panelProcesses",
          table: {
            title: "Panel Process",
            columns: [
              {
                field: "name",
                title: "Name",
                width: 400,
              },
              {
                field: "",
                title: "",
                widthGrow: 3,
              },
              {
                field: "quantity",
                title: "Quantity",
                widthGrow: 1,
                formatter: "number",
                formatterParams: {
                  precision: 2,
                },
              },
              {
                field: "",
                title: "",
                widthGrow: 0.5,
              },
              {
                field: "costUnit",
                title: "Unit Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
              },
              {
                field: "cost",
                title: "Cost",
                widthGrow: 1,
                formatter: "money",
                formatterParams: {
                  symbol: "£",
                },
                bottomCalc: "sum",
                bottomCalcFormatter: "money",
                bottomCalcFormatterParams: {
                  symbol: "£",
                },
              },
            ],
          },
        },
      ],
    },
    {
      id: "excluded",
      name: "excluded",
      description: "list of all excluded items in the project",
      url: "/excluded",
      type: "table",
      resource: "excluded",
      title: "List of Excluded Items",
      table: {
        title: "Excluded",
        columns: [
          {
            field: "name",
            title: "Name",
            width: 400,
            formatter: "component",
          },
          {
            field: "swcps.Description",
            title: "Description",
            widthGrow: 1,
          },
          {
            field: "configuration",
            title: "Configuration",
            widthGrow: 1,
          },
        ],
      },
    },
    {
      id: "panel-details",
      name: "panel-details",
      description: "details of a single panel",
      url: "/panels/:key",
      resource: "panels",
      type: "layout",
      title: "Panel Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "part.documents.IMG_PART.relativeURI",
                formatter: "image",
                formatterParams: {
                  edrawings: "documents.EDRAWINGS_PANEL.relativeURI",
                },
                range: "1,1:12,6",
              },
              {
                field: "name",
                prefix: "Name: ",
                range: "4,7:12,7",
              },
              {
                field: "swcps.Description",
                prefix: "Description: ",
                range: "4,8:7,8",
              },
              {
                field: "edging",
                prefix: "Edging: ",
                range: "8,8:12,8",
                formatter: "edgingCode",
              },
              {
                field: "material.key",
                prefix: "Material: ",
                range: "4,10:7,10",
              },
              {
                field: "length",
                prefix: "Length: ",
                formatter: "text",
                range: "4,9:6,9",
              },
              {
                field: "width",
                prefix: "Width: ",
                formatter: "text",
                range: "7,9:9,9",
              },
              {
                field: "thickness",
                prefix: "Thickness: ",
                formatter: "text",
                range: "10,9:12,9",
              },
              {
                field: "quantity",
                prefix: "Quantity: ",
                formatter: "text",
                range: "8,10:12,10",
              },
              {
                field: "swcps.Comments",
                prefix: "Comments: ",
                formatter: "text",
                range: "4,11:12,12",
                wrapText: true,
              },
              {
                field: "documents.IMG_PANEL.relativeURI",
                formatter: "image",
                range: "1,7:3,12",
              },
            ],
          },
        },
        {
          id: "layers",
          name: "layers",
          type: "table",
          resource: "layers",
          table: {
            title: "Layers",
            columns: [
              {
                field: "name",
                title: "Name",
                width: 400,
              },
              {
                field: "material.name",
                title: "Material",
                widthGrow: 1,
              },
              {
                field: "thickness",
                title: "Thick",
                widthGrow: 1,
              },
            ],
          },
        },
        {
          id: "laminates",
          name: "laminates",
          type: "table",
          resource: "laminates",
          table: {
            title: "Laminates",
            columns: [
              {
                field: "name",
                title: "Name",
                width: 400,
              },
              {
                field: "material.name",
                title: "Material",
                widthGrow: 1,
              },
              {
                field: "thickness",
                title: "Thick",
                widthGrow: 1,
              },
            ],
          },
        },
        {
          id: "edgebands",
          name: "edgebands",
          type: "table",
          resource: "edgebands",
          table: {
            title: "Edgebands",
            initialSort: [
              {
                column: "name",
                dir: "asc",
              },
            ],
            columns: [
              {
                field: "name",
                title: "Name",
                width: 400,
              },
              {
                field: "material.name",
                title: "Material",
                widthGrow: 1,
              },
              {
                field: "thickness",
                title: "Thick",
                widthGrow: 1,
              },
            ],
          },
        },
        {
          id: "processZones",
          name: "processZones",
          type: "table",
          resource: "processZones",
          table: {
            title: "Process Zones",
            columns: [
              {
                field: "panelProcess.name",
                title: "Name",
                width: 400,
              },
              {
                field: "name",
                title: "Zone",
                widthGrow: 1,
              },
            ],
          },
        },
        {
          id: "programs",
          name: "programs",
          type: "table",
          resource: "programs",
          table: {
            title: "Programs",
            columns: [
              {
                field: "name",
                title: "Name",
                width: 400,
                formatter: "link",
                formatterParams: {
                  url: "/programs/:key",
                },
              },
              {
                field: "machine",
                title: "Code",
                widthGrow: 1,
              },
            ],
          },
        },
      ],
    },
    {
      id: "program-details",
      name: "program-details",
      description: "details of a single program",
      url: "/programs/:key",
      resource: "programs",
      type: "layout",
      title: "Program Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "part.documents.IMG_PART.relativeURI",
                formatter: "image",
                formatterParams: {
                  edrawings: "panel.documents.EDRAWINGS_PANEL.relativeURI",
                },
                range: "1,1:12,6",
              },
              {
                field: "name",
                prefix: "Name: ",
                range: "4,7:11,7",
              },
              {
                field: "programDocument.relativeURI",
                prefix: "code: ",
                formatter: "link",
                range: "12,7:12,7",
              },
              {
                field: "swcps.Description",
                prefix: "Description: ",
                range: "4,8:8,8",
              },
              {
                field: "configuration",
                prefix: "Configuration: ",
                range: "9,8:12,8",
              },
              {
                field: "material.name",
                prefix: "Material: ",
                range: "4,10:8,10",
              },
              {
                field: "length",
                prefix: "Length: ",
                formatter: "text",
                range: "4,9:6,9",
              },
              {
                field: "width",
                prefix: "Width: ",
                formatter: "text",
                range: "7,9:9,9",
              },
              {
                field: "thickness",
                prefix: "Thickness: ",
                formatter: "text",
                range: "10,9:12,9",
              },
              {
                field: "quantity",
                prefix: "Quantity: ",
                formatter: "text",
                range: "9,10:12,10",
              },
              {
                field: "comments",
                prefix: "Comments: ",
                formatter: "text",
                range: "4,11:12,12",
              },
              {
                field: "documents.IMG_PROGRAM.relativeURI",
                formatter: "image",
                range: "1,7:3,12",
              },
            ],
          },
        },
        {
          id: "tools",
          name: "tools",
          type: "table",
          resource: "tools",
          table: {
            title: "Tools",
            columns: [
              {
                field: "number",
                title: "Tool #",
                width: 100,
              },
              {
                field: "name",
                title: "Name",
                width: 400,
              },
              {
                field: "diameter",
                title: "Diameter",
                widthGrow: 1,
              },
            ],
          },
        },
      ],
    },
    {
      id: "program-part-details",
      name: "program-part-details",
      description: "details of a single program part (nested panel)",
      url: "/program-parts/:key",
      resource: "programParts",
      type: "layout",
      title: "Program Part Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "documents.IMG_PROGRAM_PART_HIGHLIGHT.relativeURI",
                formatter: "image",
                range: "1,1:12,6",
              },
              {
                field: "name",
                prefix: "Name: ",
                range: "4,7:12,7",
              },
              {
                field: "swcps.Description",
                prefix: "Description: ",
                range: "4,8:7,8",
              },
              {
                field: "configuration",
                prefix: "Configuration: ",
                range: "8,8:12,8",
              },
              {
                field: "panel.material.name",
                prefix: "Material: ",
                range: "4,10:7,10",
              },
              {
                field: "panel.length",
                prefix: "Length: ",
                formatter: "text",
                range: "4,9:6,9",
              },
              {
                field: "panel.width",
                prefix: "Width: ",
                formatter: "text",
                range: "7,9:9,9",
              },
              {
                field: "panel.thickness",
                prefix: "Thickness: ",
                formatter: "text",
                range: "10,9:12,9",
              },
              {
                field: "quantity",
                prefix: "Quantity: ",
                formatter: "text",
                range: "8,10:12,10",
              },
              {
                field: "comments",
                prefix: "Comments: ",
                formatter: "text",
                range: "4,11:12,12",
              },
              {
                field: "documents.IMG_PROGRAM_PART.relativeURI",
                formatter: "image",
                range: "1,7:3,12",
              },
            ],
          },
        },
        {
          id: "panel.layers",
          name: "panel.layers",
          type: "table",
          resource: "panel.layers",
          table: {
            title: "Layers",
            columns: [
              {
                field: "name",
                title: "Name",
                widthGrow: 1,
              },
              {
                field: "material.name",
                title: "Material",
                widthGrow: 1,
              },
              {
                field: "thickness",
                title: "Thick",
                widthGrow: 1,
              },
            ],
          },
        },
        {
          id: "panel.laminates",
          name: "panel.laminates",
          type: "table",
          resource: "panel.laminates",
          table: {
            title: "Laminates",
            columns: [
              {
                field: "name",
                title: "Name",
                widthGrow: 1,
              },
              {
                field: "material.name",
                title: "Material",
                widthGrow: 1,
              },
              {
                field: "thickness",
                title: "Thick",
                widthGrow: 1,
              },
            ],
          },
        },
        {
          id: "panel.edgebands",
          name: "panel.edgebands",
          type: "table",
          resource: "panel.edgebands",
          table: {
            title: "Edgebands",
            columns: [
              {
                field: "name",
                title: "Name",
                widthGrow: 1,
              },
              {
                field: "material.name",
                title: "Material",
                widthGrow: 1,
              },
              {
                field: "thickness",
                title: "Thick",
                widthGrow: 1,
              },
            ],
          },
        },
        {
          id: "panel.processZones",
          name: "panel.processZones",
          type: "table",
          resource: "panel.processZones",
          table: {
            title: "Panel Process",
            columns: [
              {
                field: "name",
                title: "Name",
                widthGrow: 1,
              },
              {
                field: "ZoneName",
                title: "Zone",
                widthGrow: 1,
              },
            ],
          },
        },
        {
          id: "panel.programs",
          name: "panel.programs",
          type: "table",
          resource: "panel.programs",
          table: {
            title: "Programs",
            columns: [
              {
                field: "name",
                title: "Name",
                width: 400,
                formatter: "link",
                formatterParams: {
                  url: "/programs/:key",
                },
              },
              {
                field: "machine",
                title: "Code",
                widthGrow: 1,
              },
            ],
          },
        },
      ],
    },
    {
      id: "frame-details",
      name: "frame-details",
      description: "(pro) details of a single frame",
      url: "/frames/:key",
      resource: "frames",
      type: "layout",
      title: "Frame Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "documents.IMG_FRAME.relativeURI",
                formatter: "image",
                formatterParams: {
                  edrawings: "documents.EDRAWINGS_FRAME.relativeURI",
                },
                range: "1,1:12,6",
              },
              {
                field: "swcps.ID",
                prefix: "id: ",
                range: "4,7:4,7",
              },
              {
                field: "name",
                prefix: "Name: ",
                range: "5,7:11,7",
              },
              {
                field: "documents.PDF_FRAME.relativeURI",
                prefix: "pdf: ",
                formatter: "link",
                range: "12,7:12,7",
              },
              {
                field: "swcps.Description",
                prefix: "Description: ",
                range: "4,8:8,8",
              },
              {
                field: "configuration",
                prefix: "Configuration: ",
                range: "9,8:12,8",
              },
              {
                field: "panels",
                prefix: "Materials: ",
                range: "4,10:8,10",
                formatter: "list",
                formatterParams: {
                  valueMap: "material.name",
                  removeDuplicates: true,
                  delimiter: " | ",
                },
              },
              {
                field: "quantity",
                prefix: "Quantity: ",
                formatter: "text",
                range: "9,10:12,10",
              },
              {
                field: "swcps.Comments",
                prefix: "Comments: ",
                range: "4,11:12,12",
                wrapText: true,
              },
              {
                field: "documents.IMG_FRAME.relativeURI",
                formatter: "image",
                range: "1,7:3,12",
              },
              {
                field: "height",
                prefix: "Height: ",
                range: "4,9:6,9",
              },
              {
                field: "width",
                prefix: "Width: ",
                range: "7,9:9,9",
              },
              {
                field: "depth",
                prefix: "Depth: ",
                range: "10,9:12,9",
              },
            ],
          },
        },
        {
          id: "subFrames",
          name: "subFrames",
          type: "table",
          resource: "subFrames",
          table: {
            title: "Sub Frames",
            initialSort: [
              {
                column: "swcps.ID",
                dir: "asc",
              },
            ],
            columns: [
              {
                field: "swcps.ID",
                title: "#",
                width: 100,
              },
              {
                field: "name",
                title: "Name",
                width: 400,
                formatter: "link",
                formatterParams: {
                  url: "/sub-frames/:key",
                },
              },
              {
                field: "swcps.Description",
                title: "Description",
                widthGrow: 1,
              },
            ],
          },
        },
        {
          id: "panels",
          name: "panels",
          type: "table",
          resource: "panels",
          table: {
            title: "Panels",
            dataTreeElementColumn: "name",
            initialSort: [
              {
                column: "swcps.ID",
                dir: "asc",
              },
            ],
            treeBy: [
              {
                field: "swcps.CombineID",
                flattenSingleChildGroups: false,
                parentValues: [
                  {
                    field: "name",
                    value: '"Combined Panel " + swcps.CombineID',
                  },
                ],
                parentCalculations: [
                  {
                    field: "quantityInParent",
                    type: "sum",
                  },
                ],
              },
            ],
            columns: [
              {
                field: "swcps.ID",
                title: "#",
                width: 100,
              },
              {
                field: "name",
                title: "Part Name",
                width: 400,
                formatter: "link",
                formatterParams: {
                  url: "/panels/:key",
                },
              },
              {
                field: "swcps.Description",
                title: "Description",
                widthGrow: 2,
              },
              {
                field: "material.name",
                title: "Material",
                widthGrow: 2,
              },
              {
                field: "quantityInParent",
                title: "Qty",
                width: 100,
              },
            ],
          },
        },
        {
          id: "hardware",
          name: "hardware",
          type: "table",
          resource: "hardware",
          table: {
            title: "Hardware",
            initialSort: [
              {
                column: "name",
                dir: "asc",
              },
            ],
            columns: [
              {
                field: "",
                title: "",
                width: 100,
              },
              {
                field: "name",
                title: "Name",
                width: 400,
                formatter: "link",
                formatterParams: {
                  url: "/hardware/:key",
                },
              },
              {
                field: "swcps.Description",
                title: "Description",
                widthGrow: 2,
              },
              {
                field: "configuration",
                title: "Configuration",
                widthGrow: 1,
              },
              {
                field: "supplier",
                title: "Supplier",
                widthGrow: 1,
              },
              {
                field: "quantityInParent",
                title: "Qty",
                width: 100,
              },
            ],
          },
        },
        {
          id: "programs",
          name: "programs",
          type: "table",
          resource: "programs",
          table: {
            title: "Programs",
            initialSort: [
              {
                column: "part.name",
                dir: "asc",
              },
            ],
            columns: [
              {
                field: "part.name",
                title: "Panel Name",
                width: 400,
              },
              {
                field: "name",
                title: "Program",
                widthGrow: 1,
                formatter: "link",
                formatterParams: {
                  url: "/programs/:key",
                },
              },
              {
                field: "machine",
                title: "Machine",
                widthGrow: 1,
              },
              {
                field: "quantity",
                title: "Qty",
                width: 100,
              },
            ],
          },
        },
        {
          id: "weldments",
          name: "weldments",
          type: "table",
          resource: "weldments",
          table: {
            title: "Weldments",
            treeBy: [
              {
                field: "cutlist",
                flattenSingleChildGroups: false,
                parentValues: [
                  {
                    field: "name",
                    value: "cutlist",
                  },
                ],
                parentCalculations: [
                  {
                    field: "quantity",
                    type: "sum",
                  },
                ],
              },
            ],
            columns: [
              {
                field: "name",
                title: "Name",
                width: "auto",
              },
              {
                field: "description",
                title: "Description",
                width: "250",
              },
              {
                field: "length",
                title: "Length",
                width: "160",
              },
              {
                field: "lengthTotal",
                title: "Length Total",
                width: "160",
              },
              {
                field: "quantity",
                title: "Qty",
                width: 100,
              },
            ],
          },
        },
      ],
    },
    {
      id: "sub-frame-details",
      name: "sub-frame-details",
      description: "(pro) details of a single sub frame",
      url: "/sub-frames/:key",
      resource: "subFrames",
      type: "layout",
      title: "Sub Frame Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "documents.IMG_SUBFRAME.relativeURI",
                formatter: "image",
                formatterParams: {
                  edrawings: "documents.EDRAWINGS_SUBFRAME.relativeURI",
                },
                range: "1,1:12,6",
              },
              {
                field: "swcps.ID",
                prefix: "id: ",
                range: "4,7:4,7",
              },
              {
                field: "name",
                prefix: "Name: ",
                range: "5,7:11,7",
              },
              {
                field: "documents.PDF_FRAME.relativeURI",
                prefix: "pdf: ",
                formatter: "link",
                range: "12,7:12,7",
              },
              {
                field: "swcps.Description",
                prefix: "Description: ",
                range: "4,8:8,8",
              },
              {
                field: "configuration",
                prefix: "Configuration: ",
                range: "9,8:12,8",
              },
              {
                field: "panels",
                prefix: "Materials: ",
                range: "4,9:8,9",
                formatter: "list",
                formatterParams: {
                  valueMap: "material.name",
                  removeDuplicates: true,
                  delimiter: " | ",
                },
              },
              {
                field: "quantity",
                prefix: "Quantity: ",
                formatter: "text",
                range: "9,9:12,9",
              },
              {
                field: "swcps.Comments",
                prefix: "Comments: ",
                range: "4,10:12,11",
                wrapText: true,
              },
              {
                field: "documents.IMG_SUBFRAME.relativeURI",
                formatter: "image",
                range: "1,7:3,11",
              },
            ],
          },
        },
        {
          id: "subFrames",
          name: "subFrames",
          type: "table",
          resource: "subFrames",
          table: {
            title: "Sub Frames",
            initialSort: [
              {
                column: "swcps.ID",
                dir: "asc",
              },
            ],
            columns: [
              {
                field: "swcps.ID",
                title: "#",
                width: 100,
              },
              {
                field: "name",
                title: "Name",
                width: 400,
                formatter: "link",
                formatterParams: {
                  url: "/sub-frames/:key",
                },
              },
              {
                field: "swcps.Description",
                title: "Description",
                widthGrow: 1,
              },
            ],
          },
        },
        {
          id: "panels",
          name: "panels",
          type: "table",
          resource: "panels",
          table: {
            title: "Panels",
            initialSort: [
              {
                column: "swcps.ID",
                dir: "asc",
              },
            ],
            dataTreeElementColumn: "name",
            treeBy: [
              {
                field: "swcps.CombineID",
                flattenSingleChildGroups: false,
                parentValues: [
                  {
                    field: "name",
                    value: '"Combined Panel " + swcps.CombineID',
                  },
                ],
                parentCalculations: [
                  {
                    field: "quantityInParent",
                    type: "sum",
                  },
                ],
              },
            ],
            columns: [
              {
                field: "swcps.ID",
                title: "#",
                width: 100,
              },
              {
                field: "name",
                title: "Part Name",
                width: 400,
                formatter: "link",
                formatterParams: {
                  url: "/panels/:key",
                },
              },
              {
                field: "swcps.Description",
                title: "Description",
                widthGrow: 2,
              },
              {
                field: "material.name",
                title: "Material",
                widthGrow: 2,
              },
              {
                field: "quantityInParent",
                title: "Qty",
                width: 100,
              },
            ],
          },
        },
        {
          id: "hardware",
          name: "hardware",
          type: "table",
          resource: "hardware",
          table: {
            title: "Hardware",
            initialSort: [
              {
                column: "name",
                dir: "asc",
              },
            ],
            columns: [
              {
                field: "",
                title: "",
                width: 100,
              },
              {
                field: "name",
                title: "Name",
                width: 400,
                formatter: "link",
                formatterParams: {
                  url: "/hardware/:key",
                },
              },
              {
                field: "swcps.Description",
                title: "Description",
                widthGrow: 2,
              },
              {
                field: "configuration",
                title: "Configuration",
                widthGrow: 1,
              },
              {
                field: "supplier",
                title: "Supplier",
                widthGrow: 1,
              },
              {
                field: "quantityInParent",
                title: "Qty",
                width: 100,
              },
            ],
          },
        },
        {
          id: "programs",
          name: "programs",
          type: "table",
          resource: "programs",
          table: {
            title: "Programs",
            initialSort: [
              {
                column: "part.name",
                dir: "asc",
              },
            ],
            columns: [
              {
                field: "part.name",
                title: "Panel Name",
                width: 400,
              },
              {
                field: "name",
                title: "Program",
                widthGrow: 1,
                formatter: "link",
                formatterParams: {
                  url: "/programs/:key",
                },
              },
              {
                field: "machine",
                title: "Machine",
                widthGrow: 1,
              },
              {
                field: "quantity",
                title: "Qty",
                width: 100,
              },
            ],
          },
        },
        {
          id: "weldments",
          name: "weldments",
          type: "table",
          resource: "weldments",
          table: {
            title: "Weldments",
            treeBy: [
              {
                field: "cutlist",
                flattenSingleChildGroups: false,
                parentValues: [
                  {
                    field: "name",
                    value: "cutlist",
                  },
                ],
                parentCalculations: [
                  {
                    field: "quantity",
                    type: "sum",
                  },
                ],
              },
            ],
            columns: [
              {
                field: "name",
                title: "Name",
                width: "auto",
              },
              {
                field: "description",
                title: "Description",
                width: "250",
              },
              {
                field: "length",
                title: "Length",
                width: "160",
              },
              {
                field: "lengthTotal",
                title: "Length Total",
                width: "160",
              },
              {
                field: "quantity",
                title: "Qty",
                width: 100,
              },
            ],
          },
        },
      ],
    },
    {
      id: "sheet-details",
      name: "sheet-details",
      description: "details of a single nested sheet",
      url: "/sheets/:key",
      resource: "sheets",
      type: "layout",
      title: "Sheet Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "documents.IMG_SHEET.relativeURI",
                formatter: "image",
                formatterParams: {
                  edrawings: "documents.EDRAWINGS_SHEET.relativeURI",
                },
                range: "1,1:12,6",
              },
              {
                field: "name",
                prefix: "Name: ",
                range: "1,7:12,7",
              },
              {
                field: "length",
                prefix: "Length: ",
                range: "1,8:9,8",
              },
              {
                field: "width",
                prefix: "Width: ",
                range: "1,9:9,9",
              },
              {
                field: "thickness",
                prefix: "Thickness: ",
                range: "1,10:9,10",
              },
              {
                field: "quantity",
                prefix: "Quantity: ",
                formatter: "text",
                range: "10,8:12,8",
              },
              {
                field: "refBoard",
                prefix: "Material: ",
                formatter: "text",
                range: "10,9:12,9",
              },
              {
                field: "programDocument.relativeURI",
                prefix: "code: ",
                formatter: "link",
                range: "10,10:12,10",
              },
            ],
          },
        },
        {
          id: "programParts",
          name: "programParts",
          type: "table",
          resource: "programParts",
          table: {
            title: "Panels",
            columns: [
              {
                field: "programPartId",
                title: "Nesting ID",
                width: 120,
                hozAlign: "center",
              },
              {
                field: "name",
                title: "Name",
                width: 400,
                formatter: "link",
                formatterParams: {
                  url: "/program-parts/:key",
                },
              },
              {
                field: "part.swcps.Description",
                title: "Description",
                widthGrow: 1,
              },
              {
                field: "panel.length",
                title: "Length",
                widthGrow: 1,
              },
              {
                field: "panel.width",
                title: "Width",
                widthGrow: 1,
              },
              {
                field: "panel.thickness",
                title: "Thick",
                widthGrow: 1,
              },
            ],
          },
        },
        {
          id: "tools",
          name: "tools",
          type: "table",
          resource: "tools",
          table: {
            title: "Tools",
            columns: [
              {
                field: "number",
                title: "Tool #",
                hozAlign: "center",
                width: 100,
              },
              {
                field: "name",
                title: "Name",
                width: 400,
              },
              {
                field: "diameter",
                title: "Diameter",
                widthGrow: 1,
              },
            ],
          },
        },
      ],
    },
    {
      id: "sheet-details-simplified",
      name: "sheet-details-simplified",
      description: "details of a single nested sheet",
      url: "/sheets-simple/:key",
      resource: "sheets",
      type: "layout",
      title: "Sheet Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "documents.IMG_SHEET.relativeURI",
                formatter: "image",
                range: "7,1:12,6",
              },
              {
                field: "name",
                prefix: "Name: ",
                range: "1,1:5,1",
              },
              {
                field: "length",
                prefix: "Length: ",
                range: "1,2:6,2",
              },
              {
                field: "quantity",
                prefix: "Quantity: ",
                formatter: "text",
                range: "6,1:6,1",
              },
              {
                field: "refBoard",
                prefix: "Material: ",
                formatter: "text",
                range: "1,5:6,5",
              },
              {
                field: "programDocument.relativeURI",
                prefix: "code: ",
                formatter: "link",
                range: "1,6:6,6",
              },
              {
                field: "width",
                prefix: "Width: ",
                range: "1,3:6,3",
              },
              {
                field: "thickness",
                prefix: "Thickness: ",
                range: "1,4:6,4",
              },
            ],
          },
        },
      ],
    },
    {
      id: "sheet-detailed-list",
      name: "sheet detailed list",
      url: "/sheet-detailed-list",
      type: "layout",
      title: "Sheet Detailed List",
      resource: "project",
      sections: [
        {
          id: "loop",
          name: "loop",
          type: "loop",
          loop: {
            source: "sheet-details-simplified",
          },
        },
      ],
      description: "List of all sheets",
    },
    {
      id: "pattern-details",
      name: "pattern-details",
      description: "details of a single pattern",
      url: "/patterns/:key",
      resource: "patterns",
      type: "layout",
      title: "Pattern Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "pattern",
                formatter: "pattern",
                range: "1,1:12,6",
                formatterParams: {
                  panelLabel: "serialNumbers.NUM_PANEL",
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
                field: "name",
                prefix: "Name: ",
                range: "1,7:12,7",
              },
              {
                field: "length",
                prefix: "Length: ",
                range: "1,8:4,8",
              },
              {
                field: "width",
                prefix: "Width: ",
                range: "5,8:8,8",
              },
              {
                field: "thickness",
                prefix: "Thickness: ",
                range: "1,9:4,9",
              },
              {
                field: "refBoard",
                prefix: "Material: ",
                formatter: "text",
                range: "5,9:8,9",
              },
              {
                field: "quantityPanels",
                prefix: "Panels: ",
                range: "1,10:2,10",
              },
              {
                field: "quantityTrims",
                prefix: "trims: ",
                range: "3,10:4,10",
              },
              {
                field: "quantityWaste",
                prefix: "waste: ",
                range: "5,10:6,10",
              },
              {
                field: "quantityCuts",
                prefix: "cuts: ",
                range: "7,10:8,10",
              },
              {
                field: "comments",
                prefix: "Comments: ",
                range: "9,8:12,10",
              },
            ],
          },
        },
        {
          id: "panels",
          name: "panels",
          type: "table",
          resource: "panels",
          table: {
            title: "Panels",
            columns: [
              {
                field: "serialNumbers.NUM_PANEL",
                title: "id",
                width: 100,
              },
              {
                field: "name",
                title: "Name",
                width: 400,
                formatter: "link",
                formatterParams: {
                  url: "/panels/:key",
                },
              },
              {
                field: "length",
                title: "Length",
                widthGrow: 1,
              },
              {
                field: "width",
                title: "Width",
                widthGrow: 1,
              },
              {
                field: "thickness",
                title: "Thick",
                widthGrow: 1,
              },
            ],
          },
        },
      ],
    },
    {
      id: "hardware-details",
      name: "hardware-details",
      description: "details of a single hardware",
      url: "/hardware/:key",
      resource: "hardware",
      type: "layout",
      title: "Hardware Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "documents.IMG_HARDWARE.relativeURI",
                formatter: "image",
                formatterParams: {
                  edrawings: "documents.EDRAWINGS_HARDWARE.relativeURI",
                },
                range: "1,1:12,6",
              },
              {
                field: "name",
                prefix: "Name: ",
                range: "1,7:12,7",
              },
              {
                field: "swcps.Description",
                prefix: "Description: ",
                range: "1,8:6,8",
              },
              {
                field: "configuration",
                prefix: "Configuration: ",
                range: "7,8:12,8",
              },
              {
                field: "swcps.Material",
                prefix: "Material: ",
                range: "1,9:6,9",
              },
              {
                field: "quantity",
                prefix: "Quantity: ",
                formatter: "text",
                range: "7,9:12,9",
              },
              {
                field: "swcps.Comments",
                prefix: "Comments: ",
                range: "1,10:12,11",
                wrapText: true,
              },
            ],
          },
        },
      ],
    },
    {
      id: "labels-panels",
      name: "labels-panels",
      description: "labels for panels",
      url: "/labels-panels",
      type: "labels",
      resource: "panels",
      sortBy: [
        {
          field: "material.name",
          dir: "desc",
        },
        {
          field: "swcps.ID",
          dir: "asc",
        },
      ],
      grid: {
        cells: [
          {
            field: "name",
            wrapText: true,
            range: "1,1:12,1",
          },
          {
            field: "documents.IMG_PANEL.relativeURI",
            formatter: "image",
            range: "7,2:12,5",
          },
          {
            field: "material.name",
            range: "1,3:6,3",
          },
          {
            field: "length",
            range: "1,4:6,4",
            prefix: "Length: ",
          },
          {
            field: "swcps.Description",
            range: "1,2:6,2",
          },
          {
            field: "width",
            range: "1,5:6,5",
            prefix: "Width: ",
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
      id: "labels-frames",
      name: "labels-frames",
      description: "(pro) labels for frames",
      url: "/labels-frames",
      type: "labels",
      resource: "frames",
      grid: {
        cells: [
          {
            field: "name",
            range: "3,1:12,1",
          },
          {
            field: "documents.IMG_FRAME.relativeURI",
            formatter: "image",
            range: "7,2:12,4",
          },
          {
            field: "swcps.Description",
            range: "1,2:6,2",
          },
          {
            field: '"assets/custom/company-logo-label.png"',
            formatter: "image",
            range: "1,1:2,1",
          },
          {
            field: 'height + "x" + width + "x" + depth',
            range: "1,3:6,3",
          },
          {
            field: 'instance + " of " + instance',
            range: "1,4:6,4",
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
      id: "labels-programParts",
      name: "labels-programParts",
      description: "labels for program parts (nested panels)",
      url: "/labels-programParts",
      type: "labels",
      resource: "programParts",
      grid: {
        cells: [
          {
            field: "name",
            wrapText: true,
            range: "1,1:12,1",
          },
          {
            field: "documents.IMG_PROGRAM_PART.relativeURI",
            formatter: "image",
            range: "7,2:12,5",
          },
          {
            field: "swcps.Description",
            range: "1,2:6,2",
          },
          {
            field: "panel.material.name",
            range: "1,3:6,3",
          },
          {
            field: "panel.length",
            range: "1,4:6,4",
            prefix: "Length: ",
          },
          {
            field: "panel.width",
            range: "1,5:6,5",
            prefix: "Width: ",
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
      id: "panel-detailed-list",
      name: "panel-detailed-list",
      description: "",
      type: "loop",
      url: "/panel-detailed-list",
      title: "Panel Detailed List",
      source: "panel-details-simplified",
      sortBy: [
        {
          field: "swcps.ID",
          dir: "asc",
        },
      ],
    },
    {
      id: "panel-details-simplified",
      name: "panel-details-simplified",
      description: "source for panel loop page",
      url: "/panel-details-simplified/:key",
      resource: "panels",
      type: "layout",
      title: "Panel Details",
      sections: [
        {
          id: "main",
          name: "main",
          type: "grid",
          grid: {
            cells: [
              {
                field: "name",
                prefix: "Name: ",
                range: "4,1:12,1",
              },
              {
                field: "swcps.Description",
                prefix: "Description: ",
                range: "4,2:7,2",
              },
              {
                field: "configuration",
                prefix: "Configuration: ",
                range: "8,2:12,2",
              },
              {
                field: "material.key",
                prefix: "Material: ",
                range: "4,4:7,4",
              },
              {
                field: "length",
                prefix: "Length: ",
                formatter: "text",
                range: "4,3:6,3",
              },
              {
                field: "width",
                prefix: "Width: ",
                formatter: "text",
                range: "7,3:9,3",
              },
              {
                field: "thickness",
                prefix: "Thickness: ",
                formatter: "text",
                range: "10,3:12,3",
              },
              {
                field: "quantity",
                prefix: "Quantity: ",
                formatter: "text",
                range: "8,4:12,4",
              },
              {
                field: "swcps.Comments",
                prefix: "Comments: ",
                range: "4,5:12,6",
                wrapText: true,
              },
              {
                field: "documents.IMG_PANEL.relativeURI",
                formatter: "image",
                range: "1,1:3,6",
              },
            ],
          },
        },
      ],
    },
  ],
  profiles: [
    {
      id: "default",
      name: "default",
      description: "main profile",
      menu: [
        {
          id: "home",
          to: "/",
          label: "Home",
          icon: {
            name: "home",
          },
          children: [],
        },
        {
          id: "frames",
          to: "/frames",
          label: "Frames",
          icon: {
            name: "door_sliding",
          },
          children: [
            {
              id: "sub-frames",
              to: "/sub-frames",
              label: "Sub Frames",
              icon: {
                name: "door_back",
              },
              children: [],
            },
          ],
        },
        {
          id: "panels",
          to: "/panels",
          label: "Panels",
          icon: {
            name: "crop_7_5",
          },
          children: [
            {
              id: "panel",
              label: "Detailed List",
              icon: {
                name: "dehaze",
              },
              collapsed: false,
              to: "/panel-detailed-list",
              children: [],
            },
          ],
        },
        {
          id: "stocks",
          to: "/stocks",
          label: "Stocks",
          icon: {
            name: "select_all",
          },
          children: [
            {
              id: "laminates",
              to: "/stocks/laminates",
              label: "Laminates",
              icon: {
                name: "filter_none",
              },
              children: [],
            },
            {
              id: "edgebands",
              to: "/stocks/edgebands",
              label: "Edgebands",
              icon: {
                name: "border_style",
              },
              children: [],
            },
          ],
        },
        {
          id: "weldments",
          to: "/weldments",
          label: "Weldments",
          icon: {
            name: "foundation",
          },
          children: [],
        },
        {
          id: "programs",
          to: "/programs",
          label: "Programs",
          icon: {
            name: "precision_manufacturing",
          },
          children: [
            {
              id: "tools",
              to: "/tools",
              label: "tools",
              icon: {
                name: "tools_power_drill",
              },
              children: [],
            },
            {
              id: "spindles",
              to: "/spindles",
              label: "spindles",
              icon: {
                name: "360",
              },
              children: [],
            },
          ],
        },
        {
          id: "sheets",
          to: "/sheets",
          label: "Sheets",
          icon: {
            name: "view_quilt",
          },
          children: [
            {
              id: "sheet-details",
              label: "Sheet Details",
              to: "/sheet-detailed-list",
              icon: {
                name: "article",
              },
              collapsed: false,
              children: [],
            },
          ],
        },
        {
          id: "program-parts",
          to: "/program-parts",
          label: "Nested Panels",
          icon: {
            name: "account_tree",
          },
          children: [],
        },
        {
          id: "patterns",
          to: "/patterns",
          label: "Patterns",
          icon: {
            name: "view_comfy",
          },
          children: [
            {
              id: "pattern-detailed-list",
              to: "/pattern-detailed-list",
              label: "Pattern List",
              icon: {
                name: "dehaze",
              },
              children: [],
            },
            {
              id: "patterned-panels",
              to: "/patterned-panels",
              label: "Patterned Panels",
              icon: {
                name: "carpenter",
              },
              children: [],
            },
          ],
        },
        {
          id: "hardware",
          to: "/hardware",
          label: "Hardware",
          icon: {
            name: "hardware",
          },
          children: [],
        },
        {
          id: "summary",
          to: "/summary",
          label: "Summary",
          icon: {
            name: "request_page",
          },
          children: [],
        },
        {
          id: "labels",
          label: "Labels",
          icon: {
            name: "sticky_note_2",
          },
          children: [
            {
              id: "labels-frames",
              to: "/labels-frames",
              label: "Frames",
              icon: {
                name: "view_compact",
              },
              children: [],
            },
            {
              id: "labels-panels",
              to: "/labels-panels",
              label: "Panels",
              icon: {
                name: "view_compact",
              },
              children: [],
            },
            {
              id: "labels-programParts",
              to: "/labels-programParts",
              label: "Program Parts",
              icon: {
                name: "view_compact",
              },
              children: [],
            },
          ],
        },
        {
          id: "data-viewer",
          to: "/data-viewer",
          label: "Data Viewer",
          icon: {
            name: "code",
          },
          children: [],
        },
        {
          id: "excluded",
          to: "/excluded",
          label: "Excluded",
          icon: {
            name: "block",
          },
          children: [],
        },
      ],
      print: [
        {
          id: "main-print-option",
        },
      ],
    },
  ],
  print: {
    headers: [
      {
        id: "main",
        name: "main",
        description: "main header",
        grid: {
          gap: 0,
          fontSize: 10,
          cellHeight: 25,
          cells: [
            {
              field: "name",
              prefix: "Project: ",
              range: "10,1:12,1",
            },
            {
              field: "swcps.Description",
              prefix: "Description: ",
              formatter: "text",
              range: "10,2:12,2",
            },
            {
              field: "swcps.Comments",
              prefix: "Comments: ",
              formatter: "text",
              range: "10,3:12,3",
            },
            {
              field: '"assets/custom/company-logo.png"',
              formatter: "image",
              range: "1,1:2,3",
            },
          ],
        },
      },
    ],
    groups: [
      {
        id: "main-group",
        name: "main group",
        description: "main page group containing most pages",
        pages: [
          {
            id: "home",
          },
          {
            id: "frames",
          },
          {
            id: "panels",
          },
          {
            id: "stocks",
          },
          {
            id: "programs",
          },
          {
            id: "program-parts",
          },
          {
            id: "patterned-panels",
          },
          {
            id: "weldments",
          },
          {
            id: "hardware",
          },
          {
            id: "summary",
          },
        ],
      },
    ],
    options: [
      {
        id: "main-print-option",
        name: "Main",
        description: "Main print option",
        header: {
          id: "main",
        },
        group: {
          id: "main-group",
        },
      },
    ],
  },
};

try {
  module.exports = viewSettings;
} catch {}
