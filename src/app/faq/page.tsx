import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";

export const metadata: Metadata = {
  title: "FAQ — Cross Platform Terminal",
  description:
    "Answers to what people ask before buying Cross Platform Terminal — billing, platforms, updates, refunds and support.",
  alternates: { canonical: "/faq" },
};

export default function FAQPage() {
  return (
    <>
      <Navbar />
      {/* pt-14 reserves the fixed header's height; the section supplies its own breathing room. */}
      <main className="pt-14">
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
