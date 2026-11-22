import { Body1, Spinner, Subtitle1, makeStyles, tokens } from "@fluentui/react-components";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { lifeOSStore } from "../store/lifeos-store";
import type { CaptureResult } from "../services/types";

type Phase = "saving" | "saved" | "duplicate" | "empty" | "error";

const useStyles = makeStyles({
  root: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: tokens.spacingVerticalM,
    paddingInline: tokens.spacingHorizontalXL,
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
  },
});

/**
 * Deep-link entry for the Chrome extension, bookmarklet, iOS Shortcut and Android share target.
 * Functional but unstyled: the approved design replaces the visuals, the capture call stays the same.
 */
export function CaptureRoute() {
  const styles = useStyles();
  const { search } = useLocation();
  const navigate = useNavigate();
  const handled = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>("saving");
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (handled.current === search) return;
    handled.current = search;

    (async () => {
      try {
        await lifeOSStore.getState().init();
        const services = lifeOSStore.getState().services;
        if (!services) throw new Error("Services are not ready");
        const captured = await services.capture.captureFromQuery(search);
        if (!captured) {
          setPhase("empty");
          return;
        }
        setResult(captured);
        setPhase(captured.duplicate ? "duplicate" : "saved");
        // Drop the query so a refresh does not capture the same thing again. The empty query that follows is ignored.
        handled.current = "";
        navigate("/capture", { replace: true });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
        setPhase("error");
      }
    })();
  }, [search, navigate]);

  return (
    <main className={styles.root} aria-live="polite">
      <Subtitle1 as="h1">Life OS</Subtitle1>
      {phase === "saving" && <Spinner label="Saving to Life OS" labelPosition="after" />}
      {phase === "saved" && <Body1>Saved “{result?.item.title}”. It is being organised.</Body1>}
      {phase === "duplicate" && <Body1>Already saved: “{result?.item.title}”.</Body1>}
      {phase === "empty" && <Body1>Nothing to save. Open this page from the extension, bookmarklet or share sheet.</Body1>}
      {phase === "error" && <Body1>Could not save: {message}</Body1>}
      <Link to="/">Go to Home</Link>
    </main>
  );
}
