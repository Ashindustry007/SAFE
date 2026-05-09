import { Vegetation, TerrainType, DroughtLevel } from "./types";
// No mobx needed

export interface ZoneOptions {
  vegetation?: Vegetation;
  terrainType?: TerrainType;
  droughtLevel?: DroughtLevel;
}

// values for each level of vegetation: Grass, Shrub, Forest, ForestWithSuppression
export const moistureLookups: {[key in DroughtLevel]: number[]} = {
  [DroughtLevel.NoDrought]: [0.1275, 0.255, 0.17, 0.2125],
  [DroughtLevel.MildDrought]: [0.09, 0.18, 0.12, 0.15],
  [DroughtLevel.MediumDrought]: [0.0525, 0.105, 0.07, 0.0875],
  [DroughtLevel.SevereDrought]: [0.015, 0.03, 0.02, 0.025],
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
