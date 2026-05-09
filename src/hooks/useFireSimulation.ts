/// <reference types="@types/google.maps" />
import { useRef, useState, useCallback } from 'react';
import { FireSimulation, DEFAULT_PARAMS } from '../utils/fireSimulation';
import type { FireCell, SimulationIntel } from '../utils/fireSimulation';

const CELL_SIZE_M = DEFAULT_PARAMS.cellSizeFt * 0.3048; // ~152.4 meters

const getColorForState = (cell: FireCell) => {
  switch(cell.state) {
    case 'unburned': return 'transparent';
    case 'water': return 'transparent';
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

let CanvasOverlayClass: any = null;

function getCanvasOverlayClass() {
  if (CanvasOverlayClass) return CanvasOverlayClass;

  CanvasOverlayClass = class CanvasOverlay extends google.maps.OverlayView {
    private bounds: google.maps.LatLngBounds;
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D | null;
    private gridWidth: number;
    private gridHeight: number;

    constructor(bounds: google.maps.LatLngBounds, gridWidth: number, gridHeight: number) {
      super();
      this.bounds = bounds;
      this.gridWidth = gridWidth;
      this.gridHeight = gridHeight;
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'absolute';
      // The CSS filter applies a blur to blend pixels and contrast to sharpen the blurred edge, making a blob shape
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
      const projection = this.getProjection();
      if (!projection) return;

      const sw = projection.fromLatLngToDivPixel(this.bounds.getSouthWest());
      const ne = projection.fromLatLngToDivPixel(this.bounds.getNorthEast());

      if (sw && ne) {
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
      }
    }

    onRemove() {
      if (this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }

    updateGrid(grid: FireCell[][]) {
      if (!this.context) return;
      const w = this.canvas.width;
      const h = this.canvas.height;
      
      // Clear previous frame
      this.context.clearRect(0, 0, w, h);
      
      const cellW = w / this.gridWidth;
      const cellH = h / this.gridHeight;

      for (let y = 0; y < this.gridHeight; y++) {
        for (let x = 0; x < this.gridWidth; x++) {
          const cell = grid[y][x];
          const color = getColorForState(cell);
          
          if (color !== 'transparent') {
            this.context.fillStyle = color;
            // Draw rect slightly larger (+1px) to prevent sub-pixel gaps between cells before blurring
            this.context.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
          }
        }
      }
    }
  };

  return CanvasOverlayClass;
}

export function useFireSimulation() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const simulationRef = useRef<FireSimulation | null>(null);
  const overlayRef = useRef<any>(null);
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

  const startSimulation = useCallback(async (map: any, centerLatLng: any, intel: SimulationIntel) => {
    clearSimulation();
    setIsSimulating(true);
    setErrorMsg(null);

    const lat = centerLatLng.lat();
    const lng = centerLatLng.lng();
    const w = DEFAULT_PARAMS.gridWidth;
    const h = DEFAULT_PARAMS.gridHeight;
    
    // Calculate 1 degree in meters approximately for this latitude
    const metersPerLat = 111320;
    const metersPerLng = 40075000 * Math.cos(lat * Math.PI / 180) / 360;

    const latOffset = CELL_SIZE_M / metersPerLat;
    const lngOffset = CELL_SIZE_M / metersPerLng;

    const locations: any[] = [];
    const gridCells: {x: number, y: number, lat: number, lng: number}[] = [];

    // Top-left is y=0, x=0
    const startLat = lat + ((h - 1) / 2) * latOffset;
    const startLng = lng - ((w - 1) / 2) * lngOffset;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cellLat = startLat - y * latOffset;
        const cellLng = startLng + x * lngOffset;
        locations.push({ lat: cellLat, lng: cellLng });
        gridCells.push({ x, y, lat: cellLat, lng: cellLng });
      }
    }

    try {
      // Try to fetch Elevation
      let results: any[] | null = null;
      try {
        const elevator = new google.maps.ElevationService();
        const response = await elevator.getElevationForLocations({ locations });
        
        if (response.results && response.results.length === locations.length) {
          results = response.results;
        } else {
          throw new Error('Incomplete elevation data returned.');
        }
      } catch (elevError: any) {
        console.warn("Elevation API failed, falling back to flat terrain:", elevError);
        setErrorMsg("Elevation API disabled or blocked. Running simulation on flat terrain (elevation 0).");
      }

      const initialGrid: FireCell[][] = [];
      let i = 0;
      for (let y = 0; y < h; y++) {
        const row: FireCell[] = [];
        for (let x = 0; x < w; x++) {
          const elevM = results ? results[i].elevation : 0;
          const elevFt = elevM * 3.28084;
          
          let initialState: any = 'unburned';
          if (x === Math.floor(w / 2) && y === Math.floor(h / 2)) {
            initialState = 'burning';
          } else if (results && elevM <= 0) {
            initialState = 'water';
          }

          row.push({
            x, y,
            lat: gridCells[i].lat,
            lng: gridCells[i].lng,
            elevation: Math.max(0, elevFt),
            state: initialState,
            burnTimeElapsed: 0,
          });
          i++;
        }
        initialGrid.push(row);
      }

      simulationRef.current = new FireSimulation(initialGrid, intel);

      // Calculate the bounding box of the entire grid
      // SW is bottom-left (y = h-1, x = 0)
      // NE is top-right (y = 0, x = w-1)
      const swLat = startLat - (h - 1) * latOffset - latOffset / 2;
      const swLng = startLng - lngOffset / 2;
      const neLat = startLat + latOffset / 2;
      const neLng = startLng + (w - 1) * lngOffset + lngOffset / 2;

      const sw = new google.maps.LatLng(swLat, swLng);
      const ne = new google.maps.LatLng(neLat, neLng);
      const bounds = new google.maps.LatLngBounds(sw, ne);

      // Create and mount canvas overlay
      const OverlayClass = getCanvasOverlayClass();
      const overlay = new OverlayClass(bounds, w, h);
      overlay.setMap(map);
      overlayRef.current = overlay;

      // Start tick loop
      intervalRef.current = window.setInterval(() => {
        if (!simulationRef.current || !overlayRef.current) return;
        
        simulationRef.current.tick();
        const updatedGrid = simulationRef.current.grid;

        let activeFires = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (updatedGrid[y][x].state === 'burning') activeFires++;
          }
        }
        
        // Render current grid state
        overlayRef.current.updateGrid(updatedGrid);

        // Stop simulation if no more fires
        if (activeFires === 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsSimulating(false);
        }
      }, 100); // 100ms per tick for fluid simulation
    } catch (e: any) {
      console.error("Simulation error:", e);
      const msg = e.message || String(e);
      setErrorMsg(msg);
      clearSimulation();
    }
  }, [clearSimulation]);

  return {
    isSimulating,
    errorMsg,
    startSimulation,
    clearSimulation
  };
}
