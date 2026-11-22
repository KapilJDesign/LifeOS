export interface AppRoute {
  path: string;
  label: string;
}

/** Route table. The design agent's approved IA decides the final set; these are the brief's screens. */
export const ROUTES: readonly AppRoute[] = [
  { path: "/", label: "Home" },
  { path: "/explore", label: "Explore" },
  { path: "/capture", label: "Capture" },
  { path: "/graph", label: "Knowledge graph" },
  { path: "/library", label: "Library" },
  { path: "/chat", label: "Ask" },
  { path: "/item/:id", label: "Knowledge detail" },
];
