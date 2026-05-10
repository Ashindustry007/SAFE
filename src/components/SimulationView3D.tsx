/**
 * SAFE (Simulated Analysis of Fire Ecology) - 3D Simulation View
 * 
 * A high-fidelity 3D visualization layer built with React Three Fiber (R3F).
 * This component orchestrates the interaction between the user interface and
 * the Concord Fire Engine (Rothermel spread physics).
 * 
 * Features:
 * - High-resolution 3D terrain rendering with procedural vegetation.
 * - Multi-view comparison mode (A/B testing of suppression strategies).
 * - Real-time suppression tools: Helitack drops, Fireline construction.
 * - Preset-based terrain loading and environmental configuration.
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

// --- GLOBAL CONFIGURATION ---
const CFG = DEFAULT_THREE_ZONE_CONFIG;
const MODEL_WIDTH_FT = CFG.modelWidth;
const MODEL_HEIGHT_FT = CFG.modelHeight;
const GRID_WIDTH = CFG.gridWidth;
const GRID_HEIGHT = CFG.gridHeight;
const CELL_SIZE_FT = CFG.cellSize;

/**
 * Engine Initialization Helper
 */
const ENGINE_CFG = getDefaultFireEngineConfig(GRID_WIDTH, GRID_HEIGHT, CELL_SIZE_FT);

function createEngine(grid: Cell[], wind: IWindProps): FireEngine {
  return new FireEngine(grid, wind, [], ENGINE_CFG);
}

/**
 * Simulation3DProps
 */
interface Simulation3DProps {}

/**
 * Active Interaction Tools
 * SPARK: Manually ignite a fire at a specific coordinate.
 * FIRELINE: Construct unburnable barriers using Bresenham's algorithm.
 * HELITACK: Deploy localized high-moisture water drops.
 */
type Tool = 'SPARK' | 'FIRELINE' | 'HELITACK' | 'NONE';

/**
 * SimulationContent Component
 * Pure R3F sub-component for rendering lighting, sky, terrain, and interactive markers.
 */
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
      {/* 3D Interaction Markers (Pins) */}
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

/**
 * SimulationView3D
 * The primary view component for the 3D wildfire simulation.
 */
export const SimulationView3D: React.FC<Simulation3DProps> = () => {
  // --- STATE: DATA & SIMULATION ---
  const [cells, setCells] = useState<Cell[]>(() => {
    // Initial zone-striped placeholder grid
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
  const [cellsB, setCellsB] = useState<Cell[]>([]);
  const [wind, setWind] = useState<IWindProps>(() => defaultWindFromConfig(CFG));
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // --- STATE: UI & INTERACTION ---
  const [activeTool, setActiveTool] = useState<Tool>('NONE');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [setupStep, setSetupStep] = useState(1);
  const [selectedZone, setSelectedZone] = useState<number>(0);
  const [isLoadingTerrain, setIsLoadingTerrain] = useState(true);
  const [terrainLoadError, setTerrainLoadError] = useState<string | null>(null);
  const [terrainId, setTerrainId] = useState<string>(PROCEDURAL_TERRAIN_ID);

  // --- REFS: ENGINE & CONTROLS ---
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
  const [fireLineStart, setFireLineStart] = useState<{ x: number; y: number } | null>(null);
  const [clickMarkers, setClickMarkers] = useState<Array<{ x: number; y: number; z: number; tool: Tool; t: number }>>([]);

  /**
   * INITIALIZATION EFFECT
   * Loads terrain assets and initializes both Primary and Baseline engines.
   */
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
    return () => { cancelled = true; };
  }, []);

  /**
   * WIND UPDATE SYNC
   * Propagates wind parameter changes to the underlying physics engines.
   */
  useEffect(() => {
    if (engineRef.current) engineRef.current.wind = wind;
    if (engineRefB.current) engineRefB.current.wind = wind;
  }, [wind]);

  /**
   * RELOAD HANDLER
   * Performs a hard reset of terrain and simulation state.
   */
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

  /**
   * MAIN SIMULATION TICK LOOP
   * High-fidelity sub-stepping engine:
   * 1 real second = 3 hours of simulation.
   * Logic runs 18 minutes of physics per 100ms UI frame.
   */
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setTime((t) => {
          let nextTime = t;
          const tickSeed = Math.random();
          
          for (let i = 0; i < subSteps; i++) {
            nextTime += minutesPerStep;
            if (engineRef.current) {
              (engineRef.current as any).setSeed(tickSeed + i * 0.1);
              engineRef.current.updateFire(nextTime);
            }
            if (engineRefB.current) {
              (engineRefB.current as any).setSeed(tickSeed + i * 0.1);
              engineRefB.current.updateFire(nextTime);
            }
          }

          if (engineRef.current) setCells([...engineRef.current.cells]);
          if (engineRefB.current) setCellsB([...engineRefB.current.cells]);
          
          return nextTime;
        });
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);

  const minutesPerStep = 6;
  const subSteps = 3;

  /**
   * TERRAIN PRESET LOADER
   * Switches the entire world layout based on selected presets (Concord).
   */
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

  /**
   * handleCreate
   * Transitions from Setup Overlay to active Simulation.
   */
  const handleCreate = () => {
    setIsSetupOpen(false);
    setSetupStep(1);
    setIsPlaying(false);
    setTime(0);
  };

  /**
   * updateZoneConfig
   * Applies environmental changes to specific regional zones.
   */
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

  // --- DERIVED METRICS ---
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
      
      {/* 3D VIEWPORTS HUD (Split Screen Sync) */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 1, pointerEvents: 'none' }}>
        <div ref={viewARef} style={{ flex: 1, position: 'relative', pointerEvents: 'auto' }}>
          {isCompareMode && (
            <div className="simulation-label">Controlled Simulation</div>
          )}
        </div>
        {isCompareMode && (
          <div ref={viewBRef} style={{ flex: 1, position: 'relative', borderLeft: '2px solid rgba(255,255,255,0.1)', pointerEvents: 'auto' }}>
            <div className="simulation-label uncontrolled">Uncontrolled Baseline</div>
          </div>
        )}
      </div>

      {/* R3F CANVAS ROOT */}
      <Canvas style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'auto' }} eventSource={containerRef}>
        {/* VIEW A: INTERACTIVE SIMULATION */}
        <View track={viewARef as any}>
          <PerspectiveCamera ref={camARef} makeDefault position={[0, 0.7, 0.9]} fov={55} />
          <SimulationContent 
            cells={cells} 
            activeTool={activeTool} 
            clickMarkers={clickMarkers} 
            time={time} 
            onCellInteraction={(x: number, y: number) => {
              if (isLoadingTerrain) return;
              const idx = y * GRID_WIDTH + x;
              const nextCells = [...cells];
              const cell = nextCells[idx];
              const z = (cell?.elevation ?? cell?.baseElevation ?? 0) * (1 / MODEL_WIDTH_FT);
              const addMarker = (tool: Tool) => setClickMarkers((prev) => { const next = [...prev, { x, y, z, tool, t: time }]; return next.length > 12 ? next.slice(next.length - 12) : next; });
              
              // TOOL LOGIC: SPARK (Manual Ignition)
              if (activeTool === 'SPARK') {
                if (!cell.isRiver && !cell.isNonburnable && cell.fireState === FireState.Unburnt) {
                  cell.ignitionTime = 0;
                  if (engineRef.current) engineRef.current.removeUnburntIsland(cell);
                  // Dual-sync for comparison baseline
                  if (engineRefB.current) {
                    const cellB = engineRefB.current.cells[idx];
                    cellB.ignitionTime = 0;
                    engineRefB.current.removeUnburntIsland(cellB);
                    setCellsB([...engineRefB.current.cells]);
                  }
                  addMarker('SPARK');
                }
              } 
              // TOOL LOGIC: FIRELINE (Defensive Barriers)
              else if (activeTool === 'FIRELINE') {
                if (!fireLineStart) {
                  setFireLineStart({ x, y });
                  cell.isFireLine = true;
                  cell.ignitionTime = Infinity;
                  if (engineRef.current) {
                    const engineCell = engineRef.current.cells[idx];
                    engineCell.isFireLine = true;
                    engineCell.ignitionTime = Infinity;
                  }
                  addMarker('FIRELINE');
                } else {
                  // Bresenham's Line Algorithm for manual fireline construction
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
              } 
              // TOOL LOGIC: HELITACK (Aerial Suppression)
              else if (activeTool === 'HELITACK') {
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
                          targetCell.suppressionTimer = 120; // 2 hours of moisture protection
                          targetCell.ignitionTime = Infinity;
                          if (targetCell.fireState === FireState.Burning) targetCell.fireState = FireState.Unburnt;
                          if (engineRef.current) {
                            const ec = engineRef.current.cells[targetIdx];
                            ec.helitackDropCount++;
                            ec.suppressionTimer = 120;
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

        {/* VIEW B: BASELINE CONTROL GROUP */}
        {isCompareMode && (
          <View track={viewBRef as any}>
            <PerspectiveCamera ref={camBRef} makeDefault position={[0, 0.7, 0.9]} fov={55} />
            <SimulationContent 
              cells={cellsB} 
              activeTool={'NONE'} 
              clickMarkers={clickMarkers.filter(m => m.tool === 'SPARK')} 
              time={time} 
              onCellInteraction={() => {}} 
            />
            <OrbitControls ref={controlsBRef} makeDefault />
            {/* CROSS-VIEW CAMERA SYNCHRONIZATION */}
            <SyncCameras camA={camARef} camB={camBRef} controlsA={controlsARef} controlsB={controlsBRef} />
          </View>
        )}
      </Canvas>

      {/* OVERLAY: SETUP DASHBOARD */}
      {isSetupOpen && (
        <div className="setup-overlay">
          <div className="setup-modal">
            <button type="button" onClick={() => setIsSetupOpen(false)} className="close-btn"><X size={20} /></button>
            <h2 className="setup-title">Terrain Setup</h2>
            <p className="setup-desc">Configure layout and environmental zones.</p>

            {setupStep === 1 ? (
              <div className="setup-form">
                <div className="field">
                  <label>TERRAIN LAYOUT</label>
                  <select value={terrainId} onChange={(e) => applyTerrainAndResetEngine(e.target.value)}>
                    <option value={PROCEDURAL_TERRAIN_ID}>Procedural stripes (original SAFE)</option>
                    {CONCORD_PRESET_IDS.map((id) => <option key={id} value={id}>Concord: {id}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>SELECT ZONE</label>
                  <div className="zone-picker">
                    {[0, 1, 2].map((z) => (
                      <button key={z} type="button" onClick={() => setSelectedZone(z)} className={selectedZone === z ? 'active' : ''}>Zone {z + 1}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>VEGETATION TYPE</label>
                  <select value={currentZoneConfig.vegetation} onChange={(e) => updateZoneConfig(parseInt(e.target.value, 10) as Vegetation, currentZoneConfig.droughtLevel)}>
                    <option value={Vegetation.Forest}>Forest</option>
                    <option value={Vegetation.Shrub}>Shrub</option>
                    <option value={Vegetation.Grass}>Grass</option>
                  </select>
                </div>
                <div className="field">
                  <label>DROUGHT INDEX</label>
                  <select value={currentZoneConfig.droughtLevel} onChange={(e) => updateZoneConfig(currentZoneConfig.vegetation, parseInt(e.target.value, 10) as DroughtLevel)}>
                    <option value={DroughtLevel.SevereDrought}>Severe Drought</option>
                    <option value={DroughtLevel.MediumDrought}>Medium Drought</option>
                    <option value={DroughtLevel.MildDrought}>Mild Drought</option>
                    <option value={DroughtLevel.NoDrought}>No Drought</option>
                  </select>
                </div>
                <button type="button" onClick={() => setSetupStep(2)} className="btn-primary">Next: Wind Settings</button>
              </div>
            ) : (
              <div className="setup-form">
                <div className="field wind-compass">
                  <label>WIND DIRECTION ({wind.direction}°)</label>
                  <div className="compass-viz"><div style={{ transform: `rotate(${wind.direction}deg)` }}><Compass size={48} color="#2563eb" /></div></div>
                  <input type="range" min={0} max={360} value={wind.direction} onChange={(e) => setWind({ ...wind, direction: parseInt(e.target.value, 10) })} />
                </div>
                <div className="field">
                  <label>WIND SPEED ({wind.speed} MPH)</label>
                  <input type="range" min={0} max={25} value={wind.speed} onChange={(e) => setWind({ ...wind, speed: parseInt(e.target.value, 10) })} />
                </div>
                <div className="actions">
                  <button type="button" onClick={() => setSetupStep(1)} className="btn-secondary">Back</button>
                  <button type="button" onClick={handleCreate} className="btn-success"><CheckCircle2 size={18} /> Create Simulation</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER: SIMULATION TOOLBAR */}
      <footer className="sim-toolbar">
        <ToolBtn active={isCompareMode} onClick={() => setIsCompareMode(!isCompareMode)} icon={<Columns size={20} />} label="Compare" />
        <div className="divider" />
        <ToolBtn onClick={() => setIsSetupOpen(true)} icon={<Settings size={20} />} label="Setup" />
        <div className="divider" />
        <ToolBtn active={activeTool === 'SPARK'} onClick={() => { setActiveTool('SPARK'); setFireLineStart(null); }} icon={<Zap size={20} />} label="Spark" />
        <ToolBtn active={activeTool === 'FIRELINE'} onClick={() => { setActiveTool('FIRELINE'); setFireLineStart(null); }} icon={<Hammer size={20} />} label="Fireline" />
        <ToolBtn active={activeTool === 'HELITACK'} onClick={() => { setActiveTool('HELITACK'); setFireLineStart(null); }} icon={<PlaneIcon size={20} />} label="Helitack" />
        <ToolBtn onClick={reloadTerrain} icon={<RotateCcw size={20} />} label="Reload" />
        
        <button type="button" onClick={() => setIsPlaying(!isPlaying)} className={`play-btn ${isPlaying ? 'playing' : ''}`}>
          {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 4 }} />}
        </button>
      </footer>
    </div>
  );
};

// --- SUB-COMPONENTS & HELPERS ---

const ToolBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`tool-btn ${active ? 'active' : ''}`}>
    <div className="icon">{icon}</div>
    <span>{label}</span>
  </button>
);

const getVegLabel = (v?: Vegetation) => {
  if (v === Vegetation.Forest) return 'Forest';
  if (v === Vegetation.Shrub) return 'Shrub';
  return 'Grass';
};

const getDroughtLabel = (d?: DroughtLevel) => {
  if (d === DroughtLevel.SevereDrought) return 'Severe';
  if (d === DroughtLevel.MediumDrought) return 'Medium';
  if (d === DroughtLevel.MildDrought) return 'Mild';
  return 'None';
};

/**
 * SyncCameras Component
 * Synchronizes the camera and control state between split views.
 */
const SyncCameras = ({ camA, camB, controlsA, controlsB }: any) => {
  useFrame(() => {
    if (camA.current && camB.current) {
      camB.current.position.copy(camA.current.position);
      camB.current.quaternion.copy(camA.current.quaternion);
      camB.current.zoom = camA.current.zoom;
    }
    if (controlsA.current && controlsB.current) {
      controlsB.current.target.copy(controlsA.current.target);
    }
  });
  return null;
};

export default SimulationView3D;
