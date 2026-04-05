import * as admin from "firebase-admin";

/* ── Firebase Admin 싱글톤 ─────────────────────────────────── */

function getAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.");

  return admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(raw)),
  });
}

/* ── Firebase ID Token 검증 → uid 반환 ─────────────────────── */

/**
 * Authorization: Bearer <token> 헤더를 검증하고 uid를 반환한다.
 * 실패 시 status 속성이 포함된 Error를 throw한다.
 */
export async function verifyIdToken(req: Request): Promise<string> {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw apiError("인증이 필요합니다.", 401);
  }

  const token = authorization.slice(7);
  try {
    const decoded = await getAdminApp().auth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw apiError("유효하지 않은 토큰입니다.", 401);
  }
}

/** Firebase ID Token에서 디코딩된 클레임 전체를 반환한다. */
export async function verifyIdTokenFull(req: Request): Promise<admin.auth.DecodedIdToken> {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw apiError("인증이 필요합니다.", 401);
  }

  const token = authorization.slice(7);
  try {
    return await getAdminApp().auth().verifyIdToken(token);
  } catch {
    throw apiError("유효하지 않은 토큰입니다.", 401);
  }
}

/* ── 에러 헬퍼 ─────────────────────────────────────────────── */

interface ApiError extends Error {
  status: number;
}

export function apiError(message: string, status: number): ApiError {
  return Object.assign(new Error(message), { status });
}

/**
 * try/catch 블록에서 잡힌 에러를 일관된 JSON Response로 변환한다.
 * status 속성이 있으면 그 값을, 없으면 500을 사용한다.
 */
export function handleApiError(e: unknown): Response {
  if (e instanceof Error && "status" in e) {
    return Response.json({ error: e.message }, { status: (e as ApiError).status });
  }
  console.error("[API Error]", e);
  return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
}
