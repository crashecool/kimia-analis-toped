import { createClient } from "@supabase/supabase-js";

function environment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) throw new Error("Konfigurasi Supabase belum lengkap.");
  return { url, anonKey, serviceKey };
}

export function publicDb() {
  const { url, anonKey } = environment();
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

export function adminDb() {
  const { url, serviceKey } = environment();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum dipasang.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return null;
  const { url, anonKey } = environment();
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}
