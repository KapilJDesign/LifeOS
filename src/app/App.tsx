import { FluentProvider, makeStyles, tokens, Subtitle1, Body1 } from "@fluentui/react-components";
import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { loadSettings } from "../lib/storage/settings";
import { lifeOSStore } from "../store/lifeos-store";
import { resolveThemeName, themes, type ThemeName } from "../theme";
import { CaptureRoute } from "./CaptureRoute";
import { ROUTES } from "./routes";

const useStyles = makeStyles({
  root: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: tokens.spacingVerticalM,
    paddingBlock: tokens.spacingVerticalXXL,
    paddingInline: tokens.spacingHorizontalXL,
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
  },
  nav: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalM,
  },
  link: {
    color: tokens.colorBrandForeground1,
    minHeight: "44px",
    display: "inline-flex",
    alignItems: "center",
  },
});

function currentThemeName(): ThemeName {
  const media = (query: string) => typeof matchMedia !== "undefined" && matchMedia(query).matches;
  return resolveThemeName(loadSettings().theme, {
    prefersDark: media("(prefers-color-scheme: dark)"),
    forcedColors: media("(forced-colors: active)"),
  });
}

function useThemeName(): ThemeName {
  const [name, setName] = useState<ThemeName>(currentThemeName);

  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const queries = [matchMedia("(prefers-color-scheme: dark)"), matchMedia("(forced-colors: active)")];
    const update = () => setName(currentThemeName());
    queries.forEach((query) => query.addEventListener("change", update));
    return () => queries.forEach((query) => query.removeEventListener("change", update));
  }, []);

  return name;
}

/** Temporary page body until the approved design is built. Screens replace these placeholders. */
function Placeholder({ title, children }: { title: string; children?: ReactNode }) {
  const styles = useStyles();
  return (
    <main className={styles.root}>
      <Subtitle1 as="h1">Life OS</Subtitle1>
      <Body1>{title}</Body1>
      {children}
      <nav className={styles.nav} aria-label="Placeholder navigation">
        {ROUTES.filter((route) => !route.path.includes(":")).map((route) => (
          <Link key={route.path} to={route.path} className={styles.link}>
            {route.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}

export function App() {
  const themeName = useThemeName();

  useEffect(() => {
    void lifeOSStore.getState().init();
  }, []);

  return (
    <FluentProvider theme={themes[themeName]}>
      <BrowserRouter>
        <Routes>
          {ROUTES.map((route) =>
            route.path === "/capture" ? (
              <Route key={route.path} path={route.path} element={<CaptureRoute />} />
            ) : (
              <Route key={route.path} path={route.path} element={<Placeholder title={`${route.label} (placeholder)`} />} />
            ),
          )}
        </Routes>
      </BrowserRouter>
    </FluentProvider>
  );
}
