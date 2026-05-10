# SAFE (Simulated Analysis of Fire Ecology)

SAFE is a high-fidelity wildfire intelligence platform designed for real-time fire behavior prediction, regional risk assessment, and emergency response coordination. It utilizes the **Rothermel Surface Fire Spread Model** integrated with real-time environmental data to provide actionable safety analytics.

## 🚀 Intelligent Core Architecture

The platform features a **Hybrid Intelligence System** designed for maximum availability and low latency during emergencies:

### 1. Multi-Provider API Failsafe (Backend)
The intelligence server implements a sequential failover chain across multiple state-of-the-art AI providers to bypass individual quota limits:
- **Groq (Primary)**: Sub-second technical responses using Llama 3.3 70B.
- **Google Gemini**: High-fidelity environmental reasoning using Gemini 2.0 Flash.
- **OpenAI**: Robust technical documentation analysis and fallback.
- **RunPod**: Infrastructure-level fallback for self-hosted LLMs.
- **Local Failsafe**: Instant technical summary if all external APIs are throttled.

### 2. Dual-Layer Frontend Intelligence
- **Local Layer**: Instant response for core platform identity and greetings using optimized regex matching.
- **Cloud Layer**: High-fidelity technical analysis routed via the Multi-API server for complex safety queries.

## 🌲 Concord Simulation Engine

SAFE features the **Concord Engine**, a state-of-the-art modular simulation suite:
- **3D Topographic Mapping**: High-performance rendering of terrain with procedurally generated elevations and regional vegetation zones.
- **Split-Screen Comparison**: Comparative modeling of "Controlled" suppression vs. "Uncontrolled" baseline fire behavior.
- **Physics-Based Spread**: Implementation of the Rothermel model accounting for wind vectors, fuel density, moisture damping, and topographic slope.
- **Dynamic Mitigation**: Interactive tools for modeling **Helitack** water drops and defensive **Fireline** construction.

## 🏥 Decisive Action & Safety
- **Knowledge Assessment**: Interactive wildfire safety quiz to verify user readiness and protocol understanding.
- **Regional Intelligence**: Live atmospheric gradients (wind, temperature, humidity) sourced from the Open-Meteo API.
- **Evacuation Infrastructure**: Real-time traffic overlays and emergency resource mapping for coordinated response.

## 🛠️ Technical Stack
- **Frontend**: Vite, React, Three.js (React Three Fiber), Google Maps API.
- **Backend**: Node.js, Express, Multi-SDK AI Integration.
- **Visualization**: GLSL Shaders for thermal windfields and ember simulations.

## 📸 Platform Overview
### LANDING PAGE
<img width="1799" height="1004" alt="LANDING PAGE" src="https://github.com/user-attachments/assets/8d7c7270-f692-4abc-8ca0-2f7f2c3d3e0b" />

### LIVE MAP SIMULATION
<img width="1800" height="1004" alt="LIVE SIMULATION" src="https://github.com/user-attachments/assets/fc7b909d-99f4-4bb1-a75b-6255a7c833c0" />

### UNCONTROLLED-CONTROLLED SIMULATION
<img width="1799" height="995" alt="SIMULATION_" src="https://github.com/user-attachments/assets/896c5257-b8d5-4fc5-8f3e-42d8c0a067e5" />

### RESOURCES & ASSESSMENT
<img width="1800" height="1002" alt="RESOURCES" src="https://github.com/user-attachments/assets/2c7c760a-cb46-44f1-8eaa-eb083b245c71" />

### INTELLIGENCE ASSISTANT
<img width="1800" height="1003" alt="ASSISTANT" src="https://github.com/user-attachments/assets/b44dd6cc-ed97-4ef5-92c5-81e8a80d9f77" />

---
### 📚 Project Documentation
- [System Architecture](ARCHITECTURE.md)
- [Simulation Model Details](SIMULATION_MODEL.md)

*Developed for the "Reboot the Earth" Hackathon.*
