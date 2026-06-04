"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

export async function setTheme(theme: Theme) {
  if (theme !== "light" && theme !== "dark") return;

  // 1. cookie に保存 (同一端末は即時反映、ログアウト時もこの値が残る)
  const c = await cookies();
  c.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // 2. ログイン済みなら DB にも保存 (他端末でログインした時に追従させるため)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ theme }).eq("id", user.id);
  }

  revalidatePath("/", "layout");
}
