/**
 * SAFE 3D Wildfire Mapping Logic
 * 
 * Manages the generation of topographically accurate 3D simulation grids.
 * Defines regional zones (Mountains, Foothills, Plains) with unique elevations,
 * vegetation profiles, and environmental factors.
 */

import { 
  Vegetation, 
  DroughtLevel, 
  FireState
} from './wildfireTypes';
import type { Cell } from './wildfireTypes';

/**
 * ZoneConfig
 * Defines the environmental characteristics of a specific geographic region.
 */
export interface ZoneConfig {
  vegetation: Vegetation;
  droughtLevel: DroughtLevel;
}

/**
 * ZONES Mapping
 * Pre-defined configurations for different terrain profiles in the 3D world.
 */
export const ZONES: Record<string, ZoneConfig> = {
  MOUNTAINS: { vegetation: Vegetation.Forest, droughtLevel: DroughtLevel.SevereDrought },
  FOOTHILLS: { vegetation: Vegetation.Shrub, droughtLevel: DroughtLevel.MediumDrought },
  PLAINS: { vegetation: Vegetation.Grass, droughtLevel: DroughtLevel.MildDrought }
};

/**
 * generate3DGrid
 * Procedurally generates a 3D terrain grid based on zone definitions.
 * 
 * @param width - Horizontal dimension of the grid
 * @param height - Vertical dimension of the grid
 * @returns Array of Cell objects with elevation, zone, and fire state data
 */
export const generate3DGrid = (width: number, height: number): Cell[] => {
  const cells: Cell[] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let zone = ZONES.PLAINS;
      let zoneIdx = 2;
      let elevation = 0;

      /**
       * Procedural Elevation Logic
       * Divide the map into vertical bands: Mountains (Left), Foothills (Center), Plains (Right)
       * Uses sine/cosine functions for natural-looking terrain variations.
       */
      
      // Mountains (Left 33%) - Highest elevation, Forested
      if (x < width * 0.33) {
        zone = ZONES.MOUNTAINS;
        zoneIdx = 0;
        elevation = 1500 + Math.sin(x * 0.5) * 200 + Math.cos(y * 0.5) * 200;
      } 
      // Foothills (Middle 33%) - Moderate elevation, Shrubland
      else if (x < width * 0.66) {
        zone = ZONES.FOOTHILLS;
        zoneIdx = 1;
        elevation = 800 + Math.sin(x * 0.3) * 100 + Math.cos(y * 0.3) * 100;
      } 
      // Plains (Right 33%) - Lowest elevation, Grassland
      else {
        zone = ZONES.PLAINS;
        zoneIdx = 2;
        elevation = 300 + Math.sin(x * 0.1) * 20 + Math.cos(y * 0.1) * 20;
      }

      // Procedural Water Placement: Adds a river winding through the bottom 20% of the map
      const isRiver = y > height * 0.8 && y < height * 0.85 + Math.sin(x * 0.1) * 2;

      // Create the 3D cell object
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
