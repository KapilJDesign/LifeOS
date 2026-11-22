# LIFE OS
## Product Requirements & Technical Build Brief
### Hackathon MVP — 2-hour implementation

**Working product name:** Life OS  
**Category:** AI-powered Personal Knowledge Management / Second Brain  
**Platform priority:** Mobile-first PWA + Mac browser experience  
**Build approach:** Working frontend, local persistence, AI-assisted processing with graceful mock fallback.

---

# 1. Product vision

Life OS is a personal knowledge operating system that captures everything I consume, experience, think about, and want to remember.

Today, our knowledge is fragmented across Instagram, YouTube, websites, podcasts, articles, conversations with AI, voice notes, screenshots, bookmarks, and personal journals.

We consume an enormous amount of information, but very little of it becomes structured, connected, actionable knowledge.

Life OS solves this by creating one central place where information can be captured from anywhere, automatically understood, categorised, connected to existing knowledge, and presented in formats that are easy to explore and revisit.

Instead of opening a traditional notes application and reading through hundreds of saved items, I should be able to:

- Capture anything in seconds.
- Let AI understand and organise it.
- Discover connections between different ideas.
- Explore my knowledge through interactive graphs and mind maps.
- Swipe through beautiful, visual knowledge cards.
- Generate infographics and visual summaries.
- Search my entire knowledge base conversationally.
- Turn useful information into reminders, tasks and actions.
- Share individual ideas or complete knowledge collections.

**The ultimate vision: Your entire digital life, organised into a personal, searchable, visual and intelligent knowledge system.**

# 2. The problem statement

We are constantly consuming information, but we lack a unified system to retain, understand, connect and reuse it.

Our knowledge is scattered across disconnected applications and platforms. Traditional bookmarking and note-taking applications preserve information but do not necessarily help us understand it, connect it with what we already know, or rediscover it at the right moment.

We need a system that works as a personal knowledge layer across our digital lives.

**How might we create an intelligent Life OS that captures information from every source, converts it into structured knowledge, connects related ideas and makes that knowledge effortless to explore, understand and act upon?**

# 3. Core product philosophy

The experience must be built around four principles.

### A. Capture without friction
Capturing information should take seconds. Never make the user fill out complicated forms, choose categories or manually organise information.

### B. AI does the organising
AI should understand the content, extract insights, identify topics, create summaries and suggest relationships.

### C. Visualise instead of just reading
Knowledge should be presented through visual cards, mind maps, infographics and interconnected nodes.

### D. Knowledge should come back to you
The application should help users rediscover what they have saved, not become another graveyard of bookmarks.

# 4. Primary user journeys

The application has five primary workflows.

## Journey 1: Capture anything

A user encounters an interesting idea while consuming content.

They can:

- Share an Instagram reel.
- Copy a YouTube URL.
- Share an article.
- Save a website.
- Record a quick voice note.
- Write a thought.
- Create a journal entry.
- Add a reminder.
- Paste a conversation from ChatGPT or Gemini.

All these inputs enter one unified capture inbox.

## Journey 2: AI understands the information

Once captured, the system processes the content.

It should identify:

1. Content title.
2. Original source.
3. Content type.
4. Main topic.
5. Short summary.
6. Important takeaways.
7. Key concepts.
8. Actionable insights.
9. Suggested tags.
10. Related existing knowledge.

The user should not need to organise any of this manually.

## Journey 3: Explore connected knowledge

Every captured item becomes part of a larger knowledge network.

For example:

A YouTube video about AI agents connects to:
- AI automation.
- Agent architecture.
- MCP.
- Developer tools.
- Personal productivity.
- Existing notes about AI workflows.

The application should show these connections through an interactive knowledge graph and mind map.

## Journey 4: Consume knowledge visually

Instead of reading long notes, the user can explore information using:

- Swipeable knowledge cards.
- Visual summaries.
- Infographics.
- Topic collections.
- Mind maps.
- Quick takeaways.
- Daily knowledge discovery.

The goal is to make revisiting knowledge enjoyable.

## Journey 5: Retrieve, act and share

The user can search their knowledge, ask questions, create reminders, revisit saved content, or share a visual summary with someone else.

# 5. Product modules

The product has six major modules.

## Module A: Capture Hub

This is the most important module for the MVP.

Create one universal capture interface with multiple input methods.

### 1. Quick text capture

A simple input field:

"What is on your mind?"

Examples:
- An idea for a product.
- Something I want to remember.
- A thought from a meeting.
- A useful insight from an article.

### 2. Voice capture

A microphone button that allows the user to record a voice note.

Expected workflow:

1. Tap microphone.
2. Record voice.
3. Stop recording.
4. Convert speech into text.
5. Generate a title and summary.
6. Save it to the knowledge base.

For the hackathon, use browser speech recognition where supported, or MediaRecorder with a mock transcription fallback.

### 3. URL capture

Allow users to paste links from:

- Instagram
- YouTube
- Websites
- Blogs
- Articles
- Podcasts

The application should detect the source and show its platform icon.

For the MVP, do not build platform scraping. Save the original URL and create sample metadata or use an AI processing endpoint if configured.

### 4. Journal capture

A dedicated quick journaling experience.

Allow users to capture:
- Daily reflections.
- Personal experiences.
- Ideas.
- Things learned.
- Goals.
- Lessons.

AI can identify recurring themes and connect journal entries with existing knowledge.

### 5. Reminders and actions

Users should be able to convert captured information into an action.

Example:

"Explore building a local AI agent this weekend."

AI identifies:
- Action: Explore local AI agent development.
- Type: Task.
- Suggested date: This weekend.

The user can confirm or edit the reminder.

### 6. Mac entry point

The Mac experience should provide:

- A responsive browser interface.
- Quick capture from the main dashboard.
- Paste URL functionality.
- Keyboard shortcut for opening the capture panel.
- Ability to copy and share content.

Future version: a browser extension and native Mac menu-bar application.

## Module B: AI Processing Engine

Every capture should go through a common processing pipeline.

**Pipeline:**

Capture → Detect source → Extract content → Summarise → Extract concepts → Generate tags → Find relationships → Save.

For the MVP, implement a single processing function that accepts all capture types.

Suggested output:

```json
{
  "title": "Understanding AI Agents",
  "content_type": "video",
  "source": "youtube",
  "url": "https://youtube.com/example",
  "summary": "An introduction to autonomous AI agents.",
  "key_takeaways": [
    "Agents can plan and execute tasks",
    "Tools extend agent capabilities",
    "Context improves decision making"
  ],
  "concepts": [
    "AI Agents",
    "Tool Calling",
    "Context Engineering"
  ],
  "tags": [
    "AI",
    "Technology",
    "Automation"
  ],
  "actions": [
    "Explore agent frameworks"
  ],
  "related_topics": [
    "MCP",
    "AI Workflows"
  ]
}
```

Important: This is an example output structure, not a requirement to hardcode every result.

Use structured AI output when an API is available.

If no AI API is configured, use a deterministic mock processor so the demo remains functional.

## Module C: Knowledge Graph

This is one of the defining features of Life OS.

The application should not just store notes as individual records. It should connect information into a network of concepts.

### Graph structure

Three primary entity types:

**1. Knowledge items**
- Notes
- Articles
- Videos
- Voice notes
- Journal entries
- Conversations

**2. Concepts**
- AI
- Design Systems
- Productivity
- Business
- Personal Development
- Technology

**3. Relationships**
- Related to
- Part of
- Inspired by
- Contradicts
- Supports
- Derived from

### Example graph

```text
                 AI
                  |
          AI Agents
             /    \
        MCP       Automation
         |            |
    Tool Calling   Workflows
         |            |
     Developer     Productivity
        Tools
```

### Graph UI requirements

Create an interactive graph visualization.

- Nodes represent concepts and saved items.
- Edges represent relationships.
- Different node types have different visual treatments.
- Clicking a node opens its details.
- Related nodes can be explored.
- Users can zoom and pan.
- Clicking a topic can filter the knowledge collection.

For the MVP, use React Flow or another lightweight graph visualization library.

Create a seeded graph with approximately 12–20 nodes.

The graph must be functional, not just a static decorative illustration.

## Module D: Visual Knowledge Explorer

This is the most important differentiator from traditional note-taking applications.

The experience should feel like exploring a personal knowledge feed.

### 1. Swipeable knowledge cards

Create a dedicated Explore screen.

Each card should display:

- Topic or title.
- One-line insight.
- Short explanation.
- Key takeaway.
- Source attribution.
- Relevant tags.
- Visual illustration or graphic.
- Related concepts.

Interaction:
- Swipe left/right to navigate.
- Tap to expand.
- Save as favourite.
- Open original source.
- Share the card.

The design should feel closer to an editorial knowledge magazine than a conventional notes application.

### 2. Knowledge infographic

Allow users to convert an individual note into a visual infographic.

For example, an article about AI agents can become:

- A central concept.
- Three supporting principles.
- A simple process diagram.
- Important takeaways.
- Related concepts.

The infographic should be generated from the content, not simply be a screenshot of a note.

For the MVP, create a reusable infographic template rendered as HTML/CSS or SVG.

Include a Share / Export Image action where practical.

### 3. Topic collections

Automatically group information into collections.

Examples:
- AI & Emerging Technology
- Product Design
- Business Ideas
- Productivity
- Personal Development
- Learning

Each collection should show:
- Number of saved items.
- Short AI-generated description.
- Related concepts.
- Recent additions.

### 4. Daily knowledge

Create a section called "Today's Discovery".

Display:
- One saved insight from the past.
- One interesting connected concept.
- One item the user has not revisited recently.

For the MVP, use seeded content and simple selection logic.

## Module E: Search and Retrieval

Users should be able to find information without remembering where they saved it.

Create a global search field:

"Search your knowledge..."

Search across:
- Titles.
- Summaries.
- Content.
- Tags.
- Topics.
- Sources.

For the MVP, implement local text search.

Future capability: semantic search and conversational retrieval.

Example questions:

- What did I save about AI agents?
- What were my ideas about building a SaaS?
- Show me all content related to productivity.
- What have I learned about design systems?
- Find connections between AI and product design.

The AI answer should reference the original saved items.

## Module F: Sharing

Every knowledge item should be shareable.

Allow the user to:
- Share a knowledge card.
- Share an infographic.
- Copy a summary.
- Share a topic collection.
- Copy a source link.

For the MVP, use the native browser share API where supported, plus clipboard fallback.

Future capability:
- Public shareable knowledge pages.
- Collaborative collections.
- Shared mind maps.
- Export to PDF and image.

# 6. Experience and navigation

The interface should be mobile-first but should work beautifully on Mac.

### Primary navigation

Use a bottom navigation bar on mobile.

1. Home
2. Explore
3. Capture
4. Knowledge Graph
5. Library

On desktop, use a left sidebar with the same destinations.

### Screen 1: Home dashboard

This is the landing experience.

Sections:

**Header**
- Life OS logo.
- Greeting.
- Profile icon.

**Capture bar**
- Text input.
- Microphone.
- Link icon.
- Plus button.

**Today's Discovery**
- A large featured knowledge card.

**Recently Captured**
- Horizontal cards with source icons.

**Explore Your Knowledge**
- Topic collection tiles.

**Quick access**
- Knowledge graph.
- Journal.
- Reminders.

The screen should be visually rich but not crowded.

### Screen 2: Capture

A focused capture interface.

- Text input.
- Voice recording.
- URL input.
- Journal entry.
- Reminder creation.

After submission, show an AI processing state followed by the structured result.

### Screen 3: Explore

Full-screen card browsing.

- One card at a time.
- Swipe gestures.
- Progress indicator.
- Save.
- Share.
- Open details.

This should be the most delightful interaction in the product.

### Screen 4: Knowledge Graph

- Interactive graph.
- Topic filters.
- Zoom and pan.
- Node selection.
- Connected content panel.

### Screen 5: Library

A searchable collection of saved items.

Filters:
- All
- Articles
- Videos
- Voice notes
- Journal
- Ideas

Sort by recent, oldest or topic.

### Screen 6: Knowledge detail

When opening an item, display:

- Title.
- Original source.
- Summary.
- Key insights.
- Tags.
- Related concepts.
- Related saved items.
- Original link.
- Share action.
- Convert to reminder.

# 7. Visual design direction

The application should feel like a premium personal knowledge product.

### Design principles

- Minimal, editorial interface.
- Strong typography.
- Spacious layouts.
- Rich visual cards.
- Rounded containers.
- Subtle shadows.
- Restrained accent colours.
- Clear hierarchy.
- Beautiful empty states.
- Smooth transitions.

### Suggested visual direction

Think of a combination of:
- Apple's simplicity.
- Readwise Reader's reading experience.
- Notion's organisational flexibility.
- Obsidian's connected knowledge.
- Pinterest's visual discovery.
- A modern editorial magazine.

Do not copy any of these products. Use them as experience references.

### Colour direction

Suggested palette:
- Background: warm off-white or very dark charcoal.
- Primary text: near-black or off-white.
- Accent: electric violet or deep indigo.
- Secondary accent: muted blue.
- Cards: soft neutral surfaces.

Create a cohesive design system with consistent spacing, typography and components.

# 8. Recommended technical architecture

## Hackathon stack

Prioritise speed and reliability.

| Layer | Recommendation |
|---|---|
| Frontend | Next.js + React + TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Icons | Lucide |
| Graph | React Flow |
| Swipe interaction | Framer Motion |
| State | Zustand or React state |
| Persistence | LocalStorage initially |
| Backend | Next.js API routes |
| Database later | Supabase PostgreSQL |
| AI | Configurable LLM API |
| Voice | Browser Speech Recognition / MediaRecorder |

### Important implementation decision

Do not build a native iOS application in two hours.

Build an installable, responsive PWA.

This gives:
- Mobile browser support.
- Mac browser support.
- Home-screen installation on iPhone.
- A unified codebase.
- A foundation for future native applications.

Later, the application can evolve into React Native with TypeScript and a shared backend.

# 9. Data model

Start with a simple unified knowledge model.

### KnowledgeItem

```typescript
type KnowledgeItem = {
  id: string;
  title: string;
  content: string;
  summary: string;
  sourceType:
    | "text"
    | "voice"
    | "instagram"
    | "youtube"
    | "website"
    | "journal"
    | "chat";
  sourceUrl?: string;
  sourceName?: string;
  thumbnail?: string;
  tags: string[];
  concepts: string[];
  keyTakeaways: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isProcessed: boolean;
};
```

### KnowledgeConcept

```typescript
type KnowledgeConcept = {
  id: string;
  name: string;
  description: string;
  itemIds: string[];
};
```

### KnowledgeRelationship

```typescript
type KnowledgeRelationship = {
  id: string;
  sourceId: string;
  targetId: string;
  relationship:
    | "related"
    | "part_of"
    | "supports"
    | "inspired_by";
};
```

### Reminder

```typescript
type Reminder = {
  id: string;
  title: string;
  description?: string;
  dueAt?: string;
  completed: boolean;
  sourceItemId?: string;
};
```

### JournalEntry

Journal entries can use KnowledgeItem with `sourceType: "journal"` initially. Do not create a separate storage system unnecessarily.

# 10. Main application architecture

Build a modular structure.

```text
src/
  app/
    page.tsx
    explore/
    capture/
    graph/
    library/
    knowledge/[id]/

  components/
    navigation/
    capture/
    cards/
    graph/
    infographic/
    common/

  lib/
    ai/
      processor.ts
      prompts.ts
    capture/
      url-detector.ts
      voice.ts
    graph/
      graph-builder.ts
    storage/
      local-storage.ts
    search/
      search.ts

  store/
    knowledge-store.ts

  types/
    knowledge.ts

  data/
    demo-knowledge.ts
```

Keep the code modular enough to replace mock services with real APIs later.

# 11. Capture processing implementation

Create one reusable processing function.

```typescript
async function processCapture(input: {
  content: string;
  type: string;
  url?: string;
}) {
  // 1. Identify source type.
  // 2. Extract available content.
  // 3. Generate a title.
  // 4. Create a concise summary.
  // 5. Extract key takeaways.
  // 6. Identify concepts and tags.
  // 7. Match related existing concepts.
  // 8. Return a structured knowledge item.
}
```

Processing rules:

- Use the configured AI service when available.
- Always validate the returned JSON.
- Fall back to local processing when the API is unavailable.
- Do not block saving if AI processing fails.
- Preserve the original content and URL.
- Show a clear processing state.
- Let the user edit the generated result.

For URLs, use platform detection first.

Do not attempt to scrape Instagram or YouTube directly in this hackathon. Their content access can require authentication, APIs or additional infrastructure.

For the demonstration, use a few known example URLs with sample metadata and summaries.

# 12. Knowledge graph implementation

Use React Flow.

Build graph data from KnowledgeConcept and KnowledgeRelationship.

Example:

```typescript
const nodes = [
  {
    id: "ai",
    position: { x: 300, y: 100 },
    data: { label: "Artificial Intelligence" }
  },
  {
    id: "agents",
    position: { x: 150, y: 250 },
    data: { label: "AI Agents" }
  },
  {
    id: "automation",
    position: { x: 450, y: 250 },
    data: { label: "Automation" }
  }
];

const edges = [
  {
    id: "e1",
    source: "ai",
    target: "agents"
  },
  {
    id: "e2",
    source: "ai",
    target: "automation"
  }
];
```

Use custom node components to differentiate:
- Concepts.
- Saved content.
- Journal entries.
- Topics.

When a node is clicked, show a detail panel.

Use seeded relationships for the initial demo. New captures should add concepts to the graph and link to existing matching concepts.

# 13. Two-hour implementation plan

This is the most important section.

Do not attempt to implement every future capability.

The goal is to demonstrate a complete end-to-end experience with a small number of polished interactions.

## Phase 1 — Foundation (0–15 minutes)

- Initialise Next.js.
- Configure TypeScript.
- Install Tailwind.
- Install Lucide.
- Install Framer Motion.
- Install React Flow.
- Create navigation.
- Create the main responsive layout.

Deliverable: Application runs on Mac and mobile viewport.

## Phase 2 — Dashboard and capture (15–40 minutes)

Implement:

- Home screen.
- Quick text capture.
- URL capture.
- Voice input or speech recognition.
- Save functionality.
- Local persistence.
- Recent capture list.

Deliverable: User can capture and save different types of content.

## Phase 3 — AI processing (40–60 minutes)

Implement:

- Source detection.
- Title generation.
- Summary generation.
- Key takeaway extraction.
- Tag generation.
- Concept extraction.
- Mock fallback.

Deliverable: Captured information becomes a structured knowledge item.

## Phase 4 — Knowledge graph (60–80 minutes)

Implement:

- Seeded graph.
- React Flow nodes.
- Relationship edges.
- Zoom and pan.
- Node selection.
- Detail panel.

Deliverable: User can explore connected knowledge.

## Phase 5 — Visual knowledge explorer (80–105 minutes)

Implement:

- Swipeable knowledge cards.
- Card details.
- Save/favourite.
- Related concepts.
- Infographic template.
- Share functionality.

Deliverable: User can consume and share knowledge visually.

## Phase 6 — Polish and demo (105–120 minutes)

- Add demo content.
- Improve mobile layout.
- Add loading states.
- Fix navigation.
- Test capture and persistence.
- Verify graph interaction.
- Prepare demo flow.

Deliverable: A working, presentable hackathon prototype.

# 14. Explicit scope prioritisation

## P0 — Must build

These are mandatory.

- Responsive mobile-first interface.
- Home dashboard.
- Text capture.
- URL capture.
- Voice input or a working voice-input fallback.
- Unified knowledge item storage.
- AI-style structured processing.
- Local persistence.
- Swipeable knowledge cards.
- Knowledge graph with interactive nodes.
- Knowledge detail view.
- Basic sharing.

## P1 — Build if time allows

- Journal interface.
- Reminder creation.
- Search.
- Topic collections.
- Infographic generation.
- Favourite functionality.
- AI-generated related concepts.

## P2 — Future roadmap

Do not attempt these during the two-hour build.

- Native iOS application.
- Native Mac application.
- Browser extension.
- Full Instagram integration.
- YouTube transcript extraction.
- Automatic website scraping.
- ChatGPT and Gemini account integrations.
- Full conversational AI retrieval.
- Vector database.
- Semantic search.
- Cloud synchronisation.
- Multi-user collaboration.
- Advanced graph algorithms.
- Scheduled notifications.
- Offline-first cross-device sync.

# 15. Demo content

The application should not launch with an empty knowledge base.

Preload 10–15 realistic examples.

Use the following content areas:

### AI and technology
- Understanding AI agents.
- Model Context Protocol.
- Context engineering.
- Local LLMs.
- AI-assisted development.

### Product design
- Enterprise design systems.
- AI in product design.
- Design quality.
- User research.

### Business and ideas
- Future of SaaS.
- Building a personal knowledge system.
- Business automation.

### Personal knowledge
- A daily journal entry.
- A voice note containing a product idea.
- A reminder to explore an AI tool.

Make sure the graph has relationships between these examples.

The seeded information should make the graph, cards, topic collections and search feel interconnected from the beginning.

# 16. Example demonstration flow

The demo should tell one coherent story.

### Step 1: Capture

Open the mobile application.

Paste a YouTube URL about AI agents.

Show the capture interface.

### Step 2: Process

Show the application identifying the source and generating:
- Title.
- Summary.
- Key takeaways.
- Concepts.
- Tags.

### Step 3: Connect

Open the knowledge graph.

Show that AI Agents connects to MCP, Automation and Context Engineering.

Select a node and open the related knowledge.

### Step 4: Consume

Go to Explore.

Swipe through a visual knowledge card explaining AI agents.

Open its infographic.

### Step 5: Rediscover

Open search and ask for AI-related knowledge.

Show multiple saved items and connected concepts.

### Step 6: Share

Share a visual knowledge card.

End with the idea that information is no longer just saved; it becomes reusable knowledge.

# 17. Product success criteria

The MVP is successful if the following work end-to-end:

1. A user can capture information using at least two different input methods.
2. Every capture becomes a saved knowledge item.
3. Captured information has a title, summary and tags.
4. The system can identify and display related concepts.
5. The graph allows interaction with nodes.
6. Users can browse knowledge through swipeable cards.
7. Users can open and revisit saved content.
8. Users can share a knowledge card or summary.
9. The interface works on a mobile viewport and Mac browser.
10. The application does not lose saved content when refreshed.

# 18. Important product decisions

### Decision 1: One universal inbox

Do not build separate storage systems for articles, journals, voice notes and ideas.

Everything enters the same knowledge system, with a source type identifying where it originated.

### Decision 2: Preserve original information

AI summaries should never replace original content.

Always preserve:
- Original text.
- Original URL.
- Original source.
- Capture timestamp.

### Decision 3: AI should enrich, not control

Users should be able to edit titles, summaries, tags and relationships.

AI suggestions should remain editable.

### Decision 4: Visual consumption is a core feature

Do not treat infographics and swipeable cards as optional decoration.

This is a major product differentiator.

### Decision 5: Capture speed is more important than complexity

The first interaction should take less than five seconds whenever possible.

# 19. Future product roadmap

Once the MVP is working, evolve Life OS in four stages.

**Stage 1 — Universal Capture**

- iOS share sheet.
- Mac menu bar.
- Browser extension.
- Voice capture.
- Social media capture.
- AI chat import.
- Website and article extraction.

**Stage 2 — Personal Knowledge Intelligence**

- Semantic search.
- Knowledge graph.
- Automatic relationship discovery.
- Knowledge clustering.
- Personal AI memory.
- Cross-source insights.
- Conversational retrieval.

**Stage 3 — Visual Knowledge OS**

- Interactive mind maps.
- Auto-generated infographics.
- Visual learning journeys.
- Swipeable discovery feed.
- Topic-based knowledge magazines.
- Timeline of ideas.
- Shareable knowledge collections.

**Stage 4 — Personal Life OS**

- Journaling.
- Goals and habits.
- Reminders.
- Personal projects.
- Decision history.
- Daily and weekly reflections.
- AI-powered recommendations.
- Knowledge-to-action workflows.

The long-term goal is to make Life OS a personal intelligence layer that understands what you consume, what you think about, what you are learning and what you want to accomplish.

# 20. Instructions to the AI coding agent

You are building Life OS, an AI-powered personal knowledge operating system.

Your immediate objective is to deliver a working hackathon prototype within two hours.

Follow these instructions strictly:

1. Start by inspecting the existing repository and understanding the current setup.
2. Reuse existing dependencies and components wherever possible.
3. Do not waste time setting up complicated infrastructure.
4. Use Next.js, React, TypeScript and Tailwind if the project does not already have a stack.
5. Prioritise a mobile-first responsive PWA.
6. Build the home dashboard and universal capture interface first.
7. Use local persistence so the application works without backend configuration.
8. Implement a reusable AI processing service with a mock fallback.
9. Make the knowledge graph interactive using React Flow.
10. Implement a polished swipeable knowledge explorer.
11. Use realistic demo content to demonstrate interconnected knowledge.
12. Make every primary button functional.
13. Do not create non-functional decorative controls.
14. Avoid unnecessary configuration and infrastructure.
15. Do not attempt to build native applications, complex scraping or third-party OAuth integrations.
16. Do not spend the entire time perfecting the architecture.
17. Prioritise a complete end-to-end experience over isolated features.
18. Keep the application easy to extend after the hackathon.

### Required final deliverable

The application must demonstrate this complete loop:

**Capture → AI Process → Structure → Connect → Visualise → Explore → Retrieve → Share**

### Definition of done

A user should be able to open Life OS on a mobile screen, capture a thought or URL, see it transformed into structured knowledge, explore its connections in a graph, browse it as a visual card and share the result.

That is the MVP.

Do not expand the scope until this entire loop works.

---

# Final product positioning

**Life OS — Your life, your knowledge, one intelligent system.**

We don't need another place to save bookmarks or write notes.

We need a system that remembers what we consume, understands what matters, connects what we learn and helps us rediscover it when we need it.

**Capture everything. Connect the dots. Never lose an idea.**