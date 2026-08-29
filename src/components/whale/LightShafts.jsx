import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Real geometry for "light piercing through from above," not just bloom —
// tall planes with a top-to-bottom gradient texture, additively blended,
// angled down from the surface toward the whale.

function useShaftTexture() {
  return useMemo(() => {
    const w = 64, h = 256
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, 'rgba(220,240,255,0.85)')
    grad.addColorStop(0.5, 'rgba(180,220,240,0.25)')
    grad.addColorStop(1, 'rgba(180,220,240,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    return new THREE.CanvasTexture(canvas)
  }, [])
}

export default function LightShafts() {
  const texture = useShaftTexture()
  const group = useRef()

  const shafts = useMemo(() => ([
    { x: -2.2, z: -1, w: 1.8, h: 14, rotY: 0.15, rotZ: 0.08 },
    { x: 1.5, z: -2.5, w: 1.2, h: 12, rotY: -0.1, rotZ: -0.05 },
    { x: 0.2, z: 1.5, w: 2.2, h: 15, rotY: 0.05, rotZ: 0.1 },
  ]), [])

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    group.current.children.forEach((mesh, i) => {
      mesh.material.opacity = 0.28 + 0.1 * Math.sin(t * 0.25 + i * 3)
    })
  })

  return (
    <group ref={group}>
      {shafts.map((s, i) => (
        <mesh key={i} position={[s.x, 3, s.z]} rotation={[0, s.rotY, s.rotZ]}>
          <planeGeometry args={[s.w, s.h]} />
          <meshBasicMaterial
            map={texture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            opacity={0.3}
          />
        </mesh>
      ))}
    </group>
  )
}
