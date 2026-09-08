import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Features from "@/components/Features";

export const metadata: Metadata = {
  title: "Features — Cross Platform Terminal",
  description:
    "Every feature in Cross Platform Terminal: multi-view workspace, full terminal emulator, AI workflow pipeline, AI inventory, pinned panes and native performance.",
};

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      {/* pt-14 reserves the fixed header's height; the section supplies its own breathing room. */}
      <main className="pt-14">
        <Features />
      </main>
      <Footer />
    </>
  );
}
