/**
 * SAFE Wildfire Intelligence - Core Type Definitions
 * 
 * Defines the enums, interfaces, and lookup tables used by the physics-based
 * Rothermel spread engine and the 3D visualization systems.
 */

/**
 * Vegetation Fuel Types
 * Represents different ecosystem profiles with varying spread properties.
 */
export const Vegetation = {
  Grass: 0,
  Shrub: 1,
  Forest: 2,
  ForestWithSuppression: 3
} as const;
export type Vegetation = typeof Vegetation[keyof typeof Vegetation];

/**
 * Environmental Drought Levels
 * Influences the moisture content of vegetation (fuel).
 */
export const DroughtLevel = {
  NoDrought: 0,
  MildDrought: 1,
  MediumDrought: 2,
  SevereDrought: 3
} as const;
export type DroughtLevel = typeof DroughtLevel[keyof typeof DroughtLevel];

/**
 * Fire Lifecycle States
 */
export const FireState = {
  Unburnt: 0,
  Burning: 1,
  Burnt: 2
} as const;
export type FireState = typeof FireState[keyof typeof FireState];

/**
 * Burn Intensity Categorization
 */
export const BurnIndex = {
  Low: 0,
  Medium: 1,
  High: 2
} as const;
export type BurnIndex = typeof BurnIndex[keyof typeof BurnIndex];

/**
 * Fuel Physics Properties
 * Parameters required for the Rothermel spread equation.
 */
export interface Fuel {
  sav: number;            // Surface Area to Volume Ratio
  netFuelLoad: number;    // Fuel loading (lb/ft^2)
  fuelBedDepth: number;   // Fuel depth (ft)
  packingRatio: number;   // Fuel density ratio
  mx: number;             // Moisture of extinction
}

/**
 * Zone Configuration
 * Environmental profile for a specific geographic region.
 */
export interface ZoneConfig {
  vegetation: Vegetation;
  droughtLevel: DroughtLevel;
}

/**
 * Grid Cell Definition
 * Primary unit of the simulation grid containing topography and fire state.
 */
export interface Cell {
  x: number;
  y: number;
  zone: ZoneConfig;
  zoneIdx: number;
  baseElevation: number;
  ignitionTime: number;
  spreadRate: number;
  burnTime: number;
  fireState: FireState;
  isUnburntIsland: boolean;
  isFireSurvivor: boolean;
  isRiver: boolean;
  isFireLine: boolean;
  isFireLineUnderConstruction: boolean;
  helitackDropCount: number;
}

/**
 * Wind Vector Properties
 */
export interface IWindProps {
  speed: number;
  direction: number;
}

/**
 * Moisture Lookup Table
 * Maps DroughtLevel and Vegetation type to specific fuel moisture percentages.
 */
export const moistureLookups: Record<DroughtLevel, Record<Vegetation, number>> = {
  [DroughtLevel.NoDrought]: {
    [Vegetation.Grass]: 0.125,
    [Vegetation.Shrub]: 0.25,
    [Vegetation.Forest]: 0.16,
    [Vegetation.ForestWithSuppression]: 0.2
  },
  [DroughtLevel.MildDrought]: {
    [Vegetation.Grass]: 0.09,
    [Vegetation.Shrub]: 0.18,
    [Vegetation.Forest]: 0.12,
    [Vegetation.ForestWithSuppression]: 0.15
  },
  [DroughtLevel.MediumDrought]: {
    [Vegetation.Grass]: 0.06,
    [Vegetation.Shrub]: 0.12,
    [Vegetation.Forest]: 0.08,
    [Vegetation.ForestWithSuppression]: 0.1
  },
  [DroughtLevel.SevereDrought]: {
    [Vegetation.Grass]: 0.03,
    [Vegetation.Shrub]: 0.06,
    [Vegetation.Forest]: 0.04,
    [Vegetation.ForestWithSuppression]: 0.05
  }
};
