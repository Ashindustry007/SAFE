import { Vector2 } from "three";
import { 
  Vegetation, 
  DroughtLevel, 
  FireState, 
  BurnIndex, 
  moistureLookups
} from "./wildfireTypes";
import type { Fuel, Cell, IWindProps } from "./wildfireTypes";

const heatContent = 8000;
const totalMineralContent = 0.0555;
const effectiveMineralContent = 0.01;
const ORIGIN = new Vector2(0, 0);

const FuelConstants: Record<Vegetation, Fuel> = {
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

const getMoistureContent = (cell: Cell) => {
  if (cell.isRiver || cell.isUnburntIsland) return Infinity;
  const effectiveDrought = Math.max(0, cell.zone.droughtLevel - cell.helitackDropCount) as DroughtLevel;
  return moistureLookups[effectiveDrought][cell.zone.vegetation];
};

const getBurnIndex = (cell: Cell) => {
  const veg = cell.zone.vegetation;
  const rate = cell.spreadRate;
  if (veg === Vegetation.Grass) return rate < 45 ? BurnIndex.Low : BurnIndex.Medium;
  if (veg === Vegetation.Shrub) {
    if (rate < 10) return BurnIndex.Low;
    if (rate < 50) return BurnIndex.Medium;
    return BurnIndex.High;
  }
  if (veg === Vegetation.Forest) return rate < 25 ? BurnIndex.Low : BurnIndex.Medium;
  if (rate < 12) return BurnIndex.Low;
  if (rate < 40) return BurnIndex.Medium;
  return BurnIndex.High;
};

const isBurnableForBI = (cell: Cell, burnIndex: BurnIndex) => {
  const isNonburnable = cell.isRiver || cell.isUnburntIsland;
  return !isNonburnable && (!cell.isFireLine || burnIndex === BurnIndex.High);
};

const getDirectionFactor = (sourceCell: Cell, targetCell: Cell, effectiveWindSpeed: number, maxSpreadDirection: number) => {
  const effectiveWindSpeedMPH = effectiveWindSpeed / 88;
  const Z = 1 + 0.25 * effectiveWindSpeedMPH;
  const e = Math.pow(Math.pow(Z, 2) - 1, 0.5) / Z;
  const cellCentersVector = new Vector2(targetCell.x - sourceCell.x, targetCell.y - sourceCell.y);
  const relativeAngle = Math.abs(cellCentersVector.angle() - maxSpreadDirection);
  return (1 - e) / (1 - e * Math.cos(relativeAngle));
};

export const getFireSpreadRate = (sourceCell: Cell, targetCell: Cell, wind: IWindProps, cellSize: number) => {
  const fuel = FuelConstants[targetCell.zone.vegetation];
  const moistureContent = getMoistureContent(targetCell);
  if (moistureContent === Infinity) return 0;

  const { sav, packingRatio, netFuelLoad, mx, fuelBedDepth } = fuel;
  const moistureContentRatio = moistureContent / mx;
  const savFactor = Math.pow(sav, 1.5);

  const a = 133 * Math.pow(sav, -0.7913);
  const b = 0.02526 * Math.pow(sav, 0.54);
  const c = 7.47 * Math.exp(-0.133 * Math.pow(sav, 0.55));
  const e = 0.715 * (-0.000359 * sav);

  const maximumReactionVelocity = savFactor * Math.pow(495 + (0.0594 * savFactor), -1);
  const optimumPackingRatio = 3.348 * Math.pow(sav, -0.8189);
  const optimumReactionVelocity = maximumReactionVelocity * Math.pow(packingRatio / optimumPackingRatio, a) * Math.exp(a * (1 - (packingRatio / optimumPackingRatio)));
  
  const moistureDampingCoefficient = 1 - (2.59 * moistureContentRatio) + (5.11 * Math.pow(moistureContentRatio, 2)) - (3.52 * Math.pow(moistureContentRatio, 3));
  const mineralDampingCoefficient = 0.174 * Math.pow(effectiveMineralContent, -0.19);
  const reactionIntensity = optimumReactionVelocity * netFuelLoad * heatContent * moistureDampingCoefficient * mineralDampingCoefficient;

  const propagatingFluxRatio = Math.pow(192 + (0.2595 * sav), -1) * Math.exp((0.792 + (0.681 * Math.pow(sav, 0.5))) * (packingRatio + 0.1));
  const fuelLoad = netFuelLoad / (1 - totalMineralContent);
  const ovenDryBulkDensity = fuelLoad / fuelBedDepth;
  const effectiveHeatingNumber = Math.exp(-138 / sav);
  const heatOfPreIgnition = 250 + (1116 * moistureContent);

  const r0 = reactionIntensity * propagatingFluxRatio / (ovenDryBulkDensity * effectiveHeatingNumber * heatOfPreIgnition);

  const windSpeedFtPerMin = wind.speed * 88;
  const windFactor = c * Math.pow(windSpeedFtPerMin, b) * Math.pow((packingRatio / optimumPackingRatio), -e);

  const distPx = Math.sqrt(Math.pow(sourceCell.x - targetCell.x, 2) + Math.pow(sourceCell.y - targetCell.y, 2));
  const distInFt = distPx * cellSize;
  const elevationDiffInFt = targetCell.baseElevation - sourceCell.baseElevation;
  const slopeTan = elevationDiffInFt / distInFt;
  const slopeFactor = 5.275 * Math.pow(packingRatio, -0.3) * Math.pow(slopeTan, 2);

  const windVector = (new Vector2(0, -1)).rotateAround(ORIGIN, -wind.direction * Math.PI / 180);
  const upslopeVector = targetCell.baseElevation >= sourceCell.baseElevation ?
          new Vector2(targetCell.x - sourceCell.x, targetCell.y - sourceCell.y) :
          new Vector2(sourceCell.x - targetCell.x, sourceCell.y - targetCell.y);

  windVector.setLength(r0 * windFactor);
  upslopeVector.setLength(r0 * slopeFactor);

  const maxSpreadRateVector = (new Vector2()).addVectors(upslopeVector, windVector);
  const rh = r0 + maxSpreadRateVector.length();
  const effectiveWindFactor = rh / r0 - 1;
  const effectiveWindSpeed = Math.pow(effectiveWindFactor / (c * Math.pow(packingRatio / optimumPackingRatio, -e)), 1 / b);

  const directionFactor = getDirectionFactor(sourceCell, targetCell, effectiveWindSpeed, maxSpreadRateVector.angle());
  return rh * directionFactor;
};

export const stepSimulation = (
  cells: Cell[], 
  width: number, 
  height: number, 
  wind: IWindProps, 
  cellSize: number, 
  time: number
): Cell[] => {
  const nextCells = [...cells.map(c => ({...c}))];
  const newIgnitionData: Record<number, number> = {};

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    
    // Burning to Burnt
    if (cell.fireState === FireState.Burning && time - cell.ignitionTime > cell.burnTime) {
      nextCells[i].fireState = FireState.Burnt;
    } 
    // Unburnt to Burning
    else if (cell.fireState === FireState.Unburnt && time > cell.ignitionTime) {
      nextCells[i].fireState = FireState.Burning;
      const currentBurnIndex = getBurnIndex(cell);

      // Spread to neighbors
      const x = i % width;
      const y = Math.floor(i / width);
      
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            const neighCell = cells[nIdx];
            
            if (neighCell.fireState === FireState.Unburnt && isBurnableForBI(neighCell, currentBurnIndex)) {
              const spreadRate = getFireSpreadRate(cell, neighCell, wind, cellSize);
              if (spreadRate > 0) {
                const distPx = Math.sqrt(dx*dx + dy*dy);
                const distInFt = distPx * cellSize;
                const ignitionDelta = distInFt / spreadRate;
                const newIgnitionTime = cell.ignitionTime + ignitionDelta;
                
                if (newIgnitionTime < (newIgnitionData[nIdx] || neighCell.ignitionTime)) {
                  newIgnitionData[nIdx] = newIgnitionTime;
                  nextCells[nIdx].ignitionTime = newIgnitionTime;
                  nextCells[nIdx].spreadRate = spreadRate;
                }
              }
            }
          }
        }
      }
    }
  }

  return nextCells;
};
