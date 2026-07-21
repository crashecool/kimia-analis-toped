"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const whatsappNumber = "6289652809692";

const products = [
  {
    id: "ethanol",
    brand: "Supelco",
    number: "1.00983",
    name: "Ethanol",
    description: "absolute for analysis EMSURE® ACS, ISO, Reag. Ph Eur",
    synonyms: "Ethyl alcohol, Methylcarbinol",
    cas: "64-17-5",
    rating: "5.0",
    sdsUrl: "https://www.sigmaaldrich.com/ID/id/sds/mm/1.00983",
    variants: [
      { size: "1 L", sku: "1.00983.1000", status: "Ready" },
      { size: "1 L", sku: "1.00983.1011", status: "Indent" },
      { size: "2.5 L", sku: "1.00983.2511", status: "Ready" },
      { size: "2.5 L", sku: "1.00983.2500", status: "Indent" },
      { size: "5 L", sku: "1.00983.5000", status: "Ready" },
      { size: "10 L", sku: "1.00983.6010", status: "Indent" },
    ],
  },
  {
    id: "synthesis",
    brand: "Merck",
    number: "8.14672",
    name: "Dichlorocamphoryl sulfonyl compound",
    description: "Reagen khusus untuk kebutuhan sintesis laboratorium",
    synonyms: "Produk sintesis organik",
    cas: "Konfirmasi dokumen",
    rating: "—",
    sdsUrl: "https://www.sigmaaldrich.com/ID/id/sds/mm/8.14672",
    variants: [
      { size: "5 g", sku: "8.14672.0005", status: "Indent" },
    ],
  },
];

type CatalogProduct = {
  id: string | number;
  brand: string;
  number: string;
  name: string;
  description: string;
  synonyms: string;
  cas: string;
  rating: string;
  sdsUrl: string;
  variants: { size: string; sku: string; status: string }[];
};

function Icon({ name }: { name: "search" | "pin" | "whatsapp" | "shield" | "bolt" | "box" | "flask" | "arrow" | "menu" | "sun" | "moon" }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    whatsapp: <><path d="M21 12a9 9 0 0 1-13.4 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12Z"/><path d="M8.2 8.1c.4 3.8 3 6.3 6.8 7l1.4-1.5-2.2-1.1-.9.9c-1.6-.6-2.8-1.8-3.4-3.4l.9-.9-1.1-2.2-1.5 1.2Z"/></>,
    shield: <><path d="M12 3 5 6v5c0 4.5 2.8 7.7 7 10 4.2-2.3 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    bolt: <path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z"/>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 0 10 8 4 8-4V7M12 11v10"/></>,
    flask: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 16h9"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
    moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function waLink(message: string) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(products);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("kat-theme");
    const initialTheme = savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("kat-theme", nextTheme);
  }

  function toggleProduct(productId: string) {
    setExpandedProducts((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const response = await fetch(`/api/products?limit=20&offset=0&q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const result = await response.json() as { products?: CatalogProduct[]; hasMore?: boolean };
        if (result.products?.length) {
          setCatalogProducts(result.products); setHasMore(result.hasMore === true);
        } else if (!query) { setCatalogProducts(products); setHasMore(false); }
        else setCatalogProducts([]);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setCatalogProducts(products);
      } finally { if (!controller.signal.aborted) setCatalogLoading(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  async function loadMoreProducts() {
    setCatalogLoading(true);
    try {
      const response = await fetch(`/api/products?limit=20&offset=${catalogProducts.length}&q=${encodeURIComponent(query)}`);
      const result = await response.json() as { products?: CatalogProduct[]; hasMore?: boolean };
      setCatalogProducts((current) => [...current, ...(result.products ?? [])]);
      setHasMore(result.hasMore === true);
    } finally { setCatalogLoading(false); }
  }

  const scrollToCatalog = () => document.getElementById("katalog")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#beranda" aria-label="KIMIA ANALIS TOPED - Beranda">
            <span className="brand-mark"><Icon name="flask" /></span>
            <span>KIMIA ANALIS TOPED</span>
          </a>
          <button className="menu-button" aria-label="Buka navigasi" onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button>
          <nav className={menuOpen ? "nav open" : "nav"}>
            <a href="#beranda" onClick={() => setMenuOpen(false)}>Beranda</a>
            <a href="#katalog" onClick={() => setMenuOpen(false)}>Katalog Produk</a>
            <a href="#tentang" onClick={() => setMenuOpen(false)}>Tentang Kami</a>
          </nav>
          <div className="header-actions">
            <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Gunakan mode terang" : "Gunakan mode malam"} aria-pressed={theme === "dark"} title={theme === "dark" ? "Mode terang" : "Mode malam"}><Icon name={theme === "dark" ? "sun" : "moon"} /></button>
            <div className="header-contact"><a href={waLink("Halo KIMIA ANALIS TOPED, saya ingin bertanya mengenai produk bahan kimia analisis.")} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> Hubungi WhatsApp</a></div>
          </div>
        </div>
      </header>

      <section className="hero" id="beranda">
        <div className="hero-content">
          <div className="eyebrow"><Icon name="flask" /> Bahan Kimia Analisis Terpercaya</div>
          <h1>Presisi untuk<br/><span>Setiap Analisis</span></h1>
          <p>Produk Merck dan Sigma untuk kebutuhan laboratorium, riset, dan industri. Temukan produk berdasarkan nama atau material number.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={scrollToCatalog}><Icon name="search" /> Cari Produk</button>
            <a className="button secondary" href={waLink("Halo KIMIA ANALIS TOPED, saya ingin konsultasi kebutuhan bahan kimia analisis.")} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> Konsultasi WhatsApp</a>
          </div>
          <div className="trust-row">
            <div><span><Icon name="shield" /></span><p><strong>Produk Terpercaya</strong><small>Informasi produk jelas</small></p></div>
            <div><span><Icon name="bolt" /></span><p><strong>Respons Cepat</strong><small>Konsultasi via WhatsApp</small></p></div>
            <div><span><Icon name="box" /></span><p><strong>Ready &amp; Cek Stok</strong><small>Status mudah dikenali</small></p></div>
          </div>
        </div>
        <div className="hero-visual"><picture><source media="(max-width: 520px)" srcSet="/images/hero-mobile.avif" type="image/avif"/><source media="(max-width: 900px)" srcSet="/images/hero-tablet.avif" type="image/avif"/><source srcSet="/images/hero-desktop.avif" type="image/avif"/><img src="/images/hero-fallback.webp" alt="Botol reagen amber dan peralatan gelas laboratorium" width="1200" height="900" fetchPriority="high" decoding="async"/></picture></div>
      </section>

      <section className="catalog" id="katalog">
        <div className="section-heading">
          <div><span className="section-kicker">Katalog produk</span><h2>Temukan reagen yang Anda butuhkan</h2><p>Contoh data awal berdasarkan material number terpilih dari daftar produk.</p></div>
        </div>

        <div className="catalog-controls">
          <div className="catalog-search">
            <Icon name="search" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setExpandedProducts(new Set()); }} placeholder="Cari nama produk atau material number..." aria-label="Cari produk dalam katalog" />
            {query && <button className="clear-search" onClick={() => setQuery("")} aria-label="Hapus pencarian">×</button>}
          </div>
        </div>

        <div className="product-grid">
          {catalogLoading && <div className="catalog-loading">Mencari produk…</div>}
          {catalogProducts.map((product) => {
            const productId = String(product.id);
            const detailId = `detail-${productId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
            const expanded = expandedProducts.has(productId);
            const readyCount = product.variants.filter((variant) => variant.status === "Ready").length;
            const checkCount = product.variants.length - readyCount;
            return (
              <article className={`product-card compact-card ${expanded ? "expanded" : ""}`} key={product.id}>
                <div className="product-top">
                  <div className="product-copy">
                    <div className="product-meta"><span>{product.brand}</span><span>{product.rating !== "—" ? `★ ${product.rating}` : "Produk analisis"}</span></div>
                    <p className="material">{product.number}</p>
                    <h3><Link href={`/produk/${encodeURIComponent(product.number)}`}>{product.name}</Link></h3>
                    <p>{product.description || "Data dasar dari pricelist · detail menunggu sinkronisasi Sigma-Aldrich"}</p>
                    <dl><div><dt>Sinonim</dt><dd>{product.synonyms || "—"}</dd></div><div><dt>CAS</dt><dd>{product.cas || "—"}</dd></div></dl>
                    <div className="stock-summary" aria-label="Ringkasan ketersediaan">
                      {readyCount > 0 && <span className="stock ready">{readyCount} Ready</span>}
                      {checkCount > 0 && <span className="stock check-stock">{checkCount} Cek Stok</span>}
                      {product.variants.length === 0 && <span className="stock check-stock">Ukuran belum tersedia</span>}
                    </div>
                    <div className="card-actions">
                      {product.variants.length > 0 && <button className="detail-button" type="button" aria-expanded={expanded} aria-controls={detailId} onClick={() => toggleProduct(productId)}>{expanded ? "Tutup Detail" : `Lihat ${product.variants.length} Ukuran`} <Icon name="arrow" /></button>}
                      <a className="compact-link" href={product.sdsUrl} target="_blank" rel="noreferrer" aria-label={`Unduh SDS/MSDS ${product.name}`}>SDS/MSDS</a>
                      <a className="compact-wa" href={waLink(`Halo KIMIA ANALIS TOPED, saya ingin menanyakan produk ${product.name}, material number ${product.number}.`)} target="_blank" rel="noreferrer" aria-label={`Tanyakan ${product.name} melalui WhatsApp`}><Icon name="whatsapp" /> WhatsApp</a>
                    </div>
                  </div>
                </div>
                {expanded && <div className="variant-wrap" id={detailId}>
                  <div className="variant-head"><span>Ukuran / SKU</span><span>Ketersediaan</span><span></span></div>
                  {product.variants.map((variant) => (
                    <div className="variant-row" key={variant.sku}>
                      <div><strong>{variant.size}</strong><small>{variant.sku}</small></div>
                      <span className={`stock ${variant.status === "Ready" ? "ready" : "check-stock"}`}>{variant.status === "Ready" ? "Ready" : "Cek Stok"}</span>
                      <a className="price-button" aria-label={`Tanyakan harga produk ${variant.sku} melalui WhatsApp`} href={waLink(`Halo KIMIA ANALIS TOPED, saya ingin menanyakan harga dan ketersediaan ${product.name} ukuran ${variant.size}, SKU ${variant.sku}.`)} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> Tanyakan Harga</a>
                    </div>
                  ))}
                </div>}
              </article>
            );
          })}
          {catalogProducts.length === 0 && !catalogLoading && <div className="empty"><Icon name="search"/><h3>Produk belum ditemukan</h3><p>Coba material number lain atau tanyakan langsung kepada kami melalui WhatsApp.</p></div>}
        </div>
        {hasMore && <button className="load-more" disabled={catalogLoading} onClick={loadMoreProducts}>{catalogLoading ? "Memuat produk…" : "Tampilkan Lebih Banyak"}</button>}
      </section>

      <section className="about" id="tentang">
        <div><span className="section-kicker">Tentang kami</span><h2>Partner kebutuhan analisis Anda</h2></div>
        <p>KIMIA ANALIS TOPED menyediakan informasi dan penawaran produk bahan kimia analisis Merck dan Sigma. Hubungi kami melalui WhatsApp untuk memastikan harga serta ketersediaan terbaru sebelum pemesanan.</p>
        <a className="button light" href={waLink("Halo KIMIA ANALIS TOPED, saya ingin meminta penawaran produk.")} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> WhatsApp Kami</a>
      </section>

      <footer><div className="brand footer-brand"><span className="brand-mark"><Icon name="flask" /></span><span>KIMIA ANALIS TOPED</span></div><p>Produk bahan kimia analisis untuk laboratorium, riset, dan industri.</p><a className="footer-wa" href={waLink("Halo KIMIA ANALIS TOPED, saya ingin bertanya mengenai produk.")} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> Hubungi WhatsApp</a><small>Silakan hubungi kami melalui WhatsApp untuk harga dan ketersediaan terbaru.</small></footer>
      <a className="floating-wa" href={waLink("Halo KIMIA ANALIS TOPED, saya ingin bertanya mengenai produk.")} target="_blank" rel="noreferrer" aria-label="Hubungi melalui WhatsApp"><Icon name="whatsapp" /></a>
    </main>
  );
}
