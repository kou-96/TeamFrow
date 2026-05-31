"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";

export async function createProject(slug: string, formData: FormData) {
  const { workspace, user } = await requireWorkspace(slug);
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) {
    redirect(`/workspaces/${slug}?error=name-required`);
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspace.id,
      name,
      description,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/workspaces/${slug}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/workspaces/${slug}`);
  redirect(`/workspaces/${slug}/projects/${data.id}`);
}

export async function deleteProject(slug: string, formData: FormData) {
  await requireWorkspace(slug);
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    redirect(`/workspaces/${slug}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/workspaces/${slug}`);
}
