import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRepository } from "../lib/storage/memory-repository";
import { createLocalRuntime } from "../services/local";
import { lifeOSStore } from "../store/lifeos-store";
import { CaptureRoute } from "./CaptureRoute";

function renderAt(path: string) {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/capture" element={<CaptureRoute />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

describe("CaptureRoute (deep-link entry)", () => {
  beforeEach(async () => {
    const runtime = await createLocalRuntime({ repository: new MemoryRepository() });
    lifeOSStore.setState({ services: runtime.services, status: "ready" });
  });

  it("saves the capture once, confirms it, and does not flip to the empty state after the query is cleared", async () => {
    renderAt("/capture?src=extension&url=https%3A%2F%2Fexample.com%2Fpost&title=A%20post");
    expect(await screen.findByText(/Saved “A post”/)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(/Nothing to save/)).not.toBeInTheDocument();

    const items = await lifeOSStore.getState().services!.knowledge.listItems();
    expect(items.filter((item) => item.sourceUrl === "https://example.com/post")).toHaveLength(1);
  });

  it("explains an empty visit", async () => {
    renderAt("/capture");
    await waitFor(() => expect(screen.getByText(/Nothing to save/)).toBeInTheDocument());
  });
});
