import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import { supabaseConfig } from "./config";

export const serverClient = cache(async () => {
  const config = supabaseConfig();
  if (!config) throw new Error("The business database connection has not been configured.");
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: config.url.startsWith("https://") },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => {
        // Server Components cannot set cookies. The proxy refreshes them before render.
        try { for (const {name,value,options} of values) jar.set(name,value,options); } catch {}
      },
    },
  });
});

export function adminClient() {
  const config = supabaseConfig();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!config || !key) throw new Error("A server credential is required for this operation.");
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
