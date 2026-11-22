/* Life OS prototype — seeded content (brief §15).
   Shapes follow brief §9 (KnowledgeItem, KnowledgeConcept, KnowledgeRelationship,
   Reminder). Fields the UI needs beyond the brief are flagged "ext" and listed
   in the "Data the UI needs" section of 0_Requirements/LifeOS-Design.md.
   Example hosts use the reserved .example TLD; no real publishers are implied. */
(function () {
  const LO = (window.LO = window.LO || {});

  LO.topics = [
    { id: "ai", name: "AI & Emerging Tech", short: "AI & Tech", tone: "mint", art: "agents", desc: "Agents, protocols and the tooling around them: how software starts to act on your behalf." },
    { id: "design", name: "Product Design", short: "Design", tone: "steel", art: "design", desc: "Systems, quality and research, and how AI is reshaping the craft." },
    { id: "biz", name: "Business & Ideas", short: "Business", tone: "sand", art: "saas", desc: "Where SaaS is heading and the automations worth building first." },
    { id: "pk", name: "Personal Knowledge", short: "Personal", tone: "rose", art: "journal", desc: "Journals, voice notes and the ideas you keep coming back to." }
  ];
  LO.topicById = (id) => LO.topics.find((t) => t.id === id);

  /* KnowledgeConcept (+ ext: topic, desc, pos for the seeded graph layout) */
  LO.concepts = [
    { id: "agents", name: "AI Agents", topic: "ai", x: 300, y: 230, desc: "Software that plans, uses tools and acts in a loop to reach a goal." },
    { id: "mcp", name: "Model Context Protocol", short: "MCP", topic: "ai", x: 130, y: 340, desc: "An open protocol that lets any assistant discover and call external tools." },
    { id: "context", name: "Context Engineering", topic: "ai", x: 300, y: 400, desc: "Designing what a model sees: instructions, retrieved knowledge, memory and tool results." },
    { id: "local", name: "Local LLMs", topic: "ai", x: 110, y: 200, desc: "Language models that run on your own device, privately and offline." },
    { id: "aidesign", name: "AI in Design", topic: "design", x: 520, y: 130, desc: "Using AI to explore and draft, while keeping taste and accessibility human." },
    { id: "dsys", name: "Design Systems", topic: "design", x: 630, y: 230, desc: "Shared tokens, components and rules that keep products consistent." },
    { id: "quality", name: "Design Quality", topic: "design", x: 700, y: 350, desc: "The last ten percent: details, states and polish that earn trust." },
    { id: "research", name: "User Research", topic: "design", x: 560, y: 380, desc: "Lightweight methods for learning from real people before deciding." },
    { id: "automation", name: "Automation", topic: "biz", x: 500, y: 480, desc: "Turning repeated work into flows that run themselves." },
    { id: "saas", name: "Future of SaaS", topic: "biz", x: 640, y: 550, desc: "How agents change what software is worth and how it is priced." },
    { id: "knowsys", name: "Knowledge Systems", topic: "pk", x: 290, y: 570, desc: "How a personal system captures, connects and returns what you learn." },
    { id: "reflection", name: "Reflection", topic: "pk", x: 130, y: 580, desc: "Regular looking-back that turns experience into lessons." },
    { id: "pricing", name: "Pricing & Quotes", topic: "biz", x: 780, y: 470, desc: "Proposals, vendor quotes and the pricing decisions behind them." },
    { id: "wellbeing", name: "Wellbeing", topic: "pk", x: 90, y: 470, desc: "Sleep, movement and appointments that keep energy steady." }
  ];
  LO.conceptById = (id) => LO.concepts.find((c) => c.id === id);

  /* KnowledgeRelationship: concept ↔ concept (topic membership is derived) */
  LO.rels = [
    { s: "mcp", t: "agents", r: "supports" },
    { s: "context", t: "agents", r: "supports" },
    { s: "local", t: "agents", r: "related" },
    { s: "agents", t: "automation", r: "related" },
    { s: "automation", t: "saas", r: "supports" },
    { s: "saas", t: "agents", r: "inspired_by" },
    { s: "aidesign", t: "agents", r: "related" },
    { s: "aidesign", t: "dsys", r: "related" },
    { s: "quality", t: "dsys", r: "part_of" },
    { s: "research", t: "quality", r: "supports" },
    { s: "knowsys", t: "context", r: "inspired_by" },
    { s: "knowsys", t: "reflection", r: "related" },
    { s: "knowsys", t: "saas", r: "related" },
    { s: "pricing", t: "saas", r: "related" },
    { s: "wellbeing", t: "reflection", r: "related" }
  ];
  LO.relLabel = { related: "Related to", part_of: "Part of", supports: "Supports", inspired_by: "Inspired by" };

  const H = 3600 * 1000;
  /* KnowledgeItem (+ ext: topic, insight, art, meta, original, actions, cids) */
  LO.seedItems = [
    {
      id: "i01", title: "Understanding AI Agents", topic: "ai", sourceType: "youtube", sourceName: "youtube.com", sourceUrl: "https://www.youtube.com/watch?v=lifeos-agents", meta: "18 min video", art: "agents", ago: 3 * H,
      insight: "An agent is a loop: decide, call a tool, read the result, decide again.",
      summary: "A clear walk-through of what separates an agent from a chatbot. The model plans a step, uses a tool to act on the world, observes what happened and repeats until the goal is met. The talk argues that most agent failures come from poorly described tools and thin context, not from weak models.",
      takeaways: ["Agents plan and act across several steps instead of answering once.", "Tools extend what an agent can do, and their descriptions matter as much as their code.", "Context quality decides whether an agent makes good decisions."],
      cids: ["agents", "mcp", "context"], tags: ["AI", "Automation", "Agents"],
      original: "Transcript excerpt, 00:42: \u201CA chatbot answers. An agent acts. The difference is the loop: the model chooses a tool, the tool runs, the result goes back into the context, and the model decides what to do next. Most of the failures I see are in that middle step, where a tool is described badly and the model has to guess.\u201D",
      actions: ["Explore agent frameworks this weekend"]
    },
    {
      id: "i04", title: "Run a local LLM in 60 seconds", topic: "ai", sourceType: "instagram", sourceName: "instagram.com", sourceUrl: "https://www.instagram.com/reel/lifeos-local-llm/", meta: "0:58 reel", art: "local", ago: 26 * H,
      insight: "A laptop can now run a capable model offline, privately and for free.",
      summary: "A short reel showing a small open model running on a laptop with the network switched off. Quantised models fit in a few gigabytes of memory and answer fast enough for drafting, summarising and coding help, and nothing leaves the device.",
      takeaways: ["Quantised models run on ordinary laptops.", "Local means private: prompts and documents stay on the device.", "Use local models for drafts and private data, cloud models for the hardest tasks."],
      cids: ["local", "agents"], tags: ["AI", "Privacy", "Local"],
      original: "Caption: Wi-Fi off. Model on. Ask it anything. #localllm #privacy  Voiceover: \u201CThis is a seven billion parameter model, quantised to four bits. It fits in about five gigabytes and runs fine on a laptop.\u201D",
      actions: []
    },
    {
      id: "i14", title: "Thursday: what I learned this week", topic: "pk", sourceType: "journal", sourceName: "Journal", sourceUrl: "", meta: "Journal entry", art: "journal", ago: 28 * H,
      insight: "I keep returning to one idea: context decides everything.",
      summary: "A reflection on a week of reading about agents and design systems. In both, quality came from what surrounds the decision, whether that is the context window or the tokens a team has agreed on. Next week: spend less time collecting and more time connecting.",
      takeaways: ["Quality comes from what surrounds the decision.", "Collecting is easy; connecting is the work.", "Revisit one old note every day."],
      cids: ["reflection", "knowsys", "context"], tags: ["Journal", "Reflection"],
      original: "Thursday evening. Read three things about agents and two about design systems and noticed it is the same story. The model is only as good as its context and the product is only as good as its tokens. I should stop saving so much and start linking what I already have.",
      actions: ["Revisit one old note every morning"]
    },
    {
      id: "i05", title: "Planning a refactor with an AI pair", topic: "ai", sourceType: "chat", sourceName: "AI conversation", sourceUrl: "", meta: "14 turns", art: "chat", ago: 50 * H,
      insight: "Ask for the plan before the code, and have it argue against itself.",
      summary: "An imported conversation about splitting a large module. The useful pattern was asking the assistant for a staged plan with risks first, then implementing one stage at a time with tests, rather than requesting the whole rewrite in one go.",
      takeaways: ["Ask for a staged plan and risks before any code.", "Implement one stage at a time, with tests as the checkpoint.", "Ask the assistant to critique its own plan once."],
      cids: ["agents", "automation"], tags: ["AI", "Development", "Workflow"],
      original: "You: I want to split billing.ts into smaller modules without breaking anything. Where do I start?\nAssistant: Before writing code, here is a staged plan with the main risk for each stage. Stage 1 extracts pure functions and needs no behaviour change\u2026",
      actions: []
    },
    {
      id: "i02", title: "Model Context Protocol, explained", topic: "ai", sourceType: "website", sourceName: "mcp-primer.example", sourceUrl: "https://mcp-primer.example/explained", meta: "7 min read", art: "mcp", ago: 74 * H,
      insight: "One open protocol so any assistant can use any tool, without custom glue code.",
      summary: "MCP standardises how AI applications discover and call external tools and data. A client connects to servers that expose tools, resources and prompts, so an integration written once works across assistants. The piece walks through a minimal server and the security questions it raises.",
      takeaways: ["Servers expose tools, resources and prompts through one shared interface.", "Write an integration once and reuse it across assistants.", "Permissions and trust boundaries still need explicit design."],
      cids: ["mcp", "agents"], tags: ["AI", "Developer tools", "Standards"],
      original: "Article excerpt: \u201CBefore a shared protocol, every assistant needed its own connector to every tool. With MCP a server describes what it can do, and any compatible client can discover and call it. The hard part moves from plumbing to permissions.\u201D",
      actions: ["Read the MCP overview"]
    },
    {
      id: "i12", title: "Voice note: a card that quizzes me", topic: "biz", sourceType: "voice", sourceName: "Voice note", sourceUrl: "", meta: "0:42 recording", art: "voice", ago: 80 * H,
      insight: "What if Life OS asked me a question about something I saved last month?",
      summary: "An idea captured while walking: once a week, turn one saved insight into a single question and ask it, so the knowledge is pulled from memory instead of re-read. A right answer pushes the card further out and a miss brings it back sooner.",
      takeaways: ["Turn a saved insight into one question.", "Space the repeats: right answers wait longer, misses return sooner.", "One question a day, so it never feels like homework."],
      cids: ["knowsys", "saas"], tags: ["Idea", "Product", "Learning"],
      original: "Okay, so, idea. What if once a week Life OS takes something I saved a month ago and just asks me a question about it? Not a quiz, more of a nudge. If I get it right it waits longer, if I get it wrong it comes back sooner. Keep it to one a day.",
      actions: ["Sketch the weekly question card"]
    },
    {
      id: "i15", title: "Sunday reset", topic: "pk", sourceType: "journal", sourceName: "Journal", sourceUrl: "", meta: "Journal entry", art: "journal", ago: 5 * 24 * H,
      insight: "Fewer inputs, more time with the good ones.",
      summary: "Cleared the reading queue and kept only what I would be happy to explain to someone else. The rest was noise. A smaller set, revisited, beats a long list that never gets opened.",
      takeaways: ["Keep what you could explain to someone else.", "A smaller set, revisited, beats a long list."],
      cids: ["reflection", "knowsys"], tags: ["Journal", "Focus"],
      original: "Sunday. Deleted forty open tabs and kept six. It felt like putting down a bag I had been carrying all week.",
      actions: []
    },
    {
      id: "i03", title: "Context engineering beats prompt engineering", topic: "ai", sourceType: "website", sourceName: "context-notes.example", sourceUrl: "https://context-notes.example/context-engineering", meta: "9 min read", art: "context", ago: 6 * 24 * H,
      insight: "Models rarely fail for lack of cleverness. They fail for lack of the right context.",
      summary: "Argues that the craft has moved from wording prompts to assembling what the model sees: instructions, retrieved knowledge, tool results and memory. Good context is selected, ordered and trimmed on purpose, and it is the main lever for making agents reliable.",
      takeaways: ["Treat the context window as a designed surface, not a dumping ground.", "Retrieve less, but retrieve what is relevant to the next decision.", "Summarise and prune long histories before they drown the signal."],
      cids: ["context", "agents", "knowsys"], tags: ["AI", "Context", "Workflows"],
      original: "Article excerpt: \u201CPrompt engineering asks how to phrase the question. Context engineering asks what the model should know when it answers. For anything agentic, the second question matters far more.\u201D",
      actions: []
    },
    {
      id: "i06", title: "Enterprise design systems: tokens are contracts", topic: "design", sourceType: "website", sourceName: "systems-journal.example", sourceUrl: "https://systems-journal.example/tokens-are-contracts", meta: "11 min read", art: "design", ago: 9 * 24 * H,
      insight: "A token is a promise between design and code. Break it and trust goes with it.",
      summary: "How large organisations keep hundreds of products consistent. Tokens name decisions such as colour, space and radius so they can change in one place. The article recommends semantic naming, versioned releases and a clear deprecation path over a large library of one-off components.",
      takeaways: ["Name decisions, not values: semantic tokens outlast visual refreshes.", "Version and deprecate deliberately, because teams plan around your releases.", "Fewer, better components beat a large library nobody trusts."],
      cids: ["dsys", "quality"], tags: ["Design systems", "Tokens", "Enterprise"],
      original: "Article excerpt: \u201Ccolor-blue-500 tells a developer what a colour is. color-action-primary tells them what it is for. Only the second survives a rebrand.\u201D",
      actions: ["Audit our token naming against this article"]
    },
    {
      id: "i07", title: "AI in product design: where it actually helps", topic: "design", sourceType: "youtube", sourceName: "youtube.com", sourceUrl: "https://www.youtube.com/watch?v=lifeos-ai-design", meta: "24 min video", art: "aidesign", ago: 12 * 24 * H,
      insight: "AI is best at the first draft and the tedious pass, not at taste.",
      summary: "A designer's honest tour of where AI tools save time (exploring variations, writing UX copy, generating states) and where they still need a human eye (hierarchy, restraint, accessibility). The advice is to review AI output against the design system instead of trusting how it looks.",
      takeaways: ["Use AI to widen exploration, then narrow with human judgement.", "Check generated UI against tokens and accessibility, not only looks.", "Taste and restraint remain the designer's job."],
      cids: ["aidesign", "dsys", "agents"], tags: ["Design", "AI", "Workflow"],
      original: "Transcript excerpt, 09:15: \u201CI let it draft twelve versions of the empty state in a minute. Eleven were forgettable. The twelfth had a line I would never have written. That is the use: breadth, then my judgement.\u201D",
      actions: []
    },
    {
      id: "i16", title: "Shipping the thing that scared me", topic: "pk", sourceType: "journal", sourceName: "Journal", sourceUrl: "", meta: "Journal entry", art: "journal", ago: 12 * 24 * H,
      insight: "Small public steps beat a perfect private plan.",
      summary: "Showed a rough prototype to three people before it felt ready. The feedback changed the plan more than another week alone would have. Next time: share on day two.",
      takeaways: ["Show work before it feels ready.", "Three honest reactions beat a week of solo polishing."],
      cids: ["reflection", "research"], tags: ["Journal", "Courage"],
      original: "Showed the prototype to three friends. Two of them got stuck in the same place. Fixed it in an hour.",
      actions: []
    },
    {
      id: "i08", title: "Design quality is the last ten percent", topic: "design", sourceType: "website", sourceName: "quality-notes.example", sourceUrl: "https://quality-notes.example/last-ten-percent", meta: "6 min read", art: "quality", ago: 15 * 24 * H,
      insight: "Most products are ninety percent done. Quality lives in the ten nobody schedules.",
      summary: "A case for building polish into every plan: empty states, error copy, focus order, motion timing. These details are invisible when right and corrosive when wrong, and teams that review them as a habit ship calmer, more trustworthy products.",
      takeaways: ["Schedule polish; it will not happen by accident.", "Empty, loading and error states are part of the design, not extras.", "Review details as a team ritual, not a final gate."],
      cids: ["quality", "dsys", "research"], tags: ["Design", "Quality", "Craft"],
      original: "Article excerpt: \u201CNobody praises a good empty state. Everybody remembers a bad one. Put them on the plan.\u201D",
      actions: []
    },
    {
      id: "i09", title: "User research in a week", topic: "design", sourceType: "website", sourceName: "research-sprint.example", sourceUrl: "https://research-sprint.example/week", meta: "8 min read", art: "research", ago: 18 * 24 * H,
      insight: "Five conversations and one honest question beat a month of debate.",
      summary: "A compact method for lightweight research: pick one decision, recruit five people, run short interviews and synthesise on a wall by Friday. It stresses asking about past behaviour rather than opinions about features.",
      takeaways: ["Start from one decision you need to make.", "Ask what people did, not what they would do.", "Synthesise together, the same day you finish."],
      cids: ["research", "quality"], tags: ["Research", "Method", "Product"],
      original: "Article excerpt: \u201CAsk about the last time they tried to do the thing. Stories are evidence. Predictions are not.\u201D",
      actions: []
    },
    {
      id: "i10", title: "The future of SaaS is outcomes, not seats", topic: "biz", sourceType: "website", sourceName: "saas-outlook.example", sourceUrl: "https://saas-outlook.example/outcomes-not-seats", meta: "10 min read", art: "saas", ago: 21 * 24 * H,
      insight: "When software does the work, pricing by seat stops making sense.",
      summary: "As agents handle tasks people used to click through, the unit of value moves from a logged-in user to a finished outcome. The piece sketches pricing by result and argues that products exposing clean actions to agents will beat those that only polish a dashboard.",
      takeaways: ["Value moves from seats to completed outcomes.", "Products should expose clean actions that agents can call.", "Interfaces still matter, but for oversight rather than operation."],
      cids: ["saas", "agents", "automation"], tags: ["Business", "SaaS", "Strategy"],
      original: "Article excerpt: \u201CIf one agent can do the work of ten seats, a per-seat price punishes your best customers. Charge for the result.\u201D",
      actions: []
    },
    {
      id: "i11", title: "Business automation: start with the boring flows", topic: "biz", sourceType: "website", sourceName: "ops-weekly.example", sourceUrl: "https://ops-weekly.example/boring-flows", meta: "5 min read", art: "automation", ago: 24 * 24 * H,
      insight: "Automate the weekly chore everyone dislikes before the clever idea.",
      summary: "A practical guide to choosing automations: list repeated tasks, score them by frequency and pain, and automate the top one end to end before touching anything ambitious. Small wins build trust and surface integration gaps early.",
      takeaways: ["Rank tasks by how often they happen and how much they annoy.", "Automate one flow end to end before adding more.", "Log every run so you can trust and improve it."],
      cids: ["automation", "saas"], tags: ["Business", "Automation", "Operations"],
      original: "Article excerpt: \u201CThe best first automation is the one with the most eye-rolls per week.\u201D",
      actions: []
    },
    {
      id: "i13", title: "Building a personal knowledge system", topic: "pk", sourceType: "text", sourceName: "Note", sourceUrl: "", meta: "Idea", art: "network", ago: 30 * 24 * H,
      insight: "Capture without sorting. Let structure appear later.",
      summary: "A working note on the principles for a second brain: capture must take seconds, software should do the organising, and the system must return knowledge to you rather than archive it. Links between ideas matter more than folders.",
      takeaways: ["Capture first and sort never; let the software organise.", "Prefer links between ideas over folders.", "Success is revisiting, not collecting."],
      cids: ["knowsys", "context"], tags: ["Idea", "Knowledge", "Product"],
      original: "Principles: 1) capture in under five seconds. 2) the system organises, I do not. 3) things come back to me. 4) links over folders.",
      actions: []
    },

    /* ---- Life items: meetings, calls, emails and health use the same item shape and the same pipeline.
       ext fields: slot (schedule, relative to the demo clock), people, needsReply, priority, metric. ---- */
    {
      id: "m01", title: "Design review: the Today view", topic: "design", sourceType: "meeting", sourceName: "Teams", sourceUrl: "", meta: "45 min meeting", art: "design", slot: { at: -150, dur: 45 },
      people: ["Priya Nair", "Dan Wu"],
      insight: "Lead the day with the next meeting and no more than three priorities.",
      summary: "Reviewed the first Today view. The group agreed the day should open with the next meeting and cap priorities at three, with health and email kept as quiet secondary strips instead of new tabs. Dan will check the density at phone width before Friday.",
      takeaways: ["Lead with the next meeting, then three priorities.", "Health and email stay secondary and never get their own tab.", "Check the layout at 390 px before Friday."],
      cids: ["dsys", "quality", "aidesign"], tags: ["Meeting", "Design review"],
      original: "Notes typed during the call. Priya: three priorities is the right cap. Dan: health strip should be one line on phones. Agreed: nothing new in the bottom nav. Action: Dan checks density at 390 px.",
      actions: ["Check the Today view density at 390 px"]
    },
    {
      id: "m02", title: "1:1 with Priya", topic: "design", sourceType: "meeting", sourceName: "Teams", sourceUrl: "", meta: "30 min meeting", art: "research", slot: { at: 40, dur: 30 },
      people: ["Priya Nair"],
      insight: "Bring the demo scope, feedback on the Explore cards and the Today prototype.",
      summary: "Agenda: hackathon demo scope, feedback on the Explore cards and the plan for next sprint. Last time you agreed to share the Today prototype before this call, and Priya wanted to talk about how research fits the demo.",
      takeaways: ["Agree the demo scope for Friday.", "Ask for feedback on the Explore cards.", "Share the Today prototype before the call."],
      cids: ["research", "quality"], tags: ["Meeting", "1:1"],
      original: "Calendar invite: 1:1 with Priya Nair. Agenda: demo scope; Explore card feedback; next sprint. Notes from last time: share the Today prototype beforehand.",
      actions: []
    },
    {
      id: "m03", title: "Hackathon demo dry run", topic: "biz", sourceType: "meeting", sourceName: "Teams", sourceUrl: "", meta: "45 min meeting", art: "automation", slot: { at: 190, dur: 45 },
      people: ["Dan Wu", "Sana Rao", "Priya Nair"],
      insight: "Run the demo end to end once and time every step.",
      summary: "A full run of the five-minute demo: capture, understand, connect, ask, share. The goal is to find where it drags and where the story needs a stronger opening line.",
      takeaways: ["Time each step of the demo.", "Open with the capture moment.", "Keep a fallback if the network fails."],
      cids: ["automation", "knowsys"], tags: ["Meeting", "Demo"],
      original: "Calendar invite: Hackathon demo dry run. Bring the laptop and the phone. Dan runs the clock.",
      actions: []
    },
    {
      id: "c01", title: "Call with Arjun: vendor quote", topic: "biz", sourceType: "call", sourceName: "Phone", sourceUrl: "", meta: "12 min call", art: "saas", ago: 22 * H,
      people: ["Arjun Rao"],
      insight: "The price holds until Friday if you confirm in writing.",
      summary: "Discussed the revised vendor quote. Arjun can hold the current price until Friday if the order is confirmed in writing. You agreed to send the revised quote with the new quantities, and he will share the delivery schedule.",
      takeaways: ["The price holds until Friday if confirmed in writing.", "You owe him the revised quote with the new quantities.", "He will send the delivery schedule."],
      cids: ["pricing", "automation"], tags: ["Call", "Vendor", "Pricing"],
      original: "Call notes. Arjun: I can hold the price until Friday if I have it in writing. Me: I will send the revised quote with the new quantities today. Arjun: and I will send the delivery schedule.",
      actions: ["Send Arjun the revised quote"]
    },
    {
      id: "c02", title: "Missed call: Dr. Mehta's clinic", topic: "pk", sourceType: "call", sourceName: "Phone", sourceUrl: "", meta: "Missed call, voicemail", art: "voice", ago: 5 * H,
      people: ["Dr. Mehta's clinic"], needsReply: true, priority: "high",
      insight: "The clinic wants you to confirm or move your check-up before they close at 6 pm.",
      summary: "A missed call with a voicemail: the clinic asks you to confirm or move your check-up in three days. They close at 6 pm today, so a call back this afternoon is the easy way to settle it.",
      takeaways: ["Confirm or move the check-up.", "The clinic closes at 6 pm."],
      cids: ["wellbeing"], tags: ["Call", "Health", "Appointment"],
      original: "Voicemail transcript: Hello, this is Dr. Mehta's clinic. We are calling to confirm your check-up. If the time does not suit you, please call us back before six this evening and we will move it.",
      actions: ["Call the clinic back before 6 pm"]
    },
    {
      id: "e01", title: "Re: Q4 pricing proposal", topic: "biz", sourceType: "email", sourceName: "Outlook", sourceUrl: "", meta: "Email from Sana Rao", art: "saas", ago: 26 * H,
      people: ["Sana Rao"], needsReply: true, priority: "high",
      insight: "Sana needs a decision on the tiered option by the end of today.",
      summary: "Sana asks which of the two pricing options you prefer and whether the pilot discount applies to annual plans. She needs an answer today to finish the proposal for her leadership review.",
      takeaways: ["Choose between the tiered and the flat option.", "Confirm whether the pilot discount covers annual plans.", "Reply by the end of today."],
      cids: ["pricing", "saas"], tags: ["Email", "Pricing"],
      original: "From: Sana Rao\nSubject: Re: Q4 pricing proposal\n\nHi Kapil, thanks for the notes. Can you tell me which option you prefer, tiered or flat? Also, does the pilot discount apply to annual plans? I need to lock this today for the leadership review.\n\nSana",
      actions: ["Reply to Sana with the pricing decision"]
    },
    {
      id: "e02", title: "Demo slides for Friday", topic: "biz", sourceType: "email", sourceName: "Outlook", sourceUrl: "", meta: "Email from Dan Wu", art: "automation", ago: 3 * H,
      people: ["Dan Wu"], needsReply: true,
      insight: "Dan wants a thumbs-up on the slide outline.",
      summary: "Dan shared a five-slide outline for the demo and asks whether the story should open with capture or with the knowledge graph. A short reply unblocks his work this afternoon.",
      takeaways: ["Pick the opening: capture or graph.", "Approve the five-slide outline."],
      cids: ["knowsys", "automation"], tags: ["Email", "Demo"],
      original: "From: Dan Wu\nSubject: Demo slides for Friday\n\nOutline attached. Five slides. Should we open with capture or with the graph? Tell me and I will lock it.\n\nDan",
      actions: []
    },
    {
      id: "e03", title: "Invoice 2291 received", topic: "biz", sourceType: "email", sourceName: "Outlook", sourceUrl: "", meta: "Email from Accounts", art: "saas", ago: 8 * 24 * H,
      people: ["Accounts"],
      insight: "Nothing to do; filed for reference.",
      summary: "Invoice 2291 for the design tooling subscription arrived and was filed. No reply is needed.",
      takeaways: ["No reply needed.", "Filed for the quarter-end review."],
      cids: ["pricing"], tags: ["Email", "Invoice"],
      original: "From: Accounts\nSubject: Invoice 2291\n\nPlease find invoice 2291 attached. No action needed if already approved.",
      actions: []
    },
    {
      id: "h01", title: "Sleep: 6 h 40 min", topic: "pk", sourceType: "health", sourceName: "Health", sourceUrl: "", meta: "Last night", art: "journal", ago: 9 * H,
      metric: { label: "Sleep", value: "6 h 40 min", goal: "7 h", pct: 0.95 },
      insight: "Twenty minutes under your goal. Aim for an earlier night.",
      summary: "Sleep last night was 6 h 40 min, 20 minutes under your 7 h goal. Your last three nights average 6 h 55 min. A short night tends to show up as lower energy by mid-afternoon.",
      takeaways: ["Twenty minutes under the goal.", "Three-night average: 6 h 55 min.", "Aim for lights out by 10:30 pm tonight."],
      cids: ["wellbeing", "reflection"], tags: ["Health", "Sleep"],
      original: "Health sync: sleep 6 h 40 min, in bed 11:20 pm, awake 6:00 am. Goal 7 h.",
      actions: []
    },
    {
      id: "h02", title: "Steps: 4,200 of 8,000", topic: "pk", sourceType: "health", sourceName: "Health", sourceUrl: "", meta: "So far today", art: "network", ago: 1 * H,
      metric: { label: "Steps", value: "4,200", goal: "8,000", pct: 0.525 },
      insight: "About halfway; a twenty-minute walk closes most of the gap.",
      summary: "You are at 4,200 steps, a little over half of the 8,000 goal. A twenty-minute walk adds roughly 2,000 steps.",
      takeaways: ["Halfway to the goal.", "A twenty-minute walk adds about 2,000 steps."],
      cids: ["wellbeing"], tags: ["Health", "Movement"],
      original: "Health sync: steps 4,200. Goal 8,000.",
      actions: []
    },
    {
      id: "h03", title: "Dental check-up with Dr. Mehta", topic: "pk", sourceType: "health", sourceName: "Calendar", sourceUrl: "", meta: "Appointment", art: "journal", slot: { days: 3, hour: 16, dur: 45 },
      people: ["Dr. Mehta"],
      insight: "Routine check-up. The clinic is waiting for you to confirm.",
      summary: "A routine dental check-up. The clinic called to confirm and left a voicemail, so the slot is not final until you reply.",
      takeaways: ["Routine check-up, 45 minutes.", "Not final until you confirm with the clinic."],
      cids: ["wellbeing"], tags: ["Health", "Appointment"],
      original: "Calendar: Dental check-up, Dr. Mehta, 45 minutes.",
      actions: []
    }
  ];

  LO.seedFavorites = ["i01", "i06"];

  /* Deck for Explore (brief §5 Module D): a curated order, not just newest first */
  LO.seedDeck = ["i01", "i03", "i06", "i10", "i02", "i07", "i13", "i04", "i08", "i12", "i11", "i14"];

  /* Revisit log: id → [n views, hours ago of last view]. Drives progress. */
  LO.seedSeen = { i03: [2, 30], i06: [1, 52], i10: [3, 5], i02: [1, 77], i01: [2, 20] };

  /* Reminder (+ ext: when label) */
  LO.seedReminders = [
    { id: "r1", title: "Explore building a local AI agent this weekend", dueIn: 3 * 24, sourceItemId: "i01", done: false },
    { id: "r2", title: "Read the MCP overview", dueIn: 20, sourceItemId: "i02", done: false },
    { id: "r3", title: "Audit our token naming against the design-systems article", dueIn: 8 * 24, sourceItemId: "i06", done: false },
    { id: "r4", title: "Sketch the weekly question card", dueIn: 5 * 24, sourceItemId: "i12", done: false },
    { id: "r5", title: "Record a voice note about onboarding", dueIn: -26, sourceItemId: "", done: true },
    { id: "r6", title: "Send Arjun the revised quote", dueIn: 1.5, sourceItemId: "c01", done: false },
    { id: "r7", title: "Share the Today prototype with Priya", dueIn: 0.4, sourceItemId: "m02", done: false }
  ];

  LO.journalPrompts = ["What did I learn today?", "What gave me energy?", "What am I avoiding?", "One thing to remember from this week"];

  /* Known example URLs (brief §11: sample metadata, no scraping) */
  LO.samples = {
    youtube: {
      url: "https://www.youtube.com/watch?v=lifeos-agents-demo", sourceType: "youtube", sourceName: "youtube.com", meta: "21 min video", topic: "ai", art: "agents",
      title: "Build an AI agent in 20 minutes",
      insight: "A small agent with two well-described tools beats a big one with ten vague ones.",
      summary: "A hands-on build of a small agent that plans, calls two tools and checks its own work. The walk-through shows how tool descriptions and a short memory change the quality of the result.",
      takeaways: ["Start with two tools and describe each one precisely.", "Give the agent a short memory of what it already tried.", "Make it check its own output before it answers."],
      concepts: ["AI Agents", "Tool Calling", "Context Engineering"], tags: ["AI", "Automation", "Developer tools"], actions: ["Explore agent frameworks this weekend"]
    },
    instagram: {
      url: "https://www.instagram.com/reel/lifeos-prompts-demo/", sourceType: "instagram", sourceName: "instagram.com", meta: "0:45 reel", topic: "ai", art: "context",
      title: "Three prompts that make AI answers sharper",
      insight: "Say who it is for, what good looks like and what to leave out.",
      summary: "A short reel with three habits for clearer AI answers: name the audience, describe the finished result and list what to exclude. All three add context rather than clever wording.",
      takeaways: ["Name the audience before asking.", "Describe what a good answer looks like.", "List what to leave out."],
      concepts: ["Context Engineering", "AI Agents"], tags: ["AI", "Prompts"], actions: []
    },
    website: {
      url: "https://quality-notes.example/design-review-checklist", sourceType: "website", sourceName: "quality-notes.example", meta: "5 min read", topic: "design", art: "quality",
      title: "Why design reviews need a checklist",
      insight: "A checklist turns taste into something a team can share.",
      summary: "Argues that design reviews drift without shared criteria. A short checklist covering hierarchy, states, focus order and copy makes feedback faster and less personal, and catches the details that polish depends on.",
      takeaways: ["Write the criteria down once and reuse them.", "Cover states and accessibility, not just the happy path.", "Keep it short enough to use every time."],
      concepts: ["Design Quality", "Design Systems"], tags: ["Design", "Quality", "Process"], actions: ["Draft a design review checklist"]
    },
    chat: {
      sourceType: "chat", sourceName: "AI conversation", meta: "6 turns", topic: "ai", art: "chat",
      text: "You: How should I structure notes so an AI assistant can use them well?\nAssistant: Keep each note about one idea, give it a clear title, and link related notes. Short, specific notes retrieve better than long mixed ones.\nYou: What about tags?\nAssistant: Use a small set of tags for broad topics, and rely on links for the specific relationships.\nYou: And summaries?\nAssistant: A two-sentence summary at the top of each note helps both you and the assistant decide what to read.",
      title: "Structuring notes so AI can use them",
      insight: "One idea per note, a clear title and links beat long mixed notes.",
      summary: "A conversation about structuring notes for retrieval. Short single-idea notes with clear titles and a two-sentence summary work best, with a small set of tags and links for relationships.",
      takeaways: ["One idea per note, with a clear title.", "A small tag set; use links for specific relationships.", "Start every note with a two-sentence summary."],
      concepts: ["Knowledge Systems", "Context Engineering"], tags: ["Knowledge", "AI"], actions: []
    }
  };

  /* Ask: seeded questions with consolidated answers and citations.
     Segments are strings or { c: itemId } citation markers. */
  LO.askSeed = [
    {
      q: "What do I need to do today?",
      paras: [
        ["Three things are time-sensitive. You promised Arjun the revised quote on yesterday\u2019s call, and his price only holds until Friday if you confirm in writing ", { c: "c01" }, ". Sana is also waiting on a pricing decision for her leadership review ", { c: "e01" }, "."],
        ["Before your 1:1 with Priya, share the Today prototype, which is the one thing you agreed to last time ", { c: "m02" }, ". Dr. Mehta\u2019s clinic left a voicemail and closes at 6 pm, so a call back this afternoon settles your check-up ", { c: "c02" }, "."]
      ],
      followups: ["What did I agree with Arjun on the call?", "How have I been sleeping?"]
    },
    {
      q: "What did I agree with Arjun on the call?",
      paras: [
        ["Two commitments, one each way. You will send the revised quote with the new quantities, and Arjun will send the delivery schedule ", { c: "c01" }, ". He can hold the current price until Friday, but only if the order is confirmed in writing."],
        ["It connects to the pricing thread with Sana, who needs to know whether the tiered or the flat option applies ", { c: "e01" }, ", and to your notes on pricing by outcome rather than by seat ", { c: "i10" }, "."]
      ],
      followups: ["What do I need to do today?", "What were my ideas about building a SaaS?"]
    },
    {
      q: "How have I been sleeping?",
      paras: [
        ["Slightly short. Last night was 6 h 40 min, twenty minutes under your 7 h goal, and your last three nights average 6 h 55 min ", { c: "h01" }, ". Movement is on track for the afternoon but not finished: about half of today\u2019s steps are done ", { c: "h02" }, "."],
        ["Your own reflection points the same way: fewer inputs and more time with the good ones ", { c: "i15" }, ". An earlier night is the simplest change."]
      ],
      followups: ["What do I need to do today?", "What should I revisit this week?"]
    },
    {
      q: "What did we decide in the design review?",
      paras: [
        ["Keep the Today view calm: lead with the next meeting, cap priorities at three and keep health and email as quiet secondary strips, with nothing new in the bottom nav ", { c: "m01" }, "."],
        ["That fits your own reading on quality, where polish is a scheduled habit and not an afterthought ", { c: "i08" }, ", and on tokens as contracts so the layout stays consistent across breakpoints ", { c: "i06" }, "."]
      ],
      followups: ["What have I learned about design systems?", "What do I need to do today?"]
    },
    {
      q: "What did I save about AI agents?",
      paras: [
        ["You have five saved items that touch AI agents. The core idea comes from ", { c: "i01" }, ": an agent is a loop that plans a step, calls a tool, reads the result and repeats until the goal is met."],
        ["Two things make that loop reliable. Tools need a shared standard, which is what the Model Context Protocol offers ", { c: "i02" }, ", and the model needs the right information at each step, which is the case made for context engineering over prompt wording ", { c: "i03" }, "."],
        ["Two practical angles round it out: running a model locally for private work ", { c: "i04" }, ", and planning first when you work with an AI pair on code ", { c: "i05" }, ". You also have a reminder to try an agent framework this weekend."]
      ],
      followups: ["How do MCP and agents fit together?", "What should I read next?"]
    },
    {
      q: "What were my ideas about building a SaaS?",
      paras: [
        ["Your notes point one way: sell outcomes, not seats ", { c: "i10" }, ". As agents take over the clicking, value shifts to finished results, and products that expose clean actions will win."],
        ["Start small. The automation notes suggest ranking recurring tasks by frequency and pain, then automating one flow end to end before anything ambitious ", { c: "i11" }, "."],
        ["Your own product ideas fit that pattern: a weekly question about something you saved ", { c: "i12" }, " and a capture-first knowledge system that organises itself ", { c: "i13" }, "."]
      ],
      followups: ["Which of these is the smallest to build?", "Show how they connect"]
    },
    {
      q: "Find connections between AI and product design",
      paras: [
        ["Three of your saved items meet at one point: design quality now depends on how well AI output is checked against a system. AI helps most with exploration and tedious passes, while taste stays human ", { c: "i07" }, "."],
        ["That only works when the system is explicit. Tokens act as contracts between design and code ", { c: "i06" }, ", and quality is the last ten percent that needs scheduled review ", { c: "i08" }, "."],
        ["The thread between them is context, the same lever agents depend on ", { c: "i01" }, ". Clearly named tokens give an AI the context to produce on-brand work."]
      ],
      followups: ["Make an infographic from this", "What am I missing on accessibility?"]
    },
    {
      q: "What have I learned about design systems?",
      paras: [
        ["Mostly that trust is the product. Tokens should name decisions, not values, so they survive a rebrand, and releases should be versioned and deprecated deliberately ", { c: "i06" }, "."],
        ["Quality sits in the details that are never scheduled: empty states, error copy, focus order ", { c: "i08" }, ". And AI can help draft, but its output still has to be checked against the system ", { c: "i07" }, "."]
      ],
      followups: ["Summarise the user research notes", "Which of these should I act on?"]
    }
  ];
})();
