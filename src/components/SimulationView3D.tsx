/**
 * SAFE 3D Simulation View
 *
 * R3F visualization + Concord-consortium FireEngine (Rothermel spread).
 */

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, OrbitControls, PerspectiveCamera, View } from '@react-three/drei';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Hammer,
  Plane as PlaneIcon,
  Settings,
  Compass,
  CheckCircle2,
  X,
  Columns,
} from 'lucide-react';
import { Terrain3D } from './Terrain3D';
import { Vegetation, DroughtLevel } from '../logic/concord/types';
import type { IWindProps } from '../logic/concord/types';
import { FireState, Cell } from '../logic/concord/cell';
import { Zone } from '../logic/concord/zone';
import { FireEngine } from '../logic/concord/engine/fire-engine';
import { getDefaultFireEngineConfig } from '../logic/concord/engine-config';
import { DEFAULT_THREE_ZONE_CONFIG, defaultWindFromConfig } from '../logic/concord/default-config';
import { buildCellsFromAssets } from '../logic/concord/build-asset-terrain';
import { PROCEDURAL_TERRAIN_ID, generate3DGrid } from '../logic/wildfire3D';
import { CONCORD_PRESET_IDS, getConcordPreset, buildCellsFromConcordPreset } from '../logic/concord/presets';

// Higher resolution grid (closer to Concord feel).
// Note: Terrain3D uses a subdivided BoxGeometry; very high values can hurt FPS.
const CFG = DEFAULT_THREE_ZONE_CONFIG;
const MODEL_WIDTH_FT = CFG.modelWidth;
const MODEL_HEIGHT_FT = CFG.modelHeight;
const GRID_WIDTH = CFG.gridWidth;
const GRID_HEIGHT = CFG.gridHeight;
const CELL_SIZE_FT = CFG.cellSize;

const ENGINE_CFG = getDefaultFireEngineConfig(GRID_WIDTH, GRID_HEIGHT, CELL_SIZE_FT);

function createEngine(grid: Cell[], wind: IWindProps): FireEngine {
  return new FireEngine(grid, wind, [], ENGINE_CFG);
}



interface Simulation3DProps {
}

type Tool = 'SPARK' | 'FIRELINE' | 'HELITACK' | 'NONE';

const SimulationContent = ({ cells, activeTool, clickMarkers, onCellInteraction, time }: any) => (
  <>
    <ambientLight intensity={0.65} />
    <directionalLight position={[1.2, 1.8, 1.1]} intensity={2.0} castShadow />
    <Sky sunPosition={[1, 0.4, 0.6]} />
    <group position={[0, 0, 0]}>
      <Terrain3D
        cells={cells}
        gridWidth={GRID_WIDTH}
        gridHeight={GRID_HEIGHT}
        modelWidthFt={MODEL_WIDTH_FT}
        modelHeightFt={MODEL_HEIGHT_FT}
        cellSizeFt={CELL_SIZE_FT}
        activeTool={activeTool}
        simTime={time}
        showBurnIndex={true}
        riverColor={CFG.riverColor}
        onCellInteraction={onCellInteraction}
      />
      {clickMarkers.map((m: any, i: number) => {
        const color = m.tool === 'SPARK' ? '#f59e0b' : m.tool === 'FIRELINE' ? '#8b5a2b' : '#38bdf8';
        return (
          <group key={`${m.x}-${m.y}-${m.t}-${i}`} position={[(m.x / (GRID_WIDTH - 1) - 0.5) * 1, m.z + 0.01, (m.y / (GRID_HEIGHT - 1) - 0.5) * (MODEL_HEIGHT_FT / MODEL_WIDTH_FT)]}>
            <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.0035, 0.0035, 0.06, 10]} /><meshStandardMaterial color={color} /></mesh>
            <mesh position={[0, 0.065, 0]}><sphereGeometry args={[0.0075, 12, 12]} /><meshStandardMaterial color={color} /></mesh>
          </group>
        );
      })}

    </group>
  </>
);

export const SimulationView3D: React.FC<Simulation3DProps> = () => {
  const [cells, setCells] = useState<Cell[]>(() => {
    // Non-black placeholder while raster assets load (prevents “all black” scene).
    const zones = CFG.zones.map(z => new Zone(z));
    const next: Cell[] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const zoneIdx = x < GRID_WIDTH / 3 ? 0 : x < (2 * GRID_WIDTH) / 3 ? 1 : 2;
        next.push(new Cell({
          x,
          y,
          zone: zones[zoneIdx],
          zoneIdx,
          baseElevation: 0,
          isRiver: false,
          isUnburntIsland: false,
        }));
      }
    }
    return next;
  });
  const [wind, setWind] = useState<IWindProps>(() => defaultWindFromConfig(CFG));
  const [isLoadingTerrain, setIsLoadingTerrain] = useState(true);
  const [terrainLoadError, setTerrainLoadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [activeTool, setActiveTool] = useState<Tool>('NONE');
  const [fireLineStart, setFireLineStart] = useState<{ x: number; y: number } | null>(null);
  const [clickMarkers, setClickMarkers] = useState<Array<{ x: number; y: number; z: number; tool: Tool; t: number }>>([]);
  const [terrainId, setTerrainId] = useState<string>(PROCEDURAL_TERRAIN_ID);

  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [setupStep, setSetupStep] = useState(1);
  const [selectedZone, setSelectedZone] = useState<number>(0);

  const [isCompareMode, setIsCompareMode] = useState(false);
  const [cellsB, setCellsB] = useState<Cell[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewARef = useRef<HTMLDivElement>(null);
  const viewBRef = useRef<HTMLDivElement>(null);
  const camARef = useRef<any>(null);
  const camBRef = useRef<any>(null);
  const controlsARef = useRef<any>(null);
  const controlsBRef = useRef<any>(null);
  const engineRef = useRef<FireEngine | null>(null);
  const engineRefB = useRef<FireEngine | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingTerrain(true);
      setTerrainLoadError(null);
      try {
        const grid = await buildCellsFromAssets(CFG);
        const gridB = await buildCellsFromAssets(CFG);
        if (cancelled) return;
        engineRef.current = createEngine(grid, wind);
        engineRefB.current = createEngine(gridB, wind);
        setCells(grid);
        setCellsB(gridB);
        setTime(0);
        setIsPlaying(false);
        setFireLineStart(null);
        setClickMarkers([]);
        setIsLoadingTerrain(false);
      } catch (e: any) {
        if (cancelled) return;
        setTerrainLoadError(e?.message ?? String(e));
        setIsLoadingTerrain(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    // engine is created after terrain load
    return () => {
      engineRef.current = null;
    };
    // Mount / unmount only: engine must persist across cell tick updates (mutated in place).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineRef.current) engineRef.current.wind = wind;
    if (engineRefB.current) engineRefB.current.wind = wind;
  }, [wind]);

  const reloadTerrain = useCallback(async () => {
    setIsLoadingTerrain(true);
    const grid = await buildCellsFromAssets(CFG);
    const gridB = await buildCellsFromAssets(CFG);
    engineRef.current = createEngine(grid, wind);
    engineRefB.current = createEngine(gridB, wind);
    setCells(grid);
    setCellsB(gridB);
    setTime(0);
    setIsPlaying(false);
    setFireLineStart(null);
    setClickMarkers([]);
    setIsLoadingTerrain(false);
  }, [wind]);

  // Concord: 1 model day (1440 min) in 8 real seconds => 180 min/sec.
  // At 10 ticks/sec (100ms), that's 18 minutes per tick.
  const minutesPerTick = 18;
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setTime((t) => {
          const nextTime = t + minutesPerTick;
          const tickSeed = Math.random();
          
          if (engineRef.current) {
            (engineRef.current as any).setSeed(tickSeed);
            engineRef.current.updateFire(nextTime);
            setCells([...engineRef.current.cells]);
          }
          if (engineRefB.current) {
            (engineRefB.current as any).setSeed(tickSeed);
            engineRefB.current.updateFire(nextTime);
            setCellsB([...engineRefB.current.cells]);
          }
          return nextTime;
        });
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const applyTerrainAndResetEngine = async (id: string) => {
    setTerrainId(id);
    setIsLoadingTerrain(true);
    setTerrainLoadError(null);
    try {
      let grid: Cell[];
      if (id === PROCEDURAL_TERRAIN_ID) {
        grid = generate3DGrid(GRID_WIDTH, GRID_HEIGHT);
      } else {
        const preset = getConcordPreset(id);
        if (preset) {
          grid = buildCellsFromConcordPreset(preset, GRID_WIDTH, GRID_HEIGHT);
        } else {
          grid = await buildCellsFromAssets(CFG);
        }
      }
      engineRef.current = createEngine(grid, wind);
      engineRefB.current = createEngine([...grid.map(c => new Cell({...c}))], wind);
      setCells(grid);
      setCellsB([...engineRefB.current.cells]);
      setTime(0);
      setIsPlaying(false);
      setFireLineStart(null);
      setClickMarkers([]);
      setIsLoadingTerrain(false);
    } catch (e: any) {
      setTerrainLoadError(e?.message ?? String(e));
      setIsLoadingTerrain(false);
    }
  };

  const handleCreate = () => {
    setIsSetupOpen(false);
    setSetupStep(1);
    setIsPlaying(false);
    setTime(0);
  };

  const updateZoneConfig = (v: Vegetation, d: DroughtLevel) => {
    const nextCells = [...cells];
    nextCells.forEach((cell) => {
      if (cell.zoneIdx === selectedZone) {
        cell.zone.vegetation = v;
        cell.zone.droughtLevel = d;
      }
    });
    setCells(nextCells);
  };

  const currentZoneConfig =
    cells.find((c) => c.zoneIdx === selectedZone)?.zone || {
      vegetation: Vegetation.Grass,
      droughtLevel: DroughtLevel.MildDrought,
    };

  const totalBurnable = cells.filter((c) => !c.isRiver && !c.isUnburntIsland).length;
  const totalBurned = cells.filter(
    (c) => c.fireState === FireState.Burnt || c.fireState === FireState.Burning
  ).length;
  const burnPercentage = totalBurnable > 0 ? (totalBurned / totalBurnable) * 100 : 0;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', backgroundColor: '#cbd5e1', position: 'relative', overflow: 'hidden', pointerEvents: 'auto' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 1, pointerEvents: 'none' }}>
        <div ref={viewARef} style={{ flex: 1, position: 'relative', pointerEvents: 'auto' }}>
          {isCompareMode && (
            <div style={{
              position: 'absolute',
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              padding: '6px 16px',
              borderRadius: '99px',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              pointerEvents: 'none',
            }}>
              Controlled Simulation
            </div>
          )}
        </div>
        {isCompareMode && (
          <div ref={viewBRef} style={{ flex: 1, position: 'relative', borderLeft: '2px solid rgba(255,255,255,0.1)', pointerEvents: 'auto' }}>
            <div style={{
              position: 'absolute',
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(239, 68, 68, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              padding: '6px 16px',
              borderRadius: '99px',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              pointerEvents: 'none',
            }}>
              Uncontrolled Baseline
            </div>
          </div>
        )}
      </div>

      <Canvas style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'auto' }} eventSource={containerRef}>
        <View track={viewARef as any}>
          <PerspectiveCamera ref={camARef} makeDefault position={[0, 0.7, 0.9]} fov={55} />
          <SimulationContent cells={cells} activeTool={activeTool} clickMarkers={clickMarkers} time={time} onCellInteraction={(x: number, y: number) => {
              if (isLoadingTerrain) return;
              const idx = y * GRID_WIDTH + x;
              const nextCells = [...cells];
              const cell = nextCells[idx];
              const z = (cell?.elevation ?? cell?.baseElevation ?? 0) * (1 / MODEL_WIDTH_FT);
              const addMarker = (tool: Tool) => setClickMarkers((prev) => { const next = [...prev, { x, y, z, tool, t: time }]; return next.length > 12 ? next.slice(next.length - 12) : next; });
              
              if (activeTool === 'SPARK') {
                if (!cell.isRiver && !cell.isNonburnable && cell.fireState === FireState.Unburnt) {
                  cell.ignitionTime = 0;
                  if (engineRef.current) engineRef.current.removeUnburntIsland(cell);
                  if (engineRefB.current) {
                    const cellB = engineRefB.current.cells[idx];
                    cellB.ignitionTime = 0;
                    engineRefB.current.removeUnburntIsland(cellB);
                    setCellsB([...engineRefB.current.cells]);
                  }
                  addMarker('SPARK');
                }
              } else if (activeTool === 'FIRELINE') {
                if (!fireLineStart) {
                  setFireLineStart({ x, y });
                  cell.isFireLine = true;
                  cell.ignitionTime = Infinity;
                  // Sync to engine
                  if (engineRef.current) {
                    const engineCell = engineRef.current.cells[idx];
                    engineCell.isFireLine = true;
                    engineCell.ignitionTime = Infinity;
                  }
                  addMarker('FIRELINE');
                } else {
                  let x0 = fireLineStart.x; let y0 = fireLineStart.y;
                  let x1 = x; let y1 = y;
                  const dx = Math.abs(x1 - x0); const dy = Math.abs(y1 - y0);
                  const sx = x0 < x1 ? 1 : -1; const sy = y0 < y1 ? 1 : -1;
                  let err = dx - dy;
                  while (true) {
                    const lineIdx = y0 * GRID_WIDTH + x0;
                    if (nextCells[lineIdx]) { 
                      nextCells[lineIdx].isFireLine = true; 
                      nextCells[lineIdx].ignitionTime = Infinity; 
                      if (engineRef.current) {
                        const ec = engineRef.current.cells[lineIdx];
                        ec.isFireLine = true;
                        ec.ignitionTime = Infinity;
                      }
                    }
                    if (x0 === x1 && y0 === y1) break;
                    const e2 = 2 * err;
                    if (e2 > -dy) { err -= dy; x0 += sx; }
                    if (e2 < dx) { err += dx; y0 += sy; }
                  }
                  setFireLineStart({ x, y });
                  addMarker('FIRELINE');
                }
              } else if (activeTool === 'HELITACK') {
                const radius = 2;
                for (let ddx = -radius; ddx <= radius; ddx++) {
                  for (let ddy = -radius; ddy <= radius; ddy++) {
                    if (ddx * ddx + ddy * ddy <= radius * radius) {
                      const nx = x + ddx; const ny = y + ddy;
                      if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
                        const targetIdx = ny * GRID_WIDTH + nx;
                        const targetCell = nextCells[targetIdx];
                        if (targetCell) {
                          targetCell.helitackDropCount++;
                          targetCell.ignitionTime = Infinity;
                          if (targetCell.fireState === FireState.Burning) targetCell.fireState = FireState.Unburnt;
                          // Sync to engine
                          if (engineRef.current) {
                            const ec = engineRef.current.cells[targetIdx];
                            ec.helitackDropCount++;
                            ec.ignitionTime = Infinity;
                            if (ec.fireState === FireState.Burning) ec.fireState = FireState.Unburnt;
                          }
                        }
                      }
                    }
                  }
                }
                addMarker('HELITACK');
              }
              setCells(nextCells);
          }} />
          <OrbitControls ref={controlsARef} makeDefault />
        </View>
        {isCompareMode && (
          <View track={viewBRef as any}>
            <PerspectiveCamera ref={camBRef} makeDefault position={[0, 0.7, 0.9]} fov={55} />
            <SimulationContent cells={cellsB} activeTool={'NONE'} clickMarkers={clickMarkers.filter(m => m.tool === 'SPARK')} time={time} onCellInteraction={() => {}} />
            <OrbitControls ref={controlsBRef} makeDefault />
            <SyncCameras camA={camARef} camB={camBRef} controlsA={controlsARef} controlsB={controlsBRef} />
          </View>
        )}
      </Canvas>

      {(isLoadingTerrain || terrainLoadError) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "rgba(0,0,0,0.6)", color: "white", padding: "12px 16px", borderRadius: "12px" }}>
            {terrainLoadError ? terrainLoadError : "Loading..."}
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '20px', zIndex: 10 }}>
        {[0, 1, 2].map((idx) => {
          const config = cells.find((c) => c.zoneIdx === idx)?.zone;
          const labels = ['Mountains', 'Foothills', 'Plains'];
          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '120px',
              }}
            >
              <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>
                Zone {idx + 1}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{labels[idx]}</div>
              <div style={{ fontSize: '10px', marginTop: '4px' }}>
                {getVegLabel(config?.vegetation)} • {getDroughtLabel(config?.droughtLevel)}
              </div>
            </div>
          );
        })}
      </div>

      {isSetupOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              width: '450px',
              padding: '32px',
              color: '#1f2937',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setIsSetupOpen(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
              Terrain Setup
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              Configure layout (Concord presets support <code>?preset=</code> in the URL) and zones.
            </p>

            {setupStep === 1 ? (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}
                  >
                    TERRAIN LAYOUT
                  </label>
                  <select
                    value={terrainId}
                    onChange={(e) => applyTerrainAndResetEngine(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value={PROCEDURAL_TERRAIN_ID}>Procedural stripes (original SAFE)</option>
                    {CONCORD_PRESET_IDS.map((id) => (
                      <option key={id} value={id}>
                        Concord: {id}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}
                  >
                    SELECT ZONE
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[0, 1, 2].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setSelectedZone(z)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: selectedZone === z ? '2px solid #2563eb' : '1px solid #d1d5db',
                          backgroundColor: selectedZone === z ? '#eff6ff' : '#fff',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Zone {z + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}
                  >
                    VEGETATION TYPE
                  </label>
                  <select
                    value={currentZoneConfig.vegetation}
                    onChange={(e) =>
                      updateZoneConfig(parseInt(e.target.value, 10) as Vegetation, currentZoneConfig.droughtLevel)
                    }
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value={Vegetation.Forest}>Forest</option>
                    <option value={Vegetation.Shrub}>Shrub</option>
                    <option value={Vegetation.Grass}>Grass</option>
                  </select>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label
                    style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}
                  >
                    DROUGHT INDEX
                  </label>
                  <select
                    value={currentZoneConfig.droughtLevel}
                    onChange={(e) =>
                      updateZoneConfig(
                        currentZoneConfig.vegetation,
                        parseInt(e.target.value, 10) as DroughtLevel
                      )
                    }
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value={DroughtLevel.SevereDrought}>Severe Drought</option>
                    <option value={DroughtLevel.MediumDrought}>Medium Drought</option>
                    <option value={DroughtLevel.MildDrought}>Mild Drought</option>
                    <option value={DroughtLevel.NoDrought}>No Drought</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setSetupStep(2)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Next: Wind Settings
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'block',
                      marginBottom: '16px',
                    }}
                  >
                    WIND DIRECTION ({wind.direction}°)
                  </label>
                  <div
                    style={{
                      position: 'relative',
                      width: '100px',
                      height: '100px',
                      margin: '0 auto',
                      borderRadius: '50%',
                      border: '2px solid #d1d5db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ transform: `rotate(${wind.direction}deg)`, transition: 'transform 0.2s' }}>
                      <Compass size={48} color="#2563eb" />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={wind.direction}
                    onChange={(e) => setWind({ ...wind, direction: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', marginTop: '20px' }}
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label
                    style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}
                  >
                    WIND SPEED ({wind.speed} MPH)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    value={wind.speed}
                    onChange={(e) => setWind({ ...wind, speed: parseInt(e.target.value, 10) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setSetupStep(1)}
                    style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: '#f3f4f6',
                      color: '#1f2937',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    style={{
                      flex: 2,
                      padding: '14px',
                      backgroundColor: '#059669',
                      color: '#fff',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle2 size={18} /> Create Simulation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <footer
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '12px 32px',
          borderRadius: '99px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          zIndex: 50,
        }}
      >
        <ToolBtn
          active={isCompareMode}
          onClick={() => setIsCompareMode(!isCompareMode)}
          icon={<Columns size={20} />}
          label="Compare"
        />
        <div style={{ width: 1, height: 32, backgroundColor: '#e5e7eb' }} />

        <ToolBtn
          onClick={() => setIsSetupOpen(true)}
          icon={<Settings size={20} />}
          label="Setup"
        />
        <div style={{ width: 1, height: 32, backgroundColor: '#e5e7eb' }} />

        <ToolBtn
          active={activeTool === 'SPARK'}
          onClick={() => {
            setActiveTool('SPARK');
            setFireLineStart(null);
          }}
          icon={<Zap size={20} />}
          label="Spark"
        />
        <ToolBtn onClick={reloadTerrain} icon={<RotateCcw size={20} />} label="Reload" />

        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: isPlaying ? '#ef4444' : '#2563eb',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 4 }} />}
        </button>

        <ToolBtn
          active={activeTool === 'FIRELINE'}
          onClick={() => {
            setActiveTool('FIRELINE');
            setFireLineStart(null);
          }}
          icon={<Hammer size={20} />}
          label="Fire Line"
        />
        <ToolBtn
          active={activeTool === 'HELITACK'}
          onClick={() => {
            setActiveTool('HELITACK');
            setFireLineStart(null);
          }}
          icon={<PlaneIcon size={20} />}
          label="Helitack"
        />

        <div style={{ width: 1, height: 32, backgroundColor: '#e5e7eb' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px' }}>
          <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 'bold', letterSpacing: '0.05em' }}>TIME ELAPSED</div>
          <div style={{ fontSize: '15px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1f2937' }}>
            D{Math.floor(time / 1440) + 1} {String(Math.floor((time % 1440) / 60)).padStart(2, '0')}:{String(Math.floor(time % 60)).padStart(2, '0')}
          </div>
        </div>

        <div style={{ width: 1, height: 32, backgroundColor: '#e5e7eb' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              fontSize: '10px',
              color: '#6b7280',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>INTENSITY</span>
            <span style={{ color: '#ef4444' }}>{burnPercentage.toFixed(1)}% BURNED</span>
          </div>
          <div style={{ width: 100, height: 8, backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, burnPercentage)}%`,
                height: '100%',
                background: 'linear-gradient(to right, #ffeb3b, #f44336)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px' }}>
            <span>LOW</span>
            <span>HIGH</span>
          </div>
        </div>
      </footer>


    </div>
  );
};

const SyncCameras = ({ camA, camB, controlsA, controlsB }: any) => {
  useFrame(() => {
    if (camA.current && camB.current && controlsA.current && controlsB.current) {
      // Sync camera
      camB.current.position.copy(camA.current.position);
      camB.current.quaternion.copy(camA.current.quaternion);
      camB.current.updateMatrixWorld();
      
      // Sync OrbitControls target to keep them looking at the same spot
      controlsB.current.target.copy(controlsA.current.target);
      controlsB.current.update();
    }
  });
  return null;
};

const ToolBtn = ({ active, onClick, icon, label }: any) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: active ? '#2563eb' : '#4b5563',
      transition: 'all 0.2s',
    }}
  >
    <div style={{ padding: '8px', borderRadius: '12px', backgroundColor: active ? '#dbeafe' : 'transparent' }}>
      {icon}
    </div>
    <span style={{ fontSize: '10px', fontWeight: active ? 'bold' : 'normal' }}>{label}</span>
  </button>
);

function getVegLabel(v?: Vegetation) {
  switch (v) {
    case Vegetation.Forest:
      return 'Forest';
    case Vegetation.Shrub:
      return 'Shrub';
    case Vegetation.Grass:
      return 'Grass';
    default:
      return '';
  }
}

function getDroughtLabel(d?: DroughtLevel) {
  switch (d) {
    case DroughtLevel.SevereDrought:
      return 'Severe';
    case DroughtLevel.MediumDrought:
      return 'Medium';
    case DroughtLevel.MildDrought:
      return 'Mild';
    case DroughtLevel.NoDrought:
      return 'None';
    default:
      return '';
  }
}
