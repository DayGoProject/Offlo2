import { auth } from "@/services/firebase";

/**
 * 관리자 신고 처리 API 클라이언트 (M9) — `/admin` 화면 전용. 서버 쪽은 `lib/moderation-admin.ts`다 (여기서는 서버 전용 모듈을 import하지 않는다 — 타입만 같게 선언).
 * 관리자가 아니면 서버가 404를 준다 → `NotAdminError`로 던져 화면이 "없는 페이지"처럼 보이게 한다.
 */

export type TargetType = "post" | "comment";
export type ReportReason = "spam" | "abuse" | "sexual" | "privacy" | "other";
export type SanctionKind = "warn" | "community" | "ban";

export const REASON_LABEL: Record<ReportReason, string> = {
  spam: "스팸 · 광고",
  abuse: "욕설 · 혐오 · 괴롭힘",
  sexual: "음란 · 선정적인 내용",
  privacy: "개인정보 노출 · 사칭",
  other: "기타",
};

export interface AuthorInfo {
  userId: string;
  name: string;
  email: string;
  strikes: number;
  banned: boolean;
  /** 커뮤니티 정지 중이면 끝나는 시각(영구는 null) — 아니면 undefined */
  communityUntil?: string | null;
}

export interface QueueItem {
  key: string;
  targetType: TargetType;
  targetId: string;
  reportCount: number;
  hidden: boolean;
  updatedAt: string;
  content: string;
  badgeName: string | null;
  postId: string | null;
  createdAt: string;
  reports: { reason: ReportReason; detail: string | null; createdAt: string }[];
  author: AuthorInfo;
}

export interface ActiveSanction {
  emailKey: string;
  banned: boolean;
  communityUntil?: string | null;
  strikes: number;
  updatedAt: string;
  user: { id: string; name: string; email: string } | null;
}

export interface SanctionRequest {
  kind: SanctionKind;
  days?: 7 | 30 | null;
  reason: ReportReason;
}

export class NotAdminError extends Error {
  constructor() {
    super("Not Found");
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) throw new NotAdminError();
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "요청을 처리하지 못했습니다.");
  }
  return res.json() as Promise<T>;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const fetchQueue = () => request<{ items: QueueItem[] }>("/api/admin/reports").then((r) => r.items);

export const dismissReport = (targetType: TargetType, targetId: string) => request<{ ok: true }>("/api/admin/reports", post({ targetType, targetId, action: "dismiss" }));

export const deleteReported = (targetType: TargetType, targetId: string, sanction?: SanctionRequest) =>
  request<{ ok: true; deleted: boolean }>("/api/admin/reports", post({ targetType, targetId, action: "delete", ...(sanction ? { sanction } : {}) }));

export const fetchSanctions = () => request<{ sanctions: ActiveSanction[] }>("/api/admin/sanctions").then((r) => r.sanctions);

export const liftSanction = (emailKey: string) => request<{ ok: true }>("/api/admin/sanctions", post({ action: "lift", emailKey }));
