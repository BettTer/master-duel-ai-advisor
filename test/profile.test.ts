import assert from "node:assert/strict";
import { test } from "node:test";
import { drawHand, handKey, random } from "../src/profile.ts";
import { card } from "./helpers.ts";

test("hands are drawn by the real probability and the same seed draws the same hands", () => {
  const pile = [...Array(3).fill(card({ id: 1, cn: "A" })), ...Array(37).fill(card({ id: 2, cn: "B" }))];
  const counts = new Map<string, number>();
  const next = random(7);
  for (let i = 0; i < 4000; i++) {
    const { hand, rest } = drawHand(pile, 5, next);
    assert.equal(hand.length + rest.length, 40);
    counts.set(handKey(hand), (counts.get(handKey(hand)) ?? 0) + 1);
  }
  // No A in hand: C(37,5)/C(40,5) ≈ 65.9%.
  const noneShare = (counts.get("2,2,2,2,2") ?? 0) / 4000;
  assert.ok(Math.abs(noneShare - 0.659) < 0.03, `${noneShare}`);
  const again = random(7);
  assert.equal(handKey(drawHand(pile, 5, again).hand), handKey(drawHand(pile, 5, random(7)).hand));
});
