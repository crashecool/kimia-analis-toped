import { adminDb, requireAdmin } from "@/lib/supabase-server";

type ImportRow = { sku?: string; name?: string };
const materialPattern = /^[18]\.\d{5}\.\d{4}$/;

function productData(sku: string) {
  const [prefix, product] = sku.split(".");
  const baseNumber = `${prefix}.${product}`;
  return {
    baseNumber,
    sdsUrl: `https://www.sigmaaldrich.com/ID/id/sds/mm/${baseNumber}`,
    sourceUrl: `https://www.sigmaaldrich.com/ID/id/product/mm/${prefix}${product}`,
  };
}

export async function POST(request: Request) {
  try {
    if (!await requireAdmin(request)) return Response.json({ error: "Login admin diperlukan." }, { status: 401 });
    const payload = (await request.json()) as { rows?: ImportRow[] };
    const rows = (payload.rows ?? []).map((row) => ({ sku: row.sku?.trim() ?? "", name: row.name?.trim() ?? "" }))
      .filter((row) => materialPattern.test(row.sku) && row.name).slice(0, 250);
    if (!rows.length) return Response.json({ error: "Tidak ada material yang valid." }, { status: 400 });

    const db = adminDb();
    const grouped = new Map<string, { name: string; skus: string[]; sdsUrl: string; sourceUrl: string }>();
    for (const row of rows) {
      const info = productData(row.sku); const existing = grouped.get(info.baseNumber);
      if (existing) existing.skus.push(row.sku);
      else grouped.set(info.baseNumber, { name: row.name, skus: [row.sku], sdsUrl: info.sdsUrl, sourceUrl: info.sourceUrl });
    }

    let imported = 0;
    for (const [baseNumber, product] of grouped) {
      const { data: saved, error } = await db.from("products").upsert({ base_number: baseNumber, name: product.name, brand: "Merck", sds_url: product.sdsUrl, source_url: product.sourceUrl, updated_at: new Date().toISOString() }, { onConflict: "base_number" }).select("id").single();
      if (error) throw error;
      const variants = product.skus.map((sku) => ({ product_id: saved.id, sku, size: "Lihat spesifikasi", availability: "Indent", updated_at: new Date().toISOString() }));
      const { error: variantError } = await db.from("variants").upsert(variants, { onConflict: "sku" });
      if (variantError) throw variantError;
      imported += variants.length;
    }
    return Response.json({ imported, products: grouped.size });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Impor gagal." }, { status: 500 });
  }
}
