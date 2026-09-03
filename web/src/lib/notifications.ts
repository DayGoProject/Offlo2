import { getAdminFirestore } from "@/lib/firebase-admin";

/* ── 알림 서버 유틸 (서버 전용 — firebase-admin 의존) ──────────
   클라이언트 컴포넌트에서 import 금지.
   Firestore users/{uid}/notifications 에 Admin SDK로 알림을 생성한다.
   ────────────────────────────────────────────────────────── */

export type NotificationType =
  | "badge_earned"
  | "plant_levelup"
  | "goal_deadline"
  | "pet_hungry"
  | "daily_reminder"
  | "post_comment";

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/** 알림 문서 1건 생성 (Admin SDK). 실패해도 호출부에 영향 없도록 호출부에서 catch. */
export async function createNotification(uid: string, input: NotificationInput): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(`users/${uid}/notifications`).add({
    type: input.type,
    title: input.title,
    body: input.body,
    ...(input.link ? { link: input.link } : {}),
    read: false,
    createdAt: new Date().toISOString(),
  });
}

/* ── 이벤트별 래퍼 ────────────────────────────────────────── */

export function notifyBadgeEarned(uid: string, badgeName: string): Promise<void> {
  return createNotification(uid, {
    type: "badge_earned",
    title: "새 배지 획득 🏆",
    body: `'${badgeName}' 배지를 얻었어요!`,
    link: "/badges",
  });
}

export function notifyPlantLevelUp(uid: string, levelName: string): Promise<void> {
  return createNotification(uid, {
    type: "plant_levelup",
    title: "반려 식물이 성장했어요 🌱",
    body: `식물이 '${levelName}' 단계로 자랐어요!`,
    link: "/garden",
  });
}

export function notifyPostComment(
  uid: string,
  commenterName: string,
  postId: string
): Promise<void> {
  return createNotification(uid, {
    type: "post_comment",
    title: "새 댓글이 달렸어요 💬",
    body: `${commenterName}님이 회원님의 글에 댓글을 남겼어요.`,
    link: `/community?post=${postId}`,
  });
}
