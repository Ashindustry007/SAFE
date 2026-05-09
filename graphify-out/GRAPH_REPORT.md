# Graph Report - .  (2026-05-09)

## Corpus Check
- Large corpus: 234 files · ~197,478 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 636 nodes · 1183 edges · 37 communities (33 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `SimulationModel` - 45 edges
2. `TerrainSetup` - 34 edges
3. `useStores()` - 31 edges
4. `ChartDataModel` - 20 edges
5. `Cell` - 17 edges
6. `ChartDataSet` - 16 edges
7. `Cell` - 16 edges
8. `Vegetation` - 13 edges
9. `BottomBar` - 12 edges
10. `createStores()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `renderTopBar()` --calls--> `createStores()`  [EXTRACTED]
  scratch/wildfire-model-ref/src/components/top-bar/top-bar.test.tsx → scratch/wildfire-model-ref/src/models/stores.ts
- `TopBar()` --calls--> `useStores()`  [EXTRACTED]
  scratch/wildfire-model-ref/src/components/top-bar/top-bar.tsx → scratch/wildfire-model-ref/src/use-stores.ts
- `setupElevation()` --calls--> `ftToViewUnit()`  [EXTRACTED]
  scratch/wildfire-model-ref/src/components/view-3d/terrain.tsx → scratch/wildfire-model-ref/src/components/view-3d/helpers.ts
- `createStores()` --calls--> `getDefaultConfig()`  [EXTRACTED]
  scratch/wildfire-model-ref/src/models/stores.ts → scratch/wildfire-model-ref/src/config.ts
- `createStores()` --calls--> `getUrlConfig()`  [EXTRACTED]
  scratch/wildfire-model-ref/src/models/stores.ts → scratch/wildfire-model-ref/src/config.ts

## Communities (37 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (50): colorArrayToRGBA(), FireIntensityScale(), interactionCursors, useCustomCursor(), Interaction, { logMonitor }, useStores(), FireLineMarkersContainer (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (47): DroughtSelector(), IProps, zoneCssClasses, zoneTypeText, cssClasses, IProps, panelClasses, panelInstructions (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (11): bottomBar, modelInfo, terrain, zone1, zone2, bottomBar, modelInfo, terrain (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (33): spark, start, stores, terrainButton, stores, SimulationInfo, stores, CellOptions (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (31): Fuel, IWindProps, endOfLowIntensityFireProbability, FireEngine, getGridCellNeighbors(), IFireEngineConfig, nonburnableCellBetween(), cells (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (21): Simulation3DProps, Tool, TOWNS, Terrain3D(), Terrain3DProps, BurnIndex, Cell, CellOptions (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (17): BottomBar, dispose, endedCalls, endedIdx, mockLog, reloadedIdx, reloadMock, restartedIdx (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (18): AppComponent, getMousePosition(), handleMouseEnter(), handleMouseLeave(), { logMonitor }, Graph, RightPanel, RightPanelTab (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (11): Message, FAQ, SimulationView3D(), BoundingBox, fetchDroughtIndex(), fetchVegetationData(), fetchWildfireIntel(), fetchWindVectors() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (14): SimulationProps, calculateSpreadProbability(), CellState, Grid, igniteCell(), initializeGrid(), SimulationParams, stepSimulation() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (11): calculateTriangleArea(), downsample(), Color, DataPoint, GraphPatternType, IChartDataSet, IDataPoint, pointIdx (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (10): BaseComponent, IBaseProps, configSnapshot, IProps, IState, IconButton(), IProps, IProps (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (8): BarChart, barData(), barDatasetDefaults, defaultOptions, IBarProps, IBarState, IChartDataModel, ChartColors

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (7): hexToRGBValue(), defaultOptions, ILineProps, ILineState, LineChart, lineData(), lineDatasetDefaults

### Community 18 - "Community 18"
Cohesion: 0.2
Nodes (4): Annotation, IChartAnnotation, chartDataSets, points

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (7): Chart, ChartType, IChartProps, IChartState, borderDash0, borderDash1, borderDash2

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (6): IChartControlProps, IChartControlState, LineChartControls, nextState, startIdx, baseColors

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (7): app, geminiModel, genAI, groq, mistral, openai, runpod

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (5): autoprefixer, CopyWebpackPlugin, HtmlWebpackPlugin, MiniCssExtractPlugin, path

## Knowledge Gaps
- **161 isolated node(s):** `path`, `autoprefixer`, `MiniCssExtractPlugin`, `HtmlWebpackPlugin`, `CopyWebpackPlugin` (+156 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FireEngine` connect `Community 4` to `Community 3`, `Community 5`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `SimulationModel` connect `Community 6` to `Community 0`, `Community 3`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `useStores()` connect `Community 0` to `Community 8`, `Community 1`, `Community 19`, `Community 7`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `path`, `autoprefixer`, `MiniCssExtractPlugin` to the rest of the system?**
  _161 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._