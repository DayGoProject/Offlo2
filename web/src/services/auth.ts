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
    default:
      return "오류가 발생했습니다. 다시 시도해주세요";
  }
}
