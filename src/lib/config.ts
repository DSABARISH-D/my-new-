export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost","127.0.0.1","[::1]"].includes(parsed.hostname))) return null;
    return { url: parsed.origin, key };
  } catch { return null; }
}
export function appOrigin() {
  const value = process.env.APP_URL;
  if (!value && process.env.NODE_ENV !== "production") return "http://localhost:3000";
  if (!value) throw new Error("Configure the application URL before sending email.");
  const origin = new URL(value);
  if (origin.protocol !== "https:" && !["localhost","127.0.0.1"].includes(origin.hostname)) throw new Error("Configure a secure application URL.");
  return origin.origin;
}
