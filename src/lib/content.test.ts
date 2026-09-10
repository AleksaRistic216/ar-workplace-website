import assert from "node:assert/strict";
import test from "node:test";

import { COMPARISON_ROWS, COMPETITORS, competitorBySlug } from "./competitors.ts";
import { GUIDES, guideBySlug, type Block } from "./guides.ts";

/*
 * Guards on the marketing content, not on its prose.
 *
 * These pages are generated from two arrays, so the failures worth catching are structural: a
 * comparison with no sources behind its claims, a competitor whose strengths section is empty
 * (which is how a comparison page quietly turns into an advert), a guide linking to a related
 * page that does not exist, and slugs that would collide in the route. Run with `npm test`.
 */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INLINE_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

test("competitor slugs are unique and URL-safe", () => {
  const slugs = COMPETITORS.map((c) => c.slug);
  assert.equal(new Set(slugs).size, slugs.length, "duplicate competitor slug");
  for (const slug of slugs) assert.match(slug, SLUG);
  for (const slug of slugs) assert.ok(competitorBySlug(slug), `${slug} is not resolvable`);
});

test("every comparison concedes where the competitor wins, and cites its sources", () => {
  for (const c of COMPETITORS) {
    // The concession is the point of these pages: a reader who already uses the competitor stops
    // reading the moment the page pretends it has no advantages.
    assert.ok(c.wins.length >= 2, `${c.slug} lists fewer than two competitor strengths`);
    assert.ok(c.cptWins.length >= 2, `${c.slug} lists fewer than two CPT strengths`);
    assert.ok(c.sources.length >= 1, `${c.slug} cites no source`);
    for (const s of c.sources) {
      assert.match(s.url, /^https:\/\//, `${c.slug} source ${s.label} is not an https URL`);
    }
    assert.match(c.verifiedOn, /^\d{4}-\d{2}-\d{2}$/, `${c.slug} has no verification date`);
    assert.ok(
      !Number.isNaN(new Date(`${c.verifiedOn}T00:00:00Z`).getTime()),
      `${c.slug} verifiedOn is not a real date`
    );
  }
});

test("every comparison table row has a value for every competitor", () => {
  for (const c of COMPETITORS) {
    for (const row of COMPARISON_ROWS) {
      assert.ok(row.of(c).trim().length > 0, `${c.slug} has an empty "${row.label}" cell`);
      assert.ok(row.cpt.trim().length > 0, `CPT has an empty "${row.label}" cell`);
    }
  }
});

test("guide slugs are unique and URL-safe", () => {
  const slugs = GUIDES.map((g) => g.slug);
  assert.equal(new Set(slugs).size, slugs.length, "duplicate guide slug");
  for (const slug of slugs) assert.match(slug, SLUG);
});

test("guides only relate to guides that exist, and never to themselves", () => {
  for (const g of GUIDES) {
    for (const slug of g.related) {
      assert.ok(guideBySlug(slug), `${g.slug} relates to missing guide ${slug}`);
      assert.notEqual(slug, g.slug, `${g.slug} relates to itself`);
    }
  }
});

/** Every `[label](href)` in a block's prose, wherever prose can appear. */
function linksIn(block: Block): string[] {
  const text =
    block.kind === "list" || block.kind === "steps"
      ? block.items.join(" ")
      : block.kind === "code"
        ? ""
        : block.text;
  return [...text.matchAll(INLINE_LINK)].map((m) => m[2]);
}

test("internal links in guides point at pages that exist", () => {
  // Relative hrefs are written by hand in prose, so a typo here is a 404 that nothing else catches.
  const routes = new Set([
    "/",
    "/download",
    "/pricing",
    "/faq",
    "/changelog",
    "/cross-platform",
    "/vs",
    "/guides",
    ...COMPETITORS.map((c) => `/vs/${c.slug}`),
    ...GUIDES.map((g) => `/guides/${g.slug}`),
  ]);

  for (const g of GUIDES) {
    for (const block of g.blocks) {
      for (const href of linksIn(block)) {
        if (!href.startsWith("/")) {
          assert.match(href, /^https:\/\//, `${g.slug} links to a non-https external ${href}`);
          continue;
        }
        assert.ok(routes.has(href), `${g.slug} links to missing route ${href}`);
      }
    }
  }
});

test("guides carry enough body to be worth indexing", () => {
  for (const g of GUIDES) {
    assert.ok(g.blocks.length >= 6, `${g.slug} is too thin`);
    assert.ok(
      g.blocks.some((b) => b.kind === "h2"),
      `${g.slug} has no sections`
    );
    assert.ok(g.description.length <= 160, `${g.slug} meta description is over 160 characters`);
  }
});
