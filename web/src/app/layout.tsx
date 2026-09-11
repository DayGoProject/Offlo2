import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offlo — 디지털 디톡스 플랫폼",
  description:
    "스크린타임 스크린샷 하나로 AI가 사용 습관을 분석하고, 반려 식물과 동물을 키우며 건강한 디지털 습관을 만들어 보세요.",
};

// 이게 없으면 모바일 브라우저가 레이아웃 뷰포트를 ~980px로 잡아
// Tailwind 브레이크포인트(sm/md/lg)가 실제 기기에서 하나도 발동하지 않는다.
// maximumScale·userScalable은 확대를 막아 접근성을 해치므로 설정하지 않는다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      {/* 폰트는 public/fonts에서 직접 서빙한다 (globals.css의 @font-face).
          다크 단일 테마라 FOUC 방지용 인라인 테마 스크립트도 더 이상 필요 없다. */}
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
