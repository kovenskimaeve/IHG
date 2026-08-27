import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Approximates volumetric fog with soft radial-gradient sprites instead of
// true raymarching — much cheaper, and reads convincingly as mist at this
// scale. Canvas-generated texture, no external assets needed.
function useMistTexture() {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(180,210,230,0.9)')
    grad.addColorStop(0.5, 'rgba(120,160,190,0.35)')
    grad.addColorStop(1, 'rgba(120,160,190,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [])
}

export default function MistSprites() {
  const texture = useMistTexture()
  const group = useRef()

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    group.current.children.forEach((sprite, i) => {
      sprite.material.opacity = 0.18 + 0.08 * Math.sin(t * 0.3 + i * 2)
    })
  })

  const puffs = useMemo(() => ([
    { pos: [-2, -3, -2], scale: 9 },
    { pos: [3, 2, -4], scale: 11 },
    { pos: [-3, 3, -3], scale: 7 },
    { pos: [1, -2.5, -5], scale: 8 },
  ]), [])

  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <sprite key={i} position={p.pos} scale={[p.scale, p.scale, 1]}>
          <spriteMaterial map={texture} transparent depthWrite={false} opacity={0.2} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  )
}
