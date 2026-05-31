import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, Tag, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DismissibleError } from "@/components/dismissible-error";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";
import { labelColorClasses, labelDotClass } from "@/lib/labels";
import { LabelColorPicker } from "@/components/label-color-picker";
import { cn } from "@/lib/utils";
import { createLabel, deleteLabel } from "./actions";

export default async function LabelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const { workspace } = await requireWorkspace(slug);
  const supabase = await createClient();
  const t = await getTranslations("labels");

  const { data: labels } = await supabase
    .from("labels")
    .select("id, name, color, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: true });

  const createWithSlug = createLabel.bind(null, slug);
  const deleteWithSlug = deleteLabel.bind(null, slug);

  return (
    <>
      <AppHeader workspaceSlug={slug} />
      <main className="container py-8 space-y-6 max-w-3xl">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" /> {t("create")}
            </CardTitle>
            <CardDescription className="sr-only">{t("subtitle")}</CardDescription>
          </CardHeader>
          <form action={createWithSlug}>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" name="name" required maxLength={40} placeholder={t("namePlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("color")}</Label>
                <LabelColorPicker />
              </div>
              <Button type="submit">{t("create")}</Button>
            </CardContent>
          </form>
        </Card>

        {labels && labels.length > 0 ? (
          <Card>
            <ul className="divide-y">
              {labels.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 p-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm",
                      labelColorClasses(l.color)
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", labelDotClass(l.color))} />
                    {l.name}
                  </span>
                  <form action={deleteWithSlug}>
                    <input type="hidden" name="id" value={l.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label={t("delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t("empty")}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
