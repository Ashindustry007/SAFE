/**
 * SAFE Concord Engine - Fire Spread Physics
 * 
 * High-fidelity implementation of the Rothermel Surface Fire Spread Model.
 * This module calculates the physical rate of spread (ft/min) between two 
 * points on the grid based on fuel properties, moisture, wind, and slope.
 * 
 * References:
 * - https://www.fs.fed.us/rm/pubs_series/rmrs/gtr/rmrs_gtr371.pdf
 * - https://www.pivotaltracker.com/story/show/170343321
 */

import { Vegetation } from "../types";
import type { Fuel, IWindProps } from "../types";
import { Vector2 } from "three";

interface ICellProps {
  x: number;
  y: number;
  vegetation: Vegetation;
  moistureContent: number;
  elevation: number;
}

// Physical Constants for Fire Behavior
const heatContent = 8000;             // BTU/lb
const totalMineralContent = 0.0555;    // Fractional
const effectiveMineralContent = 0.01; // Fractional

/**
 * FuelConstants
 * Research-derived values for different fuel models (Grass, Shrub, Forest).
 * Includes SAV (Surface Area to Volume), fuel load, and moisture limits.
 */
const FuelConstants: {[key in Vegetation]: Fuel} = {
  [Vegetation.Grass]: {
    sav: 2100,
    netFuelLoad: 0.294,
    fuelBedDepth: 3,
    packingRatio: 0.00306,
    mx: 0.15
  },
  [Vegetation.Shrub]: {
    sav: 1672,
    netFuelLoad: 0.239,
    fuelBedDepth: 1.2,
    packingRatio: 0.01198,
    mx: 0.3
  },
  // Approximate values for Forest models pending final specification
  [Vegetation.Forest]: {
    sav: 1716,
    netFuelLoad: 0.0459,
    fuelBedDepth: 0.1,
    packingRatio: 0.04878,
    mx: 0.2
  },
  [Vegetation.ForestWithSuppression]: {
    sav: 1500,
    netFuelLoad: 0.689,
    fuelBedDepth: 0.5,
    packingRatio: 0.02224,
    mx: 0.25
  }
};

const ORIGIN = new Vector2(0, 0);

/**
 * dist
 * Calculates the Euclidean distance between two cell properties.
 */
const dist = (c1: ICellProps, c2: ICellProps) => {
  const xDiff = c1.x - c2.x;
  const yDiff = c1.y - c2.y;
  if (xDiff === 0 || yDiff === 0) {
    return Math.abs(xDiff + yDiff);
  } else {
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
  }
};

/**
 * getDirectionFactor
 * Calculates a multiplier for the fire spread rate based on the alignment
 * between the target cell and the direction of maximum spread.
 * 
 * Derived from GTR-371 section 6.2, page 88.
 */
export const getDirectionFactor =
  (sourceCell: ICellProps, targetCell: ICellProps, effectiveWindSpeed: number, maxSpreadDirection: number) => {
  const effectiveWindSpeedMPH = effectiveWindSpeed / 88;
  const Z = 1 + 0.25 * effectiveWindSpeedMPH;
  const e = Math.pow(Math.pow(Z, 2) - 1, 0.5) / Z;

  const cellCentersVector = new Vector2(targetCell.x - sourceCell.x, targetCell.y - sourceCell.y);
  // Angle between cells centers and direction of max fire spread.
  const relativeAngle = Math.abs(cellCentersVector.angle() - maxSpreadDirection);

  return (1 - e) / (1 - e * Math.cos(relativeAngle));
};

/**
 * getFireSpreadRate
 * The core Rothermel equation implementation.
 * Calculates the final spread rate (ft/min) considering fuel, moisture, wind, and slope.
 * 
 * Derived from GTR-371 and calibrated against standardized fire behavior datasets.
 * 
 * @param sourceCell - Burning cell
 * @param targetCell - Unburnt neighbor cell
 * @param wind - Wind speed (mph) and direction (degrees)
 * @param cellSize - Physical size of each cell in feet
 * @returns Fire spread rate in ft/min
 */
export const getFireSpreadRate = (
  sourceCell: ICellProps,
  targetCell: ICellProps,
  wind: IWindProps,
  cellSize: number
) => {
  const fuel = FuelConstants[targetCell.vegetation];
  const sav = fuel.sav;
  const packingRatio = fuel.packingRatio;
  const netFuelLoad = fuel.netFuelLoad;
  const mx = fuel.mx;
  const fuelBedDepth = fuel.fuelBedDepth;

  const moistureContentRatio = targetCell.moistureContent / mx;
  const savFactor = Math.pow(sav, 1.5);

  // Reaction Intensity Components
  const a = 133 * Math.pow(sav, -0.7913);
  const b = 0.02526 * Math.pow(sav, 0.54);
  const c = 7.47 * Math.exp(-0.133 * Math.pow(sav, 0.55));
  const e = 0.715 * (-0.000359 * sav);

  const maximumReactionVelocity = savFactor * Math.pow(495 + (0.0594 * savFactor), -1);
  const optimumPackingRatio = 3.348 * Math.pow(sav, -0.8189);
  const optimumReactionVelocity = maximumReactionVelocity * Math.pow(packingRatio / optimumPackingRatio, a)
          * Math.exp(a * (1 - (packingRatio / optimumPackingRatio)));
  
  // Moisture and Mineral Damping
  const moistureDampingCoefficient = 1 - (2.59 * moistureContentRatio) + (5.11 * Math.pow(moistureContentRatio, 2))
          - (3.52 * Math.pow(moistureContentRatio, 3));
  const mineralDampingCoefficient = 0.174 * Math.pow(effectiveMineralContent, -0.19);
  
  // Reaction Intensity (total heat release)
  const reactionIntensity = optimumReactionVelocity * netFuelLoad * heatContent
          * moistureDampingCoefficient * mineralDampingCoefficient;

  // Propagation Components
  const propagatingFluxRatio = Math.pow(192 + (0.2595 * sav), -1)
          * Math.exp((0.792 + (0.681 * Math.pow(sav, 0.5)) ) * (packingRatio + 0.1));

  const fuelLoad = netFuelLoad / (1 - totalMineralContent);
  const ovenDryBulkDensity = fuelLoad / fuelBedDepth;
  const effectiveHeatingNumber = Math.exp(-138 / sav);
  const heatOfPreIgnition = 250 + (1116 * targetCell.moistureContent);

  // r0: Base rate of spread (no wind or slope)
  const r0 = reactionIntensity * propagatingFluxRatio /
             (ovenDryBulkDensity * effectiveHeatingNumber * heatOfPreIgnition);

  // Wind and Slope Vector Summation
  const windSpeedFtPerMin = wind.speed * 88;
  const windFactor = c * Math.pow(windSpeedFtPerMin, b) * Math.pow((packingRatio / optimumPackingRatio), -e);

  const distInFt = dist(sourceCell, targetCell) * cellSize;
  const elevationDiffInFt = targetCell.elevation - sourceCell.elevation;
  const slopeTan = elevationDiffInFt / distInFt;
  const slopeFactor = 5.275 * Math.pow(packingRatio, -0.3) * Math.pow(slopeTan, 2);

  // Vector logic for combining wind and topographic push
  const windVector = (new Vector2(0, -1)).rotateAround(ORIGIN, -wind.direction * Math.PI / 180);
  const upslopeVector = targetCell.elevation >= sourceCell.elevation ?
          new Vector2(targetCell.x - sourceCell.x, targetCell.y - sourceCell.y) :
          new Vector2(sourceCell.x - targetCell.x, sourceCell.y - targetCell.y);

  const dw = r0 * windFactor; 
  windVector.setLength(dw);

  const ds = r0 * slopeFactor; 
  upslopeVector.setLength(ds);

  // Resultant Vector of Maximum Spread
  const maxSpreadRateVector = (new Vector2()).addVectors(upslopeVector, windVector);

  // rh: Max spread rate in direction of resultant vector
  const rh = r0 + maxSpreadRateVector.length();

  // Effective wind values for directionality factor
  const effectiveWindFactor = rh / r0 - 1;
  const effectiveWindSpeed = Math.pow(effectiveWindFactor /
          (c * Math.pow(packingRatio / optimumPackingRatio, -e)), 1 / b);

  // Apply final direction factor relative to neighbor location
  const directionFactor = getDirectionFactor(sourceCell, targetCell, effectiveWindSpeed, maxSpreadRateVector.angle());
  return rh * directionFactor;
};
