"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/services/auth";

const NAV = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/analysis",
    label: "AI 분석",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 2v10l6.3 6.3" />
      </svg>
    ),
  },
  {
    href: "/goals",
    label: "목표",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <aside
      className="fixed top-0 left-0 h-full w-56 flex flex-col z-40"
      style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border-card)" }}
    >
      <div className="px-6 pt-7 pb-6">
        <span className="text-gradient text-xl font-extrabold tracking-tight">Offlo</span>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                color: active ? "#3DDB87" : "var(--text-secondary)",
                background: active ? "rgba(61,219,135,0.08)" : undefined,
              }}
            >
              <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/[0.04]"
          style={{ color: "var(--text-muted)" }}
        >
          <span style={{ opacity: 0.6 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          로그아웃
        </button>
      </div>
    </aside>
  );
}
