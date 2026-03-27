export interface DailyStats {
  date: string;                      // YYYY-MM-DD
  sites: Record<string, number>;     // domain → 누적 초
  lastSyncedDetoxSeconds: number;    // Firestore에 마지막으로 동기화한 디톡스 초
}

export interface PlantData {
  level: number;
  totalDetoxMinutes: number;
  lastUpdated: string;
}

export const DISTRACTING_DOMAINS = [
  "instagram.com",
  "youtube.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "reddit.com",
  "netflix.com",
  "twitch.tv",
  "threads.net",
  "naver.com",
  "daum.net",
  "dcinside.com",
  "fmkorea.com",
  "theqoo.net",
  "twitter.com",
  "snapchat.com",
  "pinterest.com",
];

export function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isDistracting(domain: string): boolean {
  return DISTRACTING_DOMAINS.some(
    (d) => domain === d || domain.endsWith("." + d)
  );
}

export function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function getPlantEmoji(level: number): string {
  const map: Record<number, string> = {
    1: "🌱",
    2: "🌿",
    3: "🌳",
    4: "🌲",
  };
  return map[level] ?? "🌱";
}

export function getPlantLabel(level: number): string {
  const map: Record<number, string> = {
    1: "새싹",
    2: "잎",
    3: "나무",
    4: "거목",
  };
  return map[level] ?? "새싹";
}

export function calcLevel(totalDetoxMinutes: number): number {
  if (totalDetoxMinutes >= 900) return 4;
  if (totalDetoxMinutes >= 300) return 3;
  if (totalDetoxMinutes >= 60)  return 2;
  return 1;
}

export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}
