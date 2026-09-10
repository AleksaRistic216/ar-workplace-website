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
    default: "Cross Platform Terminal (CPT) - Developer Workspace for Linux, Windows & macOS",
    template: "%s | Cross Platform Terminal",
  },
  description:
    "A GPU-accelerated terminal and dockable developer workspace that behaves identically on Linux, Windows and macOS. AI workflow integration for Claude Code and GitHub Copilot. \u20ac7.49 a month or \u20ac67.41 a year.",
  openGraph: {
    type: "website",
    siteName: "Cross Platform Terminal",
    title: "One workspace. Every platform.",
    description:
      "A GPU-accelerated terminal and dockable developer workspace with the same shortcuts and layout on every OS. \u20ac7.49 a month, or \u20ac67.41 a year.",
  },
  twitter: { card: "summary_large_image" },
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
