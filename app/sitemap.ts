import type { MetadataRoute } from "next";
import { getAllProductUrls } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await getAllProductUrls();
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ...products.map((product) => ({ url: `${base}/produk/${encodeURIComponent(product.base_number)}`, lastModified: new Date(product.updated_at), changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
