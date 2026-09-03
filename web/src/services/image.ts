/**
 * 이미지 압축 유틸 (브라우저 전용 — canvas 사용).
 *
 * AI 분석용 이미지는 저장하지 않고 API Route 본문에 실어 보내므로,
 * 전송 전에 반드시 축소·압축해 요청 본문 상한(Vercel 4.5MB) 아래로 낮춘다.
 */

const MAX_DIMENSION = 1600; // 장변 기준 — 스크린타임 판독에 충분한 해상도
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.4;
/** base64 문자열 길이 상한. 실제 바이트의 약 4/3이므로 여유를 둔다. */
const MAX_BASE64_LENGTH = 3 * 1024 * 1024;

export interface InlineImage {
  imageBase64: string;
  mimeType: string;
}

/** File을 축소·JPEG 압축해 base64로 변환한다. */
export async function fileToInlineImage(file: File): Promise<InlineImage> {
  const bitmap = await loadBitmap(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 처리할 수 없습니다. 다른 브라우저에서 시도해주세요.");

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // 상한을 넘으면 품질을 낮춰가며 재인코딩
  let quality = INITIAL_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_BASE64_LENGTH && quality > MIN_QUALITY) {
    quality -= 0.15;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > MAX_BASE64_LENGTH)
    throw new Error("이미지 용량이 너무 큽니다. 더 작은 이미지를 사용해주세요.");

  return { imageBase64: dataUrl.split(",")[1] ?? "", mimeType: "image/jpeg" };
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    // HEIC 등 브라우저가 디코딩하지 못하는 형식
    throw new Error("이 형식의 이미지는 읽을 수 없습니다. JPG 또는 PNG로 변환해 다시 시도해주세요.");
  }
}
