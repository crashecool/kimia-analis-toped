import { requireAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Login admin diperlukan." }, { status: 401 });
  return Response.json({ error: "Gunakan Sigma Scraper GUI lokal dan unggah CSV melalui panel admin." }, { status: 410 });
}
