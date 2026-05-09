import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { FireState } from '../logic/concord/cell';
import type { Cell } from '../logic/concord/cell';

import { Html } from '@react-three/drei';

interface Terrain3DProps {
  cells: Cell[];
  width: number;
  height: number;
  activeTool: string;
  onCellInteraction: (x: number, y: number) => void;
}

export const Terrain3D: React.FC<Terrain3DProps> = ({ cells, width, height, activeTool, onCellInteraction }) => {
  const [isDragging, setIsDragging] = React.useState(false);

  // Pre-construct geometry with color buffer
  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(width, height, 2, width - 1, height - 1, 1);
    const posAttr = geo.getAttribute('position');
    const colors = new Float32Array(posAttr.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [width, height]);

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
          const color = getCellColor(cell);
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
  }, [cells, geometry, width, height]);

  const handlePointerAction = (e: any) => {
    e.stopPropagation();
    const local = e.object.worldToLocal(e.point.clone());
    const gx = Math.round(local.x + width / 2);
    const gy = Math.round(height / 2 - local.y);
    
    if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
      onCellInteraction(gx, gy);
    }
  };

// Pre-allocate colors to avoid massive garbage collection and WebGL context loss
const COLORS = {
  burning: new THREE.Color('#ff4d00').multiplyScalar(1.8),
  burnt: new THREE.Color('#1a1a1a'),
  extinguished: new THREE.Color('#2e4a3e'),
  river: new THREE.Color('#1f6cb0'),
  fireLine: new THREE.Color('#5d4037'),
  zone0: new THREE.Color('#0a8c20'),
  zone1: new THREE.Color('#7a912e'),
  zone2: new THREE.Color('#00a000')
};

  function getCellColor(cell: Cell) {
    if (cell.fireState === FireState.Burning) return COLORS.burning;
    if (cell.fireState === FireState.Burnt) return COLORS.burnt;
    if (cell.isRiver) return COLORS.river;
    if (cell.isFireLine) return COLORS.fireLine;
    
    switch (cell.zoneIdx) {
      case 0: return COLORS.zone0;
      case 1: return COLORS.zone1;
      case 2: return COLORS.zone2;
      default: return COLORS.zone2;
    }
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
          roughness={0.9} 
          metalness={0.1}
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

      {cells.filter(c => c.fireState === FireState.Burning).slice(0, 5).map((cell, i) => (
        <pointLight
          key={i}
          position={[cell.x - width / 2, cell.baseElevation / 40 + 2, height / 2 - cell.y]}
          color="#ff6a00"
          intensity={15}
          distance={20}
        />
      ))}
    </group>
  );
};
