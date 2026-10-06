"use client";

/**
 * 3D 캔버스 안에서 던져진 에러(GL 컨텍스트 · 모델 로드 · 셰이더)를 붙잡는다 — 페이지 전체가 죽지 않게.
 * 에러가 나면 `onError`로 알려 부모(`PetStage`)가 기존 SVG `Animal3D` 폴백으로 바꾼다 (.claude/rules/3d.md "폴백은 필수").
 */
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onError?: (message: string) => void;
}

export default class PetErrorBoundary extends Component<Props, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }

  componentDidCatch(e: unknown) {
    this.props.onError?.(e instanceof Error ? e.message : String(e));
  }

  render() {
    return this.state.error === null ? this.props.children : null;
  }
}
