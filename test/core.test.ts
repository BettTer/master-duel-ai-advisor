import assert from "node:assert/strict";
import { test } from "node:test";
import { banStatus, discoverMdmEndpoints, readMasterDuelMeta, type Regulation } from "../src/banlist.ts";
import type { Card } from "../src/cards.ts";
import { addEntry } from "../src/notes.ts";
import { findCards, inRange, searchCards } from "../src/query.ts";

function card(fields: Partial<Card>): Card {
  return {
    id: 1, cid: null, altIds: [], cn: "", md: "", sc: "", jp: "", en: "", aliases: [],
    typesZh: "", descZh: "", pdescZh: "", typeEn: "", typeline: [], raceEn: "", attrEn: "",
    level: null, link: null, atk: null, def: null, archetype: "", descEn: "", mdRarity: "Common", treatedAs: "",
    ...fields,
  };
}

const meister = card({
  id: 73218792, cid: 22310, cn: "废品大王", md: "废品大师", en: "Junk Meister",
  typesZh: "[怪兽|效果] 战士/地\n[★4] 100/2300", typeEn: "Effect Monster", typeline: ["Warrior", "Effect"],
  raceEn: "Warrior", attrEn: "EARTH", level: 4, mdRarity: "Ultra Rare",
});
const despian = card({
  id: 53971455, cid: 18001, cn: "赫圣之妖骑士", en: "Despian Luluwalilith",
  typesZh: "[怪兽|效果|同调] 魔法师/光\n[★12] 2500/2500", descZh: "4星调整＋调整以外的怪兽1只以上\r\n①：…",
  typeEn: "Synchro Effect Monster", typeline: ["Spellcaster", "Synchro", "Effect"], raceEn: "Spellcaster",
  attrEn: "LIGHT", level: 12, mdRarity: "Ultra Rare",
});
const ocgOnly = card({ id: 5, cn: "未实装", en: "Not In MD", level: 12, typesZh: "[怪兽|效果|同调] 龙/光", mdRarity: "" });
const cards = [meister, despian, ocgOnly];

test("inRange accepts exact values and open or closed ranges", () => {
  assert.ok(inRange(12, "12"));
  assert.ok(inRange(6, "4-8"));
  assert.ok(inRange(9, "8-"));
  assert.ok(!inRange(5, "-4"));
  assert.ok(!inRange(null, "4"));
  assert.throws(() => inRange(4, "abc"));
});

test("findCards matches any language, passcodes, and prefers exact names", () => {
  assert.deepEqual(findCards(cards, "废品大师"), [meister]);
  assert.deepEqual(findCards(cards, "junk meister"), [meister]);
  assert.deepEqual(findCards(cards, "53971455"), [despian]);
  assert.deepEqual(findCards(cards, "妖骑"), [despian]);
});

test("searchCards filters by Chinese or English kinds and text, and hides cards not in Master Duel", () => {
  assert.deepEqual(searchCards(cards, { kind: ["同调"], level: "12" }), [despian]);
  assert.deepEqual(searchCards(cards, { kind: ["synchro"], attr: "光" }), [despian]);
  assert.deepEqual(searchCards(cards, { text: ["调整+调整以外的怪兽1只以上"] }), [despian]);
  assert.deepEqual(searchCards(cards, { level: "12", allFormats: true }).length, 2);
  assert.deepEqual(searchCards(cards, { rarity: "UR", race: "warrior" }), [meister]);
});

test("banStatus matches entries by KONAMI ID, passcode or name", () => {
  const regulation: Regulation = {
    date: "2026-10-06",
    entries: [{ cid: 22310, status: "limited1" }, { id: 53971455, status: "forbidden" }, { name: "not in md", status: "limited2" }],
  };
  assert.equal(banStatus(meister, regulation), "limited1");
  assert.equal(banStatus(despian, regulation), "forbidden");
  assert.equal(banStatus(ocgOnly, regulation), "limited2");
  assert.equal(banStatus(card({ id: 99 }), regulation), "unlimited");
});

function mdmRows(extra: object[] = []) {
  const filler = Array.from({ length: 25 }, (_, i) => ({ name: `Filler ${i}`, konamiID: String(1000 + i), banStatus: "Forbidden" }));
  return [...filler, { name: "Unbanned", konamiID: "7", banStatus: null }, ...extra];
}

test("readMasterDuelMeta builds the list in effect and an announced one from a pending change", async () => {
  const future = new Date(Date.now() + 7 * 86400_000).toISOString();
  const changes = [
    { date: future, announced: "2026-10-01T06:00:00.000Z", changes: [
      { card: { name: "Junk Meister" }, to: "Forbidden" },
      { card: { name: "Despian Luluwalilith" }, from: "Limited 1", to: "Limited 2" },
    ] },
    { date: "2026-10-06T07:30:00.000Z", announced: "2026-09-24T06:00:00.000Z", changes: [] },
    { announced: "2022-06-10T03:14:44.635Z", changes: [] }, // old records can lack "date"
  ];
  // The site may already show the announced status; "from" should still win for the list in effect.
  const rows = mdmRows([{ name: "Despian Luluwalilith", konamiID: "53971455", banStatus: "Limited 2" }]);
  const get = async (url: string) => (url.includes("banlist-changes") ? structuredClone(changes) : rows);
  const banlist = await readMasterDuelMeta({ cards: "https://x/cards?a[$b]=1", changes: "https://x/banlist-changes" }, get);
  const lookup = (regulation: Regulation, name: string) => regulation.entries.find((entry) => entry.name === name)?.status;

  assert.equal(banlist.current.date, "2026-10-06");
  assert.equal(lookup(banlist.current, "Despian Luluwalilith"), "limited1");
  assert.equal(lookup(banlist.current, "Junk Meister"), undefined);
  assert.equal(lookup(banlist.upcoming!, "Despian Luluwalilith"), "limited2");
  assert.equal(lookup(banlist.upcoming!, "Junk Meister"), "forbidden");
  assert.equal(lookup(banlist.current, "Unbanned"), undefined);
});

test("readMasterDuelMeta rejects data that no longer looks like a banlist", async () => {
  const get = async (url: string) => (url.includes("banlist-changes") ? [] : [{ name: "A", banStatus: "Forbidden" }]);
  await assert.rejects(readMasterDuelMeta({ cards: "c", changes: "banlist-changes" }, get), /data format may have changed/);
});

test("discoverMdmEndpoints follows the site's own scripts to the banlist queries", async () => {
  const pages: Record<string, string> = {
    "/terms-of-service": '<script>import("/_app/immutable/entry/app.Ab1.js")</script>',
    "/_app/immutable/entry/app.Ab1.js": '"/forbidden-limited-list":[31],x=import("../nodes/31.Zz9.js")',
    "/_app/immutable/nodes/31.Zz9.js": 'import"../chunks/Button.q.js";import"../chunks/Fetcher.k2.js";getAll(["cards?banStatus[$exists]=true&limit=0","banlist-changes?sort=-date"])',
    "/_app/immutable/chunks/Fetcher.k2.js": 'const base="/api/v2/"',
  };
  const get = async (url: string) => {
    const page = pages[url.replace("https://www.masterduelmeta.com", "")];
    if (page === undefined) throw new Error(`unexpected ${url}`);
    return page;
  };
  assert.deepEqual(await discoverMdmEndpoints(get), {
    cards: "https://www.masterduelmeta.com/api/v2/cards?banStatus[$exists]=true&limit=0",
    changes: "https://www.masterduelmeta.com/api/v2/banlist-changes?sort=-date",
  });
});

test("addEntry appends to the right section and recreates a missing one", () => {
  const notes = "# Notes\n\n## Preferences\n- 2026-10-01 a\n\n## Lessons\n";
  const withPreference = addEntry(notes, "preference", "b", "2026-10-12");
  assert.equal(withPreference, "# Notes\n\n## Preferences\n- 2026-10-01 a\n- 2026-10-12 b\n\n## Lessons\n");
  assert.equal(addEntry("# Notes\n", "lesson", "c", "2026-10-12"), "# Notes\n\n## Lessons\n- 2026-10-12 c\n");
});
