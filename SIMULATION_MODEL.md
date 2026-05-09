# Wildfire Simulation Model: Rothermel Adaptation

The core of SAFE's predictive capability is an adaptation of the **Rothermel Surface Fire Spread Model**, which is the gold standard for fire behavior modeling in the United States (used in tools like BehavePlus).

## 🧮 Mathematical Foundation

The rate of fire spread ($R$) is calculated using the following primary components:

$$R = \frac{I_R \cdot \phi_w \cdot \phi_s}{\rho_b \cdot \epsilon \cdot Q_{ig}}$$

Where:
- **$I_R$**: Reaction Intensity (energy released per unit area per unit time).
- **$\phi_w$**: Wind Factor.
- **$\phi_s$**: Slope Factor.
- **$\rho_b$**: Bulk Density of the fuel.
- **$\epsilon$**: Effective Heating Number.
- **$Q_{ig}$**: Heat of Pre-ignition.

## 🌿 Fuel Constants (`FuelConstants`)

We model different vegetation types with specific physical properties:

| Property | Grass | Shrub | Forest |
|----------|-------|-------|--------|
| **SAV** (Surface Area to Volume) | 2100 | 1672 | 1716 |
| **Fuel Load** (lb/ft²) | 0.294 | 0.239 | 0.0459 |
| **Mx** (Moisture of Extinction) | 0.15 | 0.30 | 0.20 |

## 💧 Moisture Damping

The simulation calculates a **Moisture Damping Coefficient**. As fuel moisture increases relative to the moisture of extinction ($Mx$), the fire spread rate decreases non-linearly.

```typescript
const moistureDampingCoefficient = 1 - (2.59 * moistureContentRatio) + (5.11 * Math.pow(moistureContentRatio, 2)) - (3.52 * Math.pow(moistureContentRatio, 3));
```

## 🌬️ Wind and Slope Vectoring

Unlike simple models, SAFE uses **vector addition** to combine the influence of wind and terrain slope.

1. **Wind Vector**: Calculated based on direction and speed, scaled by the `windFactor`.
2. **Upslope Vector**: Calculated from the elevation gradient between cells.
3. **Resultant Vector**: The fire "prefers" to spread in the direction of the combined vector.

## 🏁 Burn Index (BI)

The `getBurnIndex` function categorizes the fire intensity:
- **Low**: Controllable by ground crews.
- **Medium**: May require heavy equipment or aerial support.
- **High**: Dangerous; requires evacuation and large-scale suppression.

## 💻 Implementation Details

- **File**: `src/logic/wildfireEngineAdapted.ts`
- **Functions**:
    - `getFireSpreadRate()`: The core physics calculator.
    - `stepSimulation()`: Advances the grid state by applying the spread rates over time ($\Delta t$).
    - `getMoistureContent()`: Simulates how local factors like rivers or fire suppression drops (helitack) affect fuel moisture.
