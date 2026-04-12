import { verifyIdToken, apiError, handleApiError } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

/* ── POST /api/users — 회원가입 시 Supabase에 유저 생성 ─────── */

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
    const user = await prisma.user.upsert({
      where: { uid },
      update: {},          // 이미 존재하면 변경 없음 (중복 가입 방지)
      create: { uid, email: email.trim(), name: name.trim() },
      select: { id: true, uid: true, email: true, name: true, premium: true, createdAt: true },
    });

    return Response.json({ user }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
