"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNext } from "@/lib/next-path";
import { syncThemeCookieFromProfile } from "@/lib/sync-theme";
import { THEME_COOKIE } from "@/lib/theme";

async function getOrigin() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNext(formData.get("next"), "/workspaces");

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    if (next !== "/workspaces") params.set("next", next);
    redirect(`/login?${params.toString()}`);
  }

  if (signInData.user) {
    await syncThemeCookieFromProfile(supabase, signInData.user.id);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const origin = await getOrigin();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "");
  const next = sanitizeNext(formData.get("next"), "/workspaces");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { display_name: displayName || email.split("@")[0] },
    },
  });

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    if (next !== "/workspaces") params.set("next", next);
    redirect(`/signup?${params.toString()}`);
  }

  // メール確認が必須の設定なら session は null。確認待ち画面へ。
  if (!data.session) {
    redirect(`/signup/check-email?email=${encodeURIComponent(email)}`);
  }

  // 即ログイン状態 (Confirm email が OFF の場合)
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // theme cookie をクリア (次ユーザー / 未ログイン画面に前ユーザーの設定が残らないように)
  const c = await cookies();
  c.delete(THEME_COOKIE);

  redirect("/login");
}
