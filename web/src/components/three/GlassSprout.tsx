'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

/* ── 재질 품질 등급 ──────────────────────────────────────────────
   transmission(굴절)은 장면을 한 번 더 렌더하므로 모바일에서 무겁다.
   'low'는 굴절을 끄고 단순 반사로 떨어뜨린다. 폴백 판단은 SproutScene이 한다.
   ──────────────────────────────────────────────────────────── */
export type Quality = 'high' | 'low'

const BLOOM_GREEN = '#3DDB87'

/* ── 잎 단면 ─────────────────────────────────────────────────────
   +Y 방향으로 뻗는 렌즈형. Paper 시안의 잎 실루엣을 베지에로 옮긴 것.
   ──────────────────────────────────────────────────────────── */
function makeLeafShape() {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(0.44, 0.28, 0.58, 0.92, 0, 1.55)
  s.bezierCurveTo(-0.58, 0.92, -0.44, 0.28, 0, 0)
  return s
}

/* 잎맥 — 주맥 1개 + 좌우 측맥 3쌍. 잎 표면보다 살짝 앞에 띄운다. */
function makeVeinCurves() {
  const mid = new THREE.CurvePath<THREE.Vector3>()
  mid.add(
    new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, 0.04, 0),
      new THREE.Vector3(0.02, 0.5, 0),
      new THREE.Vector3(0.01, 1.0, 0),
      new THREE.Vector3(0, 1.5, 0),
    ),
  )

  const side: THREE.CurvePath<THREE.Vector3>[] = []
  const anchors: [number, number, number][] = [
    [0.22, 0.34, 0.52],
    [0.46, 0.30, 0.86],
    [0.72, 0.22, 1.14],
  ]
  for (const [t, spread, tip] of anchors) {
    for (const dir of [1, -1]) {
      const p = new THREE.CurvePath<THREE.Vector3>()
      p.add(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, t * 1.5, 0),
          new THREE.Vector3(dir * spread * 0.6, t * 1.5 + 0.14, 0),
          new THREE.Vector3(dir * spread, tip, 0),
        ),
      )
      side.push(p)
    }
  }
  return { mid, side }
}

function Veins() {
  const { mid, side } = useMemo(makeVeinCurves, [])
  return (
    <group position={[0, 0, 0.092]}>
      <mesh geometry={useMemo(() => new THREE.TubeGeometry(mid, 64, 0.0045, 6, false), [mid])}>
        <meshStandardMaterial
          color="#000000"
          emissive={BLOOM_GREEN}
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      {side.map((c, i) => (
        <mesh key={i} geometry={new THREE.TubeGeometry(c, 28, 0.0026, 5, false)}>
          <meshStandardMaterial
            color="#000000"
            emissive={BLOOM_GREEN}
            emissiveIntensity={1.7}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ── 잎 ─────────────────────────────────────────────────────── */
function Leaf({
  quality,
  ...props
}: { quality: Quality } & React.ComponentProps<'group'>) {
  const geo = useMemo(
    () =>
      new THREE.ExtrudeGeometry(makeLeafShape(), {
        depth: 0.05,
        bevelEnabled: true,
        bevelThickness: 0.022,
        bevelSize: 0.03,
        bevelSegments: 4,
        curveSegments: 40,
      }),
    [],
  )

  return (
    <group {...props}>
      <mesh geometry={geo} castShadow>
        {quality === 'high' ? (
          <MeshTransmissionMaterial
            transmission={1}
            thickness={0.32}
            roughness={0.14}
            ior={1.42}
            chromaticAberration={0.05}
            anisotropy={0.25}
            distortion={0.18}
            distortionScale={0.3}
            temporalDistortion={0.06}
            samples={6}
            resolution={512}
            backside
            color="#E6F5EC"
            attenuationColor="#7FE3B0"
            attenuationDistance={2.4}
          />
        ) : (
          <meshPhysicalMaterial
            color="#1A2A22"
            metalness={0.35}
            roughness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.15}
            transparent
            opacity={0.72}
          />
        )}
      </mesh>
      <Veins />
    </group>
  )
}

/* ── 줄기 ────────────────────────────────────────────────────── */
function Stem({ quality }: { quality: Quality }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, -1.85, 0),
      new THREE.Vector3(-0.04, -1.35, 0.02),
      new THREE.Vector3(0.02, -0.75, 0),
      new THREE.Vector3(-0.01, -0.2, 0),
      new THREE.Vector3(0, 0.22, 0),
    ])
    return new THREE.TubeGeometry(curve, 72, 0.055, 12, false)
  }, [])

  return (
    <mesh geometry={geo} castShadow>
      {quality === 'high' ? (
        <MeshTransmissionMaterial
          transmission={1}
          thickness={0.3}
          roughness={0.1}
          ior={1.45}
          chromaticAberration={0.04}
          samples={6}
          resolution={512}
          backside
          color="#E6F5EC"
          attenuationColor="#7FE3B0"
          attenuationDistance={2.0}
        />
      ) : (
        <meshPhysicalMaterial
          color="#1A2A22"
          metalness={0.4}
          roughness={0.18}
          clearcoat={1}
          transparent
          opacity={0.75}
        />
      )}
    </mesh>
  )
}

/* 줄기 속을 타고 오르는 발광 심 */
function StemCore() {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.06, -1.8, 0),
      new THREE.Vector3(-0.04, -1.3, 0.02),
      new THREE.Vector3(0.02, -0.7, 0),
      new THREE.Vector3(-0.01, -0.2, 0),
      new THREE.Vector3(0, 0.2, 0),
    ])
    return new THREE.TubeGeometry(curve, 72, 0.009, 6, false)
  }, [])

  return (
    <mesh geometry={geo} position={[0, 0, 0.052]}>
      <meshStandardMaterial
        color="#000000"
        emissive={BLOOM_GREEN}
        emissiveIntensity={2.2}
        toneMapped={false}
      />
    </mesh>
  )
}

/* ── 새싹 전체 ────────────────────────────────────────────────── */
export default function GlassSprout({
  quality = 'high',
  paused = false,
}: {
  quality?: Quality
  paused?: boolean
}) {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current || paused) return
    const t = state.clock.elapsedTime
    // 아주 느린 자전 + 미세한 흔들림 — 살아 있다는 느낌만 준다
    group.current.rotation.y = Math.sin(t * 0.16) * 0.42
    group.current.rotation.z = Math.sin(t * 0.21) * 0.035
    group.current.position.y = Math.sin(t * 0.5) * 0.045
  })

  return (
    <group ref={group} scale={0.86}>
      <Stem quality={quality} />
      <StemCore />

      {/* 오른쪽 큰 잎 — 위로 벌어진다 */}
      <Leaf
        quality={quality}
        position={[0.03, 0.16, 0]}
        rotation={[0, -0.32, -0.62]}
        scale={0.92}
      />

      {/* 왼쪽 잎 — 조금 낮고 반대로 기운다 */}
      <Leaf
        quality={quality}
        position={[-0.02, 0.06, 0.02]}
        rotation={[0, 0.38, 0.78]}
        scale={0.76}
      />
    </group>
  )
}
