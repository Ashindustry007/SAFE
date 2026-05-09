/// <reference types="@types/google.maps" />
import { useRef, useState, useCallback } from 'react';
import { FireSimulation, DEFAULT_PARAMS } from '../utils/fireSimulation';
import type { FireCell, SimulationIntel, CellState } from '../utils/fireSimulation';

const CELL_SIZE_M = DEFAULT_PARAMS.cellSizeFt * 0.3048; // ~152.4 meters
const CHUNK_SIZE = 21; // 21x21 cells per API chunk (441 locations, fits in 512 Google API limit)

const getColorForState = (cell: FireCell) => {
  switch(cell.state) {
    case 'unburned': return 'transparent';
    case 'water': return 'transparent'; // Let the map show the water
    case 'burning': {
      // Map burn lifecycle to the 3 burn index colors from the 2D engine
      const ratio = cell.burnTimeElapsed / DEFAULT_PARAMS.minCellBurnTime;
      if (ratio < 0.33) return '#ffb200'; // Low intensity (Yellow-Orange)
      if (ratio < 0.66) return '#ff8000'; // Medium intensity (Orange)
      return '#ff0000'; // High intensity (Red)
    }
    case 'burntOut': return '#333333'; // Burnt Color (Dark Grey)
    case 'survived': return '#228B22'; // Forest green
    default: return 'transparent';
  }
};

// Heuristic to generate deterministic fuel patterns based on coordinates and elevation
const generateFuelForCell = (x: number, y: number, elevation: number) => {
  // If elevation is 0 or less, it's effectively water/ocean
  if (elevation <= 0) return 0;
  
  // Create natural-looking clusters of vegetation using multiple sine frequencies (simple noise)
  const noise = (
    Math.sin(x * 0.3) + 
    Math.sin(y * 0.3) + 
    Math.cos((x + y) * 0.15) + 
    Math.sin(x * 0.05) * Math.cos(y * 0.05)
  ) / 4;
  
  // Map noise [-1, 1] to fuel [0, 1]
  let fuel = (noise + 1) / 2;
  
  // Introduce "hard" fuel breaks (rocky areas, roads, clearings)
  if (fuel < 0.3) return 0; 
  
  // Scale fuel slightly so most burnable areas are dense
  return Math.min(1, fuel * 1.2);
};

/**
 * OSM Water Detection
 * Queries the Overpass API for natural water features and waterways.
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

const isPointInWater = (lat: number, lng: number, waterFeatures: any[]) => {
  // Simplified distance-based check for OSM geometries
  const THRESHOLD = 0.0006; // Approx 60 meters
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

const getCanvasOverlayClass = () => {
  if (CanvasOverlayClass) return CanvasOverlayClass;

  CanvasOverlayClass = class extends google.maps.OverlayView {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D | null;
    private startLat: number;
    private startLng: number;
    private latOffset: number;
    private lngOffset: number;

    constructor(startLat: number, startLng: number, latOffset: number, lngOffset: number) {
      super();
      this.startLat = startLat;
      this.startLng = startLng;
      this.latOffset = latOffset;
      this.lngOffset = lngOffset;
      
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'absolute';
      // The CSS filter applies a blur to blend pixels and contrast to sharpen the blurred edge, making an organic fluid shape
      this.canvas.style.filter = 'blur(8px) contrast(1.5)';
      this.canvas.style.opacity = '0.8';
      this.canvas.style.pointerEvents = 'none'; // let clicks pass through
      this.context = this.canvas.getContext('2d');
    }

    onAdd() {
      const panes = this.getPanes();
      if (panes) {
        panes.overlayLayer.appendChild(this.canvas);
      }
    }

    draw() {
      // Positioning is handled entirely in updateGrid to ensure sync with frame
    }

    onRemove() {
      if (this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }

    updateGrid(grid: Map<string, FireCell>) {
      const projection = this.getProjection();
      if (!this.context || !projection || grid.size === 0) return;

      // 1. Find min/max bounds of all cells to position canvas correctly
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      for (const cell of grid.values()) {
        if (cell.x < minX) minX = cell.x;
        if (cell.x > maxX) maxX = cell.x;
        if (cell.y < minY) minY = cell.y;
        if (cell.y > maxY) maxY = cell.y;
      }

      const swLat = this.startLat - maxY * this.latOffset - this.latOffset / 2;
      const swLng = this.startLng + minX * this.lngOffset - this.lngOffset / 2;
      const neLat = this.startLat - minY * this.latOffset + this.latOffset / 2;
      const neLng = this.startLng + maxX * this.lngOffset + this.lngOffset / 2;

      const sw = projection.fromLatLngToDivPixel(new google.maps.LatLng(swLat, swLng));
      const ne = projection.fromLatLngToDivPixel(new google.maps.LatLng(neLat, neLng));

      if (!sw || !ne) return;

      this.canvas.style.left = sw.x + 'px';
      this.canvas.style.top = ne.y + 'px';
      const w = ne.x - sw.x;
      const h = sw.y - ne.y;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      
      // Update internal canvas resolution
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }

      // Clear previous frame
      this.context.clearRect(0, 0, w, h);
      
      const gridW = maxX - minX + 1;
      const gridH = maxY - minY + 1;
      const cellW = w / gridW;
      const cellH = h / gridH;

      for (const cell of grid.values()) {
        const color = getColorForState(cell);
        if (color !== 'transparent') {
          this.context.fillStyle = color;
          // Draw rect slightly larger (+1px) to prevent sub-pixel gaps between cells before blurring
          const drawX = cell.x - minX;
          const drawY = cell.y - minY;
          this.context.fillRect(drawX * cellW, drawY * cellH, cellW + 1, cellH + 1);
        }
      }
    }
  };
  return CanvasOverlayClass;
};

export function useFireSimulation() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const simulationRef = useRef<FireSimulation | null>(null);
  const overlayRef = useRef<any | null>(null);
  const intervalRef = useRef<number | null>(null);

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

  const fetchChunk = async (chunkX: number, chunkY: number, startLat: number, startLng: number, latOffset: number, lngOffset: number): Promise<FireCell[]> => {
    const locations: google.maps.LatLngLiteral[] = [];
    const gridCells: {x: number, y: number, lat: number, lng: number}[] = [];

    const startX = chunkX * CHUNK_SIZE;
    const startY = chunkY * CHUNK_SIZE;

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
      
      // Calculate chunk bounding box for OSM
      const chunkS = startLat - (startY + CHUNK_SIZE) * latOffset;
      const chunkW = startLng + startX * lngOffset;
      const chunkN = startLat - startY * latOffset;
      const chunkE = startLng + (startX + CHUNK_SIZE) * lngOffset;

      // Concurrent fetch for Elevation and OSM Water
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

    // Fallback
    return gridCells.map((c) => ({
      ...c,
      elevation: 0,
      fuel: generateFuelForCell(c.x, c.y, 0),
      state: 'unburned' as CellState,
      burnTimeElapsed: 0,
    }));
  };

  const startSimulation = useCallback(async (map: any, centerLatLng: any, intel: SimulationIntel) => {
    clearSimulation();
    setIsSimulating(true);
    setErrorMsg(null);

    const lat = centerLatLng.lat();
    const lng = centerLatLng.lng();
    
    // Calculate 1 degree in meters approximately for this latitude
    const metersPerLat = 111320;
    const metersPerLng = 40075000 * Math.cos(lat * Math.PI / 180) / 360;

    const latOffset = CELL_SIZE_M / metersPerLat;
    const lngOffset = CELL_SIZE_M / metersPerLng;

    // Load initial 4 chunks around the origin spark (0,0) to give the fire room to grow immediately
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
    
    // Ignite spark at origin - force fuel to 1.0 to ensure the spark actually starts
    const originCell = initialCells.find(c => c.x === 0 && c.y === 0);
    if (originCell) {
      // Ensure spark doesn't happen in water
      if (originCell.state === 'water') {
        setErrorMsg("Cannot ignite fire in water.");
        setIsSimulating(false);
        return;
      }
      originCell.state = 'burning';
      originCell.fuel = 1.0;
    }

    simulationRef.current = new FireSimulation(initialCells, intel);

    const CanvasOverlay = getCanvasOverlayClass();
    const overlay = new CanvasOverlay(lat, lng, latOffset, lngOffset);
    overlay.setMap(map);
    overlayRef.current = overlay;

    const fetchedChunks = new Set<string>();
    for (const c of chunksToLoad) fetchedChunks.add(`${c.cx},${c.cy}`);

    let isFetchingChunks = false;

    // Start tick loop
    intervalRef.current = window.setInterval(async () => {
      if (!simulationRef.current || !overlayRef.current) return;
      
      // If the fire reached an unknown edge, we must fetch the next chunk(s)
      if (simulationRef.current.missingChunksQueue.size > 0 && !isFetchingChunks) {
        isFetchingChunks = true;
        const chunksToFetch = new Set<string>();
        
        for (const key of simulationRef.current.missingChunksQueue) {
          const [sx, sy] = key.split(',').map(Number);
          // Convert cell coordinate to chunk coordinate
          const cx = Math.floor(sx / CHUNK_SIZE);
          const cy = Math.floor(sy / CHUNK_SIZE);
          const cKey = `${cx},${cy}`;
          
          if (!fetchedChunks.has(cKey)) {
            chunksToFetch.add(cKey);
          }
        }

        if (chunksToFetch.size > 0) {
          console.log(`[Lazy Load] Fire reached edge. Fetching ${chunksToFetch.size} new terrain chunks with OSM Water data...`);
          const fetchPromises = Array.from(chunksToFetch).map(async cKey => {
            const [cx, cy] = cKey.split(',').map(Number);
            fetchedChunks.add(cKey); // Mark eagerly to prevent double fetching
            return await fetchChunk(cx, cy, lat, lng, latOffset, lngOffset);
          });
          
          const results = await Promise.all(fetchPromises);
          simulationRef.current.addCells(results.flat());
        } else {
          // Edge case: chunks were already fetched but queue wasn't cleared
          simulationRef.current.missingChunksQueue.clear();
        }
        
        isFetchingChunks = false;
        return; // Skip advancing the fire this frame while we waited for API data
      }
      
      if (isFetchingChunks) return; // Pause fire spread until terrain data arrives

      simulationRef.current.tick();
      
      overlayRef.current.updateGrid(simulationRef.current.grid);

      // Stop simulation if no more fires
      if (simulationRef.current.activeFires.size === 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsSimulating(false);
      }
    }, 100); // 100ms per tick for fluid simulation

  }, [clearSimulation]);

  return {
    isSimulating,
    errorMsg,
    startSimulation,
    clearSimulation
  };
}
