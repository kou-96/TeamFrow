import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

// シングルトン: ブラウザ全体で 1 つの Supabase クライアントを共有する。
// 複数インスタンスがあると Realtime の認証/接続が分離されてしまい、
// あるコンポーネントの setAuth() が別コンポーネントの subscription に届かない。
export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
