/**
 * SAFE (Simulated Analysis of Fire Ecology) - Thermal Windfield
 * 
 * A high-performance ambient visual component that renders an interactive 
 * "ember" particle field. It utilizes React Three Fiber and custom GLSL 
 * shaders to simulate heat currents and mouse-driven turbulence.
 * 
 * Features:
 * - GPU-accelerated particle system (1200+ particles).
 * - Custom Vertex Shader for swirl/turbulence logic.
 * - Custom Fragment Shader for heat-glow and additive blending.
 * - Interactive mouse repulsion and particle flickering.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ParticleField Component
 * Manages the particle geometry, shader uniforms, and frame-by-frame 
 * position updates.
 */
const ParticleField = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  const count = 1200; 
  
  // Normalized mouse coordinates for shader interaction
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

  /**
   * INITIALIZATION: Attribute Buffers
   * Generates initial positions, sizes, and amber-shaded colors.
   */
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
      
      sz[i] = Math.pow(Math.random(), 2.0) * 8.0 + 1.0; 
      
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

  /**
   * FRAME LOOP
   * Updates time uniforms, mouse lerping, and vertical particle flow.
   */
  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    uniforms.uTime.value = time;
    
    // Scale mouse coordinates to viewport dimensions for shader math
    const targetX = mouseRef.current.x * (viewport.width / 2) * 1.5;
    const targetY = mouseRef.current.y * (viewport.height / 2) * 1.5;
    uniforms.uMouse.value.lerp(new THREE.Vector2(targetX, targetY), 0.1);
    
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      // Simulate upward "heat" flow along Z axis
      positions[i * 3 + 2] += 0.22;
      
      // Infinite wrap-around logic
      if (positions[i * 3 + 2] > 50) {
        positions[i * 3 + 2] = -50;
        positions[i * 3] = (Math.random() - 0.5) * 150;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y = time * 0.002;
  });

  // GLSL: VERTEX SHADER
  // Handles coordinate transformation and mouse-driven turbulence
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
      
      // Ambient oscillation (simulating air currents)
      pos.x += sin(uTime * 0.2 + pos.y * 0.1) * 1.2;
      pos.y += cos(uTime * 0.2 + pos.x * 0.1) * 1.2;
      
      float dist = distance(pos.xy, uMouse);
      vDistance = dist;
      
      // Mouse Interaction: Repulsion and Swirl effect
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
      
      // Stochastic flicker effect (simulating firelight)
      float flicker = (sin(uTime * 15.0 + pos.x) * 0.5 + 0.5) * 0.5;
      vAlpha = 0.7 + flicker; 
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  // GLSL: FRAGMENT SHADER
  // Handles pixel coloring, soft-particle smoothing, and heat-glow mixing
  const fragmentShader = `
    varying float vDistance;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      // Create soft circular point sprite
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      
      // Calculate heat glow intensity based on mouse proximity
      float heat = smoothstep(20.0, 0.0, vDistance);
      vec3 color = mix(vColor, vec3(1.0, 0.8, 0.4), heat * 0.8); 
      
      float glow = pow(1.0 - r * 2.0, 3.0); 
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

/**
 * ThermalWindfield
 * Full-screen background component that hosts the ParticleField.
 */
const ThermalWindfield: React.FC = () => {
  return (
    <div style={{ 
      position: 'absolute', 
      inset: 0, 
      zIndex: 0, 
      pointerEvents: 'none',
      background: 'radial-gradient(circle at center, #020617 0%, #000000 100%)' 
    }}>
      <Canvas 
        camera={{ position: [0, 0, 50], fov: 60 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <ParticleField />
      </Canvas>
    </div>
  );
};

export default ThermalWindfield;
