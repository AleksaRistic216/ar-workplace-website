# Objection scripts

Written once so they are not improvised at 11pm in a thread that is going badly.

Rules for all of them: concede the true part first, never argue the premise, never use the word
"actually". If a reply here does not fit the specific thread, the thread does not need a reply.

---

## "Why pay when Alacritty / kitty / Ghostty is free?"

> Fair question — if you use one OS and don't run AI CLIs all day, they're the better choice and
> I'd genuinely point you at Ghostty or kitty. CPT is for the case where part of your week is on
> Windows and part on Linux and you're tired of two sets of muscle memory, plus per-pane status for
> agent CLIs. If that's not your problem, it's not worth €7.49 to you.

**Never:** claim CPT is faster than Alacritty, or imply free software is somehow lesser. That
argument cannot be won and attempting it loses the thread.

---

## "Crypto only? That's sketchy."

> Understandable reaction. The honest version: crypto can't be auto-charged, so there's no stored
> card and nothing that renews on its own — every period is bought deliberately and a subscription
> ends by not being renewed. There's nothing to cancel and no dark pattern to escape from. The real
> downside is on my side too: no refunds, because the payments aren't reversible.

**Never:** oversell this as a feature. It is a constraint that happens to have one good property.
Someone who wants a card is a customer who cannot buy, and that is a real cost.

---

## "No trial? I'm not paying before I've used it."

The weakest point on the whole site. Do not get defensive.

> That's the fairest hit on it. What I can offer instead: the builds are public so you can see
> exactly what you'd be downloading, every release is dated at /changelog so you can see the pace,
> and reported bugs usually ship the same day. A trial is on my list.

**This is a product decision, not a copy decision.** It will dominate every launch thread until it
changes. See the open question in `distribution-plan.md`.

---

## "No macOS?"

> Not yet. Linux and Windows today; macOS is in progress and I'm not going to give a date I'm not
> sure of.

**Never:** say "soon" twice to the same person. Either give a date or say there isn't one.

---

## "This is just Warp / WezTerm / tmux with extra steps."

> Different bet, and Warp is genuinely further along on the AI side with a free tier. CPT doesn't
> want to be your agent — it runs the CLI you already picked (Claude Code, Copilot, Codex, Aider,
> and five more) and tells you which pane is working, which is blocked on you, and which failed.
> If you want the terminal itself to be the AI product, use Warp.

Full detail: [/vs/warp](https://www.crossplatformterminal.com/vs/warp).

---

## "Closed source? For a terminal?"

> Yes, and it's a fair thing to weigh — every alternative in this space is open source. What I'll
> say is that the release history is public and dated, the builds are downloadable without an
> account, and bugs are usually fixed the same day they're reported. That's the accountability I
> can offer; if open source is a hard requirement, kitty and WezTerm are excellent.

**Never:** argue that closed source is better. It is a trade, and this audience knows it.

---

## "Is my terminal sending my data anywhere?"

Answer precisely and do not hand-wave. Agent detection reads the local process tree and argv;
sessions are local to the machine and profile. If a specific question about telemetry comes up and
the answer is not certain, say "let me check and come back" and then actually do.

---

## "The site says X but the app does Y."

> That's a bug in the site and I'd rather fix it than argue it. Which page?

Then fix it. `/code-review`, `release-sync` and `scripts/vs-refresh.mjs` exist so this stays rare.
