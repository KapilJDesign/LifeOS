# Reference Observations: mymind

This file records what we learned from a competitor reference so that later design and engineering decisions can point back to it. It is inspiration only. Life OS must not reuse mymind's copy, colours, typography, layout or imagery.

Refer to this file by name (`Reference-mymind-Observations.md`) when working on capture, auto-tagging, search, onboarding or the share path.

## 1. Sources and how reliable they are

| Source | What it contained | Confidence |
|---|---|---|
| Screen recording `ScreenRecording_11-22-2026 15-27-05_1.MP4` (91 s, iPhone, 1206 × 2622) | The mymind iOS app's first-run walkthrough, from welcome screen to paywall | Text read by OCR from 46 frames, one every 2 seconds. Layout and motion are partly inferred. |
| `https://access.mymind.com/everything` | Redirects to the sign-in page. Only the public onboarding copy is readable. The signed-in app is not accessible. | High for copy, none for the in-app screens |
| Two screenshots attached to the request | Could not be read in this session. They need to be re-attached or described. | Not used |

Limits to keep in mind:

- The recording is the onboarding tour, not the signed-in app. It shows a demonstration wall of cards, but we have not seen the real library grid, card detail, tag editing, or settings.
- The frames were not inspected visually. Everything below comes from OCR text and the public page copy. The reference's actual palette and typeface were therefore not measured, and no claims are made about them.
- Where this document says "inferred", it is a reasoned guess about how mymind works, not something shown on screen.

Twelve representative frames are saved in `images/mymind-reference/` (named `frame-NNN.jpg`, where NNN is the frame number in the table below).

## 2. What the walkthrough shows

Frame `g_NNN` is at roughly `(NNN − 1) × 2` seconds into the recording.

| Frames | Approx. time | Screen | What it does |
|---|---|---|---|
| 001–005 | 0:00–0:08 | "Welcome to your new private oasis" | Mood-setting opening over a wall of imagery. No sign-up pressure yet. |
| 006–007 | 0:10–0:14 | "Enjoy the silence" | Lists what the product will never do: no ads, no social features, no invasive tracking, no distractions, no collaboration, no pressure. |
| 008–012 | 0:14–0:24 | Collage of saved things | Cards fly in: quotes, a book, a product with a price, an album, an article. Shows breadth of what can be saved. |
| 013–017 | 0:24–0:34 | "One click and it's in your mind." | Capture promise: images, links, notes, videos, articles, highlights, screenshots. "Don't overthink it." |
| 018–023 | 0:34–0:46 | "No need to organize. It's all done for you." | Core auto-tagging demo. Described in section 3. |
| 024–036 | 0:46–1:12 | "To find it later, just search for it." | Search demo. Described in section 4. |
| 037–043 | 1:12–1:26 | "Find me in your share sheet." | Guided setup of the iOS share extension. Described in section 5. |
| 044–045 | 1:28–1:30 | Plan picker | Monthly or annual billing and three tiers. |
| 046 | 1:32 | iOS Control Centre | Recording ended. Not part of the app. |

## 3. How automatic tagging is presented

The user's stated favourite. In the demo, a card is saved and then acquires structure without the user doing anything. Each card is shown with three layers of metadata:

1. **A type label with an icon.** Examples: Book, Images, Articles, Websites, Products, Notes, Quotes, Albums.
2. **Type-specific attributes.** These differ by type, which is what makes it feel intelligent:
   - Book: `Author: Celeste Lim`
   - Product: `Designer: BRAUN`, price `$43.99`, title "wall clock"
   - Website: the site name (`UGMONK`)
3. **Free tags as small chips**, mixing two different kinds of tag:
   - Intent tags describing what the user will do or why they saved it: `read later`, `favorite book`, `inspiration`.
   - Topical tags describing the content: `novel`, `mountain`, `scenery`, `vintage ad`, `research`, `space exploration`, `product`, `office accessories`, `home office`.

The copy that accompanies this: "Don't worry about tagging or sorting anything, unless you want to." So automatic is the default and manual editing is an optional override, not a required step.

### Inferred mechanism (not shown on screen)

1. Detect what was saved: URL, image, text, or a mix.
2. For links, read page metadata (Open Graph, schema.org product and book markup) to get title, author, brand and price.
3. Classify into a type from a fixed list, which decides which attributes to extract.
4. Generate topical tags and a small number of intent tags.
5. For images, run vision to recognise objects and OCR to read text inside them. The page copy says this explicitly: mymind "recognizes objects and can even read text inside images and screenshots".
6. Index everything, including colour and date, so search can use it.

## 4. How search is presented

- One search box. Copy: "Search by keyword, brand, type, date, color, whatever you think of first."
- Results are the same visual cards, not a list. In the demo the wall reshapes as different queries run (Notes, Articles, Books, "Typography", "Wood Furniture").
- Because type, brand, date and colour are all indexed, a vague memory ("that blue thing from March") is enough to find something.

## 5. Capture and share setup

- Capture promise is one action and no required fields: "If it's interesting or useful, save it."
- Channels named on the public page: a mobile app and a browser extension.
- The iOS share sheet is not available automatically. The app coaches the user through enabling it, one instruction per screen, with a short video: Open any photo, tap Share, swipe to the end and tap More, tap Edit, drag the app to the top.
- The step has an escape hatch: "I'll do this later". Setup never blocks use.

## 6. Onboarding and tone

- Leads with trust (privacy list) before features. The negative list is the value proposition.
- Each promise gets one screen and a large headline of two or three short lines.
- Shows the product doing its job (cards acquiring labels) instead of describing it.
- The paywall comes last, after the value has been shown. Tier names are identities rather than feature levels ("Student of Life", "Bookmarker", "Mastermind"). Paid features seen: advanced AI, reading mode, PDF analyzer, video support, AI summaries, custom app icons. Pricing is out of scope for the hackathon.

## 7. What Life OS already has

Checked against the code in `src/lib/ai/` and `src/types/knowledge.ts`.

| Capability | Status |
|---|---|
| Processing pipeline: detect source, extract, summarise, concepts, tags, actions | Built (`processor.ts`, `mock-processor.ts`) |
| Validated provider output with deterministic offline fallback | Built (`schema.ts`, `processor.ts`) |
| Original input never overwritten by AI | Built for `content`, `sourceUrl`, `createdAt`; see the risk below for tags |
| Reuse of existing concepts to keep names consistent | Built (`existingConcepts`, capped at 60 names in the prompt) |
| Content kind per item | Built, 10 kinds |
| Item status (`pending`, `processing`, `ready`, `failed`) | Built, ready to drive a "tagging in progress" state |
| Chat with citations, graph, daily discovery, revisit tracking | Built in the domain layer. Not shown in the reference recording. |

## 8. Gaps against the reference

These are the places where mymind's approach would improve Life OS.

1. **Tags are a flat list of strings** (`KnowledgeItem.tags`, up to 8). The reference distinguishes type, topical tags and intent tags, and shows them differently. Without that, the UI cannot render the three layers in section 3.
2. **No type-specific attributes.** There is nowhere to store an author, brand, price, duration or channel. `ContentKind` also lacks the kinds the reference leads with: book, product, image, quote, website, album.
3. **No image understanding.** There is a `thumbnail` field but no extracted text, detected objects or dominant colours.
4. **Search is not faceted.** Nothing yet filters by type, date, brand or colour.
5. **No tag provenance.** There is no record of whether a tag came from AI or the user.
6. **Risk: re-processing erases user edits.** `applyProcessingResult` in `processor.ts` assigns `tags: output.tags`, so any tag the user adds or removes is lost the next time an item is processed again. This must be fixed before tag editing is built.
7. **Tag vocabulary can drift.** The prompt shows the model existing concept names but not existing tags, so "ML", "machine learning" and "Machine Learning" can all appear.
8. **No visible "tagging happened" moment.** The reference makes automatic tagging feel like magic by showing the card gain its labels. Our status field supports this but no screen exists yet.

## 9. Proposed direction: take the idea, make it better

None of this is built or approved. It is a starting point for the design review described in `To-do/LifeOS-Build-Plan.md` (no screen code before design approval).

1. **Structured tags.** Replace the flat list with tags that carry a kind (`type`, `topic`, `intent`, `person-or-place`) and an origin (`ai` or `user`). Keep the string list as a derived view for backwards compatibility.
2. **Type-specific attributes.** Add an `attributes` map and a small, per-kind schema (book: author; product: brand, price; video: channel, duration; article: author, publication). Validate it in `schema.ts` like the existing fields.
3. **Explainable tags.** Where mymind just shows chips, Life OS can show why: a tap on a tag reveals the sentence or metadata it came from, with one-tap remove or replace. This builds trust and gives users a quick way to correct the AI.
4. **Live tagging reveal.** While an item is `processing`, show a skeleton card. When it becomes `ready`, animate the type, attributes and chips in. Respect reduced motion.
5. **User edits win.** Merge on re-process: keep user-added tags, never re-add a tag the user removed.
6. **Consistent vocabulary.** Feed the model the user's most-used existing tags as well as concepts, and normalise case and aliases on write.
7. **Search facets.** Add type, date range, and tag-kind filters first. Add colour and brand once image analysis exists.
8. **Build on what the reference does not show.** Chat with citations, the knowledge graph, daily discovery and revisit tracking already exist in the domain layer and should be the differentiators in the demo.
9. **iOS capture path.** The reference relies on a native share extension. Life OS is a PWA, and iOS does not let PWAs appear in the share sheet (see Build Plan section 5). Use a guided Shortcut or bookmarklet setup with the same one-step-per-screen coaching and an "I'll do this later" option.
10. **Onboarding.** Borrow the structure (trust first, one idea per screen, show don't tell, skippable setup) and write original copy and visuals.

## 10. Do not copy

- Any wording from the reference, including "private oasis", "Enjoy the silence", the six "No …" promises, "One click and it's in your mind", and the tier names.
- The reference's colours, typeface, logo, imagery and exact screen layouts.
- The overall visual metaphor of a calm, hushed "mind". Life OS has its own identity: electric violet to deep indigo, with Bricolage Grotesque for interface text and Newsreader for editorial text (see `src/theme/index.ts` and `5_Presentation/design-v1/tokens.css`).

## 11. Open questions

- Which tag kinds do we want in the first version: all four, or only type, topic and intent?
- Is a visible "why this tag" explanation in scope for the demo, or a later polish item?
- Should image understanding (objects, OCR, colour) be in the hackathon scope? It is the largest piece of work in section 8.
- The two attached screenshots could not be read. If they show the signed-in app, please re-attach them or describe them, and this file will be updated with the real library, card and detail patterns.

## Appendix: frame index

| File | Frame | Shows |
|---|---|---|
| `images/mymind-reference/frame-002.jpg` | 002 | Welcome screen |
| `images/mymind-reference/frame-007.jpg` | 007 | Privacy promise list |
| `images/mymind-reference/frame-009.jpg` | 009 | Collage of saved items |
| `images/mymind-reference/frame-013.jpg` | 013 | "One click" capture promise |
| `images/mymind-reference/frame-018.jpg` | 018 | Book card gaining author and tags |
| `images/mymind-reference/frame-021.jpg` | 021 | Website card |
| `images/mymind-reference/frame-023.jpg` | 023 | Product card with designer and price |
| `images/mymind-reference/frame-025.jpg` | 025 | Search demo |
| `images/mymind-reference/frame-030.jpg` | 030 | Search results as an article wall |
| `images/mymind-reference/frame-037.jpg` | 037 | Share sheet setup, step 1 |
| `images/mymind-reference/frame-039.jpg` | 039 | Share sheet setup, "More" step |
| `images/mymind-reference/frame-044.jpg` | 044 | Plan picker |
