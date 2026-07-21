import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductByNumber } from "@/lib/catalog";
import { companyName, siteUrl, whatsappLink } from "@/lib/site";

export const revalidate = 86400;

type PageProps = { params: Promise<{ number: string }> };

function descriptionFor(product: Awaited<ReturnType<typeof getProductByNumber>>) {
  if (!product) return "";
  return product.description || `${product.name} material number ${product.base_number} untuk kebutuhan analisis laboratorium. Lihat ukuran, SKU, ketersediaan, dan SDS/MSDS.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number } = await params;
  const product = await getProductByNumber(number);
  if (!product) return { title: "Produk tidak ditemukan", robots: { index: false, follow: false } };
  const title = `${product.name} ${product.base_number} ${product.brand}`;
  const canonical = `${siteUrl()}/produk/${encodeURIComponent(product.base_number)}`;
  return {
    title,
    description: descriptionFor(product).slice(0, 158),
    alternates: { canonical },
    openGraph: { title: `${title} | ${companyName}`, description: descriptionFor(product), url: canonical, type: "website", siteName: companyName },
    robots: { index: true, follow: true },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { number } = await params;
  const product = await getProductByNumber(number);
  if (!product) notFound();
  const readyCount = product.variants.filter((variant) => variant.availability === "Ready").length;
  const canonical = `${siteUrl()}/produk/${encodeURIComponent(product.base_number)}`;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: product.name,
    description: descriptionFor(product), sku: product.base_number, mpn: product.base_number,
    brand: { "@type": "Brand", name: product.brand || "Merck" }, url: canonical,
    additionalProperty: [
      { "@type": "PropertyValue", name: "CAS Number", value: product.cas || "Tidak tersedia" },
      { "@type": "PropertyValue", name: "Material Number", value: product.base_number },
      { "@type": "PropertyValue", name: "Ketersediaan", value: readyCount ? `${readyCount} varian Ready` : "Cek Stok" },
    ],
  };

  return <main className="product-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}/>
    <header className="product-header"><Link className="brand" href="/"><span className="brand-mark">⚗</span><span>{companyName}</span></Link><Link href="/#katalog">Cari produk lain</Link></header>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>›</span><Link href="/#katalog">Katalog</Link><span>›</span><strong>{product.base_number}</strong></nav>
    <article className="product-detail">
      <section className="product-identity">
        <div className="product-detail-meta"><span>{product.brand || "Merck"}</span><span>Material {product.base_number}</span></div>
        <h1>{product.name}</h1>
        <p className="product-lead">{descriptionFor(product)}</p>
        <dl className="chemical-facts">
          <div><dt>Material number</dt><dd>{product.base_number}</dd></div>
          <div><dt>CAS</dt><dd>{product.cas || "—"}</dd></div>
          <div><dt>Sinonim</dt><dd>{product.synonyms || "—"}</dd></div>
          <div><dt>Merek</dt><dd>{product.brand || "Merck"}</dd></div>
        </dl>
        <div className="product-detail-actions">
          <a className="button primary" href={whatsappLink(`Halo ${companyName}, saya ingin menanyakan harga dan ketersediaan ${product.name}, material number ${product.base_number}.`)} target="_blank" rel="noreferrer">Tanyakan Harga via WhatsApp</a>
          <a className="button secondary" href={product.sds_url || `https://www.sigmaaldrich.com/ID/id/sds/mm/${product.base_number}`} target="_blank" rel="noreferrer">Unduh SDS/MSDS</a>
        </div>
      </section>
      <aside className="availability-card"><span>Ketersediaan produk</span><strong>{readyCount ? `${readyCount} varian Ready` : "Cek Stok"}</strong><p>Hubungi kami untuk memastikan stok dan waktu pengiriman terbaru.</p></aside>
      <section className="product-variants">
        <div className="detail-section-title"><span>Ukuran dan SKU</span><h2>Pilihan produk</h2></div>
        {product.variants.length ? <div className="detail-variant-list">{product.variants.map((variant) => <div className="detail-variant" key={variant.sku}><div><strong>{variant.size || "Lihat spesifikasi"}</strong><small>{variant.sku}</small></div><span className={`stock ${variant.availability === "Ready" ? "ready" : "check-stock"}`}>{variant.availability === "Ready" ? "Ready" : "Cek Stok"}</span><a href={whatsappLink(`Halo ${companyName}, saya ingin menanyakan ${product.name}, SKU ${variant.sku}, ukuran ${variant.size}.`)} target="_blank" rel="noreferrer">Tanyakan Harga</a></div>)}</div> : <p className="no-variants">Ukuran belum tersedia. Silakan hubungi kami untuk informasi produk ini.</p>}
      </section>
    </article>
    <footer className="product-footer"><strong>{companyName}</strong><p>Bahan kimia analisis untuk laboratorium, riset, dan industri.</p></footer>
  </main>;
}
