import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { auth } from "@/services/firebase";

export { auth } from "@/services/firebase";
export { onAuthStateChanged } from "firebase/auth";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function sendVerificationEmail() {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
}

export async function logout() {
  return signOut(auth);
}

export function getFirebaseErrorCode(err: unknown): string {
  return (err as { code?: string }).code ?? "";
}

export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "이메일 또는 비밀번호가 올바르지 않습니다";
    case "auth/email-already-in-use":
      return "이미 사용 중인 이메일입니다";
    case "auth/weak-password":
      return "비밀번호는 6자 이상이어야 합니다";
    case "auth/invalid-email":
      return "올바른 이메일 형식이 아닙니다";
    case "no-account":
      return "가입된 계정이 없습니다. 먼저 회원가입을 진행해주세요.";

    /* 팝업이 열리지 않고 즉시 실패하는 케이스들 — 원인별 안내 */
    case "auth/unauthorized-domain":
      return "이 주소는 Firebase 승인된 도메인이 아닙니다. 배포 주소로 접속했는지 확인해주세요. (auth/unauthorized-domain)";
    case "auth/popup-blocked":
      return "브라우저가 로그인 팝업을 차단했습니다. 주소창의 팝업 차단을 해제한 뒤 다시 시도해주세요.";
    case "auth/operation-not-allowed":
      return "Google 로그인이 비활성화되어 있습니다. (auth/operation-not-allowed)";
    case "auth/network-request-failed":
      return "네트워크 연결에 실패했습니다. 인터넷 상태를 확인해주세요.";
    case "auth/too-many-requests":
      return "시도 횟수가 많아 일시적으로 차단되었습니다. 잠시 후 다시 시도해주세요.";

    default:
      // 알 수 없는 코드는 그대로 노출한다 — 없으면 운영 중 원인 파악이 불가능하다
      return code
        ? `오류가 발생했습니다. 다시 시도해주세요 (${code})`
        : "오류가 발생했습니다. 다시 시도해주세요";
  }
}
