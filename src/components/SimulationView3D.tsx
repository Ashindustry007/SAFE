/**
 * SAFE 3D Simulation View
 * 
 * A high-fidelity 3D visualization component built on React Three Fiber.
 * Integrates the physics-based Rothermel engine with a Three.js scene,
 * providing interactive tools for firefighting (Firelines, Helitack) and 
 * real-time topographic mapping.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Html, OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
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
  X
} from 'lucide-react';
import { Terrain3D } from './Terrain3D';
import { Vegetation, DroughtLevel } from '../logic/concord/types';
import type { IWindProps } from '../logic/concord/types';
import { FireState, Cell } from '../logic/concord/cell';
import { FireEngine } from '../logic/concord/engine/fire-engine';
import { generate3DGrid } from '../logic/wildfire3D';

const GRID_WIDTH = 140;
const GRID_HEIGHT = 90;
const CELL_SIZE_FT = 100;

const TOWNS = [
  { name: "Oakhaven", gridX: 30, gridY: 60 },
  { name: "Riverbend", gridX: 90, gridY: 40 },
  { name: "Pineridge", gridX: 110, gridY: 70 }
];

interface Simulation3DProps {
  onBack: () => void;
}

/**
 * Tool Type Definitions
 * Represents the current interactive mode of the simulation.
 */
type Tool = 'SPARK' | 'FIRELINE' | 'HELITACK' | 'NONE';

export const SimulationView3D: React.FC<Simulation3DProps> = ({ onBack }) => {
  const [cells, setCells] = useState<Cell[]>(() => generate3DGrid(GRID_WIDTH, GRID_HEIGHT));
  const [wind, setWind] = useState<IWindProps>({ speed: 10, direction: 225 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [activeTool, setActiveTool] = useState<Tool>('NONE');
  const [fireLineStart, setFireLineStart] = useState<{x: number, y: number} | null>(null);
  
  // Modal State
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [setupStep, setSetupStep] = useState(1);
  const [selectedZone, setSelectedZone] = useState<number>(0);

  const engineRef = useRef<FireEngine | null>(null);
  const timerRef = useRef<number | null>(null);

  /**
   * Simulation Loop Effect
   * Executes the physics-based step function at a fixed interval.
   * Updates the global cell state array and advances the simulation clock.
   */
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new FireEngine(cells, wind, [], {
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
        cellSize: CELL_SIZE_FT,
        minCellBurnTime: 200,
        neighborsDist: 2.5,
        fireSurvivalProbability: 0.1
      });
    } else {
      engineRef.current.wind = wind;
    }
  }, [wind, cells]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setTime(t => {
          const nextTime = t + 6; // 6 minutes per tick = 60 minutes (1 hour) per second
          if (engineRef.current) {
            engineRef.current.updateFire(nextTime);
            setCells([...engineRef.current.cells]);
          }
          return nextTime;
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]); // Stabilized loop

  const handleCreate = () => {
    setIsSetupOpen(false);
    setSetupStep(1);
    setIsPlaying(false);
    setTime(0);
  };

  const updateZoneConfig = (v: Vegetation, d: DroughtLevel) => {
    const nextCells = [...cells];
    nextCells.forEach(cell => {
      if (cell.zoneIdx === selectedZone) {
        cell.zone.vegetation = v;
        cell.zone.droughtLevel = d;
      }
    });
    setCells(nextCells);
  };

  const currentZoneConfig = cells.find(c => c.zoneIdx === selectedZone)?.zone || { vegetation: Vegetation.Grass, droughtLevel: DroughtLevel.MildDrought };

  const totalBurnable = cells.filter(c => !c.isRiver && !c.isUnburntIsland).length;
  const totalBurned = cells.filter(c => c.fireState === FireState.Burnt || c.fireState === FireState.Burning).length;
  const burnPercentage = totalBurnable > 0 ? (totalBurned / totalBurnable) * 100 : 0;

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#e5e5e5', position: 'relative', overflow: 'hidden' }}>
      {/* 3D Scene */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 40, 50]} fov={55} />
        <OrbitControls enablePan={true} enableZoom={true} maxPolarAngle={Math.PI / 2.1} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 50]} intensity={1.5} castShadow />
        <Sky sunPosition={[100, 10, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <group scale={[4, 4, 4]} position={[0, 0, 0]}>
          <Terrain3D 
            cells={cells} 
            width={GRID_WIDTH} 
            height={GRID_HEIGHT} 
            activeTool={activeTool}
            onCellInteraction={(x, y) => {
              const idx = y * GRID_WIDTH + x;
              const nextCells = [...cells];
              const cell = nextCells[idx];
              
              if (activeTool === 'SPARK') {
                cell.fireState = FireState.Burning;
                cell.ignitionTime = time;
                if (engineRef.current) {
                  engineRef.current.removeUnburntIsland(cell);
                }
              } else if (activeTool === 'FIRELINE') {
                if (!fireLineStart) {
                  setFireLineStart({ x, y });
                  cell.isFireLine = true;
                  cell.ignitionTime = Infinity;
                } else {
                  // Bresenham's line algorithm
                  let x0 = fireLineStart.x;
                  let y0 = fireLineStart.y;
                  let x1 = x;
                  let y1 = y;
                  const dx = Math.abs(x1 - x0);
                  const dy = Math.abs(y1 - y0);
                  const sx = (x0 < x1) ? 1 : -1;
                  const sy = (y0 < y1) ? 1 : -1;
                  let err = dx - dy;

                  while(true) {
                    const lineIdx = y0 * GRID_WIDTH + x0;
                    if (nextCells[lineIdx]) {
                      nextCells[lineIdx].isFireLine = true;
                      nextCells[lineIdx].ignitionTime = Infinity;
                    }
                    if ((x0 === x1) && (y0 === y1)) break;
                    const e2 = 2 * err;
                    if (e2 > -dy) { err -= dy; x0  += sx; }
                    if (e2 < dx) { err += dx; y0  += sy; }
                  }
                  setFireLineStart({ x, y }); // allow chaining
                }
              } else if (activeTool === 'HELITACK') {
                // Drop radius of 2 cells
                const radius = 2;
                for (let dx = -radius; dx <= radius; dx++) {
                  for (let dy = -radius; dy <= radius; dy++) {
                    if (dx*dx + dy*dy <= radius*radius) {
                      const nx = x + dx;
                      const ny = y + dy;
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
              }
              setCells(nextCells);
            }} 
          />

          {TOWNS.map(town => {
            const cellIdx = town.gridY * GRID_WIDTH + town.gridX;
            const cell = cells[cellIdx];
            if (!cell) return null;
            const isBurned = cell.fireState === FireState.Burning || cell.fireState === FireState.Burnt;
            return (
              <Html key={town.name} position={[cell.x - GRID_WIDTH / 2, cell.baseElevation / 40 + 2, GRID_HEIGHT / 2 - cell.y]} center>
                <div style={{ 
                  backgroundColor: isBurned ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.6)', 
                  color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', 
                  border: `1px solid ${isBurned ? '#b91c1c' : 'rgba(255,255,255,0.2)'}`,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}>
                  {town.name} {isBurned && '🔥'}
                </div>
              </Html>
            );
          })}
        </group>

        <OrbitControls enablePan={true} enableZoom={true} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>

      {/* Timer Overlay */}
      <div style={{ position: 'absolute', top: '80px', right: '24px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '12px 24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pointerEvents: 'none', backdropFilter: 'blur(8px)' }}>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', marginBottom: '4px' }}>Time Elapsed</div>
        <div style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 'bold' }}>
          Day {Math.floor(time / 1440) + 1}, {String(Math.floor((time % 1440) / 60)).padStart(2, '0')}:{String(Math.floor(time % 60)).padStart(2, '0')}
        </div>
      </div>

      {/* Top HUD: Zone Badges */}
      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '20px' }}>
        {[0, 1, 2].map(idx => {
          const config = cells.find(c => c.zoneIdx === idx)?.zone;
          const labels = ['Mountains', 'Foothills', 'Plains'];
          return (
            <div key={idx} className="glass-panel" style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Zone {idx + 1}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{labels[idx]}</div>
              <div style={{ fontSize: '10px', marginTop: '4px' }}>{getVegLabel(config?.vegetation)} • {getDroughtLabel(config?.droughtLevel)}</div>
            </div>
          );
        })}
      </div>

      {/* Terrain Setup Modal */}
      {isSetupOpen && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '450px', padding: '32px', color: '#1f2937', position: 'relative' }}>
            <button onClick={() => setIsSetupOpen(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Terrain Setup</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>Configure the environmental variables for the simulation.</p>

            {setupStep === 1 ? (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>SELECT ZONE</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[0, 1, 2].map(z => (
                      <button key={z} onClick={() => setSelectedZone(z)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: selectedZone === z ? '2px solid #2563eb' : '1px solid #d1d5db', backgroundColor: selectedZone === z ? '#eff6ff' : '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Zone {z + 1}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>VEGETATION TYPE</label>
                  <select 
                    value={currentZoneConfig.vegetation}
                    onChange={(e) => updateZoneConfig(parseInt(e.target.value) as Vegetation, currentZoneConfig.droughtLevel)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value={Vegetation.Forest}>Forest</option>
                    <option value={Vegetation.Shrub}>Shrub</option>
                    <option value={Vegetation.Grass}>Grass</option>
                  </select>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>DROUGHT INDEX</label>
                  <select 
                    value={currentZoneConfig.droughtLevel}
                    onChange={(e) => updateZoneConfig(currentZoneConfig.vegetation, parseInt(e.target.value) as DroughtLevel)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value={DroughtLevel.SevereDrought}>Severe Drought</option>
                    <option value={DroughtLevel.MediumDrought}>Medium Drought</option>
                    <option value={DroughtLevel.MildDrought}>Mild Drought</option>
                    <option value={DroughtLevel.NoDrought}>No Drought</option>
                  </select>
                </div>

                <button onClick={() => setSetupStep(2)} style={{ width: '100%', padding: '14px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Next: Wind Settings</button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '16px' }}>WIND DIRECTION ({wind.direction}°)</label>
                  <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto', borderRadius: '50%', border: '2px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ transform: `rotate(${wind.direction}deg)`, transition: 'transform 0.2s' }}>
                      <Compass size={48} color="#2563eb" />
                    </div>
                  </div>
                  <input 
                    type="range" min="0" max="360" value={wind.direction}
                    onChange={(e) => setWind({ ...wind, direction: parseInt(e.target.value) })}
                    style={{ width: '100%', marginTop: '20px' }}
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>WIND SPEED ({wind.speed} MPH)</label>
                  <input 
                    type="range" min="0" max="25" value={wind.speed}
                    onChange={(e) => setWind({ ...wind, speed: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setSetupStep(1)} style={{ flex: 1, padding: '14px', backgroundColor: '#f3f4f6', color: '#1f2937', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Back</button>
                  <button onClick={handleCreate} style={{ flex: 2, padding: '14px', backgroundColor: '#059669', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><CheckCircle2 size={18} /> Create Simulation</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Toolbar */}
      <footer style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255,255,255,0.95)', padding: '12px 32px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
        <button onClick={() => setIsSetupOpen(true)} className="tool-btn"><Settings size={20} /> <span style={{ fontSize: '10px' }}>Setup</span></button>
        <div style={{ width: 1, height: 32, backgroundColor: '#e5e7eb' }} />
        
        <ToolBtn active={activeTool === 'SPARK'} onClick={() => { setActiveTool('SPARK'); setFireLineStart(null); }} icon={<Zap size={20} />} label="Spark" />
        <ToolBtn onClick={() => { 
          const newGrid = generate3DGrid(GRID_WIDTH, GRID_HEIGHT);
          setCells(newGrid);
          engineRef.current = null;
          setTime(0); 
          setIsPlaying(false);
          setFireLineStart(null);
        }} icon={<RotateCcw size={20} />} label="Reload" />
        
        {/* Play/Pause Toggle */}
        <button 
          onClick={() => setIsPlaying(!isPlaying)} 
          style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: isPlaying ? '#ef4444' : '#2563eb', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 4 }} />}
        </button>

        <ToolBtn active={activeTool === 'FIRELINE'} onClick={() => { setActiveTool('FIRELINE'); setFireLineStart(null); }} icon={<Hammer size={20} />} label="Fire Line" />
        <ToolBtn active={activeTool === 'HELITACK'} onClick={() => { setActiveTool('HELITACK'); setFireLineStart(null); }} icon={<PlaneIcon size={20} />} label="Helitack" />

        <div style={{ width: 1, height: 32, backgroundColor: '#e5e7eb' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>INTENSITY</span>
            <span style={{ color: '#ef4444' }}>{burnPercentage.toFixed(1)}% BURNED</span>
          </div>
          <div style={{ width: 100, height: 8, backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, burnPercentage)}%`, height: '100%', background: 'linear-gradient(to right, #ffeb3b, #f44336)', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px' }}><span>LOW</span><span>HIGH</span></div>
        </div>
      </footer>

      {/* Exit Button */}
      <button onClick={onBack} style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'white', border: 'none', padding: '10px 20px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <ChevronLeft size={16} /> Exit
      </button>
    </div>
  );
};

const ToolBtn = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: active ? '#2563eb' : '#4b5563', transition: 'all 0.2s' }}
  >
    <div style={{ padding: '8px', borderRadius: '12px', backgroundColor: active ? '#dbeafe' : 'transparent' }}>{icon}</div>
    <span style={{ fontSize: '10px', fontWeight: active ? 'bold' : 'normal' }}>{label}</span>
  </button>
);

function getVegLabel(v?: Vegetation) {
  switch (v) {
    case Vegetation.Forest: return 'Forest';
    case Vegetation.Shrub: return 'Shrub';
    case Vegetation.Grass: return 'Grass';
    default: return '';
  }
}

function getDroughtLabel(d?: DroughtLevel) {
  switch (d) {
    case DroughtLevel.SevereDrought: return 'Severe';
    case DroughtLevel.MediumDrought: return 'Medium';
    case DroughtLevel.MildDrought: return 'Mild';
    case DroughtLevel.NoDrought: return 'None';
    default: return '';
  }
}
