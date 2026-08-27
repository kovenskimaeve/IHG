import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import WhaleModel from './WhaleModel'
import MistSprites from './MistSprites'

function Scene() {
  return (
    <>
      <color attach="background" args={['#0a0e1a']} />
      <fog attach="fog" args={['#0a0e1a', 6, 22]} />

      <ambientLight intensity={0.25} color="#3a5a7a" />
      <directionalLight position={[3, 8, 4]} intensity={1.8} color="#cfe6ff" />
      <pointLight position={[-4, -2, 3]} intensity={1.1} color="#00d4ff" />
      <pointLight position={[0, 0, 6]} intensity={0.5} color="#7b61ff" />

      <MistSprites />
      <Sparkles count={260} scale={[16, 12, 10]} size={1.6} speed={0.15} opacity={0.5} color="#bcd6ea" />

      <WhaleModel position={[0, 0, 0]} rotation={[0.15, 0.5, 0.1]} />

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        minDistance={5}
        maxDistance={13}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.4}
      />

      <EffectComposer>
        <Bloom intensity={0.55} luminanceThreshold={0.25} luminanceSmoothing={0.9} mipmapBlur />
        <ChromaticAberration offset={new THREE.Vector2(0.0009, 0.0009)} radialModulation modulationOffset={0.4} />
        <Noise opacity={0.035} />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </>
  )
}

export default function WhaleHero() {
  const [ready, setReady] = useState(false)

  return (
    <div className="relative w-full h-[70vh] min-h-[420px] overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a0e1a, #030508)' }}>
      <Canvas
        camera={{ position: [0, 0.5, 9], fov: 45 }}
        dpr={[1, 1.75]}
        onCreated={() => setReady(true)}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* glass UI overlay */}
      <div
        className="absolute left-6 bottom-6 md:left-10 md:bottom-10 max-w-sm px-6 py-5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <h1 style={{ color: '#e8ecf1', opacity: 0.9, fontWeight: 200, letterSpacing: '0.12em', fontSize: '1.6rem', lineHeight: 1.3 }}>
          ISF HOLY GRAIL
        </h1>
        <p style={{ color: '#e8ecf1', opacity: 0.65, fontWeight: 300, letterSpacing: '0.04em', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Every past paper, every good explanation — drag to look around.
        </p>
      </div>

      <div
        className="absolute bottom-6 right-6 md:right-10 flex flex-col items-center gap-1"
        style={{ color: 'rgba(232,236,241,0.5)', fontSize: '0.7rem', letterSpacing: '0.15em' }}
      >
        <span>SCROLL TO EXPLORE</span>
        <span className="float-accent" style={{ fontSize: '1rem' }}>↓</span>
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'rgba(232,236,241,0.5)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          LOADING…
        </div>
      )}
    </div>
  )
}
