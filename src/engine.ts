// EDOPro's rules engine (ygopro-core) compiled to WebAssembly: set up a duel, answer its decisions, and save and
// restore its whole state by copying the WebAssembly memory.
import createCore, { OcgDuelMode, OcgLocation, OcgPosition, OcgProcessResult } from "../node_modules/@n1xx1/ocgcore-wasm/dist/index.js";
import type { OcgCoreSync, OcgDuelHandle, OcgMessage, OcgResponse } from "../node_modules/@n1xx1/ocgcore-wasm/dist/index.js";

export { OcgLocation, OcgPosition };

/** A card as the engine reads it (OCG_CardData); race is a plain number so it fits in JSON. */
export interface EngineCard {
  code: number;
  alias: number;
  setcodes: number[];
  type: number;
  attack: number;
  defense: number;
  link_marker: number;
  level: number;
  lscale: number;
  rscale: number;
  race: number;
  attribute: number;
}

const OPPONENT_CARD = 89631139; // Blue-Eyes White Dragon: a Normal Monster, so the opponent never has anything to do

export interface Engine {
  /** Start a duel going first with this hand, the rest of the Main Deck and the Extra Deck, before any processing. */
  newDuel(hand: number[], main: number[], extra: number[], opponentHand?: number[]): OcgDuelHandle;
  /** Run until the engine needs a decision; returns that message, or null when the duel ended. */
  advance(duel: OcgDuelHandle, onMessage?: (message: OcgMessage) => void): OcgMessage | null;
  respond(duel: OcgDuelHandle, response: OcgResponse): void;
  destroy(duel: OcgDuelHandle): void;
  /** Cards in one of player 0's locations. */
  cards(duel: OcgDuelHandle, location: OcgLocation): { code: number; position: number }[];
  /** Copy the engine's state, into `into` when it has the right size (reusing memory), otherwise a new array. */
  save(into?: Uint8Array): Uint8Array;
  load(state: Uint8Array): void;
  /** Script files the engine asked for and did not find. */
  missingScripts: Set<string>;
}

/** `readScript` returns a script file's text by name (c12345.lua, utility.lua…), or null when there is none. */
export async function startEngine(data: Map<number, EngineCard>, readScript: (name: string) => string | null): Promise<Engine> {
  // The engine's whole state lives in its WebAssembly memory; catching the instance gives access to it.
  let memory: WebAssembly.Memory | null = null;
  const instantiate = WebAssembly.instantiate;
  (WebAssembly as any).instantiate = async (...args: any[]) => {
    const result: any = await (instantiate as any).apply(WebAssembly, args);
    const instance: WebAssembly.Instance = result.instance ?? result;
    memory = Object.values(instance.exports).find((value) => value instanceof WebAssembly.Memory) as WebAssembly.Memory ?? null;
    return result;
  };
  let lib: OcgCoreSync;
  try {
    lib = await createCore({ sync: true });
  } finally {
    (WebAssembly as any).instantiate = instantiate;
  }
  if (!memory) throw new Error("没拿到规则引擎的内存，存档功能用不了");
  const heap = memory as WebAssembly.Memory;

  // Saves copy only the part of memory the engine has written to (a few MB of its 16 MB). Its heap grows upward, so
  // writes past that part show up first just above it: each save checks there, and the part grows when needed.
  const MARGIN = 1 << 20;
  let used = 0;
  const coverWrites = (memoryNow: Uint8Array) => {
    const words = new Uint32Array(memoryNow.buffer, 0, memoryNow.length >> 2);
    let clean = used > 0;
    const near = Math.min(words.length, (used + MARGIN) >> 2);
    for (let index = used >> 2; index < near && clean; index++) if (words[index] !== 0) clean = false;
    for (let index = near; index < words.length && clean; index += 1024) if (words[index] !== 0) clean = false;
    if (clean) return;
    let top = words.length - 1;
    while (top > 0 && words[top] === 0) top--;
    used = Math.max(used, Math.min(memoryNow.length, (top + 1) * 4 + MARGIN));
  };

  const scripts = new Map<string, string>();
  const missingScripts = new Set<string>();
  const script = (name: string): string => {
    if (!scripts.has(name)) {
      const text = readScript(name);
      if (text === null) missingScripts.add(name);
      scripts.set(name, text ?? "");
    }
    return scripts.get(name)!;
  };
  const cardData = (code: number) => {
    const card = data.get(code);
    return card ? { ...card, race: BigInt(card.race) } : null;
  };

  return {
    newDuel(hand, main, extra, opponentHand = []) {
      const duel = lib.createDuel({
        flags: OcgDuelMode.MODE_MR5,
        seed: [1n, 2n, 3n, 4n],
        team1: { drawCountPerTurn: 1, startingDrawCount: 0, startingLP: 8000 },
        team2: { drawCountPerTurn: 1, startingDrawCount: 5, startingLP: 8000 },
        cardReader: cardData as any,
        scriptReader: script,
        errorHandler: () => {},
      });
      if (!duel) throw new Error("规则引擎没能建立对局");
      for (const file of ["constant.lua", "utility.lua"]) lib.loadScript(duel, file, script(file));
      const add = (team: 0 | 1, code: number, location: OcgLocation) =>
        lib.duelNewCard(duel, { team, duelist: 0, code, controller: team, location, sequence: 0, position: OcgPosition.FACEDOWN_DEFENSE });
      hand.forEach((code) => add(0, code, OcgLocation.HAND));
      main.forEach((code) => add(0, code, OcgLocation.DECK));
      extra.forEach((code) => add(0, code, OcgLocation.EXTRA));
      opponentHand.forEach((code) => add(1, code, OcgLocation.HAND));
      for (let i = 0; i < 40; i++) add(1, OPPONENT_CARD, OcgLocation.DECK);
      lib.startDuel(duel);
      return duel;
    },
    advance(duel, onMessage) {
      while (true) {
        const status = lib.duelProcess(duel);
        const messages = lib.duelGetMessage(duel).filter(Boolean) as OcgMessage[];
        if (onMessage) messages.forEach(onMessage);
        if (status === OcgProcessResult.END) return null;
        if (status === OcgProcessResult.CONTINUE) continue;
        return messages[messages.length - 1] ?? null;
      }
    },
    respond: (duel, response) => lib.duelSetResponse(duel, response),
    destroy: (duel) => lib.destroyDuel(duel),
    cards: (duel, location) =>
      (lib.duelQueryLocation(duel, { controller: 0, location, flags: 3 } as any).filter(Boolean) as any[])
        .filter((info) => info.code).map((info) => ({ code: info.code, position: info.position })),
    save: (into) => {
      const memoryNow = new Uint8Array(heap.buffer);
      coverWrites(memoryNow);
      if (!into || into.length !== used) return memoryNow.slice(0, used);
      into.set(memoryNow.subarray(0, used));
      return into;
    },
    load: (state) => {
      const memoryNow = new Uint8Array(heap.buffer);
      memoryNow.set(state);
      // Nothing had been written above the state's length when it was saved.
      if (state.length < used) memoryNow.fill(0, state.length, used);
    },
    missingScripts,
  };
}
