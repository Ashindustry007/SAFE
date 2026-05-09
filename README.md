# SAFE 🛰️ - Smart Analytics for Fire Emergencies

**SAFE** is a high-fidelity wildfire intelligence and simulation platform designed to empower first responders and environmental agencies with real-time risk assessment and predictive fire modeling.

![SAFE Dashboard Mockup](safe_wildfire_dashboard_mockup_1778295236468.png)

## 🌟 Key Features

- **Environmental Intelligence Dashboard**: Real-time integration of meteorological data including temperature, humidity, wind velocity, and drought indices.
- **High-Resolution Risk Mapping**: Interactive Google Maps integration with custom styling and regional risk overlays.
- **3D Physics-Based Simulation**: A sophisticated fire spread engine based on the **Rothermel Surface Fire Spread Model**, accounting for fuel types, moisture, wind, and topography.
- **Interactive Terrain**: 3D terrain visualization using `react-three-fiber` and `Three.js` for immersive simulation analysis.
- **Predictive Analytics**: Dynamic fire risk scoring (0-100%) calculated from environmental sensory data.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **3D Graphics**: Three.js, @react-three/fiber, @react-three/drei
- **Mapping**: Google Maps JavaScript API
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Data Handling**: Axios, LocalStorage Caching

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Google Maps API Key (with Maps JavaScript API enabled)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd SAFE
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory and add your Google Maps API Key:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 🧠 The Simulation Engine

Unlike simple grid-based cellular automata, SAFE utilizes an adapted **Rothermel Model**. This allows the simulation to factor in:
- **Fuel Bed Properties**: Specific heat content, mineral content, and packing ratios for Grass, Shrub, and Forest ecosystems.
- **Moisture Damping**: How fuel moisture content inhibits fire spread.
- **Topographical Effects**: Slope-driven fire acceleration.
- **Wind Vectoring**: Dynamic influence of wind direction and speed on spread rates.

For a detailed deep dive into the math, see [SIMULATION_MODEL.md](./SIMULATION_MODEL.md).

## 📂 Project Structure

- `src/components`: UI components and 3D views.
- `src/logic`: Core simulation engines and mathematical models.
- `src/services`: API integrations for wildfire intelligence.
- `src/assets`: Static assets and styling.

## 🔮 Future Roadmap

- [ ] Real-time IoT sensor integration (LoRaWAN/MQTT).
- [ ] Satellite imagery overlay (Sentinel-2/MODIS).
- [ ] Multi-scenario comparison tools.
- [ ] Mobile-optimized field responder view.

---

Built with ❤️ for **Reboot the Earth Hackathon**.

