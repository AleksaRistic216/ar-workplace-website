import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Pillars from "@/components/Pillars";
import Features from "@/components/Features";
import SectionTeasers from "@/components/SectionTeasers";
import Footer from "@/components/Footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Cross Platform Terminal (CPT)",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Linux, Windows",
  description:
    "GPU-accelerated cross-platform terminal and developer workspace with dockable panels, AI workflow integration for Claude Code and GitHub Copilot, and automatic cross-platform quirks resolution.",
  /*
   * Two offers, because two are genuinely sold. The `UnitPriceSpecification` is what tells a search
   * engine these are billed periods rather than one-off purchases — it was deliberately absent
   * while CPT was a one-time licence, and would have been advertising a subscription that did not
   * exist. Keep the numbers in step with `PLANS` in `src/lib/plans.ts`, which is what the checkout
   * actually charges.
   */
  offers: [
    {
      "@type": "Offer",
      name: "Monthly",
      price: "7.49",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "7.49",
        priceCurrency: "EUR",
        unitText: "MONTH",
        billingDuration: 1,
        billingIncrement: 1,
      },
    },
    {
      "@type": "Offer",
      name: "Yearly",
      price: "67.41",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "67.41",
        priceCurrency: "EUR",
        unitText: "YEAR",
        billingDuration: 12,
        billingIncrement: 12,
      },
    },
  ],
  featureList: [
    "GPU-accelerated terminal rendering",
    "Full VT/PTY support with tabbed sessions",
    "Dockable panels and widgets, with pinnable pane sizes",
    "AI Workflow Pipeline with Claude Code and GitHub Copilot",
    "AI inventory of the skills, agents, commands, hooks and MCP servers in the current repository",
    "Cross-platform quirks resolution",
    "In-app auto-update",
    "No installation required",
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <Hero />
        <Pillars />
        <Features />
        <SectionTeasers />
      </main>
      <Footer />
    </>
  );
}
