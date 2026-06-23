import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function TorusKnot() {
  const meshRef = useRef<THREE.Mesh>(null)
  const targetRot = useRef({ x: 0, y: 0 })

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.rotation.x += 0.002
    meshRef.current.rotation.y += 0.003
    meshRef.current.rotation.x += (targetRot.current.x - meshRef.current.rotation.x) * 0.03
    meshRef.current.rotation.y += (targetRot.current.y - meshRef.current.rotation.y) * 0.03
  })

  return (
    <mesh
      ref={meshRef}
      onPointerMove={(e) => {
        targetRot.current = { x: e.pointer.y * 0.5, y: e.pointer.x * 0.5 }
      }}
    >
      <torusKnotGeometry args={[3, 0.4, 128, 16]} />
      <meshBasicMaterial color="#C0192C" wireframe transparent opacity={0.12} />
    </mesh>
  )
}

export function TorusScene() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 12], fov: 50 }} style={{ background: 'transparent' }}>
        <TorusKnot />
      </Canvas>
    </div>
  )
}
