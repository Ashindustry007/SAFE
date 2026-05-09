/**
 * SAFE Environmental Intelligence Service
 * 
 * Provides an abstraction layer for fetching real-time sensory data
 * including wind vectors, humidity, temperature, and vegetation dryness.
 * Currently uses a mock implementation with hourly caching logic in the App layer.
 */

/**
 * BoundingBox
 * Geographic coordinates for regional intelligence queries.
 */
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * WildfireData
 * Unified model for sensory intelligence required by the Rothermel engine.
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
 * fetchWildfireIntel
 * Aggregates multiple environmental data points for a specific region.
 * 
 * @param _bbox - Target geographic bounding box
 * @returns Comprehensive wildfire intelligence object
 */
export const fetchWildfireIntel = async (_bbox: BoundingBox): Promise<WildfireData> => {
  // SIMULATION: In a production environment, this would integrate with
  // NASA POWER (Climatology) and OpenWeather (Current Conditions) APIs.
  await new Promise(resolve => setTimeout(resolve, 800)); // Network latency simulation
  
  return {
    droughtIndex: Math.floor(Math.random() * 100),
    vegetationType: ['Forest', 'Grassland', 'Shrubland', 'Savanna'][Math.floor(Math.random() * 4)],
    windSpeed: Math.floor(Math.random() * 50),
    windDirection: Math.floor(Math.random() * 360),
    temperature: Math.floor(Math.random() * 40) + 10,
    humidity: Math.floor(Math.random() * 100),
    roadStatus: ['Open', 'Closed', 'Caution'][Math.floor(Math.random() * 3)] as 'Open' | 'Closed' | 'Caution',
  };
};

/**
 * Specialized Data Fetchers
 * Modular helpers for targeted intelligence retrieval.
 */

export const fetchDroughtIndex = async (bbox: BoundingBox) => {
  return (await fetchWildfireIntel(bbox)).droughtIndex;
};

export const fetchVegetationData = async (bbox: BoundingBox) => {
  return (await fetchWildfireIntel(bbox)).vegetationType;
};

export const fetchWindVectors = async (bbox: BoundingBox) => {
  const data = await fetchWildfireIntel(bbox);
  return { speed: data.windSpeed, direction: data.windDirection };
};
