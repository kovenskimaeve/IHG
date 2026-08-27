import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import './GlowMaterial'

// Body: a lathe (body of revolution) gives a clean torpedo/whale silhouette
// without needing an actual sculpted model file.
function useBodyGeometry() {
  return useMemo(() => {
    const pts = [
      [0.05, -4.0], [0.35, -3.2], [0.9, -2.0], [1.15, -0.5],
      [1.2, 0.8], [1.0, 2.0], [0.65, 3.0], [0.3, 3.7], [0.03, 4.1],
    ].map(([r, y]) => new THREE.Vector2(r, y))
    const geo = new THREE.LatheGeometry(pts, 48)
    geo.computeVertexNormals()
    return geo
  }, [])
}

function flukeShape() {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.quadraticCurveTo(0.9, -0.1, 1.8, -0.35)
  s.quadraticCurveTo(1.55, -0.55, 1.1, -0.5)
  s.quadraticCurveTo(0.5, -0.3, 0, 0)
  return s
}

function finShape() {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.quadraticCurveTo(0.6, -0.3, 1.35, -1.1)
  s.quadraticCurveTo(0.9, -0.9, 0.4, -0.5)
  s.quadraticCurveTo(0.15, -0.2, 0, 0)
  return s
}

export default function WhaleModel(props) {
  const group = useRef()
  const glowRefs = useRef([])
  const bodyGeo = useBodyGeometry()

  const flukeGeo = useMemo(() => new THREE.ExtrudeGeometry(flukeShape(), { depth: 0.08, bevelEnabled: false }), [])
  const finGeo = useMemo(() => new THREE.ExtrudeGeometry(finShape(), { depth: 0.06, bevelEnabled: false }), [])

  useFrame((state, delta) => {
    if (group.current) group.current.rotation.z += delta * (Math.PI * 2 / 9) * 0.35
    glowRefs.current.forEach((m) => m && (m.uTime = state.clock.elapsedTime))
  })

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0d1a2b', metalness: 0.65, roughness: 0.3, envMapIntensity: 1.2,
  }), [])

  return (
    <group ref={group} {...props}>
      <mesh geometry={bodyGeo} material={bodyMat} castShadow receiveShadow />

      {/* eye */}
      <mesh position={[0.55, 0.15, 3.55]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={2} />
      </mesh>

      {/* tail flukes, mirrored */}
      <mesh geometry={flukeGeo} position={[0.05, -4.05, -0.04]} rotation={[Math.PI / 2.4, 0, 0]} material={bodyMat} />
      <mesh geometry={flukeGeo} position={[0.05, -4.05, -0.04]} rotation={[Math.PI / 2.4, 0, Math.PI]} scale={[1, -1, 1]} material={bodyMat} />

      {/* pectoral fins, mirrored */}
      <mesh geometry={finGeo} position={[1.05, 0.2, 0]} rotation={[0, -0.3, 2.4]} material={bodyMat} />
      <mesh geometry={finGeo} position={[-1.05, 0.2, 0]} rotation={[0, 0.3, -2.4]} scale={[-1, 1, 1]} material={bodyMat} />

      {/* belly glow strip */}
      <mesh position={[0, -0.95, 0]} scale={[0.5, 1, 0.35]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[1, 1, 7.4, 24, 1, true, Math.PI * 0.65, Math.PI * 0.7]} />
        <glowMaterial ref={(el) => (glowRefs.current[0] = el)} uColor="#00d4ff" uIntensity={1.1} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>

      {/* fin-edge glow accents */}
      <mesh geometry={flukeGeo} position={[0.05, -4.05, -0.02]} rotation={[Math.PI / 2.4, 0, 0]} scale={1.03}>
        <primitive object={flukeGeo} attach="geometry" />
        <glowMaterial ref={(el) => (glowRefs.current[1] = el)} uColor="#7b61ff" uIntensity={0.8} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
