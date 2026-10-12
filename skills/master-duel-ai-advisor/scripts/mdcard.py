#!/usr/bin/env python3
"""Look up Yu-Gi-Oh! Master Duel cards: exact text, names, MD rarity and banlist.

  mdcard.py card <name or passcode>     one card with full text
  mdcard.py search [filters]            search the Master Duel card pool
  mdcard.py banlist [--status ...]      current Master Duel Forbidden & Limited list
  mdcard.py notes [--preference|--lesson TEXT]   the user's notes, kept outside the skill
  mdcard.py update                      re-download card data now

Card data comes from ygocdb.com (Chinese, Japanese and English names, Chinese
text) and YGOPRODeck (English text, Master Duel rarity). Both are downloaded
once, merged and cached in ~/.cache/master-duel-ai-advisor, then refreshed
weekly.

KONAMI does not publish Master Duel Forbidden & Limited lists in a
machine-readable form. The banlist comes from masterduelmeta.com (current
statuses plus the dated history of list changes), with the yaml-yugi limit
regulation data (https://github.com/DawnbrandBots/yaml-yugi-limit-regulation,
rebuilt daily from Yugipedia) as a fallback. It is fetched at most once a day,
together with any announced list that is not in effect yet.
"""
import argparse
import io
import json
import os
import re
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

CACHE_DIR = Path(os.environ.get("MDAA_CACHE_DIR", Path.home() / ".cache" / "master-duel-ai-advisor"))
CARDS_CACHE = CACHE_DIR / "cards.json"
BANLIST_CACHE = CACHE_DIR / "md_banlist.json"
MDM_ENDPOINTS_CACHE = CACHE_DIR / "mdm_endpoints.json"
NOTES_PATH = Path(os.environ.get("MDAA_CONFIG_DIR", Path.home() / ".config" / "master-duel-ai-advisor")) / "notes.md"

YGOCDB_ZIP = "https://ygocdb.com/api/v0/cards.zip"
YGOPRODECK_ALL = "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes"
MDM_SITE = "https://www.masterduelmeta.com"
# The endpoints Master Duel Meta's banlist page used when this script was written; tried after rediscovery fails.
MDM_KNOWN_ENDPOINTS = {
    "cards": MDM_SITE + "/api/v1/cards?tcgBanStatus[$or][$exists]=true&ocgBanStatus[$or][$exists]=true"
                        "&banStatus[$or][$exists]=true&alternateArt[$ne]=true&limit=0",
    "changes": MDM_SITE + "/api/v1/banlist-changes?sort=-date",
}
YAML_YUGI_URL = "https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/{}.vector.json"
USER_AGENT = "master-duel-ai-advisor (+https://github.com/BettTer/master-duel-ai-advisor)"

DAY = 24 * 3600
CARDS_MAX_AGE = 7 * DAY
BANLIST_MAX_AGE = DAY

RARITY = {"Ultra Rare": "UR", "Super Rare": "SR", "Rare": "R", "Common": "N"}
LIMIT_STATUS = {0: "forbidden", 1: "limited1", 2: "limited2"}
MDM_STATUS = {"Forbidden": "forbidden", "Limited 1": "limited1", "Limited 2": "limited2"}
JST = timezone(timedelta(hours=9))  # Master Duel list dates are announced in Japan time
BAN_LABEL = {"forbidden": "禁止 Forbidden", "limited1": "限制1 Limited 1",
             "limited2": "限制2 Limited 2", "unlimited": "无限制 Unlimited", "unknown": "未知 Unknown"}
EXTRA_KINDS = {"融合", "同调", "超量", "连接"}


# ---------- downloading and caching ----------

def fetch(url, timeout=120):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except urllib.error.URLError as error:
        if not isinstance(error.reason, ssl.SSLError):
            raise
    # python.org builds on macOS ship without CA certificates; the system curl has them.
    return subprocess.run(["curl", "-sSfL", "--max-time", str(timeout), "-A", USER_AGENT, url],
                          check=True, capture_output=True).stdout


def age(path):
    return time.time() - path.stat().st_mtime


def build_cards():
    print("Downloading card data (about 30 MB; first run or weekly refresh)...", file=sys.stderr)
    with zipfile.ZipFile(io.BytesIO(fetch(YGOCDB_ZIP))) as archive:
        cdb = json.loads(archive.read("cards.json"))
    ypd_cards = json.loads(fetch(YGOPRODECK_ALL))["data"]

    ypd_by_id = {}
    for card in ypd_cards:
        for image in card.get("card_images", []):
            ypd_by_id.setdefault(image["id"], card)
    for card in ypd_cards:
        ypd_by_id[card["id"]] = card

    merged, used = [], set()
    for entry in cdb.values():
        ypd = ypd_by_id.get(entry["id"])
        if ypd:
            used.add(ypd["id"])
        merged.append(make_record(entry, ypd))
    for card in ypd_cards:
        if card["id"] not in used:
            merged.append(make_record(None, card))

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    CARDS_CACHE.write_text(json.dumps(merged, ensure_ascii=False), encoding="utf-8")
    return merged


def make_record(cdb, ypd):
    cdb, ypd = cdb or {}, ypd or {}
    misc = (ypd.get("misc_info") or [{}])[0]
    text = cdb.get("text", {})
    aliases = {cdb.get("nwbbs_n"), cdb.get("cnocg_n"), cdb.get("md_en_n"), ypd.get("name")}
    main_id = cdb.get("id") or ypd.get("id")
    return {
        "id": main_id,
        "cid": cdb.get("cid") or misc.get("konami_id"),  # KONAMI card database ID, used by banlists
        "alt_ids": [image["id"] for image in ypd.get("card_images", []) if image["id"] != main_id],
        "cn": cdb.get("cn_name", ""), "md": cdb.get("md_name", ""), "sc": cdb.get("sc_name", ""),
        "jp": cdb.get("jp_name", ""), "en": cdb.get("en_name") or ypd.get("name", ""),
        "aliases": sorted(name for name in aliases if name),
        "types_zh": text.get("types", ""), "desc_zh": text.get("desc", ""), "pdesc_zh": text.get("pdesc", ""),
        "type_en": ypd.get("type", ""), "typeline": ypd.get("typeline", []),
        "race_en": ypd.get("race", ""), "attr_en": ypd.get("attribute", ""),
        "level": ypd.get("level"), "link": ypd.get("linkval"),
        "atk": ypd.get("atk"), "def": ypd.get("def"),
        "archetype": ypd.get("archetype", ""), "desc_en": ypd.get("desc", ""),
        "md_rarity": misc.get("md_rarity", ""), "treated_as": misc.get("treated_as", ""),
    }


def load_cards(force=False):
    if not force and CARDS_CACHE.exists() and age(CARDS_CACHE) < CARDS_MAX_AGE:
        return json.loads(CARDS_CACHE.read_text(encoding="utf-8"))
    try:
        return build_cards()
    except Exception as error:
        if CARDS_CACHE.exists():
            print(f"Could not refresh card data ({error}); using the older cache.", file=sys.stderr)
            return json.loads(CARDS_CACHE.read_text(encoding="utf-8"))
        sys.exit(f"Could not download card data: {error}")


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def jst_date(value):
    return parse_time(value).astimezone(JST).strftime("%Y-%m-%d")


def fetch_text(url):
    return fetch(url, timeout=30).decode("utf-8", "replace")


def discover_mdm_endpoints():
    """Read the API calls Master Duel Meta's own banlist page makes, so a change on their side is picked up."""
    page = fetch_text(MDM_SITE + "/terms-of-service")  # any small page loads the app entry script
    app_path = re.search(r"/_app/immutable/entry/app\.[\w-]+\.js", page).group(0)
    app = fetch_text(MDM_SITE + app_path)
    node = re.search(r'"/forbidden-limited-list":\[(\d+)', app).group(1)
    node_script = fetch_text(MDM_SITE + "/_app/immutable/" + re.search(rf"nodes/{node}\.[\w-]+\.js", app).group(0))
    queries = re.findall(r'"((?:cards|banlist-changes)\?[^"]*)"', node_script)
    cards_query = next(query for query in queries if query.startswith("cards?") and "banStatus" in query)
    changes_query = next(query for query in queries if query.startswith("banlist-changes?"))
    base = None
    chunks = re.findall(r"chunks/[\w.-]+\.js", node_script)
    for chunk in sorted(chunks, key=lambda name: "Fetch" not in name):  # the request helper first
        match = re.search(r'"(/api/v\d+/)"', fetch_text(MDM_SITE + "/_app/immutable/" + chunk))
        if match:
            base = match.group(1)
            break
    return {"cards": MDM_SITE + base + cards_query, "changes": MDM_SITE + base + changes_query}


def banlist_from_masterduelmeta():
    candidates = []
    try:
        candidates.append(("rediscovered", discover_mdm_endpoints()))
    except Exception as error:
        print(f"Could not rediscover Master Duel Meta's banlist endpoints ({error}).", file=sys.stderr)
    if MDM_ENDPOINTS_CACHE.exists():
        candidates.append(("last working", json.loads(MDM_ENDPOINTS_CACHE.read_text(encoding="utf-8"))))
    candidates.append(("known", MDM_KNOWN_ENDPOINTS))
    tried, errors = [], []
    for label, endpoints in candidates:
        if endpoints in tried:
            continue
        tried.append(endpoints)
        try:
            banlist = read_masterduelmeta(endpoints)
        except Exception as error:
            errors.append(f"{label} endpoints: {error}")
            continue
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        MDM_ENDPOINTS_CACHE.write_text(json.dumps(endpoints), encoding="utf-8")
        return banlist
    raise RuntimeError("; ".join(errors))


def encode_query(url):
    return urllib.parse.quote(url, safe=":/?=&,%")  # the queries contain brackets and $


def read_masterduelmeta(endpoints):
    rows = json.loads(fetch(encode_query(endpoints["cards"]), timeout=60))
    statuses = {row["name"]: {"id": int(row["konamiID"]) if row.get("konamiID") else None,
                              "name": row["name"], "status": MDM_STATUS[row["banStatus"]]}
                for row in rows if row.get("banStatus") in MDM_STATUS}
    if len(statuses) < 20:
        raise ValueError(f"only {len(statuses)} cards with a Master Duel status; the data format may have changed")
    now = datetime.now(timezone.utc)
    changes = json.loads(fetch(encode_query(endpoints["changes"]), timeout=60))
    for change in changes:
        change["date"] = change.get("date") or change["announced"]  # a few old records only have "announced"
    in_effect = sorted((change for change in changes if parse_time(change["date"]) <= now),
                       key=lambda change: parse_time(change["date"]), reverse=True)
    pending = sorted((change for change in changes if parse_time(change["date"]) > now),
                     key=lambda change: parse_time(change["date"]))
    current, upcoming = dict(statuses), None
    if pending:
        # For the cards an announced list changes, "from" is the status in force and "to" the coming one.
        upcoming = dict(statuses)
        for change in pending[0]["changes"]:
            name = change["card"]["name"]
            known = statuses.get(name, {"id": None, "name": name})
            for target, field in ((current, "from"), (upcoming, "to")):
                if change.get(field) in MDM_STATUS:
                    target[name] = dict(known, status=MDM_STATUS[change[field]])
                else:
                    target.pop(name, None)
        upcoming = {"date": jst_date(pending[0]["date"]), "entries": list(upcoming.values())}
    return {"current": {"date": jst_date(in_effect[0]["date"]), "entries": list(current.values())},
            "upcoming": upcoming}


def banlist_from_yaml_yugi():
    def entries(vector):
        return [{"cid": int(cid), "status": LIMIT_STATUS[limit]} for cid, limit in vector["regulation"].items()]
    current = json.loads(fetch(YAML_YUGI_URL.format("current"), timeout=15))
    try:
        upcoming = json.loads(fetch(YAML_YUGI_URL.format("upcoming"), timeout=15))
    except Exception:
        upcoming = None  # only published while a new list is announced but not in effect yet
    return {"current": {"date": current["date"], "entries": entries(current)},
            "upcoming": upcoming and {"date": upcoming["date"], "entries": entries(upcoming)}}


BANLIST_SOURCES = (("masterduelmeta.com", banlist_from_masterduelmeta), ("yaml-yugi", banlist_from_yaml_yugi))


def load_banlist(force=False):
    """Return {"source", "current", "upcoming"}, or None if no list could be loaded.

    Each list is {"date": "2026-10-06", "entries": [...], "index": {...}}; entries identify
    cards by passcode ("id"), KONAMI database ID ("cid") or English name.
    """
    if force or not BANLIST_CACHE.exists() or age(BANLIST_CACHE) > BANLIST_MAX_AGE:
        banlist, errors = None, []
        for source, download in BANLIST_SOURCES:
            try:
                banlist = dict(download(), source=source)
                break
            except Exception as error:
                errors.append(f"{source}: {error}")
        if banlist:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            BANLIST_CACHE.write_text(json.dumps(banlist, ensure_ascii=False), encoding="utf-8")
        elif BANLIST_CACHE.exists():
            print(f"Could not refresh the Master Duel banlist ({'; '.join(errors)}); "
                  "using the last downloaded copy.", file=sys.stderr)
        else:
            print(f"Could not download the Master Duel banlist ({'; '.join(errors)}).", file=sys.stderr)
            return None
    banlist = json.loads(BANLIST_CACHE.read_text(encoding="utf-8"))
    for regulation in (banlist["current"], banlist["upcoming"]):
        if regulation:
            regulation["index"] = {key: entry["status"] for entry in regulation["entries"] for key in entry_keys(entry)}
    return banlist


# ---------- helpers ----------

def norm(value):
    return re.sub(r"[\s·・\-－'\"“”‘’「」『』!！?？,，.。:：]", "", value or "").lower()


def norm_text(value):
    return re.sub(r"\s", "", value or "").replace("＋", "+").lower()


def entry_keys(entry):
    keys = [f"{field}:{entry[field]}" for field in ("cid", "id") if entry.get(field)]
    return keys + [f"name:{entry['name'].lower()}"] if entry.get("name") else keys


def card_keys(card):
    keys = [f"cid:{card['cid']}"] + [f"id:{card_id}" for card_id in [card["id"]] + card["alt_ids"]]
    return keys + [f"name:{name.lower()}" for name in [card["en"]] + card["aliases"] if name]


def ban_status(card, regulation):
    return next((regulation["index"][key] for key in card_keys(card) if key in regulation["index"]), "unlimited")


def ban_text(card, banlist):
    if banlist is None:
        return BAN_LABEL["unknown"]
    status = ban_status(card, banlist["current"])
    text = BAN_LABEL[status]
    upcoming = banlist["upcoming"]
    if upcoming and ban_status(card, upcoming) != status:
        text += f" → {upcoming['date']} 起 {BAN_LABEL[ban_status(card, upcoming)]}"
    return text


def banlist_note(banlist):
    if banlist is None:
        return "MD 禁限表没能下载，禁限状态未知"
    note = f"MD 禁限表：{banlist['current']['date']} 生效"
    if banlist["upcoming"]:
        note += f"；已公布 {banlist['upcoming']['date']} 生效的新表"
    return note + f"；来源 {banlist['source']}"


def zh_kinds(card):
    match = re.match(r"\[([^\]]*)\]\s*(\S*)", card["types_zh"].split("\n")[0])
    if not match:
        return set(), "", ""
    race, _, attr = match.group(2).partition("/")
    return set(match.group(1).split("|")), race, attr


def tokens(card):
    kinds, race_zh, attr_zh = zh_kinds(card)
    kind_tokens = {kind.lower() for kind in kinds}
    kind_tokens |= {word.lower() for word in card["typeline"]}
    kind_tokens |= set(card["type_en"].lower().split())
    is_monster = "monster" in card["type_en"].lower()
    if not is_monster and card["race_en"]:
        kind_tokens.add(card["race_en"].lower())
    race_tokens = {race_zh, card["race_en"].lower()} if is_monster else {race_zh}
    attr_tokens = {attr_zh, card["attr_en"].lower()}
    return kind_tokens - {""}, race_tokens - {""}, attr_tokens - {""}


def in_range(value, spec):
    if value is None:
        return False
    low, sep, high = spec.partition("-")
    if not sep:
        return value == int(low)
    return (not low or value >= int(low)) and (not high or value <= int(high))


def names_line(card):
    parts = []
    if card["cn"]:
        parts.append(f"「{card['cn']}」")
    if card["md"] and card["md"] != card["cn"]:
        parts.append(f"MD：{card['md']}")
    if card["en"]:
        parts.append(card["en"])
    return " ".join(parts)


def types_line(card):
    if card["types_zh"]:
        return card["types_zh"].replace("\n", " ")
    stats = f" ATK {card['atk']} / DEF {card['def']}" if card["atk"] is not None else ""
    return f"{card['type_en']} {card['race_en']} {card['attr_en']}".strip() + stats


def md_line(card, banlist):
    rarity = RARITY.get(card["md_rarity"], card["md_rarity"]) if card["md_rarity"] else "未实装或未收录 not in MD data"
    return f"MD：{rarity}｜禁限：{ban_text(card, banlist)}（{banlist_note(banlist)}）"


def materials(card):
    kinds = zh_kinds(card)[0]
    if not kinds & EXTRA_KINDS and not re.search(r"Fusion|Synchro|XYZ|Link", card["type_en"]):
        return ""
    text = card["desc_zh"] or card["desc_en"]
    return text.splitlines()[0].strip() if text else ""


# ---------- commands ----------

def find(cards, query):
    if query.isdigit():
        card_id = int(query)
        return [card for card in cards if card["id"] == card_id or card_id in card["alt_ids"]]
    target = norm(query)
    exact, partial = [], []
    for card in cards:
        names = [norm(name) for name in (card["cn"], card["md"], card["sc"], card["jp"], card["en"], *card["aliases"]) if name]
        if target in names:
            exact.append(card)
        elif any(target in name for name in names):
            partial.append(card)
    return exact or partial


def print_card(card, banlist):
    print(f"{names_line(card)} | {card['jp'] or '-'} | 卡密 {card['id']}")
    print(card["types_zh"] or types_line(card))
    print(md_line(card, banlist))
    same_name = re.search(r"这个卡名在规则上当作「(.+?)」使用", card["desc_zh"])
    treated_as = card["treated_as"] or (f"「{same_name.group(1)}」" if same_name else "")
    if treated_as:
        print(f"规则上当作：{treated_as}（同名卡张数合在一起算）")
    print(f"百鸽页面（含裁定 Q&A）：https://ygocdb.com/card/{card['id']}")
    if card["pdesc_zh"]:
        print(f"\n灵摆效果：\n{card['pdesc_zh']}")
    if card["desc_zh"]:
        print(f"\n中文卡文：\n{card['desc_zh']}")
    if card["desc_en"]:
        print(f"\nEnglish text:\n{card['desc_en']}")


def cmd_card(args):
    cards, banlist = load_cards(), load_banlist()
    missing = False
    for position, query in enumerate(args.query):
        if position:
            print("\n" + "-" * 40 + "\n")
        found = find(cards, query)
        if not found:
            missing = True
            print(f"没找到「{query}」。换一种语言的卡名、只输入一部分，或者用卡密再试。")
        elif len(found) == 1:
            print_card(found[0], banlist)
        else:
            print(f"「{query}」有 {len(found)} 张卡匹配，请用完整卡名或卡密再查一次：")
            for card in found[:20]:
                print(f"  {names_line(card)} | 卡密 {card['id']} | {types_line(card)}")
            if len(found) > 20:
                print(f"  ……还有 {len(found) - 20} 张")
    if missing:
        sys.exit(1)


def cmd_search(args):
    cards, banlist = load_cards(), load_banlist()
    results = []
    for card in cards:
        if not args.all_formats and not card["md_rarity"]:
            continue
        kinds, races, attrs = tokens(card)
        if any(kind.lower() not in kinds for kind in args.kind):
            continue
        if args.race and args.race.lower() not in races:
            continue
        if args.attr and args.attr.lower() not in attrs:
            continue
        if args.level and not in_range(card["level"], args.level):
            continue
        if args.link and not in_range(card["link"], args.link):
            continue
        if args.atk and not in_range(card["atk"], args.atk):
            continue
        if args.defense and not in_range(card["def"], args.defense):
            continue
        if args.archetype and args.archetype.lower() not in card["archetype"].lower():
            continue
        if args.rarity and RARITY.get(card["md_rarity"], "") != args.rarity.upper():
            continue
        if args.name and not any(norm(args.name) in norm(name) for name in
                                 (card["cn"], card["md"], card["sc"], card["jp"], card["en"], *card["aliases"]) if name):
            continue
        texts = norm_text(card["desc_zh"] + card["pdesc_zh"]) + "\n" + norm_text(card["desc_en"])
        if any(norm_text(phrase) not in texts for phrase in args.text):
            continue
        results.append(card)

    results.sort(key=lambda card: (-(card["level"] or card["link"] or 0), card["en"]))
    print(f"共 {len(results)} 张符合条件" + ("（含 MD 未实装的卡）" if args.all_formats else "（仅 MD 已实装）"))
    for card in results[:args.limit]:
        rarity = RARITY.get(card["md_rarity"], "-")
        print(f"{names_line(card)} | {card['id']} | {types_line(card)} | {rarity} | {ban_text(card, banlist)}")
        if args.full:
            print("    " + (card["desc_zh"] or card["desc_en"]).replace("\n", "\n    "))
        elif materials(card):
            print(f"    素材：{materials(card)}")
    if len(results) > args.limit:
        print(f"……只显示前 {args.limit} 张，用 --limit 调整")
    print(f"（{banlist_note(banlist)}）")


def cmd_banlist(args):
    cards, banlist = load_cards(), load_banlist()
    if banlist is None:
        sys.exit("没能下载 Master Duel 禁限表。")
    regulation = banlist["upcoming"] if args.upcoming else banlist["current"]
    if regulation is None:
        sys.exit("目前没有已公布但还没生效的新禁限表。")
    by_key = {}
    for card in cards:
        for key in card_keys(card):
            by_key.setdefault(key, card)
    print(f"Master Duel 禁限表（{regulation['date']} 生效；来源 {banlist['source']}）")
    for status in LIMIT_STATUS.values():
        if args.status and args.status != status:
            continue
        lines = []
        for entry in regulation["entries"]:
            if entry["status"] != status:
                continue
            card = next((by_key[key] for key in entry_keys(entry) if key in by_key), None)
            lines.append(f"  {names_line(card)} | {card['id']}" if card
                         else f"  {entry.get('name') or 'KONAMI ID ' + str(entry.get('cid'))}")
        print(f"\n{BAN_LABEL[status]}：{len(lines)} 张")
        print("\n".join(sorted(lines)))


NOTES_TEMPLATE = """# Master Duel AI Advisor notes

Your preferences and the lessons the assistant should remember. Updating the skill does not change this file,
and you can edit it by hand.

## Preferences

## Lessons
"""


def cmd_notes(args):
    if args.preference or args.lesson:
        heading, entry = ("## Preferences", args.preference) if args.preference else ("## Lessons", args.lesson)
        text = NOTES_PATH.read_text(encoding="utf-8") if NOTES_PATH.exists() else NOTES_TEMPLATE
        if heading not in text:
            text = text.rstrip("\n") + f"\n\n{heading}\n"
        start = text.index(heading) + len(heading)
        end = text.find("\n## ", start)
        end = len(text) if end == -1 else end
        section = text[start:end].rstrip("\n") + f"\n- {time.strftime('%Y-%m-%d')} {entry}\n"
        NOTES_PATH.parent.mkdir(parents=True, exist_ok=True)
        NOTES_PATH.write_text(text[:start] + section + text[end:], encoding="utf-8")
        print(f"已保存到 {NOTES_PATH}\n")
    print(f"笔记文件：{NOTES_PATH}")
    print(NOTES_PATH.read_text(encoding="utf-8") if NOTES_PATH.exists() else "（还没有笔记）")


def cmd_update(args):
    cards = load_cards(force=True)
    banlist = load_banlist(force=True)
    print(f"卡片数据 {len(cards)} 张，其中 MD 已实装 {sum(1 for card in cards if card['md_rarity'])} 张；"
          f"{banlist_note(banlist)}")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Yu-Gi-Oh! Master Duel card lookup")
    sub = parser.add_subparsers(dest="command", required=True)

    card = sub.add_parser("card", help="cards by name (any language) or passcode")
    card.add_argument("query", nargs="+", help="one or more names or passcodes; quote names that contain spaces")
    card.set_defaults(run=cmd_card)

    search = sub.add_parser("search", help="search the Master Duel card pool")
    search.add_argument("--name", help="part of a name, any language")
    search.add_argument("--text", action="append", default=[], help="phrase in the card text (Chinese or English); repeatable")
    search.add_argument("--kind", action="append", default=[], help="card kind, e.g. 同调 / synchro / 调整 / tuner / 速攻 / quick-play; repeatable")
    search.add_argument("--race", help="monster type, e.g. 龙 / dragon")
    search.add_argument("--attr", help="attribute, e.g. 光 / light")
    search.add_argument("--level", help="level or rank: 12, 4-8, 8-, -4")
    search.add_argument("--link", help="link rating, same format as --level")
    search.add_argument("--atk", help="ATK, same format as --level")
    search.add_argument("--def", dest="defense", help="DEF, same format as --level")
    search.add_argument("--archetype", help="YGOPRODeck archetype name (English), e.g. Branded")
    search.add_argument("--rarity", help="MD rarity: UR / SR / R / N")
    search.add_argument("--all-formats", action="store_true", help="include cards not in Master Duel")
    search.add_argument("--full", action="store_true", help="print the full card text of each result")
    search.add_argument("--limit", type=int, default=60)
    search.set_defaults(run=cmd_search)

    banlist = sub.add_parser("banlist", help="current Master Duel Forbidden & Limited list")
    banlist.add_argument("--status", choices=["forbidden", "limited1", "limited2"])
    banlist.add_argument("--upcoming", action="store_true", help="show the announced list that is not in effect yet")
    banlist.set_defaults(run=cmd_banlist)

    notes = sub.add_parser("notes", help="show the user's notes, or add a preference or lesson")
    entry = notes.add_mutually_exclusive_group()
    entry.add_argument("--preference", help="a lasting preference, e.g. 'mostly plays going second'")
    entry.add_argument("--lesson", help="a correction the assistant should remember")
    notes.set_defaults(run=cmd_notes)

    update = sub.add_parser("update", help="re-download card data and the banlist now")
    update.set_defaults(run=cmd_update)

    args = parser.parse_args()
    args.run(args)


if __name__ == "__main__":
    main()
