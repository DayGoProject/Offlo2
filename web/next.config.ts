import type { NextConfig } from "next";

const securityHeaders = [
  // 클릭재킹 방지
  { key: "X-Frame-Options", value: "DENY" },
  // MIME 스니핑 방지
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer 정보 최소화
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 불필요한 브라우저 API 접근 차단
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HTTPS 강제 (1년)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // XSS 방어 핵심 — Firebase + 스포카 폰트(jsDelivr) 허용
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js 런타임·Framer Motion에 unsafe-inline/eval 필요
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "font-src 'self' https://cdn.jsdelivr.net",
      // Firebase Storage 이미지, blob (로컬 프리뷰)
      "img-src 'self' data: blob: https://firebasestorage.googleapis.com",
      // Firebase Auth·Firestore·Storage·Functions
      [
        "connect-src 'self'",
        "https://*.googleapis.com",
        "https://*.firebaseapp.com",
        "https://*.cloudfunctions.net",
        "https://firebasestorage.googleapis.com",
        "wss://*.firebaseio.com",
      ].join(" "),
      // Google OAuth 팝업
      "frame-src https://accounts.google.com https://*.firebaseapp.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
