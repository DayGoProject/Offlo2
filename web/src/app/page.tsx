"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";

/* ── 애니메이션 ── */
const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 48 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: EASE },
  }),
};

const fadeLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};

const fadeRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};

function useScrollRef() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return { ref, inView };
}

/* ── 아이콘 ── */
function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#3DDB87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 8 6.5 11.5 13 4.5" />
    </svg>
  );
}

/* ── Hero ── */
function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-20">
      {/* 배경 비디오 */}
      <video
        aria-hidden
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* 비디오 다크 오버레이 */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "rgba(10,10,15,0.72)", zIndex: 1 }}
      />


      {/* 배경 글로우 */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(61,219,135,0.10) 0%, transparent 70%)",
          zIndex: 2,
        }}
      />

      {/* 배지 */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.12] rounded-full px-4 py-1.5 mb-8"
        style={{ position: "relative", zIndex: 10 }}
      >
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
        <span className="text-white/70 text-xs font-medium tracking-wide">
          AI 기반 디지털 디톡스 플랫폼
        </span>
      </motion.div>

      {/* 메인 헤드라인 */}
      <div className="text-center max-w-5xl mx-auto" style={{ position: "relative", zIndex: 10 }}>
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6 text-white"
        >
          스마트폰이<br />
          당신의 시간을<br />
          <span className="text-gradient">빼앗고 있습니다.</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="text-white/55 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          스크린타임 스크린샷 하나로 AI가 사용 습관을 분석해 드립니다.<br className="hidden sm:block" />
          반려 식물과 동물을 키우며 건강한 디지털 습관을 만들어 보세요.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href={ctaHref}
            className="flex items-center gap-2 bg-brand text-[#0A0A0F] font-bold px-8 py-4 rounded-full hover:opacity-90 transition-opacity text-base"
          >
            {ctaHref === "/analysis" ? "분석 시작하기" : "무료로 시작하기"} <IconArrow />
          </Link>
          <Link
            href="#analysis"
            className="flex items-center gap-2 px-8 py-4 rounded-full transition-all text-base"
            style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}
          >
            작동 방식 보기
          </Link>
        </motion.div>
      </div>

      {/* 스크롤 힌트 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ zIndex: 10 }}
      >
        <span className="text-white/30 text-xs tracking-widest uppercase">scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-white/25 to-transparent" />
      </motion.div>
    </section>
  );
}

/* ── 마키 스트립 ── */
function MarqueeStrip() {
  const tags = [
    "AI 스크린타임 분석", "반려식물 키우기", "반려동물 성장",
    "디지털 디톡스", "뱃지 & 칭호", "목표 설정", "분석 히스토리",
    "개인정보 보호", "주간 리포트", "중독 패턴 감지",
  ];
  const doubled = [...tags, ...tags];

  return (
    <div className="border-y border-black/[0.06] dark:border-white/[0.06] py-4 overflow-hidden bg-black/[0.02] dark:bg-white/[0.01]">
      <div className="flex animate-marquee whitespace-nowrap gap-12">
        {doubled.map((tag, i) => (
          <span key={i} className="text-black/30 dark:text-white/25 text-sm font-medium flex items-center gap-3">
            <span className="text-brand/60">✦</span> {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── AI 분석 섹션 ── */
function AnalysisSection({ ctaHref }: { ctaHref: string }) {
  const { ref, inView } = useScrollRef();

  return (
    <section id="analysis" ref={ref} className="py-28 px-6 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        {/* 텍스트 */}
        <motion.div variants={fadeLeft} initial="hidden" animate={inView ? "visible" : "hidden"}>
          <span className="text-brand text-xs font-bold tracking-widest uppercase mb-4 block">
            AI 스크린타임 분석
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6 text-[#0A0A0F] dark:text-white">
            AI가 당신의<br />스크린타임을<br />
            <span className="text-gradient">정밀 분석합니다</span>
          </h2>
          <p className="text-black/50 dark:text-white/50 text-base leading-relaxed mb-8 max-w-md">
            스마트폰 스크린타임 스크린샷을 업로드하면 Gemini AI가 앱별
            사용 패턴을 분석하고 구체적인 개선 방향을 제시합니다.
          </p>
          <ul className="space-y-3 mb-10">
            {[
              "앱별 사용 시간 자동 분석",
              "중독 패턴 감지 및 경고",
              "맞춤형 디톡스 플랜 제안",
              "주간 사용 변화 리포트",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-black/60 dark:text-white/70 text-sm">
                <IconCheck /> {item}
              </li>
            ))}
          </ul>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 border border-brand/40 text-brand px-6 py-3 rounded-full hover:bg-brand/10 transition-all text-sm font-semibold"
          >
            지금 분석해보기 <IconArrow />
          </Link>
        </motion.div>

        {/* AI 채팅 카드 */}
        <motion.div
          variants={fadeRight}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="relative"
        >
          <div
            aria-hidden
            className="absolute -inset-10 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(61,219,135,0.07) 0%, transparent 70%)" }}
          />
          <div className="relative bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-none">
            {/* 채팅 헤더 */}
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-black/[0.07] dark:border-white/[0.07]">
              <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center text-xs font-bold text-brand">
                AI
              </div>
              <span className="text-[#0A0A0F] dark:text-white text-sm font-semibold">Offlo AI 코치</span>
              <span className="ml-auto text-[10px] text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full font-semibold">
                분석 완료
              </span>
            </div>

            {/* 채팅 메시지 */}
            <div className="px-5 py-5 space-y-3.5">
              {/* AI 첫 메시지 */}
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-brand/20 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-brand mt-0.5">AI</div>
                <div className="bg-black/[0.05] dark:bg-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed text-black/80 dark:text-white/85 max-w-[85%]">
                  이번 주 인스타그램 사용이{" "}
                  <span className="text-brand font-semibold">3시간 42분</span>으로
                  가장 많아요. 특히 취침 전에 집중됐어요.
                </div>
              </div>

              {/* 유저 메시지 */}
              <div className="flex justify-end">
                <div className="bg-brand/15 border border-brand/20 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-black/80 dark:text-white/85 max-w-[80%]">
                  어떻게 줄일 수 있을까요?
                </div>
              </div>

              {/* AI 답변 */}
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-brand/20 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-brand mt-0.5">AI</div>
                <div className="bg-black/[0.05] dark:bg-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed text-black/80 dark:text-white/85 max-w-[85%]">
                  밤 11시 이후{" "}
                  <span className="text-brand font-semibold">앱 사용 금지</span>를
                  설정하고, 반려식물 미션을 함께 실천해 보세요 🌱
                </div>
              </div>

              {/* 유저 메시지 2 */}
              <div className="flex justify-end">
                <div className="bg-brand/15 border border-brand/20 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-black/80 dark:text-white/85 max-w-[80%]">
                  알겠어요, 실천해볼게요!
                </div>
              </div>

              {/* AI 마무리 */}
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-brand/20 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-brand mt-0.5">AI</div>
                <div className="bg-brand/[0.08] border border-brand/20 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed text-black/80 dark:text-white/85 max-w-[85%]">
                  좋아요! 오늘부터 디톡스 점수가 쌓이기 시작해요 ✨
                  <span className="block text-brand font-semibold mt-1 text-xs">7일 연속 달성 시 뱃지 획득!</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── 반려 섹션 ── */
function CompanionSection({ ctaHref }: { ctaHref: string }) {
  const { ref, inView } = useScrollRef();
  const plantStages = [
    { emoji: "🌱", label: "새싹", days: "1일차", active: false },
    { emoji: "🌿", label: "잎", days: "7일차", active: false },
    { emoji: "🌳", label: "나무", days: "30일차", active: true },
    { emoji: "🌲", label: "거목", days: "90일차", active: false },
  ];

  return (
    <section id="companion" className="py-28 px-6 bg-black/[0.02] dark:bg-white/[0.01]">
      <div className="max-w-7xl mx-auto">
        <div ref={ref} className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* 목업 */}
          <motion.div
            variants={fadeLeft}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            className="relative"
          >
            <div
              aria-hidden
              className="absolute -inset-10 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(61,219,135,0.07) 0%, transparent 70%)" }}
            />
            <div className="relative bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-6 shadow-sm dark:shadow-none">
              <div className="flex gap-2 mb-5">
                <button className="flex-1 py-2 rounded-lg bg-brand/15 border border-brand/30 text-brand text-sm font-semibold">
                  반려식물
                </button>
                <button className="flex-1 py-2 rounded-lg text-black/40 dark:text-white/40 text-sm hover:text-black/60 dark:hover:text-white/60 transition-colors">
                  반려동물
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-5">
                {plantStages.map((p) => (
                  <div
                    key={p.label}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      p.active
                        ? "bg-brand/10 border-brand/30"
                        : "bg-black/[0.03] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.06]"
                    }`}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <span className={`text-xs font-semibold ${p.active ? "text-brand" : "text-black/30 dark:text-white/30"}`}>
                      {p.label}
                    </span>
                    <span className="text-black/25 dark:text-white/25 text-[10px]">{p.days}</span>
                  </div>
                ))}
              </div>
              <div className="bg-black/[0.04] dark:bg-white/[0.03] rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-black/60 dark:text-white/60 text-sm">오늘의 디톡스 시간</span>
                  <span className="text-brand text-sm font-semibold">3시간 12분</span>
                </div>
                <div className="h-1.5 bg-black/[0.07] dark:bg-white/[0.06] rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-brand/60"
                    initial={{ width: 0 }}
                    animate={inView ? { width: "64%" } : { width: 0 }}
                    transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                  />
                </div>
                <p className="text-black/30 dark:text-white/30 text-xs">목표까지 1시간 48분 남았습니다 🌿</p>
              </div>
            </div>
          </motion.div>

          {/* 텍스트 */}
          <motion.div variants={fadeRight} initial="hidden" animate={inView ? "visible" : "hidden"}>
            <span className="text-brand text-xs font-bold tracking-widest uppercase mb-4 block">
              반려식물 &amp; 반려동물
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6 text-[#0A0A0F] dark:text-white">
              화면을 끌수록<br />
              <span className="text-gradient">자라는 나만의 반려</span>
            </h2>
            <p className="text-black/50 dark:text-white/50 text-base leading-relaxed mb-8 max-w-md">
              스마트폰을 내려놓은 시간만큼 반려 식물과 동물이 성장합니다.
              꾸준히 디톡스를 지속하면 더 희귀한 모습으로 진화해요.
            </p>
            <ul className="space-y-3 mb-10">
              {[
                "디톡스 시간에 따라 단계적 성장",
                "반려식물·반려동물 중 선택",
                "희귀 진화 형태 잠금 해제",
                "성장 일지 & 히스토리 기록",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-black/60 dark:text-white/70 text-sm">
                  <IconCheck /> {item}
                </li>
              ))}
            </ul>
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 border border-brand/40 text-brand px-6 py-3 rounded-full hover:bg-brand/10 transition-all text-sm font-semibold"
            >
              반려 키우기 시작 <IconArrow />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── 부가 기능 그리드 ── */
const subFeatures = [
  { emoji: "🏅", title: "뱃지 & 칭호", desc: "목표를 달성하면 뱃지와 칭호를 획득합니다. 인스타그램 스토리로 공유해 성과를 자랑하세요." },
  { emoji: "🎯", title: "목표 설정", desc: "하루·주간 스크린타임 목표를 직접 설정하고, 달성률과 스트릭(연속 달성)을 추적하세요." },
  { emoji: "📊", title: "분석 히스토리", desc: "과거 분석 기록을 한눈에 확인하고 내 디지털 습관이 어떻게 변화했는지 추이를 살펴보세요." },
  { emoji: "🔒", title: "개인정보 보호", desc: "업로드한 스크린샷은 AI 분석 즉시 삭제됩니다. 내 데이터는 오직 나만 볼 수 있어요." },
];

function SubFeatures() {
  const { ref, inView } = useScrollRef();

  return (
    <section id="features" className="py-28 px-6 max-w-7xl mx-auto" ref={ref}>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="text-center mb-16"
      >
        <span className="text-brand text-xs font-bold tracking-widest uppercase mb-4 block">
          더 많은 기능
        </span>
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0A0A0F] dark:text-white">
          디톡스를 더 즐겁게 만드는<br />
          <span className="text-gradient">모든 것</span>
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {subFeatures.map((f, i) => (
          <motion.div
            key={f.title}
            variants={fadeUp}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            custom={i}
            className="group bg-white/80 dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl p-6 hover:border-brand/20 hover:bg-white dark:hover:bg-white/[0.05] transition-all duration-300 shadow-sm dark:shadow-none"
          >
            <span className="text-3xl mb-4 block">{f.emoji}</span>
            <h3 className="text-[#0A0A0F] dark:text-white font-bold mb-2">{f.title}</h3>
            <p className="text-black/45 dark:text-white/45 text-sm leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── CTA 배너 ── */
function CTABanner({ ctaHref }: { ctaHref: string }) {
  const { ref, inView } = useScrollRef();

  return (
    <section className="py-28 px-6" ref={ref}>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="max-w-4xl mx-auto text-center relative"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(61,219,135,0.06) 0%, transparent 70%)" }}
        />
        <div className="border border-black/[0.07] dark:border-white/[0.07] rounded-3xl bg-white/60 dark:bg-white/[0.02] px-8 py-16 sm:py-20 shadow-sm dark:shadow-none">
          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 text-[#0A0A0F] dark:text-white">
            지금 바로<br />
            <span className="text-gradient">시작하세요</span>
          </h2>
          <p className="text-black/40 dark:text-white/40 text-lg mb-10">
            스크린샷 하나로 AI가 당신의 디지털 습관을 분석해 드립니다.
          </p>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 bg-brand text-[#0A0A0F] font-bold px-10 py-4 rounded-full hover:opacity-90 transition-opacity text-base"
          >
            {ctaHref === "/analysis" ? "분석 시작하기" : "무료 계정 만들기"} <IconArrow />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="border-t border-black/[0.06] dark:border-white/[0.06] py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-gradient text-sm font-extrabold">Offlo</span>
        <span className="text-black/25 dark:text-white/25 text-sm">© 2026 Offlo. All rights reserved.</span>
        <div className="flex items-center gap-6">
          <Link href="#" className="text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 text-sm transition-colors">개인정보처리방침</Link>
          <Link href="#" className="text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 text-sm transition-colors">이용약관</Link>
          <Link href="#" className="text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 text-sm transition-colors">문의하기</Link>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ── */
export default function LandingPage() {
  const { user } = useAuth();
  const ctaHref = user ? "/analysis" : "/signup";

  return (
    <>
      <Navbar />
      <main>
        <Hero ctaHref={ctaHref} />
        <MarqueeStrip />
        <AnalysisSection ctaHref={ctaHref} />
        <CompanionSection ctaHref={ctaHref} />
        <SubFeatures />
        <CTABanner ctaHref={ctaHref} />
      </main>
      <Footer />
    </>
  );
}
