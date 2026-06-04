import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AsciiInput } from "@/components/ui/ascii-input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { DismissibleError } from "@/components/dismissible-error";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sanitizeNext } from "@/lib/next-path";
import { signup } from "../login/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  const next = sanitizeNext(params.next);
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  const t = await getTranslations("auth");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{t("signupTitle")}</CardTitle>
          <CardDescription>{t("signupSubtitle")}</CardDescription>
        </CardHeader>
        <form action={signup}>
          {next && <input type="hidden" name="next" value={next} />}
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">{t("displayName")}</Label>
              <Input
                id="display_name"
                name="display_name"
                type="text"
                placeholder={t("displayNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <AsciiInput id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("passwordWithMin")}</Label>
              <PasswordInput
                id="password"
                name="password"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <DismissibleError message={error} />
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full">
              {t("signupButton")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("haveAccount")}{" "}
              <Link href={loginHref} className="text-primary hover:underline">
                {t("toLogin")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
