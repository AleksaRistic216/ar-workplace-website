import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Same host as sitemap.ts and robots.ts — a mismatch here makes every canonical and og:url
  // point at a different origin than the one being indexed.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.crossplatformterminal.com"
  ),
  title: {
    // macOS was in this title while no macOS build existed \u2014 the one place the claim survived
    // after being qualified everywhere else on the site. Keep it out until a .dmg ships.
    default: "Cross Platform Terminal (CPT) \u2014 One Terminal for Linux and Windows",
    template: "%s | Cross Platform Terminal",
  },
  description:
    "A GPU-accelerated terminal that behaves identically on Linux and Windows: the same keybindings everywhere, shells that survive closing the app, and built-in support for eight AI agent CLIs. \u20ac7.49 a month or \u20ac67.41 a year.",
  applicationName: "Cross Platform Terminal",
  keywords: [
    "cross platform terminal",
    "terminal emulator",
    "GPU accelerated terminal",
    "Linux terminal",
    "Windows terminal",
    "persistent shell sessions",
    "detachable terminal sessions",
    "AI agent terminal",
    "Claude Code terminal",
  ],
  authors: [{ name: "Limitless Soft" }],
  creator: "Limitless Soft",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Cross Platform Terminal",
    locale: "en_GB",
    url: "/",
    title: "One terminal. Every platform.",
    description:
      "A GPU-accelerated terminal that behaves identically on Linux and Windows \u2014 same keybindings, shells that outlive the window, and eight AI agent CLIs recognised out of the box.",
  },
  twitter: {
    card: "summary_large_image",
    title: "One terminal. Every platform.",
    description:
      "A GPU-accelerated terminal that behaves identically on Linux and Windows. Same keys, persistent shells, eight AI agents recognised.",
  },
  /*
   * `max-snippet: -1` and `max-image-preview: large` matter for answer engines as much as for
   * search: a capped snippet is a capped quotation, and this site's whole approach is to state
   * checkable facts that are worth quoting in full.
   */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
