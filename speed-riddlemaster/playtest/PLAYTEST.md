# Speed Riddlemaster — Human Playtest Kit

**Goal:** find out whether real people (1) understand it without help, (2) laugh, (3) feel the 20-second clock and the typo-forgiveness are *fair*, and (4) want to play again. This kit is ready to run; the game itself records the numbers.

> Nothing in this kit has been run with real people yet. `sample-data.SIMULATED.json` is made-up bot data used only to test the analysis script. Ignore it when judging the game.

---

## 1. Who and how many
- **8–10 players**, 1 game each (2 if they ask). Mix: at least 3 who "don't do puzzles", 2 on a phone, 2 who are fast typists, 1 non-native English speaker, 1 who is a bit competitive.
- Not people who already know the riddles in the bank (ask: "Do you collect riddles?").
- 10 minutes each: 1 min intro, ~5 min game, ~4 min chat.

## 2. Setup (facilitator)
1. Start the game: `node serve.js` and open **`http://localhost:5173/?playtest`** (or host the folder on any static host and add `?playtest`). For phones on the same Wi-Fi, use your computer's LAN address, e.g. `http://192.168.1.20:5173/?playtest`.
2. `?playtest` shows a small "Playtest mode" label, records every riddle (outcome, seconds used, every typed guess) and shows a ratings panel after each game. **Data stays in that browser only.**
3. Use a **fresh browser profile / private window per player**, or just let one browser collect everyone: each game has its own id.
4. Sound on, headphones or speakers audible. Tell them nothing else about it.
5. Screen-record or take notes with the observation sheet below.

## 3. Script (say this, then be quiet)
> "This is a game I'm making. I'm testing the game, not you. Play it like you would at home. Say what you're thinking out loud. I won't help unless you're completely stuck. Ready?"

Hand over the device on the **title screen**. Do **not** explain rules, the one-word format, the timer, or typo forgiveness.

If they ask a question, answer "What would you do if I wasn't here?" Only step in after ~20 s of real confusion, and note it.

## 4. Observation sheet (tick or jot per player)

| Moment | What to watch | ✓ / note |
|---|---|---|
| Title | Do they smile at the detective / tagline? Do they find "Open the case" without hints? | |
| Briefing | Do they read it or skip? Do they know about 1 word / 20 s / 3 lives afterwards? | |
| First riddle | Do they notice the clock? Panic or play? | |
| Typing | Any one-word confusion? Typed a sentence? Saw the "One word, Detective" nudge? | |
| Typo forgiven | Did they notice "close enough"? Reaction (delight / suspicion)? | |
| First correct | Does the praise land? Laugh, smile or ignore? Quote the line they liked | |
| First wrong | Annoyed or amused? Do they read the answer + quip? | |
| Resurrection | Laugh? Understand they lost a life? Is the screen skipped too fast? | |
| Last 5 s | Do the ticking + red clock add fun or stress? | |
| Rejected answer | Any "but that's right!" moment? **Write down the exact word and riddle.** | |
| Mobile | Keyboard covering riddle/clock? Timer feels unfair while typing? | |
| End screen | Win/lose reaction, rank badge, share button, "play again" intent | |
| Audio | Noticed the music? Too loud/quiet/annoying? Toggled it off? | |
| Overall | Total time, did they ask to play again unprompted? | |

## 5. After the game (ask out loud, 4 min)
1. In one sentence, what is this game?
2. What was the funniest or best moment? The worst?
3. Was there any riddle you thought was unfair, or an answer you felt should have counted?
4. Did the clock feel too fast, too slow, or just right? (On phone: while typing?)
5. Would you send this to a friend? What would you tell them?
6. What would make you play a second game?

Then have them tap the **1–5 rating panel** on the end screen and **Save notes**.

## 6. Collect the data
- On the end screen press **Copy all playtest data**. It copies every game recorded in that browser as JSON. (If clipboard is blocked: open the browser console and run `copy(localStorage.sr_playtest)`.)
- Paste each export into its own file, e.g. `playtest/session-1.json`.
- Run: `node playtest/analyze.js playtest/session-1.json playtest/session-2.json …`

The report gives: win rate, rating averages, per-riddle solve rate and speed, flagged riddles (too hard / too easy / slow), rejected guesses worth adding as accepted answers, forgiven-typo counts and PRD §9 pass/fail checks.

## 7. Decision guide

| Signal | If you see… | Do this |
|---|---|---|
| Win rate | < 25 % | Easier hard-tier riddles; maybe 25 s timer or 4 lives |
| | > 40 % | Swap in harder riddles; keep 20 s |
| "Made me laugh" | < 80 % rated 4–5 | Review copy lines players quoted as flat; add more skill-voice jokes |
| "20 s right" | mean < 3.5, esp. on phones | Start the clock after the keyboard opens, or add a relaxed 30 s mode |
| Riddle solve rate | < 30 % with ≥ 3 plays | Rewrite, add hint-friendly wording, or swap it out |
| | > 95 % with ≥ 5 plays | Probably too well known; replace |
| Rejected near-misses | same word typed by ≥ 2 players | Add to the riddle's `acc` list, then re-run `node tests/matcher.test.js` |
| Multi-word nudges | > 2 for a riddle | The riddle likely invites a phrase; reword or accept it |
| Players skip briefing and are confused | ≥ 3 of 10 | Shorten briefing or put the three numbers on the first riddle screen |
| Music toggled off by many | ≥ 3 of 10 | Lower volume / vary the loop / ask what annoyed them |

## 8. Privacy and consent
Collect no names, emails or contact details. Recorded data: riddle ids, outcomes, seconds, the words typed into the answer box, the 1–5 ratings, free-text notes, viewport size and whether the device is touch. Tell players that up front and that they can stop any time. Delete the exports after analysis.

## 9. Riddle review checklist (do this alongside the playtest)
For each riddle flagged by the report:
- Is there another valid one-word answer? Add it to `acc`.
- Is a near-miss real word being forgiven wrongly? Add it to `rej`.
- Is the wording ambiguous, or is the answer too obscure for the stated difficulty?
- Is the riddle traditional/public-domain (no copied wording from a book or site)?
