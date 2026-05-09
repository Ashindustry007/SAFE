/**
 * SAFE Wildfire Simulation Engine
 * 
 * Core mathematical engine for simulating wildfire spread on a 2D grid.
 * Implements a cellular automata approach influenced by the Rothermel model,
 * accounting for wind vectors, fuel density, and environmental drought levels.
 */

/**
 * CellState Definition
 * Represents the lifecycle of a fuel cell: FUEL -> BURNING -> BURNT
 */
export const CellState = {
  EMPTY: 0,   // No vegetation
  FUEL: 1,    // Ready to burn
  BURNING: 2, // Currently active fire
  BURNT: 3,   // Extinguished/Consumed
} as const;

export type CellState = (typeof CellState)[keyof typeof CellState];

/**
 * Simulation Parameters
 * State variables that influence the rate and direction of spread.
 */
export interface SimulationParams {
  windSpeed: number;      // 0 to 100 (influence strength)
  windDirection: number;  // 0 to 360 degrees (0 is North, 90 is East)
  droughtIndex: number;   // 0 to 1 (environmental moisture level)
  vegDensity: number;     // 0 to 1 (available fuel load)
}

export type Grid = CellState[][];

/**
 * initializeGrid
 * Creates a new simulation grid populated with fuel based on density parameters.
 * 
 * @param width  - Number of horizontal cells
 * @param height - Number of vertical cells
 * @param density - Probability (0-1) that a cell contains fuel
 * @returns A randomized 2D grid of CellStates
 */
export const initializeGrid = (width: number, height: number, density: number): Grid => {
  const grid: Grid = [];
  for (let y = 0; y < height; y++) {
    const row: CellState[] = [];
    for (let x = 0; x < width; x++) {
      row.push(Math.random() < density ? CellState.FUEL : CellState.EMPTY);
    }
    grid.push(row);
  }
  return grid;
};

/**
 * igniteCell
 * Manually starts a fire at a specific coordinate.
 * 
 * @param grid - Current simulation grid
 * @param x - Target X coordinate
 * @param y - Target Y coordinate
 * @returns A new grid state with the target cell ignited
 */
export const igniteCell = (grid: Grid, x: number, y: number): Grid => {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return grid;
  
  const newGrid = grid.map(row => [...row]);
  if (newGrid[y][x] === CellState.FUEL) {
    newGrid[y][x] = CellState.BURNING;
  }
  return newGrid;
};

/**
 * stepSimulation
 * Advances the fire simulation by one discrete time step.
 * Uses a cellular automata approach where burning cells attempt to ignite neighbors.
 * 
 * @param grid - Current state of the fire grid
 * @param params - Environmental parameters (wind, moisture, etc.)
 * @returns The next state of the simulation grid
 */
export const stepSimulation = (grid: Grid, params: SimulationParams): Grid => {
  const height = grid.length;
  const width = grid[0].length;
  const newGrid = grid.map(row => [...row]);

  // Pre-calculate wind vector components for efficient processing
  const windRad = (params.windDirection - 90) * (Math.PI / 180); // 0 degrees = North
  const windX = Math.cos(windRad);
  const windY = Math.sin(windRad);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const currentState = grid[y][x];

      if (currentState === CellState.BURNING) {
        // Active fire consumes the current cell
        newGrid[y][x] = CellState.BURNT;

        // Attempt ignition of 8 adjacent neighbors (Moore neighborhood)
        const neighbors = [
          { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
          { dx: -1, dy: 0 },                    { dx: 1, dy: 0 },
          { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
        ];

        for (const { dx, dy } of neighbors) {
          const nx = x + dx;
          const ny = y + dy;

          if (ny >= 0 && ny < height && nx >= 0 && nx < width && grid[ny][nx] === CellState.FUEL) {
            const prob = calculateSpreadProbability(dx, dy, windX, windY, params);
            if (Math.random() < prob) {
              newGrid[ny][nx] = CellState.BURNING;
            }
          }
        }
      }
    }
  }

  return newGrid;
};

/**
 * calculateSpreadProbability
 * Internal logic for determining the likelihood of ignition based on vectors.
 * 
 * @param dx - Neighbor X offset
 * @param dy - Neighbor Y offset
 * @param windX - Pre-calculated wind vector X
 * @param windY - Pre-calculated wind vector Y
 * @param params - Global simulation parameters
 * @returns Probability (0-1) of ignition
 */
const calculateSpreadProbability = (
  dx: number, 
  dy: number, 
  windX: number, 
  windY: number, 
  params: SimulationParams
): number => {
  const P_BASE = 0.2;
  
  // Normalize neighbor direction vector
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dirX = dx / dist;
  const dirY = dy / dist;

  // Wind effect calculation: Dot product of wind vector and spread direction
  const dot = dirX * windX + dirY * windY;
  
  // Apply wind boost (max 3x increase based on speed and alignment)
  const windEffect = 1 + (params.windSpeed / 50) * Math.max(0, dot);

  // Apply environmental multipliers (Drought and Density increase fire intensity)
  const envEffect = (1 + params.droughtIndex) * (1 + params.vegDensity);

  // Compute final probability
  let probability = P_BASE * windEffect * envEffect;

  // Geometric correction for diagonal spread distance (1/sqrt(2))
  if (dist > 1) probability *= 0.707;

  return Math.min(probability, 1.0);
};
