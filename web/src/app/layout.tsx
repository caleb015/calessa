import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { publicApi } from "@/lib/api";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-serif", subsets: ["latin"] });

const DEFAULT_MONOGRAM = "/images/rc-monogram-floral-green.png";

/** A small copy of an image via Next's image resizer (the monogram file itself is ~1 MB). */
const resized = (src: string, width: 64 | 256) => `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;

export async function generateMetadata(): Promise<Metadata> {
  // The browser tab icon is the monogram set in Dashboard → Settings.
  const settings = await publicApi.getSettings().catch(() => null);
  const monogram = settings?.monogramUrl || DEFAULT_MONOGRAM;
  return {
    title: process.env.NEXT_PUBLIC_APP_NAME || "Caleb & Raissa",
    description: process.env.NEXT_PUBLIC_APP_SUBTITLE || "Join us as we celebrate our wedding day.",
    icons: { icon: resized(monogram, 64), apple: resized(monogram, 256) },
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
