import AppSidebar from "@/components/AppSidebar";

/**
 * 앱 내부 페이지 공통 셸.
 *
 * Paper 파일 `Offlo_3D_REAL`의 앱 아트보드(Main 프레임)를 그대로 옮긴 것이다.
 * 데스크톱 기준: paddingBlock 30px · paddingInline 34px · gap 22px.
 * 9개 페이지가 같은 여백을 쓰게 하려고 페이지마다 px/py를 적지 않는다.
 *
 * 이전 구조에는 border-b가 있는 헤더 띠가 따로 있었는데, Paper 디자인에는
 * 없다 — 구분선 대신 여백으로 나눈다. 그래서 헤더도 이 패딩 안에 들어온다.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-page)" }}>
      <AppSidebar />
      {/* overflow-x는 hidden이 아니라 clip이다. hidden은 overflow-y를 auto로 만들어
          스크롤 컨테이너를 새로 만들고, 그 안의 position: sticky(커뮤니티 랭킹)가
          죽는다. clip은 스크롤 컨테이너를 만들지 않는다. */}
      <main className="lg:ml-56 pt-14 lg:pt-0 flex-1 min-w-0 overflow-x-clip">
        <div className="flex flex-col gap-5 lg:gap-[22px] px-4 sm:px-6 lg:px-[34px] py-6 lg:py-[30px]">
          {children}
        </div>
      </main>
    </div>
  );
}
