/**
 * Terrain3D (Concord parity)
 *
 * This follows Concord's approach from `view-3d/terrain.tsx`:
 * - one PlaneGeometry with (gridWidth x gridHeight) vertices
 * - vertex colors updated per cell state
 * - elevation applied per vertex (scaled from ft -> view units)
 */

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

import type { Cell } from '../logic/concord/cell';
import { BurnIndex, FireState } from '../logic/concord/cell';
import { DroughtLevel } from '../logic/concord/types';

const PLANE_WIDTH = 1;

const getTerrainColor = (droughtLevel: number): [number, number, number, number] => {
  switch (droughtLevel) {
    case DroughtLevel.NoDrought:
      return [0.008, 0.831, 0.039, 1];
    case DroughtLevel.MildDrought:
      return [0.573, 0.839, 0.216, 1];
    case DroughtLevel.MediumDrought:
      return [0.757, 0.886, 0.271, 1];
    default:
      return [0.784, 0.631, 0.271, 1];
  }
};

const BURNING_COLOR: [number, number, number, number] = [1, 0, 0, 1];
const BURNT_COLOR: [number, number, number, number] = [0.2, 0.2, 0.2, 1];
const FIRE_LINE_UNDER_CONSTRUCTION_COLOR: [number, number, number, number] = [0.5, 0.5, 0, 1];

const BURN_INDEX_LOW: [number, number, number, number] = [1, 0.7, 0, 1];
const BURN_INDEX_MEDIUM: [number, number, number, number] = [1, 0.5, 0, 1];
const BURN_INDEX_HIGH: [number, number, number, number] = [1, 0, 0, 1];

const burnIndexColor = (burnIndex: BurnIndex): [number, number, number, number] => {
  if (burnIndex === BurnIndex.Low) return BURN_INDEX_LOW;
  if (burnIndex === BurnIndex.Medium) return BURN_INDEX_MEDIUM;
  return BURN_INDEX_HIGH;
};

const vertexIdx = (cell: Cell, gridWidth: number, gridHeight: number) =>
  (gridHeight - 1 - cell.y) * gridWidth + cell.x;

interface Terrain3DProps {
  cells: Cell[];
  gridWidth: number;
  gridHeight: number;
  modelWidthFt: number;
  modelHeightFt: number;
  activeTool: string;
  simTime?: number;
  showBurnIndex?: boolean;
  riverColor?: [number, number, number, number];
  onCellInteraction: (x: number, y: number) => void;
}

export const Terrain3D: React.FC<Terrain3DProps> = ({
  cells,
  gridWidth,
  gridHeight,
  modelWidthFt,
  modelHeightFt,
  activeTool,
  simTime = 0,
  showBurnIndex = true,
  riverColor = [0.067, 0.529, 0.882, 1],
  onCellInteraction,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const planeHeight = (modelHeightFt * PLANE_WIDTH) / modelWidthFt;
  const ftToViewUnit = PLANE_WIDTH / modelWidthFt;

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(PLANE_WIDTH, planeHeight, gridWidth - 1, gridHeight - 1);
    // 4 floats per vertex (rgba)
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(gridWidth * gridHeight * 4).fill(0), 4));
    return geo;
  }, [gridWidth, gridHeight, planeHeight]);

  useEffect(() => {
    const posArray = (geometry.attributes.position.array as number[]);
    cells.forEach((cell) => {
      const zAttrIdx = vertexIdx(cell, gridWidth, gridHeight) * 3 + 2;
      posArray[zAttrIdx] = cell.elevation * ftToViewUnit;
    });
    geometry.computeVertexNormals();
    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }, [cells, geometry, gridWidth, gridHeight, ftToViewUnit]);

  useEffect(() => {
    const colArray = (geometry.attributes.color.array as number[]);
    cells.forEach((cell) => {
      const idx = vertexIdx(cell, gridWidth, gridHeight) * 4;
      let color: [number, number, number, number];
      if (cell.fireState === FireState.Burning) {
        color = showBurnIndex ? burnIndexColor(cell.burnIndex) : BURNING_COLOR;
      } else if (cell.fireState === FireState.Burnt) {
        color = cell.isFireSurvivor ? getTerrainColor(cell.droughtLevel) : BURNT_COLOR;
      } else if (cell.isRiver) {
        color = riverColor;
      } else if (cell.isFireLineUnderConstruction) {
        color = FIRE_LINE_UNDER_CONSTRUCTION_COLOR;
      } else {
        color = getTerrainColor(cell.droughtLevel);
      }
      colArray[idx + 0] = color[0];
      colArray[idx + 1] = color[1];
      colArray[idx + 2] = color[2];
      colArray[idx + 3] = color[3];
    });
    (geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }, [cells, geometry, gridWidth, gridHeight, showBurnIndex, riverColor, simTime]);

  const handlePointerAction = (e: any) => {
    e.stopPropagation();
    const local = e.object.worldToLocal(e.point.clone());
    // local.x, local.y are in view units around plane center.
    const u = THREE.MathUtils.clamp((local.x / PLANE_WIDTH) + 0.5, 0, 1);
    const v = THREE.MathUtils.clamp((local.y / planeHeight) + 0.5, 0, 1);
    const gx = Math.min(gridWidth - 1, Math.max(0, Math.floor(u * gridWidth)));
    const gy = Math.min(gridHeight - 1, Math.max(0, Math.floor((1 - v) * gridHeight)));
    onCellInteraction(gx, gy);
  };

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
        frustumCulled={false}
        onPointerDown={(e) => {
          setIsDragging(true);
          handlePointerAction(e);
        }}
        onPointerUp={() => setIsDragging(false)}
        onPointerMove={(e) => {
          if (isDragging && activeTool === 'FIRELINE') {
            handlePointerAction(e);
          }
        }}
        onClick={(e) => {
          if (activeTool !== 'FIRELINE') {
            handlePointerAction(e);
          }
        }}
      >
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0.0} />

        {/* City Markers */}
        <Html position={[-0.25, planeHeight * 0.35, 0.02]} center style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontFamily: 'sans-serif', fontSize: '11px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            <div style={{ width: 6, height: 6, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.8)' }}></div>
            Skyview
          </div>
        </Html>
        <Html position={[0.1, -planeHeight * 0.2, 0.02]} center style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontFamily: 'sans-serif', fontSize: '11px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            <div style={{ width: 6, height: 6, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.8)' }}></div>
            Rolling Rock
          </div>
        </Html>
        <Html position={[0.35, -planeHeight * 0.05, 0.02]} center style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontFamily: 'sans-serif', fontSize: '11px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            <div style={{ width: 6, height: 6, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.8)' }}></div>
            Evensville
          </div>
        </Html>
      </mesh>
      
      <hemisphereLight intensity={0.55} groundColor="#1a1a1a" color="#ffffff" />
    </group>
  );
};
