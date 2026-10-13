// src/cli.ts
import { parseArgs } from "node:util";

// src/banlist.ts
import { existsSync as existsSync2 } from "node:fs";

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

// src/banlist.ts
var BANLIST_CACHE = cachePath("md_banlist.json");
var ENDPOINTS_CACHE = cachePath("mdm_endpoints.json");
var BANLIST_MAX_AGE = DAY;
var MDM_SITE = "https://www.masterduelmeta.com";
var MDM_KNOWN_ENDPOINTS = {
  cards: `${MDM_SITE}/api/v1/cards?tcgBanStatus[$or][$exists]=true&ocgBanStatus[$or][$exists]=true&banStatus[$or][$exists]=true&alternateArt[$ne]=true&limit=0`,
  changes: `${MDM_SITE}/api/v1/banlist-changes?sort=-date`
};
var MDM_STATUS = { "Forbidden": "forbidden", "Limited 1": "limited1", "Limited 2": "limited2" };
var LIMIT_STATUS = { 0: "forbidden", 1: "limited1", 2: "limited2" };
var YAML_YUGI_URL = "https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/{}.vector.json";
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
  if (existsSync2(ENDPOINTS_CACHE)) candidates.push(["last working", readJson(ENDPOINTS_CACHE)]);
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
    } else if (existsSync2(BANLIST_CACHE)) {
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
import { existsSync as existsSync3, statSync as statSync2 } from "node:fs";

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
var YGOPRODECK_ALL = "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes";
var CARDS_CACHE = cachePath("cards.json");
var CARDS_MAX_AGE = 7 * DAY;
var CACHE_VERSION = 1;
function makeCard(cdb, ypd) {
  cdb ??= {};
  ypd ??= {};
  const misc = ypd.misc_info?.[0] ?? {};
  const text = cdb.text ?? {};
  const id = cdb.id ?? ypd.id;
  const aliases = new Set([cdb.nwbbs_n, cdb.cnocg_n, cdb.md_en_n, ypd.name].filter(Boolean));
  return {
    id,
    cid: cdb.cid ?? misc.konami_id ?? null,
    altIds: (ypd.card_images ?? []).map((image) => image.id).filter((imageId) => imageId !== id),
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
    mdRarity: misc.md_rarity ?? "",
    treatedAs: misc.treated_as ?? ""
  };
}
function mergeCards(cdbCards, ypdCards) {
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
    merged.push(makeCard(entry, ypd));
  }
  for (const card of ypdCards) {
    if (!used.has(card.id)) merged.push(makeCard(null, card));
  }
  return merged;
}
async function downloadCards() {
  console.error("Downloading card data (about 30 MB; first run or weekly refresh)...");
  const archive = unzipSync(await fetchBytes(YGOCDB_ZIP));
  const cdbCards = Object.values(JSON.parse(strFromU8(archive["cards.json"])));
  const ypdCards = (await fetchJson(YGOPRODECK_ALL, 180)).data;
  const cards = mergeCards(cdbCards, ypdCards);
  writeText(CARDS_CACHE, JSON.stringify({ version: CACHE_VERSION, cards }));
  return cards;
}
var memo = null;
function readCache() {
  if (!existsSync3(CARDS_CACHE)) return null;
  const mtimeMs = statSync2(CARDS_CACHE).mtimeMs;
  if (memo?.mtimeMs !== mtimeMs) {
    const cached = readJson(CARDS_CACHE);
    if (cached.version !== CACHE_VERSION) return null;
    memo = { mtimeMs, cards: cached.cards };
  }
  return memo.cards;
}
async function loadCards(force = false) {
  const cached = readCache();
  if (cached && !force && ageOf(CARDS_CACHE) < CARDS_MAX_AGE) return cached;
  try {
    return await downloadCards();
  } catch (error) {
    if (cached) {
      console.error(`Could not refresh card data (${error}); using the older cache.`);
      return cached;
    }
    throw new Error(`Could not download card data: ${error}`);
  }
}

// src/query.ts
var RARITY = { "Ultra Rare": "UR", "Super Rare": "SR", "Rare": "R", "Common": "N" };
function norm(value) {
  return value.replace(/[\s·・\-－'"“”‘’「」『』!！?？,，.。:：]/g, "").toLowerCase();
}
function normText(value) {
  return value.replace(/\s/g, "").replaceAll("\uFF0B", "+").toLowerCase();
}
function names(card) {
  return [card.cn, card.md, card.sc, card.jp, card.en, ...card.aliases].filter(Boolean);
}
function findCards(cards, query) {
  if (/^\d+$/.test(query)) {
    const id = Number(query);
    return cards.filter((card) => card.id === id || card.altIds.includes(id));
  }
  const target = norm(query);
  const exact = [];
  const partial = [];
  for (const card of cards) {
    const normalized = names(card).map(norm);
    if (normalized.includes(target)) exact.push(card);
    else if (normalized.some((name) => name.includes(target))) partial.push(card);
  }
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
    if (!filters.allFormats && !card.mdRarity) return false;
    const { kindTokens, raceTokens, attrTokens } = tokens(card);
    if (filters.kind?.some((kind) => !kindTokens.has(kind.toLowerCase()))) return false;
    if (filters.race && !raceTokens.has(filters.race.toLowerCase())) return false;
    if (filters.attr && !attrTokens.has(filters.attr.toLowerCase())) return false;
    if (filters.level && !inRange(card.level, filters.level)) return false;
    if (filters.link && !inRange(card.link, filters.link)) return false;
    if (filters.atk && !inRange(card.atk, filters.atk)) return false;
    if (filters.def && !inRange(card.def, filters.def)) return false;
    if (filters.archetype && !card.archetype.toLowerCase().includes(filters.archetype.toLowerCase())) return false;
    if (filters.rarity && RARITY[card.mdRarity] !== filters.rarity.toUpperCase()) return false;
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
  const rarity = RARITY[card.mdRarity] ?? (card.mdRarity || "\u672A\u5B9E\u88C5\u6216\u672A\u6536\u5F55 not in MD data");
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
    lines.push(`${namesLine(card)} | ${card.id} | ${typesLine(card)} | ${RARITY[card.mdRarity] ?? "-"} | ${banText(card, banlist)}`);
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

// src/notes.ts
import { existsSync as existsSync4, readFileSync as readFileSync2 } from "node:fs";
import { join as join2 } from "node:path";
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
  return existsSync4(NOTES_PATH) ? readFileSync2(NOTES_PATH, "utf8") : null;
}
function addNote(kind, entry) {
  const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
  writeText(NOTES_PATH, addEntry(readNotes() ?? TEMPLATE, kind, entry, date));
}
function formatNotes() {
  return `\u7B14\u8BB0\u6587\u4EF6\uFF1A${NOTES_PATH}
${readNotes() ?? "\uFF08\u8FD8\u6CA1\u6709\u7B14\u8BB0\uFF09"}`;
}

// src/cli.ts
var USAGE = `Yu-Gi-Oh! Master Duel card lookup

  mdcard card <name or passcode>...        cards with full text (quote names that contain spaces)
  mdcard search [filters]                  search the Master Duel card pool
      --name TEXT  --text TEXT (repeatable)  --kind KIND (repeatable)  --race TYPE  --attr ATTRIBUTE
      --level N|A-B  --link N|A-B  --atk N|A-B  --def N|A-B  --archetype NAME  --rarity UR|SR|R|N
      --all-formats  --full  --limit N
  mdcard banlist [--status forbidden|limited1|limited2] [--upcoming]
  mdcard notes [--preference TEXT | --lesson TEXT]
  mdcard update                            re-download card data and the banlist now`;
async function main(argv) {
  const [command, ...args] = argv;
  switch (command) {
    case "card": {
      if (args.length === 0) break;
      const { text, missing } = formatLookup(await loadCards(), await loadBanlist(), args);
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
      const filters = { ...values, allFormats: values["all-formats"] };
      const results = searchCards(await loadCards(), filters);
      console.log(formatSearch(results, await loadBanlist(), { ...filters, limit: Number(values.limit) }));
      return 0;
    }
    case "banlist": {
      const { values } = parseArgs({ args, options: { status: { type: "string" }, upcoming: { type: "boolean" } } });
      if (values.status && !["forbidden", "limited1", "limited2"].includes(values.status)) break;
      const banlist = await loadBanlist();
      if (!banlist) {
        console.error("\u6CA1\u80FD\u4E0B\u8F7D Master Duel \u7981\u9650\u8868\u3002");
        return 1;
      }
      console.log(formatBanlist(await loadCards(), banlist, { status: values.status, upcoming: values.upcoming }));
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
    case "update": {
      const cards = await loadCards(true);
      const banlist = await loadBanlist(true);
      console.log(`\u5361\u7247\u6570\u636E ${cards.length} \u5F20\uFF0C\u5176\u4E2D MD \u5DF2\u5B9E\u88C5 ${cards.filter((card) => card.mdRarity).length} \u5F20\uFF1B${banlistNote(banlist)}`);
      return 0;
    }
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
