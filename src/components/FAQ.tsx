import OpenHashDetails from "@/components/OpenHashDetails";

/*
 * Every answer here is sourced from what the code actually does — the licence grant in
 * `lib/client-api.ts`, the provisioning path in `lib/provision.ts`, and the emails in `lib/email.ts`.
 * If one of those changes, this changes with it. Do not add an answer the backend cannot back up.
 */

/*
 * `id` is the anchor an answer can be linked to — `/#faq-updates` from the asterisk on every
 * "future updates included" claim, say. Renaming one breaks whatever points at it, so treat these
 * as part of the public URL surface rather than as a slug of the question.
 */
const faqs = [
  {
    id: "subscription",
    q: "Is this a subscription?",
    a: "Yes. €7.49 a month, or €67.41 a year — 25% less, and one crypto payment instead of twelve. It is prepaid rather than recurring: nothing is stored to charge you again, so each period is one you choose to buy. There is a 3-day cushion past the end of a period so a renewal still confirming cannot lock you out.",
  },
  {
    id: "updates",
    q: "Which updates are included?",
    a: "All of them, for as long as you are subscribed — patches, new features and future major versions alike, at no extra cost. There is no upgrade to buy and no version to be left behind on.",
  },
  {
    id: "trial",
    q: "Can I try it before buying?",
    a: "No. There is no trial and no free tier — CPT needs a subscription from the first launch. One month at €7.49 is the smallest commitment there is: if it is not for you, do nothing and it ends.",
  },
  {
    id: "cancel",
    q: "How do I cancel?",
    a: "You don't — there is nothing to cancel. Nothing is stored that could charge you again, so a subscription ends by you not renewing it. When the period runs out the app stops opening; your account and settings stay where they are if you come back later.",
  },
  {
    id: "renewing",
    q: "How does renewing work?",
    a: "We email you 7 days, 3 days and 1 day before your period ends, with a link back here. Paying again adds the new period on to the end of the current one, so renewing early never costs you the time you have already paid for. Crypto cannot be auto-charged, so renewing is always something you do deliberately.",
  },
  {
    id: "lifetime",
    q: "I bought the €24 lifetime licence. What happens to it?",
    a: "Nothing. It never expires and we are not converting it to a subscription — it keeps working exactly as it did, updates included. The checkout recognises those accounts and refuses to sell them a subscription they do not need.",
  },
  {
    id: "after-payment",
    q: "What happens after I pay?",
    a: "We create your account and email your sign-in details to the address you paid with, along with the date your subscription runs to. Open the app and sign in when it asks. If you already have a Limitless Soft account, the subscription is added to it and you keep the password you already use.",
  },
  {
    id: "machines",
    q: "Can I use it on more than one machine?",
    a: "The subscription covers your account. To move to another machine, release the current device from the licence dialog in the app and sign in on the new one.",
  },
  {
    id: "payment",
    q: "How do I pay?",
    a: "Crypto, through NOWPayments. That is the only payment method today. Cards are not supported yet.",
  },
  {
    id: "install",
    q: "Do I need to install anything?",
    a: "No installer. Extract the archive and run it — Linux ships as an AppImage and a tar.gz, Windows as a plain ZIP, with no admin rights and no system-wide changes. You do need a licence: the app asks you to sign in the first time you open it.",
  },
  {
    id: "macos",
    q: "Is there a macOS build?",
    a: "Not yet. macOS is in progress; the download page will list it as soon as there is a build to ship.",
  },
  {
    id: "refunds",
    q: "Do you offer refunds?",
    a: "No — all sales are final, including part-used periods. Crypto payments cannot be reversed once they confirm, so there is no mechanism to send one back. Since there is no trial either, ask anything you need to know before you buy: open an issue on the release repository and you will get an answer. A single month is the cheapest way to find out.",
  },
  {
    id: "password",
    q: "I lost my password.",
    a: "Reply to the email your sign-in details came in and we will sort it out. You can also manage the account from the customer portal.",
  },
  {
    id: "bug",
    q: "I found a bug.",
    a: "Report it from inside the app: Report a Bug collects your description, the environment and the recent log tail, shows you the exact text first, and files the issue for you if you have the GitHub CLI signed in. If you do not, it copies the diagnostics for you to paste into an issue yourself. Reported bugs are fixed and shipped within a day.",
  },
  {
    id: "uninstall",
    q: "How do I remove it?",
    a: "Settings → Uninstall… removes it in one dialog, and an uninstall.sh ships alongside the Linux build for when the app is gone or you would rather use a shell. Both clear the same things — the binary, the desktop entry and the icon — and both offer to keep your settings and stay signed in. Everything lives in your home directory, so no admin rights and no package manager are involved either way.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function FAQ() {
  return (
    <section id="faq" className="py-24 px-6">
      <OpenHashDetails />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-accent)" }}
          >
            FAQ
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            The things people ask before buying
          </h1>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
          {faqs.map(({ id, q, a }) => (
            <details
              key={q}
              id={`faq-${id}`}
              className="group border-b last:border-b-0"
              style={{ borderColor: "var(--color-border)" }}
            >
              <summary
                className="cursor-pointer list-none flex items-center justify-between gap-4 px-5 py-4 text-sm font-medium cpt-quiet"
                style={{ color: "var(--color-foreground)" }}
              >
                {q}
                <svg
                  className="w-4 h-4 shrink-0 transition-transform group-open:rotate-45"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "var(--color-accent)" }}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="px-5 pb-4 -mt-1 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
