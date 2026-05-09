/**
 * SAFE 3D Terrain Renderer
 * 
 * High-performance WebGL terrain mesh component.
 * Converts 2D grid data and elevation profiles into a dynamic 3D surface.
 * Utilizes BufferAttributes for efficient vertex-level color and position updates,
 * allowing real-time visualization of fire spread on complex topography.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { FireState } from '../logic/wildfireTypes';
import type { Cell } from '../logic/wildfireTypes';

interface Terrain3DProps {
  cells: Cell[];
  width: number;
  height: number;
  onCellClick: (x: number, y: number) => void;
}

export const Terrain3D: React.FC<Terrain3DProps> = ({ cells, width, height, onCellClick }) => {
  const geometryRef = useRef<THREE.PlaneGeometry>(null);

  /**
   * Initial Mesh Generation
   * Pre-calculates the position and color arrays for the initial scene render.
   * Elevation is scaled to create a natural vertical profile.
   */
  const { positions, colors } = useMemo(() => {
    const posArr = new Float32Array(width * height * 3);
    const colArr = new Float32Array(width * height * 3);

    cells.forEach((cell, i) => {
      const idx = i * 3;
      // Map grid coordinates to 3D space centers
      posArr[idx] = cell.x - width / 2;
      posArr[idx + 1] = height / 2 - cell.y;
      posArr[idx + 2] = cell.baseElevation / 100; // Elevation scaling factor

      const color = getCellColor(cell);
      colArr[idx] = color.r;
      colArr[idx + 1] = color.g;
      colArr[idx + 2] = color.b;
    });

    return { positions: posArr, colors: colArr };
  }, [width, height, cells.length]);

  /**
   * Reactive Update Effect
   * Efficiently updates only the vertex colors when the simulation state changes.
   * This bypasses full mesh re-renders for maximum FPS during fire propagation.
   */
  useEffect(() => {
    if (!geometryRef.current) return;
    const colorAttr = geometryRef.current.getAttribute('color') as THREE.BufferAttribute;
    
    cells.forEach((cell, i) => {
      const color = getCellColor(cell);
      colorAttr.setXYZ(i, color.r, color.g, color.b);
    });
    colorAttr.needsUpdate = true;
  }, [cells]);

  /**
   * getCellColor
   * Map cell attributes (FireState, Zone, Features) to specific RGB values.
   */
  function getCellColor(cell: Cell) {
    if (cell.fireState === FireState.Burning) {
      return new THREE.Color('#ff9800'); // Active Combustion (Orange)
    }
    if (cell.fireState === FireState.Burnt) {
      return new THREE.Color('#000000'); // Charred Remains (Black)
    }
    if (cell.isRiver) {
      return new THREE.Color('#1976d2'); // Hydrology (Blue)
    }
    if (cell.isFireLine) {
      return new THREE.Color('#795548'); // Defensive Barrier (Brown)
    }
    
    // Regional Vegetation Coloring
    switch (cell.zoneIdx) {
      case 0: return new THREE.Color('#2e7d32'); // Mountains (Dark Green)
      case 1: return new THREE.Color('#4caf50'); // Foothills (Medium Green)
      case 2: return new THREE.Color('#8bc34a'); // Plains (Light Green)
      default: return new THREE.Color('#4caf50');
    }
  }

  return (
    <mesh 
      rotation={[-Math.PI / 3, 0, 0]} 
      onClick={(e) => {
        // Handle raycasted clicks to determine grid coordinates
        e.stopPropagation();
        const point = e.point;
        const gx = Math.round(point.x + width / 2);
        const gy = Math.round(height / 2 - point.y);
        onCellClick(gx, gy);
      }}
    >
      <planeGeometry ref={geometryRef} args={[width, height, width - 1, height - 1]}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </planeGeometry>
      <meshStandardMaterial vertexColors flatShading={true} roughness={0.9} metalness={0.1} />
    </mesh>
  );
};
