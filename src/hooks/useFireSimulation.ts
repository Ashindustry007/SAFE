/// <reference types="@types/google.maps" />
/**
 * SAFE (Simulated Analysis of Fire Ecology) - Fire Simulation Hook
 * 
 * A specialized React hook that manages the lifecycle of a real-world mapped
 * wildfire simulation. It coordinates:
 * - Dynamic terrain acquisition (Elevation + OSM Water features).
 * - Lazy-loading of simulation chunks as the fire spreads.
 * - High-performance Canvas rendering as a Google Maps Overlay.
 * - Integration with the physical Rothermel spread engine.
 */

import { useRef, useState, useCallback } from 'react';
import { FireSimulation, DEFAULT_PARAMS } from '../utils/fireSimulation';
import type { FireCell, SimulationIntel, CellState } from '../utils/fireSimulation';

// Constants for physical mapping
const CELL_SIZE_M = DEFAULT_PARAMS.cellSizeFt * 0.3048; // Standard cell size in meters (~152.4m)
const CHUNK_SIZE = 21; // Modular chunk dimension (21x21 cells fits within Google API limits)

/**
 * getColorForState
 * Determines the visual color of a cell based on its combustion state and intensity.
 */
const getColorForState = (cell: FireCell) => {
  switch(cell.state) {
    case 'unburned': return 'transparent';
    case 'water': return 'transparent'; // Map transparency allows natural water visibility
    case 'burning': {
      // Linear interpolation of color based on burn intensity (3 tiers)
      const ratio = cell.burnTimeElapsed / DEFAULT_PARAMS.minCellBurnTime;
      if (ratio < 0.33) return '#ffb200'; // Low Intensity
      if (ratio < 0.66) return '#ff8000'; // Medium Intensity
      return '#ff0000';                   // High Intensity (Peak Combustion)
    }
    case 'burntOut': return '#333333'; // Ash/Charcoal color
    case 'survived': return '#228B22'; // Forest Green (Fire-resistant vegetation)
    default: return 'transparent';
  }
};

/**
 * generateFuelForCell
 * Heuristic fuel density generator based on topographic elevation and coordinate noise.
 */
const generateFuelForCell = (x: number, y: number, elevation: number) => {
  if (elevation <= 0) return 0; // Water/Ocean non-burnable
  
  // Fractal-like noise generation using trigonometric summation
  const noise = (
    Math.sin(x * 0.3) + 
    Math.sin(y * 0.3) + 
    Math.cos((x + y) * 0.15) + 
    Math.sin(x * 0.05) * Math.cos(y * 0.05)
  ) / 4;
  
  let fuel = (noise + 1) / 2;
  
  // Thresholding for rocky areas or natural breaks
  if (fuel < 0.3) return 0; 
  
  return Math.min(1, fuel * 1.2);
};

/**
 * fetchWaterFeatures
 * Queries the Overpass API for natural water features (rivers, lakes) within a region.
 */
const fetchWaterFeatures = async (s: number, w: number, n: number, e: number) => {
  try {
    const query = `[out:json];(way["natural"="water"](${s},${w},${n},${e});way["waterway"~"river|stream|canal"](${s},${w},${n},${e});relation["natural"="water"](${s},${w},${n},${e}););out geom;`;
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data.elements || [];
  } catch (err) {
    console.warn("OSM Water fetch failed:", err);
    return [];
  }
};

/**
 * isPointInWater
 * Point-in-polygon/proximity check for OSM water geometries.
 */
const isPointInWater = (lat: number, lng: number, waterFeatures: any[]) => {
  const THRESHOLD = 0.0006; // Interaction radius (approx 60 meters)
  for (const feature of waterFeatures) {
    if (feature.type === 'way' && feature.geometry) {
      for (const p of feature.geometry) {
        const dLat = p.lat - lat;
        const dLng = p.lon - lng;
        if (Math.sqrt(dLat * dLat + dLng * dLng) < THRESHOLD) return true;
      }
    }
  }
  return false;
};

let CanvasOverlayClass: any = null;

/**
 * getCanvasOverlayClass
 * Returns a Google Maps OverlayView subclass for high-performance simulation rendering.
 */
const getCanvasOverlayClass = () => {
  if (CanvasOverlayClass) return CanvasOverlayClass;

  CanvasOverlayClass = class extends google.maps.OverlayView {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D | null;
    private startLat: number;
    private startLng: number;
    private latOffset: number;
    private lngOffset: number;
    private grid: Map<string, FireCell> | null = null;

    constructor(startLat: number, startLng: number, latOffset: number, lngOffset: number) {
      super();
      this.startLat = startLat;
      this.startLng = startLng;
      this.latOffset = latOffset;
      this.lngOffset = lngOffset;
      
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'absolute';
      this.canvas.style.filter = 'blur(8px) contrast(1.5)'; // Visual "Heat" glow effect
      this.canvas.style.opacity = '0.8';
      this.canvas.style.pointerEvents = 'none';
      this.context = this.canvas.getContext('2d');
    }

    onAdd() {
      const panes = this.getPanes();
      if (panes) {
        panes.overlayLayer.appendChild(this.canvas);
      }
    }

    /**
     * draw
     * Maps the simulation grid coordinates to map pixel coordinates and renders current state.
     */
    draw() {
      const projection = this.getProjection();
      if (!this.context || !projection || !this.grid || this.grid.size === 0) return;

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      for (const cell of this.grid.values()) {
        if (cell.x < minX) minX = cell.x;
        if (cell.x > maxX) maxX = cell.x;
        if (cell.y < minY) minY = cell.y;
        if (cell.y > maxY) maxY = cell.y;
      }

      // Georeferencing logic: map grid bounds to LatLng
      const swLat = this.startLat - (maxY + 0.5) * this.latOffset;
      const swLng = this.startLng + (minX - 0.5) * this.lngOffset;
      const neLat = this.startLat - (minY - 0.5) * this.latOffset;
      const neLng = this.startLng + (maxX + 0.5) * this.lngOffset;

      const sw = projection.fromLatLngToDivPixel(new google.maps.LatLng(swLat, swLng));
      const ne = projection.fromLatLngToDivPixel(new google.maps.LatLng(neLat, neLng));

      if (!sw || !ne) return;

      const w = Math.ceil(ne.x - sw.x);
      const h = Math.ceil(sw.y - ne.y);
      
      this.canvas.style.left = sw.x + 'px';
      this.canvas.style.top = ne.y + 'px';
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }

      this.context.clearRect(0, 0, w, h);
      
      const gridW = maxX - minX + 1;
      const gridH = maxY - minY + 1;
      const cellW = w / gridW;
      const cellH = h / gridH;

      // Iterative rendering of active fire cells
      for (const cell of this.grid.values()) {
        const color = getColorForState(cell);
        if (color !== 'transparent') {
          this.context.fillStyle = color;
          const drawX = cell.x - minX;
          const drawY = cell.y - minY;
          this.context.fillRect(drawX * cellW, drawY * cellH, cellW + 1, cellH + 1);
        }
      }
    }

    onRemove() {
      if (this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }

    updateGrid(grid: Map<string, FireCell>) {
      this.grid = new Map(grid); // Atomic update
      this.draw();
    }
  };
  return CanvasOverlayClass;
};

/**
 * useFireSimulation
 * Primary custom hook for coordinating the fire simulation logic.
 */
export function useFireSimulation() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const simulationRef = useRef<FireSimulation | null>(null);
  const overlayRef = useRef<any | null>(null);
  const intervalRef = useRef<number | null>(null);

  /**
   * clearSimulation
   * Teardown logic for simulation resources.
   */
  const clearSimulation = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }
    simulationRef.current = null;
    setIsSimulating(false);
  }, []);

  /**
   * fetchChunk
   * Aggregates elevation and environmental data for a simulation grid chunk.
   */
  const fetchChunk = async (chunkX: number, chunkY: number, startLat: number, startLng: number, latOffset: number, lngOffset: number): Promise<FireCell[]> => {
    const locations: google.maps.LatLngLiteral[] = [];
    const gridCells: {x: number, y: number, lat: number, lng: number}[] = [];

    const startX = chunkX * CHUNK_SIZE;
    const startY = chunkY * CHUNK_SIZE;

    // Grid coordinates calculation
    for (let y = startY; y < startY + CHUNK_SIZE; y++) {
      for (let x = startX; x < startX + CHUNK_SIZE; x++) {
        const cellLat = startLat - y * latOffset;
        const cellLng = startLng + x * lngOffset;
        locations.push({ lat: cellLat, lng: cellLng });
        gridCells.push({ x, y, lat: cellLat, lng: cellLng });
      }
    }

    try {
      const elevator = new google.maps.ElevationService();
      
      const chunkS = startLat - (startY + CHUNK_SIZE) * latOffset;
      const chunkW = startLng + startX * lngOffset;
      const chunkN = startLat - startY * latOffset;
      const chunkE = startLng + (startX + CHUNK_SIZE) * lngOffset;

      // Parallel data acquisition: Google Elevation + OpenStreetMap Water
      const [elevResponse, waterFeatures] = await Promise.all([
        elevator.getElevationForLocations({ locations }),
        fetchWaterFeatures(chunkS, chunkW, chunkN, chunkE)
      ]);
      
      if (elevResponse.results && elevResponse.results.length === locations.length) {
        return gridCells.map((c, i) => {
          const elevFt = Math.max(0, elevResponse.results[i].elevation * 3.28084);
          const isWater = isPointInWater(c.lat, c.lng, waterFeatures) || elevFt <= 0;
          const fuel = isWater ? 0 : generateFuelForCell(c.x, c.y, elevFt);
          
          return {
            ...c,
            elevation: elevFt,
            fuel: fuel,
            state: isWater ? 'water' : 'unburned',
            burnTimeElapsed: 0,
          };
        });
      }
    } catch (e) {
      console.warn("Chunk data fetch failed, using flat terrain fallback.", e);
    }

    // Default static fallback for API failures
    return gridCells.map((c) => ({
      ...c,
      elevation: 0,
      fuel: generateFuelForCell(c.x, c.y, 0),
      state: 'unburned' as CellState,
      burnTimeElapsed: 0,
    }));
  };

  /**
   * startSimulation
   * Initializes the simulation engine, georeferences the grid, and starts the tick loop.
   */
  const startSimulation = useCallback(async (map: any, centerLatLng: any, intel: SimulationIntel) => {
    clearSimulation();
    setIsSimulating(true);
    setErrorMsg(null);

    const lat = centerLatLng.lat();
    const lng = centerLatLng.lng();
    
    // Geodetic to Cartesian projection scaling
    const metersPerLat = 111320;
    const metersPerLng = 40075000 * Math.cos(lat * Math.PI / 180) / 360;

    const latOffset = CELL_SIZE_M / metersPerLat;
    const lngOffset = CELL_SIZE_M / metersPerLng;

    // Load initial 4 chunks (quadrant load) around the ignition point
    const initialCells: FireCell[] = [];
    const chunksToLoad = [
      {cx: 0, cy: 0}, {cx: -1, cy: 0}, {cx: 0, cy: -1}, {cx: -1, cy: -1}
    ];
    
    try {
      const fetchPromises = chunksToLoad.map(c => fetchChunk(c.cx, c.cy, lat, lng, latOffset, lngOffset));
      const results = await Promise.all(fetchPromises);
      initialCells.push(...results.flat());
    } catch (err: any) {
      setErrorMsg("Failed to initialize terrain chunks.");
      setIsSimulating(false);
      return;
    }
    
    // Spark ignition at origin
    const originCell = initialCells.find(c => c.x === 0 && c.y === 0);
    if (originCell) {
      if (originCell.state === 'water') {
        setErrorMsg("Cannot ignite fire in water.");
        setIsSimulating(false);
        return;
      }
      originCell.state = 'burning';
      originCell.fuel = 1.0;
    }

    simulationRef.current = new FireSimulation(initialCells, intel);

    // Initialize the canvas overlay
    const CanvasOverlay = getCanvasOverlayClass();
    const overlay = new CanvasOverlay(lat, lng, latOffset, lngOffset);
    overlay.setMap(map);
    overlayRef.current = overlay;

    const fetchedChunks = new Set<string>();
    for (const c of chunksToLoad) fetchedChunks.add(`${c.cx},${c.cy}`);

    let isFetchingChunks = false;

    // --- MAIN SIMULATION TICK LOOP ---
    intervalRef.current = window.setInterval(async () => {
      if (!simulationRef.current || !overlayRef.current) return;
      
      // LAZY LOADING: Check if fire has reached unmapped edges
      if (simulationRef.current.missingChunksQueue.size > 0 && !isFetchingChunks) {
        isFetchingChunks = true;
        const chunksToFetch = new Set<string>();
        
        for (const key of simulationRef.current.missingChunksQueue) {
          const [sx, sy] = key.split(',').map(Number);
          const cx = Math.floor(sx / CHUNK_SIZE);
          const cy = Math.floor(sy / CHUNK_SIZE);
          const cKey = `${cx},${cy}`;
          
          if (!fetchedChunks.has(cKey)) {
            chunksToFetch.add(cKey);
          }
        }

        if (chunksToFetch.size > 0) {
          console.log(`[Lazy Load] Fire reached edge. Fetching ${chunksToFetch.size} new terrain chunks...`);
          const fetchPromises = Array.from(chunksToFetch).map(async cKey => {
            const [cx, cy] = cKey.split(',').map(Number);
            fetchedChunks.add(cKey); 
            return await fetchChunk(cx, cy, lat, lng, latOffset, lngOffset);
          });
          
          const results = await Promise.all(fetchPromises);
          simulationRef.current.addCells(results.flat());
        } else {
          simulationRef.current.missingChunksQueue.clear();
        }
        
        isFetchingChunks = false;
        return; // Pause spread during async data fetch
      }
      
      if (isFetchingChunks) return; 

      // Acceleration: 5 simulation cycles per frame
      for (let i = 0; i < 5; i++) {
        simulationRef.current.tick();
      }
      
      // Update visual overlay
      overlayRef.current.updateGrid(simulationRef.current.grid);

      // Termination logic
      if (simulationRef.current.activeFires.size === 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsSimulating(false);
      }
    }, 100); 

  }, [clearSimulation]);

  return {
    isSimulating,
    errorMsg,
    startSimulation,
    clearSimulation
  };
}
