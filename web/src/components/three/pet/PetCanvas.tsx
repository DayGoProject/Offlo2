"use client";

/**
 * 3D 반려 동물 캔버스 — 앱의 `PetCanvas.web.tsx`와 같은 장면(`PetScene`)이다. 장면 조립 · 뼈대 · 표정 · 성장 외형은
 * 앱 레포가 원본이고 `node scripts/sync-pet-web.mjs --push`로 이 폴더에 복사된다 (이 파일 · PetErrorBoundary만 웹이 직접 가진다 — GLB를 여는 방법이 달라서다).
 *
 * `.claude/rules/3d.md` 규칙: R3F는 `components/three/`에서만 import하고, 페이지는 `next/dynamic({ ssr: false })`로만 접근한다.
 * 모델은 `public/models/pets/*.glb` — 같은 출처(`'self'`)라 CSP를 넓히지 않는다. Draco를 쓰지 않아 디코더(워커)도 없다. 텍스처가 없어 `img-src`도 건드리지 않는다.
 * 배경은 투명하다 — 방 그림(`PetRoom`) 위에 그대로 얹힌다.
 */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { PetScene } from "./PetScene";
import { VIEWER_LAYOUT, type PetCanvasProps } from "./petCanvasTypes";

const MODEL_URL = {
  cat: "/models/pets/cat.glb",
  dog: "/models/pets/dog.glb",
  rabbit: "/models/pets/rabbit.glb",
} as const;

export type WebPetCanvasProps = PetCanvasProps & {
  /** 저사양 기기 — 픽셀 비율을 1로 묶는다 (기본은 최대 1.5) */
  lowPower?: boolean;
};

function Pet({
  type,
  stage,
  condition,
  anxious = false,
  spin = false,
  yaw = 0,
  still = false,
  hold = null,
  eatSignal = 0,
  eatRecovery = false,
  petSignal = 0,
  layout = VIEWER_LAYOUT,
  onReady,
  onEvent,
}: PetCanvasProps) {
  const gltf = useLoader(GLTFLoader, MODEL_URL[type]);
  const scene = useMemo(() => new PetScene(type, gltf.scene), [gltf, type]);
  const invalidate = useThree((s) => s.invalidate);
  const seen = useRef({ eat: eatSignal, pet: petSignal });
  const readied = useRef(false);

  useEffect(() => () => scene.dispose(), [scene]);
  // 장면이 밥 · 부화 · 성장을 "지금 시작했다"고 알린다
  useEffect(() => {
    scene.setEventHandler(onEvent ?? null);
    return () => scene.setEventHandler(null);
  }, [scene, onEvent]);
  // 정지 모드(demand)는 값이 바뀔 때만 다시 그린다
  useEffect(() => {
    invalidate();
  }, [invalidate, scene, stage, condition, anxious, spin, yaw, still, hold]);

  useFrame((state, dt) => {
    if (eatSignal !== seen.current.eat) {
      seen.current.eat = eatSignal;
      scene.requestFeed(eatRecovery);
    }
    if (petSignal !== seen.current.pet) {
      seen.current.pet = petSignal;
      scene.requestPet();
    }
    scene.update(still ? 0 : state.clock.elapsedTime, dt, { stage, condition, anxious, spin, yaw, still, hold });
    if (!readied.current) {
      readied.current = true;
      onReady?.();
    }
  });

  return <primitive object={scene.root} scale={layout.fit[type]} position={layout.position} />;
}

export default function PetCanvas(props: WebPetCanvasProps) {
  const layout = props.layout ?? VIEWER_LAYOUT;
  // 다른 곳을 보고 있거나(active=false) 정지 화면이면 계속 그리지 않는다 (.claude/rules/3d.md 성능 가드)
  const frameloop = props.active === false ? "never" : props.still ? "demand" : "always";
  return (
    <Canvas
      data-testid="pet-canvas"
      style={{ width: "100%", height: "100%" }}
      frameloop={frameloop}
      dpr={[1, props.lowPower ? 1 : 1.5]}
      camera={{ position: layout.camera, fov: layout.fov }}
      onCreated={({ camera }) => camera.lookAt(layout.lookAt[0], layout.lookAt[1], layout.lookAt[2])}
    >
      <hemisphereLight color="#DCE6FF" groundColor="#B08A66" intensity={1.5} />
      <directionalLight color="#FFE6C0" position={[3.5, 5, 6]} intensity={2.7} />
      <directionalLight color="#FFD7B0" position={[-4, 2, 6]} intensity={0.9} />
      <directionalLight color="#9BB6FF" position={[-4, 3, -4]} intensity={1.0} />
      <Suspense fallback={null}>
        <Pet {...props} />
      </Suspense>
    </Canvas>
  );
}
