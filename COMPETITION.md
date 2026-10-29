# Meta VR Start Developer Competition 2026: the rules that matter

Read on 2026-10-20 from the Devpost pages (fetched with `curl -sL -A "Mozilla/5.0"`):

| Source | URL |
|---|---|
| Official Rules (binding) | https://start-developer-competition-26.devpost.com/rules |
| Overview | https://start-developer-competition-26.devpost.com/ |
| Judging | https://start-developer-competition-26.devpost.com/details/judging |
| FAQs | https://start-developer-competition-26.devpost.com/details/faqs |
| Special Awards | https://start-developer-competition-26.devpost.com/details/special-awards |
| Resources | https://start-developer-competition-26.devpost.com/resources |

"§" means a section of the Official Rules. The rules win over any other page (§4: "these Official Rules shall control"). Check the live rules again before submitting.

## Dates (header table)

| Event | When |
|---|---|
| Entry period | 2026-09-24 10:00 PT to **2026-11-18 12:00 PT** |
| Judging | about 2026-11-18 to about 2026-12-09 |
| Winner announcement | about 2026-12-11 |

## Eligibility essentials (§2)

- 18+ and the age of majority where you live.
- Not a resident of Brazil, Quebec, or a comprehensively sanctioned area (Crimea, Russia, Cuba, Iran, North Korea, Syria, OFAC lists).
- "an active and valid Meta account with Developer Access enabled" by the time you submit.
- The submitter "must be a member of the Meta VR Start Program by the time of submission". FAQ: joining after 2026-09-24 is fine.
- No direct Meta funding for the project (§4 "Meta Funding"; FAQ: RFP-funded apps are out).
- No headset is required to enter (FAQ), but judges play on Quest 3 / 3S.

## One entry per person (§2 "Entry Limit")

- "Each individual is limited to submitting one (1) Entry in this Contest."
- You may not both "submit an Entry as a solo entrant and serve as a Team Representative".
- Being a non-Representative team member does not count as an entry.
- One prize per entry (§7); if eligible for several, the highest value (FAQ).
- **For this repo:** the owner's single entry is **Soothing Bots** (native Unity app, App ID 1091303100363781, Competition channel; decided 2026-10-29). Spatial Lab is NOT submitted: submitting it would break the one-entry rule.

## Tracks (§4 "Track")

| Track | Rules text (short) |
|---|---|
| Entertainment | "Lean-back media and content experiences" (spatial cinema, interactive video, music visualization, storytelling). Hands-first required. |
| Gaming | "Games designed for hands-first (required) or eyes and hands. Puzzle, strategy, casual, social, narrative—genres that thrive seated, without controllers." |
| Productivity | "Apps that make you more effective anywhere or are designed around specific daily moments—multi-panel workspaces, task management, creative tools, or habits tied to a recurring context (morning routine, commute, wind-down). Hands-first implementation required." |

- "At any time, and at its sole discretion, the Sponsor will have the ability to re-assign a submitted Entry from one Track to another." (§4)
- Track and division can be changed on Devpost until the deadline (FAQ).

**Recommendation for Spatial Lab: Productivity.** Gaming only if it is built as a puzzle game.

| Reason | Detail |
|---|---|
| Learning is "more effective" | Productivity is about apps that "make you more effective anywhere". A study tool fits that better than "lean-back" Entertainment. |
| Daily moment | A 5-10 minute lesson a day is a "habit tied to a recurring context" (commute, study break). |
| Gaming fits only as puzzles | If each lesson is a scored puzzle (hit the target by setting the launch angle), Gaming's "Puzzle ... genres that thrive seated" fits, and the education becomes the theme. |
| Prize sizes differ | Per division: Gaming $100,000 / $50,000, **Entertainment $100,000 / $50,000**, Productivity $70,000 / $35,000 (Devpost prize list, checked 2026-10-20). The fit matters more than the money, because Innovation scores "relevance to the chosen track" and Meta can re-assign anyway. |
| Risk | No track names education. Write the Devpost text around being "more effective" and the daily habit (Productivity), or around the puzzles (Gaming), not around both. |

## Divisions (§4 "Division")

| Division | Rule |
|---|---|
| **New Experience** (this app) | "conceived of and built within the competition window (starting September 24, 2026). No pre-existing codebases, no shipped titles, no early access builds repurposed" |
| Adapted / Significantly Updated | "Any build, prototype, or published app that existed prior to September 24, 2026", plus a meaningful new feature shipped in the window |

- Spatial Lab is a New Experience: repo created 2026-10-20. Public SDKs (IWSDK, three.js) are fine. Do not copy code from any project that predates 2026-09-24.
- The Sponsor can re-assign the division too (§4).

## Requirements and guidelines (§4 "Content Experience Requirements & Guidelines")

| Item | Type | Standard | Test |
|---|---|---|---|
| Hands-first | **Requirement** | "Fully usable with hands end-to-end. Controller support optional." | "Can someone complete the entire experience without ever pairing a controller?" |
| Seated-optimized | Guideline | "Designed for seated/stationary use. Limit roomscale or large physical movement." | "airplane seat test": does every interaction work in a 2 ft radius? |
| Easy in / out | Guideline | "Fast cold start. Clean pause/resume. Satisfying in ≤10 minutes." | "one bus stop test" |
| Original, not a wrapper | Guideline | "Thin wrappers around existing platforms or services (YouTube, ChatGPT, etc.) are highly discouraged." | "take it away test" |

- FAQ: seated is "a guideline, not a requirement"; about 2 ft (60 cm) of space.
- FAQ: "Project builds need to be playable on Meta Quest 3/3S." "Prioritize performance for Quest 3 and 3s." "Judges will review apps on a Meta Quest 3 or Quest 3S."
- No third-party devices: "Your experience should not require a third-party device to operate." (FAQ)
- **FoV (Meta VR Glasses guidance):** judging says "keep essential UI and interactions within a comfortable, narrower FoV and adapt across devices" (Experience Design). Meta's FoV page (developers.meta.com/vr/essentials/field-of-view): "Keep critical content away from the view boundary" and "Keep primary actions and status information near the center". Glasses use look-and-pinch input.
- English (or English subtitles) for the app and every entry material (§4 "Language").
- Content suitable for "10+, 13+, or 18+" under Meta's Developer Content Guidelines (§4 "Policies").

## Judging (§5, §6, Judging page)

- **Stage One:** pass/fail. Does the project "reasonably fit the theme" and "reasonably apply the required tools and features"? (§5)
- **Stage Two:** four criteria, **25% each**. Ties go to a judges' vote. "AI tools may also be used to assist in the judging, but final decisions will be made by human judges." (§5)

| Criterion (25% each) | What scores high (quotes from §6) |
|---|---|
| Innovation & Creativity | "originality, creative ambition, and relevance to the chosen track"; "uniquely leverage Meta device capabilities (e.g., spatial depth, hands-first design, gaze, passthrough mode, scene understanding, persistent anchors) to drive repeat usage" |
| Experience Design | "seated, hands-first, or context-specific use"; "intuitive navigation, clear onboarding, and a habit-forming purpose"; "Passthrough should be purposeful"; "FoV-aware design" |
| Technical Implementation | "gaze interactions (Unity/Unreal ISDK v207+), hand tracking, passthrough, spatial anchoring, and FoV-aware design"; "**must be performant on Meta Quest hardware (min 60 fps)**, solid and bug-free"; with passthrough, correct scene understanding (MRUK) "in rooms the developer never tested" |
| Polish & Presentation | "UI/UX, art direction, and sound design"; submission materials; video: "show real gameplay that honestly represents the experience ... Don't lean on AI-generated video to carry the pitch." |

## Last year's base rates (2025 competition, for track choice)

From https://start-developer-competition.devpost.com/ (gallery track filters, winners list; researched 2026-10-20). 2025 had different tracks (Entertainment, Lifestyle, Gaming) and one combined division.

| | Entertainment | Lifestyle (learning, wellness, utilities) | Gaming |
|---|---|---|---|
| Submissions (all / new) | 90 / 65 | 212 / 146 | 353 / 222 |
| Entries per track prize | 30 | 71 | 59 |
| Win rate, any award | 6.7% | 5.2% | 4.2% |

- 655 submissions, 32 winners. 11 of 12 track prizes went to mixed-reality (passthrough) apps, all Unity/Unreal; 8 of 12 to apps that existed before the window (2026 now has a separate New division).
- WebXR: 76 entries, 4 awards (both IWSDK-specific awards, which 2026 does not have, and 2 Judge's Choice, including HandCraft XR, a solo IWSDK Entertainment entry).
- Learning apps that won did so in Lifestyle (Inkphony, IMMERROCK, Language IRL, Compile Crops) or as a Casual game (Le Dino Labo). 2026 has no Lifestyle track, and nothing official says where learning apps go.

## Prizes and special awards (§7, Special Awards page)

Special awards are open to both divisions and all tracks. One prize per entry.

| Award | Prize | What it rewards | Fit for Spatial Lab |
|---|---|---|---|
| Best Social & Multiplayer | $25,000 | Shared presence, co-op, social spaces | Low (single-player) |
| Best Agentic Interaction | $25,000 | "AI is a core part of the experience" | Low unless an AI tutor becomes core; wrapper risk |
| Best Reason to Come Back | $25,000 | "something to work toward, visible growth between sessions" | **Good**: mastery map, daily challenge |
| Best First Five Minutes | $25,000 | "teaches controller-free interaction without a wall of text, and delivers a payoff" | **Strong**: first pinch moves the unit circle within a minute |
| Best Accessibility Forward | $25,000 | "voice alternatives ..., eyes-only navigation ..., high-contrast modes, ... inclusive by default" | **Good**: seated, one-hand mode, high contrast, captions |
| Boldest Original Concept | $25,000 | "couldn't exist anywhere else ... depends on presence, spatial depth, real-world scale" | Medium: real-scale physics and 3D geometry |
| Judge's Choice (x2) | $20,000 | Standouts that fit no single track | Possible |

## Submission deliverables (§4 "Submission", Overview "What to submit")

1. **The project, available "until the Winner Announcement"**, one of:
   - Unity, Unreal, Godot, Native/Android or another engine: "An APK uploaded to the Meta VR Developer Dashboard under a new release channel named 'Competition'."
   - **IWSDK (WebXR): "A link will be required for judges to access and test your application. See 'Deploying to GitHub Pages' for additional details."** Vercel, AWS and others are also allowed.
   - Spatial Lab uses IWSDK, so its primary deliverable is the Pages link. A PWA APK in a "Competition" channel is an optional extra (SUBMISSION.md §B).
2. **Video:** "less than three (3) minutes", footage "as viewed on a Meta Quest device or via XR Simulator or another equivalent emulator", "publicly visible on YouTube or Vimeo". "Judges are not required to watch beyond three minutes."
3. **Devpost form:** name, tagline (140 characters), track, division, description (inspiration, how it was built, future plans, a target launch date if not published; about 500 words suggested), an optional hand-interactions answer, team details.

FAQ wording conflicts: one answer says all apps "must be packaged as APKs and uploaded to ... 'Competition' ... or to a GitHub page link (if built with IWSDK/WebXR)"; another says "APKs will not be considered", meaning a raw APK file instead of a channel link or URL. Either way, a WebXR entry submits a URL.

## Access, freezes and assets

- **Free access for judges:** "Projects must be made available free of charge and with sufficient access until the Winner Announcement to enable viewing, evaluation, use, and testing by Sponsor and Judges." (§4). No login wall and no paywall. Keep the URL up.
- **No changes after the entry period:** "Once the Entry Period has ended, you may not make changes or alterations to your submission. The judging process will be based on the state of the Entry at the time of submission deadline." (§4). Judging page: "Projects that are modified after the submission deadline may be disqualified." FAQ: no updates "between November 18 at 12:00PM PST and when winners are announced on or around December 11." For a website, the deployed build is the submission: no pushes to `main`.
- "Entries must be capable of successful and consistent operation and function." (§4)
- **Third-party assets:** "If a Project uses or relies upon any third-party tools, code, or assets, the participant must be authorized to use them in accordance with any terms and conditions or licensing requirements" (§4 "Permitted Development Tools"). The Sponsor "may at any time request written proof of ownership or proper license". Keep a licence list.
- **Tools:** only publicly released tools, SDKs and features, or those released to Start members. "Use of Meta tools, SDKs, or features that have not been released ... is not permitted." (§4)
- **Third-party rights (§4):** no identifiable people other than entrants; no "commercial or corporate advertising (including ... corporate logos, brand names, and slogans), recognizable branded products"; nothing that implies a Meta association.
- **Licence to Meta (§9):** you keep the IP; Meta gets a perpetual licence to use the entry for judging and promotion.
