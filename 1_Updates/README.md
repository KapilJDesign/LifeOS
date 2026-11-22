# 1_Updates — Release change log (designer-readable)

A plain-language summary of what changed each time the app is pushed to GitHub
(and re-published to GitHub Pages). At the end of the day, grab the newest file
here and use it directly as a "what's new" update — no commit digging.

## Two written formats per push (always)
1. `YYYY-MM-DD-short-title.md` — the full UI-first detailed breakdown.
2. `YYYY-MM-DD-teams-message.md` — a short, paste-ready Teams message
   (numbered, plain language, ends with "To review:").

## Optional GIF
- `media/` holds shareable GIF + MP4 walkthroughs (gitignored — stays local).
- Only created when the update is visual, and only after the user says yes.

## How files get created
The user-level `push-update-log` skill generates these automatically when you
say "push to main and write the update" / "log the changes" / "ship this".
The user-level `capture-update-gif` skill records the optional GIF.

## Principles
- Net / absolute changes only (the end result, not the iterations).
- UI changes first; data/refactor items in a separate lower section.
- Verify (typecheck + build) before pushing.
