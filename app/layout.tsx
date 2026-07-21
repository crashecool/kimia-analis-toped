import type { Metadata } from "next";
import "./globals.css";
import { companyName, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${companyName} | Bahan Kimia Analisis`, template: `%s | ${companyName}` },
  description: "Katalog bahan kimia analisis Merck dan Sigma untuk laboratorium, riset, dan industri. Cari berdasarkan nama, CAS, SKU, atau material number.",
  alternates: { canonical: "/" },
  applicationName: companyName,
  keywords: ["bahan kimia analisis", "Merck", "Sigma-Aldrich", "reagen laboratorium", "SDS", "MSDS"],
  openGraph: { title: `${companyName} | Bahan Kimia Analisis`, description: "Katalog reagen Merck dan Sigma dengan informasi ukuran, SKU, ketersediaan, dan SDS/MSDS.", url: "/", siteName: companyName, locale: "id_ID", type: "website" },
  robots: { index: true, follow: true },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
