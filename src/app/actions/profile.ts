"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateDisplayName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "name-required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "not_authenticated" };

  // profiles テーブル
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", user.id);
  if (profileError) return { ok: false as const, error: profileError.message };

  // auth.users の user_metadata.display_name も同期
  await supabase.auth.updateUser({ data: { display_name: trimmed } });

  revalidatePath("/", "layout");
  return { ok: true as const };
}
