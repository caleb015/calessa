import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { publicApi } from "@/lib/api";
import { LINK_PREVIEW_IMAGE } from "@/lib/linkPreview";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-serif", subsets: ["latin"] });

const DEFAULT_MONOGRAM = "/images/rc-monogram-floral-green.png";
/** The site's own address, for turning the site's own image paths into full links in link previews. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://raissaandcaleb.com";

/** A small copy of an image via Next's image resizer (the monogram file itself is ~1 MB). */
const resized = (src: string, width: 64 | 256) => `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;

export async function generateMetadata(): Promise<Metadata> {
  // The browser tab icon is the monogram set in Dashboard → Settings.
  const settings = await publicApi.getSettings().catch(() => null);
  const monogram = settings?.monogramUrl || DEFAULT_MONOGRAM;
  const title = settings?.siteTitle?.trim() || process.env.NEXT_PUBLIC_APP_NAME || "Caleb & Raissa";
  const description = settings?.siteDescription?.trim() || process.env.NEXT_PUBLIC_APP_SUBTITLE || "Join us as we celebrate our wedding day.";
  const coupleNames = `${settings?.coupleNameA ?? "Caleb"} & ${settings?.coupleNameB ?? "Raissa"}`;
  // Link previews (Messenger, Facebook, iMessage, WhatsApp…) show the preview picture with the title and
  // description. They're in every page's head, so they show even while the site is Under Maintenance.
  const image = { url: LINK_PREVIEW_IMAGE, width: 1200, height: 630, alt: coupleNames };
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    icons: { icon: resized(monogram, 64), apple: resized(monogram, 256) },
    openGraph: { type: "website", siteName: coupleNames, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
