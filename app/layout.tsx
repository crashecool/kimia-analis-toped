import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KIMIA ANALIS TOPED | Bahan Kimia Analisis",
  description: "Katalog bahan kimia analisis Merck dan Sigma. Konsultasi produk dan ketersediaan melalui WhatsApp.",
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
