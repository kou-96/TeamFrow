import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Info, Users, Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DismissibleError } from "@/components/dismissible-error";
import { createClient } from "@/lib/supabase/server";
import { createWorkspace } from "./actions";

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const t = await getTranslations("workspaces");
  const tr = await getTranslations("roles");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = user
    ? await supabase
        .from("workspace_members")
        .select("role, workspace:workspaces(id, name, slug, created_at)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true })
    : { data: [] };

  const workspaces =
    memberships
      ?.map((m) => ({ role: m.role, ws: m.workspace }))
      .filter((m): m is { role: typeof m.role; ws: NonNullable<typeof m.ws> } => !!m.ws) ?? [];

  return (
    <>
      <AppHeader />
      <main className="container py-8 space-y-8 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
        </div>

        {notice === "no-access" && (
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertTitle>{t("noAccessTitle")}</AlertTitle>
            <AlertDescription>{t("noAccessDescription")}</AlertDescription>
          </Alert>
        )}

        <DismissibleError message={error} />

        <div className="grid gap-8 md:grid-cols-[1fr_320px]">
          <section className="space-y-3">
            {workspaces.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {workspaces.map(({ ws, role }) => (
                  <li key={ws.id}>
                    <Link href={`/workspaces/${ws.slug}`} className="block">
                      <Card className="hover:border-primary/50 hover:shadow-md transition h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Users className="h-5 w-5" />
                            </div>
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                              {tr(role)}
                            </span>
                          </div>
                          <CardTitle className="text-base pt-2">{ws.name}</CardTitle>
                          <CardDescription className="text-xs">/{ws.slug}</CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  {t("empty")}
                </CardContent>
              </Card>
            )}
          </section>

          <aside>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-4 w-4" /> {t("createTitle")}
                </CardTitle>
                <CardDescription>{t("createDescription")}</CardDescription>
              </CardHeader>
              <form action={createWorkspace}>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t("name")}</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      maxLength={60}
                      placeholder={t("namePlaceholder")}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {t("create")}
                  </Button>
                </CardContent>
              </form>
            </Card>
          </aside>
        </div>
      </main>
    </>
  );
}
