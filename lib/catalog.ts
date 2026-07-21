import { publicDb } from "@/lib/supabase-server";

export type ProductVariant = { sku: string; size: string; availability: string };
export type ProductDetail = {
  id: number;
  base_number: string;
  name: string;
  brand: string;
  description: string;
  synonyms: string;
  cas: string;
  sds_url: string;
  source_url: string;
  updated_at: string;
  variants: ProductVariant[];
};

export async function getProductByNumber(materialNumber: string) {
  const number = decodeURIComponent(materialNumber).trim();
  if (!/^[18]\.\d{5}$/.test(number)) return null;
  const { data, error } = await publicDb().from("products")
    .select("id,base_number,name,brand,description,synonyms,cas,sds_url,source_url,updated_at,variants(sku,size,availability)")
    .eq("base_number", number).maybeSingle();
  if (error) throw new Error(error.message);
  return data as ProductDetail | null;
}

export async function getAllProductUrls() {
  const pageSize = 1000;
  const products: { base_number: string; updated_at: string }[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await publicDb().from("products").select("base_number,updated_at")
      .order("id", { ascending: true }).range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    products.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return products;
}
