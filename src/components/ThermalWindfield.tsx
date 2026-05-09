import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const ParticleField = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  const count = 1200; // Increased count for better visibility
  
  // Use a ref for global mouse coordinates
  const mouseRef = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.set(x, y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const [positions, sizes, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const col = new Float32Array(count * 3);
    
    const amberShades = [
      new THREE.Color('#92400e'), // Medium Amber
      new THREE.Color('#b45309'), // Deep Golden Amber
      new THREE.Color('#f59e0b'), // Bright Amber
      new THREE.Color('#d97706'), // Darker Golden Amber
    ];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 150;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
      
      sz[i] = Math.pow(Math.random(), 2.0) * 8.0 + 1.0; // Larger particles
      
      const color = amberShades[Math.floor(Math.random() * amberShades.length)];
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }
    return [pos, sz, col];
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  }), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    uniforms.uTime.value = time;
    
    const targetX = mouseRef.current.x * (viewport.width / 2) * 1.5;
    const targetY = mouseRef.current.y * (viewport.height / 2) * 1.5;
    uniforms.uMouse.value.lerp(new THREE.Vector2(targetX, targetY), 0.1);
    
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 2] += 0.22;
      if (positions[i * 3 + 2] > 50) {
        positions[i * 3 + 2] = -50;
        positions[i * 3] = (Math.random() - 0.5) * 150;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y = time * 0.002;
  });

  const vertexShader = `
    uniform float uTime;
    uniform vec2 uMouse;
    attribute float size;
    attribute vec3 color;
    varying float vDistance;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vec3 pos = position;
      vColor = color;
      
      pos.x += sin(uTime * 0.2 + pos.y * 0.1) * 1.2;
      pos.y += cos(uTime * 0.2 + pos.x * 0.1) * 1.2;
      
      float dist = distance(pos.xy, uMouse);
      vDistance = dist;
      
      if (dist < 20.0) {
        vec2 dir = normalize(pos.xy - uMouse);
        float force = pow(1.0 - dist / 20.0, 1.5);
        float angle = uTime * 2.0;
        vec2 swirl = vec2(dir.x * cos(angle) - dir.y * sin(angle), dir.x * sin(angle) + dir.y * cos(angle));
        pos.xy += swirl * force * 4.0;
        pos.xy += dir * force * 5.0;
      }
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (1600.0 / -mvPosition.z);
      
      float flicker = (sin(uTime * 15.0 + pos.x) * 0.5 + 0.5) * 0.5;
      vAlpha = 0.7 + flicker; // Much brighter baseline alpha
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying float vDistance;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      
      float heat = smoothstep(20.0, 0.0, vDistance);
      vec3 color = mix(vColor, vec3(1.0, 0.8, 0.4), heat * 0.8); // Intense amber heat glow
      
      float glow = pow(1.0 - r * 2.0, 3.0); // Tighter glow for sharper look
      gl_FragColor = vec4(color, glow * vAlpha);
    }
  `;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={sizes.length} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const ThermalWindfield: React.FC = () => {
  return (
    <div style={{ 
      position: 'absolute', 
      inset: 0, 
      zIndex: 0, 
      pointerEvents: 'none',
      background: 'radial-gradient(circle at center, #020617 0%, #000000 100%)' // Even darker background
    }}>
      <Canvas 
        camera={{ position: [0, 0, 50], fov: 60 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        {/* Fog removed for maximum visibility */}
        <ParticleField />
      </Canvas>
    </div>
  );
};

export default ThermalWindfield;
