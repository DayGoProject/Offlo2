import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침 — Offlo",
  description: "Offlo가 어떤 정보를 어떻게 쓰고 보관하며 삭제하는지 안내합니다.",
};

/**
 * 개인정보 처리방침 — Google Play 등록(개인정보처리방침 URL · 데이터 보안 양식)에 쓰는 공개 페이지. 로그인 없이 열린다.
 *
 * **내용은 실제 서버 동작과 같아야 한다** (거짓이면 스토어 정책 위반):
 *  - 저장하는 것 = `prisma/schema.prisma`(User · Analysis · Goal · Badge · Post · Comment · PostLike) + Firestore `users/{uid}/garden|notifications|aiUsage`
 *  - 스크린타임 이미지는 저장하지 않는다 (`/api/ai/analyze` · `/api/ai/chat` — Gemini에 전달하고 버린다)
 *  - 탈퇴(`DELETE /api/users/me`)는 Supabase 사용자(연관 데이터 cascade) + Firestore `users/{uid}` 전체(recursiveDelete) + Firebase Auth 계정을 지운다
 * 서버가 데이터를 더 모으거나 보관 방식이 바뀌면 이 문서를 먼저 고친다.
 */

/** 개인정보 문의 · 삭제 요청을 받을 이메일 — 비어 있으면 화면에 눈에 띄는 경고가 뜬다 (비워 둔 채 배포하지 않는다) */
const CONTACT_EMAIL = "jdongel2002@gmail.com";
/** 시행일 — 배포하는 날로 맞춘다 */
const EFFECTIVE_DATE = "2026년 10월 27일";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15, lineHeight: 1.75, color: "var(--text-primary-soft)" }}>
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, listStyle: "disc" }}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "56px 20px 96px", color: "var(--text-primary)" }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.04em" }}>OFFLO</p>
      <h1 style={{ fontSize: 30, fontWeight: 400, marginTop: 6 }}>개인정보 처리방침</h1>
      <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.75, color: "var(--text-secondary)" }}>
        Offlo(이하 &ldquo;서비스&rdquo;)는 스크린타임 스크린샷을 AI가 분석해 디지털 습관을 돌아보게 돕는 서비스입니다. 이 문서는 서비스(웹 · Android 앱)가 어떤 정보를 왜 쓰고, 어디에 보관하며, 어떻게 삭제하는지
        알려 드립니다. 시행일: {EFFECTIVE_DATE}
      </p>

      <Section title="1. 수집하는 정보">
        <List
          items={[
            <><strong>계정 정보</strong> — Google 로그인으로 받는 이름 · 이메일 주소 (Firebase Authentication). 비밀번호는 받지 않습니다.</>,
            <><strong>분석 결과</strong> — 앱별 사용 시간 · 카테고리별 시간 · 시간대 패턴 · 디톡스 점수 · AI가 만든 문제점 · 조언. 분석한 날짜(하루 1회) 기준으로 쌓입니다.</>,
            <><strong>목표 · 배지 · 정원</strong> — 사용자가 정한 목표(제목 · 기간 · 하루 목표 시간) · 받은 배지 · 식물과 동물의 성장 상태 · 연속 기록 · 동물 쓰다듬기 횟수.</>,
            <><strong>커뮤니티</strong> — 사용자가 직접 쓴 글 · 댓글 · 좋아요와 그 시각. 글과 댓글에는 <u>표시 이름이 함께 공개</u>됩니다.</>,
            <><strong>알림</strong> — 서비스가 보낸 알림(배지 획득 · 식물 성장 · 내 글에 달린 댓글)의 제목 · 내용 · 읽음 여부.</>,
            <><strong>AI 사용 횟수</strong> — 비용 남용을 막기 위해 하루에 AI 기능을 몇 번 불렀는지만 셉니다 (내용은 저장하지 않습니다).</>,
            <><strong>접속 기록</strong> — 서비스를 운영하는 과정에서 호스팅 사업자(Vercel)에 접속 시각 · IP 주소 같은 기술 기록이 자동으로 남을 수 있습니다.</>,
          ]}
        />
        <p>
          <strong>스크린타임 이미지는 저장하지 않습니다.</strong> 분석을 위해 사용자가 고른 이미지를 압축해 AI(Google Gemini)에 보내고, 응답을 받은 뒤 바로 버립니다. 이미지는 서비스의 데이터베이스나 이 기기의 저장소에
          복사되지 않습니다. 앱은 사진을 고를 때 시스템 사진 선택기만 사용하며 카메라 · 마이크 · 위치 · 연락처 · 광고 식별자에는 접근하지 않습니다.
        </p>
      </Section>

      <Section title="2. 정보를 쓰는 목적">
        <List
          items={[
            "로그인과 본인 확인, 계정 관리",
            "스크린타임 분석 결과 제공, AI 코치 대화 제공, 기록 · 추이 · 목표 달성 현황 표시",
            "정원(식물 · 동물) 성장, 배지, 커뮤니티 · 주간 랭킹 같은 서비스 기능 제공",
            "알림 제공 (앱이 켜져 있는 동안의 안내와, 사용자가 켠 경우 기기에 예약하는 리마인더)",
            "AI 기능의 비용 남용 방지와 서비스 안정 운영",
          ]}
        />
        <p>위 목적 외에 광고 · 마케팅 · 프로파일링에 쓰거나 판매하지 않습니다.</p>
      </Section>

      <Section title="3. 정보를 맡아 처리하는 곳 (국외 포함)">
        <p>서비스는 아래 업체의 클라우드 서비스를 이용하며, 정보는 이 업체들의 서버(대한민국 밖에 있을 수 있습니다)에서 처리됩니다.</p>
        <List
          items={[
            <><strong>Google</strong> (Firebase Authentication · Cloud Firestore · Gemini API) — 로그인 · 정원과 알림 데이터 보관 · 스크린타임 이미지와 분석 요청의 AI 처리. Google의 개인정보 정책에 따라 처리됩니다.</>,
            <><strong>Supabase</strong> — 계정 · 분석 결과 · 목표 · 배지 · 커뮤니티 글 · 댓글 · 좋아요를 보관하는 데이터베이스.</>,
            <><strong>Vercel</strong> — 서비스 서버 호스팅.</>,
          ]}
        />
      </Section>

      <Section title="4. 기기에만 저장되는 정보">
        <p>
          로그인 상태(로그인 유지를 위한 토큰)와 앱 설정(리마인더를 켰는지 여부)은 이 기기 안에만 저장되고 서버로 보내지 않습니다. 리마인더 알림(저녁 분석 · 동물 배고픔 · 목표 마감 하루 전)은 사용자가 설정에서 직접 켠 경우에만
          이 기기에서 예약되며, 로그아웃하면 예약이 모두 지워집니다. 알림 권한은 선택이며 거절해도 나머지 기능은 그대로 쓸 수 있습니다.
        </p>
      </Section>

      <Section title="5. 공개되는 정보">
        <p>
          커뮤니티에 올린 글 · 댓글 · 좋아요와 주간 랭킹에는 설정에서 정한 <strong>표시 이름</strong>이 다른 이용자에게 보입니다. 실명이 부담되면 앱 설정 &gt; 이름에서 언제든 바꿀 수 있습니다. 이메일 주소는 다른 이용자에게
          보이지 않습니다. 분석 결과 · 목표 · 정원 · 알림은 본인만 볼 수 있습니다.
        </p>
      </Section>

      <Section title="6. 보관 기간과 삭제">
        <List
          items={[
            "정보는 계정을 쓰는 동안 보관하고, 탈퇴하면 지웁니다.",
            <><strong>탈퇴 방법</strong> — 앱: 더보기 &gt; 설정 &gt; 회원 탈퇴 (확인 문구 입력). 웹: 설정 &gt; 회원 탈퇴.</>,
            "탈퇴하면 계정 · 분석 결과 · 목표 · 배지 · 정원 · 알림 · AI 사용 횟수 · 내가 쓴 글 · 댓글 · 좋아요가 삭제되고 Google 로그인 계정 연결도 해제됩니다. 삭제한 정보는 복구할 수 없습니다.",
            "앱을 지우기만 해서는 서버의 정보가 지워지지 않습니다. 정보를 지우려면 위 탈퇴를 이용하거나 아래 연락처로 삭제를 요청해 주세요.",
            "법령에 따라 보관해야 하는 정보가 생기면 그 기간 동안만 따로 보관합니다 (현재 해당하는 정보는 없습니다).",
          ]}
        />
      </Section>

      <Section title="7. 만 14세 미만 아동">
        <p>서비스는 만 14세 미만 아동을 대상으로 하지 않으며 아동의 개인정보를 알면서 수집하지 않습니다. 아동의 정보가 있다고 판단되면 아래 연락처로 알려 주세요. 확인 즉시 삭제합니다.</p>
      </Section>

      <Section title="8. 이용자의 권리">
        <p>이용자는 언제든 자신의 정보를 열람 · 정정 · 삭제하거나 처리를 중단하도록 요청할 수 있습니다. 이름은 설정에서 직접 고칠 수 있고, 삭제는 위 6항의 방법을 쓰거나 아래 연락처로 요청해 주세요.</p>
      </Section>

      <Section title="9. 방침의 변경">
        <p>이 방침이 바뀌면 서비스 안(이 페이지)에 변경 내용과 시행일을 알립니다.</p>
      </Section>

      <Section title="10. 문의처">
        {CONTACT_EMAIL ? (
          <p>
            개인정보 문의 · 삭제 요청: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--color-bloom)", textDecoration: "underline" }}>{CONTACT_EMAIL}</a>
          </p>
        ) : (
          <p style={{ color: "#FF5656" }}>※ 문의 이메일이 아직 설정되지 않았습니다 (src/app/privacy/page.tsx의 CONTACT_EMAIL) — 배포 전에 반드시 채우세요.</p>
        )}
      </Section>
    </main>
  );
}
