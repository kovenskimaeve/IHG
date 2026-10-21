import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Real scanned/rigged model (credit: Sketchfab, CC Attribution — see footer).
// Plays its own baked swimming animation, spins slowly, bobs gently, and
// can be tinted via the `tint` prop (multiplies over the real texture, so
// detail is kept even when recolored).

export default function WhaleModel({ tint, ...props }) {
  const group = useRef()
  const { scene, animations } = useGLTF('/models/whale.glb')
  const { actions } = useAnimations(animations, group)
  const materials = useRef([])

  useEffect(() => {
    const first = Object.values(actions)[0]
    if (first) {
      first.reset().play()
      first.timeScale = 1.6
    }
    materials.current = []
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        // The GLB ships with a near-fully-metallic material. Metal only shows
        // what it reflects, and this scene has no environment map, so the
        // whale rendered almost black against the dark background (only a
        // thin sliver of its back caught the overhead light). Use a matte,
        // non-metallic skin, plus a faint self-lit pass from the same texture
        // so the body stays readable from every angle.
        const m = child.material
        m.metalness = 0
        m.metalnessMap = null
        m.roughnessMap = null
        m.roughness = 0.7
        if (m.map) {
          m.emissiveMap = m.map
          m.emissive = new THREE.Color('#ffffff')
          m.emissiveIntensity = 0.45
        }
        m.needsUpdate = true
        materials.current.push(m)
      }
    })
  }, [actions, scene])

  useEffect(() => {
    materials.current.forEach((m) => {
      m.color.set(tint || '#ffffff')
      if (m.emissive) m.emissive.set(tint || '#ffffff')
    })
  }, [tint])

  useFrame((state, delta) => {
    if (!group.current) return
    group.current.position.y = props.position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.35
    group.current.rotation.y += delta * 0.25
  })

  return <primitive ref={group} object={scene} {...props} />
}

useGLTF.preload('/models/whale.glb')
