export const Vegetation = {
  Grass: 0,
  Shrub: 1,
  Forest: 2,
  ForestWithSuppression: 3
} as const;
export type Vegetation = typeof Vegetation[keyof typeof Vegetation];

export const DroughtLevel = {
  NoDrought: 0,
  MildDrought: 1,
  MediumDrought: 2,
  SevereDrought: 3
} as const;
export type DroughtLevel = typeof DroughtLevel[keyof typeof DroughtLevel];

export const FireState = {
  Unburnt: 0,
  Burning: 1,
  Burnt: 2
} as const;
export type FireState = typeof FireState[keyof typeof FireState];

export const BurnIndex = {
  Low: 0,
  Medium: 1,
  High: 2
} as const;
export type BurnIndex = typeof BurnIndex[keyof typeof BurnIndex];

export interface Fuel {
  sav: number;
  netFuelLoad: number;
  fuelBedDepth: number;
  packingRatio: number;
  mx: number;
}

export interface ZoneConfig {
  vegetation: Vegetation;
  droughtLevel: DroughtLevel;
}

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

export interface IWindProps {
  speed: number;
  direction: number;
}

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
