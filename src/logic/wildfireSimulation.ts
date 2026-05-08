export enum CellState {
  EMPTY = 0,
  FUEL = 1,
  BURNING = 2,
  BURNT = 3,
}

export interface SimulationParams {
  windSpeed: number;      // 0 to 100
  windDirection: number;  // 0 to 360 degrees (0 is North, 90 is East)
  droughtIndex: number;   // 0 to 1 (normalized)
  vegDensity: number;     // 0 to 1 (normalized)
}

export type Grid = CellState[][];

/**
 * Initializes a grid with fuel based on vegetation density.
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
 * Ignites a target cell. Pure function.
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
 * Advances the simulation by one step. Pure function.
 */
export const stepSimulation = (grid: Grid, params: SimulationParams): Grid => {
  const height = grid.length;
  const width = grid[0].length;
  const newGrid = grid.map(row => [...row]);

  // Pre-calculate wind vector
  const windRad = (params.windDirection - 90) * (Math.PI / 180); // Adjusting so 0 is North
  const windX = Math.cos(windRad);
  const windY = Math.sin(windRad);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const currentState = grid[y][x];

      if (currentState === CellState.BURNING) {
        // Current burning cell becomes burnt in the next step
        newGrid[y][x] = CellState.BURNT;

        // Try to spread to neighbors
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
 * Calculates the probability of fire spreading from a burning cell to a neighbor.
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

  // Wind effect: Dot product of wind vector and spread direction
  const dot = dirX * windX + dirY * windY;
  // windFactor increases probability if wind is blowing in spread direction
  // params.windSpeed scaled to influence probability (max 3x boost)
  const windEffect = 1 + (params.windSpeed / 50) * Math.max(0, dot);

  // Environmental factors
  const envEffect = (1 + params.droughtIndex) * (1 + params.vegDensity);

  // Combine factors
  let probability = P_BASE * windEffect * envEffect;

  // Diagonal spread is naturally slightly slower
  if (dist > 1) probability *= 0.707;

  return Math.min(probability, 1.0);
};
