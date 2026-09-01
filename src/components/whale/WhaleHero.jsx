import { Suspense, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sparkles, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import WhaleModel from './WhaleModel'
import ScrollHint from './ScrollHint'

const TINTS = ['#ffffff', '#8fb3d9', '#7ac9b8', '#d9a86c', '#c98a9c', '#a68fd9']

function Scene({ tint, controlsRef }) {
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

      <WhaleModel position={[0, -0.5, 0]} scale={1.8} rotation={[0, 0.6, 0]} tint={tint} />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        enableZoom={false}
        minDistance={5}
        maxDistance={14}
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.15}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.35}
        target={[0, 1.2, 0]}
      />

      <EffectComposer>
        <Bloom intensity={0.4} luminanceThreshold={0.4} luminanceSmoothing={0.9} mipmapBlur />
        <ChromaticAberration offset={new THREE.Vector2(0.0007, 0.0007)} radialModulation modulationOffset={0.5} />
        <Noise opacity={0.03} />
        <Vignette eskil={false} offset={0.22} darkness={0.75} />
      </EffectComposer>
    </>
  )
}

export default function WhaleHero() {
  const [ready, setReady] = useState(false)
  const [tint, setTint] = useState('#ffffff')
  const controlsRef = useRef()

  function zoom(factor) {
    const c = controlsRef.current
    if (!c) return
    c.dollyIn ? (factor > 1 ? c.dollyOut(factor) : c.dollyIn(1 / factor)) : null
    c.update()
  }

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: 'linear-gradient(180deg, #060a14, #020408)' }}>
      <Canvas
        camera={{ position: [0, 1, 9], fov: 45 }}
        dpr={[1, 1.75]}
        onCreated={() => setReady(true)}
      >
        <Suspense fallback={null}>
          <Scene tint={tint} controlsRef={controlsRef} />
        </Suspense>
      </Canvas>

      <div
        className="absolute left-6 bottom-16 md:left-10 md:bottom-20 max-w-sm px-6 py-5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <h1 style={{ color: '#e8ecf1', opacity: 0.9, fontWeight: 200, letterSpacing: '0.12em', fontSize: '1.6rem', lineHeight: 1.3, marginBottom: '0.75rem' }}>
          ISF HOLY GRAIL
        </h1>
        <p style={{ color: 'rgba(232,236,241,0.5)', fontSize: '0.65rem', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
          WHALE COLOR
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {TINTS.map((t) => (
            <button
              key={t}
              onClick={() => setTint(t)}
              aria-label={`Set whale color ${t}`}
              style={{
                width: 20, height: 20, borderRadius: '50%', background: t,
                border: tint === t ? '2px solid #e8ecf1' : '1px solid rgba(255,255,255,0.3)',
                cursor: 'pointer', padding: 0,
              }}
            />
          ))}
          <input
            type="color"
            value={tint}
            onChange={(e) => setTint(e.target.value)}
            style={{ width: 22, height: 22, border: 'none', background: 'none', cursor: 'pointer' }}
            aria-label="Custom whale color"
          />
        </div>
      </div>

      {/* zoom controls — wheel-scroll is intentionally left free for the page itself */}
      <div className="absolute top-24 right-6 md:right-10 flex flex-col gap-2">
        <button
          onClick={() => zoom(1.15)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#e8ecf1' }}
        >
          +
        </button>
        <button
          onClick={() => zoom(1 / 1.15)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#e8ecf1' }}
        >
          −
        </button>
      </div>

      <ScrollHint />

      <div
        className="absolute left-6 bottom-6 md:left-10"
        style={{ color: 'rgba(232,236,241,0.22)', fontSize: '0.6rem', letterSpacing: '0.03em' }}
      >
        Whale model via Sketchfab, CC Attribution
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'rgba(232,236,241,0.5)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          LOADING…
        </div>
      )}
    </div>
  )
}
