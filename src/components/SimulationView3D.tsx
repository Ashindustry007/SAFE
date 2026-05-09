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
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  Zap,
  Droplets,
  Hammer,
  Plane,
  Settings,
  Lock,
  Maximize2
} from 'lucide-react';
import { Terrain3D } from './Terrain3D';
import { 
  FireState
} from '../logic/wildfireTypes';
import type { IWindProps, Cell } from '../logic/wildfireTypes';
import { stepSimulation } from '../logic/wildfireEngineAdapted';
import { generate3DGrid } from '../logic/wildfire3D';

// Global Simulation Constants
const GRID_SIZE = 60;
const CELL_SIZE_FT = 100;

interface Simulation3DProps {
  onBack: () => void;
}

/**
 * Tool Type Definitions
 * Represents the current interactive mode of the simulation.
 */
type Tool = 'SPARK' | 'FIRELINE' | 'HELITACK' | 'NONE';

export const SimulationView3D: React.FC<Simulation3DProps> = ({ onBack }) => {
  // --- STATE MANAGEMENT ---
  const [cells, setCells] = useState<Cell[]>(() => generate3DGrid(GRID_SIZE, GRID_SIZE));
  const [wind] = useState<IWindProps>({ speed: 0, direction: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [activeTool, setActiveTool] = useState<Tool>('NONE');

  const timerRef = useRef<number | null>(null);

  /**
   * Simulation Loop Effect
   * Executes the physics-based step function at a fixed interval.
   * Updates the global cell state array and advances the simulation clock.
   */
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setTime(prev => prev + 1);
        setCells(prev => stepSimulation(prev, GRID_SIZE, GRID_SIZE, wind, CELL_SIZE_FT, time));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, wind, time]);

  /**
   * handleCellInteraction
   * Processes user clicks on the 3D terrain based on the currently selected tool.
   * 
   * @param x - Cell X coordinate
   * @param y - Cell Y coordinate
   */
  const handleCellInteraction = (x: number, y: number) => {
    const idx = y * GRID_SIZE + x;
    if (idx < 0 || idx >= cells.length) return;

    const nextCells = [...cells];
    const cell = nextCells[idx];

    // Tool logic branch
    if (activeTool === 'SPARK') {
      cell.fireState = FireState.Burning;
      cell.ignitionTime = time;
    } else if (activeTool === 'FIRELINE') {
      cell.isFireLine = true;
    } else if (activeTool === 'HELITACK') {
      cell.helitackDropCount += 1;
    }
    
    setCells(nextCells);
  };

  /**
   * formatTime
   * Converts discrete simulation steps into human-readable duration (days/hours).
   */
  const formatTime = (t: number) => {
    const days = Math.floor(t / 1440);
    const hours = Math.floor((t % 1440) / 60);
    return `${days} days and ${hours} hours`;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#e5e7eb', position: 'relative', overflow: 'hidden', color: '#1f2937' }}>
      {/* 3D SCENE CONTAINER */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, -50, 70]} fov={45} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[50, 50, 50]} intensity={1} castShadow />
        <pointLight position={[0, 0, 20]} intensity={0.5} />
        
        {/* Procedural 3D Terrain */}
        <Terrain3D 
          cells={cells} 
          width={GRID_SIZE} 
          height={GRID_SIZE} 
          onCellClick={handleCellInteraction} 
        />

        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          maxPolarAngle={Math.PI / 2.2} 
          minDistance={20} 
          maxDistance={200} 
        />
      </Canvas>

      {/* TOP HUD: ZONE INDICATORS */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '20px' }}>
         <ZoneTab label="Zone 1" sub="Mountains" icon={<Droplets size={14} />} />
         <ZoneTab label="Zone 2" sub="Foothills" icon={<Droplets size={14} />} />
         <ZoneTab label="Zone 3" sub="Plains" icon={<Droplets size={14} />} />
      </div>

      {/* LEFT HUD: SIMULATION CLOCK & WIND VECTORS */}
      <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="glass-panel-light" style={{ padding: '12px 20px', borderRadius: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{formatTime(time)}</div>
        </div>
        <div className="glass-panel-light" style={{ padding: '12px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
          <div style={{ fontSize: '10px', marginBottom: '8px', textAlign: 'center' }}>Wind Meter</div>
          <div style={{ width: 60, height: 60, borderRadius: '50%', border: '1px solid #9ca3af', position: 'relative', margin: '0 auto' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: 2, height: 24, backgroundColor: '#ef4444', transformOrigin: 'bottom center', transform: `translate(-50%, -100%) rotate(${wind.direction}deg)` }} />
            <div style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', fontSize: '10px' }}>N</div>
          </div>
          <div style={{ fontSize: '10px', marginTop: '8px', textAlign: 'center' }}>{wind.speed} MPH from {wind.direction}°</div>
        </div>
      </div>

      {/* RIGHT HUD: NAVIGATION CONTROLS */}
      <button onClick={onBack} style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'white', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <ChevronLeft size={16} /> Exit
      </button>

      {/* BOTTOM CONTROL BAR: INTERACTION TOOLS */}
      <footer style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, backgroundColor: 'white', borderTop: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '0 24px' }}>
        <button className="tool-btn-light" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <Settings size={20} /> <span style={{ fontSize: '10px' }}>Terrain Setup</span>
        </button>
        <div style={{ width: 1, height: 40, backgroundColor: '#e5e7eb' }} />
        
        <ToolButton active={activeTool === 'SPARK'} onClick={() => setActiveTool('SPARK')} icon={<Zap size={20} />} label="Spark" />
        <ToolButton onClick={() => { setCells(generate3DGrid(GRID_SIZE, GRID_SIZE)); setTime(0); }} icon={<RotateCcw size={20} />} label="Reload" />
        <ToolButton onClick={() => setTime(0)} icon={<Maximize2 size={20} />} label="Restart" />
        
        {/* Play/Pause Toggle */}
        <button 
          onClick={() => setIsPlaying(!isPlaying)} 
          style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 3 }} />}
        </button>

        <ToolButton active={activeTool === 'FIRELINE'} onClick={() => setActiveTool('FIRELINE')} icon={<Hammer size={20} />} label="Fire Line" />
        <ToolButton active={activeTool === 'HELITACK'} onClick={() => setActiveTool('HELITACK')} icon={<Plane size={20} />} label="Helitack" />
        
        <div style={{ width: 1, height: 40, backgroundColor: '#e5e7eb' }} />
        
        {/* Legend / Intensity Scale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
           <div style={{ fontSize: '10px', color: '#6b7280' }}>Fire Intensity Scale</div>
           <div style={{ width: 120, height: 8, background: 'linear-gradient(to right, #ffeb3b, #ff9800, #f44336)', borderRadius: '4px' }} />
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px' }}><span>Low</span><span>High</span></div>
        </div>
      </footer>
    </div>
  );
};

/**
 * ZoneTab Sub-component
 * Displays regional data (Vegetation, Elevation) in the top HUD.
 */
const ZoneTab = ({ label, sub, icon }: any) => (
  <div style={{ backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '10px', minWidth: 140 }}>
    <div style={{ padding: '6px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '10px', color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{sub}</div>
    </div>
    <Lock size={12} color="#9ca3af" />
  </div>
);

/**
 * ToolButton Sub-component
 * Unified button for interaction tools (Spark, Fireline, etc.)
 */
const ToolButton = ({ icon, label, onClick, active }: any) => (
  <button 
    onClick={onClick}
    style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer',
      color: active ? '#2563eb' : '#4b5563',
      transform: active ? 'scale(1.1)' : 'scale(1)',
      transition: 'all 0.2s'
    }}
  >
    <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: active ? '#dbeafe' : 'transparent' }}>{icon}</div>
    <span style={{ fontSize: '10px', fontWeight: active ? 'bold' : 'normal' }}>{label}</span>
  </button>
);
