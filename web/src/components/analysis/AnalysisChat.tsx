"use client";

import { useEffect, useRef, useState } from "react";
import { chatWithAnalysis, AnalysisContext } from "@/services/ai";
import { fileToInlineImage } from "@/services/image";
import { useAuth } from "@/hooks/useAuth";

interface ChatMessage {
  role: "user" | "model";
  text: string;
  imageBase64?: string;
  mimeType?: string;
  imagePreview?: string; // 로컬 프리뷰용 (UI only)
}

/**
 * 분석 결과 기반 AI 코치 채팅.
 *
 * Paper 디자인(앱 03 — AI 분석 결과 ⑪)에 맞춰 다시 그렸다. 아바타를 없애고
 * 말풍선의 좌·우 정렬과 배경색만으로 화자를 구분한다 — 아바타 두 개가 붙으면
 * 가로 폭이 줄고 긴 답변이 계단처럼 접힌다.
 *
 * 전송 로직(이미지 압축 · 히스토리에서 이미지 제거)은 그대로 유지한다.
 */
export default function AnalysisChat({
  analysisId,
  analysisContext,
  initialQuestion,
}: {
  analysisId: string;
  analysisContext: AnalysisContext;
  initialQuestion?: string;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialQuestion
      ? [{ role: "model", text: initialQuestion }]
      : [
          {
            role: "model",
            text: "분석 결과에 대해 더 자세히 이야기 나눠볼까요? 궁금한 점이나 사용 패턴에 대해 말씀해 주세요. 이미지도 첨부하실 수 있어요.",
          },
        ],
  );
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [attachError, setAttachError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setAttachError("이미지는 10MB 이하만 첨부할 수 있습니다.");
      e.target.value = "";
      return;
    }
    setAttachError("");
    setPendingImage({ file, preview: URL.createObjectURL(file) });
    e.target.value = "";
  }

  function removePendingImage() {
    if (pendingImage) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage(null);
  }

  async function handleSend() {
    if ((!input.trim() && !pendingImage) || sending || !user) return;

    let inlineImage: { imageBase64: string; mimeType: string } | undefined;
    let imagePreview: string | undefined;

    // 이미지가 있으면 압축해 인라인으로 전송 (저장하지 않음)
    if (pendingImage) {
      try {
        inlineImage = await fileToInlineImage(pendingImage.file);
        imagePreview = pendingImage.preview;
      } catch (err: unknown) {
        setAttachError(err instanceof Error ? err.message : "이미지 처리에 실패했습니다. 다시 시도해주세요.");
        return;
      }
    }

    const userMessage: ChatMessage = {
      role: "user",
      text: input.trim() || "(이미지 첨부)",
      ...(inlineImage && inlineImage),
      ...(imagePreview && { imagePreview }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setPendingImage(null);
    setAttachError("");
    setSending(true);

    try {
      // imagePreview는 UI 전용이라 제외하고, 이미지 데이터는 마지막 메시지에만 남긴다
      // (히스토리에 계속 실어 보내면 요청 본문이 누적되어 상한을 넘는다)
      const payload = updatedMessages.map((msg, i) => {
        const { imagePreview: _preview, imageBase64, mimeType, ...rest } = msg;
        const isLast = i === updatedMessages.length - 1;
        return isLast && imageBase64 ? { ...rest, imageBase64, mimeType } : rest;
      });
      const { reply } = await chatWithAnalysis({ analysisId, messages: payload, analysisContext });

      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "오류가 발생했습니다. 다시 시도해주세요.";
      setMessages((prev) => [...prev, { role: "model", text: `⚠️ ${msg}` }]);
    } finally {
      setSending(false);
    }
  }

  const canSend = (!!input.trim() || !!pendingImage) && !sending;

  return (
    <section
      className="flex flex-col gap-[18px] w-full px-[22px] sm:px-[30px] py-6 rounded-card"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2.5">
        <span
          className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
          style={{ background: "var(--accent-soft)" }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 1.2l1.7 3.6 3.9.5-2.9 2.7.8 3.9L7 10l-3.5 1.9.8-3.9L1.4 5.3l3.9-.5L7 1.2z" fill="var(--color-bloom)" />
          </svg>
        </span>
        <h2 className="text-[15px] leading-[18px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
          AI 코치에게 물어보기
        </h2>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>
          · 이미지 첨부 가능
        </span>
      </div>

      {/* 메시지 */}
      <div className="flex flex-col gap-3 w-full max-h-[520px] overflow-y-auto">
        {messages.map((msg, i) => {
          const mine = msg.role === "user";
          return (
            <div key={i} className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`flex flex-col gap-2 max-w-[520px] ${mine ? "items-end" : "items-start"}`}>
                {msg.imagePreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={msg.imagePreview}
                    alt="첨부 이미지"
                    className="max-w-[200px] rounded-xl"
                    style={{ border: "1px solid var(--border-card)" }}
                  />
                )}
                {msg.text && msg.text !== "(이미지 첨부)" && (
                  <div
                    className="px-4 py-3.5 rounded-xl text-[13px] leading-[21px] whitespace-pre-wrap"
                    style={
                      mine
                        ? {
                            background: "var(--accent-soft)",
                            border: "1px solid rgba(61,219,135,0.16)",
                            color: "var(--text-primary-soft)",
                          }
                        : {
                            background: "var(--bg-nav)",
                            border: "1px solid var(--border-card)",
                            color: "var(--text-primary-soft)",
                          }
                    }
                  >
                    {msg.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex justify-start w-full">
            <div
              className="flex gap-1 items-center px-4 py-4 rounded-xl"
              style={{ background: "var(--bg-nav)", border: "1px solid var(--border-card)" }}
            >
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: "var(--text-faint)", animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 첨부 프리뷰 */}
      {pendingImage && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-card)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingImage.preview}
            alt="첨부 예정"
            className="w-10 h-10 rounded-md object-cover shrink-0"
            style={{ border: "1px solid var(--border-card)" }}
          />
          <span className="text-xs flex-1 truncate" style={{ color: "var(--text-muted)" }}>
            {pendingImage.file.name}
          </span>
          <button
            onClick={removePendingImage}
            aria-label="첨부 취소"
            className="w-7 h-7 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-chalk/[0.06] cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.6 3.6l8.8 8.8M12.4 3.6l-8.8 8.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {attachError && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {attachError}
        </p>
      )}

      {/* 입력줄 — 알약 하나 안에 텍스트·첨부·전송을 넣는다 */}
      <div
        className="flex items-end gap-2.5 w-full py-2 pl-[18px] pr-2.5 rounded-[26px]"
        style={{ background: "var(--bg-nav)", border: "1px solid var(--border-card)" }}
      >
        <textarea
          className="flex-1 bg-transparent text-[13px] leading-[21px] outline-none resize-none py-2 min-h-[34px] max-h-[120px]"
          style={{ color: "var(--text-primary)" }}
          placeholder="분석 결과에 대해 무엇이든 물어보세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
        />

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label="이미지 첨부"
          className="w-[34px] h-[34px] shrink-0 flex items-center justify-center rounded-full transition-colors hover:bg-chalk/[0.06] cursor-pointer"
          style={{ border: "1px solid var(--border-strong)" }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="2" stroke="var(--text-muted)" strokeWidth="1.3" />
            <circle cx="5.6" cy="6.4" r="1.2" stroke="var(--text-muted)" strokeWidth="1.2" />
            <path d="M2.4 11.2 6 8l3 2.6 2.2-1.8 2.4 2.4" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="보내기"
          className="w-[34px] h-[34px] shrink-0 flex items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: "var(--color-bloom)" }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 13V3M3.6 7.4 8 3l4.4 4.4" stroke="#040508" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}
