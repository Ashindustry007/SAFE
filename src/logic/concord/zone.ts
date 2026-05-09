import { Vegetation, TerrainType, DroughtLevel } from "./types";
// No mobx needed

export interface ZoneOptions {
  vegetation?: Vegetation;
  terrainType?: TerrainType;
  droughtLevel?: DroughtLevel;
}

// values for each level of vegetation: Grass, Shrub, Forest, ForestWithSuppression
export const moistureLookups: {[key in DroughtLevel]: number[]} = {
  [DroughtLevel.NoDrought]: [0.20, 0.40, 0.30, 0.35],
  [DroughtLevel.MildDrought]: [0.12, 0.24, 0.18, 0.21],
  [DroughtLevel.MediumDrought]: [0.06, 0.12, 0.09, 0.105],
  [DroughtLevel.SevereDrought]: [0.005, 0.01, 0.007, 0.008],
};


export class Zone {
  public vegetation: Vegetation = Vegetation.Grass;
  public terrainType: TerrainType = TerrainType.Foothills;
  public droughtLevel: DroughtLevel = DroughtLevel.MildDrought;

  constructor(props?: ZoneOptions) {
    if (props) {
      if (props.vegetation !== undefined) this.vegetation = props.vegetation;
      if (props.terrainType !== undefined) this.terrainType = props.terrainType;
      if (props.droughtLevel !== undefined) this.droughtLevel = props.droughtLevel;
    }
  }

  clone() {
    return new Zone({
      vegetation: this.vegetation,
      terrainType: this.terrainType,
      droughtLevel: this.droughtLevel,
    });
  }
}
