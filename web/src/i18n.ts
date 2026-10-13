// Chinese and English for the interface. The dictionary is keyed by the Chinese text, which is also the key the
// engine's reports use (levels, zones, actions), so one table covers both the chrome and the reports.
export type Lang = "zh" | "en";

let current: Lang = (localStorage.getItem("lang") as Lang) || (navigator.language.startsWith("zh") ? "zh" : "en");
export const getLang = () => current;
export function setLang(lang: Lang) {
  current = lang;
  localStorage.setItem("lang", lang);
}

// Terms follow Master Duel's English client and the usual community wording (Master Duel Meta, YGOPRODeck).
const EN: Record<string, string> = {
  // header, library
  "卡组": "Decks", "查卡": "Cards", "卡图": "Art", "加载卡片数据…": "Loading card data…", "加载失败：": "Could not load: ",
  "打开卡组…": "Opening deck…", "我的卡组": "My decks", "← 我的卡组": "← My decks", "复制分享链接": "Copy share link", "链接已复制": "Link copied",
  "还没有卡组。下面导入一副，它会一直留在这个浏览器里。": "No decks yet. Import one below; it stays in this browser.",
  " · 有终端清单": " · has endpoints", "改名": "Rename", "删除": "Delete", "卡组名字": "Deck name", "导入卡组": "Import a deck", "导入": "Import",
  "名字（可选）": "Name (optional)", "分享的卡组": "Shared deck", "新卡组": "Deck",
  "粘贴 YDKE 字符串、.ydk 的内容，或者一行一张的卡表（`3 灰流丽`、`Ash Blossom x3`）。Master Duel 的卡组可以通过官方卡片数据库导出 YDKE。":
    "Paste a YDKE string, the contents of a .ydk file, or a card list with one card per line (`3 灰流丽`, `Ash Blossom x3`). Master Duel decks can be exported as YDKE through the official card database.",
  "卡片数据来自百鸽（ygocdb.com）、Master Duel Meta、Project Ignis；规则引擎是 EDOPro 的核心。卡文和卡图的版权属于 KONAMI。":
    "Card data from ygocdb.com, Master Duel Meta and Project Ignis; the rules engine is EDOPro's core. Card text and images are KONAMI's.",
  " 数据构建于 ": " Data built ",
  // workspace tabs
  "卡表与检查": "List & checks", "编辑": "Edit", "起手": "Hand", "路线图": "Route", "全景": "Profile",
  // editor
  "新建空卡组": "New empty deck", "空卡组。在右边找卡，拖过来或者点一下。": "Empty deck. Find cards on the right and drag or click them.", "主卡组": "Main Deck", "找卡": "Find cards", "卡文里的词": "Words in the card text", " 张（最多显示 60）": " cards (60 shown at most)",
  "只显示 MD 已实装的卡。拖到左边加入卡组。": "Only cards in Master Duel. Drag a card to the left to add it.",
  "从右边把卡拖进来加一张；卡上的 ＋ － 或右键改张数。": "Drag a card in from the right to add a copy; use + / − on a card, or right-click, to change the count.",
  "禁止卡": "Forbidden", " 最多 ": ": at most ", " 张": "", "主卡组已经 60 张": "The Main Deck already has 60 cards", "额外卡组已经 15 张": "The Extra Deck already has 15 cards",
  // deck view
  "卡表": "Deck list", "主": "Main", "额外": "Extra", "怪兽": "Monsters", "魔法": "Spells", "陷阱": "Traps", "额外卡组": "Extra Deck", "检查": "Checks",
  "没有发现张数、禁限或实装方面的问题。": "No problems with deck size, the banlist or availability.",
  "按部分卡名认的，请确认：": "Matched by part of the name, please check: ", "没认出来：": "Not recognised: ",
  "额外卡组的锁": "Extra Deck locks", " → 额外里出不来：": " → rules out: ", "同一回合一起用": "Used in the same turn",
  "额外卡组一只都出不来": "nothing in the Extra Deck can be summoned", "额外只剩 ": "Extra Deck left: ",
  "可能没有目标": "Possibly no target", "按卡名和字段判断，请确认": "judged by names and archetypes, please check",
  // hand page
  "先在「卡组」页读入一副卡组。": "Import a deck first.", "随机发一手": "Random hand", "清空": "Clear",
  "点下面的卡加入起手，点起手里的卡拿掉。": "Click a card below to add it; click a card in the hand to remove it.",
  "终端清单": "Endpoints", "重新按卡文生成草稿": "Redraft from card text",
  "打开卡组时已经按卡文填了一版草稿：手坑、康、处理卡都认得，但级别和回合外的链条（淘气拉红精灵这种）要自己核。让 AI 助手照 SKILL.md 做终端分析会准得多。":
    "A draft was filled in from the card text when the deck was opened: hand traps, negates and removal are recognised, but check the levels and add the off-turn chains (Spright Elf bringing back Spright Red) yourself. An AI assistant following SKILL.md does this far better.",
  "最多搜 ": "Search up to ", " 秒": " s", "搜索中…": "Searching…", "规划这手起手": "Plan this hand", "先选起手": "Pick a hand first",
  "先填终端清单，或者点上面的\"生成草稿\"": "Fill in the endpoints first, or click \"Draft\" above",
  "准备引擎…": "Starting the engine…", "出错：": "Error: ", "规则引擎还没有这些卡的数据：": "The engine has no data for: ",
  "终端＝对手回合能用的打断。级别：第0级（对面康不了，超融合）、第一级（三色康）、1.5级（增殖的G）、第二级（有条件的康）、2.5级（条件很窄）、软康（税和锁）、第三级（除外、破坏、送墓、回手）、保护。附加写法：×2、在手里、在墓地、自己回合、召唤时、回合外出、回合外 → 墓地/卡组/额外 〈卡〉[到手]、带 N 只、要 另有/额外有/墓地有 〈卡〉。":
    "Endpoints are the interruptions you can use on the opponent's turn. Levels: 第0级 (cannot be answered: Super Polymerization), 第一级 (omni-negate), 1.5级 (Maxx \"C\"), 第二级 (conditional negate), 2.5级 (very narrow negate), 软康 (tax or lock), 第三级 (removal), 保护 (protection). Extras: ×2, 在手里 (in hand), 在墓地 (in GY), 自己回合 (own turn only), 召唤时 (on summon), 回合外出 (best made off-turn), 回合外 → 墓地/卡组/额外 <cards> [到手] (brings out off-turn), 带 N 只, 要 另有/额外有/墓地有 <cards>. Card names in Chinese (YGOPro names).",
  // route page
  "在「起手」页规划一手起手后，这里显示路线。": "Plan a hand on the Hand tab; the route appears here.", "最大场": "Best board", "被「": "Under ", "」打断": "",
  "这条路线上没有发动的时机。": "No chance to use it on this route.", " 个时机里最狠的：在「": " chances; the worst is after ", "」后发动": "",
  "（没搜完）": " (search cut short)", "发动后做不出任何场。": "Nothing can be done after it.", "路线": "Route", "终场": "End board", "妥协场": "Fallback board",
  "价值 ": "Value ", "没有怪兽": "no monsters", " ｜ 后场 ": " | backrow ", "场上": "Field", "墓地": "GY", "手里": "Hand", "对手回合带出": "Brought out on their turn",
  "（自己回合）": " (own turn)", "对手抽了 ": "Opponent drew ", " 张（每张扣 ": " (each costs ", "）": ")", "其他的场": "Other boards", "（没有怪兽）": "(no monsters)",
  "，后场 ": ", backrow ", "第一步的每种选择": "Each first action", "（不发动，继续）": "(pass)", "全部搜完（": "searched fully (", " 个节点）": " nodes)",
  "搜了 ": "searched ", " 个节点，没搜完": " nodes, cut short", "，最好 ": ", best ", "共 ": "", " 个不同局面，": " positions, ", " 秒。": " s.",
  "开局": "Start", "不发动，继续": "Pass", "起": "0", "手": "Hand", "场": "Field", "后场": "Backrow", "墓": "GY", "除外": "Banished",
  "通召": "Normal Summon", "特召": "Special Summon", "发动": "Activate", "连锁发动": "Chain", "选 ": "Pick ", "选第 ": "Option ", " 个效果": "", "宣言": "Declare ",
  "对手发动「": "Opponent activates ", "对手对「": "Opponent targets ", "」发动「": " with ", "」": "", "「": "",
  // levels
  "第0级": "Tier 0", "第一级": "Omni-negate", "1.5级": "Tier 1.5", "第二级": "Negate", "2.5级": "Narrow negate", "软康": "Tax", "第三级": "Removal", "保护": "Protection",
  // profile
  "先读入卡组，再在「起手」页写好终端清单。": "Import a deck and write its endpoints on the Hand tab first.", "卡组全景": "Deck profile",
  "按真实概率随机抽起手，每手用引擎搜几秒，看这副卡组平均做出什么、多久卡一次、每张卡贡献多少。用「起手」页的终端清单。":
    "Draws opening hands at their real probability and searches each for a few seconds: what the deck makes on average, how often it bricks, what each card adds. Uses the endpoints from the Hand tab.",
  "抽 ": "Sample ", " 手": " hands", "每手 ": "", "计算中…": "Running…", "开始": "Start", "平均价值 ": "Average value ",
  " 手抽样，": " hands sampled, ", " 种不同起手，误差约 ±1": " distinct, about ±1 error", "最常见的终场": "Most common boards", "最差的起手": "Worst hands",
  "点一下载入起手页": "click to load on the Hand tab", "每张卡的贡献": "What each card adds", "起手里有它时的平均价值，减去没有它时的": "average value with it minus without it",
  "做出第一级以上的康": "Omni-negate or better", "最好只到第二级": "At best a conditional negate", "只有处理或保护": "Only removal or protection", "只剩手坑，场上什么都没有": "Only hand traps, nothing on the field",
  "无": "none",
  // lookup
  "卡名，中、英、日都行": "Name, in Chinese, English or Japanese", "卡文里的词，比如 调整＋调整以外的怪兽1只以上": "Words in the card text, e.g. 调整＋调整以外的怪兽1只以上",
  "种类": "Kind", "等级：12、4-8、8-": "Level: 12, 4-8, 8-", " 张（最多显示 80）": " cards (80 shown at most)", "只显示 MD 已实装的卡。": "Only cards in Master Duel are shown.",
  "未实装": "not in MD", "禁止": "Forbidden", "限制 1": "Limited", "准限制 2": "Semi-Limited", "无限制": "Unlimited", "未知": "unknown", "百鸽（含裁定）": "ygocdb (with rulings)",
  "调整": "Tuner", "融合": "Fusion", "同调": "Synchro", "超量": "Xyz", "连接": "Link", "仪式": "Ritual", "灵摆": "Pendulum", "速攻": "Quick-Play", "永续": "Continuous", "场地": "Field Spell", "装备": "Equip", "反击": "Counter",
  "禁": "F", "限1": "L1", "准": "SL",
};

/** The text for the current language; Chinese text is its own key. */
const ZH: Record<string, string> = { "新卡组": "卡组" };
export const t = (zh: string): string => (current === "en" ? EN[zh] ?? zh : ZH[zh] ?? zh);
/** The list separator for the current language. */
export const sep = () => (current === "en" ? ", " : "、");

/** Replace every known Chinese fragment in a report string, longest first, for the English interface. */
const fragments = Object.keys(EN).filter((key) => key.length > 1).sort((a, b) => b.length - a.length);
export function translateReport(text: string, nameOf: (cn: string) => string): string {
  if (current !== "en") return text;
  // Card names first, then the words around them.
  let out = text.replace(/「([^」]+)」/g, (_, name) => nameOf(name));
  for (const key of fragments) if (out.includes(key)) out = out.split(key).join(EN[key]);
  return out;
}
