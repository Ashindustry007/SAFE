import { 
  Vegetation, 
  DroughtLevel, 
  FireState
} from './wildfireTypes';
import type { Cell } from './wildfireTypes';

export interface ZoneConfig {
  vegetation: Vegetation;
  droughtLevel: DroughtLevel;
}

export const ZONES: Record<string, ZoneConfig> = {
  MOUNTAINS: { vegetation: Vegetation.Forest, droughtLevel: DroughtLevel.SevereDrought },
  FOOTHILLS: { vegetation: Vegetation.Shrub, droughtLevel: DroughtLevel.MediumDrought },
  PLAINS: { vegetation: Vegetation.Grass, droughtLevel: DroughtLevel.MildDrought }
};

export const generate3DGrid = (width: number, height: number): Cell[] => {
  const cells: Cell[] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let zone = ZONES.PLAINS;
      let zoneIdx = 2;
      let elevation = 0;

      // Mountains (Left 33%)
      if (x < width * 0.33) {
        zone = ZONES.MOUNTAINS;
        zoneIdx = 0;
        elevation = 1500 + Math.sin(x * 0.5) * 200 + Math.cos(y * 0.5) * 200;
      } 
      // Foothills (Middle 33%)
      else if (x < width * 0.66) {
        zone = ZONES.FOOTHILLS;
        zoneIdx = 1;
        elevation = 800 + Math.sin(x * 0.3) * 100 + Math.cos(y * 0.3) * 100;
      } 
      // Plains (Right 33%)
      else {
        zone = ZONES.PLAINS;
        zoneIdx = 2;
        elevation = 300 + Math.sin(x * 0.1) * 20 + Math.cos(y * 0.1) * 20;
      }

      // Add a river at the bottom
      const isRiver = y > height * 0.8 && y < height * 0.85 + Math.sin(x * 0.1) * 2;

      cells.push({
        x,
        y,
        zone,
        zoneIdx,
        baseElevation: elevation,
        ignitionTime: Infinity,
        spreadRate: 0,
        burnTime: 500,
        fireState: FireState.Unburnt,
        isUnburntIsland: false,
        isFireSurvivor: false,
        isRiver,
        isFireLine: false,
        isFireLineUnderConstruction: false,
        helitackDropCount: 0
      });
    }
  }
  return cells;
};
