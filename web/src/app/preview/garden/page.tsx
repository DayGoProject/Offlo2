import { notFound } from "next/navigation";

import PreviewGarden from "./PreviewGarden";

/**
 * 정원 동물 무대 미리보기 — **개발 전용**이다. 로그인 없이 `PetStage`(3D 클레이 동물 + 방)를 샘플 값으로 열어
 * 자동 검증(앱 레포 `scripts/verify-web-pet.mjs`)과 눈 확인에 쓴다. 프로덕션에서는 없는 페이지다 (404).
 * 사용자 데이터 · Firebase · API를 쓰지 않는다 — 코드에 적힌 샘플만 그린다.
 */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewGarden />;
}
