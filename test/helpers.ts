import type { Card } from "../src/cards.ts";

export function card(fields: Partial<Card>): Card {
  return {
    id: 1, cid: null, altIds: [], cn: "", md: "", sc: "", jp: "", en: "", aliases: [],
    typesZh: "", descZh: "", pdescZh: "", typeEn: "", typeline: [], raceEn: "", attrEn: "",
    level: null, link: null, atk: null, def: null, archetype: "", descEn: "", mdRarity: "N", mdRelease: "", treatedAs: "",
    ...fields,
  };
}
