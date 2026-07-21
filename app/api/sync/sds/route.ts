import { requireAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Login admin diperlukan." }, { status: 401 });
  return Response.json({ error: "Sinkronisasi server dinonaktifkan. Gunakan Sigma Scraper GUI lalu unggah CSV hasilnya." }, { status: 410 });
}
