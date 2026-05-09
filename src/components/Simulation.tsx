/**
 * SAFE Wildfire Spread Simulator (2D)
 * 
 * A high-performance 2D visualization of the cellular automata fire engine.
 * Allows users to interactively ignite fuel, control wind/moisture vectors,
 * and analyze fire behavior statistics in a controlled environment.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  Wind, 
  Droplets, 
  Trees, 
  Settings2
} from 'lucide-react';
import { 
  initializeGrid, 
  stepSimulation, 
  igniteCell, 
  CellState
} from '../logic/wildfireSimulation';
import type { Grid, SimulationParams } from '../logic/wildfireSimulation';

interface SimulationProps {
  onBack: () => void;
}

export const SimulationView: React.FC<SimulationProps> = () => {
  // --- STATE MANAGEMENT ---
  const [grid, setGrid] = useState<Grid>(() => initializeGrid(100, 100, 0.6));
  const [params, setParams] = useState<SimulationParams>({
    windSpeed: 20,
    windDirection: 45,
    droughtIndex: 0.5,
    vegDensity: 0.6
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * handleReset
   * Re-initializes the simulation grid with the current vegetation density.
   */
  const handleReset = useCallback(() => {
    setGrid(initializeGrid(100, 100, params.vegDensity));
    setIsPlaying(false);
  }, [params.vegDensity]);

  /**
   * handleStep
   * Advances the simulation by exactly one time step.
   */
  const handleStep = useCallback(() => {
    setGrid(prev => stepSimulation(prev, params));
  }, [params]);

  /**
   * Animation Loop Effect
   * Manages the execution of simulation steps when 'isPlaying' is active.
   */
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(handleStep, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, handleStep]);

  /**
   * Canvas Rendering Effect
   * Provides a WebGL-style high-performance 2D render of the simulation grid.
   * Uses color mapping to represent fuel, active fire, and charred remains.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / grid[0].length;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        const state = grid[y][x];
        if (state === CellState.EMPTY) continue;

        switch (state) {
          case CellState.FUEL:
            ctx.fillStyle = `rgba(16, 185, 129, ${0.3 + params.vegDensity * 0.5})`; 
            break;
          case CellState.BURNING:
            ctx.fillStyle = '#ef4444'; 
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ef4444';
            break;
          case CellState.BURNT:
            ctx.fillStyle = '#1e293b'; 
            ctx.shadowBlur = 0;
            break;
        }
        ctx.fillRect(x * cellSize, y * cellSize, cellSize - 0.5, cellSize - 0.5);
      }
    }
  }, [grid, params.vegDensity]);

  /**
   * handleCanvasClick
   * Allows user-driven ignition of specific fuel cells on the grid.
   */
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * grid[0].length);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * grid.length);
    setGrid(prev => igniteCell(prev, x, y));
  };

  return (
    <div className="main-content">
      {/* RENDER PANEL */}
      <section className="map-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' }}>
        <div style={{ position: 'relative', width: '90%', height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <canvas 
            ref={canvasRef}
            width={800}
            height={800}
            onClick={handleCanvasClick}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              cursor: 'crosshair',
              borderRadius: '8px',
              border: '2px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 0 40px rgba(0, 0, 0, 0.5)'
            }}
          />
          <div style={{ position: 'absolute', bottom: '24px', left: '24px', pointerEvents: 'none' }}>
            <div className="glass-panel" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              CLICK TO IGNITE FUEL
            </div>
          </div>
        </div>
      </section>

      {/* CONTROL DASHBOARD */}
      <section className="intel-panel custom-scrollbar">
        <header style={{ padding: '32px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
             <Settings2 className="text-amber" size={20} />
             <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Spread <span className="text-amber">Simulator</span></h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Configure environmental variables to model fire behavior.</p>
        </header>

        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* PARAMETER SLIDERS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Slider 
              icon={<Wind size={18} />}
              label="Wind Speed"
              value={params.windSpeed}
              min={0}
              max={100}
              unit="km/h"
              onChange={(v: number) => setParams(p => ({ ...p, windSpeed: v }))}
            />
            <Slider 
              icon={<RotateCcw size={18} />}
              label="Wind Direction"
              value={params.windDirection}
              min={0}
              max={360}
              unit="°"
              onChange={(v: number) => setParams(p => ({ ...p, windDirection: v }))}
            />
            <Slider 
              icon={<Droplets size={18} />}
              label="Drought Index"
              value={params.droughtIndex}
              min={0}
              max={1}
              step={0.01}
              unit=""
              onChange={(v: number) => setParams(p => ({ ...p, droughtIndex: v }))}
            />
            <Slider 
              icon={<Trees size={18} />}
              label="Veg Density"
              value={params.vegDensity}
              min={0.1}
              max={1}
              step={0.01}
              unit=""
              onChange={(v: number) => setParams(p => ({ ...p, vegDensity: v }))}
            />
          </div>

          {/* SIMULATION STATE CONTROLS */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-primary" 
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <><Pause size={18} /> PAUSE</> : <><Play size={18} /> START</>}
            </button>
            <button 
              className="glass-panel" 
              title="Step Forward"
              style={{ padding: '8px 16px', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
              onClick={handleStep}
            >
              <StepForward size={20} />
            </button>
            <button 
              className="glass-panel" 
              title="Reset Grid"
              style={{ padding: '8px 16px', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
              onClick={handleReset}
            >
              <RotateCcw size={20} />
            </button>
          </div>

          {/* REAL-TIME ANALYTICS */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px' }}>Simulation Stats</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Burn Area</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{grid.flat().filter(c => c === CellState.BURNT).length} ha</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Active Fronts</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-red)' }}>{grid.flat().filter(c => c === CellState.BURNING).length}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

/**
 * Slider Sub-component
 * Custom-styled range input for environmental parameter control.
 */
const Slider = ({ icon, label, value, min, max, step = 1, unit, onChange }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
        {icon}
        <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{value}{unit}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ 
        width: '100%', 
        accentColor: 'var(--accent-amber)',
        height: '4px',
        borderRadius: '2px',
        cursor: 'pointer'
      }}
    />
  </div>
);
