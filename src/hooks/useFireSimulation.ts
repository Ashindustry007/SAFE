/// <reference types="@types/google.maps" />
import { useRef, useState, useCallback } from 'react';
import { Vector2 } from 'three';
import { FireEngine } from '../logic/concord/engine/fire-engine';
import { Cell, FireState } from '../logic/concord/cell';
import { Zone } from '../logic/concord/zone';
import { Vegetation, DroughtLevel } from '../logic/concord/types';

// SCALE: 2500ft per cell (Regional Scale)
const GRID_SIZE = 120; 
const CELL_SIZE_FT = 2500; 
const CELL_SIZE_M = CELL_SIZE_FT * 0.3048;
const MINUTES_PER_TICK = 30;

interface SimulationIntel {
  windSpeed: number;
  windDirection: number;
  droughtIndex: number;
  vegetationType: string;
}

export function useFireSimulation() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const engineRef = useRef<FireEngine | null>(null);
  const overlayRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);
  const [time, setTime] = useState(0);

  const clearSimulation = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }
    engineRef.current = null;
    setIsSimulating(false);
    setTime(0);
  }, []);

  const startSimulation = useCallback(async (map: any, centerLatLng: any, intel: SimulationIntel, apiKey: string) => {
    clearSimulation();
    setIsSimulating(true);
    setErrorMsg(null);

    const lat = centerLatLng.lat();
    const lng = centerLatLng.lng();
    const metersPerLat = 111320;
    const metersPerLng = 40075000 * Math.cos(lat * Math.PI / 180) / 360;
    const latOffset = CELL_SIZE_M / metersPerLat;
    const lngOffset = CELL_SIZE_M / metersPerLng;
    const startLat = lat + ((GRID_SIZE - 1) / 2) * latOffset;
    const startLng = lng - ((GRID_SIZE - 1) / 2) * lngOffset;

    // 1. Water Detection with Multiple Fallbacks
    let waterMask = new Uint8Array(GRID_SIZE * GRID_SIZE);
    
    // Attempt A: Static Map (Roadmap Style)
    try {
      const zoom = Math.max(9, map.getZoom() - 2);
      const waterStyle = 'style=feature:water|color:0xffffff&style=feature:all|element:labels|visibility:off&style=feature:landscape|color:0x000000';
      const maskUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=256x256&maptype=roadmap&${waterStyle}&key=${apiKey}`;
      
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = maskUrl;
      await new Promise((res, rej) => {
        const timeout = setTimeout(() => rej(new Error("Timeout")), 3000);
        img.onload = () => { clearTimeout(timeout); res(true); };
        img.onerror = () => { clearTimeout(timeout); rej(new Error("403 or Error")); };
      });

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = GRID_SIZE;
      tempCanvas.height = GRID_SIZE;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE);
        const data = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 120) waterMask[i / 4] = 1;
        }
      }
    } catch (e) {
      console.warn("Static Map failed, water logic will be unconstrained.");
    }

    // 2. Fetch Elevation (Required for Rothermel Logic)
    const locations: google.maps.LatLngLiteral[] = [];
    const step = 2; // Sample every 2nd cell for API efficiency
    for (let y = 0; y < GRID_SIZE; y += step) {
      for (let x = 0; x < GRID_SIZE; x += step) {
        locations.push({ lat: startLat - y * latOffset, lng: startLng + x * lngOffset });
      }
    }

    let elevResults: any[] | null = null;
    try {
      const elevator = new google.maps.ElevationService();
      const response = await elevator.getElevationForLocations({ locations });
      elevResults = response.results;
    } catch (elevError) {
      console.warn("Elevation failed.");
    }

    const zone = new Zone({
      vegetation: Vegetation.Grass,
      droughtLevel: DroughtLevel.SevereDrought,
      terrainType: 0
    });

    const cells: Cell[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const idx = y * GRID_SIZE + x;
        // Map sampled elevation back to grid
        const eIdx = Math.floor(y / step) * (GRID_SIZE / step) + Math.floor(x / step);
        const elevation = (elevResults && elevResults[eIdx]) ? elevResults[eIdx].elevation * 3.28084 : 0;
        
        cells.push(new Cell({
          x, y, zone,
          baseElevation: elevation,
          isRiver: waterMask[idx] === 1,
          fireState: FireState.Unburnt
        }));
      }
    }

    // 3. Initialize Engine
    const sparkX = Math.floor(GRID_SIZE / 2);
    const sparkY = Math.floor(GRID_SIZE / 2);
    const sparks = [new Vector2(sparkX * CELL_SIZE_FT, sparkY * CELL_SIZE_FT)];
    
    const engine = new FireEngine(cells, {
      speed: intel.windSpeed,
      direction: intel.windDirection
    }, sparks, {
      gridWidth: GRID_SIZE,
      gridHeight: GRID_SIZE,
      cellSize: CELL_SIZE_FT,
      minCellBurnTime: 600,
      neighborsDist: 1.5,
      fireSurvivalProbability: 0.05
    });
    engineRef.current = engine;

    // 4. AAA Quality Canvas Overlay
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(startLat - GRID_SIZE * latOffset, startLng),
      new google.maps.LatLng(startLat, startLng + GRID_SIZE * lngOffset)
    );

    class AAAFireOverlay extends google.maps.OverlayView {
      canvas: HTMLCanvasElement;
      constructor() {
        super();
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.pointerEvents = 'none';
      }
      onAdd() { this.getPanes()!.overlayLayer.appendChild(this.canvas); }
      draw() {
        const projection = this.getProjection();
        if (!projection) return;
        const sw = projection.fromLatLngToDivPixel(bounds.getSouthWest())!;
        const ne = projection.fromLatLngToDivPixel(bounds.getNorthEast())!;
        this.canvas.style.left = sw.x + 'px';
        this.canvas.style.top = ne.y + 'px';
        this.canvas.width = Math.max(1, ne.x - sw.x);
        this.canvas.height = Math.max(1, sw.y - ne.y);
        this.renderFire();
      }
      renderFire() {
        if (!engineRef.current || !this.canvas) return;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const cw = this.canvas.width / GRID_SIZE;
        const ch = this.canvas.height / GRID_SIZE;

        // Layer 1: Scorched Earth (Subtle map staining)
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#1c1917';
        engineRef.current.cells.forEach(cell => {
          if (cell.fireState === FireState.Burnt) {
            // Draw as blurry circles to avoid grid lines
            ctx.beginPath();
            ctx.arc(cell.x * cw + cw/2, cell.y * ch + ch/2, cw * 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Layer 2: Fire Front (Glowing Particles with Screen Blending)
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'screen';
        engineRef.current.cells.forEach(cell => {
          if (cell.fireState === FireState.Burning) {
            const px = cell.x * cw + cw/2;
            const py = cell.y * ch + ch/2;
            const rad = cw * 2.5;
            
            const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
            g.addColorStop(0, '#fef3c7'); // White-hot core
            g.addColorStop(0.2, '#f97316'); // Vivid orange
            g.addColorStop(0.5, '#7c2d12'); // Deep ember
            g.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(px, py, rad, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        
        // Layer 3: Smoke (Simulated drift)
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#44403c';
        engineRef.current.cells.forEach(cell => {
          if (cell.fireState === FireState.Burning) {
            // Smoke drifts slightly with wind
            const driftX = (intel.windSpeed * Math.sin(intel.windDirection * Math.PI / 180)) * 0.1;
            const driftY = (intel.windSpeed * Math.cos(intel.windDirection * Math.PI / 180)) * 0.1;
            ctx.beginPath();
            ctx.arc(cell.x * cw + cw/2 + driftX, cell.y * ch + ch/2 - driftY, cw * 4, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    overlayRef.current = new AAAFireOverlay();
    overlayRef.current.setMap(map);

    // 5. High-Precision Tick Loop
    let currentTime = 0;
    intervalRef.current = window.setInterval(() => {
      if (!engineRef.current) return;
      currentTime += MINUTES_PER_TICK;
      setTime(currentTime);
      engineRef.current.setSeed(Math.random());
      engineRef.current.updateFire(currentTime);
      if (overlayRef.current) overlayRef.current.draw();

      if (engineRef.current.fireDidStop && currentTime > 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsSimulating(false);
      }
    }, 100);

  }, [clearSimulation]);

  return { isSimulating, errorMsg, startSimulation, clearSimulation, time };
}
