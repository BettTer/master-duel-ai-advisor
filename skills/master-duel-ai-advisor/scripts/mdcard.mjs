#!/usr/bin/env node

// src/cli.ts
import { readFileSync as readFileSync4 } from "node:fs";
import { parseArgs } from "node:util";

// src/notes.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "node:fs";
import { join as join2 } from "node:path";

// src/cache.ts
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
var CACHE_DIR = process.env.MDAA_CACHE_DIR ?? join(homedir(), ".cache", "master-duel-ai-advisor");
var CONFIG_DIR = process.env.MDAA_CONFIG_DIR ?? join(homedir(), ".config", "master-duel-ai-advisor");
var DAY = 24 * 3600;
function cachePath(name) {
  return join(CACHE_DIR, name);
}
function ageOf(path) {
  return existsSync(path) ? (Date.now() - statSync(path).mtimeMs) / 1e3 : Infinity;
}
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
}

// src/notes.ts
var NOTES_PATH = join2(CONFIG_DIR, "notes.md");
var TEMPLATE = `# Master Duel AI Advisor notes

Your preferences and the lessons the assistant should remember. Updating the skill does not change this file,
and you can edit it by hand.

## Preferences

## Lessons
`;
var HEADINGS = { preference: "## Preferences", lesson: "## Lessons" };
function addEntry(notes, kind, entry, date) {
  const heading = HEADINGS[kind];
  if (!notes.includes(heading)) notes = `${notes.replace(/\n+$/, "")}

${heading}
`;
  const start = notes.indexOf(heading) + heading.length;
  const next = notes.indexOf("\n## ", start);
  const end = next === -1 ? notes.length : next;
  const section = `${notes.slice(start, end).replace(/\n+$/, "")}
- ${date} ${entry}
`;
  return notes.slice(0, start) + section + notes.slice(end);
}
function readNotes() {
  return existsSync2(NOTES_PATH) ? readFileSync2(NOTES_PATH, "utf8") : null;
}
function addNote(kind, entry) {
  const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
  writeText(NOTES_PATH, addEntry(readNotes() ?? TEMPLATE, kind, entry, date));
}
function formatNotes() {
  return `\u7B14\u8BB0\u6587\u4EF6\uFF1A${NOTES_PATH}
${readNotes() ?? "\uFF08\u8FD8\u6CA1\u6709\u7B14\u8BB0\uFF09"}`;
}

// src/banlist.ts
import { existsSync as existsSync4 } from "node:fs";

// src/http.ts
var USER_AGENT = "master-duel-ai-advisor (+https://github.com/BettTer/master-duel-ai-advisor)";
async function fetchBytes(url, timeoutSeconds = 120) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(timeoutSeconds * 1e3)
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}
async function fetchText(url, timeoutSeconds = 30) {
  return new TextDecoder().decode(await fetchBytes(url, timeoutSeconds));
}
async function fetchJson(url, timeoutSeconds = 60) {
  return JSON.parse(await fetchText(url, timeoutSeconds));
}

// src/mdm.ts
import { existsSync as existsSync3 } from "node:fs";
var ENDPOINTS_CACHE = cachePath("mdm_endpoints.json");
var MDM_SITE = "https://www.masterduelmeta.com";
var MDM_KNOWN_ENDPOINTS = {
  cards: `${MDM_SITE}/api/v1/cards?tcgBanStatus[$or][$exists]=true&ocgBanStatus[$or][$exists]=true&banStatus[$or][$exists]=true&alternateArt[$ne]=true&limit=0`,
  changes: `${MDM_SITE}/api/v1/banlist-changes?sort=-date`
};
function mustMatch(text, pattern, what) {
  const match = text.match(pattern);
  if (!match) throw new Error(`${what} not found`);
  return match;
}
async function discoverMdmEndpoints(get = fetchText) {
  const page = await get(`${MDM_SITE}/terms-of-service`);
  const appPath = mustMatch(page, /\/_app\/immutable\/entry\/app\.[\w-]+\.js/, "app entry script")[0];
  const app = await get(MDM_SITE + appPath);
  const node = mustMatch(app, /"\/forbidden-limited-list":\[(\d+)/, "banlist route")[1];
  const nodePath = mustMatch(app, new RegExp(`nodes/${node}\\.[\\w-]+\\.js`), "banlist page script")[0];
  const nodeScript = await get(`${MDM_SITE}/_app/immutable/${nodePath}`);
  const queries = [...nodeScript.matchAll(/"((?:cards|banlist-changes)\?[^"]*)"/g)].map((match) => match[1]);
  const cardsQuery = queries.find((query) => query.startsWith("cards?") && query.includes("banStatus"));
  const changesQuery = queries.find((query) => query.startsWith("banlist-changes?"));
  if (!cardsQuery || !changesQuery) throw new Error("banlist queries not found in the page script");
  const chunks = [...nodeScript.matchAll(/chunks\/[\w.-]+\.js/g)].map((match) => match[0]);
  chunks.sort((a, b) => Number(!a.includes("Fetch")) - Number(!b.includes("Fetch")));
  for (const chunk of chunks) {
    const base = (await get(`${MDM_SITE}/_app/immutable/${chunk}`)).match(/"(\/api\/v\d+\/)"/);
    if (base) return { cards: MDM_SITE + base[1] + cardsQuery, changes: MDM_SITE + base[1] + changesQuery };
  }
  throw new Error("API base path not found");
}
var encodeQuery = (url) => url.replace(/[[\]$]/g, (char) => encodeURIComponent(char));
function apiBase() {
  const endpoints = existsSync3(ENDPOINTS_CACHE) ? readJson(ENDPOINTS_CACHE) : MDM_KNOWN_ENDPOINTS;
  return endpoints.cards.slice(0, endpoints.cards.indexOf("cards?"));
}
async function fetchMdPool(get = fetchJson) {
  const pool = /* @__PURE__ */ new Map();
  const pageSize = 3e3;
  for (let page = 1; page <= 20; page++) {
    const rows = await get(encodeQuery(
      `${apiBase()}cards?alternateArt[$ne]=true&limit=${pageSize}&page=${page}&fields=name,rarity,konamiID,release`
    ));
    for (const row of rows) {
      if (!row.konamiID || !row.release) continue;
      const id = Number(row.konamiID);
      const known = pool.get(id);
      if (!known || row.release < known.release) pool.set(id, { rarity: row.rarity, release: row.release });
    }
    if (rows.length < pageSize) break;
  }
  if (pool.size < 5e3) throw new Error(`only ${pool.size} Master Duel cards; the data format may have changed`);
  return pool;
}
async function newestMdRelease(get = fetchJson) {
  const result = await get(`${apiBase()}cards?sort=-release&limit=1&fields=release`);
  const newest = Array.isArray(result) ? result[0] : result;
  if (!newest?.release) throw new Error("no release date");
  return newest.release;
}

// src/banlist.ts
var BANLIST_CACHE = cachePath("md_banlist.json");
var BANLIST_MAX_AGE = DAY;
var MDM_STATUS = { "Forbidden": "forbidden", "Limited 1": "limited1", "Limited 2": "limited2" };
var LIMIT_STATUS = { 0: "forbidden", 1: "limited1", 2: "limited2" };
var YAML_YUGI_URL = "https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/{}.vector.json";
var jstDate = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date(iso));
async function readMasterDuelMeta(endpoints, get = fetchJson) {
  const rows = await get(encodeQuery(endpoints.cards));
  const statuses = /* @__PURE__ */ new Map();
  for (const row of rows) {
    if (row.banStatus in MDM_STATUS) {
      statuses.set(row.name, { id: row.konamiID ? Number(row.konamiID) : null, name: row.name, status: MDM_STATUS[row.banStatus] });
    }
  }
  if (statuses.size < 20) {
    throw new Error(`only ${statuses.size} cards with a Master Duel status; the data format may have changed`);
  }
  const changes = await get(encodeQuery(endpoints.changes));
  for (const change of changes) change.date ??= change.announced;
  const now = Date.now();
  const time = (change) => new Date(change.date).getTime();
  const inEffect = changes.filter((change) => time(change) <= now).sort((a, b) => time(b) - time(a));
  const pending = changes.filter((change) => time(change) > now).sort((a, b) => time(a) - time(b));
  if (inEffect.length === 0) throw new Error("no list in effect");
  const current = new Map(statuses);
  let upcoming = null;
  if (pending.length > 0) {
    const next = new Map(statuses);
    for (const change of pending[0].changes) {
      const name = change.card.name;
      const known = statuses.get(name) ?? { id: null, name };
      for (const [target, field] of [[current, "from"], [next, "to"]]) {
        if (change[field] in MDM_STATUS) target.set(name, { ...known, status: MDM_STATUS[change[field]] });
        else target.delete(name);
      }
    }
    upcoming = { date: jstDate(pending[0].date), entries: [...next.values()] };
  }
  return { current: { date: jstDate(inEffect[0].date), entries: [...current.values()] }, upcoming };
}
async function banlistFromMasterDuelMeta() {
  const candidates = [];
  try {
    candidates.push(["rediscovered", await discoverMdmEndpoints()]);
  } catch (error) {
    console.error(`Could not rediscover Master Duel Meta's banlist endpoints (${error}).`);
  }
  if (existsSync4(ENDPOINTS_CACHE)) candidates.push(["last working", readJson(ENDPOINTS_CACHE)]);
  candidates.push(["known", MDM_KNOWN_ENDPOINTS]);
  const tried = /* @__PURE__ */ new Set();
  const errors = [];
  for (const [label, endpoints] of candidates) {
    const key = JSON.stringify(endpoints);
    if (tried.has(key)) continue;
    tried.add(key);
    try {
      const banlist = await readMasterDuelMeta(endpoints);
      writeText(ENDPOINTS_CACHE, key);
      return banlist;
    } catch (error) {
      errors.push(`${label} endpoints: ${error}`);
    }
  }
  throw new Error(errors.join("; "));
}
async function banlistFromYamlYugi() {
  const entries = (vector) => Object.entries(vector.regulation).map(([cid, limit]) => ({ cid: Number(cid), status: LIMIT_STATUS[limit] }));
  const current = await fetchJson(YAML_YUGI_URL.replace("{}", "current"), 15);
  let upcoming = null;
  try {
    upcoming = await fetchJson(YAML_YUGI_URL.replace("{}", "upcoming"), 15);
  } catch {
  }
  return {
    current: { date: current.date, entries: entries(current) },
    upcoming: upcoming && { date: upcoming.date, entries: entries(upcoming) }
  };
}
var SOURCES = [
  ["masterduelmeta.com", banlistFromMasterDuelMeta],
  ["yaml-yugi", banlistFromYamlYugi]
];
async function loadBanlist(force = false) {
  if (force || ageOf(BANLIST_CACHE) > BANLIST_MAX_AGE) {
    const errors = [];
    let banlist = null;
    for (const [source, download] of SOURCES) {
      try {
        banlist = { ...await download(), source };
        break;
      } catch (error) {
        errors.push(`${source}: ${error}`);
      }
    }
    if (banlist) {
      writeText(BANLIST_CACHE, JSON.stringify(banlist));
    } else if (existsSync4(BANLIST_CACHE)) {
      console.error(`Could not refresh the Master Duel banlist (${errors.join("; ")}); using the last downloaded copy.`);
    } else {
      console.error(`Could not download the Master Duel banlist (${errors.join("; ")}).`);
      return null;
    }
  }
  return readJson(BANLIST_CACHE);
}
function entryKeys(entry) {
  const keys = [];
  if (entry.cid) keys.push(`cid:${entry.cid}`);
  if (entry.id) keys.push(`id:${entry.id}`);
  if (entry.name) keys.push(`name:${entry.name.toLowerCase()}`);
  return keys;
}
function cardKeys(card) {
  return [
    `cid:${card.cid}`,
    ...[card.id, ...card.altIds].map((id) => `id:${id}`),
    ...[card.en, ...card.aliases].filter(Boolean).map((name) => `name:${name.toLowerCase()}`)
  ];
}
var indexes = /* @__PURE__ */ new WeakMap();
function banStatus(card, regulation) {
  let index = indexes.get(regulation);
  if (!index) {
    index = new Map(regulation.entries.flatMap((entry) => entryKeys(entry).map((key) => [key, entry.status])));
    indexes.set(regulation, index);
  }
  for (const key of cardKeys(card)) {
    const status = index.get(key);
    if (status) return status;
  }
  return "unlimited";
}

// src/cards.ts
import { existsSync as existsSync5, statSync as statSync2 } from "node:fs";

// node_modules/fflate/esm/index.mjs
import { createRequire } from "module";
var require2 = createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e) {
}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var et = /* @__PURE__ */ new u8(0);
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i2 = 0; ; ) {
    var c = d[i2++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i2 + eb > d.length)
      return { s: r, r: slc(d, i2 - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
  }
};
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i2 = 0; i2 < dat.length; i2 += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i2 = 0; i2 < c; ++i2) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// src/cards.ts
var YGOCDB_ZIP = "https://ygocdb.com/api/v0/cards.zip";
var YGOCDB_MD5 = "https://ygocdb.com/api/v0/cards.zip.md5";
var YGOPRODECK_ALL = "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes";
var YGOPRODECK_VERSION = "https://db.ygoprodeck.com/api/v7/checkDBVer.php";
var CARDS_CACHE = cachePath("cards.json");
var CHECKED_MARK = cachePath("cards_checked");
var CARDS_MAX_AGE = 7 * DAY;
var CHECK_INTERVAL = 3600;
var CACHE_VERSION = 2;
var YGOPRODECK_RARITY = { "Ultra Rare": "UR", "Super Rare": "SR", "Rare": "R", "Common": "N" };
function makeCard(cdb, ypd, pool) {
  cdb ??= {};
  ypd ??= {};
  const misc = ypd.misc_info?.[0] ?? {};
  const text = cdb.text ?? {};
  const id = cdb.id ?? ypd.id;
  const altIds = (ypd.card_images ?? []).map((image) => image.id).filter((imageId) => imageId !== id);
  const aliases = new Set([cdb.nwbbs_n, cdb.cnocg_n, cdb.md_en_n, ypd.name].filter(Boolean));
  const md = [id, ...altIds].map((cardId) => pool?.get(cardId)).find(Boolean);
  return {
    id,
    cid: cdb.cid ?? misc.konami_id ?? null,
    altIds,
    cn: cdb.cn_name ?? "",
    md: cdb.md_name ?? "",
    sc: cdb.sc_name ?? "",
    jp: cdb.jp_name ?? "",
    en: cdb.en_name || ypd.name || "",
    aliases: [...aliases].sort(),
    typesZh: text.types ?? "",
    descZh: text.desc ?? "",
    pdescZh: text.pdesc ?? "",
    typeEn: ypd.type ?? "",
    typeline: ypd.typeline ?? [],
    raceEn: ypd.race ?? "",
    attrEn: ypd.attribute ?? "",
    level: ypd.level ?? null,
    link: ypd.linkval ?? null,
    atk: ypd.atk ?? null,
    def: ypd.def ?? null,
    archetype: ypd.archetype ?? "",
    descEn: ypd.desc ?? "",
    mdRarity: md?.rarity ?? YGOPRODECK_RARITY[misc.md_rarity] ?? "",
    mdRelease: md?.release ?? "",
    treatedAs: misc.treated_as ?? ""
  };
}
function mergeCards(cdbCards, ypdCards, pool) {
  const ypdById = /* @__PURE__ */ new Map();
  for (const card of ypdCards) {
    for (const image of card.card_images ?? []) {
      if (!ypdById.has(image.id)) ypdById.set(image.id, card);
    }
  }
  for (const card of ypdCards) ypdById.set(card.id, card);
  const merged = [];
  const used = /* @__PURE__ */ new Set();
  for (const entry of cdbCards) {
    const ypd = ypdById.get(entry.id);
    if (ypd) used.add(ypd.id);
    merged.push(makeCard(entry, ypd, pool));
  }
  for (const card of ypdCards) {
    if (!used.has(card.id)) merged.push(makeCard(null, card, pool));
  }
  return merged;
}
async function checkVersions() {
  const [ygocdb, ygoprodeck, mdPool] = await Promise.allSettled([
    fetchJson(YGOCDB_MD5, 15),
    fetchJson(YGOPRODECK_VERSION, 15).then((rows) => rows[0].database_version),
    newestMdRelease()
  ]);
  const value = (result) => result.status === "fulfilled" ? String(result.value) : null;
  return { ygocdb: value(ygocdb), ygoprodeck: value(ygoprodeck), mdPool: value(mdPool) };
}
function sourcesChanged(built, latest) {
  return Object.keys(latest).some((key) => latest[key] !== null && latest[key] !== built[key]);
}
async function downloadCards() {
  console.error("Downloading card data (about 30 MB; first run, a source changed, or the weekly refresh)...");
  const sources = await checkVersions();
  const archive = unzipSync(await fetchBytes(YGOCDB_ZIP));
  const cdbCards = Object.values(JSON.parse(strFromU8(archive["cards.json"])));
  const ypdCards = (await fetchJson(YGOPRODECK_ALL, 180)).data;
  let pool = null;
  try {
    pool = await fetchMdPool();
  } catch (error) {
    console.error(`Could not read the Master Duel card pool from masterduelmeta.com (${error}); using YGOPRODeck's Master Duel rarities.`);
    sources.mdPool = null;
  }
  const cards = mergeCards(cdbCards, ypdCards, pool);
  const cache = {
    version: CACHE_VERSION,
    builtAt: (/* @__PURE__ */ new Date()).toISOString(),
    sources,
    mdSource: pool ? "masterduelmeta.com" : "YGOPRODeck",
    cards
  };
  writeText(CARDS_CACHE, JSON.stringify(cache));
  writeText(CHECKED_MARK, "");
  return cards;
}
var memo = null;
function readCache() {
  if (!existsSync5(CARDS_CACHE)) return null;
  const mtimeMs = statSync2(CARDS_CACHE).mtimeMs;
  if (memo?.mtimeMs !== mtimeMs) {
    const cache = readJson(CARDS_CACHE);
    if (cache.version !== CACHE_VERSION) return null;
    memo = { mtimeMs, cache };
  }
  return memo.cache;
}
async function rebuild(cached) {
  try {
    return await downloadCards();
  } catch (error) {
    if (cached) {
      console.error(`Could not refresh card data (${error}); using the older cache.`);
      return cached.cards;
    }
    throw new Error(`Could not download card data: ${error}`);
  }
}
async function refreshIfChanged(cached, interval) {
  if (ageOf(CHECKED_MARK) < interval) return null;
  const latest = await checkVersions();
  writeText(CHECKED_MARK, "");
  return sourcesChanged(cached.sources, latest) ? rebuild(cached) : null;
}
async function loadCards(force = false) {
  const cached = readCache();
  if (!cached || force || ageOf(CARDS_CACHE) >= CARDS_MAX_AGE) return rebuild(cached);
  return await refreshIfChanged(cached, CHECK_INTERVAL) ?? cached.cards;
}
async function reloadIfSourcesChanged() {
  const cached = readCache();
  return cached ? refreshIfChanged(cached, 300) : null;
}
function cardDataInfo() {
  const cached = readCache();
  return cached && { builtAt: cached.builtAt, sources: cached.sources, mdSource: cached.mdSource };
}

// src/deck.ts
import { existsSync as existsSync6, readFileSync as readFileSync3 } from "node:fs";
import { basename } from "node:path";

// src/query.ts
function norm(value) {
  return value.replace(/[\s·・\-－'"“”‘’「」『』!！?？,，.。:：<>＜＞]/g, "").toLowerCase();
}
function normText(value) {
  return value.replace(/\s/g, "").replaceAll("\uFF0B", "+").toLowerCase();
}
function inMasterDuel(card, now = Date.now()) {
  return card.mdRarity !== "" && (!card.mdRelease || Date.parse(card.mdRelease) <= now);
}
function names(card) {
  return [card.cn, card.md, card.sc, card.jp, card.en, ...card.aliases].filter(Boolean);
}
function matchCards(cards, query) {
  if (/^\d+$/.test(query)) {
    const id = Number(query);
    return { exact: cards.filter((card) => card.id === id || card.altIds.includes(id)), partial: [] };
  }
  const target = norm(query);
  const exact = [];
  const partial = [];
  if (!target) return { exact, partial };
  for (const card of cards) {
    const normalized = names(card).map(norm);
    if (normalized.includes(target)) exact.push(card);
    else if (normalized.some((name) => name.includes(target))) partial.push(card);
  }
  return { exact, partial };
}
function findCards(cards, query) {
  const { exact, partial } = matchCards(cards, query);
  return exact.length > 0 ? exact : partial;
}
function zhKinds(card) {
  const match = card.typesZh.split("\n")[0].match(/\[([^\]]*)\]\s*(\S*)/);
  if (!match) return { kinds: /* @__PURE__ */ new Set(), race: "", attr: "" };
  const [race, attr = ""] = match[2].split("/");
  return { kinds: new Set(match[1].split("|")), race, attr };
}
function tokens(card) {
  const { kinds, race, attr } = zhKinds(card);
  const isMonster = card.typeEn.toLowerCase().includes("monster");
  const kindTokens = /* @__PURE__ */ new Set([
    ...[...kinds].map((kind) => kind.toLowerCase()),
    ...card.typeline.map((word) => word.toLowerCase()),
    ...card.typeEn.toLowerCase().split(/\s+/)
  ]);
  if (!isMonster && card.raceEn) kindTokens.add(card.raceEn.toLowerCase());
  const raceTokens = /* @__PURE__ */ new Set([race, ...isMonster ? [card.raceEn.toLowerCase()] : []]);
  const attrTokens = /* @__PURE__ */ new Set([attr, card.attrEn.toLowerCase()]);
  for (const set of [kindTokens, raceTokens, attrTokens]) set.delete("");
  return { kindTokens, raceTokens, attrTokens };
}
function inRange(value, spec) {
  if (value === null) return false;
  const [low, high] = spec.includes("-") ? spec.split("-") : [spec, spec];
  const bounds = [low, high].map((bound) => bound === "" ? null : Number(bound));
  if (bounds.some((bound) => bound !== null && Number.isNaN(bound))) throw new Error(`Bad range "${spec}"`);
  return (bounds[0] === null || value >= bounds[0]) && (bounds[1] === null || value <= bounds[1]);
}
function searchCards(cards, filters) {
  const results = cards.filter((card) => {
    if (!filters.allFormats && !inMasterDuel(card)) return false;
    const { kindTokens, raceTokens, attrTokens } = tokens(card);
    if (filters.kind?.some((kind) => !kindTokens.has(kind.toLowerCase()))) return false;
    if (filters.race && !raceTokens.has(filters.race.toLowerCase())) return false;
    if (filters.attr && !attrTokens.has(filters.attr.toLowerCase())) return false;
    if (filters.level && !inRange(card.level, filters.level)) return false;
    if (filters.link && !inRange(card.link, filters.link)) return false;
    if (filters.atk && !inRange(card.atk, filters.atk)) return false;
    if (filters.def && !inRange(card.def, filters.def)) return false;
    if (filters.archetype && !card.archetype.toLowerCase().includes(filters.archetype.toLowerCase())) return false;
    if (filters.rarity && card.mdRarity !== filters.rarity.toUpperCase()) return false;
    if (filters.name && !names(card).some((name) => norm(name).includes(norm(filters.name)))) return false;
    if (filters.text?.length) {
      const texts = `${normText(card.descZh + card.pdescZh)}
${normText(card.descEn)}`;
      if (filters.text.some((phrase) => !texts.includes(normText(phrase)))) return false;
    }
    return true;
  });
  const rank = (card) => card.level || card.link || 0;
  return results.sort((a, b) => rank(b) - rank(a) || (a.en < b.en ? -1 : a.en > b.en ? 1 : 0));
}

// src/deck.ts
var SECTIONS = ["main", "extra", "side"];
var emptyIds = () => ({ main: [], extra: [], side: [] });
function parseYdke(text) {
  const match = text.trim().match(/^ydke:\/\/([^!]*)!([^!]*)!([^!]*)!?$/);
  if (!match) throw new Error("\u8FD9\u4E0D\u662F\u6709\u6548\u7684 YDKE \u5B57\u7B26\u4E32\u3002");
  const decode = (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    return Array.from({ length: Math.floor(bytes.length / 4) }, (_, i2) => view.getUint32(i2 * 4, true));
  };
  return { main: decode(match[1]), extra: decode(match[2]), side: decode(match[3]) };
}
function parseYdk(text) {
  const ids = emptyIds();
  let section = "main";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "#main") section = "main";
    else if (line === "#extra") section = "extra";
    else if (line === "!side") section = "side";
    else if (/^\d+$/.test(line)) ids[section].push(Number(line));
  }
  return ids;
}
function parseDeckPage(html) {
  const cids = emptyIds();
  for (const section of SECTIONS) {
    const block = html.match(new RegExp(`<div id="${section}" class="card_set">([\\s\\S]*?)<!--#${section}-->`));
    if (block) cids[section] = [...block[1].matchAll(/card_search\.action\?ope=2&(?:amp;)?cid=(\d+)/g)].map((match) => Number(match[1]));
  }
  const title = html.match(/og:title" content="([^"|]*?)\s*\|/);
  return { name: title ? title[1].trim() : "", cids };
}
var DECK_PAGE = /https?:\/\/www\.db\.yugioh-card\.com\/yugiohdb\/member_deck\.action\?\S+/;
async function fetchDeckPage(url, get = fetchText) {
  const params = new URL(url).searchParams;
  const cgid = params.get("cgid");
  const dno = params.get("dno");
  if (!cgid || !dno) throw new Error("\u5361\u7EC4\u7F51\u5740\u91CC\u7F3A\u5C11 cgid \u6216 dno\u3002");
  const page = parseDeckPage(await get(
    `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=${cgid}&dno=${dno}&request_locale=ja`
  ));
  if (SECTIONS.every((section) => page.cids[section].length === 0)) {
    throw new Error("\u8BFB\u4E0D\u5230\u8FD9\u526F\u5361\u7EC4\u3002\u5B98\u65B9\u5361\u7247\u6570\u636E\u5E93\u4E0A\u7684\u5361\u7EC4\u8981\u8BBE\u4E3A\u516C\u5F00\uFF0C\u4E0D\u767B\u5F55\u624D\u80FD\u770B\u5230\uFF1B\u4E5F\u53EF\u4EE5\u628A\u5361\u8868\u7684\u6587\u5B57\u590D\u5236\u8FC7\u6765\u3002");
  }
  return page;
}
var SECTION_HEADERS = [
  [/^(extra|额外|エクストラ)$/, "extra"],
  [/^(side|副|备牌|サイド)$/, "side"],
  [/^(main|主|メイン|monsters?|怪兽|怪獣|モンスター|spells?|魔法|traps?|陷阱|罠)$/, "main"]
];
function headerSection(line) {
  const key = line.toLowerCase().replace(/[\d\s:：()（）[\]【】\-#!*=]|deck|cards?|卡组|卡牌|デッキ|カード|合計|合计|张|枚/g, "");
  return SECTION_HEADERS.find(([pattern]) => pattern.test(key))?.[1] ?? null;
}
function resolveName(cards, name) {
  const { exact, partial } = matchCards(cards, name);
  const single = (list) => list.length > 0 && list.every((card) => card.id === list[0].id);
  if (single(exact)) return { card: exact[0], partial: false };
  if (exact.length === 0 && single(partial)) return { card: partial[0], partial: true };
  return { candidates: (exact.length > 0 ? exact : partial).slice(0, 3) };
}
var cardLabel = (card) => `\u300C${card.cn || card.en}\u300D`;
var isExtraDeckMonster = (card) => ["\u878D\u5408", "\u540C\u8C03", "\u8D85\u91CF", "\u8FDE\u63A5"].some((kind) => zhKinds(card).kinds.has(kind)) || /Fusion|Synchro|XYZ|Link/.test(card.typeEn);
var COUNT_PATTERNS = [
  [/^(\d+)\s*[xX×*]?\s+(.+)$/, 1, 2],
  [/^(\d+)[xX×*](.+)$/, 1, 2],
  [/^(.+?)\s*[xX×*]\s*(\d+)$/, 2, 1],
  [/^(.+?)\s+(\d+)\s*(?:张|枚|copies)?$/, 2, 1]
];
function parseTextList(text, cards) {
  const entries = [];
  const unknown = [];
  const guessed = [];
  let section = "main";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^[\s\-*•・]+/, "").trim();
    if (!line) continue;
    const attempts = [[line, 1]];
    for (const [pattern, countGroup, nameGroup] of COUNT_PATTERNS) {
      const match = line.match(pattern);
      if (match) attempts.push([match[nameGroup].trim(), Number(match[countGroup])]);
    }
    const resolved = attempts.map(([name, count]) => ({ name, count, result: resolveName(cards, name) }));
    const exact = resolved.find(({ result }) => "card" in result && !result.partial);
    if (!exact) {
      const header = headerSection(line);
      if (header) {
        section = header;
        continue;
      }
    }
    const pick = exact ?? resolved.find(({ result }) => "card" in result);
    if (!pick || !("card" in pick.result)) {
      const candidates = [...new Set(resolved.flatMap(({ result }) => "candidates" in result ? result.candidates : []))];
      unknown.push(candidates.length > 0 ? `${line}\uFF08\u53EF\u80FD\u662F\uFF1A${candidates.map(cardLabel).join("\u3001")}\uFF09` : line);
      continue;
    }
    const { card, partial } = pick.result;
    if (partial) guessed.push(`${pick.name} \u2192 ${cardLabel(card)}`);
    entries.push([section === "main" && isExtraDeckMonster(card) ? "extra" : section, card, pick.count]);
  }
  return { entries, unknown, guessed };
}
function buildDeck(name, source, entries, unknown, guessed = []) {
  const deck = { name, source, main: [], extra: [], side: [], unknown, guessed };
  for (const [section, card, count] of entries) {
    const existing = deck[section].find((entry) => entry.card.id === card.id);
    if (existing) existing.count += count;
    else deck[section].push({ card, count });
  }
  return deck;
}
function fromIds(ids, lookup2, label) {
  const entries = [];
  const unknown = /* @__PURE__ */ new Set();
  for (const section of SECTIONS) {
    for (const id of ids[section]) {
      const card = lookup2.get(id);
      if (card) entries.push([section, card, 1]);
      else unknown.add(`${label} ${id}`);
    }
  }
  return { entries, unknown: [...unknown] };
}
async function readDeck(input, cards, get = fetchText) {
  let text = input.trim();
  let source = "";
  if (!text.includes("\n") && existsSync6(text)) {
    source = basename(text);
    text = readFileSync3(text, "utf8").trim();
  }
  const byPasscode = /* @__PURE__ */ new Map();
  for (const card of cards) for (const id of [card.id, ...card.altIds]) if (!byPasscode.has(id)) byPasscode.set(id, card);
  if (text.startsWith("ydke://")) {
    const { entries: entries2, unknown: unknown2 } = fromIds(parseYdke(text), byPasscode, "\u5361\u5BC6");
    return buildDeck("", source || "YDKE", entries2, unknown2);
  }
  const url = text.match(DECK_PAGE);
  if (url && !text.includes("\n")) {
    const page = await fetchDeckPage(url[0], get);
    const byCid = new Map(cards.filter((card) => card.cid).map((card) => [card.cid, card]));
    const { entries: entries2, unknown: unknown2 } = fromIds(page.cids, byCid, "KONAMI ID");
    return buildDeck(page.name, "\u5B98\u65B9\u5361\u7247\u6570\u636E\u5E93", entries2, unknown2);
  }
  if (/^(#main|#extra|!side)\s*$/m.test(text)) {
    const { entries: entries2, unknown: unknown2 } = fromIds(parseYdk(text), byPasscode, "\u5361\u5BC6");
    return buildDeck("", source || ".ydk", entries2, unknown2);
  }
  const { entries, unknown, guessed } = parseTextList(text, cards);
  return buildDeck("", source || "\u6587\u5B57\u5361\u8868", entries, unknown, guessed);
}
function sameNameKey(card, cards) {
  if (card.treatedAs) return norm(card.treatedAs);
  const zh2 = card.descZh.match(/这个卡名在规则上当作「(.+?)」使用/);
  const target = zh2 ? resolveName(cards, zh2[1]) : null;
  return norm(target && "card" in target ? target.card.en : card.en || card.cn);
}
var LIMITS = { forbidden: 0, limited1: 1, limited2: 2 };
function checkDeck(deck, cards, banlist) {
  const issues = [];
  const size = (section) => deck[section].reduce((sum, entry) => sum + entry.count, 0);
  if (size("main") < 40 || size("main") > 60) issues.push(`\u4E3B\u5361\u7EC4 ${size("main")} \u5F20\uFF0C\u8981\u5728 40\uFF5E60 \u5F20\u4E4B\u95F4`);
  if (size("extra") > 15) issues.push(`\u989D\u5916\u5361\u7EC4 ${size("extra")} \u5F20\uFF0C\u6700\u591A 15 \u5F20`);
  if (size("side") > 15) issues.push(`\u526F\u5361\u7EC4 ${size("side")} \u5F20\uFF0C\u6700\u591A 15 \u5F20`);
  const totals = /* @__PURE__ */ new Map();
  for (const section of SECTIONS) {
    for (const { card, count } of deck[section]) {
      const total = totals.get(card.id) ?? { card, count: 0 };
      total.count += count;
      totals.set(card.id, total);
    }
  }
  const groups = /* @__PURE__ */ new Map();
  for (const total of totals.values()) {
    const key = sameNameKey(total.card, cards);
    groups.set(key, [...groups.get(key) ?? [], total]);
  }
  for (const group of groups.values()) {
    const count = group.reduce((sum, item) => sum + item.count, 0);
    if (count <= 3) continue;
    const parts = group.map((item) => `${cardLabel(item.card)} ${item.count} \u5F20`).join("\u3001");
    issues.push(group.length > 1 ? `\u540C\u540D\u5361\u8D85\u8FC7 3 \u5F20\uFF1A${parts}\uFF08\u89C4\u5219\u4E0A\u7B97\u540C\u4E00\u5F20\u5361\uFF09` : `${parts}\uFF0C\u540C\u540D\u5361\u6700\u591A 3 \u5F20`);
  }
  for (const { card, count } of totals.values()) {
    const status = banlist ? banStatus(card, banlist.current) : "unlimited";
    if (status in LIMITS && count > LIMITS[status]) {
      issues.push(status === "forbidden" ? `${cardLabel(card)} \u5728 MD \u662F\u7981\u6B62\u5361\uFF0C\u5361\u7EC4\u91CC\u6709 ${count} \u5F20` : `${cardLabel(card)} \u5728 MD \u9650\u5236 ${LIMITS[status]} \u5F20\uFF0C\u5361\u7EC4\u91CC\u6709 ${count} \u5F20`);
    }
    if (!inMasterDuel(card)) {
      issues.push(card.mdRarity ? `${cardLabel(card)} \u8FD8\u6CA1\u5728 MD \u5B9E\u88C5` : `${cardLabel(card)} MD \u91CC\u6CA1\u6709\u8FD9\u5F20\u5361`);
    }
  }
  if (deck.guessed.length > 0) issues.push(`\u6309\u90E8\u5206\u5361\u540D\u8BA4\u7684\uFF0C\u8BF7\u786E\u8BA4\uFF1A${deck.guessed.join("\uFF1B")}`);
  if (deck.unknown.length > 0) issues.push(`\u6CA1\u8BA4\u51FA\u6765\uFF1A${deck.unknown.join("\uFF1B")}`);
  return issues;
}

// src/format.ts
var BAN_LABEL = {
  forbidden: "\u7981\u6B62 Forbidden",
  limited1: "\u9650\u52361 Limited 1",
  limited2: "\u9650\u52362 Limited 2",
  unlimited: "\u65E0\u9650\u5236 Unlimited",
  unknown: "\u672A\u77E5 Unknown"
};
var STATUSES = ["forbidden", "limited1", "limited2"];
var EXTRA_KINDS = ["\u878D\u5408", "\u540C\u8C03", "\u8D85\u91CF", "\u8FDE\u63A5"];
function namesLine(card) {
  const parts = [];
  if (card.cn) parts.push(`\u300C${card.cn}\u300D`);
  if (card.md && card.md !== card.cn) parts.push(`MD\uFF1A${card.md}`);
  if (card.en) parts.push(card.en);
  return parts.join(" ");
}
function typesLine(card) {
  if (card.typesZh) return card.typesZh.replaceAll("\n", " ");
  const stats = card.atk !== null ? ` ATK ${card.atk} / DEF ${card.def}` : "";
  return `${card.typeEn} ${card.raceEn} ${card.attrEn}`.trim() + stats;
}
function banText(card, banlist) {
  if (!banlist) return BAN_LABEL.unknown;
  const status = banStatus(card, banlist.current);
  let text = BAN_LABEL[status];
  if (banlist.upcoming) {
    const coming = banStatus(card, banlist.upcoming);
    if (coming !== status) text += ` \u2192 ${banlist.upcoming.date} \u8D77 ${BAN_LABEL[coming]}`;
  }
  return text;
}
function banlistNote(banlist) {
  if (!banlist) return "MD \u7981\u9650\u8868\u6CA1\u80FD\u4E0B\u8F7D\uFF0C\u7981\u9650\u72B6\u6001\u672A\u77E5";
  let note = `MD \u7981\u9650\u8868\uFF1A${banlist.current.date} \u751F\u6548`;
  if (banlist.upcoming) note += `\uFF1B\u5DF2\u516C\u5E03 ${banlist.upcoming.date} \u751F\u6548\u7684\u65B0\u8868`;
  return `${note}\uFF1B\u6765\u6E90 ${banlist.source}`;
}
function materials(card) {
  const isExtra = EXTRA_KINDS.some((kind) => zhKinds(card).kinds.has(kind)) || /Fusion|Synchro|XYZ|Link/.test(card.typeEn);
  const text = card.descZh || card.descEn;
  return isExtra && text ? text.split("\n")[0].trim() : "";
}
function formatCard(card, banlist) {
  let rarity = card.mdRarity || "\u672A\u5B9E\u88C5\u6216\u672A\u6536\u5F55 not in MD data";
  if (card.mdRarity && !inMasterDuel(card)) rarity += `\uFF08\u5C06\u4E8E ${jstDate(card.mdRelease)} \u5B9E\u88C5\uFF09`;
  const lines = [
    `${namesLine(card)} | ${card.jp || "-"} | \u5361\u5BC6 ${card.id}`,
    card.typesZh || typesLine(card),
    `MD\uFF1A${rarity}\uFF5C\u7981\u9650\uFF1A${banText(card, banlist)}\uFF08${banlistNote(banlist)}\uFF09`
  ];
  const sameName = card.descZh.match(/这个卡名在规则上当作「(.+?)」使用/);
  const treatedAs = card.treatedAs || (sameName ? `\u300C${sameName[1]}\u300D` : "");
  if (treatedAs) lines.push(`\u89C4\u5219\u4E0A\u5F53\u4F5C\uFF1A${treatedAs}\uFF08\u540C\u540D\u5361\u5F20\u6570\u5408\u5728\u4E00\u8D77\u7B97\uFF09`);
  lines.push(`\u767E\u9E3D\u9875\u9762\uFF08\u542B\u88C1\u5B9A Q&A\uFF09\uFF1Ahttps://ygocdb.com/card/${card.id}`);
  if (card.pdescZh) lines.push("", "\u7075\u6446\u6548\u679C\uFF1A", card.pdescZh);
  if (card.descZh) lines.push("", "\u4E2D\u6587\u5361\u6587\uFF1A", card.descZh);
  if (card.descEn) lines.push("", "English text:", card.descEn);
  return lines.join("\n");
}
function formatLookup(cards, banlist, queries) {
  let missing = false;
  const blocks = queries.map((query) => {
    const found = findCards(cards, query);
    if (found.length === 0) {
      missing = true;
      return `\u6CA1\u627E\u5230\u300C${query}\u300D\u3002\u6362\u4E00\u79CD\u8BED\u8A00\u7684\u5361\u540D\u3001\u53EA\u8F93\u5165\u4E00\u90E8\u5206\uFF0C\u6216\u8005\u7528\u5361\u5BC6\u518D\u8BD5\u3002`;
    }
    if (found.length === 1) return formatCard(found[0], banlist);
    const lines = [`\u300C${query}\u300D\u6709 ${found.length} \u5F20\u5361\u5339\u914D\uFF0C\u8BF7\u7528\u5B8C\u6574\u5361\u540D\u6216\u5361\u5BC6\u518D\u67E5\u4E00\u6B21\uFF1A`];
    for (const card of found.slice(0, 20)) lines.push(`  ${namesLine(card)} | \u5361\u5BC6 ${card.id} | ${typesLine(card)}`);
    if (found.length > 20) lines.push(`  \u2026\u2026\u8FD8\u6709 ${found.length - 20} \u5F20`);
    return lines.join("\n");
  });
  return { text: blocks.join(`

${"-".repeat(40)}

`), missing };
}
function formatSearch(results, banlist, options) {
  const limit = options.limit ?? 60;
  const lines = [`\u5171 ${results.length} \u5F20\u7B26\u5408\u6761\u4EF6${options.allFormats ? "\uFF08\u542B MD \u672A\u5B9E\u88C5\u7684\u5361\uFF09" : "\uFF08\u4EC5 MD \u5DF2\u5B9E\u88C5\uFF09"}`];
  for (const card of results.slice(0, limit)) {
    lines.push(`${namesLine(card)} | ${card.id} | ${typesLine(card)} | ${card.mdRarity || "-"} | ${banText(card, banlist)}`);
    if (options.full) lines.push(`    ${(card.descZh || card.descEn).replaceAll("\n", "\n    ")}`);
    else if (materials(card)) lines.push(`    \u7D20\u6750\uFF1A${materials(card)}`);
  }
  if (results.length > limit) lines.push(`\u2026\u2026\u53EA\u663E\u793A\u524D ${limit} \u5F20\uFF0C\u7528 --limit \u8C03\u6574`);
  lines.push(`\uFF08${banlistNote(banlist)}\uFF09`);
  return lines.join("\n");
}
function formatBanlist(cards, banlist, options) {
  const regulation = options.upcoming ? banlist.upcoming : banlist.current;
  if (!regulation) return "\u76EE\u524D\u6CA1\u6709\u5DF2\u516C\u5E03\u4F46\u8FD8\u6CA1\u751F\u6548\u7684\u65B0\u7981\u9650\u8868\u3002";
  const byKey = /* @__PURE__ */ new Map();
  for (const card of cards) {
    for (const key of cardKeys(card)) if (!byKey.has(key)) byKey.set(key, card);
  }
  const lines = [`Master Duel \u7981\u9650\u8868\uFF08${regulation.date} \u751F\u6548\uFF1B\u6765\u6E90 ${banlist.source}\uFF09`];
  for (const status of STATUSES) {
    if (options.status && options.status !== status) continue;
    const rows = regulation.entries.filter((entry) => entry.status === status).map((entry) => {
      const card = entryKeys(entry).map((key) => byKey.get(key)).find(Boolean);
      return card ? `  ${namesLine(card)} | ${card.id}` : `  ${entry.name ?? `KONAMI ID ${entry.cid}`}`;
    }).sort();
    lines.push("", `${BAN_LABEL[status]}\uFF1A${rows.length} \u5F20`, ...rows);
  }
  return lines.join("\n");
}
var SECTION_LABEL = { main: "\u4E3B\u5361\u7EC4", extra: "\u989D\u5916\u5361\u7EC4", side: "\u526F\u5361\u7EC4" };
function cardList(cards, max2 = 6) {
  const names2 = cards.slice(0, max2).map((card) => `\u300C${card.cn || card.en}\u300D`).join("\u3001");
  return cards.length > max2 ? `${names2} \u7B49 ${cards.length} \u5F20` : names2;
}
var lockName = (lock) => `\u300C${lock.card.cn || lock.card.en}\u300D${lock.effect}`;
function formatLocks(locks, pairs) {
  if (locks.length === 0) return [];
  const lines = ["", "\u989D\u5916\u5361\u7EC4\u7684\u9501\uFF1A"];
  for (const { lock, blocked } of locks) {
    let effect = "\u989D\u5916\u91CC\u7684\u602A\u517D\u90FD\u4E0D\u53D7\u5F71\u54CD";
    if (lock.allowed === null) effect = "\u8FD9\u6761\u9650\u5236\u6CA1\u6CD5\u81EA\u52A8\u5224\u65AD\uFF0C\u8BF7\u770B\u539F\u6587";
    else if (lock.allowed === "none") effect = "\u8FD9\u56DE\u5408\u5B8C\u5168\u4E0D\u80FD\u4ECE\u989D\u5916\u51FA\u602A\u517D";
    else if (blocked.length > 0) effect = `\u989D\u5916\u91CC\u51FA\u4E0D\u6765\uFF1A${cardList(blocked)}`;
    const notes = [
      lock.timing === "whole-turn" ? "\u6574\u56DE\u5408\u6709\u6548\uFF0C\u8FD9\u56DE\u5408\u4E4B\u524D\u5DF2\u7ECF\u51FA\u8FC7\u4E0D\u7B26\u5408\u7684\u602A\u517D\u5C31\u53D1\u52A8\u4E0D\u4E86" : "",
      lock.timing === "while-present" ? "\u8FD9\u5F20\u5361\u5728\u573A\u4E0A\u671F\u95F4\u4E00\u76F4\u6709\u6548" : "",
      lock.bothPlayers ? "\u53CC\u65B9\u90FD\u53D7\u9650" : ""
    ].filter(Boolean);
    lines.push(`  - ${lockName(lock)}\uFF1A${lock.text} \u2192 ${effect}${notes.length > 0 ? `\uFF08${notes.join("\uFF1B")}\uFF09` : ""}`);
  }
  if (pairs.length > 0) {
    lines.push("", "\u540C\u4E00\u56DE\u5408\u4E00\u8D77\u7528\uFF1A");
    const sorted = [...pairs].sort((a, b) => a.remaining.length - b.remaining.length);
    for (const { first, second, remaining } of sorted) {
      lines.push(`  - ${lockName(first)} + ${lockName(second)}\uFF1A${remaining.length === 0 ? "\u989D\u5916\u5361\u7EC4\u4E00\u53EA\u90FD\u51FA\u4E0D\u6765" : `\u989D\u5916\u53EA\u5269${cardList(remaining)}`}`);
    }
  }
  return lines;
}
function formatDeck(deck, issues, banlist, locks) {
  const size = (section) => deck[section].reduce((sum, entry) => sum + entry.count, 0);
  const byRarity = /* @__PURE__ */ new Map();
  for (const section of SECTIONS) {
    for (const { card, count } of deck[section]) {
      const rarity = card.mdRarity || "MD \u91CC\u6CA1\u6709";
      byRarity.set(rarity, (byRarity.get(rarity) ?? 0) + count);
    }
  }
  const cost = ["UR", "SR", "R", "N", "MD \u91CC\u6CA1\u6709"].filter((rarity) => byRarity.has(rarity)).map((rarity) => `${rarity} ${byRarity.get(rarity)} \u5F20`).join("\uFF0C");
  const lines = [
    `\u5361\u7EC4\uFF1A${deck.name || "\uFF08\u6CA1\u6709\u540D\u5B57\uFF09"}\uFF08\u6765\u6E90\uFF1A${deck.source}\uFF09`,
    SECTIONS.map((section) => `${SECTION_LABEL[section]} ${size(section)} \u5F20`).join("\uFF5C"),
    `\u7A00\u6709\u5EA6\uFF08\u6309\u5F20\u6570\uFF09\uFF1A${cost || "\u65E0"}`
  ];
  for (const section of SECTIONS) {
    if (deck[section].length === 0) continue;
    lines.push("", `${SECTION_LABEL[section]}\uFF1A`);
    for (const { card, count } of deck[section]) {
      lines.push(`  ${count} ${namesLine(card)} | ${card.mdRarity || "-"} | ${banText(card, banlist)}`);
    }
  }
  lines.push(...formatLocks(locks.locks, locks.pairs));
  lines.push("", "\u68C0\u67E5\uFF1A", ...issues.length > 0 ? issues.map((issue) => `  - ${issue}`) : ["  \u6CA1\u6709\u53D1\u73B0\u5F20\u6570\u3001\u7981\u9650\u6216\u5B9E\u88C5\u65B9\u9762\u7684\u95EE\u9898\u3002"]);
  lines.push(`\uFF08${banlistNote(banlist)}\uFF09`);
  return lines.join("\n");
}

// src/locks.ts
function parseAllowed(subject) {
  let rest = subject;
  const take = (pattern) => {
    const matches = [...rest.matchAll(pattern)];
    rest = rest.replace(pattern, " ");
    return matches;
  };
  const allowed = { kinds: [], archetypes: [], races: [], attributes: [] };
  allowed.archetypes = take(/「([^」]+)」/g).map((match) => match[1]);
  const level = take(/(\d+)(星|阶)(以上|以下)?的?/g)[0];
  if (level) {
    const value = Number(level[1]);
    allowed.level = level[3] === "\u4EE5\u4E0A" ? [value, 99] : level[3] === "\u4EE5\u4E0B" ? [0, value] : [value, value];
  }
  const atk = take(/(?:原本)?攻击力(?:是)?(\d+)以下的?/g)[0];
  if (atk) allowed.maxAtk = Number(atk[1]);
  for (const match of take(/((?:[光暗地水炎风神]·)*[光暗地水炎风神])属性的?/g)) allowed.attributes.push(...match[1].split("\xB7"));
  for (const match of take(/([^\s·的「」]+?族(?:·[^\s·的「」]+?族)*)/g)) {
    allowed.races.push(...match[1].split("\xB7").map((race) => race.replace(/族$/, "")));
  }
  for (const match of take(/((?:融合|同调|超量|连接|灵摆)(?:·(?:融合|同调|超量|连接|灵摆))*)/g)) {
    allowed.kinds.push(...match[1].split("\xB7"));
  }
  return rest.replace(/怪兽|以及|的|·|\s/g, "") === "" ? allowed : null;
}
function belongsTo(card, archetype) {
  return [card.cn, card.md, card.sc, card.jp].some((name) => name.includes(archetype)) || card.descZh.includes(`\u4E5F\u5F53\u4F5C\u300C${archetype}\u300D`);
}
function allows(allowed, card) {
  const { kinds, race, attr } = zhKinds(card);
  if (allowed.kinds.length > 0 && !allowed.kinds.some((kind) => kinds.has(kind))) return false;
  if (allowed.archetypes.length > 0 && !allowed.archetypes.some((archetype) => belongsTo(card, archetype))) return false;
  if (allowed.races.length > 0 && !allowed.races.includes(race)) return false;
  if (allowed.attributes.length > 0 && !allowed.attributes.includes(attr)) return false;
  if (allowed.level && (card.level === null || card.level < allowed.level[0] || card.level > allowed.level[1])) return false;
  if (allowed.maxAtk !== void 0 && (card.atk === null || card.atk > allowed.maxAtk)) return false;
  return true;
}
function timingOf(context) {
  if (/发动的回合|特殊召唤过的回合/.test(context)) return "whole-turn";
  if (/直到下次的自己回合/.test(context)) return "until-next-turn";
  if (/回合|发动后/.test(context)) return "rest-of-turn";
  return "while-present";
}
var LOCK = /(双方|自己)(?:不是([^，。；]*?)不能从额外卡组特殊召唤|若非([^，。；]*?)则不能从额外卡组(?:把怪兽)?特殊召唤|不用([^，。；]*?)不能从额外卡组把怪兽特殊召唤|不能从额外卡组把怪兽特殊召唤)/g;
function parseLocks(card) {
  const locks = [];
  const parts = card.descZh.split(/(?=[①②③④⑤⑥⑦⑧⑨])/);
  for (const part of parts) {
    const effect = /^[①②③④⑤⑥⑦⑧⑨]/.test(part) ? part[0] : "";
    for (const sentence of part.split(/(?<=。)/)) {
      for (const match of sentence.matchAll(LOCK)) {
        locks.push({
          card,
          effect,
          text: sentence.trim().replace(/^[①②③④⑤⑥⑦⑧⑨]：/, ""),
          timing: timingOf(sentence.slice(0, match.index)),
          bothPlayers: match[1] === "\u53CC\u65B9",
          allowed: match[4] !== void 0 ? null : (match[2] ?? match[3]) === void 0 ? "none" : parseAllowed(match[2] ?? match[3])
        });
      }
    }
  }
  return locks;
}
function analyzeLocks(deckCards, extraDeck) {
  const locks = deckCards.flatMap(parseLocks);
  const allowedBy = (lock) => lock.allowed === null ? null : lock.allowed === "none" ? [] : extraDeck.filter((card) => allows(lock.allowed, card));
  const reports = locks.map((lock) => {
    const allowed = allowedBy(lock);
    return { lock, blocked: allowed === null ? [] : extraDeck.filter((card) => !allowed.includes(card)) };
  });
  const pairs = [];
  for (let i2 = 0; i2 < locks.length; i2++) {
    for (let j = i2 + 1; j < locks.length; j++) {
      const [first, second] = [locks[i2], locks[j]];
      const [a, b] = [allowedBy(first), allowedBy(second)];
      if (first.card.id === second.card.id || !a || !b || a.length === 0 || b.length === 0) continue;
      const remaining = a.filter((card) => b.includes(card));
      if (remaining.length < Math.min(a.length, b.length)) pairs.push({ first, second, remaining });
    }
  }
  return { locks: reports, pairs };
}

// src/service.ts
var distinctCards = (deck, sections) => [...new Map(sections.flatMap((section) => deck[section]).map(({ card }) => [card.id, card])).values()];
async function lookup(queries) {
  const banlist = await loadBanlist();
  let result = formatLookup(await loadCards(), banlist, queries);
  if (result.missing) {
    const fresh = await reloadIfSourcesChanged();
    if (fresh) result = formatLookup(fresh, banlist, queries);
  }
  return result;
}
async function search(filters) {
  return formatSearch(searchCards(await loadCards(), filters), await loadBanlist(), filters);
}
async function importDeck(input) {
  const banlist = await loadBanlist();
  let cards = await loadCards();
  let deck = await readDeck(input, cards);
  if (deck.unknown.length > 0) {
    const fresh = await reloadIfSourcesChanged();
    if (fresh) {
      cards = fresh;
      deck = await readDeck(input, cards);
    }
  }
  const locks = analyzeLocks(distinctCards(deck, ["main", "extra"]), distinctCards(deck, ["extra"]));
  return formatDeck(deck, checkDeck(deck, cards, banlist), banlist, locks);
}
async function banlistText(options) {
  const banlist = await loadBanlist();
  return banlist && formatBanlist(await loadCards(), banlist, options);
}
async function refresh() {
  const cards = await loadCards(true);
  const banlist = await loadBanlist(true);
  const { sources, mdSource } = cardDataInfo();
  return [
    `\u5361\u7247\u6570\u636E ${cards.length} \u5F20\uFF0C\u5176\u4E2D MD \u5DF2\u5B9E\u88C5 ${cards.filter((card) => inMasterDuel(card)).length} \u5F20`,
    `\u6570\u636E\u7248\u672C\uFF1A\u767E\u9E3D ${sources.ygocdb?.slice(0, 8) ?? "?"}\uFF0CYGOPRODeck ${sources.ygoprodeck ?? "?"}\uFF0CMD \u5361\u6C60\u6700\u65B0\u5B9E\u88C5 ${sources.mdPool ? jstDate(sources.mdPool) : "?"}\uFF08MD \u7A00\u6709\u5EA6\u6765\u6E90 ${mdSource}\uFF09`,
    banlistNote(banlist)
  ].join("\n");
}

// src/cli.ts
var USAGE = `Yu-Gi-Oh! Master Duel card lookup

  mdcard card <name or passcode>...        cards with full text (quote names that contain spaces)
  mdcard search [filters]                  search the Master Duel card pool
      --name TEXT  --text TEXT (repeatable)  --kind KIND (repeatable)  --race TYPE  --attr ATTRIBUTE
      --level N|A-B  --link N|A-B  --atk N|A-B  --def N|A-B  --archetype NAME  --rarity UR|SR|R|N
      --all-formats  --full  --limit N
  mdcard deck <deck>                       read and check a deck: a card database deck URL, a YDKE string,
                                           a .ydk file, or a text list ("-" reads it from standard input)
  mdcard banlist [--status forbidden|limited1|limited2] [--upcoming]
  mdcard notes [--preference TEXT | --lesson TEXT]
  mdcard update                            re-download card data and the banlist now`;
async function main(argv) {
  const [command, ...args] = argv;
  switch (command) {
    case "card": {
      if (args.length === 0) break;
      const { text, missing } = await lookup(args);
      console.log(text);
      return missing ? 1 : 0;
    }
    case "search": {
      const { values } = parseArgs({
        args,
        options: {
          name: { type: "string" },
          text: { type: "string", multiple: true },
          kind: { type: "string", multiple: true },
          race: { type: "string" },
          attr: { type: "string" },
          level: { type: "string" },
          link: { type: "string" },
          atk: { type: "string" },
          def: { type: "string" },
          archetype: { type: "string" },
          rarity: { type: "string" },
          "all-formats": { type: "boolean" },
          full: { type: "boolean" },
          limit: { type: "string", default: "60" }
        }
      });
      console.log(await search({ ...values, allFormats: values["all-formats"], limit: Number(values.limit) }));
      return 0;
    }
    case "deck": {
      if (args.length === 0) break;
      console.log(await importDeck(args[0] === "-" ? readFileSync4(0, "utf8") : args.join(" ")));
      return 0;
    }
    case "banlist": {
      const { values } = parseArgs({ args, options: { status: { type: "string" }, upcoming: { type: "boolean" } } });
      if (values.status && !["forbidden", "limited1", "limited2"].includes(values.status)) break;
      const text = await banlistText({ status: values.status, upcoming: values.upcoming });
      if (!text) {
        console.error("\u6CA1\u80FD\u4E0B\u8F7D Master Duel \u7981\u9650\u8868\u3002");
        return 1;
      }
      console.log(text);
      return 0;
    }
    case "notes": {
      const { values } = parseArgs({ args, options: { preference: { type: "string" }, lesson: { type: "string" } } });
      if (values.preference && values.lesson) break;
      const entry = values.preference ?? values.lesson;
      if (entry) {
        addNote(values.preference ? "preference" : "lesson", entry);
        console.log(`\u5DF2\u4FDD\u5B58\u5230 ${NOTES_PATH}
`);
      }
      console.log(formatNotes());
      return 0;
    }
    case "update":
      console.log(await refresh());
      return 0;
  }
  console.error(USAGE);
  return 2;
}
main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
);
