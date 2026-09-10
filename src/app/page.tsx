import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Platforms from "@/components/Platforms";
import Features from "@/components/Features";
import Agents from "@/components/Agents";
import ReleaseStrip from "@/components/ReleaseStrip";
import SectionTeasers from "@/components/SectionTeasers";
import Footer from "@/components/Footer";

// `ReleaseStrip` fetches the release list, so the home page is now revalidated rather than fully
// static. Keep in step with RELEASE_REVALIDATE_SECONDS in lib/release.ts.
export const revalidate = 600;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Cross Platform Terminal (CPT)",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Linux, Windows",
  processorRequirements: "x86-64",
  softwareRequirements:
    "Linux with glibc 2.39 or newer (Ubuntu 24.04+, Debian 13+, Fedora 43+, Arch), or Windows 10 / 11 / Server 2025. No installer required.",
  description:
    "A GPU-accelerated terminal emulator and dockable developer workspace that behaves identically on Linux and Windows: one set of keybindings on every platform, shells that keep running in a background daemon after the app is closed, and built-in recognition of eight AI agent CLIs including Claude Code, GitHub Copilot, Codex CLI and Gemini CLI.",
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
    "Identical keybindings on Linux and Windows, all rebindable",
    "GPU-accelerated terminal rendering",
    "Full VT/PTY support with tabbed sessions",
    "Detachable shells that survive closing the app, hosted in a background session daemon",
    "Dockable panels and widgets, with pinnable pane sizes",
    "Edge rails: auto-hiding docks on the left, right and bottom edges",
    "AI Workflow Pipeline with Claude Code and GitHub Copilot",
    "AI agent state detection: working, waiting for input, finished or failed",
    "AI inventory of the skills, agents, commands, hooks and MCP servers in the current repository",
    "Dark and light themes",
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
        <Platforms />
        <Features />
        <Agents />
        <ReleaseStrip />
        <SectionTeasers />
      </main>
      <Footer />
    </>
  );
}
