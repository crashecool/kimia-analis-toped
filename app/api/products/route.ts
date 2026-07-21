import { publicDb } from "@/lib/supabase-server";

type CatalogRow = {
  id: number;
  base_number: string;
  name: string;
  brand: string;
  description: string;
  synonyms: string;
  cas: string;
  sds_url: string;
  source_url: string;
  enrichment_status: string;
  variants: { sku: string; size: string; status: string }[];
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
    const { data, error } = await publicDb().rpc("search_catalog", {
      search_text: query,
      row_limit: limit + 1,
      row_offset: offset,
    });
    if (error) throw error;
    const rows = (data ?? []) as CatalogRow[];
    const products = rows.slice(0, limit).map((row) => ({
      id: row.id,
      number: row.base_number,
      name: row.name,
      brand: row.brand,
      description: row.description,
      synonyms: row.synonyms,
      cas: row.cas,
      rating: "—",
      sdsUrl: row.sds_url || `https://www.sigmaaldrich.com/ID/id/sds/mm/${row.base_number}`,
      sourceUrl: row.source_url,
      enrichmentStatus: row.enrichment_status,
      variants: row.variants ?? [],
    }));
    return Response.json({ products, hasMore: rows.length > limit });
  } catch (error) {
    return Response.json({ products: [], hasMore: false, error: error instanceof Error ? error.message : "Katalog tidak dapat dibaca." }, { status: 500 });
  }
}
