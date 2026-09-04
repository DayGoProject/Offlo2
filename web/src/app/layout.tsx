import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
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

// 페이지 로드 시 localStorage를 읽어 dark 클래스를 즉시 적용 (FOUC 방지)
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || t === null) document.documentElement.classList.add('dark');
  } catch(e){}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* 폰트는 public/fonts에서 직접 서빙한다 (globals.css의 @font-face).
            기존 jsDelivr stylesheet는 URL이 404라 폰트가 아예 적용되지 않고 있었다. */}
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
