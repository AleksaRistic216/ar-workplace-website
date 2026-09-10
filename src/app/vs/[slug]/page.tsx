import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Comparison from "@/components/Comparison";
import { COMPETITORS, competitorBySlug } from "@/lib/competitors";

type Props = { params: Promise<{ slug: string }> };

// The set is a hand-written list in lib/competitors.ts, so every page can be built ahead of time
// and anything else is a 404 rather than an on-demand render of a competitor we have not checked.
export function generateStaticParams() {
  return COMPETITORS.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = competitorBySlug(slug);
  if (!c) return {};

  const title = `CPT vs ${c.name}`;
  const description = `An honest comparison of Cross Platform Terminal and ${c.name}: platforms, price, rendering, session persistence and AI agent support — including where ${c.name} is the better choice.`;

  return {
    title,
    description,
    alternates: { canonical: `/vs/${c.slug}` },
    openGraph: { title: `${title} — an honest comparison`, description },
  };
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = await params;
  const competitor = competitorBySlug(slug);
  if (!competitor) notFound();

  return (
    <>
      <Navbar />
      {/* pt-14 reserves the fixed header's height; the section supplies its own breathing room. */}
      <main className="pt-14">
        <Comparison competitor={competitor} />
      </main>
      <Footer />
    </>
  );
}
