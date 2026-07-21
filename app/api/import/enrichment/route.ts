import { adminDb, requireAdmin } from "@/lib/supabase-server";

type EnrichmentRow = { materialNumber?: string; name?: string; brand?: string; cas?: string; synonyms?: string; description?: string; sku?: string; size?: string; availability?: string };

function baseNumber(value: string) {
  const clean = value.trim();
  const dotted = clean.match(/^([18]\.\d{5})(?:\.\d{4})?$/);
  if (dotted) return dotted[1];
  const digits = clean.replace(/\D/g, "");
  return /^[18]\d{5}$/.test(digits) ? `${digits[0]}.${digits.slice(1)}` : "";
}

export async function POST(request: Request) {
  try {
    if (!await requireAdmin(request)) return Response.json({ error: "Login admin diperlukan." }, { status: 401 });
    const payload = (await request.json()) as { rows?: EnrichmentRow[] };
    const rows = (payload.rows ?? []).slice(0, 250);
    const db = adminDb();
    let matched = 0; let unmatched = 0;

    for (const row of rows) {
      const material = baseNumber(row.materialNumber ?? "");
      if (!material) { unmatched += 1; continue; }
      const { data: current } = await db.from("products").select("*").eq("base_number", material).maybeSingle();
      if (!current) { unmatched += 1; continue; }
      const value = (candidate: string | undefined, fallback: string) => candidate?.trim() || fallback;
      const { error } = await db.from("products").update({
        name: value(row.name, current.name), brand: value(row.brand, current.brand), cas: value(row.cas, current.cas),
        synonyms: value(row.synonyms, current.synonyms), description: value(row.description, current.description),
        enrichment_status: "complete", updated_at: new Date().toISOString(),
      }).eq("id", current.id);
      if (error) throw error;

      const sku = row.sku?.trim() ?? "";
      if (/^[18]\.\d{5}\.\d{4}$/.test(sku)) {
        const availability = /ready/i.test(row.availability ?? "") ? "Ready" : "Indent";
        const { error: variantError } = await db.from("variants").upsert({ product_id: current.id, sku, size: row.size?.trim() || "Lihat spesifikasi", availability, updated_at: new Date().toISOString() }, { onConflict: "sku" });
        if (variantError) throw variantError;
      }
      matched += 1;
    }
    return Response.json({ matched, unmatched });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Impor data pelengkap gagal." }, { status: 500 });
  }
}
