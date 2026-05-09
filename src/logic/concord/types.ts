import { Vector2 } from "three";

export interface Fuel {
  sav: number;
  packingRatio: number;
  netFuelLoad: number;
  mx: number;
  fuelBedDepth: number;
}

export interface Town {
  name: string;
  position: Vector2;
}

export const Vegetation = {
  Grass: 0,
  Shrub: 1,
  Forest: 2,
  ForestWithSuppression: 3
} as const;
export type Vegetation = typeof Vegetation[keyof typeof Vegetation];

export const vegetationLabels: Record<Vegetation, string> = {
  [Vegetation.Grass]: "Grass",
  [Vegetation.Shrub]: "Shrub",
  [Vegetation.Forest]: "Forest",
  [Vegetation.ForestWithSuppression]: "Forest With Suppression"
};

export const TerrainType = {
  Plains: 0,
  Foothills: 1,
  Mountains: 2
} as const;
export type TerrainType = typeof TerrainType[keyof typeof TerrainType];

export const terrainLabels: Record<TerrainType, string> = {
  [TerrainType.Plains]: "Plains",
  [TerrainType.Foothills]: "Foothills",
  [TerrainType.Mountains]: "Mountains",
};

export const DroughtLevel = {
  NoDrought: 0,
  MildDrought: 1,
  MediumDrought: 2,
  SevereDrought: 3
} as const;
export type DroughtLevel = typeof DroughtLevel[keyof typeof DroughtLevel];

export const droughtLabels: Record<DroughtLevel, string> = {
  [DroughtLevel.NoDrought]: "No Drought",
  [DroughtLevel.MildDrought]: "Mild Drought",
  [DroughtLevel.MediumDrought]: "Medium Drought",
  [DroughtLevel.SevereDrought]: "Severe Drought",
};

export interface IWindProps {
  // Wind speed in mph.
  speed: number;
  // Angle in degrees following this definition: https://en.wikipedia.org/wiki/Wind_direction
  // 0 is northern wind, 90 is eastern wind.
  direction: number;
}
