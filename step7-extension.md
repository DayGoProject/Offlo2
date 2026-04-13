# 7단계 계획 — Chrome 확장 프로그램 개발

## 전체 흐름

```
Phase 1. Firebase Hosting 배포
Phase 2. 웹앱 /extension-auth 페이지 추가
Phase 3. 확장 프로그램 기본 구조 구성
Phase 4. 로그인 연동 (웹앱 ↔ 확장)
Phase 5. 핵심 기능 구현 (차단 · 트래킹)
Phase 6. Offlo 계정 데이터 연동
```

---

## Phase 1. Firebase Hosting 배포

### 목적
`externally_connectable`은 `localhost` 불가 → 실제 도메인이 있어야 확장 ↔ 웹앱 통신 가능.

### 작업 목록

**`web/` 설정**
- `next.config.ts`에 `output: "export"` 또는 Firebase Hosting + Cloud Run 방식 결정
  - Next.js API Routes를 사용하므로 **정적 export 불가** → Cloud Run 또는 Firebase App Hosting 사용
  - **추천**: Firebase App Hosting (Next.js 서버 배포 지원, Firebase 프로젝트와 통합)

**Firebase App Hosting 설정**
- `firebase.json`에 App Hosting 설정 추가
- `apphosting.yaml` 작성 (환경변수 포함)
- GitHub 레포(`DayGoProject/Offlo2`)와 연결 → push 시 자동 배포

**배포 후 확인**
- 배포 도메인 확정: `offlo2-app.web.app` 또는 커스텀 도메인
- `/` 랜딩 · `/login` · `/analysis` 정상 동작 확인

---

## Phase 2. 웹앱 `/extension-auth` 페이지 추가

### 목적
확장 팝업에서 "Google 로그인" 클릭 → 이 페이지가 열림 → 로그인 완료 후 토큰 전송 + 탭 자동 닫힘.

### 파일
```
web/src/app/extension-auth/page.tsx
```

### 동작 흐름
1. 페이지 열릴 때 URL 파라미터에서 `extensionId` 읽기
2. Firebase `signInWithPopup(GoogleAuthProvider)` 실행
3. 로그인 성공 → `user.getIdToken()` 으로 ID Token 추출
4. `chrome.runtime.sendMessage(extensionId, { type: "AUTH_SUCCESS", idToken })` 전송
5. 전송 완료 후 `window.close()` — 탭 자동 닫힘

### 웹앱 `manifest.json` 수정 불필요
확장 쪽 `manifest.json`에 `externally_connectable` 설정으로 이 도메인을 허용하면 됨.

---

## Phase 3. 확장 프로그램 기본 구조

### 디렉터리 구조
```
extension/
├── manifest.json
├── src/
│   ├── background.ts     # Service Worker
│   ├── popup.ts          # 팝업 UI 로직
│   └── content.ts        # 웹사이트 차단 오버레이
├── popup.html
├── tsconfig.json
├── package.json
└── build.js              # esbuild 번들러
```

### `manifest.json` 핵심 설정
```json
{
  "manifest_version": 3,
  "name": "Offlo",
  "version": "0.1.0",
  "permissions": ["tabs", "storage", "alarms", "webNavigation"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "externally_connectable": {
    "matches": [
      "https://offlo2-app.web.app/*",
      "https://*.offlo2-app.web.app/*"
    ]
  }
}
```

---

## Phase 4. 로그인 연동

### 로그인 흐름
```
팝업 "Google 로그인" 클릭
        ↓
background.ts: chrome.tabs.create({ url: "https://offlo2-app.web.app/extension-auth?extensionId=EXTENSION_ID" })
        ↓
/extension-auth 페이지에서 Google 로그인
        ↓
웹앱: chrome.runtime.sendMessage(extensionId, { type: "AUTH_SUCCESS", idToken })
        ↓
background.ts: 메시지 수신 → chrome.storage.local.set({ idToken, expiresAt })
        ↓
웹앱: window.close() — 탭 자동 닫힘
        ↓
팝업 다시 열기 → chrome.storage에서 토큰 읽기 → 로그인 상태 표시
```

### 로그아웃 흐름
```
팝업 "로그아웃" 클릭
        ↓
chrome.storage.local.remove(["idToken", "expiresAt"])
        ↓
팝업 → 로그인 화면으로 전환
```

### 토큰 갱신
- Firebase ID Token은 1시간 만료
- `expiresAt` 저장 후 팝업 열릴 때 만료 체크
- 만료 시 → 재로그인 유도 (자동 갱신은 확장 환경에서 복잡하므로 1시간 후 재로그인)

---

## Phase 5. 핵심 기능 구현

### 5-1. 차단 사이트 관리
- `chrome.storage.sync`에 차단 목록 저장
- 팝업에서 URL 추가/삭제 UI
- `content.ts`가 현재 페이지 URL을 차단 목록과 비교 → 차단 오버레이 표시

### 5-2. 사용 시간 트래킹
- `chrome.tabs.onActivated` + `chrome.tabs.onUpdated` 로 탭 전환 감지
- `background.ts`에서 도메인별 누적 시간 계산
- `chrome.alarms`로 1분마다 스토리지에 저장

### 5-3. 차단 오버레이 UI (`content.ts`)
- 차단된 사이트 접근 시 전체 화면 오버레이 표시
- "차단 해제 (오늘 하루)" / "돌아가기" 버튼

---

## Phase 6. Offlo 계정 데이터 연동

### 목적
차단 목록, 사용 시간 데이터를 Offlo 계정(Supabase)과 동기화.

### 작업
- 확장에서 수집한 웹 사용 시간 → `/api/analyses`에 전송
- 목표 설정(`/api/goals`)을 확장 팝업에서 조회
- API 호출 시 `chrome.storage`의 `idToken`을 `Authorization: Bearer` 헤더로 사용

---

## 개발 순서 요약

| 순서 | 작업 | 비고 |
|------|------|------|
| 1 | Firebase App Hosting 배포 | 도메인 확정 필수 |
| 2 | `/extension-auth` 페이지 | 웹앱에 추가 |
| 3 | 확장 기본 구조 + manifest | Phase 3 |
| 4 | background.ts 로그인 수신 로직 | Phase 4 |
| 5 | popup.html/ts 로그인 UI | Phase 4 |
| 6 | 차단 기능 (content.ts) | Phase 5 |
| 7 | 사용 시간 트래킹 | Phase 5 |
| 8 | Supabase 데이터 연동 | Phase 6 |
