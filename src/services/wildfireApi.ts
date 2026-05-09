// Mock service for fetching wildfire-related environmental data

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface WildfireData {
  droughtIndex: number;
  vegetationType: string;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  humidity: number;
  roadStatus: 'Open' | 'Closed' | 'Caution';
}

// Mock service for fetching wildfire-related environmental data
export const fetchWildfireIntel = async (_bbox: BoundingBox): Promise<WildfireData> => {
  // In a real app, we would call NASA POWER or OpenWeather APIs here
  // For now, we simulate a delay and return mock data
  await new Promise(resolve => setTimeout(resolve, 1000));
  
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
