// Custom shader: fresnel-rim glow, pulsing over time, used for the
// bioluminescent belly/fin strips on the whale. Additive-blended so it
// reads as light, not paint.

import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

const GlowMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('#00d4ff'), uIntensity: 1.4 },
  // vertex
  `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
  `,
  // fragment
  `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.2);
    float pulse = 0.55 + 0.45 * sin(uTime * 1.6);
    float glow = fresnel * uIntensity * pulse;
    gl_FragColor = vec4(uColor * glow, glow);
  }
  `
)

extend({ GlowMaterial })
export default GlowMaterial
