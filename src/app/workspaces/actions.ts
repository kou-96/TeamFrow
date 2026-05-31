"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export async function createWorkspace(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/workspaces?error=name-required");
  }

  // 一意な slug を試行
  const base = slugify(name);
  let slug = base;
  for (let i = 0; i < 30; i++) {
    const { data: existing } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${i + 2}`;
  }

  const { data: ws, error } = await supabase
    .from("workspaces")
    .insert({ name, slug })
    .select("id, slug")
    .single();

  if (error || !ws) {
    redirect(`/workspaces?error=${encodeURIComponent(error?.message ?? "unknown")}`);
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: user.id, role: "owner" });

  if (memberError) {
    redirect(`/workspaces?error=${encodeURIComponent(memberError.message)}`);
  }

  revalidatePath("/workspaces");
  redirect(`/workspaces/${ws.slug}`);
}
