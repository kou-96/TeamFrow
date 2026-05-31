"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";
import { LABEL_COLORS, type LabelColor } from "@/lib/labels";

export async function createLabel(slug: string, formData: FormData) {
  const { workspace } = await requireWorkspace(slug);
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const colorRaw = String(formData.get("color") ?? "slate");
  const color: LabelColor = (LABEL_COLORS as readonly string[]).includes(colorRaw)
    ? (colorRaw as LabelColor)
    : "slate";

  if (!name) {
    redirect(`/workspaces/${slug}/labels?error=name-required`);
  }

  const { error } = await supabase
    .from("labels")
    .insert({ workspace_id: workspace.id, name, color });

  if (error) {
    redirect(`/workspaces/${slug}/labels?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/workspaces/${slug}/labels`);
}

export async function deleteLabel(slug: string, formData: FormData) {
  await requireWorkspace(slug);
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("labels").delete().eq("id", id);
  if (error) {
    redirect(`/workspaces/${slug}/labels?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/workspaces/${slug}/labels`);
}
