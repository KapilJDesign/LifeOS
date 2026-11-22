/**
 * Concept lexicon shared by the deterministic mock processor and the demo seed.
 * `keywords` drive heuristic matching; `insight` is a one-line takeaway the mock
 * uses when a capture has no readable body (for example a bare URL).
 */
export interface LexiconEntry {
  name: string;
  aliases: string[];
  keywords: string[];
  tags: string[];
  description: string;
  insight: string;
  /** Names of concepts that are usually connected to this one. */
  related: string[];
}

export const CONCEPT_LEXICON: LexiconEntry[] = [
  {
    name: "AI",
    aliases: ["Artificial Intelligence", "Generative AI"],
    keywords: ["ai", "artificial intelligence", "generative ai", "llm", "llms", "machine learning", "gpt"],
    tags: ["AI", "Technology"],
    description: "Artificial intelligence broadly: models, applications and the changes they bring to work.",
    insight: "Modern AI shifts effort from writing instructions to describing outcomes.",
    related: ["AI Agents", "Local LLMs"],
  },
  {
    name: "AI Agents",
    aliases: ["Agentic AI", "Autonomous Agents", "Agents"],
    keywords: ["agent", "agents", "agentic", "autonomous agent", "multi-agent"],
    tags: ["AI", "Agents", "Automation"],
    description: "Systems where a model plans, calls tools and iterates towards a goal with limited supervision.",
    insight: "Agents combine planning, tools and memory to finish multi-step tasks.",
    related: ["MCP", "Tool Calling", "Automation"],
  },
  {
    name: "MCP",
    aliases: ["Model Context Protocol"],
    keywords: ["mcp", "model context protocol"],
    tags: ["AI", "Protocols", "Developer Tools"],
    description: "An open protocol that lets AI applications connect to tools and data sources in a standard way.",
    insight: "One standard protocol replaces many one-off tool integrations.",
    related: ["Tool Calling", "AI Agents", "Developer Tools"],
  },
  {
    name: "Tool Calling",
    aliases: ["Function Calling", "Tool Use"],
    keywords: ["tool calling", "function calling", "tool use", "tool call", "tool calls"],
    tags: ["AI", "Agents", "Developer Tools"],
    description: "A model requesting that external functions or APIs run on its behalf.",
    insight: "Tools turn a text-only model into something that can act.",
    related: ["MCP", "AI Agents"],
  },
  {
    name: "Context Engineering",
    aliases: ["Prompt Engineering", "Context Windows"],
    keywords: ["context engineering", "context window", "prompt engineering", "prompt", "prompts", "retrieval", "rag"],
    tags: ["AI", "Prompting"],
    description: "Choosing and shaping the information a model sees so it can act reliably.",
    insight: "Output quality is mostly decided by what you put in the context.",
    related: ["AI Agents", "AI Workflows"],
  },
  {
    name: "Automation",
    aliases: ["Business Automation", "Workflow Automation"],
    keywords: ["automation", "automate", "automating", "automated", "zapier", "n8n"],
    tags: ["Automation", "Productivity", "Business"],
    description: "Replacing repeated manual steps with triggers, rules and software.",
    insight: "Automate the repeatable parts so attention goes to judgement.",
    related: ["AI Workflows", "Productivity", "AI Agents"],
  },
  {
    name: "AI Workflows",
    aliases: ["Agentic Workflows", "LLM Pipelines"],
    keywords: ["workflow", "workflows", "pipeline", "pipelines", "orchestration"],
    tags: ["AI", "Automation", "Workflows"],
    description: "Chained, repeatable sequences of model calls and tools.",
    insight: "Reliable AI work usually comes from a fixed workflow, not one giant prompt.",
    related: ["Automation", "Context Engineering"],
  },
  {
    name: "Local LLMs",
    aliases: ["On-device Models", "Open-weight Models", "Ollama"],
    keywords: ["local llm", "local llms", "local model", "local models", "ollama", "llama", "on-device", "open-weight", "open weights", "quantized", "quantised", "gguf", "run models locally"],
    tags: ["AI", "Privacy", "Open Source"],
    description: "Running language models on your own hardware for privacy, cost and control.",
    insight: "Small local models are now good enough for private, offline tasks.",
    related: ["Privacy", "AI"],
  },
  {
    name: "AI-Assisted Development",
    aliases: ["Vibe Coding", "AI Coding", "Copilot"],
    keywords: ["ai-assisted", "vibe coding", "copilot", "coding assistant", "ai coding", "pair programming", "code generation"],
    tags: ["AI", "Developer Tools", "Engineering"],
    description: "Using AI pair-programmers and agents to design, write and review software.",
    insight: "The bottleneck moves from typing code to specifying and reviewing it.",
    related: ["Developer Tools", "AI Agents"],
  },
  {
    name: "Developer Tools",
    aliases: ["DevTools", "Developer Experience"],
    keywords: ["developer tools", "devtools", "sdk", "developer experience"],
    tags: ["Developer Tools", "Engineering"],
    description: "Tooling that makes building and shipping software faster.",
    insight: "Good developer tools remove friction before they add features.",
    related: ["AI-Assisted Development", "MCP"],
  },
  {
    name: "Design Systems",
    aliases: ["Component Library", "Design Tokens", "Enterprise Design Systems"],
    keywords: ["design system", "design systems", "design tokens", "component library", "fluent ui", "storybook"],
    tags: ["Design", "Design Systems", "Enterprise"],
    description: "Shared components, tokens and guidance that keep products consistent at scale.",
    insight: "A design system is a product with its own users: the teams that adopt it.",
    related: ["Design Quality", "Product Design"],
  },
  {
    name: "Product Design",
    aliases: ["UX Design", "UI Design", "AI in Product Design"],
    keywords: ["product design", "ux", "ui design", "interface", "prototype", "figma", "designer", "designers"],
    tags: ["Design", "Product"],
    description: "Shaping how a product looks, feels and works for the people using it.",
    insight: "Design is deciding what to leave out, then making the rest obvious.",
    related: ["Design Systems", "User Research", "Design Quality"],
  },
  {
    name: "Design Quality",
    aliases: ["Craft", "Polish"],
    keywords: ["design quality", "craft", "polish", "pixel", "fit and finish", "accessibility", "quality bar"],
    tags: ["Design", "Quality"],
    description: "The standard of craft that makes a product feel considered rather than assembled.",
    insight: "Quality is the sum of small details nobody asked for explicitly.",
    related: ["Design Systems", "Product Design"],
  },
  {
    name: "User Research",
    aliases: ["UX Research", "Usability Testing"],
    keywords: ["user research", "interview", "interviews", "usability", "survey", "customer discovery", "user testing"],
    tags: ["Design", "Research"],
    description: "Learning what people actually need through interviews, observation and testing.",
    insight: "Five good interviews beat fifty assumptions.",
    related: ["Product Design"],
  },
  {
    name: "Future of SaaS",
    aliases: ["SaaS", "Software as a Service"],
    keywords: ["saas", "software as a service", "subscription software", "per-seat", "seat-based"],
    tags: ["Business", "SaaS", "Strategy"],
    description: "How agents and AI change what business software is and how it is sold.",
    insight: "When agents do the work, pricing shifts from seats to outcomes.",
    related: ["AI Agents", "Automation", "Product Ideas"],
  },
  {
    name: "Productivity",
    aliases: ["Personal Productivity", "Getting Things Done"],
    keywords: ["productivity", "productive", "focus", "habit", "habits", "routine", "time management", "gtd"],
    tags: ["Productivity", "Personal Development"],
    description: "Doing meaningful work with less friction and more focus.",
    insight: "Protect attention first; tools come second.",
    related: ["Automation", "Personal Knowledge Management"],
  },
  {
    name: "Personal Knowledge Management",
    aliases: ["PKM", "Second Brain", "Note-taking"],
    keywords: ["second brain", "pkm", "personal knowledge", "knowledge base", "note-taking", "note taking", "zettelkasten", "knowledge graph", "knowledge system"],
    tags: ["Productivity", "Knowledge", "Learning"],
    description: "Capturing, connecting and revisiting what you learn so it compounds.",
    insight: "Notes only help if they come back to you at the right moment.",
    related: ["Productivity", "Journaling"],
  },
  {
    name: "Journaling",
    aliases: ["Reflection", "Daily Journal"],
    keywords: ["journal", "journaling", "reflection", "grateful", "gratitude", "today i", "i felt", "lessons learned", "diary"],
    tags: ["Journal", "Personal Development"],
    description: "Writing down experiences and reflections to notice patterns over time.",
    insight: "Reflection turns experience into learning.",
    related: ["Personal Knowledge Management", "Productivity"],
  },
  {
    name: "Product Ideas",
    aliases: ["Startup Ideas", "Business Ideas"],
    keywords: ["idea", "ideas", "startup", "product idea", "build a product", "side project", "mvp", "business idea"],
    tags: ["Ideas", "Business"],
    description: "Seeds for products and businesses worth exploring.",
    insight: "Write ideas down the moment they appear; judge them later.",
    related: ["Future of SaaS", "Personal Knowledge Management"],
  },
  {
    name: "Privacy",
    aliases: ["Data Privacy", "Data Ownership"],
    keywords: ["privacy", "private", "on-device", "data ownership", "gdpr", "offline", "self-hosted"],
    tags: ["Privacy", "Security"],
    description: "Keeping personal data under the owner's control.",
    insight: "Local-first designs make privacy the default rather than a setting.",
    related: ["Local LLMs"],
  },
];

export function findLexiconEntry(name: string): LexiconEntry | undefined {
  const needle = name.trim().toLowerCase();
  return CONCEPT_LEXICON.find(
    (entry) => entry.name.toLowerCase() === needle || entry.aliases.some((alias) => alias.toLowerCase() === needle),
  );
}
