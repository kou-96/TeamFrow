"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const { data, error } = await supabase.rpc("accept_invitation", { _token: token });

  if (error) {
    redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);
  }

  const slug = data?.[0]?.workspace_slug;
  if (!slug) {
    redirect(`/invite/${token}?error=accept-failed`);
  }

  revalidatePath("/workspaces");
  redirect(`/workspaces/${slug}`);
}
