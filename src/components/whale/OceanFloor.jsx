import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'

// Real animated ocean surface/floor model, sitting beneath and around the
// whale for depth and context instead of the whale floating in plain fog.

export default function OceanFloor(props) {
  const group = useRef()
  const { scene, animations } = useGLTF('/models/ocean.glb')
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    const first = Object.values(actions)[0]
    first?.reset().play()
    scene.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true
      }
    })
  }, [actions, scene])

  return <primitive ref={group} object={scene} {...props} />
}

useGLTF.preload('/models/ocean.glb')
