/**
 * Concord raster data loaders (MIT-compatible port).
 */

import { getInputData } from "./image-utils";

export async function loadZoneIndex(
  zoneIndex: number[][] | string | undefined,
  gridWidth: number,
  gridHeight: number
): Promise<number[] | undefined> {
  return await getInputData(zoneIndex, gridWidth, gridHeight, false, (rgba) => {
    // Red is zone 1, green is zone 2, and blue is zone 3.
    if (rgba[0] >= rgba[1] && rgba[0] >= rgba[2]) return 0;
    if (rgba[1] >= rgba[0] && rgba[1] >= rgba[2]) return 1;
    return 2;
  });
}

export async function loadElevation(
  elevation: number[][] | string | undefined,
  gridWidth: number,
  gridHeight: number,
  heightmapMaxElevationFt: number
): Promise<number[] | undefined> {
  return await getInputData(elevation, gridWidth, gridHeight, true, (rgba) => {
    // Black->low, white->high.
    return (rgba[0] / 255) * heightmapMaxElevationFt;
  });
}

export async function loadUnburntIslands(
  islands: number[][] | string | undefined,
  gridWidth: number,
  gridHeight: number,
  unburntIslandProbability: number
): Promise<number[] | undefined> {
  const islandActive: Record<number, number> = {};
  return await getInputData(islands, gridWidth, gridHeight, true, (rgba) => {
    const r = rgba[0];
    if (r < 255) {
      if (islandActive[r] === undefined) {
        islandActive[r] = Math.random() < unburntIslandProbability ? 1 : 0;
      }
      return islandActive[r];
    }
    return 0;
  });
}

export async function loadRiverMask(
  riverData: string | undefined,
  gridWidth: number,
  gridHeight: number
): Promise<number[] | undefined> {
  if (!riverData) return undefined;
  return await getInputData(riverData, gridWidth, gridHeight, true, (rgba) => {
    // River texture is mostly transparent, so look for non-transparent cells.
    return rgba[3] > 0 ? 1 : 0;
  });
}

