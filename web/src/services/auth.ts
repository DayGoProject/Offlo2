import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "@/services/firebase";

export { auth } from "@/services/firebase";
export { onAuthStateChanged } from "firebase/auth";

/**
 * 로그인은 **Google 단독**이다 — 이메일 · 비밀번호 로그인 · 회원가입은 없다 (앱과 같은 방침).
 * 처음 로그인하는 Google 계정은 그 자리에서 가입된다 (로그인 페이지가 `POST /api/users`로 서버 프로필을 만든다).
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function logout() {
  return signOut(auth);
}

export function getFirebaseErrorCode(err: unknown): string {
  return (err as { code?: string }).code ?? "";
}

export function getAuthErrorMessage(code: string): string {
  switch (code) {
    /* 팝업이 열리지 않고 즉시 실패하는 케이스들 — 원인별 안내 */
    case "auth/unauthorized-domain":
      return "이 주소는 Firebase 승인된 도메인이 아닙니다. 배포 주소로 접속했는지 확인해주세요. (auth/unauthorized-domain)";
    case "auth/popup-blocked":
      return "브라우저가 로그인 팝업을 차단했습니다. 주소창의 팝업 차단을 해제한 뒤 다시 시도해주세요.";
    case "auth/operation-not-allowed":
      return "Google 로그인이 비활성화되어 있습니다. (auth/operation-not-allowed)";
    case "auth/account-exists-with-different-credential":
      // 예전에 이메일 · 비밀번호로 가입한 계정과 같은 이메일일 때 — 이메일 로그인은 없어졌으므로 안내만 한다
      return "이 이메일은 예전에 이메일 · 비밀번호로 가입한 계정입니다. 이메일 로그인은 종료되어 Google 로그인으로 바꾸려면 문의해주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결에 실패했습니다. 인터넷 상태를 확인해주세요.";
    case "auth/too-many-requests":
      return "시도 횟수가 많아 일시적으로 차단되었습니다. 잠시 후 다시 시도해주세요.";
    case "auth/user-disabled":
      return "이용이 정지된 계정입니다. 문의는 개인정보 처리방침에 적힌 이메일로 보내주세요.";

    default:
      // 알 수 없는 코드는 그대로 노출한다 — 없으면 운영 중 원인 파악이 불가능하다
      return code
        ? `오류가 발생했습니다. 다시 시도해주세요 (${code})`
        : "오류가 발생했습니다. 다시 시도해주세요";
  }
}
