# Wildfire Simulation Model: Rothermel Adaptation

The core of SAFE's predictive capability is a high-fidelity implementation of the **Rothermel Surface Fire Spread Model**, the globally recognized standard for operational fire behavior modeling.

## 🧮 Mathematical Foundation

The rate of fire spread ($R$) is derived from the balance of heat received by potential fuel vs. the heat required for ignition:

$$R = \frac{I_R \cdot \phi_w \cdot \phi_s}{\rho_b \cdot \epsilon \cdot Q_{ig}}$$

### Variable Definitions:
- **Reaction Intensity ($I_R$)**: The energy released per unit area per unit time, influenced by mineral and moisture damping.
- **Wind Factor ($\phi_w$)**: Non-linear scaling of spread rate based on wind speed and direction.
- **Slope Factor ($\phi_s$)**: The impact of topographic gradient on pre-heating fuel.
- **Bulk Density ($\rho_b$)**: The mass of fuel per unit volume of the fuel bed.
- **Effective Heating Number ($\epsilon$)**: The fraction of fuel mass that must be heated to ignition.
- **Heat of Pre-ignition ($Q_{ig}$)**: The energy required to bring fuel to ignition temperature.

## 🌍 Environmental Intelligence

### 1. High-Resolution Gradients
SAFE fetches sparse meteorological data from the **Open-Meteo API** and utilizes **Bilinear Interpolation** to upsample to a high-density predictive grid. This ensures that micro-climatic variations in temperature and humidity are captured.

### 2. Moisture of Extinction (Mx)
The model dynamically maps drought indices to fuel moisture percentages. As moisture approaches the extinction limit ($Mx$), the reaction intensity drops non-linearly:
```typescript
const moistureDamping = 1 - (2.59 * r) + (5.11 * r^2) - (3.52 * r^3); // where r = currentMoisture / Mx
```

## 🧬 Physical Fuel Models (`FuelConstants`)

The Concord Engine utilizes research-grade constants for different vegetation profiles:

| Property | Grassland | Shrubland | Forest |
|----------|-----------|-----------|--------|
| **SAV Ratio** (Surface Area to Volume) | 2100 | 1672 | 1716 |
| **Net Fuel Load** (lb/ft²) | 0.294 | 0.239 | 0.0459 |
| **Mx** (Moisture of Extinction) | 15% | 30% | 20% |
| **Fuel Bed Depth** (ft) | 3.0 | 1.2 | 0.1 |

## 🕹️ Simulation Components

### 1. Vector Resultant Spread
The engine calculates the **resultant vector** of fire spread by combining:
- **Wind Vector**: Oriented based on live atmospheric data.
- **Upslope Vector**: Derived from the local elevation gradient (DEM).

### 2. Probabilistic Transition
In the 2D Live View, transitions are governed by a probabilistic cellular automata model ($P_{ignition}$):
- **Base Rate**: Baseline probability of ignition.
- **Environmental Multipliers**: Non-linear scaling for wind intensity and topographic slope.

### 3. Suppression Impact
- **Helitack Drops**: Temporarily increase fuel moisture, lowering reaction intensity.
- **Fire Lines**: Create zero-fuel barriers that stop low-to-medium intensity spread.

## 💻 Technical Implementation
- **Physics Core**: `src/logic/concord/engine/get-fire-spread-rate.ts`
- **Spread Controller**: `src/utils/fireSimulation.ts`
- **Environmental Logic**: `src/services/wildfireApi.ts`
- **3D Logic Controller**: `src/logic/concord/engine/fire-engine.ts`

---
*SAFE Simulation Technical Documentation - Final Implementation (v4.0)*
