// 任意の "next" 値を同一オリジン内の相対パスに限定 (open redirect 防止)
export function sanitizeNext(value: unknown, fallback = ""): string {
  if (typeof value !== "string" || !value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
