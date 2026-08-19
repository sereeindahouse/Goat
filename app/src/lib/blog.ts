import { format, formatDistanceToNow } from "date-fns";
import { mn } from "date-fns/locale";

export function formatDate(d: Date | string | number) {
  return format(new Date(d), "yyyy оны M-р сарын d", { locale: mn });
}

export function timeAgo(d: Date | string | number) {
  return formatDistanceToNow(new Date(d), { addSuffix: true, locale: mn });
}

export function readingTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} мин унших`;
}

export function excerptOf(content: string, max = 140) {
  const plain = content.replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, max).trimEnd() + "…";
}
