import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'

// This model is a flat plane at y=0 with a baked wave animation — it's the
// water's surface, meant to be viewed from underwater looking up, not a
// seafloor. Positioned above the whale accordingly.

export default function OceanSurface(props) {
  const group = useRef()
  const { scene, animations } = useGLTF('/models/ocean.glb')
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    const first = Object.values(actions)[0]
    first?.reset().play()
    scene.traverse((child) => {
      if (child.isMesh) child.material.side = 2 // DoubleSide, visible from underneath
    })
  }, [actions, scene])

  return <primitive ref={group} object={scene} {...props} />
}

useGLTF.preload('/models/ocean.glb')
