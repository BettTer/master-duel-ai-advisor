#!/usr/bin/env node
import {
  LEVELS,
  cachePath,
  changeDeck,
  formatProfile,
  prepare,
  readJson,
  writeText
} from "./chunk-T6DP5K7P.mjs";
import "./chunk-KT3BCFM7.mjs";
import "./chunk-5P7U5YBU.mjs";

// src/profile.ts
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
function random(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}
function drawHand(pile, size, next) {
  const rest = [...pile];
  const hand = [];
  for (let i = 0; i < size && rest.length > 0; i++) hand.push(...rest.splice(Math.floor(next() * rest.length), 1));
  return { hand, rest };
}
var handKey = (hand) => hand.map((card) => card.id).sort((a, b) => a - b).join(",");
function cacheFile(deck, lines, seconds) {
  const hash = createHash("sha256");
  hash.update(deck.main.map((entry) => `${entry.card.id}x${entry.count}`).sort().join(","));
  hash.update("|" + deck.extra.map((entry) => `${entry.card.id}x${entry.count}`).sort().join(","));
  hash.update("|" + JSON.stringify(lines.map((line) => ({ ...line, card: line.card.id }))));
  hash.update(`|${seconds}|${LEVELS.map((level) => level.weight).join(",")}|v1`);
  return cachePath(`profiles/${hash.digest("hex").slice(0, 16)}.json`);
}
async function profileDeck(deck, planner, lines, setupFor, options) {
  const started = performance.now();
  const pile = deck.main.flatMap((entry) => Array(entry.count).fill(entry.card));
  const next = random(options.seed);
  const wanted = /* @__PURE__ */ new Map();
  for (let i = 0; i < options.hands; i++) {
    const drawn = drawHand(pile, 5, next);
    const key = handKey(drawn.hand);
    const known = wanted.get(key);
    if (known) known.weight++;
    else wanted.set(key, { ...drawn, weight: 1 });
  }
  const file = cacheFile(deck, lines, options.seconds);
  const cached = existsSync(file) ? readJson(file) : {};
  const hands = [];
  let done = 0;
  for (const [key, { hand, rest, weight }] of wanted) {
    let entry = cached[key];
    if (!entry) {
      const result = await planner.plan(setupFor(hand, rest), { nodes: 1e6, seconds: options.seconds }, false);
      entry = { board: result.boards[0] ?? null, seconds: result.seconds };
      cached[key] = entry;
      writeText(file, JSON.stringify(cached));
    }
    const handResult = { key, cards: hand, weight, board: entry.board, seconds: entry.seconds };
    hands.push(handResult);
    options.progress?.(++done, wanted.size, handResult);
  }
  return { deckLabel: options.label, hands, samples: options.hands, distinct: wanted.size, seconds: (performance.now() - started) / 1e3 };
}
async function profileText(input, tiersText, options) {
  const { cards, deck, lines, planner, setupFor, notes } = await prepare(input, tiersText);
  try {
    const progress = (label) => (done, total, hand) => options.progress?.(`${label}${done}/${total} ${hand.cards.map((card) => card.cn || card.en).join("\u3001")} \u2192 ${hand.board ? hand.board.value : "\u65E0"}\uFF08${hand.seconds.toFixed(0)} \u79D2\uFF09`);
    const seed = 20261013;
    const base = await profileDeck(deck, planner, lines, setupFor, { hands: options.hands, seconds: options.seconds, seed, label: deck.name || "\u73B0\u5728\u7684\u5361\u7EC4", progress: progress("") });
    let changed = null;
    if (options.change) {
      const { deck: other, label } = changeDeck(deck, options.change, cards);
      changed = await profileDeck(other, planner, lines, (hand, rest) => setupFor(hand, rest), { hands: options.hands, seconds: options.seconds, seed, label, progress: progress("\u6539\u52A8\u540E ") });
    }
    const { problems, missing, libraries } = notes();
    return formatProfile(base, changed, problems, missing, libraries);
  } finally {
    await planner.close();
  }
}
export {
  drawHand,
  handKey,
  profileDeck,
  profileText,
  random
};
