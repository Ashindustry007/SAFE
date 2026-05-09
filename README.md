# SAFE (Smart Analytics for Fire Emergencies)

SAFE is a high-fidelity wildfire intelligence platform designed for real-time fire behavior prediction, regional risk assessment, and emergency response coordination. It utilizes the **Rothermel Surface Fire Spread Model** integrated with real-time environmental data to provide actionable safety analytics.

## 🚀 Intelligent Core Architecture

The platform features a **Hybrid Intelligence System** designed for maximum availability and low latency during emergencies:

### 1. Multi-Provider API Failsafe (Backend)
The intelligence server implements a sequential failover chain across multiple state-of-the-art AI providers to bypass individual quota limits:
- **Groq (Primary)**: Sub-second technical responses using Llama 3.
- **Google Gemini**: High-fidelity environmental reasoning.
- **OpenAI / Mistral**: Robust technical documentation analysis and fallback.
- **Local Fallback**: Instant technical summary if all external APIs are throttled.

### 2. Dual-Layer Frontend Intelligence
- **Local Layer**: Instant response for core platform identity and greetings using word-boundary regex matching.
- **Cloud Layer**: High-fidelity technical analysis routed via the Multi-API server.

## 🌲 Concord Simulation Engine

SAFE features the **Concord Engine**, a state-of-the-art modular simulation suite:
- **3D Topographic Mapping**: High-performance rendering of terrain with procedurally generated elevations and regional vegetation zones.
- **Physics-Based Spread**: Implementation of the Rothermel model accounting for wind vectors, fuel Surface-Area-to-Volume (SAV), moisture damping, and topographic slope.
- **Dynamic Mitigation**: Interactive tools for modeling Helitack water drops and defensive Fireline construction.

## 🛠️ Technical Stack
- **Frontend**: Vite, React, Three.js (React Three Fiber), Framer Motion.
- **Backend**: Node.js, Express, LangChain, OpenAI/Gemini/Groq SDKs.
- **Mapping**: Google Maps JavaScript API.
- **Simulation Logic**: Modular Concord TypeScript engine.

## SAFE
LANDING PAGE
<img width="1799" height="1004" alt="LANDING PAGE" src="https://github.com/user-attachments/assets/8d7c7270-f692-4abc-8ca0-2f7f2c3d3e0b" />
LIVE MAP SIMULATION
<img width="1800" height="1004" alt="LIVE SIMULATION" src="https://github.com/user-attachments/assets/fc7b909d-99f4-4bb1-a75b-6255a7c833c0" />
UNCONTROLLED-CONTROLLED SIMULATION
<img width="1793" height="1073" alt="SIMULATION" src="https://github.com/user-attachments/assets/b402ae2b-c088-4b0f-9026-5f5d3411f8bd" />
RESOURCES
<img width="1800" height="1002" alt="RESOURCES" src="https://github.com/user-attachments/assets/2c7c760a-cb46-44f1-8eaa-eb083b245c71" />
ASSISTANT
<img width="1800" height="1003" alt="ASSISTANT" src="https://github.com/user-attachments/assets/b44dd6cc-ed97-4ef5-92c5-81e8a80d9f77" />


---
### 📚 Project Documentation
- [System Architecture](ARCHITECTURE.md)
- [Simulation Model Details](SIMULATION_MODEL.md)

*Developed for the "Reboot the Earth" Hackathon.*
