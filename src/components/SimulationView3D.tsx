/**
 * SAFE 3D Simulation View
 *
 * R3F visualization + Concord-consortium FireEngine (Rothermel spread).
 */

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Html, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  Zap,
  Hammer,
  Plane as PlaneIcon,
  Settings,
  Compass,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Terrain3D } from './Terrain3D';
import { Vegetation, DroughtLevel } from '../logic/concord/types';
import type { IWindProps } from '../logic/concord/types';
import { FireState, Cell } from '../logic/concord/cell';
import { FireEngine } from '../logic/concord/engine/fire-engine';
import { buildTerrainGrid, PROCEDURAL_TERRAIN_ID } from '../logic/wildfire3D';
import { getDefaultFireEngineConfig } from '../logic/concord/engine-config';
import { isConcordPresetId, CONCORD_PRESET_IDS } from '../logic/concord/presets';

// Higher resolution grid (closer to Concord feel).
// Note: Terrain3D uses a subdivided BoxGeometry; very high values can hurt FPS.
// Concord defaults (see wildfire-model `config.ts`):
// modelWidth 120000ft, modelHeight 80000ft, gridWidth 240 -> cellSize 500ft, gridHeight 160.
const MODEL_WIDTH_FT = 120000;
const MODEL_HEIGHT_FT = 80000;
const GRID_WIDTH = 240;
const CELL_SIZE_FT = MODEL_WIDTH_FT / GRID_WIDTH; // 500
const GRID_HEIGHT = Math.ceil(MODEL_HEIGHT_FT / CELL_SIZE_FT); // 160

const ENGINE_CFG = getDefaultFireEngineConfig(GRID_WIDTH, GRID_HEIGHT, CELL_SIZE_FT);

function readInitialTerrainId(): string {
  if (typeof window === 'undefined') return PROCEDURAL_TERRAIN_ID;
  const p = new URLSearchParams(window.location.search).get('preset');
  return p && isConcordPresetId(p) ? p : PROCEDURAL_TERRAIN_ID;
}

function createEngine(grid: Cell[], wind: IWindProps): FireEngine {
  return new FireEngine(grid, wind, [], ENGINE_CFG);
}

const TOWNS = [
  { name: 'Skyview', xFrac: 0.12, yFrac: 0.68 },
  { name: 'Rolling Rock', xFrac: 0.60, yFrac: 0.25 },
  { name: 'Evensville', xFrac: 0.78, yFrac: 0.55 },
];

interface Simulation3DProps {
  onBack: () => void;
}

type Tool = 'SPARK' | 'FIRELINE' | 'HELITACK' | 'NONE';

export const SimulationView3D: React.FC<Simulation3DProps> = ({ onBack }) => {
  const [terrainId, setTerrainId] = useState<string>(() => readInitialTerrainId());
  const [cells, setCells] = useState<Cell[]>(() =>
    buildTerrainGrid(GRID_WIDTH, GRID_HEIGHT, readInitialTerrainId())
  );
  // Concord default windSpeed is 0 (mph).
  const [wind, setWind] = useState<IWindProps>({ speed: 0, direction: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [activeTool, setActiveTool] = useState<Tool>('NONE');
  const [fireLineStart, setFireLineStart] = useState<{ x: number; y: number } | null>(null);
  const [clickMarkers, setClickMarkers] = useState<Array<{ x: number; y: number; z: number; tool: Tool; t: number }>>([]);

  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [setupStep, setSetupStep] = useState(1);
  const [selectedZone, setSelectedZone] = useState<number>(0);

  const engineRef = useRef<FireEngine | null>(null);
  const timerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    engineRef.current = createEngine(cells, wind);
    return () => {
      engineRef.current = null;
    };
    // Mount / unmount only: engine must persist across cell tick updates (mutated in place).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineRef.current) engineRef.current.wind = wind;
  }, [wind]);

  const applyTerrainAndResetEngine = useCallback((id: string) => {
    const grid = buildTerrainGrid(GRID_WIDTH, GRID_HEIGHT, id);
    engineRef.current = createEngine(grid, wind);
    setTerrainId(id);
    setCells([...grid]);
    setTime(0);
    setIsPlaying(false);
    setFireLineStart(null);
    setClickMarkers([]);
  }, [wind]);

  // Concord: 1 model day (1440 min) in 8 real seconds => 180 min/sec.
  // At 10 ticks/sec (100ms), that's 18 minutes per tick.
  const minutesPerTick = 18;
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setTime((t) => {
          const nextTime = t + minutesPerTick;
          if (engineRef.current) {
            engineRef.current.updateFire(nextTime);
            setCells([...engineRef.current.cells]);
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
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#cbd5e1',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Canvas shadows>
        <color attach="background" args={['#cbd5e1']} />
        <PerspectiveCamera makeDefault position={[0, 40, 50]} fov={55} />
        <OrbitControls enablePan enableZoom maxPolarAngle={Math.PI / 2.1} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 50]} intensity={1.5} castShadow />
        <Sky sunPosition={[100, 10, 100]} />

        <group position={[0, 0, 0]}>
          <Terrain3D
            cells={cells}
            gridWidth={GRID_WIDTH}
            gridHeight={GRID_HEIGHT}
            modelWidthFt={MODEL_WIDTH_FT}
            modelHeightFt={MODEL_HEIGHT_FT}
            activeTool={activeTool}
            simTime={time}
            onCellInteraction={(x, y) => {
              const idx = y * GRID_WIDTH + x;
              const nextCells = [...cells];
              const cell = nextCells[idx];
              const z = (cell?.baseElevation ?? 0) * (1 / MODEL_WIDTH_FT);

              const addMarker = (tool: Tool) => {
                setClickMarkers((prev) => {
                  const next = [...prev, { x, y, z, tool, t: time }];
                  return next.length > 12 ? next.slice(next.length - 12) : next;
                });
              };

              if (activeTool === 'SPARK') {
                if (!cell.isRiver && !cell.isNonburnable && cell.fireState === FireState.Unburnt) {
                  cell.ignitionTime = 0;
                  cell.fireState = FireState.Unburnt;
                  cell.spreadRate = 0;
                  if (engineRef.current) {
                    engineRef.current.removeUnburntIsland(cell);
                  }
                  addMarker('SPARK');
                }
              } else if (activeTool === 'FIRELINE') {
                if (!fireLineStart) {
                  setFireLineStart({ x, y });
                  cell.isFireLine = true;
                  cell.ignitionTime = Infinity;
                  addMarker('FIRELINE');
                } else {
                  let x0 = fireLineStart.x;
                  let y0 = fireLineStart.y;
                  let x1 = x;
                  let y1 = y;
                  const dx = Math.abs(x1 - x0);
                  const dy = Math.abs(y1 - y0);
                  const sx = x0 < x1 ? 1 : -1;
                  const sy = y0 < y1 ? 1 : -1;
                  let err = dx - dy;

                  while (true) {
                    const lineIdx = y0 * GRID_WIDTH + x0;
                    if (nextCells[lineIdx]) {
                      nextCells[lineIdx].isFireLine = true;
                      nextCells[lineIdx].ignitionTime = Infinity;
                    }
                    if (x0 === x1 && y0 === y1) break;
                    const e2 = 2 * err;
                    if (e2 > -dy) {
                      err -= dy;
                      x0 += sx;
                    }
                    if (e2 < dx) {
                      err += dx;
                      y0 += sy;
                    }
                  }
                  setFireLineStart({ x, y });
                  addMarker('FIRELINE');
                }
              } else if (activeTool === 'HELITACK') {
                const radius = 2;
                for (let ddx = -radius; ddx <= radius; ddx++) {
                  for (let ddy = -radius; ddy <= radius; ddy++) {
                    if (ddx * ddx + ddy * ddy <= radius * radius) {
                      const nx = x + ddx;
                      const ny = y + ddy;
                      if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
                        const targetIdx = ny * GRID_WIDTH + nx;
                        const targetCell = nextCells[targetIdx];
                        if (targetCell) {
                          targetCell.helitackDropCount++;
                          targetCell.ignitionTime = Infinity;
                          if (targetCell.fireState === FireState.Burning) {
                            targetCell.fireState = FireState.Unburnt;
                          }
                        }
                      }
                    }
                  }
                }
                addMarker('HELITACK');
              }
              setCells(nextCells);
            }}
          />

          {/* Click markers (last ~12). Helps users see where they interacted. */}
          {clickMarkers.map((m, i) => {
            const color =
              m.tool === 'SPARK' ? '#f59e0b' :
              m.tool === 'FIRELINE' ? '#8b5a2b' :
              m.tool === 'HELITACK' ? '#38bdf8' : '#ffffff';
            // Terrain3D coordinate frame: x centered, y is height axis, z is gridY mapped with (height/2 - y)
            return (
              <group
                key={`${m.x}-${m.y}-${m.t}-${i}`}
                position={[
                  (m.x / (GRID_WIDTH - 1) - 0.5) * 1,
                  m.z + 0.01,
                  ((GRID_HEIGHT - 1 - m.y) / (GRID_HEIGHT - 1) - 0.5) * (MODEL_HEIGHT_FT / MODEL_WIDTH_FT),
                ]}
              >
                <mesh position={[0, 1.8, 0]}>
                  <cylinderGeometry args={[0.18, 0.18, 3.6, 10]} />
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} />
                </mesh>
                <mesh position={[0, 3.8, 0]}>
                  <sphereGeometry args={[0.42, 12, 12]} />
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.0} />
                </mesh>
              </group>
            );
          })}

          {TOWNS.map((town) => {
            const gridX = Math.max(0, Math.min(GRID_WIDTH - 1, Math.floor(town.xFrac * GRID_WIDTH)));
            const gridY = Math.max(0, Math.min(GRID_HEIGHT - 1, Math.floor(town.yFrac * GRID_HEIGHT)));
            const cellIdx = gridY * GRID_WIDTH + gridX;
            const cell = cells[cellIdx];
            if (!cell) return null;
            const isBurned =
              cell.fireState === FireState.Burning || cell.fireState === FireState.Burnt;
            return (
              <Html
                key={town.name}
                position={[
                  cell.x - GRID_WIDTH / 2,
                  cell.baseElevation / 40 + 2,
                  GRID_HEIGHT / 2 - cell.y,
                ]}
                center
              >
                <div
                  style={{
                    backgroundColor: isBurned
                      ? 'rgba(239, 68, 68, 0.9)'
                      : 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    border: `1px solid ${isBurned ? '#b91c1c' : 'rgba(255,255,255,0.2)'}`,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                >
                  {town.name} {isBurned && '🔥'}
                </div>
              </Html>
            );
          })}
        </group>
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: '80px',
          right: '24px',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '12px 24px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 'bold',
            marginBottom: '4px',
          }}
        >
          Time Elapsed
        </div>
        <div style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 'bold' }}>
          Day {Math.floor(time / 1440) + 1},{' '}
          {String(Math.floor((time % 1440) / 60)).padStart(2, '0')}:
          {String(Math.floor(time % 60)).padStart(2, '0')}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
        }}
      >
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
        }}
      >
        <button type="button" onClick={() => setIsSetupOpen(true)} className="tool-btn">
          <Settings size={20} /> <span style={{ fontSize: '10px' }}>Setup</span>
        </button>
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
        <ToolBtn
          onClick={() => applyTerrainAndResetEngine(terrainId)}
          icon={<RotateCcw size={20} />}
          label="Reload"
        />

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

      <button
        type="button"
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          backgroundColor: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '99px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontWeight: 600,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}
      >
        <ChevronLeft size={16} /> Exit
      </button>
    </div>
  );
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
