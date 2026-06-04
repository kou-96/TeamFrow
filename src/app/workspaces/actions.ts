"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  // workspaces + workspace_members を SECURITY DEFINER RPC で atomic に作成。
  // RLS をバイパスして関数内部で auth.uid() を取得するため、
  // cookie-based session の伝搬問題を回避できる。
  const { data, error } = await supabase.rpc("create_workspace_for_user", {
    _name: name,
  });

  if (error || !data || data.length === 0) {
    redirect(`/workspaces?error=${encodeURIComponent(error?.message ?? "unknown")}`);
  }

  revalidatePath("/workspaces");
  redirect(`/workspaces/${data[0].workspace_slug}`);
}

export async function deleteWorkspace(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("workspaces").delete().eq("id", id);
  if (error) {
    redirect(`/workspaces?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/workspaces");
  redirect("/workspaces");
}
