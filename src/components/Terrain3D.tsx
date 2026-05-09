/**
 * SAFE 3D Terrain Renderer
 * 
 * High-performance WebGL terrain mesh component.
 * Converts 2D grid data and elevation profiles into a dynamic 3D surface.
 * Utilizes BufferAttributes for efficient vertex-level color and position updates,
 * allowing real-time visualization of fire spread on complex topography.
 */

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { FireState } from '../logic/concord/cell';
import type { Cell } from '../logic/concord/cell';
import { DroughtLevel } from '../logic/concord/types';

import { Html } from '@react-three/drei';

const COLORS = {
  burningCore: new THREE.Color('#ffb020'),
  burningFront: new THREE.Color('#ff2a00').multiplyScalar(1.65),
  burnt: new THREE.Color('#1f1f1f'),
  burntCool: new THREE.Color('#3d3530'),
  river: new THREE.Color('#1f6cb0'),
  fireLine: new THREE.Color('#5d4037'),
  dryness: new THREE.Color('#c9a063'),
};

interface Terrain3DProps {
  cells: Cell[];
  width: number;
  height: number;
  activeTool: string;
  /** Model time in minutes (Concord clock); burn coloring uses this with ignition/burnTime. */
  simTime?: number;
  onCellInteraction: (x: number, y: number) => void;
}

export const Terrain3D: React.FC<Terrain3DProps> = ({
  cells,
  width,
  height,
  activeTool,
  simTime = 0,
  onCellInteraction,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  // Pre-construct geometry with color buffer
  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(width, height, 2, width - 1, height - 1, 1);
    const posAttr = geo.getAttribute('position');
    const colors = new Float32Array(posAttr.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [width, height]);

  /**
   * Reactive Update Effect
   * Efficiently updates only the vertex colors when the simulation state changes.
   * This bypasses full mesh re-renders for maximum FPS during fire propagation.
   */
  useEffect(() => {
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);

      // Map world x,y to grid gx, gy with safety clamps
      let gx = Math.round(x + width / 2);
      let gy = Math.round(height / 2 - y);
      
      gx = Math.max(0, Math.min(width - 1, gx));
      gy = Math.max(0, Math.min(height - 1, gy));
      
      const idx = gy * width + gx;
      if (idx >= 0 && idx < cells.length) {
        const cell = cells[idx];
        if (cell && z > 0) {
          posAttr.setZ(i, (cell.baseElevation || 0) / 40);
          const color = getCellColor(cell, simTime);
          colAttr.setXYZ(i, color.r, color.g, color.b);
        } else {
          // Bottom vertex
          posAttr.setZ(i, -10); 
          colAttr.setXYZ(i, 0.1, 0.12, 0.05); 
        }
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }, [cells, geometry, width, height, simTime]);

  const handlePointerAction = (e: any) => {
    e.stopPropagation();
    const local = e.object.worldToLocal(e.point.clone());
    const gx = Math.round(local.x + width / 2);
    const gy = Math.round(height / 2 - local.y);
    
    if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
      onCellInteraction(gx, gy);
    }
  };

  function droughtBlend(zoneIdx: number, droughtLevel: DroughtLevel) {
    const dryT = THREE.MathUtils.clamp(droughtLevel / DroughtLevel.SevereDrought, 0, 1);
    const vegHue = zoneIdx === 0 ? new THREE.Color('#0d7f24') : zoneIdx === 1 ? new THREE.Color('#74932a') : new THREE.Color('#1fb34a');
    return vegHue.clone().lerp(COLORS.dryness, dryT * 0.55);
  }

  function getCellColor(cell: Cell, clock: number) {
    if (cell.fireState === FireState.Burning) {
      const dur = Math.max(cell.burnTime, 1);
      const phase = THREE.MathUtils.clamp((clock - cell.ignitionTime) / dur, 0, 1);
      const spreadBoost = THREE.MathUtils.clamp((cell.spreadRate ?? 0) / 140, 0, 1);
      const intense = THREE.MathUtils.clamp(phase * 0.75 + spreadBoost * 0.35, 0, 1);
      return COLORS.burningCore.clone().lerp(COLORS.burningFront, intense);
    }
    if (cell.fireState === FireState.Burnt) {
      if (cell.isFireSurvivor) return COLORS.burntCool;
      return COLORS.burnt;
    }
    if (cell.isRiver) return COLORS.river;
    if (cell.isFireLine) return COLORS.fireLine;

    return droughtBlend(cell.zoneIdx, cell.zone.droughtLevel);
  }

  return (
    <group>
      <mesh 
        rotation={[-Math.PI / 2.1, 0, 0]} 
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
        <meshStandardMaterial
          vertexColors
          roughness={0.82}
          metalness={0.06}
          emissiveIntensity={0}
          emissive={new THREE.Color('#000000')}
        />

        {/* City Markers */}
        <Html position={[-width * 0.25, height * 0.35, 25]} center style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontFamily: 'sans-serif', fontSize: '11px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            <div style={{ width: 6, height: 6, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.8)' }}></div>
            Skyview
          </div>
        </Html>
        <Html position={[width * 0.1, -height * 0.2, 10]} center style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontFamily: 'sans-serif', fontSize: '11px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            <div style={{ width: 6, height: 6, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.8)' }}></div>
            Rolling Rock
          </div>
        </Html>
        <Html position={[width * 0.35, -height * 0.05, 5]} center style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontFamily: 'sans-serif', fontSize: '11px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            <div style={{ width: 6, height: 6, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.8)' }}></div>
            Evensville
          </div>
        </Html>
      </mesh>
      
      <hemisphereLight intensity={0.6} groundColor="#1a1a1a" color="#ffffff" />

      {cells
        .filter((c) => c.fireState === FireState.Burning)
        .slice(0, 8)
        .map((cell, i) => {
          const spreadBoost = THREE.MathUtils.clamp((cell.spreadRate ?? 0) / 140, 0, 1);
          return (
            <pointLight
              key={`${cell.x}-${cell.y}-${i}`}
              position={[cell.x - width / 2, cell.baseElevation / 40 + 2, height / 2 - cell.y]}
              color="#ff7b2e"
              intensity={8 + spreadBoost * 32}
              distance={18 + spreadBoost * 12}
              decay={2}
            />
          );
        })}
    </group>
  );
};
