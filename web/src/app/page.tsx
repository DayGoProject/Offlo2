"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Navbar from "@/components/Navbar";

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
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-20">
      {/* 배경 글로우 */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(61,219,135,0.07) 0%, transparent 70%)",
        }}
      />

      {/* 배지 */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="flex items-center gap-2 bg-black/[0.05] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-full px-4 py-1.5 mb-8"
      >
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
        <span className="text-black/60 dark:text-white/70 text-xs font-medium tracking-wide">
          AI 기반 디지털 디톡스 플랫폼
        </span>
      </motion.div>

      {/* 메인 헤드라인 */}
      <div className="text-center max-w-5xl mx-auto">
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6 text-[#0A0A0F] dark:text-white"
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
          className="text-black/50 dark:text-white/50 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
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
            href="/signup"
            className="flex items-center gap-2 bg-brand text-[#0A0A0F] font-bold px-8 py-4 rounded-full hover:opacity-90 transition-opacity text-base"
          >
            무료로 시작하기 <IconArrow />
          </Link>
          <Link
            href="#analysis"
            className="flex items-center gap-2 border border-black/[0.15] dark:border-white/15 text-black/60 dark:text-white/70 px-8 py-4 rounded-full hover:border-black/[0.3] dark:hover:border-white/30 hover:text-black dark:hover:text-white transition-all text-base"
          >
            작동 방식 보기
          </Link>
        </motion.div>
      </div>

      {/* 통계 */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={4}
        className="mt-20 flex flex-col sm:flex-row items-center gap-10 sm:gap-16"
      >
        {[
          { value: "12,400+", label: "활성 사용자" },
          { value: "2.3시간", label: "하루 평균 절약" },
          { value: "47+", label: "획득 가능한 뱃지" },
        ].map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-3xl sm:text-4xl font-extrabold text-gradient">{stat.value}</div>
            <div className="text-black/40 dark:text-white/40 text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* 스크롤 힌트 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-black/20 dark:text-white/20 text-xs tracking-widest uppercase">scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-black/20 dark:from-white/20 to-transparent" />
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
function AnalysisSection() {
  const { ref, inView } = useScrollRef();
  const bars = [
    { app: "인스타그램", time: "3시간 42분", pct: 88 },
    { app: "유튜브", time: "2시간 15분", pct: 54 },
    { app: "카카오톡", time: "1시간 08분", pct: 27 },
    { app: "틱톡", time: "58분", pct: 23 },
  ];

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
            href="/signup"
            className="inline-flex items-center gap-2 border border-brand/40 text-brand px-6 py-3 rounded-full hover:bg-brand/10 transition-all text-sm font-semibold"
          >
            지금 분석해보기 <IconArrow />
          </Link>
        </motion.div>

        {/* 목업 카드 */}
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
          <div className="relative bg-white/70 dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[#0A0A0F] dark:text-white font-semibold text-sm">이번 주 스크린타임</span>
              <span className="text-brand text-xs font-bold bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full">
                AI 분석 완료
              </span>
            </div>
            <div className="space-y-4">
              {bars.map((row) => (
                <div key={row.app}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-black/70 dark:text-white/80 text-sm">{row.app}</span>
                    <span className="text-black/40 dark:text-white/40 text-sm">{row.time}</span>
                  </div>
                  <div className="h-1.5 bg-black/[0.07] dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-brand/60"
                      initial={{ width: 0 }}
                      animate={inView ? { width: `${row.pct}%` } : { width: 0 }}
                      transition={{ duration: 1, delay: 0.3 + bars.indexOf(row) * 0.1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 bg-brand/[0.06] border border-brand/[0.15] rounded-xl p-4">
              <p className="text-brand/80 text-xs font-semibold mb-1">AI 분석 결과</p>
              <p className="text-black/60 dark:text-white/60 text-sm leading-relaxed">
                인스타그램 사용 시간이 평균 대비{" "}
                <strong className="text-brand">47% 높습니다.</strong>{" "}
                취침 전 1시간 사용을 줄이면 수면 질 개선 효과가 기대됩니다.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── 반려 섹션 ── */
function CompanionSection() {
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
              href="/signup"
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
function CTABanner() {
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
            12,400명이 이미 디지털 디톡스를 시작했습니다.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-brand text-[#0A0A0F] font-bold px-10 py-4 rounded-full hover:opacity-90 transition-opacity text-base"
          >
            무료 계정 만들기 <IconArrow />
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
        <span className="text-black/25 dark:text-white/25 text-sm">© 2025 Offlo. All rights reserved.</span>
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
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <MarqueeStrip />
        <AnalysisSection />
        <CompanionSection />
        <SubFeatures />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
