import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 120
const CONNECTION_DISTANCE = 3.0

function Particles() {
  const pointsRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5
      velocities[i * 3] = (Math.random() - 0.5) * 0.01
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005
      const isCyan = Math.random() > 0.7
      colors[i * 3] = isCyan ? 0 : 0.75
      colors[i * 3 + 1] = isCyan ? 0.96 : 0.1
      colors[i * 3 + 2] = isCyan ? 1 : 0.17
    }
    return { positions, velocities, colors }
  }, [])

  const linePositions = useMemo(() => new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6), [])

  useFrame((state) => {
    if (!pointsRef.current) return
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
    const t = state.clock.elapsedTime

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3
      pos[ix] += velocities[ix] + Math.sin(t + i) * 0.002
      pos[ix + 1] += velocities[ix + 1] + Math.cos(t + i * 0.5) * 0.002
      pos[ix + 2] += velocities[ix + 2]

      const dx = mouseRef.current.x * 10 - pos[ix]
      const dy = mouseRef.current.y * 10 - pos[ix + 1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 3) {
        pos[ix] -= dx * 0.002
        pos[ix + 1] -= dy * 0.002
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true

    if (linesRef.current) {
      let lineIdx = 0
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const dx = pos[i * 3] - pos[j * 3]
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (d < CONNECTION_DISTANCE) {
            linePositions[lineIdx++] = pos[i * 3]
            linePositions[lineIdx++] = pos[i * 3 + 1]
            linePositions[lineIdx++] = pos[i * 3 + 2]
            linePositions[lineIdx++] = pos[j * 3]
            linePositions[lineIdx++] = pos[j * 3 + 1]
            linePositions[lineIdx++] = pos[j * 3 + 2]
          }
        }
      }
      linesRef.current.geometry.setDrawRange(0, lineIdx / 3)
      linesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <group
      onPointerMove={(e) => {
        mouseRef.current = { x: e.pointer.x, y: e.pointer.y }
      }}
    >
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.08} vertexColors sizeAttenuation />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#C0192C" transparent opacity={0.15} />
      </lineSegments>
    </group>
  )
}

export function ParticleField() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile, { passive: true })
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    return <div className="absolute inset-0 pointer-events-none bg-[#050505]/40" />
  }

  return (
    <div className="absolute inset-0 pointer-events-none opacity-60">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }} dpr={[1, 1.5]}>
        <Particles />
      </Canvas>
    </div>
  )
}
