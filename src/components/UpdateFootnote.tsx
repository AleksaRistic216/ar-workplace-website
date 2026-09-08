import HashLink from "@/components/HashLink";

/*
 * The asterisk that qualifies every "updates included" claim on the site. It lands on the FAQ
 * answer that scopes the promise — everything, for as long as the subscription is live — so the
 * claim is never made without the condition one click away.
 */
export default function UpdateFootnote() {
  return (
    <HashLink
      href="/faq#faq-updates"
      label="Which updates are included?"
      className="align-super text-[0.85em] font-semibold cpt-quiet"
      style={{ color: "var(--color-accent)" }}
    >
      *
    </HashLink>
  );
}
