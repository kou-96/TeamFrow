import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertCircle, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { translateErrorServer } from "@/lib/translate-error-server";
import { acceptInvitation } from "./actions";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error: rawError } = await searchParams;
  const error = await translateErrorServer(rawError);
  const supabase = await createClient();
  const t = await getTranslations("invite");
  const tr = await getTranslations("roles");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase.rpc("invitation_info", { _token: token });
  const info = rows?.[0];

  if (!info) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t("notFoundTitle")}</CardTitle>
            <CardDescription>{t("notFoundDescription")}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">{t("backToHome")}</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  const expired = new Date(info.expires_at) < new Date();
  const accepted = !!info.accepted_at;

  const accept = acceptInvitation.bind(null, token);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>
            {t("subtitle", { workspace: info.workspace_name, role: tr(info.role) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {expired && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t("expired")}</AlertDescription>
            </Alert>
          )}

          {accepted && (
            <Alert variant="info">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t("alreadyAccepted")}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!user ? (
            <>
              <Button asChild className="w-full">
                <Link href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}>
                  {t("signupToJoin")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
                  {t("loginToJoin")}
                </Link>
              </Button>
            </>
          ) : expired ? (
            <Button asChild variant="outline" className="w-full">
              <Link href="/workspaces">{t("backToWorkspaces")}</Link>
            </Button>
          ) : (
            <form action={accept} className="w-full">
              <Button type="submit" className="w-full">
                {accepted ? t("openWorkspace") : t("join")}
              </Button>
            </form>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
