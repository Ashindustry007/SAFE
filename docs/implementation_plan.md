# Interactive Fire Spread Simulation

This document outlines the approach to implement the real-time fire spread simulation on the Google Map.

## Goal
To implement a feature where hovering over a point on the Google Map initiates a localized fire spread simulation, demonstrating where the fire could spread based on real-world elevation, wind, vegetation, and drought data, using the Cellular Automaton (CA) model described in the PRD.

> [!IMPORTANT]
> ## User Review Required
> Please review the open questions below to clarify the approach before I implement the simulation.

## Open Questions

> [!WARNING]
> **1. Grid Size & API Limits**: The PRD specifies a 240x160 grid (38,400 cells). Fetching elevation for this many points in real-time via the Google Maps API is impossible due to rate limits (max 512 points per request). To make it work instantly on hover, I plan to use a smaller localized grid around the cursor (e.g., 21x21 cells = 441 points), which requires just 1 API call. Is this acceptable?

> [!WARNING]
> **2. Hover Behavior**: Running a new simulation *every* time the mouse moves will cause visual chaos and API spam. I propose debouncing the hover event (e.g., waiting for the cursor to rest for 500ms) before fetching elevation and starting the simulation. Would you prefer this, or triggered strictly by a click?

> [!WARNING]
> **3. Vegetation/Drought Parameters**: The PRD uses a `zoneIndex` to determine these. Since we don't have zoned data in the app yet, I will use the global `intel` data (currently mocked in `wildfireApi.ts`) to inform the vegetation, drought, and wind for the local simulation grid. Is this acceptable?
> 
> *Resolution:* The user approved using the global `intel` data for now. 
> 
> ### Alternative Plans for Zone-Based Data
> In the future, to fully realize the PRD's vision of heterogeneous vegetation and drought mapping:
> 1. **GeoJSON Zonal Mapping**: We could overlay GeoJSON data layers onto the Google Map that define zones (e.g., Zone 0: Forest, Zone 1: Grassland). When the cursor is clicked, we intersect the local 21x21 grid coordinates with these GeoJSON polygons (using a library like `turf.js`) to determine the exact `vegetationType` and `droughtIndex` for each individual `FireCell`.
> 2. **Raster Image Lookups (PNG/TIFF)**: Similar to the PRD's mention of a heightmap PNG, we could load a colored "vegetation map" PNG where pixel colors correspond to zones. We draw this onto an off-screen `<canvas>`, map real-world LatLng to canvas X/Y, and read pixel values via `getImageData()` to assign zones to each cell.
> 3. **API Integration**: Integrate with a real-world API like NASA EarthData or the LANDFIRE API, which can provide fine-grained rasters of fuel types (vegetation) and moisture levels.

## Proposed Changes

### `src/App.tsx`
- **[MODIFY]** `src/App.tsx`
  - Add `mousemove` event listener to the Google Map instance.
  - Implement debouncing so that when the cursor rests, it triggers the simulation.
  - Use `google.maps.ElevationService` to fetch elevation for a grid of coordinates around the cursor.
  - Integrate a simulation engine that runs the CA tick loop over the grid.
  - Render the grid states on the map using `google.maps.Rectangle` polygons (coloring them red/orange for `burning`, black for `burntOut`).

### `src/utils/fireSimulation.ts`
- **[NEW]** `src/utils/fireSimulation.ts`
  - Create the engine containing the logic from the PRD.
  - **State**: `unburned`, `burning`, `burntOut`, `survived`.
  - **Tick Loop**: Apply spread probability `P = clamp( F_wind * F_slope * F_vegetation * F_drought * BASE_RATE * dt, 0, 1 )`.
  - **Factors**: 
    - `F_wind` calculation using the current intel data.
    - `F_slope` calculation using the fetched Google Maps elevation data.
    - `F_vegetation` and `F_drought` based on intel data.
  - Provide a step function `tick()` that advances the state of the grid.

## Verification Plan

### Manual Verification
1. Open the app in the browser (`npm run dev`).
2. Hover over the map and rest the cursor.
3. Verify that a grid of colored rectangles appears representing the simulation.
4. Verify the simulation animates over time, spreading according to the slope (faster uphill) and wind direction.
5. Check the developer console to ensure Google Maps API limits are not exceeded.
