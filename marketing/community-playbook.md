# Community playbook

The rules for posting anywhere you do not own. `scripts/mention-watch.mjs` finds the threads; this
is what happens next.

## The one rule

**A person posts. Always.** No script in this repo has a code path that writes to Reddit, HN, a
forum or a comment box, and none should be added. The watcher reads public search APIs and writes a
file. That is the whole design, and it is the design because the alternative — automated comment
posting — gets `crossplatformterminal.com` onto spam blocklists, which retroactively kills the
organic mentions and the SEO work as well.

## Before you type

1. **Read the whole thread.** Including the replies. Half the time someone has already given the
   right answer and the correct move is to upvote it and close the tab.
2. **Decide whether CPT belongs here at all.** If the honest answer to their question is tmux, or
   WSL, or "your prompt is shelling out to git on every keystroke", that is the answer. Give it and
   stop.
3. **Check the free-tier trap.** If they asked for something free, CPT is not a reply. Skip.

## When you do post

- **Disclose in the first line.** "I build CPT, so take this with salt —". Every time, no
  exceptions. Required by Reddit and HN, and it reads better than being found out.
- **Answer the question first.** The recommendation, if any, goes at the end.
- **One account.** Never a second one to agree with the first, never a friend asked to chime in.
  This specific move is what turns a marketing account into a domain-level ban.
- **No link in the first sentence.** Often no link at all — people can search a product name.
- **Recommend the competitor when the competitor is right.** This is what buys credibility, and it
  is the whole reason the account is worth having.

## Ratios and rate

- Roughly **1 CPT mention per 5 unrelated helpful comments** in a given community.
- About **15 minutes a day**. The limiting factor is judgment, not volume, and a rushed reply in a
  thread you skimmed is worse than no reply.
- If a community's rules forbid self-promotion, they forbid it. Read the sidebar.

## Where

| Venue | Notes |
|---|---|
| r/commandline | The core audience. Small, knowledgeable, allergic to marketing. |
| r/programming | Big, hostile to promotion. Only worth it for a genuinely good technical post. |
| r/AI_Agents | Best fit for the per-pane agent status story. |
| r/bash, r/linux | Answer questions; do not pitch. |
| Hacker News | Comments any time; a Show HN is a one-shot — see `launch-checklist.md`. |
| Lobsters | Invite-only, and it punishes self-promotion harder than HN. Do not post CPT there unless someone else already did. |
| GitHub issues on competitor repos | Only where a factual answer helps (e.g. someone asking about Windows support). Never a pitch. |

## When it goes badly

It will, at least once. Someone will call the crypto-only subscription a scam or the closed source
a joke.

- Answer the strongest version of their objection, once, using `objections.md`.
- Do not reply twice to the same person in the same thread.
- Never argue about the price. "That's fair, it's not for everyone" ends it.
- Delete nothing. An edited-away argument is a screenshot with extra steps.

## What is never OK

- A second account. Ever, for any reason.
- Voting rings, asking friends to upvote, or posting a link in a group chat with "upvote this".
- Editing a comment after it has replies to change what it said.
- Claiming a feature CPT does not have, or a benchmark that has not been run.
- Any tool that posts on your behalf.
