import { ingestCapture, parseCaptureQuery } from "../../lib/capture/inbound";
import { linkNewCapture } from "../../lib/graph/graph-builder";
import { toConceptRefs } from "../../lib/graph/concepts";
import {
  applyProcessingResult,
  markFailed,
  processCapture,
  requestFromItem,
  type ProcessOptions,
} from "../../lib/ai/processor";
import { createReminder, parseDueHint } from "../../lib/reminders";
import type { CaptureInput, KnowledgeItem, Reminder } from "../../types/knowledge";
import type { CaptureOptions, CaptureResult, CaptureService } from "../types";
import { syncConceptIndex, type LocalEnv } from "./knowledge-service";

export interface CaptureServiceOptions {
  processing: ProcessOptions;
  /** Process captures automatically after saving. Default true. */
  autoProcess?: boolean;
}

export class LocalCaptureService implements CaptureService {
  /** One in-flight run per item, so a double tap or a duplicate deep link never processes twice. */
  private inFlight = new Map<string, Promise<KnowledgeItem>>();

  constructor(
    private readonly env: LocalEnv,
    private readonly options: CaptureServiceOptions,
  ) {}

  async capture(input: CaptureInput, options: CaptureOptions = {}): Promise<CaptureResult> {
    const { store, now, ids } = this.env;
    const { item, duplicate } = ingestCapture(input, {
      existingItems: [...store.items.values()],
      now,
      idGenerator: ids,
    });
    if (duplicate) return { item, duplicate: true };

    // Saving never waits on AI: the pending item is persisted first.
    await store.saveItem(item);

    let reminder: Reminder | undefined;
    if (input.kind === "reminder") {
      reminder = createReminder(
        { title: item.title, description: item.content !== item.title ? item.content : undefined, dueAt: parseDueHint(item.content || item.title, now()), sourceItemId: item.id },
        now(),
        ids("reminder"),
      );
      await store.saveReminder(reminder);
    }

    const shouldProcess = options.process ?? this.options.autoProcess ?? true;
    return { item, duplicate: false, reminder, processed: shouldProcess ? this.process(item.id).catch(() => store.items.get(item.id)!) : undefined };
  }

  async captureFromQuery(search: string, options?: CaptureOptions): Promise<CaptureResult | null> {
    const input = parseCaptureQuery(search);
    return input ? this.capture(input, options) : null;
  }

  process(itemId: string): Promise<KnowledgeItem> {
    const running = this.inFlight.get(itemId);
    if (running) return running;
    const run = this.run(itemId).finally(() => this.inFlight.delete(itemId));
    this.inFlight.set(itemId, run);
    return run;
  }

  async processPending(): Promise<KnowledgeItem[]> {
    const todo = [...this.env.store.items.values()].filter((item) => item.status === "pending" || item.status === "failed");
    return Promise.all(todo.map((item) => this.process(item.id)));
  }

  private async run(itemId: string): Promise<KnowledgeItem> {
    const { store, now, ids } = this.env;
    const original = store.items.get(itemId);
    if (!original) throw new Error(`Item not found: ${itemId}`);

    await store.saveItem({ ...original, status: "processing", updatedAt: now().toISOString() });

    try {
      const request = requestFromItem(original, toConceptRefs([...store.concepts.values()]));
      const result = await processCapture(request, this.options.processing);
      // Re-read in case the user edited the item while processing ran; their original fields are kept.
      const latest = store.items.get(itemId) ?? original;
      const applied = applyProcessingResult(latest, result, now());
      const link = linkNewCapture(store.state(), applied, result.output.concepts, result.output.related_topics, { idGenerator: ids });

      await store.saveItem(link.item);
      await store.saveConcepts(link.concepts);
      await store.saveRelationships(link.relationships);
      await store.saveTopics(link.topics);
      await syncConceptIndex(this.env);
      return store.items.get(itemId)!;
    } catch (error) {
      const latest = store.items.get(itemId) ?? original;
      const failed = markFailed(latest, error instanceof Error ? error.message : String(error), now());
      await store.saveItem(failed);
      return failed;
    }
  }
}
