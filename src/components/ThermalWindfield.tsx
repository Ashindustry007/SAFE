import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const ParticleField = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const { mouse, viewport } = useThree();

  const count = 4000;
  
  // Initialize particles with a wider spread
  const [positions, velocities, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Much wider spread to fill the entire background
      pos[i * 3] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      
      vel[i * 3] = (Math.random() - 0.5) * 0.05;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
      
      sz[i] = Math.random() * 2.0 + 0.5;
    }
    return [pos, vel, sz];
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uRes: { value: new THREE.Vector2(viewport.width, viewport.height) },
    uColor1: { value: new THREE.Color('#ea580c') },
    uColor2: { value: new THREE.Color('#fbbf24') },
    uColor3: { value: new THREE.Color('#ffffff') },
  }), [viewport]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    uniforms.uTime.value = time;
    
    // Fix mouse scaling: map normalized (-1 to 1) to world space (~ -60 to 60)
    const targetX = mouse.x * (viewport.width / 2) * 1.5;
    const targetY = mouse.y * (viewport.height / 2) * 1.5;
    uniforms.uMouse.value.lerp(new THREE.Vector2(targetX, targetY), 0.1);
    
    pointsRef.current.rotation.y = time * 0.01;
    pointsRef.current.rotation.x = time * 0.005;
  });

  const vertexShader = `
    uniform float uTime;
    uniform vec2 uMouse;
    attribute float size;
    attribute vec3 velocity;
    varying float vDistance;
    varying float vAlpha;
    varying vec2 vScreenPos;

    void main() {
      vec3 pos = position;
      
      // Wind movement
      pos.x += sin(uTime * 0.3 + pos.y * 0.1) * 2.0;
      pos.y += cos(uTime * 0.2 + pos.x * 0.1) * 2.0;
      
      // Stronger mouse interaction
      float dist = distance(pos.xy, uMouse);
      vDistance = dist;
      
      if (dist < 25.0) {
        vec2 dir = normalize(pos.xy - uMouse);
        float force = pow(1.0 - dist / 25.0, 2.0);
        
        // Swirl effect
        float angle = uTime * 2.0;
        vec2 swirl = vec2(dir.x * cos(angle) - dir.y * sin(angle), dir.x * sin(angle) + dir.y * cos(angle));
        pos.xy += swirl * force * 4.0;
        pos.xy += dir * force * 2.0;
      }
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (1200.0 / -mvPosition.z);
      
      // Project to screen space for UI masking
      vec4 clipPos = projectionMatrix * mvPosition;
      vScreenPos = clipPos.xy / clipPos.w;
      
      float flicker = (sin(uTime * 12.0 + pos.x * 10.0) * 0.5 + 0.5) * 0.4;
      vAlpha = 0.3 + flicker;
      
      gl_Position = clipPos;
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform float uTime;
    varying float vDistance;
    varying float vAlpha;
    varying vec2 vScreenPos;

    void main() {
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      
      float heat = smoothstep(25.0, 0.0, vDistance);
      vec3 color = mix(uColor1, uColor2, heat);
      color = mix(color, uColor3, pow(heat, 4.0));
      
      float noise = sin(gl_PointCoord.x * 8.0 + uTime) * sin(gl_PointCoord.y * 8.0 + uTime);
      color += noise * 0.05;
      
      float glow = pow(1.0 - r * 2.0, 2.0);
      
      // UI MASKING: Dim particles behind text areas
      float finalAlpha = vAlpha;
      
      // Center Title Mask (NDC: x [-0.6, 0.6], y [-0.2, 0.4])
      if (abs(vScreenPos.x) < 0.6 && vScreenPos.y > -0.2 && vScreenPos.y < 0.5) {
        finalAlpha *= 0.2;
      }
      
      // Bottom Cards Mask (NDC: x [-1.0, 1.0], y [-1.0, -0.4])
      if (vScreenPos.y < -0.4) {
        finalAlpha *= 0.15;
      }

      gl_FragColor = vec4(color, glow * finalAlpha);
    }
  `;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
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
      background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 50%, #020617 100%)' 
    }}>
      <Canvas camera={{ position: [0, 0, 50], fov: 60 }}>
        <fog attach="fog" args={['#020617', 30, 100]} />
        <ParticleField />
      </Canvas>
    </div>
  );
};

export default ThermalWindfield;
