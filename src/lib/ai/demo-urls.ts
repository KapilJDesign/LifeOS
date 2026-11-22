import { normalizeUrl } from "../capture/url-detector";
import type { PlatformKey } from "../../types/knowledge";
import type { ProcessingOutput } from "./schema";

/**
 * Curated metadata for a few known demo URLs so the end-to-end demo is stable and offline.
 * We deliberately do not scrape YouTube or Instagram; anything not listed here goes through the heuristics.
 */
const DEMO_METADATA: Record<string, Omit<ProcessingOutput, "url" | "source">> = {
  "https://youtube.com/watch?v=lifeos-demo-agents": {
    title: "How AI Agents Actually Work: Plan, Act, Reflect",
    content_type: "video",
    summary:
      "A walkthrough of the agent loop: a model plans, calls tools, observes the result and iterates until the goal is met. It explains why tool design and context quality matter more than raw model size.",
    key_takeaways: [
      "Agents can plan and execute multi-step tasks",
      "Tools extend what an agent can do",
      "Good context improves every decision the agent makes",
    ],
    concepts: ["AI Agents", "Tool Calling", "MCP", "Context Engineering", "Automation"],
    tags: ["AI", "Agents", "Automation", "Video"],
    actions: ["Explore building a small agent with one tool this weekend"],
    related_topics: ["AI Workflows", "Developer Tools"],
  },
  "https://instagram.com/reel/LifeOSDemoCtx": {
    title: "Context engineering in 60 seconds",
    content_type: "reel",
    summary:
      "A short reel arguing that most bad AI output is a context problem: decide what the model should see, in what order, and what to leave out.",
    key_takeaways: [
      "Curate context instead of writing longer prompts",
      "Retrieval beats stuffing everything into the window",
      "Test prompts like code, with examples",
    ],
    concepts: ["Context Engineering", "AI Agents", "AI Workflows"],
    tags: ["AI", "Prompting", "Reel"],
    actions: ["Rewrite one of my prompts with only the context it needs"],
    related_topics: ["MCP", "Tool Calling"],
  },
  "https://designsystems.example.com/scaling-design-systems-in-the-enterprise": {
    title: "Scaling a design system across an enterprise",
    content_type: "article",
    summary:
      "How a central design system team keeps hundreds of product teams consistent: tokens as the contract, contribution models, and measuring adoption by quality, not component count.",
    key_takeaways: [
      "Design tokens are the contract between design and code",
      "Adoption grows when contributing is easy",
      "Measure the quality of shipped UI, not only component usage",
    ],
    concepts: ["Design Systems", "Design Quality", "Product Design"],
    tags: ["Design", "Enterprise", "Article"],
    actions: ["Audit our token naming against this model"],
    related_topics: ["User Research"],
  },
  "https://open.spotify.com/episode/lifeosdemosaas": {
    title: "The Future of SaaS in an Agent World",
    content_type: "podcast",
    summary:
      "A podcast conversation on how autonomous agents could unbundle seat-based software and push pricing towards outcomes, and what small teams can build in the gap.",
    key_takeaways: [
      "Seat-based pricing weakens when agents do the work",
      "Outcome-based pricing aligns cost with value",
      "Niche workflow products are easier to defend than general tools",
    ],
    concepts: ["Future of SaaS", "AI Agents", "Automation", "Product Ideas"],
    tags: ["Business", "SaaS", "Podcast"],
    actions: ["Sketch one outcome-priced product idea"],
    related_topics: ["Productivity"],
  },
};

export interface DemoCaptureLink {
  label: string;
  url: string;
  platform: PlatformKey;
}

/** Links the capture UI can offer as "Try a sample link". */
export const DEMO_CAPTURE_URLS: DemoCaptureLink[] = [
  { label: "How AI agents actually work (YouTube)", url: "https://www.youtube.com/watch?v=lifeos-demo-agents", platform: "youtube" },
  { label: "Context engineering in 60 seconds (Instagram)", url: "https://www.instagram.com/reel/LifeOSDemoCtx/", platform: "instagram" },
  { label: "Scaling a design system (article)", url: "https://designsystems.example.com/scaling-design-systems-in-the-enterprise", platform: "website" },
  { label: "The future of SaaS (podcast)", url: "https://open.spotify.com/episode/lifeosdemosaas", platform: "spotify" },
];

export function lookupDemoMetadata(url: string | undefined): Omit<ProcessingOutput, "url" | "source"> | undefined {
  if (!url) return undefined;
  const key = normalizeUrl(url);
  return key ? DEMO_METADATA[key] : undefined;
}
