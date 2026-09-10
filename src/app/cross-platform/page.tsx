import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CrossPlatform from "@/components/CrossPlatform";

export const metadata: Metadata = {
  title: "Cross-Platform — Linux and Windows behave the same",
  description:
    "The platform quirks CPT resolves on Linux and Windows, and the full keyboard shortcut table.",
  alternates: { canonical: "/cross-platform" },
};

export default function CrossPlatformPage() {
  return (
    <>
      <Navbar />
      {/* pt-14 reserves the fixed header's height; the section supplies its own breathing room. */}
      <main className="pt-14">
        <CrossPlatform />
      </main>
      <Footer />
    </>
  );
}
