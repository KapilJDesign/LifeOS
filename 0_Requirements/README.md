# 0_Requirements — Source of truth for what we are building

Specs, PRDs, review emails, and reference images live here.

## Layout
- `Spec-*.md` / `*-Design.md` — the design spec(s) for the product.
- `Email-Context-*.md` — context from stakeholders / review threads.
- `To-do/` — requirements not yet built.
- `Done/` — requirements that have shipped (move them here when complete).
- `images/` — reference screenshots / mocks referenced by the specs.
- `Reference-*.md` — notes on external products we take inspiration from, such as
  `Reference-mymind-Observations.md` (auto-tagging, search, share setup, onboarding).

## Conventions
- Write specs for a designer audience: severity ratings (P0/P1/P2), Fluent
  component names (Combobox, Dialog), and an accessibility section per spec.
- Image binaries here are gitignored (docs-only); the `.md` files that
  reference them are kept.
