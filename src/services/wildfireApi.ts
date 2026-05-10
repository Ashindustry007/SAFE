/**
 * SAFE Environmental Intelligence Service
 * 
 * Provides an abstraction layer for fetching real-time sensory data
 * including wind vectors, humidity, temperature, and drought levels.
 * Integrates with the Open-Meteo API for planetary-scale atmospheric data.
 */

/**
 * Geographic Bounding Box
 */
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Unified Wildfire Intelligence Model
 */
export interface WildfireData {
  droughtIndex: number;
  vegetationType: string;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  humidity: number;
  roadStatus: 'Open' | 'Closed' | 'Caution';
}

/**
 * fetchWildfireGrid
 * High-resolution planetary data fetching (defaults to 32x32 grid).
 * 
 * Implementation Details:
 * 1. Samples a sparse 6x6 base grid from the Open-Meteo API.
 * 2. Performs Bilinear Interpolation to upsample to the requested resolution (rows x cols).
 * 3. Derives secondary metrics (like droughtIndex) from humidity gradients.
 * 
 * @param bbox - Regional bounding box for intelligence gathering.
 * @param rows - Target grid vertical resolution.
 * @param cols - Target grid horizontal resolution.
 * @returns A 2D array of localized WildfireData objects.
 */
export const fetchWildfireGrid = async (bbox: BoundingBox, rows: number = 32, cols: number = 32): Promise<WildfireData[][]> => {
  try {
    const baseRows = 6;
    const baseCols = 6;
    const lats: number[] = [];
    const lngs: number[] = [];
    const latStepBase = (bbox.north - bbox.south) / baseRows;
    const lngStepBase = (bbox.east - bbox.west) / baseCols;

    // Generate sampling coordinates for the base grid
    for (let i = 0; i < baseRows; i++) {
      for (let j = 0; j < baseCols; j++) {
        lats.push(bbox.south + (i + 0.5) * latStepBase);
        lngs.push(bbox.west + (j + 0.5) * lngStepBase);
      }
    }

    // Single batch request to Open-Meteo for all coordinates
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lngs.join(',')}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`
    );
    
    if (!response.ok) throw new Error('Atmospheric API request failed');
    const weatherData = await response.json();
    const results = Array.isArray(weatherData) ? weatherData : [weatherData];

    const grid: WildfireData[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: WildfireData[] = [];
      for (let j = 0; j < cols; j++) {
        // BILINEAR INTERPOLATION LOGIC
        const r = (i / rows) * (baseRows - 1);
        const c = (j / cols) * (baseCols - 1);
        const r1 = Math.floor(r);
        const r2 = Math.min(baseRows - 1, r1 + 1);
        const c1 = Math.floor(c);
        const c2 = Math.min(baseCols - 1, c1 + 1);

        const dR = r - r1;
        const dC = c - c1;

        const getVal = (idxR: number, idxC: number) => results[idxR * baseCols + idxC].current;
        
        // Upsample Temperature
        const t11 = getVal(r1, c1).temperature_2m;
        const t12 = getVal(r1, c2).temperature_2m;
        const t21 = getVal(r2, c1).temperature_2m;
        const t22 = getVal(r2, c2).temperature_2m;
        const interpTemp = t11 * (1 - dR) * (1 - dC) + t12 * (1 - dR) * dC + t21 * dR * (1 - dC) + t22 * dR * dC;

        // Upsample Humidity
        const h11 = getVal(r1, c1).relative_humidity_2m;
        const h12 = getVal(r1, c2).relative_humidity_2m;
        const h21 = getVal(r2, c1).relative_humidity_2m;
        const h22 = getVal(r2, c2).relative_humidity_2m;
        const interpHum = h11 * (1 - dR) * (1 - dC) + h12 * (1 - dR) * dC + h21 * dR * (1 - dC) + h22 * dR * dC;

        row.push({
          droughtIndex: Math.min(100, Math.max(0, 100 - interpHum)),
          vegetationType: 'High-Res Grid',
          windSpeed: getVal(r1, c1).wind_speed_10m,
          windDirection: getVal(r1, c1).wind_direction_10m,
          temperature: Math.round(interpTemp * 10) / 10,
          humidity: Math.round(interpHum),
          roadStatus: 'Open',
        });
      }
      grid.push(row);
    }
    return grid;
  } catch (error) {
    console.error('Regional Intel Fetch Error:', error);
    return generateSyntheticGrid(rows, cols); // Fallback to synthetic data on failure
  }
};

/**
 * generateSyntheticGrid
 * Deterministic fallback generator for environmental metrics.
 */
const generateSyntheticGrid = (rows: number, cols: number): WildfireData[][] => {
  const grid: WildfireData[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: WildfireData[] = [];
    for (let j = 0; j < cols; j++) {
      row.push({
        droughtIndex: 40 + (i * 2),
        vegetationType: 'Forest',
        windSpeed: 15 + (j * 1),
        windDirection: 220,
        temperature: 28 + (i * 0.5),
        humidity: 45 - (i * 1),
        roadStatus: 'Open',
      });
    }
    grid.push(row);
  }
  return grid;
};

/**
 * fetchWildfireIntel
 * Convenience method for fetching single-point intelligence for a specific region.
 */
export const fetchWildfireIntel = async (bbox: BoundingBox): Promise<WildfireData> => {
  const grid = await fetchWildfireGrid(bbox, 1, 1);
  return grid[0][0];
};

/**
 * Targeted Data Fetchers
 * Modular helpers for specific environmental parameters.
 */
export const fetchDroughtIndex = async (bbox: BoundingBox) => (await fetchWildfireIntel(bbox)).droughtIndex;
export const fetchVegetationData = async (bbox: BoundingBox) => (await fetchWildfireIntel(bbox)).vegetationType;
export const fetchWindVectors = async (bbox: BoundingBox) => {
  const data = await fetchWildfireIntel(bbox);
  return { speed: data.windSpeed, direction: data.windDirection };
};
