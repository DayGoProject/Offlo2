"use client";

import Image from "next/image";
import { getPlantLevel } from "@/lib/garden-utils";

/**
 * 레벨에 맞는 유리 식물 렌더를 그린다.
 *
 * 이미지에는 카드 배경색(#0B0D11)이 구워져 있다 — 알파 대신 배경색을 합성한
 * 이유는 `.claude/rules/3d.md` 참고(알파 버전은 용량이 8배가 된다).
 * 그래서 **반드시 --bg-card 위에만 놓는다.** 페이지 바탕에 직접 얹으면
 * 사각형 경계가 다시 보인다.
 *
 * 그래도 렌더의 글로우가 사각형으로 잘린 흔적이 남을 수 있어 방사형 마스크로
 * 가장자리를 풀어준다.
 */
export default function PlantImage({
  totalMinutes,
  size = 250,
  className = "",
  priority = false,
}: {
  totalMinutes: number;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const level = getPlantLevel(totalMinutes);

  return (
    <div
      className={`relative shrink-0 max-w-full ${className}`}
      style={{
        width: size,
        height: size,
        aspectRatio: "1 / 1",
        // 가장자리 40%를 서서히 풀어 크롭 단면을 지운다
        maskImage: "radial-gradient(circle at 50% 50%, #000 55%, transparent 78%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 50%, #000 55%, transparent 78%)",
      }}
    >
      <Image
        src={level.image}
        alt={`${level.name} 단계의 반려 식물`}
        fill
        sizes={`${size}px`}
        priority={priority}
        className="object-contain select-none pointer-events-none"
        draggable={false}
      />
    </div>
  );
}
