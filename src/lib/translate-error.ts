"use client";

import { useMessages } from "next-intl";

type WithErrors = { errors?: Record<string, string> };

// errors マップから完全一致 → 前方一致 → 原文フォールバック
export function translateErrorWithDict(
  dict: Record<string, string> | undefined,
  message: string | undefined
): string {
  if (!message) return "";
  if (!dict) return message;
  if (dict[message]) return dict[message];
  for (const key of Object.keys(dict)) {
    if (message.startsWith(key)) return dict[key];
  }
  return message;
}

// Client Component 用
export function useTranslatedError() {
  const messages = useMessages() as WithErrors;
  const dict = messages.errors;
  return (message: string | undefined) => translateErrorWithDict(dict, message);
}
