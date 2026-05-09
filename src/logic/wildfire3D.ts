/**
 * SAFE 3D Wildfire Mapping Logic
 * 
 * Manages the generation of topographically accurate 3D simulation grids.
 * Defines regional zones (Mountains, Foothills, Plains) with unique elevations,
 * vegetation profiles, and environmental factors.
 */

import { Vegetation, DroughtLevel } from './concord/types';
import { Zone } from './concord/zone';
import { Cell, FireState } from './concord/cell';

export type Scenario = 'Plains' | 'Foothills' | 'Mountains';
export const Scenario: Record<string, Scenario> = {
  Plains: 'Plains',
  Foothills: 'Foothills',
  Mountains: 'Mountains'
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
      let zoneConfig: { vegetation: Vegetation, droughtLevel: DroughtLevel };
      let zoneIdx: number;
      let elevation: number;

      // Realistic layered noise approximation
      const h1 = Math.sin(x * 0.1) * Math.cos(y * 0.1);
      const h2 = Math.sin(x * 0.05 + 2) * Math.cos(y * 0.05 + 1) * 2;
      const noise = (h1 + h2) / 3;

      // Smooth zone transitions using interpolation (lerp)
      const t = x / width;
      let baseElevation: number;
      
      if (t < 0.45) {
        const blend = Math.max(0, Math.min(1, (t - 0.25) / 0.2));
        baseElevation = 800 * (1 - blend) + 400 * blend;
        zoneIdx = blend > 0.5 ? 1 : 0;
      } else if (t < 0.8) {
        const blend = Math.max(0, Math.min(1, (t - 0.55) / 0.2));
        baseElevation = 400 * (1 - blend) + 150 * blend;
        zoneIdx = blend > 0.5 ? 2 : 1;
      } else {
        baseElevation = 150;
        zoneIdx = 2;
      }

      zoneConfig = zoneIdx === 0 ? { vegetation: Vegetation.Forest, droughtLevel: DroughtLevel.SevereDrought } :
             zoneIdx === 1 ? { vegetation: Vegetation.Shrub, droughtLevel: DroughtLevel.MediumDrought } :
                             { vegetation: Vegetation.Grass, droughtLevel: DroughtLevel.MildDrought };

      elevation = baseElevation + noise * (baseElevation * 0.2) + Math.sin(y * 0.1) * (baseElevation * 0.05);

      const riverCenter = height * 0.6 + Math.sin(x * 0.1) * 5;
      const isRiver = Math.abs(y - riverCenter) < 2.5;

      if (isRiver) {
        elevation -= 40;
      }

      const zone = new Zone(zoneConfig);

      cells.push(new Cell({
        x,
        y,
        zone,
        zoneIdx,
        baseElevation: elevation,
        isRiver
      }));
    }
  }
  return cells;
};
