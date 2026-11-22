# Life OS

Your life, your knowledge, one intelligent system. Life OS is a phone-first, installable web app (with a fuller desktop experience) that captures anything you consume, structures it with AI, connects it into a knowledge graph, and lets you explore, ask and share it, with answers that cite your saved items.

**Live design prototype:** https://kapiljdesign.github.io/LifeOS/

## What is in this repository

| Path | Contents |
|---|---|
| `0_Requirements/` | Product brief, build plan, design specification and architecture (including the real-backend design) |
| `5_Presentation/design-v1/` | Clickable, responsive design prototype (published to GitHub Pages) |
| `src/` | Vite + React 19 + TypeScript app: domain layer, mock AI processing, graph, search, chat with citations, tests. Screens are built after the design is approved |
| `extension/` | Chrome extension (Manifest V3) that sends the current page to the app |
| `1_Updates/` and others | Project workflow folders |

## Run the app locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run test
npm run build
```

## View the design prototype locally

```bash
cd 5_Presentation/design-v1
python3 -m http.server 4380
```

Open http://localhost:4380/ and resize the window to switch between the phone and desktop layouts.
