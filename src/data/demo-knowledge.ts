import { CONCEPT_LEXICON } from "../lib/ai/lexicon";
import { reconcileConceptItemIds } from "../lib/graph/concepts";
import { slugify } from "../lib/ids";
import type {
  HistoryEntry,
  KnowledgeConcept,
  KnowledgeItem,
  KnowledgeRelationship,
  Reminder,
  TopicCollection,
} from "../types/knowledge";

export interface DemoKnowledge {
  items: KnowledgeItem[];
  concepts: KnowledgeConcept[];
  relationships: KnowledgeRelationship[];
  topics: TopicCollection[];
  reminders: Reminder[];
  history: HistoryEntry[];
}

/** Bump to ship new demo content to fresh installs. Existing user data is never overwritten. */
export const SEED_VERSION = 1;

const DAY_MS = 86_400_000;

type SeedItem = Omit<KnowledgeItem, "status" | "origin" | "createdAt" | "updatedAt" | "review" | "isFavorite" | "processing" | "actions" | "platform"> &
  Partial<Pick<KnowledgeItem, "isFavorite" | "actions" | "platform">> & { savedDaysAgo: number; views?: { count: number; lastDaysAgo: number } };

const SOURCE_PLATFORM: Record<KnowledgeItem["sourceType"], KnowledgeItem["platform"]> = {
  text: "text",
  voice: "voice",
  journal: "journal",
  chat: "chat",
  youtube: "youtube",
  instagram: "instagram",
  website: "website",
  podcast: "podcast",
};

export function createDemoKnowledge(now: Date = new Date()): DemoKnowledge {
  const at = (daysAgo: number, hour = 9) => {
    const date = new Date(now.getTime() - daysAgo * DAY_MS);
    date.setHours(hour, 15, 0, 0);
    return date.toISOString();
  };

  const seeds: SeedItem[] = [
    {
      id: "item-ai-agents",
      title: "Understanding AI agents",
      content:
        "Notes from a talk on autonomous agents. An agent is a model in a loop: it plans a step, calls a tool, reads the result and decides what to do next. The speaker argued that most agent failures are context failures rather than model failures, and that tools should be small and well described. Worth trying: build a tiny agent with one tool before reaching for a framework.",
      summary: "An introduction to autonomous AI agents: a model that plans, calls tools and iterates until the goal is met.",
      sourceType: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=lifeos-seed-agents",
      sourceName: "YouTube",
      contentKind: "video",
      tags: ["AI", "Agents", "Automation", "Video"],
      concepts: ["ai-agents", "tool-calling", "context-engineering", "automation"],
      keyTakeaways: [
        "Agents can plan and execute multi-step tasks",
        "Small, well-described tools beat large ones",
        "Most agent failures are context failures, not model failures",
      ],
      actions: ["Build a tiny agent with one tool"],
      savedDaysAgo: 12,
      isFavorite: true,
      views: { count: 2, lastDaysAgo: 4 },
    },
    {
      id: "item-mcp",
      title: "Model Context Protocol (MCP)",
      content:
        "MCP is an open protocol that standardises how AI applications connect to external tools and data. A host application talks to MCP servers that expose tools, resources and prompts. Instead of writing a custom integration for every pairing of app and tool, you implement the protocol once.",
      summary: "An open protocol that lets AI applications use tools and data through one standard interface.",
      sourceType: "website",
      sourceUrl: "https://modelcontextprotocol.io/introduction",
      sourceName: "modelcontextprotocol.io",
      contentKind: "article",
      tags: ["AI", "Protocols", "Developer Tools"],
      concepts: ["mcp", "tool-calling", "ai-agents", "developer-tools"],
      keyTakeaways: [
        "One protocol replaces many bespoke integrations",
        "Servers expose tools, resources and prompts",
        "The host decides what the model is allowed to call",
      ],
      savedDaysAgo: 10,
      views: { count: 1, lastDaysAgo: 9 },
    },
    {
      id: "item-context-engineering",
      title: "Context engineering beats prompt tweaking",
      content:
        "Writing a clever prompt is the smallest part of getting good results from a model. The bigger lever is context: which documents are retrieved, how history is summarised, which tools are described and in what order. Treat the context window as a budget and measure what each token buys.",
      summary: "The quality of AI output depends mostly on what you put in the context, not on prompt wording.",
      sourceType: "website",
      sourceUrl: "https://blog.example.com/context-engineering",
      sourceName: "blog.example.com",
      contentKind: "article",
      tags: ["AI", "Prompting"],
      concepts: ["context-engineering", "ai-agents", "ai-workflows"],
      keyTakeaways: [
        "Context is the bigger lever than prompt wording",
        "Treat the context window as a budget",
        "Measure what each piece of context contributes",
      ],
      savedDaysAgo: 9,
    },
    {
      id: "item-local-llms",
      title: "Running local LLMs on a laptop",
      content:
        "Quantised open-weight models now run comfortably on a modern laptop, and tools such as Ollama make installation a one-line command. The trade-off is quality against privacy and cost: for private notes and offline work a small local model is often enough.",
      summary: "Small open-weight models run well on laptops and are good enough for private, offline tasks.",
      sourceType: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=lifeos-seed-local",
      sourceName: "YouTube",
      contentKind: "video",
      tags: ["AI", "Privacy", "Open Source", "Video"],
      concepts: ["local-llms", "privacy", "ai"],
      keyTakeaways: [
        "Quantised models fit on everyday hardware",
        "Local models trade some quality for privacy and zero running cost",
        "Good fit for private notes and offline use",
      ],
      actions: ["Try a local model for summarising my notes"],
      savedDaysAgo: 8,
    },
    {
      id: "item-ai-assisted-dev",
      title: "AI-assisted development: specify, then review",
      content:
        "The reel's point: with coding assistants the skill shifts from typing to specifying and reviewing. Write the intent clearly, let the assistant draft, then review the diff like a teammate's pull request. Small steps keep reviews cheap.",
      summary: "With coding assistants, the skill moves from typing code to specifying intent and reviewing output.",
      sourceType: "instagram",
      sourceUrl: "https://www.instagram.com/reel/LifeOSSeedDev/",
      sourceName: "Instagram",
      contentKind: "reel",
      tags: ["AI", "Developer Tools", "Engineering", "Reel"],
      concepts: ["ai-assisted-development", "developer-tools", "ai-agents", "productivity"],
      keyTakeaways: [
        "Specify intent clearly before generating code",
        "Review assistant output like a teammate's pull request",
        "Small steps keep reviews cheap",
      ],
      savedDaysAgo: 6,
      views: { count: 3, lastDaysAgo: 1 },
    },
    {
      id: "item-enterprise-design-systems",
      title: "Enterprise design systems: governance without friction",
      content:
        "A design system succeeds when teams find it easier to use than to avoid. Tokens carry decisions, components carry behaviour, and a clear contribution path keeps the system honest. Governance should unblock teams, not gate them.",
      summary: "Enterprise design systems work when adoption is easier than avoidance and governance removes blockers.",
      sourceType: "website",
      sourceUrl: "https://designsystems.example.com/enterprise-governance",
      sourceName: "designsystems.example.com",
      contentKind: "article",
      tags: ["Design", "Design Systems", "Enterprise"],
      concepts: ["design-systems", "design-quality", "product-design"],
      keyTakeaways: [
        "Tokens carry decisions, components carry behaviour",
        "A clear contribution path keeps the system honest",
        "Governance should unblock, not gate",
      ],
      savedDaysAgo: 20,
      views: { count: 1, lastDaysAgo: 18 },
    },
    {
      id: "item-ai-product-design",
      title: "AI in product design: from mockups to systems thinking",
      content:
        "AI speeds up exploration: variants, copy and first drafts arrive in seconds. The designer's job moves to framing the problem, curating options and holding the quality bar. Systems with strong tokens and components make AI output far more consistent.",
      summary: "AI accelerates exploration while designers focus on framing, curation and the quality bar.",
      sourceType: "website",
      sourceUrl: "https://designsystems.example.com/ai-in-product-design",
      sourceName: "designsystems.example.com",
      contentKind: "article",
      tags: ["Design", "AI", "Product"],
      concepts: ["product-design", "ai", "design-systems", "design-quality"],
      keyTakeaways: [
        "AI speeds up exploration, not judgement",
        "Designers move towards framing and curation",
        "Strong tokens and components make AI output consistent",
      ],
      savedDaysAgo: 5,
    },
    {
      id: "item-design-quality",
      title: "Design quality is a habit, not a phase",
      content:
        "Quality shows up in details nobody asked for: focus states, empty states, error messages, motion that respects reduced-motion settings. A quality bar that is written down and checked in review beats a polish pass at the end.",
      summary: "Quality comes from a written bar checked in every review, not from a final polish pass.",
      sourceType: "text",
      sourceName: "Note",
      contentKind: "note",
      tags: ["Design", "Quality"],
      concepts: ["design-quality", "design-systems", "product-design"],
      keyTakeaways: [
        "Quality lives in the details nobody asked for",
        "Write the quality bar down and check it in review",
        "Polish at the end is too late",
      ],
      actions: ["Write a one-page quality bar for my next project"],
      savedDaysAgo: 15,
      isFavorite: true,
      views: { count: 2, lastDaysAgo: 6 },
    },
    {
      id: "item-user-research",
      title: "User research that changes decisions",
      content:
        "Five good interviews beat fifty assumptions. Ask about past behaviour instead of future intentions, record exact quotes, and bring the team to at least one session so findings are believed. Share a one-page readout within two days.",
      summary: "Short, behaviour-focused research with the team present is what changes product decisions.",
      sourceType: "podcast",
      sourceUrl: "https://podcasts.apple.com/podcast/lifeos-seed-research/id0000000001",
      sourceName: "Apple Podcasts",
      platform: "apple-podcasts",
      contentKind: "podcast",
      tags: ["Design", "Research", "Podcast"],
      concepts: ["user-research", "product-design"],
      keyTakeaways: [
        "Ask about past behaviour, not future intentions",
        "Bring the team to at least one session",
        "Share a one-page readout within two days",
      ],
      savedDaysAgo: 25,
    },
    {
      id: "item-future-saas",
      title: "The future of SaaS in an agent world",
      content:
        "If agents do the work inside software, seat-based pricing weakens. Expect pricing to move towards outcomes, and expect thin, specialised workflow products to win niches that large suites ignore.",
      summary: "Agents may shift SaaS pricing from seats to outcomes and favour specialised workflow products.",
      sourceType: "website",
      sourceUrl: "https://x.com/example/status/1000000000000000001",
      sourceName: "X",
      platform: "x",
      contentKind: "link",
      tags: ["Business", "SaaS", "Strategy"],
      concepts: ["future-of-saas", "ai-agents", "automation", "product-ideas"],
      keyTakeaways: [
        "Seat-based pricing weakens when agents do the work",
        "Pricing moves towards outcomes",
        "Specialised workflow products can win niches",
      ],
      savedDaysAgo: 18,
      views: { count: 1, lastDaysAgo: 17 },
    },
    {
      id: "item-personal-knowledge-system",
      title: "Building a personal knowledge system",
      content:
        "Idea: one inbox for everything I read, watch and think. AI structures each item, links it to what I already know and brings it back when it is relevant. The graph matters less than the revisit loop: notes only help if they return at the right moment.",
      summary: "One inbox, AI structuring and a revisit loop are what make a personal knowledge system useful.",
      sourceType: "text",
      sourceName: "Note",
      contentKind: "idea",
      tags: ["Productivity", "Knowledge", "Ideas"],
      concepts: ["personal-knowledge-management", "ai", "productivity", "product-ideas"],
      keyTakeaways: [
        "One inbox for everything",
        "The revisit loop matters more than the graph",
        "Notes only help if they return at the right moment",
      ],
      savedDaysAgo: 14,
      isFavorite: true,
      views: { count: 4, lastDaysAgo: 2 },
    },
    {
      id: "item-business-automation",
      title: "Business automation: start with the boring 20%",
      content:
        "Pick the repetitive steps that touch the most people: approvals, status updates, data entry. Automate those first, add a human check where errors are costly, and measure hours returned rather than tasks automated.",
      summary: "Automate the repetitive steps that touch most people first, and measure hours returned.",
      sourceType: "website",
      sourceUrl: "https://ops.example.com/business-automation-basics",
      sourceName: "ops.example.com",
      contentKind: "article",
      tags: ["Automation", "Productivity", "Business"],
      concepts: ["automation", "ai-workflows", "productivity"],
      keyTakeaways: [
        "Start with repetitive steps that touch the most people",
        "Keep a human check where errors are costly",
        "Measure hours returned, not tasks automated",
      ],
      savedDaysAgo: 11,
    },
    {
      id: "item-daily-journal",
      title: "Journal: a day of connecting dots",
      content:
        "Today I noticed that three unrelated things I saved this month are really the same idea: give the model better context and let it use tools. I felt energised after the design review, and I want to protect Friday mornings for deep work. Lesson: write down the question before opening the laptop.",
      summary: "A reflection linking recent saves about context and tools, with a plan to protect deep-work time.",
      sourceType: "journal",
      sourceName: "Journal",
      contentKind: "journal",
      tags: ["Journal", "Personal Development"],
      concepts: ["journaling", "productivity", "context-engineering", "personal-knowledge-management"],
      keyTakeaways: [
        "Several saves share one idea: context plus tools",
        "Protect Friday mornings for deep work",
        "Write the question down before opening the laptop",
      ],
      actions: ["Protect Friday mornings for deep work"],
      savedDaysAgo: 2,
    },
    {
      id: "item-voice-idea",
      title: "Voice note: weekly digest of what I saved",
      content:
        "Idea for a product: every Sunday it sends me a short digest of what I saved that week, grouped by topic, with one question to reflect on. It should link back to the original sources and show what I have not opened yet.",
      summary: "A product idea for a weekly digest of saved items, grouped by topic with a reflection question.",
      sourceType: "voice",
      sourceName: "Voice note",
      contentKind: "voice_note",
      tags: ["Ideas", "Product", "Voice note"],
      concepts: ["product-ideas", "personal-knowledge-management", "productivity", "ai"],
      keyTakeaways: [
        "A Sunday digest grouped by topic",
        "End each digest with one reflection question",
        "Show what has not been opened yet",
      ],
      actions: ["Sketch the weekly digest layout"],
      savedDaysAgo: 1,
    },
  ];

  const items: KnowledgeItem[] = seeds.map((seed) => {
    const { savedDaysAgo, views, platform, isFavorite, actions, ...rest } = seed;
    const createdAt = at(savedDaysAgo);
    const lastViewedAt = views ? at(views.lastDaysAgo, 18) : undefined;
    return {
      ...rest,
      platform: platform ?? SOURCE_PLATFORM[seed.sourceType],
      actions: actions ?? [],
      isFavorite: isFavorite ?? false,
      createdAt,
      updatedAt: createdAt,
      status: "ready",
      origin: "seed",
      review: views
        ? {
            viewCount: views.count,
            firstViewedAt: at(Math.min(savedDaysAgo, views.lastDaysAgo + 3), 18),
            lastViewedAt,
            nextReviewAt: new Date(new Date(lastViewedAt!).getTime() + 7 * DAY_MS).toISOString(),
          }
        : { viewCount: 0 },
      processing: { provider: "seed", usedFallback: false, completedAt: createdAt, attempts: 1 },
    };
  });

  const concepts = reconcileConceptItemIds(
    CONCEPT_LEXICON.map((entry) => ({
      id: slugify(entry.name),
      name: entry.name,
      description: entry.description,
      aliases: entry.aliases,
      itemIds: [],
    })),
    items,
  );

  const rel = (
    sourceId: string,
    relationship: KnowledgeRelationship["relationship"],
    targetId: string,
    kinds: [KnowledgeRelationship["sourceKind"], KnowledgeRelationship["targetKind"]] = ["concept", "concept"],
  ): KnowledgeRelationship => ({
    id: `rel-${sourceId}-${relationship}-${targetId}`,
    sourceId,
    sourceKind: kinds[0],
    targetId,
    targetKind: kinds[1],
    relationship,
    origin: "seed",
  });

  const relationships: KnowledgeRelationship[] = [
    rel("ai-agents", "part_of", "ai"),
    rel("local-llms", "part_of", "ai"),
    rel("mcp", "supports", "ai-agents"),
    rel("tool-calling", "part_of", "ai-agents"),
    rel("mcp", "supports", "tool-calling"),
    rel("context-engineering", "supports", "ai-agents"),
    rel("ai-agents", "supports", "automation"),
    rel("ai-workflows", "part_of", "automation"),
    rel("automation", "supports", "productivity"),
    rel("context-engineering", "related", "ai-workflows"),
    rel("ai-assisted-development", "inspired_by", "ai-agents"),
    rel("ai-assisted-development", "related", "developer-tools"),
    rel("mcp", "related", "developer-tools"),
    rel("privacy", "related", "local-llms"),
    rel("design-systems", "part_of", "product-design"),
    rel("design-systems", "supports", "design-quality"),
    rel("design-quality", "supports", "product-design"),
    rel("user-research", "supports", "product-design"),
    rel("ai", "related", "product-design"),
    rel("future-of-saas", "inspired_by", "ai-agents"),
    rel("future-of-saas", "related", "automation"),
    rel("future-of-saas", "related", "product-ideas"),
    rel("personal-knowledge-management", "supports", "productivity"),
    rel("journaling", "related", "personal-knowledge-management"),
    rel("product-ideas", "related", "personal-knowledge-management"),
    rel("item-voice-idea", "inspired_by", "item-personal-knowledge-system", ["item", "item"]),
    rel("item-daily-journal", "related", "item-ai-agents", ["item", "item"]),
    rel("item-ai-product-design", "supports", "item-enterprise-design-systems", ["item", "item"]),
    rel("item-mcp", "part_of", "item-ai-agents", ["item", "item"]),
  ];

  const topics: TopicCollection[] = [
    {
      id: "ai-emerging-tech",
      name: "AI & Emerging Technology",
      description: "Agents, protocols, context and models: how AI systems are built and used.",
      icon: "brain-circuit",
      conceptIds: ["ai", "ai-agents", "mcp", "tool-calling", "context-engineering", "local-llms", "ai-assisted-development", "developer-tools", "ai-workflows", "privacy"],
    },
    {
      id: "product-design",
      name: "Product Design",
      description: "Design systems, quality and research that shape how products feel.",
      icon: "design-ideas",
      conceptIds: ["design-systems", "product-design", "design-quality", "user-research"],
    },
    {
      id: "business-ideas",
      name: "Business Ideas",
      description: "Where software and automation are heading, and what could be built.",
      icon: "lightbulb",
      conceptIds: ["future-of-saas", "product-ideas", "automation"],
    },
    {
      id: "productivity",
      name: "Productivity",
      description: "Systems and habits for getting meaningful work done.",
      icon: "task-list",
      conceptIds: ["productivity", "personal-knowledge-management", "automation", "ai-workflows"],
    },
    {
      id: "personal-development",
      name: "Personal Development",
      description: "Reflections, lessons and routines worth keeping.",
      icon: "person-heart",
      conceptIds: ["journaling", "personal-knowledge-management", "productivity"],
    },
  ];

  const reminders: Reminder[] = [
    {
      id: "reminder-local-agent",
      title: "Explore building a local AI agent this weekend",
      description: "Start with one tool and a local model.",
      dueAt: new Date(now.getTime() + 3 * DAY_MS).toISOString(),
      completed: false,
      sourceItemId: "item-ai-agents",
      createdAt: at(4),
      confirmed: true,
    },
    {
      id: "reminder-quality-bar",
      title: "Write a one-page quality bar for my next project",
      dueAt: new Date(now.getTime() + 5 * DAY_MS).toISOString(),
      completed: false,
      sourceItemId: "item-design-quality",
      createdAt: at(1),
      confirmed: false,
    },
    {
      id: "reminder-read-mcp",
      title: "Read the MCP introduction",
      completed: true,
      completedAt: at(9, 20),
      sourceItemId: "item-mcp",
      createdAt: at(10),
      confirmed: true,
    },
  ];

  let counter = 0;
  const history: HistoryEntry[] = items.flatMap((item) => {
    const { viewCount, lastViewedAt, firstViewedAt } = item.review;
    if (!viewCount || !lastViewedAt || !firstViewedAt) return [];
    const entries: HistoryEntry[] = [];
    for (let i = 0; i < viewCount; i += 1) {
      const t = viewCount === 1 ? lastViewedAt : new Date(new Date(firstViewedAt).getTime() + ((new Date(lastViewedAt).getTime() - new Date(firstViewedAt).getTime()) * i) / (viewCount - 1)).toISOString();
      counter += 1;
      entries.push({ id: `history-seed-${counter}`, itemId: item.id, viewedAt: t, via: i % 2 === 0 ? "explore" : "detail" });
    }
    return entries;
  });

  return { items, concepts, relationships, topics, reminders, history };
}
