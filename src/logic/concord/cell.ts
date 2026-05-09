/**
 * SAFE Concord Engine - Cell Logic
 * 
 * Defines the state and behavioral logic for individual grid cells in the 
 * wildfire simulation. Manages ignition times, spread rates, and 
 * environmental interactions (drought, vegetation, suppression).
 */

import { Zone, moistureLookups } from "./zone";
import { Vegetation, DroughtLevel } from "./types";

/**
 * Fire lifecycle states
 */
export const FireState = {
  Unburnt: 0,
  Burning: 1,
  Burnt: 2
} as const;
export type FireState = typeof FireState[keyof typeof FireState];

/**
 * Burn Intensity Categorization
 * Maps fire intensity to risk levels based on research standards.
 */
export const BurnIndex = {
  Low: 0,
  Medium: 1,
  High: 2
} as const;
export type BurnIndex = typeof BurnIndex[keyof typeof BurnIndex];

/**
 * Configuration options for initializing a Cell.
 */
export interface CellOptions {
  x: number;
  y: number;
  zone: Zone;
  zoneIdx?: number;
  baseElevation?: number;
  ignitionTime?: number;
  fireState?: FireState;
  isUnburntIsland?: boolean;
  isRiver?: boolean;
  isFireLine?: boolean;
  isFireLineUnderConstruction?: boolean;
}

const FIRE_LINE_DEPTH = 2000;
const MAX_BURN_TIME = 500;

export class Cell {
  public x!: number; // Grid X coordinate
  public y!: number; // Grid Y coordinate
  public zone!: Zone;
  public zoneIdx!: number;
  public baseElevation = 0;
  public ignitionTime = Infinity;
  public spreadRate = 0;
  public burnTime: number = MAX_BURN_TIME;
  public fireState: FireState = FireState.Unburnt;
  public isUnburntIsland = false;
  public isFireSurvivor = false;
  public isRiver = false;
  public isFireLine = false;
  public isFireLineUnderConstruction = false;
  public helitackDropCount = 0;
  public suppressionTimer = 0; // Minutes remaining of "non-burnable" status after helitack drop

  /**
   * Constructs a new simulation cell.
   * @param props - Initialization properties for the cell.
   */
  constructor(props: CellOptions) {
    if (props.x !== undefined) this.x = props.x;
    if (props.y !== undefined) this.y = props.y;
    if (props.zone !== undefined) this.zone = props.zone;
    if (props.zoneIdx !== undefined) this.zoneIdx = props.zoneIdx;
    if (props.baseElevation !== undefined) this.baseElevation = props.baseElevation;
    if (props.ignitionTime !== undefined) this.ignitionTime = props.ignitionTime;
    if (props.fireState !== undefined) this.fireState = props.fireState;
    if (props.isUnburntIsland !== undefined) this.isUnburntIsland = props.isUnburntIsland;
    if (props.isRiver !== undefined) this.isRiver = props.isRiver;
    if (props.isFireLine !== undefined) this.isFireLine = props.isFireLine;
    if (props.isFireLineUnderConstruction !== undefined) this.isFireLineUnderConstruction = props.isFireLineUnderConstruction;
  }

  public get vegetation() {
    return this.zone.vegetation;
  }

  /**
   * Adjusted Elevation
   * Returns base elevation or suppressed elevation if a fire line is present.
   */
  public get elevation() {
    if (this.isFireLine) {
      return this.baseElevation - FIRE_LINE_DEPTH;
    }
    return this.baseElevation;
  }

  /**
   * Non-burnable Check
   * Returns true if the cell contains water, is a protected island, or is currently "wet" from suppression.
   */
  public get isNonburnable() {
    return this.isRiver || this.isUnburntIsland || this.suppressionTimer > 0;
  }

  /**
   * Moisture Content Logic
   * Calculates current fuel moisture based on drought levels and vegetation type.
   */
  public get moistureContent() {
    if (this.isNonburnable) {
      return Infinity;
    }
    return moistureLookups[this.droughtLevel][this.vegetation];
  }

  /**
   * Effective Drought Level
   * Accounts for Helitack water drops reducing the regional drought severity.
   */
  public get droughtLevel() {
    if (this.helitackDropCount > 0) {
      const newDroughtLevel = this.zone.droughtLevel - this.helitackDropCount;
      return Math.max(newDroughtLevel, DroughtLevel.NoDrought) as DroughtLevel;
    }
    return this.zone.droughtLevel;
  }

  public get isBurningOrWillBurn() {
    return this.fireState === FireState.Burning || this.fireState === FireState.Unburnt && this.ignitionTime < Infinity;
  }

  public get canSurviveFire() {
    return this.burnIndex === BurnIndex.Low && this.vegetation === Vegetation.Forest;
  }

  /**
   * Burn Index Calculation
   * Categorizes fire intensity (Low, Medium, High) based on spread rate 
   * and specific fuel model thresholds.
   */
  public get burnIndex() {
    if (this.vegetation === Vegetation.Grass) {
      if (this.spreadRate < 45) {
        return BurnIndex.Low;
      }
      return BurnIndex.Medium;
    }
    if (this.vegetation === Vegetation.Shrub) {
      if (this.spreadRate < 10) {
        return BurnIndex.Low;
      }
      if (this.spreadRate < 50) {
        return BurnIndex.Medium;
      }
      return BurnIndex.High;
    }
    if (this.vegetation === Vegetation.Forest) {
      if (this.spreadRate < 25) {
        return BurnIndex.Low;
      }
      return BurnIndex.Medium;
    }
    // ForestWithSuppression thresholds
    if (this.spreadRate < 12) {
      return BurnIndex.Low;
    }
    if (this.spreadRate < 40) {
      return BurnIndex.Medium;
    }
    return BurnIndex.High;
  }

  /**
   * Burnable Check for Burn Index
   * Determines if a cell can ignite considering barriers (Fire Lines).
   */
  public isBurnableForBI(burnIndex: BurnIndex) {
    // Fire lines are now absolute barriers. They do not burn even in High intensity fires.
    return !this.isNonburnable && !this.isFireLine;
  }

  /**
   * Resets the cell to its initial unburnt state.
   */
  public reset() {
    this.ignitionTime = Infinity;
    this.spreadRate = 0;
    this.burnTime = MAX_BURN_TIME;
    this.fireState = FireState.Unburnt;
    this.isFireLineUnderConstruction = false;
    this.isFireLine = false;
    this.helitackDropCount = 0;
    this.isFireSurvivor = false;
  }
}
