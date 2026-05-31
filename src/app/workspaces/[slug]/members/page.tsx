import Link from "next/link";
import { headers } from "next/headers";
import { getTranslations, getLocale } from "next-intl/server";
import { ChevronLeft, Link as LinkIcon, Trash2, UserPlus, X } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DismissibleError } from "@/components/dismissible-error";
import { CopyButton } from "@/components/copy-button";
import { RoleSelect } from "@/components/role-select";
import { createClient } from "@/lib/supabase/server";
import { canManage, requireWorkspace } from "@/lib/workspace";
import type { WorkspaceRole } from "@/lib/supabase/types";
import {
  changeMemberRole,
  inviteMember,
  removeMember,
  revokeInvitation,
} from "./actions";

async function getOrigin() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const { workspace, role: myRole, user } = await requireWorkspace(slug);
  const supabase = await createClient();
  const origin = await getOrigin();
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  const t = await getTranslations("members");
  const tr = await getTranslations("roles");
  const tc = await getTranslations("common");

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("user_id, role, joined_at")
    .eq("workspace_id", workspace.id)
    .order("joined_at", { ascending: true });

  const memberIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: profileRows } = memberIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
    : { data: [] as { id: string; display_name: string | null }[] };

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]));
  const members = (memberRows ?? []).map((m) => ({
    ...m,
    display_name: profileMap.get(m.user_id) ?? null,
  }));

  const { data: invitations } = await supabase
    .from("workspace_invitations")
    .select("id, email, role, token, expires_at, accepted_at, created_at")
    .eq("workspace_id", workspace.id)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  const canEdit = canManage(myRole);
  const isOwner = myRole === "owner";

  const inviteWithSlug = inviteMember.bind(null, slug);
  const revokeWithSlug = revokeInvitation.bind(null, slug);
  const changeRoleWithSlug = changeMemberRole.bind(null, slug);
  const removeMemberWithSlug = removeMember.bind(null, slug);

  return (
    <>
      <AppHeader workspaceSlug={slug} />
      <main className="container py-8 space-y-8 max-w-5xl">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={`/workspaces/${slug}`}>
              <ChevronLeft className="h-4 w-4" /> {workspace.name}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>

        <DismissibleError message={error} />

        <div className="grid gap-6 md:grid-cols-[1fr_360px]">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">
              {t("count", { count: members.length })}
            </h2>
            <Card>
              <ul className="divide-y">
                {members.map((m) => {
                  const isSelf = m.user_id === user.id;
                  const displayName = m.display_name ?? "(unknown)";

                  return (
                    <li
                      key={m.user_id}
                      className="flex items-center justify-between gap-3 p-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                          {displayName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {displayName}
                            {isSelf && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({tc("you")})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("joined", {
                              date: new Date(m.joined_at).toLocaleDateString(dateLocale),
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isOwner && !isSelf ? (
                          <form action={changeRoleWithSlug}>
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <RoleSelect
                              defaultValue={m.role}
                              ownerLabel={tr("owner")}
                              adminLabel={tr("admin")}
                              memberLabel={tr("member")}
                              ariaLabel={t("roleChangeLabel")}
                            />
                          </form>
                        ) : (
                          <RoleBadge role={m.role} label={tr(m.role)} />
                        )}

                        {(isSelf || (isOwner && !isSelf)) && (
                          <form action={removeMemberWithSlug}>
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              aria-label={isSelf ? t("leave") : t("remove")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            {invitations && invitations.length > 0 && (
              <>
                <h2 className="text-lg font-semibold pt-4">
                  {t("pendingTitle", { count: invitations.length })}
                </h2>
                <Card>
                  <ul className="divide-y">
                    {invitations.map((inv, idx) => {
                      const url = `${origin}/invite/${inv.token}`;
                      const expired = new Date(inv.expires_at) < new Date();
                      return (
                        <li key={inv.id} className="p-4 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-sm">
                                  {t("linkN", { n: invitations.length - idx })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t("issued", {
                                    date: new Date(inv.created_at).toLocaleDateString(dateLocale),
                                  })}
                                  {" · "}
                                  {expired
                                    ? t("expired")
                                    : t("expires", {
                                        date: new Date(inv.expires_at).toLocaleDateString(
                                          dateLocale
                                        ),
                                      })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <RoleBadge role={inv.role} label={tr(inv.role)} />
                              {canEdit && (
                                <form action={revokeWithSlug}>
                                  <input type="hidden" name="id" value={inv.id} />
                                  <Button
                                    type="submit"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    aria-label={t("revoke")}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </form>
                              )}
                            </div>
                          </div>
                          {!expired && (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={url}
                                readOnly
                                className="flex-1 h-8 rounded-md border bg-muted/50 px-2 text-xs font-mono truncate"
                              />
                              <CopyButton value={url} label={t("copyLink")} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </>
            )}
          </section>

          <aside className="space-y-3">
            {canEdit ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="h-4 w-4" /> {t("inviteTitle")}
                  </CardTitle>
                  <CardDescription>{t("inviteDescription")}</CardDescription>
                </CardHeader>
                <form action={inviteWithSlug}>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="role">{t("roleLabel")}</Label>
                      <select
                        id="role"
                        name="role"
                        defaultValue="member"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="member">
                          {tr("member")} ({tr("memberDescription")})
                        </option>
                        <option value="admin">
                          {tr("admin")} ({tr("adminDescription")})
                        </option>
                        {isOwner && (
                          <option value="owner">
                            {tr("owner")} ({tr("ownerDescription")})
                          </option>
                        )}
                      </select>
                    </div>
                    <Button type="submit" className="w-full">
                      {t("inviteButton")}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {t("shareHint")}
                      <br />
                      {t("validityHint")}
                    </p>
                  </CardContent>
                </form>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground text-center">
                  {t("noPermission")}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}

function RoleBadge({ role, label }: { role: WorkspaceRole; label: string }) {
  const tone =
    role === "owner"
      ? "bg-amber-100 text-amber-900 border-amber-200"
      : role === "admin"
        ? "bg-blue-100 text-blue-900 border-blue-200"
        : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}
