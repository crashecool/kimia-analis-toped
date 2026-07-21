"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

type ParsedRow = { sku: string; name: string };
type TextItem = { str: string; transform: number[] };
type EnrichmentRow = { materialNumber: string; name: string; brand: string; cas: string; synonyms: string; description: string; sku: string; size: string; availability: string };

const headerAliases: Record<keyof EnrichmentRow, string[]> = {
  materialNumber: ["material number", "material_number", "material", "nomor material", "catalog number", "catalog no", "sku"],
  name: ["name", "product name", "nama", "nama produk"],
  brand: ["brand", "merek"], cas: ["cas", "cas number", "nomor cas"],
  synonyms: ["synonyms", "synonym", "sinonim"], description: ["description", "deskripsi", "grade", "keterangan"],
  sku: ["sku", "kepada anda/sku", "catalog sku"], size: ["size", "ukuran"], availability: ["availability", "ketersediaan", "status"],
};

function normalizedHeader(value: unknown) { return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim(); }

async function parseEnrichmentFile(file: File) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return raw.map((source) => {
    const entries = Object.entries(source);
    const get = (key: keyof EnrichmentRow) => {
      const aliases = headerAliases[key];
      const found = entries.find(([header]) => aliases.includes(normalizedHeader(header)));
      return String(found?.[1] ?? "").trim();
    };
    return { materialNumber: get("materialNumber"), name: get("name"), brand: get("brand"), cas: get("cas"), synonyms: get("synonyms"), description: get("description"), sku: get("sku"), size: get("size"), availability: get("availability") };
  }).filter((row) => row.materialNumber);
}

function cleanName(value: string) {
  return value.replace(/┬«/g, "®").replace(/\s+/g, " ").trim();
}

async function parseMerckPdf(file: File, onProgress: (page: number, total: number) => void) {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const document = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const found = new Map<string, ParsedRow>();

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = new Map<number, TextItem[]>();

    for (const raw of content.items) {
      if (!("str" in raw) || !("transform" in raw)) continue;
      const item = raw as TextItem;
      const y = Math.round(item.transform[5] / 2) * 2;
      lines.set(y, [...(lines.get(y) ?? []), item]);
    }

    for (const items of lines.values()) {
      items.sort((a, b) => a.transform[4] - b.transform[4]);
      const material = items.find((item) => item.transform[4] < 125 && /^[18]\.\d{5}\.\d{4}$/.test(item.str.trim()));
      if (!material) continue;
      const name = cleanName(items.filter((item) => item.transform[4] >= 125 && item.transform[4] < 380).map((item) => item.str).join(" "));
      if (name) found.set(material.str.trim(), { sku: material.str.trim(), name });
    }
    onProgress(pageNumber, document.numPages);
  }
  return Array.from(found.values());
}

export default function AdminImportPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [filename, setFilename] = useState("");
  const [message, setMessage] = useState("Pilih PDF pricelist Merck untuk memulai.");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [enrichmentRows, setEnrichmentRows] = useState<EnrichmentRow[]>([]);
  const [enrichmentFile, setEnrichmentFile] = useState("");
  const [enrichmentBusy, setEnrichmentBusy] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [enrichmentMessage, setEnrichmentMessage] = useState("Pilih CSV atau Excel berisi data pelengkap produk.");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault(); setAuthMessage("Memeriksa akun…");
    const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    setAuthMessage(error ? "Email atau password tidak cocok." : "Login berhasil.");
  }

  async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    if (!session?.access_token) throw new Error("Sesi admin berakhir. Silakan login kembali.");
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    return fetch(input, { ...init, headers });
  }

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true); setRows([]); setFilename(file.name); setProgress(0);
    setMessage("Membaca PDF di perangkat Anda…");
    try {
      const parsed = await parseMerckPdf(file, (page, total) => {
        setProgress(Math.round((page / total) * 100));
        setMessage(`Membaca halaman ${page} dari ${total}…`);
      });
      setRows(parsed);
      setMessage(`${parsed.length.toLocaleString("id-ID")} material valid ditemukan. Format lain otomatis diabaikan.`);
    } catch (error) {
      setMessage(error instanceof Error ? `Gagal membaca PDF: ${error.message}` : "Gagal membaca PDF.");
    } finally { setBusy(false); }
  }

  async function importRows() {
    if (!rows.length) return;
    setBusy(true); setProgress(0);
    try {
      const batchSize = 200;
      let imported = 0;
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const response = await authorizedFetch("/api/import/products", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: rows.slice(offset, offset + batchSize) }),
        });
        const result = await response.json() as { imported?: number; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Impor gagal.");
        imported += result.imported ?? 0;
        setProgress(Math.round((Math.min(offset + batchSize, rows.length) / rows.length) * 100));
        setMessage(`Menyimpan ${imported.toLocaleString("id-ID")} dari ${rows.length.toLocaleString("id-ID")} material…`);
      }
      setMessage(`${imported.toLocaleString("id-ID")} material berhasil disimpan ke katalog.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impor gagal.");
    } finally { setBusy(false); }
  }

  async function handleEnrichmentFile(file?: File) {
    if (!file) return;
    setEnrichmentBusy(true); setEnrichmentFile(file.name); setEnrichmentProgress(0);
    try {
      const parsed = await parseEnrichmentFile(file); setEnrichmentRows(parsed);
      setEnrichmentMessage(`${parsed.length.toLocaleString("id-ID")} baris siap dicocokkan berdasarkan material number.`);
    } catch (error) {
      setEnrichmentMessage(error instanceof Error ? error.message : "File tidak dapat dibaca.");
    } finally { setEnrichmentBusy(false); }
  }

  async function importEnrichment() {
    if (!enrichmentRows.length) return;
    setEnrichmentBusy(true); setEnrichmentProgress(0);
    let matched = 0; let unmatched = 0;
    try {
      const batchSize = 200;
      for (let offset = 0; offset < enrichmentRows.length; offset += batchSize) {
        const response = await authorizedFetch("/api/import/enrichment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: enrichmentRows.slice(offset, offset + batchSize) }) });
        const result = await response.json() as { matched?: number; unmatched?: number; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Impor data pelengkap gagal.");
        matched += result.matched ?? 0; unmatched += result.unmatched ?? 0;
        setEnrichmentProgress(Math.round((Math.min(offset + batchSize, enrichmentRows.length) / enrichmentRows.length) * 100));
        setEnrichmentMessage(`Memperbarui ${matched.toLocaleString("id-ID")} produk…`);
      }
      setEnrichmentMessage(`${matched.toLocaleString("id-ID")} produk diperbarui${unmatched ? `; ${unmatched.toLocaleString("id-ID")} material tidak ditemukan` : ""}.`);
    } catch (error) { setEnrichmentMessage(error instanceof Error ? error.message : "Impor gagal."); }
    finally { setEnrichmentBusy(false); }
  }

  if (authLoading) return <main className="admin-page"><section className="admin-login"><p>Memeriksa sesi admin…</p></section></main>;
  if (!session) return <main className="admin-page"><section className="admin-login"><span className="admin-badge">Akses khusus admin</span><h1>Masuk ke panel katalog</h1><p>Gunakan akun email yang dibuat di Supabase Authentication.</p><form onSubmit={login}><label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email"/></label><label>Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password"/></label><button className="import-button" type="submit">Masuk</button></form>{authMessage && <p>{authMessage}</p>}<Link href="/">← Kembali ke katalog</Link></section></main>;

  return <main className="admin-page">
    <header className="admin-header"><Link href="/">← Kembali ke katalog</Link><strong>KIMIA ANALIS TOPED</strong><button type="button" className="retry-button" onClick={() => getSupabaseBrowserClient().auth.signOut()}>Keluar</button></header>
    <section className="admin-shell">
      <div className="admin-intro"><span className="admin-badge">Tahap 1 · Impor data</span><h1>Impor produk dari PDF Merck</h1><p>PDF dibaca langsung di browser. Hanya material number dengan pola <code>1.xxxxx.xxxx</code> dan <code>8.xxxxx.xxxx</code> yang disimpan.</p></div>
      <div className="upload-card">
        <label className="upload-zone">
          <input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => handleFile(event.target.files?.[0])}/>
          <span className="upload-icon">PDF</span><strong>{filename || "Pilih file PDF pricelist"}</strong><small>Klik untuk memilih berkas · Format lain otomatis dilewati</small>
        </label>
        <div className="import-status"><div><strong>Status</strong><span>{message}</span></div><strong>{progress}%</strong></div>
        <div className="progress-track"><span style={{ width: `${progress}%` }}/></div>
        <button className="import-button" disabled={busy || !rows.length} onClick={importRows}>{busy ? "Sedang memproses…" : `Impor ${rows.length.toLocaleString("id-ID")} Material`}</button>
      </div>
      {rows.length > 0 && <section className="preview-card"><div className="preview-title"><div><span>Pratinjau</span><h2>Material yang akan diimpor</h2></div><strong>{rows.length.toLocaleString("id-ID")} SKU</strong></div><div className="preview-table"><div className="preview-head"><span>Material Number</span><span>Nama Produk</span></div>{rows.slice(0, 12).map((row) => <div className="preview-row" key={row.sku}><strong>{row.sku}</strong><span>{row.name}</span></div>)}</div>{rows.length > 12 && <p className="preview-more">…dan {(rows.length - 12).toLocaleString("id-ID")} material lainnya.</p>}</section>}
      <section className="sync-card">
        <span className="admin-badge">Pembaruan berkala</span><h2>Unggah hasil Sigma Scraper GUI</h2>
        <p>Kolom yang didukung: <code>material number</code>, <code>name</code>, <code>brand</code>, <code>cas</code>, <code>synonyms</code>, <code>description</code>, <code>sku</code>, <code>size</code>, dan <code>availability</code>. Status varian otomatis menjadi Ready atau Indent; harga tidak ditampilkan.</p>
        <label className="enrichment-picker"><input type="file" accept=".csv,.xlsx,.xls,text/csv" disabled={enrichmentBusy} onChange={(event) => handleEnrichmentFile(event.target.files?.[0])}/><span>XLS</span><div><strong>{enrichmentFile || "Pilih file CSV / Excel"}</strong><small>Data dicocokkan otomatis tanpa mengubah ukuran dan SDS</small></div></label>
        <div className="import-status"><div><strong>Status</strong><span>{enrichmentMessage}</span></div><strong>{enrichmentProgress}%</strong></div>
        <div className="progress-track"><span style={{ width: `${enrichmentProgress}%` }}/></div>
        <button className="import-button" disabled={enrichmentBusy || !enrichmentRows.length} onClick={importEnrichment}>{enrichmentBusy ? "Sedang memproses…" : `Perbarui ${enrichmentRows.length.toLocaleString("id-ID")} Produk`}</button>
        {enrichmentRows.length > 0 && <div className="sync-results">{enrichmentRows.slice(0, 6).map((row, index) => <div className="sync-result" key={`${row.materialNumber}-${index}`}><strong>{row.materialNumber}</strong><span>{row.name || row.description || "Data pelengkap"}</span><em className="complete">Siap</em></div>)}</div>}
      </section>
    </section>
  </main>;
}
