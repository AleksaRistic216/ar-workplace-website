import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.crossplatformterminal.com";

/*
 * Everything is allowed, including the AI crawlers — and they are named explicitly rather than
 * left to the `*` rule.
 *
 * Why bother, when `*` already allows them: several of these agents are documented as looking for
 * their own token first, and some tooling (and some buyers) reads a robots file to find out
 * whether a site *intends* to be used by an assistant. An explicit allow is a statement of
 * intent; inheriting `*` is an accident that could be reversed by someone tightening the
 * wildcard later without realising what they were switching off.
 *
 * The list is deliberately split by what each agent does, because the day one of them needs
 * different treatment, the reason has to be visible:
 *
 *   - **Training** crawlers build model corpora (GPTBot, ClaudeBot, CCBot, Google-Extended,
 *     Applebot-Extended, meta-externalagent, Bytespider, Omgili, Diffbot, Timpibot, Webzio).
 *   - **Answer-time** fetchers retrieve a page because a user asked something right now
 *     (OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot, PerplexityBot,
 *     Perplexity-User, Amazonbot, Applebot, Bingbot, DuckAssistBot, cohere-ai, YouBot).
 *
 * Both are wanted here. The product is bought by developers who ask assistants what terminal to
 * use, so being quotable is the point — see `public/llms.txt`, which is the summary written for
 * exactly that audience.
 */
const AI_CRAWLERS = [
  // Training / corpus
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "FacebookBot",
  "Bytespider",
  "Diffbot",
  "Omgilibot",
  "Timpibot",
  "Webzio-Extended",
  "AI2Bot",
  // Answer-time retrieval
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "DuckAssistBot",
  "Amazonbot",
  "Applebot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "YouBot",
  "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing here renders anything worth indexing: they are POST endpoints for the
        // checkout and the payment webhook, and a crawler hitting them only wastes budget.
        disallow: "/api/",
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: "/api/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
