# Speed Riddlemaster — Product Requirements Document

**Version:** 1.0 (draft) · **Date:** 2026-11-06 · **Owner:** Danyal

---

## 1. Overview

**Speed Riddlemaster** is a browser-based riddle game with a neo-Sherlock-Holmes, Disco-Elysium-flavoured look and a warm, funny, gamified tone. The player is a detective handed a **case file of 10 riddles**. Each riddle must be answered in **20 seconds**. A wrong or late answer costs one of **3 lives**. Survive all 10 and you've **solved the case**; lose all 3 and you've **been found, Detective**.

### One-line pitch
*"Ten riddles. Twenty seconds each. Three lives. One very smug detective (you)."*

### Goals
1. Deliver a fast, replayable, 3–5 minute game loop that is instantly understood.
2. Make players **smile and laugh**: praise, failure and resurrection are all written to be funny and kind, never punishing.
3. Look distinctive: moody, painterly, noir-detective atmosphere with a playful voice.
4. Keep riddles fresh: curated from existing riddles that are known but not the "everyone has heard it" tier, so they aren't trivially guessable.
5. Be forgiving on spelling so the game tests wit, not typing.

### Non-goals (v1)
- Accounts, logins, online multiplayer, or a backend.
- Multi-word or sentence answers (all answers are a single word).
- User-submitted riddles.
- Monetisation or ads.

---

## 2. Target Audience

- Casual players aged ~12+, on desktop or mobile browsers, who enjoy quick brain-teasers, trivia and party-game energy.
- Friends sharing scores or playing in a group, passing the device or racing for a better rank.
- No riddle expertise needed: tone is friendly and gamified.

---

## 3. Core Game Loop

```
Title screen → "Open the case" → [Riddle 1…10] → Case result
                                     │
                       ┌─────────────┴──────────────┐
                    Correct                    Wrong / Timeout
              (praise, points)            (lose a life, reveal answer)
                       │                            │
                       │                  lives left > 0 ?
                       │                  ├─ yes → "Resurrected" beat
                       │                  └─ no  → "You've been found, Detective"
                       ▼
                 next riddle (or "Case solved!" after #10)
```

### Rules
| Rule | Spec |
|---|---|
| Riddles per game | **10**, randomly drawn from the bank, no repeats within a game |
| Time per riddle | **20 seconds**, visible countdown |
| Lives | **3** |
| Lose a life | Wrong answer **or** timer expires |
| Wrong answer | The riddle is spent: the correct answer is revealed with a quip and the game moves on |
| Win | Complete all 10 riddles with at least 1 life remaining → **"Case Solved!"** |
| Lose | Lives reach 0 → **"You've been found, Detective."** |
| Answer format | **One word only** |

> **Interpretation note:** each time a life is lost the player is "killed" and **resurrected** (see §6). Only losing the *last* life ends the game.

---

## 4. Functional Requirements

### 4.1 Riddle selection ("randomly generated")
- **FR-1** Each game draws 10 unique riddles at random from a curated bank of **at least 100 riddles** (launch target; minimum viable launch: 60).
- **FR-2** Bank content is existing riddles (folk, classic and lesser-known literary riddles), rewritten lightly where needed for clarity and one-word answers. We avoid the "top 10 riddles everybody knows" (e.g. "What has keys but can't open locks?", "What has a face and two hands?") so they aren't easy to guess.
- **FR-3** Every riddle has: `id`, `text`, `answer` (canonical), `accepted[]` (synonyms/variants), `reject[]` (near-miss traps, see FR-12), `difficulty` (1–3), `funFactOrQuip` (shown on reveal).
- **FR-4** Difficulty mix per game is balanced (e.g. 3 easy, 4 medium, 3 hard) and ordered roughly easy → hard so the player has a warm-up and a climax.
- **FR-5** *(Optional, post-launch)* LLM-assisted generation of new riddles, always human-reviewed before entering the bank. Never generated live at play time.

### 4.2 Timer
- **FR-6** 20-second countdown per riddle, shown as a numeric display plus a visual drain (e.g. burning fuse / candle / pocket-watch sweep).
- **FR-7** Visual and audio urgency in the last 5 seconds (colour shift, pulse, ticking).
- **FR-8** Timer pauses during feedback/transition screens and resets at the start of each riddle. Timer starts only once the riddle text is fully visible.
- **FR-9** Timer expiry counts as a wrong answer.

### 4.3 Answer input and forgiving matching
- **FR-10** Single text field, auto-focused, submit on Enter or button. One word only: if the player types several words, strip filler ("a", "an", "the", "it's", "its a") and match any remaining single token; otherwise gently nudge: *"One word, Detective. We're on a budget."* (nudge does **not** cost a life or reset the timer).
- **FR-11** **Normalisation:** lower-case, trim, strip punctuation/accents, collapse repeated letters where sensible (e.g. "tooowel").
- **FR-12** **Reasonable-misspelling tolerance** using edit distance scaled by word length:

  | Answer length | Allowed typos |
  |---|---|
  | 1–3 letters | 0 (exact) |
  | 4–6 letters | 1 edit (insert/delete/substitute/transposition) |
  | 7+ letters | 2 edits |

  Safeguards: matching also accepts plural/singular forms and the riddle's `accepted[]` list. The `reject[]` list blocks a typo from landing on a *different real word* (e.g. riddle answer "cold" must not accept "gold"/"cord").
- **FR-13** When a misspelling is accepted, show a light touch: *"Close enough, Detective — we'll forgive the handwriting."* The canonical spelling is displayed.
- **FR-14** Matching logic is a pure, unit-tested function so it can be tuned independently of the UI.

### 4.4 Lives
- **FR-15** Lives shown persistently as 3 icons (e.g. magnifying glasses, hats or hearts-with-a-pipe). Losing one plays a short animation.
- **FR-16** Lives do not regenerate within a game.

### 4.5 Scoring and gamification
- **FR-17** Points per correct answer: base **100** + time bonus (up to **+100**, proportional to seconds remaining) + streak bonus (+10 per consecutive correct, capped at +50).
- **FR-18** End-of-game **Detective Rank** from score and lives remaining, e.g.: *Lost Umbrella Carrier → Pavement Pounder → Junior Gumshoe → Inspector → Chief Inspector → Riddlemaster*.
- **FR-19** Local **personal best** and games played saved in `localStorage`.
- **FR-20** **Shareable result card**: emoji-grid summary (e.g. `🔍🔍💀🔍🔍🔍💀🔍🔍🔍`) + rank, copyable to clipboard (Wordle-style).
- **FR-21** Optional "Case number" daily seed (post-launch) so friends can compare the same 10 riddles.

### 4.6 Screens
1. **Title:** logo, tagline, *Open the Case* button, how-to-play, sound toggle, personal best.
2. **Briefing (3-second intro, skippable):** rules in the narrator's voice.
3. **Riddle screen:** riddle text, timer, lives, progress (e.g. "Riddle 4 / 10"), score, answer field.
4. **Correct feedback:** praise line, points breakdown, brief animation.
5. **Wrong/timeout feedback:** playful "not quite" line, answer reveal + quip, life lost.
6. **Resurrection interstitial** (every life lost, game continues).
7. **"You've been found, Detective" end screen:** score, riddles solved, retry.
8. **"Case Solved!" victory screen:** rank, score, share card, play again.

---

## 5. Tone, Voice and Copy

The narrator is a dry, affectionate, slightly dramatic detective-inner-voice (Disco Elysium-style "skills" chiming in: *Logic*, *Inland Empire*, *Authority*, *Half-Light*). Rule: **laugh with the player, never at them.** Failure is comedic, not shaming.

### Praise on correct answers (rotating pool, ≥15 at launch)
- "Good work, Detective. The case bends to your will."
- "Elementary! (I'll deny I said that.)"
- "Brilliant. Somewhere, a magnifying glass is blushing."
- "LOGIC: *Obviously.* INLAND EMPIRE: *…the wardrobe agrees.*"
- "That's the sound of a mystery being solved. Also, applause."
- Fast answers (<5 s) get extra: "Quick as a pickpocket in a rainstorm!"
- Streak ≥3: "You're on a roll — the Yard is taking notes."

### Wrong / timeout (≥15 at launch)
- "Not quite. The trail goes cold, Detective."
- "Time's up. The culprit slips out the back door."
- "AUTHORITY: *Pull yourself together.* HALF-LIGHT: *It was the butler. It's always the butler.*"

### Resurrection (≥8 at launch, shown each time a life is lost)
- "You have died. Briefly. A passing stranger has kindly put you back together."
- "Resurrected! Your hat, regrettably, did not make it."
- "Death attempted. Death was unimpressed. Back to work."

### "You've been found, Detective" (≥5)
- "You've been found, Detective. The case remains unsolved — the fog, however, is delighted."
- Always paired with a friendly *Try again* button and a hint of encouragement ("The culprit is still out there. So is your pride.").

### "Case Solved!" (≥5)
- "CASE SOLVED! The city sleeps safely tonight. Please accept this imaginary medal."

---

## 6. Visual and Audio Design

### Art direction
- **Mood:** neo-Victorian noir: gas-lit fog, rain on cobbles, cluttered desks, case-file paper; painterly with visible brush texture, grain and soft vignettes (Disco-Elysium-inspired, **original assets only, no copied artwork**).
- **Palette:** deep indigo/teal shadows, nicotine-ochre and burnt-orange accents, parchment cream for text panels, a single blood-red accent for danger (timer, lost life).
- **Typography:** a characterful serif or slab for headings (typewriter / Victorian display feel), highly readable serif or sans for body and riddles. Large riddle text, high contrast.
- **UI metaphors:** riddles on case-file cards, answer field as a typed notepad line, timer as a burning candle or pocket-watch, lives as three detective hats or magnifying glasses, rank shown as a badge or warrant card.
- **Motion:** gentle parallax fog, ink-stamp animations ("SOLVED" / "UNSOLVED" stamps), card slide-ins. Respect `prefers-reduced-motion`.

### Audio (optional toggle, default muted until first interaction)
- Looping low-volume jazzy/noir ambience; typewriter keys, ticking clock in the last 5 s, stamp thud, brass sting for win, comedic trombone-ish "wah" for lose, harp-glissando for resurrection.
- All audio royalty-free or original.

---

## 7. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Platforms | Latest 2 versions of Chrome, Safari, Firefox, Edge; iOS/Android mobile browsers |
| Responsive | Fully playable from 360 px wide up; on-screen keyboard must not hide the riddle or timer |
| Performance | First load < 3 s on 4G; main bundle < 1 MB excl. audio; 60 fps animations |
| Accessibility | WCAG 2.1 AA contrast; full keyboard play; screen-reader labels and `aria-live` for timer milestones/feedback; reduced-motion mode; colour is never the only signal; optional "relaxed mode" with 30 s timer (post-launch) |
| Reliability | Fully client-side; works offline after first load (PWA is a nice-to-have) |
| Privacy | No personal data collected; only `localStorage` for personal best. Any analytics must be anonymous and opt-out-friendly |
| Fairness | Timer is client-side, but this is a casual game with no stakes, so anti-cheat is out of scope |
| Localisation | English (UK spelling accepted alongside US) at launch |

### Suggested technical approach
- Static single-page web app (e.g. React/Vite or plain TypeScript + CSS) hosted on any static host.
- Riddle bank as a versioned JSON file bundled with the app; answer-matching module as an isolated, unit-tested pure function.
- State machine for game flow (`title → briefing → riddle → feedback → resurrection → result`).

---

## 8. Sample Riddle Bank (illustrative, launch bank to be built from this style)

| # | Riddle | Answer | Also accept | Notes |
|---|---|---|---|---|
| 1 | I have cities, but no houses; mountains, but no trees; water, but no fish. What am I? | map | atlas | Easy |
| 2 | What can travel around the world while staying in a corner? | stamp | | Medium |
| 3 | What gets wetter the more it dries? | towel | | Easy |
| 4 | What belongs to you, but is used more by others? | name | | Medium |
| 5 | What has a neck but no head? | bottle | | Easy |
| 6 | What can you catch, but never throw? | cold | | Easy · reject: gold, cord, bold |
| 7 | What has one eye, but cannot see? | needle | | Easy |
| 8 | The one who makes it sells it. The one who buys it never uses it. The one who uses it never knows. What is it? | coffin | casket | Hard (very noir) |
| 9 | What has a heart that doesn't beat? | artichoke | | Hard |
| 10 | What is full of holes, but still holds water? | sponge | | Medium |
| 11 | What disappears the moment you say its name? | silence | | Medium |
| 12 | What can you break without ever touching it? | promise | vow | Medium |
| 13 | Forward I am heavy; backward I am not. What am I? | ton | | Hard · exact match (3 letters) |
| 14 | What word becomes shorter when you add two letters to it? | short | | Hard |
| 15 | I shave every day, yet my beard stays just as long. What am I? | barber | | Medium |
| 16 | The more of me you take, the more you leave behind. What am I? | footsteps | steps, footstep | Medium |
| 17 | I'm not alive, but I grow; I have no lungs, but I need air; I have no mouth, but water kills me. What am I? | fire | flame | Medium |
| 18 | What has a thumb and four fingers, but is not alive? | glove | mitten | Easy |
| 19 | What begins with T, ends with T, and is full of T? | teapot | | Medium |
| 20 | What is always in front of you but can't be seen? | future | | Medium |
| 21 | What runs but never walks, and has a mouth but never talks? | river | | Easy |
| 22 | What has teeth, but cannot bite? | comb | | Easy |
| 23 | The more there is of me, the less you see. What am I? | darkness | dark, fog | Medium (fog is a thematic bonus) |
| 24 | What is cut on a table, but never eaten? | cards | deck | Hard |

*(Content note: riddles are existing folk/classic riddles used as inspiration. Before public release, riddles should be checked for attribution/licensing; most are traditional and public-domain, but wording drawn from specific books or sites should be rewritten.)*

---

## 9. Success Metrics

| Metric | Target (first 30 days after launch) |
|---|---|
| Game start → completion (win or lose) | ≥ 80 % |
| Replay rate (players who start a 2nd game in the same session) | ≥ 40 % |
| Average session length | 4–8 min |
| Win rate (solve the case) | 25–40 % (hard enough to matter, friendly enough to retry) |
| Share-card taps | ≥ 10 % of finished games |
| Qualitative: "made me laugh" in playtest feedback | ≥ 8 of 10 testers |
| Misspelling complaints ("my answer was right but rejected") | < 2 % of wrong answers |

---

## 10. Milestones

| Phase | Deliverables |
|---|---|
| **0 · Design** (this PRD) | PRD sign-off, moodboard, copy pool draft, riddle bank first 60 |
| **1 · Prototype** | Playable loop: 10 riddles, timer, lives, matching, placeholder art |
| **2 · Vertical slice** | Final art direction, animations, praise/death/resurrection copy, audio |
| **3 · Beta** | Full 100-riddle bank, accessibility pass, playtests (target: 10 people), tune matching and difficulty |
| **4 · Launch** | Hosting, share card, personal best, polish |
| **5 · Post-launch** | Daily case, relaxed mode, hint "magnifying glass" power-up, achievements, riddle packs |

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Fuzzy matching accepts wrong words (cold → gold) or rejects reasonable ones | Frustration | `reject[]` lists, unit tests with a typo corpus, playtest logging of rejected answers |
| 20 s is too tight on mobile (typing, keyboard open) | Unfair feel | Start timer after text is visible, auto-focus input, large touch targets, consider relaxed mode |
| Riddle answers are ambiguous (multiple valid single words) | Unfair losses | Generous `accepted[]` lists; review each riddle for alternative answers; post-launch feedback loop |
| Riddles are too well-known / too obscure | Boring or unwinnable | Difficulty tiers, avoid top-tier famous riddles, playtest solve-rates per riddle |
| Disco-Elysium-style visuals imply borrowing | IP risk | Use original art and wording; take inspiration from mood and structure only |
| Tone misses (feels mean or cringe) | Poor reception | Playtest copy; keep failure copy self-deprecating about *the detective hat*, not the player |
| Riddle licensing | Legal | Use traditional/public-domain riddles; rewrite anything lifted from copyrighted compilations |

---

## 12. Open Questions

1. **"You've been found, Detective"**: is the intended phrasing "found out" / "found *dead*", or exactly as written? (PRD uses it as written, with comedic framing.)
2. Should the **title screen include a hint/power-up system** in v1, or stay purely "answer or die"? (Current PRD: no hints in v1.)
3. Preferred **tech stack and hosting** (static site vs. framework)? Any existing brand or domain?
4. Do we want a **daily case** in v1 or v1.1?
5. Should timer expiry and a wrong answer cost the *same* single life (current spec) or should timeouts be gentler?
6. Is **sound** in scope for launch, or visuals first?
7. Should the riddle bank be hand-curated only, or do we allow reviewed LLM-generated additions later?
