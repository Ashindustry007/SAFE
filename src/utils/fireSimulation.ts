export type CellState = 'unburned' | 'burning' | 'burntOut' | 'survived' | 'water';

export interface FireCell {
  x: number;
  y: number;
  lat: number;
  lng: number;
  state: CellState;
  elevation: number; // in feet
  burnTimeElapsed: number; // in minutes
  fuel: number; // 0.0 (Water/Rock) to 1.0 (Dense Forest)
}

export interface SimulationIntel {
  windSpeed: number; // mph
  windDirection: number; // degrees
  droughtIndex: number; // 0 - 100
  vegetationType: string;
}

export interface SimulationParams {
  cellSizeFt: number;
  dt: number; // minutes per tick
  baseRate: number;
  slopeK: number;
  windScaleFactor: number;
  minCellBurnTime: number;
}

export const DEFAULT_PARAMS: SimulationParams = {
  cellSizeFt: 500,
  dt: 5, // Small time step for realistic probability curves
  baseRate: 0.015, // Tuned so wind/slope heavily influence spread
  slopeK: 4,
  windScaleFactor: 0.2,
  minCellBurnTime: 120,
};

export class FireSimulation {
  grid: Map<string, FireCell> = new Map();
  activeFires: Set<string> = new Set();
  missingChunksQueue: Set<string> = new Set(); // Stores specific cell keys that are missing
  
  params: SimulationParams;
  intel: SimulationIntel;

  constructor(
    initialGrid: FireCell[], 
    intel: SimulationIntel,
    params: SimulationParams = DEFAULT_PARAMS
  ) {
    this.intel = intel;
    this.params = params;
    
    for (const cell of initialGrid) {
      const key = `${cell.x},${cell.y}`;
      this.grid.set(key, cell);
      if (cell.state === 'burning') {
        this.activeFires.add(key);
      }
    }
  }

  public addCells(cells: FireCell[]) {
    for (const cell of cells) {
      const key = `${cell.x},${cell.y}`;
      if (!this.grid.has(key)) {
        this.grid.set(key, cell);
      }
      this.missingChunksQueue.delete(key);
    }
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

    // The key optimization: multiply by neighbor's fuel density. 
    // If neighbor.fuel is 0 (Water/Rock), P becomes 0 and fire STOPS.
    const P = F_wind * F_slope * F_vegetation * F_drought * neighbor.fuel * this.params.baseRate * this.params.dt;
    return Math.min(Math.max(P, 0), 1);
  }

  public tick(): void {
    const nextStates: {x: number, y: number, state: CellState}[] = [];
    const newlyExtinguishedKeys: string[] = [];

    for (const key of this.activeFires) {
      const cell = this.grid.get(key);
      if (!cell || cell.state !== 'burning') {
        newlyExtinguishedKeys.push(key);
        continue;
      }

      // Phase 2: Age
      cell.burnTimeElapsed += this.params.dt;
      // Dense fuel burns longer than sparse fuel
      const maxBurnTime = this.params.minCellBurnTime * (0.5 + cell.fuel); 
      if (cell.burnTimeElapsed >= maxBurnTime) {
        // Check survival if forest
        if (this.intel.vegetationType.toLowerCase().includes('forest') && Math.random() < 0.1) {
          cell.state = 'survived';
        } else {
          cell.state = 'burntOut';
        }
        newlyExtinguishedKeys.push(key);
      }

      // Phase 1: Spread
      // Check neighbors in radius 2
      for (let ny = cell.y - 2; ny <= cell.y + 2; ny++) {
        for (let nx = cell.x - 2; nx <= cell.x + 2; nx++) {
          if (nx === cell.x && ny === cell.y) continue;
          
          const nKey = `${nx},${ny}`;
          const neighbor = this.grid.get(nKey);
          
          if (!neighbor) {
            // Missing chunk logic! We don't have this cell. 
            // Queue it up so the frontend fetches it.
            this.missingChunksQueue.add(nKey);
            continue;
          }

          // Fire only spreads to unburned cells with fuel
          if (neighbor.state === 'unburned' && neighbor.fuel > 0) {
            const P = this.calcIgnitionProb(cell, neighbor);
            if (Math.random() < P) {
              nextStates.push({ x: nx, y: ny, state: 'burning' });
            }
          }
        }
      }
    }

    // Apply new ignitions
    for (const ns of nextStates) {
      const nKey = `${ns.x},${ns.y}`;
      const cell = this.grid.get(nKey);
      if (cell && cell.state === 'unburned') {
        cell.state = ns.state;
        if (ns.state === 'burning') {
          this.activeFires.add(nKey);
        }
      }
    }

    // Cleanup active fires
    for (const key of newlyExtinguishedKeys) {
      this.activeFires.delete(key);
    }
  }
}
