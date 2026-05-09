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

## 🌿 Physical Fuel Models (`FuelConstants`)

SAFE utilizes research-grade constants for different vegetation profiles:

| Property | Grassland | Shrubland | Forest |
|----------|-----------|-----------|--------|
| **SAV Ratio** (Surface Area to Volume) | 2100 | 1672 | 1716 |
| **Net Fuel Load** (lb/ft²) | 0.294 | 0.239 | 0.0459 |
| **Mx** (Moisture of Extinction) | 15% | 30% | 20% |
| **Fuel Bed Depth** (ft) | 3.0 | 1.2 | 0.1 |

## 🧬 Advanced Physics Components

### 1. Moisture Damping
The simulation calculates a non-linear damping coefficient that reduces fire intensity as fuel moisture approaches the extinction limit ($Mx$):
```typescript
const moistureDamping = 1 - (2.59 * r) + (5.11 * r^2) - (3.52 * r^3); // where r = moisture / mx
```

### 2. Vector-Based Spread
SAFE implements **Vector Resultant Spread**, combining environmental forces:
- **Wind Vector**: Oriented based on global weather data.
- **Upslope Vector**: Derived from the local elevation gradient.
- **Effective Wind Speed**: A recalculated value representing the combined "push" of wind and slope on the fire front.

### 3. Burn Index (BI) & Suppression
The model dynamically adjusts behavior based on active suppression:
- **Helitack Drops**: Temporarily increase fuel moisture, lowering reaction intensity.
- **Fire Lines**: Create zero-fuel barriers that stop low-to-medium intensity spread.
- **Burn Index**: Categorizes intensity (Low/Medium/High) to inform evacuation protocols.

## 💻 Implementation Stack
- **Engine Core**: `src/logic/wildfireEngineAdapted.ts`
- **Simulation Loop**: Time-stepped cellular automata.
- **Visuals**: High-performance 3D rendering in `Terrain3D.tsx`.

---
*SAFE Simulation Technical Documentation - Rothermel Implementation v2.1*
