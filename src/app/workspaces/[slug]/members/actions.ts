"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManage, requireWorkspace } from "@/lib/workspace";
import type { WorkspaceRole } from "@/lib/supabase/types";

const ROLES: WorkspaceRole[] = ["owner", "admin", "member"];

export async function inviteMember(slug: string, formData: FormData) {
  const { workspace, role, user } = await requireWorkspace(slug);
  if (!canManage(role)) {
    redirect(`/workspaces/${slug}/members?error=permission-denied`);
  }

  const roleRaw = String(formData.get("role") ?? "member");
  const inviteRole: WorkspaceRole = ROLES.includes(roleRaw as WorkspaceRole)
    ? (roleRaw as WorkspaceRole)
    : "member";

  // owner ロールを発行できるのは owner だけ
  if (inviteRole === "owner" && role !== "owner") {
    redirect(`/workspaces/${slug}/members?error=cannot-invite-as-owner`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_invitations").insert({
    workspace_id: workspace.id,
    role: inviteRole,
    invited_by: user.id,
  });

  if (error) {
    redirect(`/workspaces/${slug}/members?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/workspaces/${slug}/members`);
}

export async function revokeInvitation(slug: string, formData: FormData) {
  const { role } = await requireWorkspace(slug);
  if (!canManage(role)) {
    redirect(`/workspaces/${slug}/members?error=permission-denied`);
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_invitations").delete().eq("id", id);

  if (error) {
    redirect(`/workspaces/${slug}/members?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/workspaces/${slug}/members`);
}

export async function changeMemberRole(slug: string, formData: FormData) {
  const { workspace, role: myRole } = await requireWorkspace(slug);
  if (myRole !== "owner") {
    redirect(`/workspaces/${slug}/members?error=permission-denied`);
  }

  const userId = String(formData.get("user_id") ?? "");
  const newRoleRaw = String(formData.get("role") ?? "");
  const newRole: WorkspaceRole = ROLES.includes(newRoleRaw as WorkspaceRole)
    ? (newRoleRaw as WorkspaceRole)
    : "member";

  if (!userId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_members")
    .update({ role: newRole })
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId);

  if (error) {
    redirect(`/workspaces/${slug}/members?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/workspaces/${slug}/members`);
}

export async function removeMember(slug: string, formData: FormData) {
  const { workspace, role: myRole, user } = await requireWorkspace(slug);

  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return;

  const isSelf = userId === user.id;
  if (!isSelf && myRole !== "owner") {
    redirect(`/workspaces/${slug}/members?error=permission-denied`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId);

  if (error) {
    redirect(`/workspaces/${slug}/members?error=${encodeURIComponent(error.message)}`);
  }

  if (isSelf) {
    revalidatePath("/workspaces");
    redirect("/workspaces");
  }
  revalidatePath(`/workspaces/${slug}/members`);
}
