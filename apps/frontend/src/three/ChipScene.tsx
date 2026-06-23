import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

const LABELS = [
  { text: 'Embedded C', position: [1.4, 1.4, 1.4] as [number, number, number], color: '#FF2040' },
  { text: 'LPC2129', position: [-1.4, 1.4, -1.4] as [number, number, number], color: '#FF2040' },
  { text: 'RTOS', position: [1.4, -1.4, -1.4] as [number, number, number], color: '#00F5FF' },
  { text: 'Linux', position: [-1.4, -1.4, 1.4] as [number, number, number], color: '#00F5FF' },
  { text: 'CAN 2.0', position: [0, 1.8, 0.5] as [number, number, number], color: '#FF2040' },
  { text: 'UART', position: [1.8, 0, -0.5] as [number, number, number], color: '#00F5FF' },
  { text: 'SPI', position: [-1.8, 0, 0.5] as [number, number, number], color: '#FF2040' },
  { text: 'I2C', position: [0, -1.8, -0.5] as [number, number, number], color: '#00F5FF' },
  { text: 'GPIO', position: [0.5, 0.5, 1.8] as [number, number, number], color: '#FF2040' },
  { text: 'ADC', position: [-0.5, -0.5, -1.8] as [number, number, number], color: '#00F5FF' },
]

function SceneContent() {
  const chipRef = useRef<THREE.Group>(null)
  const ring1Ref = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const ring3Ref = useRef<THREE.Mesh>(null)
  const light1Ref = useRef<THREE.PointLight>(null)
  const targetRot = useRef({ x: 0, y: 0 })

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (chipRef.current) {
      chipRef.current.rotation.y += 0.003
      chipRef.current.rotation.x += 0.001
      chipRef.current.rotation.x += (targetRot.current.x - chipRef.current.rotation.x) * 0.05
      chipRef.current.rotation.y += (targetRot.current.y - chipRef.current.rotation.y) * 0.05
    }

    if (ring1Ref.current) ring1Ref.current.rotation.z += 0.005
    if (ring2Ref.current) ring2Ref.current.rotation.x += 0.004
    if (ring3Ref.current) ring3Ref.current.rotation.y += 0.003

    if (light1Ref.current) {
      light1Ref.current.intensity = 1.0 + Math.sin(t * Math.PI) * 0.5
      light1Ref.current.position.x = Math.cos(t) * 3
      light1Ref.current.position.z = Math.sin(t) * 3
    }
  })

  return (
    <group
      onPointerMove={(e) => {
        targetRot.current = { x: e.pointer.y * 0.4, y: e.pointer.x * 0.4 }
      }}
    >
      <ambientLight intensity={0.4} />
      <pointLight ref={light1Ref} color="#FF2040" intensity={2} distance={8} />
      <directionalLight color="#00F5FF" intensity={1.5} position={[3, 3, 3]} />

      {/* Main Chip Group (left empty to maintain rotation/interaction references without rendering the physical chip body) */}
      <group ref={chipRef} />

      {/* Orbiting Signal Rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 6, 0, 0]}>
        <torusGeometry args={[2.2, 0.015, 8, 64]} />
        <meshBasicMaterial color="#FF2040" transparent opacity={0.35} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.5, 0.015, 8, 64]} />
        <meshBasicMaterial color="#FF2040" transparent opacity={0.35} />
      </mesh>
      <mesh ref={ring3Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.8, 0.015, 8, 64]} />
        <meshBasicMaterial color="#00F5FF" transparent opacity={0.3} />
      </mesh>

      {/* Dynamic Skill Labels */}
      {LABELS.map((label, i) => (
        <Html key={label.text} position={label.position} center>
          <span
            className="font-mono text-[10px] whitespace-nowrap px-1.5 py-0.5 rounded border transition-all duration-300 bg-black/40"
            style={{
              color: label.color,
              borderColor: `${label.color}30`,
              textShadow: `0 0 6px ${label.color}`,
              opacity: 0.5 + Math.abs(Math.sin(Date.now() / 1500 + i)) * 0.5,
            }}
          >
            {label.text}
          </span>
        </Html>
      ))}
    </group>
  )
}

interface ChipSceneProps {
  className?: string
}

export function ChipScene({ className = '' }: ChipSceneProps) {
  return (
    <div className={`h-[400px] w-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <SceneContent />
      </Canvas>
    </div>
  )
}
