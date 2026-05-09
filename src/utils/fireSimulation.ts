export type CellState = 'unburned' | 'burning' | 'burntOut' | 'survived' | 'water';

export interface FireCell {
  x: number;
  y: number;
  lat: number;
  lng: number;
  state: CellState;
  elevation: number; // in feet
  burnTimeElapsed: number; // in minutes
}

export interface SimulationIntel {
  windSpeed: number; // mph
  windDirection: number; // degrees
  droughtIndex: number; // 0 - 100
  vegetationType: string;
}

export interface SimulationParams {
  gridWidth: number;
  gridHeight: number;
  cellSizeFt: number;
  dt: number; // minutes per tick
  baseRate: number;
  slopeK: number;
  windScaleFactor: number;
  minCellBurnTime: number;
}

export const DEFAULT_PARAMS: SimulationParams = {
  gridWidth: 21,
  gridHeight: 21,
  cellSizeFt: 500,
  dt: 5, // Small time step for realistic probability curves
  baseRate: 0.015, // Tuned so wind/slope heavily influence spread
  slopeK: 4,
  windScaleFactor: 0.2,
  minCellBurnTime: 120,
};

export class FireSimulation {
  grid: FireCell[][] = [];
  params: SimulationParams;
  intel: SimulationIntel;

  constructor(
    initialGrid: FireCell[][], 
    intel: SimulationIntel,
    params: SimulationParams = DEFAULT_PARAMS
  ) {
    this.grid = initialGrid;
    this.intel = intel;
    this.params = params;
  }

  // Map 0-100 drought index to 0-3 equivalent for F_drought
  private getDroughtFactor(): number {
    const d = this.intel.droughtIndex;
    if (d < 25) return 0.2;
    if (d < 50) return 0.4;
    if (d < 75) return 0.7;
    return 1.0;
  }

  private getVegetationFactor(): number {
    const v = this.intel.vegetationType.toLowerCase();
    if (v.includes('forest')) return 0.3;
    if (v.includes('shrub')) return 0.6;
    return 1.0; // Grassland, Savanna, etc.
  }

  // Helper to convert angle to vector
  private angleToVector(deg: number): { x: number, y: number } {
    const rad = (deg - 90) * (Math.PI / 180); // 0 degrees is North -> (0, -1)
    return { x: Math.cos(rad), y: Math.sin(rad) };
  }

  // Calculate ignition probability
  private calcIgnitionProb(source: FireCell, neighbor: FireCell): number {
    const dx = neighbor.x - source.x;
    const dy = neighbor.y - source.y;
    const distCells = Math.sqrt(dx * dx + dy * dy);
    
    // Neighbors distance <= 2.5
    if (distCells > 2.5) return 0;
    
    const distFt = distCells * this.params.cellSizeFt;
    if (distFt === 0) return 0;

    // F_slope
    const elevDiff = neighbor.elevation - source.elevation;
    const F_slope = Math.max(0, 1 + (elevDiff / distFt) * this.params.slopeK);

    // F_wind
    // Spread vector normalized
    const spreadVecX = dx / distCells;
    const spreadVecY = dy / distCells;
    const windVec = this.angleToVector(this.intel.windDirection);
    const dotProduct = windVec.x * spreadVecX + windVec.y * spreadVecY;
    const F_wind = Math.max(0, 1 + (this.intel.windSpeed * this.params.windScaleFactor) * dotProduct);

    // F_vegetation & F_drought (using global intel for now)
    const F_vegetation = this.getVegetationFactor();
    const F_drought = this.getDroughtFactor();

    const P = F_wind * F_slope * F_vegetation * F_drought * this.params.baseRate * this.params.dt;
    return Math.min(Math.max(P, 0), 1);
  }

  public tick(): void {
    const newGrid: FireCell[][] = [];
    const height = this.params.gridHeight;
    const width = this.params.gridWidth;

    // Deep copy grid
    for (let y = 0; y < height; y++) {
      newGrid[y] = [];
      for (let x = 0; x < width; x++) {
        newGrid[y][x] = { ...this.grid[y][x] };
      }
    }

    const nextStates: {x: number, y: number, state: CellState}[] = [];

    // Phase 1 & 2 combined logic
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = this.grid[y][x];

        if (cell.state === 'burning') {
          // Phase 2: Age
          newGrid[y][x].burnTimeElapsed += this.params.dt;
          if (newGrid[y][x].burnTimeElapsed >= this.params.minCellBurnTime) {
            // Check survival if forest
            if (this.intel.vegetationType.toLowerCase().includes('forest') && Math.random() < 0.1) {
              newGrid[y][x].state = 'survived';
            } else {
              newGrid[y][x].state = 'burntOut';
            }
          }

          // Phase 1: Spread
          // Check neighbors in radius 2.5
          for (let ny = Math.max(0, y - 2); ny <= Math.min(height - 1, y + 2); ny++) {
            for (let nx = Math.max(0, x - 2); nx <= Math.min(width - 1, x + 2); nx++) {
              if (nx === x && ny === y) continue;
              const neighbor = this.grid[ny][nx];
              if (neighbor.state === 'unburned') {
                const P = this.calcIgnitionProb(cell, neighbor);
                if (Math.random() < P) {
                  // Mark to ignite
                  nextStates.push({ x: nx, y: ny, state: 'burning' });
                }
              }
            }
          }
        }
      }
    }

    // Apply new ignitions
    for (const ns of nextStates) {
      if (newGrid[ns.y][ns.x].state === 'unburned') {
        newGrid[ns.y][ns.x].state = ns.state;
      }
    }

    this.grid = newGrid;
  }
}
