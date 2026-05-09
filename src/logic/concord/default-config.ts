import { DroughtLevel, TerrainType, Vegetation } from "./types";
import type { IWindProps } from "./types";

export interface ConcordTownConfig {
  name: string;
  x: number; // [0..1]
  y: number; // [0..1]
  terrainType?: TerrainType;
}

export interface ConcordSimConfig {
  preset: string;
  modelWidth: number; // ft
  modelHeight: number; // ft
  gridWidth: number; // number of cells horizontally
  gridHeight: number; // number of cells vertically
  cellSize: number; // ft
  elevation?: number[][] | string;
  unburntIslands?: number[][] | string;
  zoneIndex: number[][] | string;
  sparks: number[][];
  maxTimeStep: number; // minutes
  modelDayInSeconds: number;
  windSpeed: number; // mph
  windDirection: number; // degrees
  neighborsDist: number;
  minCellBurnTime: number; // minutes
  heightmapMaxElevation: number; // ft
  zonesCount: 2 | 3;
  zones: Array<{ terrainType: TerrainType; vegetation: Vegetation; droughtLevel: DroughtLevel }>;
  towns: ConcordTownConfig[];
  fillTerrainEdges: boolean;
  riverData: string | null;
  riverColor: [number, number, number, number];
  unburntIslandProbability: number;
  fireSurvivalProbability: number;
}

export const DEFAULT_THREE_ZONE_CONFIG: ConcordSimConfig = (() => {
  const modelWidth = 120000;
  const modelHeight = 80000;
  const gridWidth = 240;
  const cellSize = modelWidth / gridWidth; // 500
  const gridHeight = Math.ceil(modelHeight / cellSize); // 160

  return {
    preset: "defaultThreeZone",
    modelWidth,
    modelHeight,
    gridWidth,
    gridHeight,
    cellSize,
    elevation: "/concord-data/mountains-foothills-plains-heightmap.png",
    unburntIslands: "/concord-data/mountains-foothills-plains-islands.png",
    zoneIndex: [[0, 1, 2]],
    sparks: [],
    maxTimeStep: 180,
    modelDayInSeconds: 8,
    windSpeed: 0,
    windDirection: 0,
    neighborsDist: 2.5,
    minCellBurnTime: 200,
    heightmapMaxElevation: 20000,
    zonesCount: 3,
    zones: [
      { terrainType: TerrainType.Mountains, vegetation: Vegetation.Forest, droughtLevel: DroughtLevel.SevereDrought },
      { terrainType: TerrainType.Foothills, vegetation: Vegetation.Shrub, droughtLevel: DroughtLevel.MediumDrought },
      { terrainType: TerrainType.Plains, vegetation: Vegetation.Grass, droughtLevel: DroughtLevel.MildDrought },
    ],
    towns: [
      { name: "Skyview", x: 0.12, y: 0.68, terrainType: TerrainType.Mountains },
      { name: "Rolling Rock", x: 0.60, y: 0.25, terrainType: TerrainType.Foothills },
      { name: "Evensville", x: 0.78, y: 0.55, terrainType: TerrainType.Plains },
    ],
    fillTerrainEdges: true,
    riverData: "/concord-data/river-texmap.png",
    riverColor: [0.067, 0.529, 0.882, 1],
    unburntIslandProbability: 0.5,
    fireSurvivalProbability: 0.1,
  };
})();

export const defaultWindFromConfig = (cfg: ConcordSimConfig): IWindProps => ({
  speed: cfg.windSpeed,
  direction: cfg.windDirection,
});

