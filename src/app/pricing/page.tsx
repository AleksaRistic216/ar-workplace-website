import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Pricing from "@/components/Pricing";

export const metadata: Metadata = {
  title: "Pricing — Cross Platform Terminal",
  description:
    "What Cross Platform Terminal costs, monthly or yearly, and what a licence includes.",
};

export default function PricingPage() {
  return (
    <>
      <Navbar />
      {/* pt-14 reserves the fixed header's height; the section supplies its own breathing room. */}
      <main className="pt-14">
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
