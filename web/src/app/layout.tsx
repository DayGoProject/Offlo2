import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offlo — 디지털 디톡스 플랫폼",
  description:
    "스크린타임 스크린샷 하나로 AI가 사용 습관을 분석하고, 반려 식물과 동물을 키우며 건강한 디지털 습관을 만들어 보세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@spoqa/spoqa-han-sans/css/SpoqaHanSansNeo.css"
        />
      </head>
      <body>
          <AuthProvider>{children}</AuthProvider>
        </body>
    </html>
  );
}
