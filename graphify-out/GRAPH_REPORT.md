# Graph Report - RTE  (2026-05-09)

## Corpus Check
- 129 files · ~198,718 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 707 nodes · 1247 edges · 43 communities (37 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5d0b8c18`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]

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

## Communities (43 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (51): stores, TerrainPanel, defaultThreeZones, defaultTwoZones, drought, stores, veg, FireEngine (+43 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (51): colorArrayToRGBA(), FireIntensityScale(), interactionCursors, useCustomCursor(), Interaction, UIModel, { logMonitor }, useStores() (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (41): Simulation3DProps, Tool, TOWNS, Terrain3D(), Terrain3DProps, BurnIndex, Cell, CellOptions (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (11): bottomBar, modelInfo, terrain, zone1, zone2, bottomBar, modelInfo, terrain (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (33): DroughtSelector(), IProps, SimulationInfo, stores, zoneCssClasses, zoneTypeText, cssClasses, IProps (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (27): BottomBar, configSnapshot, IProps, IState, spark, start, stores, terrainButton (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (16): BaseComponent, IBaseProps, Chart, ChartType, IChartProps, IChartState, borderDash0, borderDash1 (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (14): AppComponent, getMousePosition(), handleMouseEnter(), handleMouseLeave(), { logMonitor }, container, root, stores (+6 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (11): Message, FAQ, SimulationView3D(), BoundingBox, fetchDroughtIndex(), fetchVegetationData(), fetchWildfireIntel(), fetchWindVectors() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (14): SimulationProps, calculateSpreadProbability(), CellState, Grid, igniteCell(), initializeGrid(), SimulationParams, stepSimulation() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (11): calculateTriangleArea(), downsample(), Color, DataPoint, GraphPatternType, IChartDataSet, IDataPoint, pointIdx (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (6): Annotation, IChartAnnotation, chartDataSets, points, IChartDataModel, ChartColors

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (12): 1. Configure Environment, 1. Multi-Provider API Failsafe (Backend), 2. Dual-Layer Frontend Intelligence, 2. Run Development Environment, code:env (# AI Providers), code:bash (npm install), 📥 Getting Started, 🌲 High-Fidelity Simulation Engine (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (12): Building, code:block1 (sim.load({), Configuration, Cypress Run Examples, Cypress Run Options, Deployment, Development, License (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (11): 1. Environmental Intelligence, 1. Hybrid Chatbot System, 2. High-Fidelity Physics Loop, 2. Multi-Provider Failsafe, code:mermaid (graph TD), 📁 Directory Structure, 🏗️ High-Level Overview, 🧬 Intelligence Architecture (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (7): hexToRGBValue(), BarChart, barData(), barDatasetDefaults, defaultOptions, IBarProps, IBarState

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (10): 1. Moisture Damping, 2. Vector-Based Spread, 3. Burn Index (BI) & Suppression, 🧬 Advanced Physics Components, code:typescript (const moistureDamping = 1 - (2.59 * r) + (5.11 * r^2) - (3.5), 💻 Implementation Stack, 🧮 Mathematical Foundation, 🌿 Physical Fuel Models (`FuelConstants`) (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (10): Add Log Events and Integrate Log Monitor for Wildfire Model, Dependency Update, Documentation, General Requirements, Log Monitor Integration, Out of Scope, Overview, Requirements (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (6): defaultOptions, ILineProps, ILineState, LineChart, lineData(), lineDatasetDefaults

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (6): IChartControlProps, IChartControlState, LineChartControls, nextState, startIdx, baseColors

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (7): app, geminiModel, genAI, groq, mistral, openai, runpod

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (7): Dialogs & UI, Fire Tools, Graph, Logged Events Reference, Mouse Interaction, Simulation Lifecycle, Terrain & Settings

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (5): autoprefixer, CopyWebpackPlugin, HtmlWebpackPlugin, MiniCssExtractPlugin, path

## Knowledge Gaps
- **204 isolated node(s):** `path`, `autoprefixer`, `MiniCssExtractPlugin`, `HtmlWebpackPlugin`, `CopyWebpackPlugin` (+199 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FireEngine` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `SimulationModel` connect `Community 6` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `useStores()` connect `Community 1` to `Community 8`, `Community 4`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `path`, `autoprefixer`, `MiniCssExtractPlugin` to the rest of the system?**
  _204 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._