/**
 * SAFE Concord Engine - Fire Engine Core
 * 
 * The primary simulation controller for the Concord architecture. 
 * Manages the time-stepping logic, fire propagation across the grid, 
 * and environmental state transitions.
 */

import { Vector2 } from "three";
import { BurnIndex, Cell, FireState } from "../cell";
import { getFireSpreadRate } from "./get-fire-spread-rate";
import type { IWindProps } from "../types";
import { dist, withinDist, getGridIndexForLocation, forEachPointBetween, directNeighbours, } from "../utils/grid-utils";

const modelDay = 1440; // Total minutes in a model day

/**
 * Probability of a low-intensity fire extinguishing naturally over time.
 * Key represents the day of the simulation.
 */
const endOfLowIntensityFireProbability: {[key: number]: number} = {
  0: 0.0,
  1: 0.6,
  2: 0.6,
  3: 0.7,
  4: 0.8,
  5: 1.0
};

/**
 * nonburnableCellBetween
 * Uses Bresenham's algorithm to check if any non-burnable cells (rivers, fire lines) 
 * exist between two points on the grid.
 */
export const nonburnableCellBetween = (
  cells: Cell[], width: number, x0: number, y0: number, x1: number, y1: number, burnIndex: BurnIndex
) => {
  let result = false;
  forEachPointBetween(x0, y0, x1, y1, (x: number, y: number) => {
    const idx = getGridIndexForLocation(x, y, width);
    if (!cells[idx].isBurnableForBI(burnIndex)) {
      result = true;
    }
  });
  return result;
};

/**
 * getGridCellNeighbors
 * Returns an array of indices of all cells neighboring `i`.
 * Each cell within `neighborsDist` is considered to be a neighbour if there's no 
 * river or fire line between this cell and cell `i`.
 */
export const getGridCellNeighbors = (
  cells: Cell[], i: number, width: number, height: number, neighborsDist: number, burnIndex: BurnIndex
) => {
  const neighbours: number[] = [];
  const queue: number[] = [];
  const processed: {[key: number]: boolean}  = {};
  const x0 = i % width;
  const y0 = Math.floor(i / width);
  
  // Performance optimization: only run line-of-sight check if nonburnable cells exist in the area.
  let anyNonburnableCells = false;
  
  // Breadth-First Search (BFS) to find reachable neighbors
  queue.push(i);
  processed[i] = true;
  while (queue.length > 0) {
    const j = queue.shift() as number;
    const x1 = j % width;
    const y1 = Math.floor(j / width);
    directNeighbours.forEach(diff => {
      const nIdx = getGridIndexForLocation(x1 + diff.x, y1 + diff.y, width);
      if (x1 + diff.x >= 0 && x1 + diff.x < width && y1 + diff.y >= 0 &&  y1 + diff.y < height &&
        !processed[nIdx] &&
        withinDist(x0, y0, x1 + diff.x, y1 + diff.y, neighborsDist)
      ) {
        if (!cells[nIdx].isBurnableForBI(burnIndex)) {
          anyNonburnableCells = true;
        } else if (!anyNonburnableCells || !nonburnableCellBetween(cells, width, x1 + diff.x, y1 + diff.y, x0, y0, burnIndex)) {
          neighbours.push(nIdx);
          queue.push(nIdx);
        }
        processed[nIdx] = true;
      }
    });
  }
  return neighbours;
};

export interface IFireEngineConfig {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  minCellBurnTime: number;
  neighborsDist: number;
  fireSurvivalProbability: number;
}

/**
 * FireEngine Class
 * Pure math/logic handler for the wildfire simulation. 
 * Independent of UI state or MobX observables.
 */
export class FireEngine {
  public cells: Cell[];
  public wind: IWindProps;
  public gridWidth: number;
  public gridHeight: number;
  public cellSize: number;
  public minCellBurnTime: number;
  public neighborsDist: number;
  public fireSurvivalProbability: number;
  public endOfLowIntensityFire = false;
  public fireDidStop = false;
  public day = 0;
  public burnedCellsInZone: {[key: number]: number} = {};
  private _seed = 123.456;
  private _lastTime = 0;

  public setSeed(val: number) {
    this._seed = val;
  }

  /**
   * Deterministic Pseudo-random number generator.
   */
  private random() {
    const x = Math.sin(this._seed++) * 10000;
    return x - Math.floor(x);
  }

  constructor(cells: Cell[], wind: IWindProps, sparks: Vector2[], config: IFireEngineConfig) {
    this.cells = cells;
    this.wind = wind;
    this.gridWidth = config.gridWidth;
    this.gridHeight = config.gridHeight;
    this.cellSize = config.cellSize;
    this.minCellBurnTime = config.minCellBurnTime;
    this.neighborsDist = config.neighborsDist;
    this.fireSurvivalProbability = config.fireSurvivalProbability;

    // Initialize simulation with ignition sparks.
    sparks.forEach(spark => {
      const sparkCell = this.cellAt(spark.x, spark.y);
      sparkCell.ignitionTime = 0;
      if (sparkCell.isUnburntIsland) {
        // If spark is placed inside unburnt island, dissolve the island to allow spread.
        this.removeUnburntIsland(sparkCell);
      }
    });
  }

  /**
   * Translates world coordinates (feet) to grid cell indices.
   */
  public cellAt(x: number, y: number) {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    return this.cells[getGridIndexForLocation(gridX, gridY, this.gridWidth)];
  }

  /**
   * BFS-based removal of contiguous "Unburnt Island" protected areas.
   */
  public removeUnburntIsland(startingCell: Cell) {
    const queue: Cell[] = [];
    startingCell.isUnburntIsland = false;
    queue.push(startingCell);
    while (queue.length > 0) {
      const c = queue.shift() as Cell;
      directNeighbours.forEach(diff => {
        const x1 = c.x + diff.x;
        const y1 = c.y + diff.y;
        const nIdx = getGridIndexForLocation(x1, y1, this.gridWidth);
        if (x1 >= 0 && x1 < this.gridWidth && y1 >= 0 && y1 < this.gridHeight && this.cells[nIdx].isUnburntIsland) {
          this.cells[nIdx].isUnburntIsland = false;
          queue.push(this.cells[nIdx]);
        }
      });
    }
  }

  /**
   * Primary Simulation Step Function
   * Advances the fire simulation state by checking ignition thresholds 
   * and spreading combustion to reachable neighbors.
   * 
   * @param time - Current simulation time in minutes.
   */
  public updateFire(time: number) {
    // Daily natural extinction probability check
    const newDay = Math.floor(time / modelDay);
    if (newDay !== this.day) {
      this.day = newDay;
      if (this.random() <= endOfLowIntensityFireProbability[newDay]) {
        this.endOfLowIntensityFire = true;
      }
    }

    const numCells = this.cells.length;
    const newIgnitionData: number[] = [];
    const newFireStateData: FireState[] = [];
    
    // Assume fire stopped unless proven otherwise
    this.fireDidStop = true;

    for (let i = 0; i < numCells; i++) {
      const cell = this.cells[i];
      if (cell.isBurningOrWillBurn) {
        this.fireDidStop = false; 
      }
      const ignitionTime = cell.ignitionTime;
      
      // Decay suppression timer (e.g. helitack drop effects wearing off)
      if (cell.suppressionTimer > 0) {
        cell.suppressionTimer = Math.max(0, cell.suppressionTimer - (time - (this as any)._lastTime || 0));
      }
      
      // Handle Burning -> Burnt transition
      if (cell.fireState === FireState.Burning && time - ignitionTime > cell.burnTime) {
        newFireStateData[i] = FireState.Burnt;
        if (cell.canSurviveFire && this.random() < this.fireSurvivalProbability) {
          cell.isFireSurvivor = true;
        }
      } 
      // Handle Unburnt -> Burning transition (Ignition)
      else if (cell.fireState === FireState.Unburnt && time > ignitionTime ) {
        newFireStateData[i] = FireState.Burning;
        
        // Track burned statistics by zone
        if (!this.burnedCellsInZone[cell.zoneIdx]) {
          this.burnedCellsInZone[cell.zoneIdx] = 1;
        } else {
          this.burnedCellsInZone[cell.zoneIdx] += 1;
        }

        // Logic for fire propagation to neighbors
        const fireShouldSpread = !this.endOfLowIntensityFire || cell.burnIndex !== BurnIndex.Low;
        if (fireShouldSpread) {
          const neighbors = getGridCellNeighbors(this.cells, i, this.gridWidth, this.gridHeight, this.neighborsDist, cell.burnIndex);
          neighbors.forEach(n => {
            const neighCell = this.cells[n];
            const distInFt = dist(cell.x, cell.y, neighCell.x, neighCell.y) * this.cellSize;
            
            // Calculate Rothermel-based spread rate
            const spreadRate = getFireSpreadRate(cell, neighCell, this.wind, this.cellSize);
            const spreadRateIncDistance = spreadRate / distInFt;
            const ignitionDelta = 1 / spreadRateIncDistance;
            
            if (neighCell.fireState === FireState.Unburnt) {
              // Update ignition time if this path is faster than existing ignition sources
              newIgnitionData[n] = Math.min(
                ignitionTime + ignitionDelta, newIgnitionData[n] || neighCell.ignitionTime
              );
              
              // Synchronize burn time with spread velocity
              const newBurnTime = (newIgnitionData[n] - ignitionTime) + this.minCellBurnTime;
              if (newBurnTime < neighCell.burnTime) {
                neighCell.burnTime = newBurnTime;
              }
              
              // Record peak spread rate for Burn Index calculations
              if (spreadRate > neighCell.spreadRate) {
                neighCell.spreadRate = spreadRate;
              }
            }
          });
        }
      }
    }

    // Atomic update of all cell states
    for (let i = 0; i < numCells; i++) {
      if (newFireStateData[i] !== undefined) {
        this.cells[i].fireState = newFireStateData[i];
      }
      if (newIgnitionData[i] !== undefined) {
        this.cells[i].ignitionTime = newIgnitionData[i];
      }
    }
    
    this._lastTime = time;
  }
}
