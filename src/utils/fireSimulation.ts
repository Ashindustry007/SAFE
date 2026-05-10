/**
 * SAFE (Simulated Analysis of Fire Ecology) - Core Simulation Logic
 * 
 * Implements the mathematical and physical transition rules for wildfire 
 * propagation across a discrete georeferenced grid. The engine uses a 
 * probabilistic cellular automata model influenced by topographic slope, 
 * wind vectors, fuel density, and regional drought levels.
 */

/**
 * CellState
 * unburned: Initial state with available fuel
 * burning: Actively consuming fuel and radiating heat to neighbors
 * burntOut: Fuel exhausted, non-burnable
 * survived: High-resistance vegetation that remained intact
 * water: Non-burnable natural barrier
 */
export type CellState = 'unburned' | 'burning' | 'burntOut' | 'survived' | 'water';

/**
 * FireCell
 * Represents the primary unit of the simulation grid.
 */
export interface FireCell {
  x: number;               // Local grid X coordinate
  y: number;               // Local grid Y coordinate
  lat: number;             // Geographic latitude
  lng: number;             // Geographic longitude
  state: CellState;        // Current combustion state
  elevation: number;       // Elevation in feet (influences F_slope)
  burnTimeElapsed: number; // Time spent in 'burning' state (minutes)
  fuel: number;            // Fuel density [0.0 to 1.0]
}

/**
 * SimulationIntel
 * Regional environmental parameters sourced from the Intelligence dashboard.
 */
export interface SimulationIntel {
  windSpeed: number;       // Velocity in mph
  windDirection: number;   // Heading in degrees
  droughtIndex: number;    // Moisture deficit [0-100]
  vegetationType: string;  // Regional fuel classification
}

/**
 * SimulationParams
 * Calibration constants for the spread mathematical model.
 */
export interface SimulationParams {
  cellSizeFt: number;      // Dimensions of a single cell
  dt: number;              // Simulation time step (minutes per tick)
  baseRate: number;        // Baseline ignition probability
  slopeK: number;          // Topographic influence multiplier
  windScaleFactor: number; // Wind intensity multiplier
  minCellBurnTime: number; // Minimum duration for fuel consumption
}

/**
 * Default Calibration Parameters
 * Tuned for realistic wildfire behavior at the 500ft cell scale.
 */
export const DEFAULT_PARAMS: SimulationParams = {
  cellSizeFt: 500,
  dt: 5, 
  baseRate: 0.015, 
  slopeK: 4,
  windScaleFactor: 0.2,
  minCellBurnTime: 120,
};

/**
 * FireSimulation Class
 * The "brain" of the wildfire spread model.
 */
export class FireSimulation {
  grid: Map<string, FireCell> = new Map();     // Global cell registry
  activeFires: Set<string> = new Set();        // Optimized set of burning cell keys
  missingChunksQueue: Set<string> = new Set(); // Queue for lazy-loading unknown terrain
  
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

  /**
   * addCells
   * Dynamically merges newly fetched terrain chunks into the active simulation grid.
   */
  public addCells(cells: FireCell[]) {
    for (const cell of cells) {
      const key = `${cell.x},${cell.y}`;
      if (!this.grid.has(key)) {
        this.grid.set(key, cell);
      }
      this.missingChunksQueue.delete(key);
    }
  }

  /**
   * getDroughtFactor
   * Maps regional drought index to a physical spread multiplier.
   */
  private getDroughtFactor(): number {
    const d = this.intel.droughtIndex;
    if (d < 25) return 0.2;
    if (d < 50) return 0.4;
    if (d < 75) return 0.7;
    return 1.0;
  }

  /**
   * getVegetationFactor
   * Adjusts spread velocity based on the primary fuel classification.
   */
  private getVegetationFactor(): number {
    const v = this.intel.vegetationType.toLowerCase();
    if (v.includes('forest')) return 0.3; // Dense forest spreads slower but burns longer
    if (v.includes('shrub')) return 0.6;
    return 1.0; // Grasslands offer high spread velocity
  }

  /**
   * angleToVector
   * Translates compass heading (degrees) to a normalized Cartesian direction vector.
   */
  private angleToVector(deg: number): { x: number, y: number } {
    const rad = (deg - 90) * (Math.PI / 180); 
    return { x: Math.cos(rad), y: Math.sin(rad) };
  }

  /**
   * calcIgnitionProb
   * Computes the probability of fire spreading from a 'source' to a 'neighbor' cell.
   * Based on the Rothermel model adaptation: P = f(wind, slope, fuel, moisture).
   */
  private calcIgnitionProb(source: FireCell, neighbor: FireCell): number {
    const dx = neighbor.x - source.x;
    const dy = neighbor.y - source.y;
    const distCells = Math.sqrt(dx * dx + dy * dy);
    
    // Spread range limit (Radius of 2.5 cells)
    if (distCells > 2.5) return 0;
    
    const distFt = distCells * this.params.cellSizeFt;
    if (distFt === 0) return 0;

    // F_slope: Heat transfer is more efficient when traveling upslope
    const elevDiff = neighbor.elevation - source.elevation;
    const F_slope = Math.max(0, 1 + (elevDiff / distFt) * this.params.slopeK);

    // F_wind: Wind direction alignment multiplier
    const spreadVecX = dx / distCells;
    const spreadVecY = dy / distCells;
    const windVec = this.angleToVector(this.intel.windDirection);
    const dotProduct = windVec.x * spreadVecX + windVec.y * spreadVecY;
    const F_wind = Math.max(0, 1 + (this.intel.windSpeed * this.params.windScaleFactor) * dotProduct);

    // Environmental Scaling
    const F_vegetation = this.getVegetationFactor();
    const F_drought = this.getDroughtFactor();

    // Final Probability Calculation
    const P = F_wind * F_slope * F_vegetation * F_drought * neighbor.fuel * this.params.baseRate * this.params.dt;
    return Math.min(Math.max(P, 0), 1);
  }

  /**
   * tick
   * Advances the simulation by one discrete time step (dt).
   * Orchestrates the two-phase cycle: Combustion Aging and Neighbor Ignition.
   */
  public tick(): void {
    const nextStates: {x: number, y: number, state: CellState}[] = [];
    const newlyExtinguishedKeys: string[] = [];

    // Iterate through actively burning cells
    for (const key of this.activeFires) {
      const cell = this.grid.get(key);
      if (!cell || cell.state !== 'burning') {
        newlyExtinguishedKeys.push(key);
        continue;
      }

      // --- PHASE 1: COMBUSTION AGING ---
      cell.burnTimeElapsed += this.params.dt;
      
      // Burn duration scales with fuel density (heavier fuels burn longer)
      const maxBurnTime = this.params.minCellBurnTime * (0.5 + cell.fuel); 
      if (cell.burnTimeElapsed >= maxBurnTime) {
        // Stochastic survival logic for forest ecosystems
        if (this.intel.vegetationType.toLowerCase().includes('forest') && Math.random() < 0.1) {
          cell.state = 'survived';
        } else {
          cell.state = 'burntOut';
        }
        newlyExtinguishedKeys.push(key);
      }

      // --- PHASE 2: NEIGHBORHOOD SPREAD ---
      for (let ny = cell.y - 2; ny <= cell.y + 2; ny++) {
        for (let nx = cell.x - 2; nx <= cell.x + 2; nx++) {
          if (nx === cell.x && ny === cell.y) continue;
          
          const nKey = `${nx},${ny}`;
          const neighbor = this.grid.get(nKey);
          
          if (!neighbor) {
            // Edge of known world detected - trigger lazy load
            this.missingChunksQueue.add(nKey);
            continue;
          }

          // Spread to unburned cells with available fuel
          if (neighbor.state === 'unburned' && neighbor.fuel > 0) {
            const P = this.calcIgnitionProb(cell, neighbor);
            if (Math.random() < P) {
              nextStates.push({ x: nx, y: ny, state: 'burning' });
            }
          }
        }
      }
    }

    // Apply state transitions atomically to maintain simulation integrity
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

    // Teardown extinguished fire keys
    for (const key of newlyExtinguishedKeys) {
      this.activeFires.delete(key);
    }
  }
}
