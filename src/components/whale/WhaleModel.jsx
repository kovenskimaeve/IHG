import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Real scanned/rigged model (credit: Sketchfab, CC Attribution — see footer),
// not procedural geometry. Plays its own baked swimming animation and gets
// a soft pulsing cyan emissive boost for the bioluminescent feel.

export default function WhaleModel(props) {
  const group = useRef()
  const { scene, animations } = useGLTF('/models/whale.glb')
  const { actions } = useAnimations(animations, group)
  const materials = useRef([])

  useEffect(() => {
    const first = Object.values(actions)[0]
    first?.reset().play()

    materials.current = []
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        const mat = child.material
        mat.emissive = new THREE.Color('#00d4ff')
        mat.emissiveIntensity = 0.12
        materials.current.push(mat)
      }
    })
  }, [actions, scene])

  useFrame((state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.05
    const pulse = 0.12 + 0.16 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 1.4))
    materials.current.forEach((m) => { m.emissiveIntensity = pulse })
  })

  return <primitive ref={group} object={scene} {...props} />
}

useGLTF.preload('/models/whale.glb')
