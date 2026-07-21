export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://kimia-analis-toped.netlify.app";
  return configured.replace(/\/$/, "");
}

export const companyName = "KIMIA ANALIS TOPED";
export const whatsappNumber = "6289652809692";

export function whatsappLink(message: string) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
