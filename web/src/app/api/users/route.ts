import { verifyIdToken, apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

/* ── POST /api/users — Supabase에 유저 생성 (Google로 **처음 로그인하는 순간** 앱 · 웹 로그인 화면이 부른다 — 가입 페이지는 없다) ── */

const USER_SELECT = { id: true, uid: true, email: true, name: true, premium: true, createdAt: true } as const;

/** Prisma 유니크 제약 위반 (uid 또는 email이 이미 있다) */
const isUniqueViolation = (e: unknown): boolean => typeof e === "object" && e !== null && (e as { code?: unknown }).code === "P2002";

export async function POST(req: Request): Promise<Response> {
  try {
    const uid = await verifyIdToken(req);

    const body = await req.json().catch(() => {
      throw apiError("요청 본문이 올바르지 않습니다.", 400);
    });

    const { email, name } = body as { email?: unknown; name?: unknown };

    if (typeof email !== "string" || !email.includes("@")) {
      throw apiError("유효한 이메일이 필요합니다.", 400);
    }
    if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      throw apiError("이름은 1~100자여야 합니다.", 400);
    }

    // uid가 일치하는 경우에만 생성 — 타인 계정을 uid 조작으로 생성하는 것을 방지
    try {
      const user = await prisma.user.upsert({
        where: { uid },
        update: {},          // 이미 존재하면 변경 없음 (중복 가입 방지)
        create: { uid, email: email.trim(), name: name.trim() },
        select: USER_SELECT,
      });
      return Response.json({ user }, { status: 201 });
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      // 두 기기에서 동시에 처음 로그인하면 upsert가 서로 부딪쳐 한쪽이 유니크 위반을 만난다 — 이미 만들어졌으니 그 계정을 돌려준다
      const existing = await prisma.user.findUnique({ where: { uid }, select: USER_SELECT });
      if (existing) return Response.json({ user: existing }, { status: 201 });
      // uid는 없는데 이메일이 이미 있다 — 같은 이메일의 다른 로그인 계정(예전 이메일 가입 등)이 있다
      throw apiError("이 이메일로 이미 가입된 다른 계정이 있습니다. 계정 연결이 필요하면 문의해주세요.", 409);
    }
  } catch (e) {
    return handleApiError(e);
  }
}
