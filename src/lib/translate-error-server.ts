import { getMessages } from "next-intl/server";
import { translateErrorWithDict } from "./translate-error";

type WithErrors = { errors?: Record<string, string> };

// Server Component 用
export async function translateErrorServer(message: string | undefined): Promise<string> {
  if (!message) return "";
  const messages = (await getMessages()) as WithErrors;
  return translateErrorWithDict(messages.errors, message);
}
