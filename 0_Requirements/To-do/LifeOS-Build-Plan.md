# Life OS — Build Plan

This plan turns `LifeOS-Hackathon-Idea.md` into a staged build with two parallel tracks (Design and Engineering) and a hard approval gate before any screen is integrated. It also records where the latest direction extends the original brief.

## 1. Direction and scope changes

The original brief treats the browser extension, share sheet and conversational retrieval as P2. The latest direction promotes them, because capture must be effortless from anywhere and answers must be trustworthy. The updated scope is:

| Area | Original brief | Updated direction |
|---|---|---|
| Platforms | Mobile-first PWA plus Mac browser | Phone-first browser app (installable PWA) with a complete, richer desktop web experience. One responsive codebase. |
| Capture channels | Text, voice, URL, journal, reminder | Same, plus a Chrome extension (desktop), a PWA share target (Android), and an iOS-friendly path (Shortcut, bookmarklet, clipboard detection) |
| Retrieval | Local text search | Local search plus a chat that returns consolidated answers with citations to saved items |
| Consumption | Swipeable cards, graph, infographics | Same, plus swipe forward and back through cards, a visible history, and progress tracking so users can see what they have revisited |
| Backend | Next.js API routes, LocalStorage | No real backend now. A mock service layer behind clean interfaces, and a written architecture for the real backend |
| Product scope | Personal knowledge and second brain | Second brain for the whole day. Meetings, emails, calls and health entries are items in the same model, so capture, processing, graph, search and Ask work on them unchanged. Home becomes **Today** (schedule, up to three priorities, a quiet health strip). No new tabs: the Library gets type filters, and connections (calendar, email, calls, health) live in Settings. Real connectors need OAuth and the backend, so the prototype uses sample data |

Nothing else in the original brief changes. The loop Capture → Process → Structure → Connect → Visualise → Explore → Retrieve → Share remains the definition of done.

## 2. Stack decision

The project has no existing stack, so the designer defaults apply: Vite, React 19, TypeScript (strict), Fluent UI v9 with Griffel `makeStyles`, and `@fluentui/react-icons`. Next.js is not needed because nothing requires server-side rendering. React Flow (graph) and Framer Motion (swipe) are added as specified in the brief. The editorial look and the violet/indigo palette are achieved through a custom Fluent theme, not by replacing the component library.

Tailwind, shadcn/ui and Lucide from the original brief are intentionally not used.

## 3. Tracks and ownership

To avoid conflicts, each track owns specific paths and must not edit the other's.

### Track A — Design and Experience

Owns:
- `0_Requirements/LifeOS-Design.md` — the design specification.
- `5_Presentation/design-v1/` — a self-contained, clickable prototype that works at phone and desktop widths.
- `2_version_History/` — timestamped screenshots of the prototype.

Responsibilities: information architecture, user flows, design system, every screen on phone and desktop, states (empty, loading, processing, error), accessibility, and motion. Output is something the product owner can review and approve.

### Track B — Engineering

Owns:
- `0_Requirements/LifeOS-Architecture.md` — the architecture and the real-backend design.
- Project root files (`package.json`, `vite.config.ts`, `index.html`, `tsconfig*.json`) and `src/` for everything except screens.
- `extension/` — the Chrome extension.

Responsibilities (phase 1, before design approval): understand the requirements, write the architecture, scaffold the app, and build the headless domain layer with tests. No user-facing screens are built in this phase.

## 4. Phases and gates

| Phase | Track A | Track B | Gate |
|---|---|---|---|
| 1. Parallel discovery and build | Design spec and clickable prototype | Architecture, scaffold, domain layer, capture channels, tests | Both tracks report back |
| 2. Design review | Present prototype and screenshots | Hold. Confirm the data contracts match the designed screens | **Product owner approves the design** |
| 3. Integration | Support design fidelity checks | Build screens from the approved design on top of the domain layer | Loop works end to end on phone and desktop |
| 4. Polish and demo | Fidelity pass, accessibility pass | Seed data, PWA install, deploy | Demo flow passes |

No screen code is written until the design is approved.

## 5. Capture channels

The aim is that saving something takes under five seconds from wherever the user is.

| Channel | Where | How it works in the prototype | Notes |
|---|---|---|---|
| Quick capture bar | Every screen (desktop shortcut, phone button) | Text, URL paste, voice | Primary path |
| Chrome extension | Desktop Chrome | Toolbar button and context menu send the page URL, title and any selected text to the app through a deep link | Built as a Manifest V3 extension in `extension/` |
| PWA share target | Android Chrome | Installed PWA appears in the system share sheet and receives the shared URL or text | Declared in the web manifest |
| iOS share path | iPhone Safari | iOS does not support the Web Share Target API for PWAs, so use an iOS Shortcut or bookmarklet that opens the app's capture deep link, plus clipboard detection when the app opens | To be verified by Track B |
| Voice | All | Browser speech recognition, with a recording and mock-transcription fallback | |
| Paste an AI conversation | All | A dedicated chat-import option in the capture sheet | |

All channels converge on a single inbound function that creates a pending item in the same unified inbox, so processing and storage are identical regardless of origin.

## 6. Contracts between the tracks

- **Domain types** are those defined in section 9 of the brief (`KnowledgeItem`, `KnowledgeConcept`, `KnowledgeRelationship`, `Reminder`). Track B may extend them, for example with `status`, `citations` and `reviewState`, and documents every change in the architecture file.
- **Services Track B exposes to screens:** capture, process, list and search items, get an item with its related items, graph data, daily discovery, ask-a-question with citations, share, and reminders. Each is an async function behind an interface so the mock implementation can be replaced with a real API.
- **Components Track A specifies** use Fluent UI v9 component names and tokens only, so they map directly to implementation.

## 7. Definition of done

The brief's success criteria (section 17) all hold, plus:

1. The same build is comfortable on a 390 px phone and a 1440 px desktop.
2. A user can capture from the app, from the Chrome extension, and from a share path, and the item appears processed in the library.
3. Asking a question in chat returns a consolidated answer with citations that open the source items.
4. Swiping forward and back through cards works, and revisited cards are tracked.
5. Saved content survives a refresh.
6. The interface meets WCAG 2.2 AA, supports light, dark and high-contrast themes, and respects reduced motion.

## 8. Open questions for the product owner

- Is the dark theme required for the demo, or is light enough?
- Should the real-backend design assume Supabase, as in the brief, or a different provider?
- Which AI provider, if any, should the processing and chat services target once keys are available?
