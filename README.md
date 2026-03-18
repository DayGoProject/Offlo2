<div align="center">

# 🌿 Offlo

### AI 기반 디지털 디톡스 플랫폼

스크린타임 스크린샷 하나로 AI가 사용 습관을 분석하고,<br/>
반려 식물·동물을 키우며 건강한 디지털 습관을 만들어 보세요.

<br/>

![Next.js](https://img.shields.io/badge/Next.js-15.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-11.x-FFCA28?style=flat-square&logo=firebase)

</div>

---

## 소개

**Offlo**는 스마트폰 과사용 문제를 해결하는 디지털 디톡스 웹 플랫폼입니다.

단순히 앱을 차단하는 것이 아닌, AI가 나의 사용 패턴을 분석해 맞춤형 디톡스 방법을 제안합니다. 반려 식물과 동물을 키우는 게이미피케이션으로 강압이 아닌 자연스러운 습관 변화를 유도합니다.

---

## 주요 기능

### 📊 AI 스크린타임 분석
스마트폰 스크린타임 스크린샷을 업로드하면 Gemini Vision AI가 자동으로 분석합니다.
- 앱별 사용 시간 추출 및 카테고리 분류
- 디톡스 점수 (0~100) 산출
- 취약 시간대 및 습관 기반 맞춤 추천

### 🌱 반려 식물 · 동물 키우기
화면을 끈 시간만큼 반려 식물과 동물이 성장합니다.
- 디톡스 시간에 비례한 레벨업 시스템
- 배지 획득 및 연속 달성 기록
- 게이미피케이션으로 지속적인 동기 부여

### 🎯 목표 설정 및 대시보드
- 일별·주별 스크린타임 목표 설정
- 디톡스 현황 시각화 (프리미엄: 상세 차트)
- 분석 기록 히스토리

### 🔒 Chrome / Edge 확장 프로그램 *(개발 예정)*
- Manifest V3 기반 웹사이트 차단
- 실시간 사용 시간 추적

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| **언어** | TypeScript 5.x |
| **프론트엔드** | Next.js 15.1 (App Router), React 19.0, CSS Modules |
| **백엔드** | Next.js API Routes, Firebase Cloud Functions 2nd gen (Node.js 22) |
| **데이터베이스** | PostgreSQL + Prisma ORM (Supabase), Firebase Firestore |
| **인증** | Firebase Authentication (Google OAuth, 이메일/비밀번호) |
| **AI** | Google Gemini Vision API 2.5 Flash |
| **스토리지** | Firebase Storage |
| **배포** | Firebase Hosting |

---

## 프로젝트 구조

```
Offlo/
├── web/                  # Next.js 15 프론트엔드 + API Routes
│   └── src/
│       ├── app/          # 페이지 (App Router)
│       ├── components/   # 공통 컴포넌트
│       ├── context/      # AuthContext
│       ├── hooks/        # 커스텀 훅
│       └── services/     # Firebase 서비스
├── functions/            # Firebase Cloud Functions (AI 분석)
│   └── src/
│       └── index.ts      # analyzeScreenTime 함수
└── extension/            # Chrome/Edge 확장 프로그램 (예정)
```

---

## 로컬 실행

### 사전 요구사항
- Node.js 22 LTS
- Firebase 프로젝트 (Blaze 플랜)

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/DayGoProject/Offlo2.git
cd Offlo2

# 프론트엔드 의존성 설치
cd web
npm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local 에 Firebase 설정값 입력

# 개발 서버 실행
npm run dev
```

### Cloud Functions 실행

```bash
cd functions
npm install
npm run build

# 환경변수 설정 (.env 파일에 GEMINI_API_KEY 입력)
firebase deploy --only functions
```

---

## 개발 진행 상황

| 단계 | 내용 | 상태 |
|------|------|------|
| 1단계 | 프로젝트 초기 세팅 및 기본 UI | ✅ 완료 |
| 2단계 | Firebase 인증 시스템 | ✅ 완료 |
| 3단계 | AI 스크린타임 분석 | ✅ 완료 |
| 4단계 | Chrome 확장 프로그램 | 🔲 진행 예정 |
| 5단계 | 대시보드 고도화 | 🔲 진행 예정 |
| 6단계 | 마무리 및 배포 | 🔲 진행 예정 |

---

<div align="center">

Copyright © 2026 [ImYourNote](https://github.com/ImYourNote)

본 프로젝트는 저작권법의 보호를 받습니다.<br/>
상업적 이용, 무단 복제 및 재배포를 금지합니다.

</div>
