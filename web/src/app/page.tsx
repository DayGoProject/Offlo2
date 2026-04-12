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
  const previewApps = [
    { name: "인스타그램", time: "1h 42m", pct: 72 },
    { name: "유튜브", time: "1h 18m", pct: 55 },
    { name: "카카오톡", time: "48m", pct: 34 },
  ];

  return (
    <section className="relative overflow-hidden flex flex-col" style={{ minHeight: "100svh", background: "var(--bg-page)" }}>
      {/* 배경 글로우 */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          top: 0, right: 0, width: "60%", height: "100%",
          background: "radial-gradient(ellipse 70% 70% at 70% 40%, rgba(61,219,135,0.11) 0%, transparent 65%)",
        }}
      />
      {/* 그리드 텍스처 */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line) 1px, transparent 1px),linear-gradient(90deg,var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* 메인 콘텐츠 */}
      <div
        className="relative flex-1 flex items-center gap-0 z-10 max-w-[1440px] mx-auto w-full"
        style={{ padding: "96px 80px 48px" }}
      >
        {/* 왼쪽: 텍스트 블록 */}
        <div className="flex flex-col flex-shrink-0" style={{ width: "min(600px, 50%)" }}>
          {/* 배지 */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="flex items-center gap-2 w-fit rounded-full px-4 py-1.5 mb-8"
            style={{ background: "rgba(61,219,135,0.07)", border: "1px solid rgba(61,219,135,0.18)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span className="text-[11px] font-medium tracking-widest" style={{ color: "rgba(61,219,135,0.85)" }}>
              AI 기반 디지털 디톡스
            </span>
          </motion.div>

          {/* 헤드라인 */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="mb-9">
            <div className="font-extrabold text-[var(--text-primary)]" style={{ fontSize: "clamp(44px, 5.3vw, 76px)", lineHeight: 1.02, letterSpacing: "-0.03em" }}>스마트폰이</div>
            <div className="font-extrabold text-[var(--text-primary)]" style={{ fontSize: "clamp(44px, 5.3vw, 76px)", lineHeight: 1.02, letterSpacing: "-0.03em" }}>당신의 시간을</div>
            <div className="font-extrabold text-gradient" style={{ fontSize: "clamp(44px, 5.3vw, 76px)", lineHeight: 1.02, letterSpacing: "-0.03em" }}>빼앗고 있습니다.</div>
          </motion.div>

          {/* 서브텍스트 */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-base leading-[1.8] mb-10"
            style={{ color: "var(--text-muted)", maxWidth: "480px" }}
          >
            스크린타임 스크린샷 하나를 업로드하면 Gemini AI가<br />
            앱별 사용 패턴을 분석하고 디톡스 플랜을 제안합니다.
          </motion.p>

          {/* CTA 버튼 */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex items-center gap-3 mb-12"
          >
            <Link
              href={ctaHref}
              className="flex items-center gap-2 bg-brand text-[#0A0A0F] font-bold px-7 py-3.5 rounded-full hover:opacity-90 transition-opacity text-sm"
            >
              {ctaHref === "/analysis" ? "분석 시작하기" : "무료로 시작하기"} <IconArrow />
            </Link>
            <Link
              href="#analysis"
              className="flex items-center gap-2 px-7 py-3.5 rounded-full text-sm transition-all"
              style={{ border: "1px solid var(--border-medium)", color: "var(--text-muted)" }}
            >
              작동 방식 보기
            </Link>
          </motion.div>
        </div>

        {/* 오른쪽: 앱 프리뷰 카드 */}
        <motion.div
          className="flex-1 hidden lg:flex items-center justify-center"
          style={{ height: "780px" }}
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative" style={{ width: "600px", height: "780px" }}>

          {/* 고스트 카드 */}
          <div
            className="absolute rounded-3xl"
            style={{
              top: "70px", left: "48px", width: "504px", height: "360px",
              background: "rgba(61,219,135,0.04)", border: "1px solid rgba(61,219,135,0.12)",
              transform: "rotate(4deg)",
            }}
          />

          {/* 메인 분석 결과 카드 */}
          <div
            className="absolute rounded-3xl"
            style={{
              top: "40px", left: "20px", width: "560px",
              background: "var(--bg-card)", border: "1px solid var(--border-strong)",
              boxShadow: "var(--shadow-card)",
              padding: "32px",
            }}
          >
            <div className="flex items-center justify-between mb-7">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-brand" />
                <span className="text-[var(--text-primary)] font-bold" style={{ fontSize: "15px" }}>오늘의 분석 결과</span>
              </div>
              <span
                className="font-bold text-brand px-3 py-1 rounded-full"
                style={{ fontSize: "12px", background: "rgba(61,219,135,0.1)", border: "1px solid rgba(61,219,135,0.2)" }}
              >일간</span>
            </div>
            <div className="flex items-center gap-7 mb-7">
              <div className="relative flex-shrink-0" style={{ width: "96px", height: "96px" }}>
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="38" fill="none" stroke="var(--score-track)" strokeWidth="7" />
                  <circle cx="48" cy="48" r="38" fill="none" stroke="#3DDB87" strokeWidth="7"
                    strokeLinecap="round" strokeDasharray="170 239" transform="rotate(-90 48 48)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-extrabold text-brand leading-none" style={{ fontSize: "26px" }}>71</span>
                  <span style={{ fontSize: "10px", color: "var(--text-faint)" }}>점</span>
                </div>
              </div>
              <div>
                <div className="mb-1" style={{ fontSize: "13px", color: "var(--text-faint)" }}>총 스크린타임</div>
                <div className="font-extrabold text-[var(--text-primary)]" style={{ fontSize: "34px", letterSpacing: "-0.03em", lineHeight: 1 }}>5h 38m</div>
                <div className="flex gap-1.5 mt-2.5">
                  {["SNS", "엔터테인먼트"].map((tag) => (
                    <span key={tag} className="text-brand px-2.5 py-0.5 rounded-full"
                      style={{ fontSize: "12px", background: "rgba(61,219,135,0.08)", border: "1px solid rgba(61,219,135,0.15)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {previewApps.map((app) => (
                <div key={app.name} className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="font-semibold" style={{ fontSize: "14px", color: "var(--text-primary-soft)" }}>{app.name}</span>
                    <span className="font-bold text-brand" style={{ fontSize: "14px" }}>{app.time}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-bar)" }}>
                    <div className="h-full rounded-full" style={{ width: `${app.pct}%`, background: "linear-gradient(90deg,#3DDB87,rgba(61,219,135,0.3))" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI 채팅 미니 카드 */}
          <div
            className="absolute rounded-2xl"
            style={{
              top: "468px", left: "20px", width: "560px",
              background: "var(--bg-chat)", border: "1px solid rgba(61,219,135,0.18)",
              padding: "20px 24px",
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="rounded-full flex-shrink-0 flex items-center justify-center font-bold text-brand"
                style={{ width: "28px", height: "28px", minWidth: "28px", fontSize: "10px", background: "rgba(61,219,135,0.15)" }}
              >AI</div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 leading-relaxed"
                style={{ fontSize: "13px", background: "var(--bg-bar-sm)", color: "var(--text-primary-soft)" }}>
                취침 전 인스타그램 사용이{" "}
                <span className="text-brand font-bold">1시간 42분</span>이에요.
                오늘 밤 11시부터 앱 잠금을 설정해볼까요? 🌿
              </div>
            </div>
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm px-4 py-2"
                style={{ fontSize: "13px", background: "rgba(61,219,135,0.1)", border: "1px solid rgba(61,219,135,0.18)", color: "var(--text-primary-soft)" }}>
                좋아요, 설정해볼게요!
              </div>
            </div>
          </div>

          {/* 미니 배지 카드: 반려식물 */}
          <div
            className="absolute flex items-center gap-3 rounded-2xl"
            style={{ top: "668px", left: "20px", width: "264px", background: "var(--bg-card)", border: "1px solid var(--border-card)", padding: "16px 18px" }}
          >
            <div className="rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ width: "44px", height: "44px", background: "rgba(61,219,135,0.08)", border: "1px solid rgba(61,219,135,0.15)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3DDB87" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22V12" /><path d="M12 12C12 12 8 8 4 9c0 0 2 6 8 6" /><path d="M12 12C12 12 16 8 20 9c0 0-2 6-8 6" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-[var(--text-primary)] mb-0.5" style={{ fontSize: "13px" }}>반려식물</div>
              <div className="text-brand" style={{ fontSize: "12px" }}>30일차 · 나무 단계</div>
            </div>
          </div>

          {/* 미니 배지 카드: 연속 달성 */}
          <div
            className="absolute flex items-center gap-3 rounded-2xl"
            style={{ top: "668px", left: "300px", width: "280px", background: "var(--bg-card)", border: "1px solid var(--border-card)", padding: "16px 18px" }}
          >
            <div className="rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ width: "44px", height: "44px", background: "rgba(61,219,135,0.08)", border: "1px solid rgba(61,219,135,0.15)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3DDB87" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-[var(--text-primary)] mb-0.5" style={{ fontSize: "13px" }}>7일 연속 달성</div>
              <div className="text-brand" style={{ fontSize: "12px" }}>디톡스 뱃지 획득!</div>
            </div>
          </div>

          </div>
        </motion.div>
      </div>

      {/* 하단 피처 스트립 */}
      <div
        className="relative border-t py-3.5 overflow-hidden z-10"
        style={{ borderColor: "var(--border-strip)", background: "var(--bg-strip)" }}
      >
        <div className="flex animate-marquee whitespace-nowrap gap-12">
          {[
            "AI 스크린타임 분석", "반려식물 키우기", "반려동물 성장", "디지털 디톡스",
            "뱃지 & 칭호", "목표 설정", "분석 히스토리", "개인정보 보호",
            "주간 리포트", "중독 패턴 감지", "Gemini Vision AI",
            "AI 스크린타임 분석", "반려식물 키우기", "반려동물 성장", "디지털 디톡스",
            "뱃지 & 칭호", "목표 설정", "분석 히스토리", "개인정보 보호",
          ].map((tag, i) => (
            <span key={i} className="flex items-center gap-3 text-xs" style={{ color: "var(--text-ghost)" }}>
              <span style={{ color: "rgba(61,219,135,0.4)" }}>✦</span> {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
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
        <AnalysisSection ctaHref={ctaHref} />
        <CompanionSection ctaHref={ctaHref} />
        <SubFeatures />
        <CTABanner ctaHref={ctaHref} />
      </main>
      <Footer />
    </>
  );
}
