import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { THEME_COOKIE } from "@/lib/theme";

/**
 * 認証直後に呼び出して、profiles.theme を cookie に同期する。
 * - profile.theme が "dark" / "light" ならその値を cookie へ
 * - null (未設定) なら "light" にリセット
 *   (端末を共有していて前ユーザーのテーマが残っているケースをガード)
 */
export async function syncThemeCookieFromProfile(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { data } = await supabase
    .from("profiles")
    .select("theme")
    .eq("id", userId)
    .maybeSingle();

  const theme = data?.theme === "dark" ? "dark" : "light";
  const c = await cookies();
  c.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
