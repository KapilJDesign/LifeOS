# 4_Control_Panel — Prototype review tooling (NEVER ships to production)

Requirements and notes for the edge-pinned, hover-reveal Global Control Panel
used to switch between design variants/versions/flows live and to gather
reviewer feedback on the prototype.

## Key rule
The Control Panel is a **prototype / review tool ONLY**. Production features must
degrade sensibly without it — never design production logic that depends on the
Control Panel being present. Wire every new experimental design variation into
the panel as a toggle so reviewers can compare.

See the `use-design-control-panel` skill for wiring the panel into a project.
