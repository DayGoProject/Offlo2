"use client";

import Image from "next/image";
import { getPlantLevel } from "@/lib/garden-utils";

/**
 * 레벨에 맞는 유리 식물 렌더를 그린다.
 *
 * 이미지는 투명 배경 AVIF라 카드·글로우 등 어떤 면 위에 얹어도 된다.
 * `unoptimized` — Next 이미지 최적화가 WebP로 다시 인코딩하면 옅은 안개의 알파가
 * 계단으로 뭉개질 수 있다. 검증한 AVIF를 그대로 내보낸다 (.claude/rules/3d.md).
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
      style={{ width: size, height: size, aspectRatio: "1 / 1" }}
    >
      <Image
        src={level.image}
        alt={`${level.name} 단계의 반려 식물`}
        fill
        sizes={`${size}px`}
        priority={priority}
        unoptimized
        className="object-contain select-none pointer-events-none"
        draggable={false}
      />
    </div>
  );
}
