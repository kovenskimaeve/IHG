import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sparkles, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import WhaleModel from './WhaleModel'
import OceanSurface from './OceanSurface'

function Scene() {
  return (
    <>
      <color attach="background" args={['#060a14']} />
      <fog attach="fog" args={['#060a14', 5, 20]} />

      <ambientLight intensity={0.18} color="#3a5a7a" />
      <directionalLight position={[1, 12, -2]} intensity={3} color="#dff0ff" />
      <pointLight position={[-4, -1, 3]} intensity={0.5} color="#00d4ff" />
      <pointLight position={[0, -2, 6]} intensity={0.25} color="#7b61ff" />
      <Environment preset="sunset" environmentIntensity={0.4} />

      <Sparkles count={220} scale={[16, 12, 10]} size={1.3} speed={0.15} opacity={0.4} color="#bcd6ea" />

      {/* lower + closer so it's actually visible in the default framing */}
      <OceanSurface position={[0, 4.5, 0]} scale={6} />

      <WhaleModel position={[0, -0.5, 0]} scale={1.8} rotation={[0, 0.6, 0]} />

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        minDistance={5}
        maxDistance={13}
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.15}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.35}
        target={[0, 1.2, 0]}
      />

      <EffectComposer>
        <Bloom intensity={0.4} luminanceThreshold={0.4} luminanceSmoothing={0.9} mipmapBlur />
        <Noise opacity={0.03} />
        <Vignette eskil={false} offset={0.22} darkness={0.75} />
      </EffectComposer>
    </>
  )
}

export default function WhaleHero() {
  const [ready, setReady] = useState(false)

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: 'linear-gradient(180deg, #060a14, #020408)' }}>
      <Canvas
        camera={{ position: [0, 1, 9], fov: 45 }}
        dpr={[1, 1.75]}
        onCreated={() => setReady(true)}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      <div
        className="absolute left-6 bottom-16 md:left-10 md:bottom-20 max-w-sm px-6 py-5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <h1 style={{ color: '#e8ecf1', opacity: 0.9, fontWeight: 200, letterSpacing: '0.12em', fontSize: '1.6rem', lineHeight: 1.3 }}>
          ISF HOLY GRAIL
        </h1>
      </div>

      <div
        className="absolute bottom-6 right-6 md:right-10 flex flex-col items-center gap-1"
        style={{ color: 'rgba(232,236,241,0.5)', fontSize: '0.7rem', letterSpacing: '0.15em' }}
      >
        <span>SCROLL TO EXPLORE</span>
        <span className="float-accent" style={{ fontSize: '1rem' }}>↓</span>
      </div>

      <div
        className="absolute left-6 bottom-6 md:left-10"
        style={{ color: 'rgba(232,236,241,0.35)', fontSize: '0.65rem', letterSpacing: '0.05em' }}
      >
        Whale &amp; ocean models via Sketchfab, CC Attribution
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'rgba(232,236,241,0.5)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          LOADING…
        </div>
      )}
    </div>
  )
}
