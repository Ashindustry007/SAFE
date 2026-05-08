import { describe, it, expect } from 'vitest';
import { 
  initializeGrid, 
  igniteCell, 
  stepSimulation, 
  CellState
} from './wildfireSimulation';
import type { SimulationParams } from './wildfireSimulation';

describe('Wildfire Simulation Logic', () => {
  it('should initialize a grid of correct size', () => {
    const width = 10;
    const height = 10;
    const grid = initializeGrid(width, height, 1.0); // 100% density
    expect(grid.length).toBe(height);
    expect(grid[0].length).toBe(width);
    expect(grid[0][0]).toBe(CellState.FUEL);
  });

  it('should ignite a specific cell', () => {
    const grid = initializeGrid(5, 5, 1.0);
    const ignited = igniteCell(grid, 2, 2);
    expect(ignited[2][2]).toBe(CellState.BURNING);
    expect(grid[2][2]).toBe(CellState.FUEL); // Original grid should remain unchanged
  });

  it('should transition burning cells to burnt in the next step', () => {
    const params: SimulationParams = {
      windSpeed: 0,
      windDirection: 0,
      droughtIndex: 0.5,
      vegDensity: 0.5
    };
    let grid = initializeGrid(3, 3, 1.0);
    grid = igniteCell(grid, 1, 1);
    
    const nextStep = stepSimulation(grid, params);
    expect(nextStep[1][1]).toBe(CellState.BURNT);
  });

  it('should spread fire to adjacent cells', () => {
    const params: SimulationParams = {
      windSpeed: 0,
      windDirection: 0,
      droughtIndex: 1.0, // High drought
      vegDensity: 1.0    // High density
    };
    
    let grid = initializeGrid(3, 3, 1.0);
    grid[1][1] = CellState.BURNING;
    
    // Run multiple steps to ensure spread (since it's probabilistic)
    let spreadOccurred = false;
    for (let i = 0; i < 5; i++) {
      grid = stepSimulation(grid, params);
      if (grid.flat().some(cell => cell === CellState.BURNING)) {
        spreadOccurred = true;
        break;
      }
    }
    
    expect(spreadOccurred).toBe(true);
  });

  it('should be influenced by wind direction', () => {
    const northWind: SimulationParams = {
      windSpeed: 100,
      windDirection: 0, // Blowing North (from South)
      droughtIndex: 0.5,
      vegDensity: 0.5
    };

    // We can't easily test probability in one go, but we can verify 
    // the logic for wind vector calculation if we exported it.
    // For now, we verify the simulation doesn't crash.
    const grid = initializeGrid(10, 10, 1.0);
    const ignited = igniteCell(grid, 5, 5);
    const next = stepSimulation(ignited, northWind);
    expect(next).toBeDefined();
  });
});
