import Link from "next/link";
import s from "./page.module.css";
import Navbar from "@/components/Navbar";

/* ─── 아이콘 ─────────────────────────────────────────────── */
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#3DDB87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 8 6.5 11.5 13 4.5" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

/* ─── Hero ───────────────────────────────────────────────── */
function Hero() {
  return (
    <section className={s.hero}>
      <div aria-hidden className={s.heroBg} />

      <div className={`${s.heroBadge} animate-fade-up delay-1`}>
        <span className={s.heroBadgeDot} />
        <span className={s.heroBadgeText}>AI 기반 디지털 디톡스 플랫폼</span>
      </div>

      <h1 className={`${s.heroTitle} animate-fade-up delay-2`}>
        스마트폰이 당신의<br />
        시간을 <span className="text-gradient">빼앗고 있습니다.</span>
      </h1>

      <p className={`${s.heroSubtitle} animate-fade-up delay-3`}>
        스크린타임 스크린샷 하나로 AI가 사용 습관을 분석해 드립니다.
        반려 식물과 동물을 키우며 건강한 디지털 습관을 만들어 보세요.
      </p>

      <div className={`${s.heroCtas} animate-fade-up delay-4`}>
        <Link href="/signup" className={s.brandButton}>
          무료로 시작하기 <IconArrow />
        </Link>
        <Link href="#analysis" className={s.ghostButton}>
          작동 방식 보기
        </Link>
      </div>

      <div className={`${s.heroStats} animate-fade-up delay-5`}>
        {[
          { value: "12,400+", label: "활성 사용자" },
          { value: "2.3시간",  label: "하루 평균 절약" },
          { value: "47+",     label: "획득 가능한 뱃지" },
        ].map((stat) => (
          <div key={stat.label}>
            <div className={`${s.statValue} text-gradient`}>{stat.value}</div>
            <div className={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── AI 분석 섹션 ────────────────────────────────────────── */
function AnalysisSection() {
  const bars = [
    { app: "인스타그램", time: "3시간 42분", pct: 88 },
    { app: "유튜브",     time: "2시간 15분", pct: 54 },
    { app: "카카오톡",   time: "1시간 08분", pct: 27 },
    { app: "틱톡",       time: "58분",       pct: 23 },
  ];

  return (
    <section id="analysis" className={s.featureSection}>
      {/* 텍스트 */}
      <div>
        <span className={s.featureLabel}>AI 스크린타임 분석</span>
        <h2 className={s.featureTitle}>
          AI가 당신의 스크린타임을<br />
          <span className="text-gradient">정밀 분석합니다</span>
        </h2>
        <p className={s.featureDesc}>
          스마트폰 스크린타임 스크린샷을 업로드하면 Gemini AI가
          앱별 사용 패턴을 분석하고 구체적인 개선 방향을 제시합니다.
          어디서 시간을 낭비하는지 한눈에 파악하세요.
        </p>
        <ul className={s.checkList}>
          {["앱별 사용 시간 자동 분석", "중독 패턴 감지 및 경고", "맞춤형 디톡스 플랜 제안", "주간 사용 변화 리포트"].map((item) => (
            <li key={item} className={s.checkItem}><IconCheck />{item}</li>
          ))}
        </ul>
        <Link href="/signup" className={s.featureCta}>
          지금 분석해보기 <IconArrow />
        </Link>
      </div>

      {/* 목업 */}
      <div className={s.mockupWrapper}>
        <div aria-hidden className={s.mockupGlow} />
        <div className={s.mockupCard}>
          <div className={s.mockupHeader}>
            <span className={s.mockupTitle}>이번 주 스크린타임</span>
            <span className={s.mockupBadge}>AI 분석 완료</span>
          </div>
          {bars.map((row) => (
            <div key={row.app} className={s.barItem}>
              <div className={s.barLabels}>
                <span className={s.barApp}>{row.app}</span>
                <span className={s.barTime}>{row.time}</span>
              </div>
              <div className={s.barTrack}>
                <div className={s.barFill} style={{ width: `${row.pct}%`, opacity: 0.6 + row.pct / 250 }} />
              </div>
            </div>
          ))}
          <div className={s.aiComment}>
            <p className={s.aiCommentLabel}>AI 분석 결과</p>
            <p className={s.aiCommentText}>
              인스타그램 사용 시간이 평균 대비{" "}
              <strong className={s.aiCommentStrong}>47% 높습니다.</strong>{" "}
              취침 전 1시간 사용을 줄이면 수면 질 개선 효과가 기대됩니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 반려 섹션 ───────────────────────────────────────────── */
function CompanionSection() {
  const plantStages = [
    { emoji: "🌱", label: "새싹",  days: "1일차",  active: false },
    { emoji: "🌿", label: "잎",    days: "7일차",  active: false },
    { emoji: "🌳", label: "나무",  days: "30일차", active: true  },
    { emoji: "🌲", label: "거목",  days: "90일차", active: false },
  ];

  return (
    <section id="companion" className={s.featureSection}>
      {/* 목업 */}
      <div className={`${s.mockupWrapper} ${s.companionMockup}`}>
        <div aria-hidden className={s.mockupGlow} />
        <div className={s.mockupCard}>
          <div className={s.tabs}>
            <button className={s.tabActive}>반려식물</button>
            <button className={s.tabInactive}>반려동물</button>
          </div>
          <div className={s.stages}>
            {plantStages.map((p) => (
              <div key={p.label} className={p.active ? s.stageActive : s.stageInactive}>
                <span className={s.stageEmoji}>{p.emoji}</span>
                <span className={p.active ? s.stageLabelActive : s.stageLabelInactive}>{p.label}</span>
                <span className={s.stageDays}>{p.days}</span>
              </div>
            ))}
          </div>
          <div className={s.detoxStatus}>
            <div className={s.detoxRow}>
              <span className={s.detoxLabel}>오늘의 디톡스 시간</span>
              <span className={s.detoxValue}>3시간 12분</span>
            </div>
            <div className={s.detoxTrack}>
              <div className={s.detoxFill} />
            </div>
            <p className={s.detoxNote}>목표까지 1시간 48분 남았습니다 🌿</p>
          </div>
        </div>
      </div>

      {/* 텍스트 */}
      <div className={s.companionContent}>
        <span className={s.featureLabel}>반려식물 &amp; 반려동물</span>
        <h2 className={s.featureTitle}>
          화면을 끌수록<br />
          <span className="text-gradient">자라는 나만의 반려</span>
        </h2>
        <p className={s.featureDesc}>
          스마트폰을 내려놓은 시간만큼 반려 식물과 동물이 성장합니다.
          꾸준히 디톡스를 지속하면 더 희귀한 모습으로 진화해요.
          반려가 시드는 걸 보고 싶지 않다면, 오늘도 화면을 꺼보세요.
        </p>
        <ul className={s.checkList}>
          {["디톡스 시간에 따라 단계적 성장", "반려식물·반려동물 중 선택", "희귀 진화 형태 잠금 해제", "성장 일지 & 히스토리 기록"].map((item) => (
            <li key={item} className={s.checkItem}><IconCheck />{item}</li>
          ))}
        </ul>
        <Link href="/signup" className={s.featureCta}>
          반려 키우기 시작 <IconArrow />
        </Link>
      </div>
    </section>
  );
}

/* ─── 기타 기능 ───────────────────────────────────────────── */
const subFeatures = [
  { emoji: "🏅", title: "뱃지 & 칭호",    desc: "목표를 달성하면 뱃지와 칭호를 획득합니다. 인스타그램 스토리로 공유해 성과를 자랑하세요." },
  { emoji: "🎯", title: "목표 설정",       desc: "하루·주간 스크린타임 목표를 직접 설정하고, 달성률과 스트릭(연속 달성)을 추적하세요." },
  { emoji: "📊", title: "분석 히스토리",   desc: "과거 분석 기록을 한눈에 확인하고 내 디지털 습관이 어떻게 변화했는지 추이를 살펴보세요." },
  { emoji: "🔒", title: "개인정보 보호",   desc: "업로드한 스크린샷은 AI 분석 즉시 삭제됩니다. 내 데이터는 오직 나만 볼 수 있어요." },
];

function SubFeatures() {
  return (
    <section id="features" className={s.subFeaturesSection}>
      <div className={s.subFeaturesHeader}>
        <span className={s.subFeaturesLabel}>더 많은 기능</span>
        <h2 className={s.subFeaturesTitle}>
          디톡스를 더 즐겁게 만드는<br />
          <span className="text-gradient">모든 것</span>
        </h2>
      </div>
      <div className={s.subFeaturesGrid}>
        {subFeatures.map((f) => (
          <div key={f.title} className={s.subFeatureCard}>
            <span className={s.subFeatureEmoji}>{f.emoji}</span>
            <h3 className={s.subFeatureTitle}>{f.title}</h3>
            <p className={s.subFeatureDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── CTA 배너 ────────────────────────────────────────────── */
function CTABanner() {
  return (
    <section className={s.ctaBannerSection}>
      <div className={s.ctaBannerInner}>
        <h2 className={s.ctaBannerTitle}>지금 바로 시작하세요</h2>
        <p className={s.ctaBannerText}>12,400명이 이미 디지털 디톡스를 시작했습니다.</p>
        <Link href="/signup" className={s.ctaBannerButton}>
          무료 계정 만들기 <IconArrow />
        </Link>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <span className="text-gradient" style={{ fontSize: "0.875rem", fontWeight: 800 }}>Offlo</span>
        <span>© 2025 Offlo. All rights reserved.</span>
        <div className={s.footerLinks}>
          <Link href="#" className={s.footerLink}>개인정보처리방침</Link>
          <Link href="#" className={s.footerLink}>이용약관</Link>
          <Link href="#" className={s.footerLink}>문의하기</Link>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AnalysisSection />
        <CompanionSection />
        <SubFeatures />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
