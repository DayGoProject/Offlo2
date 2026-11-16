import type { ReportReason, TargetType } from "@/lib/moderation";

/**
 * 커뮤니티 신고 · 차단 화면 문구 — **클라이언트 · 서버 양쪽 안전** (값만 둔다).
 *
 * 서버 규칙은 `lib/moderation.ts`(firebase-admin 의존 → 클라이언트 import 금지)에 있다. 여기서는 그 파일의 **타입만** 가져와
 * 사유 값이 서버와 어긋나면 타입 검사에서 막힌다 (`import type`은 번들에 들어가지 않는다).
 * 문구는 앱(`Offlo_APP/src/logic/moderation.ts`)과 같다 — 실제 동작과 같아야 한다:
 * 신고한 글은 신고한 사람에게 곧바로 숨고 · 서로 다른 3명이 신고하면 모두에게서 숨고 · 운영자가 확인해 지운다.
 */

export type { ReportReason };
export type ModerationTarget = TargetType;

export const REPORT_REASONS = [
  { value: "spam", label: "스팸 · 광고", hint: "홍보 · 반복 글 · 낚시" },
  { value: "abuse", label: "욕설 · 혐오 · 괴롭힘", hint: "비방 · 차별 · 위협" },
  { value: "sexual", label: "음란 · 선정적인 내용", hint: "성적인 글 · 청소년에게 부적절한 내용" },
  { value: "privacy", label: "개인정보 노출 · 사칭", hint: "연락처 · 실명 공개 · 다른 사람인 척" },
  { value: "other", label: "기타", hint: "위에 없는 문제" },
] as const satisfies readonly { value: ReportReason; label: string; hint: string }[];

/** 신고 · 차단을 마친 뒤 잠깐 띄우는 안내 */
export const NOTICE_REPORTED = "신고했어요. 이 글은 이제 보이지 않아요. 운영자가 확인할게요.";
export const NOTICE_REPORTED_COMMENT = "신고했어요. 이 댓글은 이제 보이지 않아요. 운영자가 확인할게요.";
export const noticeBlocked = (name: string): string => `${name}님을 차단했어요. 이 사용자의 글 · 댓글은 이제 보이지 않아요.`;

export const blockConfirmText = (name: string): string =>
  `${name}님의 글 · 댓글 · 랭킹이 내게 보이지 않아요. 상대에게 알리지 않고, 설정 → 차단한 사용자에서 언제든 풀 수 있어요.`;

/** 차단 목록이 비었을 때 */
export const BLOCKED_EMPTY = "차단한 사용자가 없어요. 글이나 댓글의 '신고 · 차단'에서 사용자를 차단할 수 있어요.";
