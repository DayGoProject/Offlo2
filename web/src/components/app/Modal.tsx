"use client";

import { useEffect } from "react";

/**
 * 공통 모달. 목표 추가 · 배지 자랑 · 동물 변경 경고가 같은 껍데기를 쓴다.
 *
 * 열려 있는 동안 body 스크롤을 잠그고 ESC로 닫는다 — AppSidebar 드로어와
 * 같은 규칙이다. 배경 클릭으로도 닫힌다.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.66)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${width} max-h-[90vh] overflow-y-auto rounded-card px-6 py-6 sm:px-7`}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 className="text-[17px] leading-[22px] font-semibold tracking-[-0.015em]" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-chalk/[0.06] cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.6 3.6l8.8 8.8M12.4 3.6l-8.8 8.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
