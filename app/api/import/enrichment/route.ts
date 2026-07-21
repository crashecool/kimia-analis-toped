import { adminDb, requireAdmin } from "@/lib/supabase-server";

type EnrichmentRow = { materialNumber?: string; name?: string; brand?: string; cas?: string; synonyms?: string; description?: string; sku?: string; size?: string; availability?: string };

function baseNumber(value: string) {
  const clean = value.trim();
  const dotted = clean.match(/^([18]\.\d{5})(?:\.\d{4})?$/);
  if (dotted) return dotted[1];
  const digits = clean.replace(/\D/g, "");
  return /^[18]\d{5}$/.test(digits) ? `${digits[0]}.${digits.slice(1)}` : "";
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Impor data pelengkap gagal tanpa keterangan dari server.";
}

export async function POST(request: Request) {
  try {
    if (!await requireAdmin(request)) return Response.json({ error: "Login admin diperlukan." }, { status: 401 });
    const payload = (await request.json()) as { rows?: EnrichmentRow[] };
    const rows = (payload.rows ?? []).slice(0, 250);
    const db = adminDb();
    const validRows = rows.map((row) => ({ ...row, material: baseNumber(row.materialNumber ?? "") })).filter((row) => row.material);
    const materials = [...new Set(validRows.map((row) => row.material))];
    const { data: currentProducts, error: readError } = await db.from("products").select("*").in("base_number", materials);
    if (readError) throw readError;
    const currentByNumber = new Map((currentProducts ?? []).map((product) => [product.base_number, product]));
    const timestamp = new Date().toISOString();
    const grouped = new Map<string, EnrichmentRow[]>();
    for (const row of validRows) grouped.set(row.material, [...(grouped.get(row.material) ?? []), row]);
    const pick = (items: EnrichmentRow[], key: keyof EnrichmentRow, fallback: string) => items.find((item) => item[key]?.trim())?.[key]?.trim() || fallback;

    const productRows = Array.from(grouped).flatMap(([material, items]) => {
      const current = currentByNumber.get(material); if (!current) return [];
      return [{ id: current.id, base_number: current.base_number, name: pick(items, "name", current.name), brand: pick(items, "brand", current.brand),
        cas: pick(items, "cas", current.cas), synonyms: pick(items, "synonyms", current.synonyms), description: pick(items, "description", current.description),
        sds_url: current.sds_url, source_url: current.source_url, enrichment_status: "complete", updated_at: timestamp }];
    });
    if (productRows.length) {
      const { error: updateError } = await db.from("products").upsert(productRows, { onConflict: "base_number" });
      if (updateError) throw updateError;
    }
    const variants = validRows.flatMap((row) => {
      const current = currentByNumber.get(row.material); const sku = row.sku?.trim() ?? "";
      if (!current || !/^[18]\.\d{5}\.\d{4}$/.test(sku)) return [];
      return [{ product_id: current.id, sku, size: row.size?.trim() || "Lihat spesifikasi", availability: /ready/i.test(row.availability ?? "") ? "Ready" : "Indent", updated_at: timestamp }];
    });
    if (variants.length) {
      const { error: variantError } = await db.from("variants").upsert(variants, { onConflict: "sku" });
      if (variantError) throw variantError;
    }
    return Response.json({ matched: validRows.filter((row) => currentByNumber.has(row.material)).length, unmatched: rows.length - validRows.filter((row) => currentByNumber.has(row.material)).length });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
