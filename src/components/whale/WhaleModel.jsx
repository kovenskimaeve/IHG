import { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

// Real scanned/rigged model (credit: Sketchfab, CC Attribution — see footer).
// Plays its own baked swimming animation. No emissive overlay — that was
// washing out the real PBR texture detail and tinting everything cyan.
// Its own material does the work now; lighting provides the mood instead.

export default function WhaleModel(props) {
  const group = useRef()
  const { scene, animations } = useGLTF('/models/whale.glb')
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    const first = Object.values(actions)[0]
    if (first) {
      first.reset().play()
      first.timeScale = 1.6
    }
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [actions, scene])

  useFrame((state) => {
    if (group.current) group.current.position.y = props.position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.35
  })

  return <primitive ref={group} object={scene} {...props} />
}

useGLTF.preload('/models/whale.glb')
