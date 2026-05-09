/// <reference types="@types/google.maps" />
import { useRef, useState, useCallback } from 'react';
import { FireSimulation, DEFAULT_PARAMS } from '../utils/fireSimulation';
import type { FireCell, SimulationIntel, CellState } from '../utils/fireSimulation';

const CELL_SIZE_M = DEFAULT_PARAMS.cellSizeFt * 0.3048; // ~152.4 meters

export function useFireSimulation() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const simulationRef = useRef<FireSimulation | null>(null);
  const rectanglesRef = useRef<google.maps.Rectangle[][]>([]);
  const intervalRef = useRef<number | null>(null);

  const clearSimulation = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Remove rectangles from map
    rectanglesRef.current.forEach(row => {
      row.forEach(rect => rect.setMap(null));
    });
    rectanglesRef.current = [];
    simulationRef.current = null;
    setIsSimulating(false);
  }, []);

  const getColorForState = (state: CellState, isSimulationEnded: boolean = false) => {
    switch(state) {
      case 'unburned': return isSimulationEnded ? '#22c55e' : 'transparent'; // Green when ended
      case 'burning': return '#ef4444'; // Red
      case 'burntOut': return '#b91c1c'; // Dark Red (stays red)
      case 'survived': return '#228B22'; // Forest green
      default: return 'transparent';
    }
  };

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
          
          row.push({
            x, y,
            lat: gridCells[i].lat,
            lng: gridCells[i].lng,
            elevation: Math.max(0, elevFt),
            state: (x === Math.floor(w / 2) && y === Math.floor(h / 2)) ? 'burning' : 'unburned',
            burnTimeElapsed: 0,
          });
          i++;
        }
        initialGrid.push(row);
      }

      simulationRef.current = new FireSimulation(initialGrid, intel);

      // Create Rectangles
      const rects: google.maps.Rectangle[][] = [];
      for (let y = 0; y < h; y++) {
        const rectRow: google.maps.Rectangle[] = [];
        for (let x = 0; x < w; x++) {
          const cell = initialGrid[y][x];
          
          // Cell bounds
          const bounds = {
            north: cell.lat + latOffset / 2,
            south: cell.lat - latOffset / 2,
            east: cell.lng + lngOffset / 2,
            west: cell.lng - lngOffset / 2,
          };

          const rect = new google.maps.Rectangle({
            bounds,
            map,
            fillColor: getColorForState(cell.state),
            fillOpacity: cell.state === 'unburned' ? 0 : 0.6,
            strokeWeight: 0,
            clickable: false,
          });
          rectRow.push(rect);
        }
        rects.push(rectRow);
      }
      rectanglesRef.current = rects;

      // Start tick loop
      intervalRef.current = window.setInterval(() => {
        if (!simulationRef.current) return;
        
        simulationRef.current.tick();
        const updatedGrid = simulationRef.current.grid;

        let activeFires = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (updatedGrid[y][x].state === 'burning') activeFires++;
          }
        }
        
        const isSimulationEnded = activeFires === 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const cell = updatedGrid[y][x];
            const rect = rectanglesRef.current[y][x];
            
            const newColor = getColorForState(cell.state, isSimulationEnded);
            const newOpacity = (cell.state === 'unburned' && !isSimulationEnded) ? 0 : 0.6;
            
            rect.setOptions({ fillColor: newColor, fillOpacity: newOpacity });
          }
        }

        // Stop simulation if no more fires
        if (isSimulationEnded) {
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
