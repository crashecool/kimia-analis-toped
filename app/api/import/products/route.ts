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

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Impor gagal tanpa keterangan dari server.";
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

    const timestamp = new Date().toISOString();
    const productRows = Array.from(grouped, ([baseNumber, product]) => ({
      base_number: baseNumber, name: product.name, brand: "Merck",
      sds_url: product.sdsUrl, source_url: product.sourceUrl, updated_at: timestamp,
    }));
    const { data: savedProducts, error: productError } = await db.from("products")
      .upsert(productRows, { onConflict: "base_number" }).select("id,base_number");
    if (productError) throw productError;

    const ids = new Map((savedProducts ?? []).map((product) => [product.base_number, product.id]));
    const variants = Array.from(grouped).flatMap(([baseNumber, product]) => {
      const productId = ids.get(baseNumber);
      if (!productId) return [];
      return product.skus.map((sku) => ({ product_id: productId, sku, size: "Lihat spesifikasi", availability: "Indent", updated_at: timestamp }));
    });
    const { error: variantError } = await db.from("variants").upsert(variants, { onConflict: "sku" });
    if (variantError) throw variantError;
    return Response.json({ imported: variants.length, products: savedProducts?.length ?? 0 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
