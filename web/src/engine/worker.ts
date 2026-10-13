// A search worker in the browser: one engine, scripts received from the page, then the planner's messages.
import { startEngine } from "../../../src/engine.ts";
import { createWorkerHandler, type WorkerSetup } from "../../../src/search.ts";
import { loadEngineCards } from "../data/cards.ts";

let handle: ((message: any) => void) | null = null;

self.onmessage = async (event: MessageEvent) => {
  const message = event.data;
  if (message.init) {
    const { setup, scripts } = message.init as { setup: WorkerSetup; scripts: [string, string | null][] };
    const texts = new Map(scripts);
    const engine = await startEngine(await loadEngineCards(), (name) => texts.get(name) ?? null);
    handle = createWorkerHandler(engine, setup, (reply) => self.postMessage(reply));
    self.postMessage({ started: true });
    return;
  }
  handle?.(message);
};
