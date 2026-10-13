#!/usr/bin/env node

// src/engine-data.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, rmSync, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";

// node_modules/fflate/esm/index.mjs
import { createRequire } from "module";
var require2 = createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e2) {
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
  var b3 = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b3[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b3[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j2 = b3[i2]; j2 < b3[i2 + 1]; ++j2) {
      r[j2] = j2 - b3[i2] << 5 | i2;
    }
  }
  return { b: b3, r };
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
  var l2 = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l2[cd[i2] - 1];
  }
  var le2 = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le2[i2] = le2[i2 - 1] + l2[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v2 = le2[cd[i2] - 1]++ << r_1;
        for (var m = v2 | (1 << r_1) - 1; v2 <= m; ++v2) {
          co[rev[v2] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le2[cd[i2] - 1]++] >> 15 - cd[i2];
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
var bits = function(d, p2, m) {
  var o = p2 / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p2 & 7) & m;
};
var bits16 = function(d, p2) {
  var o = p2 / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p2 & 7);
};
var shft = function(p2) {
  return (p2 + 7) / 8 | 0;
};
var slc = function(v2, s, e2) {
  if (s == null || s < 0)
    s = 0;
  if (e2 == null || e2 > v2.length)
    e2 = v2.length;
  return new u8(v2.subarray(s, e2));
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
  var e2 = new Error(msg || ec[ind]);
  e2.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e2, err);
  if (!nt)
    throw e2;
  return e2;
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
  var cbuf = function(l3) {
    var bl = buf.length;
    if (l3 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l3));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt2 = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l2 = dat[s - 4] | dat[s - 3] << 8, t = s + l2;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt2 + l2);
        buf.set(dat.subarray(s, t), bt2);
        st.b = bt2 += l2, st.p = pos = t * 8, st.f = final;
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
        var lt = ldt.subarray(0, hLit), dt2 = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt2);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt2, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt2 + 131072);
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
        buf[bt2++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b3 = fleb[i2];
          add = bits(dat, pos, (1 << b3) - 1) + fl[i2];
          pos += b3;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt2 = fd[dsym];
        if (dsym > 3) {
          var b3 = fdeb[dsym];
          dt2 += bits16(dat, pos) & (1 << b3) - 1, pos += b3;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt2 + 131072);
        var end = bt2 + add;
        if (bt2 < dt2) {
          var shift = dl - dt2, dend = Math.min(dt2, end);
          if (shift + bt2 < 0)
            err(3);
          for (; bt2 < dend; ++bt2)
            buf[bt2] = dict[shift + bt2];
        }
        for (; bt2 < end; ++bt2)
          buf[bt2] = buf[bt2 - dt2];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt2, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt2 != buf.length && noBuf ? slc(buf, 0, bt2) : buf.subarray(0, bt2);
};
var et = /* @__PURE__ */ new u8(0);
var b2 = function(d, b3) {
  return d[b3] | d[b3 + 1] << 8;
};
var b4 = function(d, b3) {
  return (d[b3] | d[b3 + 1] << 8 | d[b3 + 2] << 16 | d[b3 + 3] << 24) >>> 0;
};
var b8 = function(d, b3) {
  return b4(d, b3) + b4(d, b3 + 4) * 4294967296;
};
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e2) {
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
var slzh = function(d, b3) {
  return b3 + 30 + b2(d, b3 + 26) + b2(d, b3 + 28);
};
var zh = function(d, b3, z2) {
  var fnl = b2(d, b3 + 28), efl = b2(d, b3 + 30), fn = strFromU8(d.subarray(b3 + 46, b3 + 46 + fnl), !(b2(d, b3 + 8) & 2048)), es = b3 + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z2, b4(d, b3 + 20), b4(d, b3 + 24), b4(d, b3 + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b3 + 10), sc, su, fn, es + efl + b2(d, b3 + 32), off];
};
var z64hs = function(d, b3, l2, z2, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e2 = b3 + l2;
  var nf = nsc + nsu + noff;
  if (z2 && nf) {
    for (; b3 + 4 < e2; b3 += 4 + b2(d, b3 + 2)) {
      if (b2(d, b3) == 1) {
        return [
          nsc ? b8(d, b3 + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b3 + 4) : su,
          noff ? b8(d, b3 + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z2 < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
function unzipSync(data, opts) {
  var files = {};
  var e2 = data.length - 22;
  for (; b4(data, e2) != 101010256; --e2) {
    if (!e2 || data.length - e2 > 65558)
      err(13);
  }
  ;
  var c = b2(data, e2 + 8);
  if (!c)
    return {};
  var o = b4(data, e2 + 16);
  var z2 = b4(data, e2 - 20) == 117853008;
  if (z2) {
    var ze = b4(data, e2 - 12);
    z2 = b4(data, ze) == 101075792;
    if (z2) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i2 = 0; i2 < c; ++i2) {
    var _a2 = zh(data, o, z2), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b3 = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b3, b3 + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b3, b3 + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

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
  return results.sort((a, b3) => rank(b3) - rank(a) || (a.en < b3.en ? -1 : a.en > b3.en ? 1 : 0));
}
function inSet(card, code) {
  return card.setcodes.some((setcode) => (setcode & 4095) === (code & 4095) && (setcode & code & 61440) === (code & 61440));
}
function archetypeLookup(cards) {
  const codes = /* @__PURE__ */ new Map();
  const codeOf = (archetype) => {
    if (!codes.has(archetype)) {
      const counts = /* @__PURE__ */ new Map();
      for (const card of cards) {
        if (!card.cn.includes(archetype)) continue;
        for (const code of new Set(card.setcodes)) counts.set(code, (counts.get(code) ?? 0) + 1);
      }
      const [best] = [...counts].sort((a, b3) => b3[1] - a[1]);
      codes.set(archetype, best && best[1] >= 2 ? best[0] : null);
    }
    return codes.get(archetype);
  };
  return (card, archetype) => {
    if ([card.cn, card.md, card.sc, card.jp].some((name) => name.includes(archetype))) return true;
    if (card.descZh.includes(`\u4E5F\u5F53\u4F5C\u300C${archetype}\u300D`)) return true;
    const code = codeOf(archetype);
    return code !== null && inSet(card, code);
  };
}

// src/engine-data.ts
var BABEL_CONTENTS = "https://api.github.com/repos/ProjectIgnis/BabelCDB/contents";
var SCRIPTS_COMMIT = "https://api.github.com/repos/ProjectIgnis/CardScripts/commits?per_page=1";
var SCRIPTS_ZIP = "https://codeload.github.com/ProjectIgnis/CardScripts/zip/refs/heads/master";
var ENGINE_DIR = cachePath("engine");
var CARDS_FILE = join2(ENGINE_DIR, "cards.json");
var VERSIONS_FILE = join2(ENGINE_DIR, "versions.json");
var SCRIPTS_DIR = join2(ENGINE_DIR, "scripts");
var SCRIPT_FOLDERS = ["official", "pre-release", ".", "pre-errata", "unofficial"];
function wanted(name) {
  return /^(cards|release-.+|prerelease-.+)\.cdb$/.test(name) && !/rush|skill|goat|unofficial/.test(name);
}
var order = (name) => name === "cards.cdb" ? 0 : name.startsWith("prerelease") ? 1 : 2;
async function latestVersions() {
  const [contents, commits] = await Promise.all([fetchJson(BABEL_CONTENTS), fetchJson(SCRIPTS_COMMIT)]);
  const files = contents.filter((file) => wanted(file.name));
  if (files.length === 0 || !commits[0]?.sha) throw new Error("GitHub \u8FD4\u56DE\u7684\u5185\u5BB9\u4E0D\u50CF\u5361\u5E93\u548C\u811A\u672C\u4ED3\u5E93");
  return {
    versions: { databases: Object.fromEntries(files.map((file) => [file.name, file.sha])), scripts: commits[0].sha },
    urls: Object.fromEntries(files.map((file) => [file.name, file.download_url]))
  };
}
async function readDatabases(files) {
  let sqlite;
  try {
    sqlite = await import("node:sqlite");
  } catch {
    throw new Error(`\u8DEF\u7EBF\u89C4\u5212\u8981\u8BFB SQLite \u5361\u5E93\uFF0C\u9700\u8981 Node.js 22.13 \u6216\u66F4\u9AD8\u7248\u672C\uFF08\u73B0\u5728\u662F ${process.version}\uFF09`);
  }
  const cards = /* @__PURE__ */ new Map();
  const temp = join2(ENGINE_DIR, "temp.cdb");
  mkdirSync2(ENGINE_DIR, { recursive: true });
  for (const bytes of files) {
    writeFileSync2(temp, bytes);
    const db = new sqlite.DatabaseSync(temp, { readOnly: true });
    const statement = db.prepare("SELECT id, alias, setcode, type, atk, def, level, race, attribute FROM datas");
    statement.setReadBigInts(true);
    for (const row of statement.all()) {
      const type = Number(row.type);
      const level = Number(row.level);
      const isLink = (type & 67108864) !== 0;
      const setcodes = [];
      for (let rest = BigInt.asUintN(64, row.setcode); rest > 0n; rest >>= 16n) setcodes.push(Number(rest & 0xffffn));
      cards.set(Number(row.id), {
        code: Number(row.id),
        alias: Number(row.alias),
        setcodes,
        type,
        attack: Number(row.atk),
        defense: isLink ? 0 : Number(row.def),
        link_marker: isLink ? Number(row.def) : 0,
        level: level & 255,
        lscale: level >> 24 & 255,
        rscale: level >> 16 & 255,
        race: Number(row.race),
        attribute: Number(row.attribute)
      });
    }
    db.close();
  }
  rmSync(temp, { force: true });
  return [...cards.values()];
}
async function downloadDatabases(urls) {
  const names3 = Object.keys(urls).sort((a, b3) => order(a) - order(b3) || a.localeCompare(b3));
  const files = await Promise.all(names3.map((name) => fetchBytes(urls[name], 180)));
  writeText(CARDS_FILE, JSON.stringify(await readDatabases(files)));
}
async function downloadScripts() {
  console.error("Downloading card scripts for the rules engine (about 25 MB)...");
  const archive = unzipSync(await fetchBytes(SCRIPTS_ZIP, 600), {
    // Only what the engine reads: shared libraries at the top level, card folders, and the one unofficial library
    // utility.lua loads.
    filter: (file) => /^[^/]+\/((official|pre-release|pre-errata)\/)?[^/]+\.lua$|\/unofficial\/proc_unofficial\.lua$/.test(file.name)
  });
  rmSync(SCRIPTS_DIR, { recursive: true, force: true });
  for (const [name, bytes] of Object.entries(archive)) {
    const target = join2(SCRIPTS_DIR, name.slice(name.indexOf("/") + 1));
    mkdirSync2(dirname2(target), { recursive: true });
    writeFileSync2(target, bytes);
  }
}
var memo = null;
async function loadEngineData(maxAge = DAY) {
  const cached = existsSync2(VERSIONS_FILE) ? readJson(VERSIONS_FILE) : null;
  const complete = cached !== null && existsSync2(CARDS_FILE) && existsSync2(SCRIPTS_DIR);
  if (!complete || ageOf(VERSIONS_FILE) >= maxAge) {
    try {
      const { versions, urls } = await latestVersions();
      const databasesChanged = !complete || JSON.stringify(versions.databases) !== JSON.stringify(cached.databases);
      if (databasesChanged) await downloadDatabases(urls);
      if (!complete || versions.scripts !== cached.scripts) await downloadScripts();
      writeText(VERSIONS_FILE, JSON.stringify(versions));
      if (databasesChanged) memo = null;
    } catch (error) {
      if (!complete) throw new Error(`\u6CA1\u80FD\u4E0B\u8F7D\u89C4\u5219\u5F15\u64CE\u7684\u6570\u636E\uFF1A${error instanceof Error ? error.message : error}`);
      console.error(`Could not check the rules engine data for updates (${error}); using the cached copy.`);
    }
  }
  memo ??= new Map(readJson(CARDS_FILE).map((card) => [card.code, card]));
  return memo;
}
function scriptPath(name) {
  for (const folder of SCRIPT_FOLDERS) {
    const file = join2(SCRIPTS_DIR, folder, name);
    if (existsSync2(file)) return file;
  }
  return null;
}
function engineKnows(card, data) {
  const code = [card.id, ...card.altIds].find((id) => data.has(id));
  if (code === void 0) return false;
  const entry = data.get(code);
  const base = entry.alias && Math.abs(entry.alias - entry.code) < 20 ? entry.alias : entry.code;
  const isNormalMonster = (entry.type & 17) === 17 && (entry.type & 32) === 0;
  return isNormalMonster || scriptPath(`c${base}.lua`) !== null || scriptPath(`c${entry.code}.lua`) !== null;
}

// src/engine.ts
import { readFileSync as readFileSync2 } from "node:fs";

// node_modules/@n1xx1/ocgcore-wasm/dist/index.js
function W(e2, t) {
  e2.setUint32(0, t.code ?? 0, true), e2.setUint32(4, t.alias ?? 0, true), t.ptrSize === 4 ? (e2.setUint32(8, t.setcodes ?? 0, true), e2.setUint32(12, t.type ?? 0, true), e2.setUint32(16, t.level ?? 0, true), e2.setUint32(20, t.attribute ?? 0, true), e2.setBigUint64(24, t.race ?? 0n, true), e2.setInt32(32, t.attack ?? 0, true), e2.setInt32(36, t.defense ?? 0, true), e2.setUint32(40, t.lscale ?? 0, true), e2.setUint32(44, t.rscale ?? 0, true), e2.setUint32(48, t.link_marker ?? 0, true)) : (e2.setBigUint64(8, t.setcodes ?? 0n, true), e2.setUint32(16, t.type ?? 0, true), e2.setUint32(20, t.level ?? 0, true), e2.setUint32(24, t.attribute ?? 0, true), e2.setBigUint64(32, t.race ?? 0n, true), e2.setInt32(40, t.attack ?? 0, true), e2.setInt32(44, t.defense ?? 0, true), e2.setUint32(48, t.lscale ?? 0, true), e2.setUint32(52, t.rscale ?? 0, true), e2.setUint32(56, t.link_marker ?? 0, true));
}
function Y(e2, t) {
  e2.setBigUint64(0, t.seed[0], true), e2.setBigUint64(8, t.seed[1], true), e2.setBigUint64(16, t.seed[2], true), e2.setBigUint64(24, t.seed[3], true), e2.setBigUint64(32, t.flags, true), e2.setUint32(40, t.team1.startingLP, true), e2.setUint32(44, t.team1.startingDrawCount, true), e2.setUint32(48, t.team1.drawCountPerTurn, true), e2.setUint32(52, t.team2.startingLP, true), e2.setUint32(56, t.team2.startingDrawCount, true), e2.setUint32(60, t.team2.drawCountPerTurn, true), t.ptrSize === 4 ? (e2.setUint32(64, t.cardReader, true), e2.setUint32(68, t.cardReaderPayload, true), e2.setUint32(72, t.scriptReader, true), e2.setUint32(76, t.scriptReaderPayload, true), e2.setUint32(80, t.errorHandler, true), e2.setUint32(84, t.errorHandlerPayload, true), e2.setUint32(88, t.cardReaderDone, true), e2.setUint32(92, t.cardReaderDonePayload, true), e2.setUint8(96, t.enableUnsafeLibraries ? 1 : 0)) : (e2.setBigUint64(64, t.cardReader, true), e2.setBigUint64(72, t.cardReaderPayload, true), e2.setBigUint64(80, t.scriptReader, true), e2.setBigUint64(88, t.scriptReaderPayload, true), e2.setBigUint64(96, t.errorHandler, true), e2.setBigUint64(104, t.errorHandlerPayload, true), e2.setBigUint64(112, t.cardReaderDone, true), e2.setBigUint64(120, t.cardReaderDonePayload, true), e2.setUint8(128, t.enableUnsafeLibraries ? 1 : 0));
}
function q(e2, t) {
  e2.setUint8(0, t.team), e2.setUint8(1, t.duelist), e2.setUint32(4, t.code, true), e2.setUint8(8, t.controller), e2.setUint32(12, t.location, true), e2.setUint32(16, t.sequence, true), e2.setUint32(20, t.position, true);
}
var F = class e {
  static from(t) {
    return new e(new DataView(t, 0, t.byteLength));
  }
  constructor(t, o) {
    this.view = t, this.off = o ?? 0;
  }
  get avail() {
    return this.view.byteLength - this.off;
  }
  reset() {
    this.off = 0;
  }
  sub(t) {
    if (this.avail < t) throw new Error("eof");
    let o = new e(new DataView(this.view.buffer, this.view.byteOffset + this.off, t), 0);
    return this.off += t, o;
  }
  bytes(t) {
    if (this.avail < t) throw new Error("eof");
    let o = this.view.buffer.slice(this.view.byteOffset + this.off, this.view.byteOffset + this.off + t);
    return new Uint8Array(o);
  }
  u8() {
    if (this.avail < 1) throw new Error("eof");
    let t = this.view.getUint8(this.off);
    return this.off += 1, t;
  }
  i8() {
    if (this.avail < 1) throw new Error("eof");
    let t = this.view.getInt8(this.off);
    return this.off += 1, t;
  }
  u16() {
    if (this.avail < 2) throw new Error("eof");
    let t = this.view.getUint16(this.off, true);
    return this.off += 2, t;
  }
  i16() {
    if (this.avail < 2) throw new Error("eof");
    let t = this.view.getInt16(this.off, true);
    return this.off += 2, t;
  }
  u32() {
    if (this.avail < 4) throw new Error("eof");
    let t = this.view.getUint32(this.off, true);
    return this.off += 4, t;
  }
  i32() {
    if (this.avail < 4) throw new Error("eof");
    let t = this.view.getInt32(this.off, true);
    return this.off += 4, t;
  }
  u64() {
    if (this.avail < 8) throw new Error("eof");
    let t = this.view.getBigUint64(this.off, true);
    return this.off += 8, t;
  }
  i64() {
    if (this.avail < 8) throw new Error("eof");
    let t = this.view.getBigInt64(this.off, true);
    return this.off += 8, t;
  }
};
var H = class {
  constructor(t = 64, o = false) {
    this.buffer = new Uint8Array(t), this.view = new DataView(this.buffer.buffer), this.off = 0, this.aligned = o;
  }
  get(t = 0) {
    return t > 0 && this.align(t), this.buffer.slice(0, this.off);
  }
  align(t) {
    let o = (t - this.off % t) % t;
    this.grow(o), this.off += o;
  }
  grow(t) {
    if (this.off + t <= this.buffer.byteLength) return;
    let o = new Uint8Array(this.buffer.byteLength * 2);
    o.set(this.buffer, 0), this.buffer = o, this.view = new DataView(this.buffer.buffer);
  }
  bytes(t) {
    t instanceof ArrayBuffer ? (this.grow(t.byteLength), this.buffer.set(new Uint8Array(t), this.off), this.off += t.byteLength) : (this.grow(t.length), this.buffer.set(t, this.off), this.off += t.length);
  }
  u8(t) {
    return this.grow(1), this.view.setUint8(this.off, t), this.off += 1, this;
  }
  i8(t) {
    return this.grow(1), this.view.setInt8(this.off, t), this.off += 1, this;
  }
  u16(t) {
    return this.aligned && this.align(2), this.grow(2), this.view.setUint16(this.off, t, true), this.off += 2, this;
  }
  i16(t) {
    return this.aligned && this.align(2), this.grow(2), this.view.setInt16(this.off, t, true), this.off += 2, this;
  }
  u32(t) {
    return this.aligned && this.align(4), this.grow(4), this.view.setUint32(this.off, t, true), this.off += 4, this;
  }
  i32(t) {
    return this.aligned && this.align(4), this.grow(4), this.view.setInt32(this.off, t, true), this.off += 4, this;
  }
  u64(t) {
    return this.aligned && this.align(8), this.grow(8), this.view.setBigUint64(this.off, t, true), this.off += 8, this;
  }
  i64(t) {
    return this.aligned && this.align(8), this.grow(8), this.view.setBigInt64(this.off, t, true), this.off += 8, this;
  }
};
var w = { END: 0, WAITING: 1, CONTINUE: 2 };
var I = { FACEUP_ATTACK: 1, FACEDOWN_ATTACK: 2, FACEUP_DEFENSE: 4, FACEDOWN_DEFENSE: 8, FACEUP: 5, FACEDOWN: 10, ATTACK: 3, DEFENSE: 12 };
var ie = [I.FACEUP_ATTACK, I.FACEDOWN_ATTACK, I.FACEUP_DEFENSE, I.FACEDOWN_DEFENSE];
var L = { DECK: 1, HAND: 2, MZONE: 4, SZONE: 8, GRAVE: 16, REMOVED: 32, EXTRA: 64, OVERLAY: 128, FZONE: 256, PZONE: 512, ONFIELD: 12, ALL: 1023 };
var C = { MONSTER: 1, SPELL: 2, TRAP: 4, NORMAL: 16, EFFECT: 32, FUSION: 64, RITUAL: 128, TRAPMONSTER: 256, SPIRIT: 512, UNION: 1024, GEMINI: 2048, TUNER: 4096, SYNCHRO: 8192, TOKEN: 16384, MAXIMUM: 32768, QUICKPLAY: 65536, CONTINUOUS: 131072, EQUIP: 262144, FIELD: 524288, COUNTER: 1048576, FLIP: 2097152, TOON: 4194304, XYZ: 8388608, PENDULUM: 16777216, SPSUMMON: 33554432, LINK: 67108864 };
var ue = Object.values(C);
var U = { EARTH: 1, WATER: 2, FIRE: 4, WIND: 8, LIGHT: 16, DARK: 32, DIVINE: 64 };
var Ee = Object.values(U);
var A = { WARRIOR: 0x1n, SPELLCASTER: 0x2n, FAIRY: 0x4n, FIEND: 0x8n, ZOMBIE: 0x10n, MACHINE: 0x20n, AQUA: 0x40n, PYRO: 0x80n, ROCK: 0x100n, WINGEDBEAST: 0x200n, PLANT: 0x400n, INSECT: 0x800n, THUNDER: 0x1000n, DRAGON: 0x2000n, BEAST: 0x4000n, BEASTWARRIOR: 0x8000n, DINOSAUR: 0x10000n, FISH: 0x20000n, SEASERPENT: 0x40000n, REPTILE: 0x80000n, PSYCHIC: 0x100000n, DIVINE: 0x200000n, CREATORGOD: 0x400000n, WYRM: 0x800000n, CYBERSE: 0x1000000n, ILLUSION: 0x2000000n, CYBORG: 0x4000000n, MAGICALKNIGHT: 0x8000000n, HIGHDRAGON: 0x10000000n, OMEGAPSYCHIC: 0x20000000n, CELESTIALWARRIOR: 0x40000000n, GALAXY: 0x80000000n };
var le = Object.values(A);
var M = { BOTTOM_LEFT: 1, BOTTOM: 2, BOTTOM_RIGHT: 4, LEFT: 8, RIGHT: 32, TOP_LEFT: 64, TOP: 128, TOP_RIGHT: 256 };
var ge = Object.values(M);
var K = { SCISSORS: 1, ROCK: 2, PAPER: 3 };
var g = { TEST_MODE: 0x01n, ATTACK_FIRST_TURN: 0x02n, USE_TRAPS_IN_NEW_CHAIN: 0x04n, SIX_STEP_BATLLE_STEP: 0x08n, PSEUDO_SHUFFLE: 0x10n, TRIGGER_WHEN_PRIVATE_KNOWLEDGE: 0x20n, SIMPLE_AI: 0x40n, RELAY: 0x80n, OBSOLETE_IGNITION: 0x100n, FIRST_TURN_DRAW: 0x200n, ONE_FACEUP_FIELD: 0x400n, PZONE: 0x800n, SEPARATE_PZONE: 0x1000n, EMZONE: 0x2000n, FSX_MMZONE: 0x4000n, TRAP_MONSTERS_NOT_USE_ZONE: 0x8000n, RETURN_TO_DECK_TRIGGERS: 0x10000n, TRIGGER_ONLY_IN_LOCATION: 0x20000n, SPSUMMON_ONCE_OLD_NEGATE: 0x40000n, CANNOT_SUMMON_OATH_OLD: 0x80000n, NO_STANDBY_PHASE: 0x100000n, NO_MAIN_PHASE_2: 0x200000n, THREE_COLUMNS_FIELD: 0x400000n, DRAW_UNTIL_5: 0x800000n, NO_HAND_LIMIT: 0x1000000n, UNLIMITED_SUMMONS: 0x2000000n, INVERTED_QUICK_PRIORITY: 0x4000000n, EQUIP_NOT_SENT_IF_MISSING_TARGET: 0x8000000n, ZERO_ATK_DESTROYED: 0x10000000n, STORE_ATTACK_REPLAYS: 0x20000000n, SINGLE_CHAIN_IN_DAMAGE_SUBSTEP: 0x40000000n, CAN_REPOS_IF_NON_SUMPLAYER: 0x80000000n, TCG_SEGOC_NONPUBLIC: 0x100000000n, TCG_SEGOC_FIRSTTRIGGER: 0x200000000n };
var X = { ...g, MODE_MR1: g.OBSOLETE_IGNITION | g.FIRST_TURN_DRAW | g.ONE_FACEUP_FIELD | g.SPSUMMON_ONCE_OLD_NEGATE | g.RETURN_TO_DECK_TRIGGERS | g.CANNOT_SUMMON_OATH_OLD };
var Oe = { ...X, MODE_SPEED: g.THREE_COLUMNS_FIELD | g.NO_MAIN_PHASE_2 | g.TRIGGER_ONLY_IN_LOCATION, MODE_RUSH: g.THREE_COLUMNS_FIELD | g.NO_MAIN_PHASE_2 | g.NO_STANDBY_PHASE | g.FIRST_TURN_DRAW | g.INVERTED_QUICK_PRIORITY | g.DRAW_UNTIL_5 | g.NO_HAND_LIMIT | g.UNLIMITED_SUMMONS | g.TRIGGER_ONLY_IN_LOCATION, MODE_GOAT: X.MODE_MR1 | g.USE_TRAPS_IN_NEW_CHAIN | g.SIX_STEP_BATLLE_STEP | g.TRIGGER_WHEN_PRIVATE_KNOWLEDGE | g.EQUIP_NOT_SENT_IF_MISSING_TARGET | g.ZERO_ATK_DESTROYED | g.STORE_ATTACK_REPLAYS | g.SINGLE_CHAIN_IN_DAMAGE_SUBSTEP | g.CAN_REPOS_IF_NON_SUMPLAYER | g.TCG_SEGOC_NONPUBLIC | g.TCG_SEGOC_FIRSTTRIGGER, MODE_MR2: g.FIRST_TURN_DRAW | g.ONE_FACEUP_FIELD | g.SPSUMMON_ONCE_OLD_NEGATE | g.RETURN_TO_DECK_TRIGGERS | g.CANNOT_SUMMON_OATH_OLD, MODE_MR3: g.PZONE | g.SEPARATE_PZONE | g.SPSUMMON_ONCE_OLD_NEGATE | g.RETURN_TO_DECK_TRIGGERS | g.CANNOT_SUMMON_OATH_OLD, MODE_MR4: g.PZONE | g.EMZONE | g.SPSUMMON_ONCE_OLD_NEGATE | g.RETURN_TO_DECK_TRIGGERS | g.CANNOT_SUMMON_OATH_OLD, MODE_MR5: g.PZONE | g.EMZONE | g.FSX_MMZONE | g.TRAP_MONSTERS_NOT_USE_ZONE | g.TRIGGER_ONLY_IN_LOCATION };
var S = Oe;
var _e = Object.values(g);
var B = { ERROR: 0, FROM_SCRIPT: 1, FOR_DEBUG: 2, UNDEFINED: 3 };
var u = { CODE: 1, POSITION: 2, ALIAS: 4, TYPE: 8, LEVEL: 16, RANK: 32, ATTRIBUTE: 64, RACE: 128, ATTACK: 256, DEFENSE: 512, BASE_ATTACK: 1024, BASE_DEFENSE: 2048, REASON: 4096, REASON_CARD: 8192, EQUIP_CARD: 16384, TARGET_CARD: 32768, OVERLAY_CARD: 65536, COUNTERS: 131072, OWNER: 262144, STATUS: 524288, IS_PUBLIC: 1048576, LSCALE: 2097152, RSCALE: 4194304, LINK: 8388608, IS_HIDDEN: 16777216, COVER: 33554432 };
var b = { OCG: 1, TCG: 2, ANIME: 4, ILLEGAL: 8, VIDEO_GAME: 16, CUSTOM: 32, SPEED: 64, PRERELEASE: 256, RUSH: 512, LEGEND: 1024, HIDDEN: 4096 };
var x2 = { DRAW: 1, STANDBY: 2, MAIN1: 4, BATTLE_START: 8, BATTLE_STEP: 16, DAMAGE: 32, DAMAGE_CAL: 64, BATTLE: 128, MAIN2: 256, END: 512 };
var P = { EVENT: 1, MESSAGE: 2, SELECTMSG: 3, OPSELECTED: 4, EFFECT: 5, RACE: 6, ATTRIB: 7, CODE: 8, NUMBER: 9, CARD: 10, ZONE: 11 };
var f = { DRAW_PHASE: 1, STANDBY_PHASE: 2, MAIN_END: 4, BATTLE_START: 8, BATTLE_END: 16, END_PHASE: 32, SUMMON: 64, SPSUMMON: 128, FLIPSUMMON: 256, MSET: 512, SSET: 1024, POS_CHANGE: 2048, ATTACK: 4096, DAMAGE_STEP: 8192, DAMAGE_CAL: 16384, CHAIN_END: 32768, DRAW: 65536, DAMAGE: 131072, RECOVER: 262144, DESTROY: 524288, REMOVE: 1048576, TOHAND: 2097152, TODECK: 4194304, TOGRAVE: 8388608, BATTLE_PHASE: 16777216, EQUIP: 33554432, BATTLE_STEP_END: 67108864, BATTLED: 134217728 };
var Se = Object.values(f);
function Q(e2) {
  let t = {};
  for (; e2.avail > 0; ) {
    let o = e2.u16();
    if (o === 0) return null;
    if (o < 4) break;
    let s = e2.u32();
    if (o -= 4, s === 2147483648) break;
    if (s === u.CODE && o === 4) t.code = e2.u32();
    else if (s === u.POSITION && o === 4) t.position = e2.u32();
    else if (s === u.ALIAS && o === 4) t.alias = e2.u32();
    else if (s === u.LEVEL && o === 4) t.level = e2.u32();
    else if (s === u.RANK && o === 4) t.rank = e2.u32();
    else if (s === u.ATTRIBUTE && o === 4) t.attribute = e2.u32();
    else if (s === u.RACE && o === 8) t.race = e2.u64();
    else if (s === u.ATTACK && o === 4) t.attack = e2.u32();
    else if (s === u.DEFENSE && o === 4) t.defense = e2.u32();
    else if (s === u.BASE_ATTACK && o === 4) t.baseAttack = e2.u32();
    else if (s === u.BASE_DEFENSE && o === 4) t.baseDefense = e2.u32();
    else if (s === u.REASON && o === 4) t.reason = e2.u32();
    else if (s === u.COVER && o === 4) t.cover = e2.u32();
    else if (s === u.REASON_CARD && o === 10) {
      let r = p(e2);
      G(r) || (t.reasonCard = r);
    } else if (s === u.EQUIP_CARD && o === 10) {
      let r = p(e2);
      G(r) || (t.equipCard = r);
    } else if (s === u.TARGET_CARD && o >= 4) {
      t.targetCards = [];
      let r = e2.u32();
      for (let O = 0; O < r; O++) {
        let c = p(e2);
        G(c) || t.targetCards.push(c);
      }
    } else if (s === u.OVERLAY_CARD && o >= 4) {
      t.overlayCards = [];
      let r = e2.u32();
      for (let O = 0; O < r; O++) t.overlayCards.push(e2.u32());
    } else if (s === u.COUNTERS && o >= 4) {
      t.counters = {};
      let r = e2.u32();
      for (let O = 0; O < r; O++) {
        let c = e2.u16(), a = e2.u16();
        t.counters[a] = c;
      }
    } else if (s === u.OWNER && o === 1) t.owner = e2.u8();
    else if (s === u.STATUS && o === 4) t.status = e2.u32();
    else if (s === u.IS_PUBLIC && o === 1) t.isPublic = !!e2.u8();
    else if (s === u.RSCALE && o === 4) t.rightScale = e2.u32();
    else if (s === u.LSCALE && o === 4) t.leftScale = e2.u32();
    else if (s === u.IS_HIDDEN && o === 1) t.isHidden = !!e2.u8();
    else if (s === u.LINK && o === 8) {
      let r = e2.u32(), O = e2.u32();
      t.link = { rating: r, marker: O };
    }
  }
  return t;
}
function j(e2) {
  let t = e2.u32(), o = [];
  for (; e2.avail > 0; ) o.push(Q(e2));
  return o;
}
function v(e2) {
  return { flags: BigInt(e2.u32()), players: Array.from({ length: 2 }, () => ({ lp: e2.u32(), monsters: Array.from({ length: 7 }, () => e2.u8() != 0 ? { position: e2.u8(), materials: e2.u32() } : null), spells: Array.from({ length: 8 }, () => e2.u8() != 0 ? { position: e2.u8(), materials: e2.u32() } : null), deck_size: e2.u32(), hand_size: e2.u32(), grave_size: e2.u32(), banish_size: e2.u32(), extra_size: e2.u32(), extra_faceup_count: e2.u32() })), chain: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), ...p(e2), triggering_controller: e2.u8(), triggering_location: e2.u8(), triggering_sequence: e2.u32(), description: e2.u64() })) };
}
var J = ((s) => (s[s.NORMAL = 0] = "NORMAL", s[s.RESOLVE = 1] = "RESOLVE", s[s.RESET = 2] = "RESET", s))(J || {});
var $ = ((a) => (a[a.TURN = 1] = "TURN", a[a.CARD = 2] = "CARD", a[a.RACE = 3] = "RACE", a[a.ATTRIBUTE = 4] = "ATTRIBUTE", a[a.NUMBER = 5] = "NUMBER", a[a.DESC_ADD = 6] = "DESC_ADD", a[a.DESC_REMOVE = 7] = "DESC_REMOVE", a))($ || {});
var ee = ((o) => (o[o.DESC_ADD = 6] = "DESC_ADD", o[o.DESC_REMOVE = 7] = "DESC_REMOVE", o))(ee || {});
var z = ((n) => (n[n.RETRY = 1] = "RETRY", n[n.HINT = 2] = "HINT", n[n.WAITING = 3] = "WAITING", n[n.START = 4] = "START", n[n.WIN = 5] = "WIN", n[n.UPDATE_DATA = 6] = "UPDATE_DATA", n[n.UPDATE_CARD = 7] = "UPDATE_CARD", n[n.REQUEST_DECK = 8] = "REQUEST_DECK", n[n.SELECT_BATTLECMD = 10] = "SELECT_BATTLECMD", n[n.SELECT_IDLECMD = 11] = "SELECT_IDLECMD", n[n.SELECT_EFFECTYN = 12] = "SELECT_EFFECTYN", n[n.SELECT_YESNO = 13] = "SELECT_YESNO", n[n.SELECT_OPTION = 14] = "SELECT_OPTION", n[n.SELECT_CARD = 15] = "SELECT_CARD", n[n.SELECT_CHAIN = 16] = "SELECT_CHAIN", n[n.SELECT_PLACE = 18] = "SELECT_PLACE", n[n.SELECT_POSITION = 19] = "SELECT_POSITION", n[n.SELECT_TRIBUTE = 20] = "SELECT_TRIBUTE", n[n.SORT_CHAIN = 21] = "SORT_CHAIN", n[n.SELECT_COUNTER = 22] = "SELECT_COUNTER", n[n.SELECT_SUM = 23] = "SELECT_SUM", n[n.SELECT_DISFIELD = 24] = "SELECT_DISFIELD", n[n.SORT_CARD = 25] = "SORT_CARD", n[n.SELECT_UNSELECT_CARD = 26] = "SELECT_UNSELECT_CARD", n[n.CONFIRM_DECKTOP = 30] = "CONFIRM_DECKTOP", n[n.CONFIRM_CARDS = 31] = "CONFIRM_CARDS", n[n.SHUFFLE_DECK = 32] = "SHUFFLE_DECK", n[n.SHUFFLE_HAND = 33] = "SHUFFLE_HAND", n[n.REFRESH_DECK = 34] = "REFRESH_DECK", n[n.SWAP_GRAVE_DECK = 35] = "SWAP_GRAVE_DECK", n[n.SHUFFLE_SET_CARD = 36] = "SHUFFLE_SET_CARD", n[n.REVERSE_DECK = 37] = "REVERSE_DECK", n[n.DECK_TOP = 38] = "DECK_TOP", n[n.SHUFFLE_EXTRA = 39] = "SHUFFLE_EXTRA", n[n.NEW_TURN = 40] = "NEW_TURN", n[n.NEW_PHASE = 41] = "NEW_PHASE", n[n.CONFIRM_EXTRATOP = 42] = "CONFIRM_EXTRATOP", n[n.MOVE = 50] = "MOVE", n[n.POS_CHANGE = 53] = "POS_CHANGE", n[n.SET = 54] = "SET", n[n.SWAP = 55] = "SWAP", n[n.FIELD_DISABLED = 56] = "FIELD_DISABLED", n[n.SUMMONING = 60] = "SUMMONING", n[n.SUMMONED = 61] = "SUMMONED", n[n.SPSUMMONING = 62] = "SPSUMMONING", n[n.SPSUMMONED = 63] = "SPSUMMONED", n[n.FLIPSUMMONING = 64] = "FLIPSUMMONING", n[n.FLIPSUMMONED = 65] = "FLIPSUMMONED", n[n.CHAINING = 70] = "CHAINING", n[n.CHAINED = 71] = "CHAINED", n[n.CHAIN_SOLVING = 72] = "CHAIN_SOLVING", n[n.CHAIN_SOLVED = 73] = "CHAIN_SOLVED", n[n.CHAIN_END = 74] = "CHAIN_END", n[n.CHAIN_NEGATED = 75] = "CHAIN_NEGATED", n[n.CHAIN_DISABLED = 76] = "CHAIN_DISABLED", n[n.CARD_SELECTED = 80] = "CARD_SELECTED", n[n.RANDOM_SELECTED = 81] = "RANDOM_SELECTED", n[n.BECOME_TARGET = 83] = "BECOME_TARGET", n[n.DRAW = 90] = "DRAW", n[n.DAMAGE = 91] = "DAMAGE", n[n.RECOVER = 92] = "RECOVER", n[n.EQUIP = 93] = "EQUIP", n[n.LPUPDATE = 94] = "LPUPDATE", n[n.CARD_TARGET = 96] = "CARD_TARGET", n[n.CANCEL_TARGET = 97] = "CANCEL_TARGET", n[n.PAY_LPCOST = 100] = "PAY_LPCOST", n[n.ADD_COUNTER = 101] = "ADD_COUNTER", n[n.REMOVE_COUNTER = 102] = "REMOVE_COUNTER", n[n.ATTACK = 110] = "ATTACK", n[n.BATTLE = 111] = "BATTLE", n[n.ATTACK_DISABLED = 112] = "ATTACK_DISABLED", n[n.DAMAGE_STEP_START = 113] = "DAMAGE_STEP_START", n[n.DAMAGE_STEP_END = 114] = "DAMAGE_STEP_END", n[n.MISSED_EFFECT = 120] = "MISSED_EFFECT", n[n.BE_CHAIN_TARGET = 121] = "BE_CHAIN_TARGET", n[n.CREATE_RELATION = 122] = "CREATE_RELATION", n[n.RELEASE_RELATION = 123] = "RELEASE_RELATION", n[n.TOSS_COIN = 130] = "TOSS_COIN", n[n.TOSS_DICE = 131] = "TOSS_DICE", n[n.ROCK_PAPER_SCISSORS = 132] = "ROCK_PAPER_SCISSORS", n[n.HAND_RES = 133] = "HAND_RES", n[n.ANNOUNCE_RACE = 140] = "ANNOUNCE_RACE", n[n.ANNOUNCE_ATTRIB = 141] = "ANNOUNCE_ATTRIB", n[n.ANNOUNCE_CARD = 142] = "ANNOUNCE_CARD", n[n.ANNOUNCE_NUMBER = 143] = "ANNOUNCE_NUMBER", n[n.CARD_HINT = 160] = "CARD_HINT", n[n.TAG_SWAP = 161] = "TAG_SWAP", n[n.RELOAD_FIELD = 162] = "RELOAD_FIELD", n[n.AI_NAME = 163] = "AI_NAME", n[n.SHOW_HINT = 164] = "SHOW_HINT", n[n.PLAYER_HINT = 165] = "PLAYER_HINT", n[n.MATCH_KILL = 170] = "MATCH_KILL", n[n.CUSTOM_MSG = 180] = "CUSTOM_MSG", n[n.REMOVE_CARDS = 190] = "REMOVE_CARDS", n))(z || {});
function p(e2) {
  let t = e2.u8(), o = e2.u8(), s = e2.u32(), r = e2.u32();
  return o & L.OVERLAY ? { controller: t, location: o & ~L.OVERLAY, sequence: s, position: I.FACEUP_ATTACK, overlay_sequence: r } : { controller: t, location: o, sequence: s, position: r };
}
function G(e2) {
  return !e2.controller && !e2.location && !e2.sequence && !e2.position && !e2.overlay_sequence;
}
function te(e2) {
  let t = e2.u8();
  switch (t) {
    case 1:
      return { type: t };
    case 2:
      return { type: t, hint_type: e2.u8(), player: e2.u8(), hint: e2.avail > 4 ? e2.u64() : BigInt(e2.u32()) };
    case 5:
      return { type: t, player: e2.u8(), reason: e2.u8() };
    case 10:
      return { type: t, player: e2.u8(), chains: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u32(), description: e2.u64(), client_mode: e2.u8() })), attacks: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u8(), can_direct: e2.u8() != 0 })), to_m2: e2.u8() != 0, to_ep: e2.u8() != 0 };
    case 11:
      return { type: t, player: e2.u8(), summons: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u32() })), special_summons: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u32() })), pos_changes: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u8() })), monster_sets: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u32() })), spell_sets: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u32() })), activates: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u32(), description: e2.u64(), client_mode: e2.u8() })), to_bp: e2.u8() != 0, to_ep: e2.u8() != 0, shuffle: e2.u8() != 0 };
    case 12:
      return { type: t, player: e2.u8(), code: e2.u32(), ...p(e2), description: e2.u64() };
    case 13:
      return { type: t, player: e2.u8(), description: e2.u64() };
    case 14:
      return { type: t, player: e2.u8(), options: Array.from({ length: e2.u8() }, () => e2.u64()) };
    case 15:
      return { type: t, player: e2.u8(), can_cancel: e2.u8() != 0, min: e2.u32(), max: e2.u32(), selects: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), ...p(e2) })) };
    case 16:
      return { type: t, player: e2.u8(), spe_count: e2.u8(), forced: e2.u8() != 0, hint_timing: e2.u32(), hint_timing_other: e2.u32(), selects: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), ...p(e2), description: e2.u64(), client_mode: e2.u8() })) };
    case 18:
      return { type: t, player: e2.u8(), count: e2.u8(), field_mask: e2.u32() };
    case 19:
      return { type: t, player: e2.u8(), code: e2.u32(), positions: e2.u8() };
    case 20:
      return { type: t, player: e2.u8(), can_cancel: e2.u8() != 0, min: e2.u32(), max: e2.u32(), selects: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u32(), release_param: e2.u8() })) };
    case 21:
      return { type: t, player: e2.u8(), cards: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u32(), sequence: e2.u32() })) };
    case 22:
      return { type: t, player: e2.u8(), counter_type: e2.u16(), count: e2.u16(), cards: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u8(), count: e2.u16() })) };
    case 23:
      return { type: t, player: e2.u8(), select_max: e2.u8(), amount: e2.u32(), min: e2.u32(), max: e2.u32(), selects_must: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), ...p(e2), amount: e2.u32() })), selects: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), ...p(e2), amount: e2.u32() })) };
    case 24:
      return { type: t, player: e2.u8(), count: e2.u8(), field_mask: e2.u32() };
    case 25:
      return { type: t, player: e2.u8(), cards: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u32(), sequence: e2.u32() })) };
    case 26:
      return { type: t, player: e2.u8(), can_finish: e2.u8() != 0, can_cancel: e2.u8() != 0, min: e2.u32(), max: e2.u32(), select_cards: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), ...p(e2) })), unselect_cards: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), ...p(e2) })) };
    case 30:
      return { type: t, player: e2.u8(), cards: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u32() })) };
    case 31:
      return { type: t, player: e2.u8(), cards: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u32() })) };
    case 32:
      return { type: t, player: e2.u8() };
    case 33:
      return { type: t, player: e2.u8(), cards: Array.from({ length: e2.u32() }, () => e2.u32()) };
    case 34:
      return { type: t };
    case 35:
      let o;
      return { type: t, player: e2.u8(), deck_size: o = e2.u32(), returned_to_extra: (() => {
        let s = [], r = e2.bytes(e2.u32());
        for (let O = 0; O < o; O++) r[Math.floor(O / 8)] & 1 << O % 8 && s.push(O);
        return s;
      })() };
    case 36:
      return { type: t, location: e2.u8(), cards: Array.from({ length: e2.u32() }, () => ({ from: p(e2), to: p(e2) })) };
    case 37:
      return { type: t };
    case 38:
      return { type: t, player: e2.u8(), count: e2.u32(), code: e2.u32(), position: e2.u32() };
    case 39:
      return { type: t, player: e2.u8(), cards: Array.from({ length: e2.u32() }, () => e2.u32()) };
    case 40:
      return { type: t, player: e2.u8() };
    case 41:
      return { type: t, phase: e2.u16() };
    case 42:
      return { type: t, player: e2.u8(), cards: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u32() })) };
    case 50:
      return { type: t, card: e2.u32(), from: p(e2), to: p(e2) };
    case 53:
      return { type: t, code: e2.u32(), controller: e2.u8(), location: e2.u8(), sequence: e2.u8(), prev_position: e2.u8(), position: e2.u8() };
    case 54:
      return { type: t, code: e2.u32(), ...p(e2) };
    case 55:
      return { type: t, card1: { code: e2.u32(), ...p(e2) }, card2: { code: e2.u32(), ...p(e2) } };
    case 56:
      return { type: t, field_mask: e2.u32() };
    case 60:
      return { type: t, code: e2.u32(), ...p(e2) };
    case 61:
      return { type: t };
    case 62:
      return { type: t, code: e2.u32(), ...p(e2) };
    case 63:
      return { type: t };
    case 64:
      return { type: t, code: e2.u32(), ...p(e2) };
    case 65:
      return { type: t };
    case 70:
      return { type: t, code: e2.u32(), ...p(e2), triggering_controller: e2.u8(), triggering_location: e2.u8(), triggering_sequence: e2.u32(), description: e2.u64(), chain_size: e2.u32() };
    case 71:
      return { type: t, chain_size: e2.u8() };
    case 72:
      return { type: t, chain_size: e2.u8() };
    case 73:
      return { type: t, chain_size: e2.u8() };
    case 74:
      return { type: t };
    case 75:
      return { type: t, chain_size: e2.u8() };
    case 76:
      return { type: t, chain_size: e2.u8() };
    case 80:
      return { type: t, cards: Array.from({ length: e2.u32() }, () => p(e2)) };
    case 81:
      return { type: t, player: e2.u8(), cards: Array.from({ length: e2.u32() }, () => p(e2)) };
    case 83:
      return { type: t, cards: Array.from({ length: e2.u32() }, () => p(e2)) };
    case 90:
      return { type: t, player: e2.u8(), drawn: Array.from({ length: e2.u32() }, () => ({ code: e2.u32(), position: e2.u32() })) };
    case 91:
      return { type: t, player: e2.u8(), amount: e2.u32() };
    case 92:
      return { type: t, player: e2.u8(), amount: e2.u32() };
    case 93:
      return { type: t, card: p(e2), target: p(e2) };
    case 94:
      return { type: t, player: e2.u8(), lp: e2.u32() };
    case 96:
      return { type: t, card: p(e2), target: p(e2) };
    case 97:
      return { type: t, card: p(e2), target: p(e2) };
    case 100:
      return { type: t, player: e2.u8(), amount: e2.u32() };
    case 101:
      return { type: t, counter_type: e2.u16(), controller: e2.u8(), location: e2.u8(), sequence: e2.u8(), count: e2.u16() };
    case 102:
      return { type: t, counter_type: e2.u16(), controller: e2.u8(), location: e2.u8(), sequence: e2.u8(), count: e2.u16() };
    case 110:
      return { type: t, card: p(e2), target: (() => {
        let s = p(e2);
        return G(s) ? null : s;
      })() };
    case 111:
      return { type: t, card: { ...p(e2), attack: e2.u32(), defense: e2.u32(), destroyed: e2.u8() != 0 }, target: { ...p(e2), attack: e2.u32(), defense: e2.u32(), destroyed: e2.u8() != 0 } };
    case 112:
      return { type: t };
    case 113:
      return { type: t };
    case 114:
      return { type: t };
    case 120:
      return { type: t, ...p(e2), code: e2.u32() };
    case 121:
      return { type: t };
    case 122:
      return { type: t };
    case 123:
      return { type: t };
    case 130:
      return { type: t, player: e2.u8(), results: Array.from({ length: e2.u8() }, () => e2.u8() != 0) };
    case 131:
      return { type: t, player: e2.u8(), results: Array.from({ length: e2.u8() }, () => e2.u8()) };
    case 132:
      return { type: t, player: e2.u8() };
    case 133:
      return { type: t, results: (() => {
        let s = e2.u8();
        return [s & 3, s >> 2 & 3];
      })() };
    case 140:
      return { type: t, player: e2.u8(), count: e2.u8(), available: e2.u64() };
    case 141:
      return { type: t, player: e2.u8(), count: e2.u8(), available: e2.u8() };
    case 142:
      return { type: t, player: e2.u8(), opcodes: Array.from({ length: e2.u8() }, () => e2.u64()) };
    case 143:
      return { type: t, player: e2.u8(), options: Array.from({ length: e2.u8() }, () => e2.u64()) };
    case 160:
      return { type: t, ...p(e2), card_hint: e2.u8(), description: e2.u64() };
    case 161: {
      let s = e2.u8(), r = e2.u32(), O = e2.u32(), c = e2.u32(), a = e2.u32(), E = e2.u32();
      return { type: t, player: s, deck_size: r, extra_faceup_count: c, deck_top_card: E == 0 ? null : E, hand: Array.from({ length: a }, () => ({ code: e2.u32(), position: e2.u32() })), extra: Array.from({ length: O }, () => ({ code: e2.u32(), position: e2.u32() })) };
    }
    case 162:
      return { type: t, ...v(e2) };
    case 163:
      return { type: t, name: (() => {
        let s = e2.bytes(e2.u16());
        return new TextDecoder().decode(s);
      })() };
    case 164:
      return { type: t, hint: (() => {
        let s = e2.bytes(e2.u16());
        return new TextDecoder().decode(s);
      })() };
    case 165:
      return { type: t, player: e2.u8(), player_hint: e2.u8(), description: e2.u64() };
    case 170:
      return { type: t, card: e2.u32() };
    case 180:
      return { type: t };
    case 190:
      return { type: t, cards: Array.from({ length: e2.u32() }, () => p(e2)) };
    default:
      return null;
  }
}
var Z = ((_) => (_[_.SELECT_BATTLECMD = 0] = "SELECT_BATTLECMD", _[_.SELECT_IDLECMD = 1] = "SELECT_IDLECMD", _[_.SELECT_EFFECTYN = 2] = "SELECT_EFFECTYN", _[_.SELECT_YESNO = 3] = "SELECT_YESNO", _[_.SELECT_OPTION = 4] = "SELECT_OPTION", _[_.SELECT_CARD = 5] = "SELECT_CARD", _[_.SELECT_CARD_CODES = 6] = "SELECT_CARD_CODES", _[_.SELECT_UNSELECT_CARD = 7] = "SELECT_UNSELECT_CARD", _[_.SELECT_CHAIN = 8] = "SELECT_CHAIN", _[_.SELECT_DISFIELD = 9] = "SELECT_DISFIELD", _[_.SELECT_PLACE = 10] = "SELECT_PLACE", _[_.SELECT_POSITION = 11] = "SELECT_POSITION", _[_.SELECT_TRIBUTE = 12] = "SELECT_TRIBUTE", _[_.SELECT_COUNTER = 13] = "SELECT_COUNTER", _[_.SELECT_SUM = 14] = "SELECT_SUM", _[_.SORT_CARD = 15] = "SORT_CARD", _[_.ANNOUNCE_RACE = 16] = "ANNOUNCE_RACE", _[_.ANNOUNCE_ATTRIB = 17] = "ANNOUNCE_ATTRIB", _[_.ANNOUNCE_CARD = 18] = "ANNOUNCE_CARD", _[_.ANNOUNCE_NUMBER = 19] = "ANNOUNCE_NUMBER", _[_.ROCK_PAPER_SCISSORS = 20] = "ROCK_PAPER_SCISSORS", _))(Z || {});
var ne = ((r) => (r[r.SELECT_CHAIN = 0] = "SELECT_CHAIN", r[r.SELECT_BATTLE = 1] = "SELECT_BATTLE", r[r.TO_M2 = 2] = "TO_M2", r[r.TO_EP = 3] = "TO_EP", r))(ne || {});
var oe = ((i2) => (i2[i2.SELECT_SUMMON = 0] = "SELECT_SUMMON", i2[i2.SELECT_SPECIAL_SUMMON = 1] = "SELECT_SPECIAL_SUMMON", i2[i2.SELECT_POS_CHANGE = 2] = "SELECT_POS_CHANGE", i2[i2.SELECT_MONSTER_SET = 3] = "SELECT_MONSTER_SET", i2[i2.SELECT_SPELL_SET = 4] = "SELECT_SPELL_SET", i2[i2.SELECT_ACTIVATE = 5] = "SELECT_ACTIVATE", i2[i2.TO_BP = 6] = "TO_BP", i2[i2.TO_EP = 7] = "TO_EP", i2[i2.SHUFFLE = 8] = "SHUFFLE", i2))(oe || {});
function ce(e2) {
  let t = new H();
  switch (e2.type) {
    case 0:
      t.i32(e2.action | (e2.index ?? 0) << 16);
      break;
    case 1:
      t.i32(e2.action | (e2.index ?? 0) << 16);
      break;
    case 2:
      t.i32(e2.yes ? 1 : 0);
      break;
    case 3:
      t.i32(e2.yes ? 1 : 0);
      break;
    case 4:
      t.i32(e2.index);
      break;
    case 5:
    case 12:
    case 14:
      if (e2.indicies) {
        t.i32(0), t.i32(e2.indicies.length);
        for (let r of e2.indicies) t.i32(r);
      } else t.i32(-1);
      break;
    case 6:
      if (e2.codes) {
        t.i32(0), t.i32(e2.codes.length);
        for (let r of e2.codes) t.i32(r);
      } else t.i32(-1);
      break;
    case 7:
      e2.index === null ? t.i32(-1) : (t.i32(1), t.i32(e2.index));
      break;
    case 9:
    case 10:
      for (let r of e2.places) t.i8(r.player), t.i8(r.location), t.i8(r.sequence);
      break;
    case 8:
      e2.index === null ? t.i32(-1) : t.i32(e2.index);
      break;
    case 11:
      t.i32(e2.position);
      break;
    case 13:
      for (let r of e2.counters) t.i16(r);
      break;
    case 15:
      if (!e2.order) {
        t.i8(-1);
        break;
      }
      t.i8(e2.order.length);
      for (let r of e2.order) t.i8(r);
      break;
    case 16:
      let o = 0n;
      for (let r of e2.races) o |= r;
      t.u64(o);
      break;
    case 17:
      let s = 0;
      for (let r of e2.attributes) s |= r;
      t.u32(s);
      break;
    case 18:
      t.i32(e2.card);
      break;
    case 19:
      t.i32(e2.value);
      break;
    case 20:
      t.i32(e2.value);
      break;
  }
  return t.buffer.subarray(0, t.off);
}
var D = /* @__PURE__ */ Symbol("duel-handle");
function N(e2) {
  return new Map(e2);
}
var mt = N([[0, "normal"], [1, "resolve"], [2, "reset"]]);
var Dt = N([[1, "turn"], [2, "card"], [3, "race"], [4, "attribute"], [5, "number"], [6, "desc_add"], [7, "desc_remove"]]);
var Lt = N([[6, "desc_add"], [7, "desc_remove"]]);
var It = N([[1, "retry"], [2, "hint"], [3, "waiting"], [4, "start"], [5, "win"], [6, "update_data"], [7, "update_card"], [8, "request_deck"], [10, "select_battlecmd"], [11, "select_idlecmd"], [12, "select_effectyn"], [13, "select_yesno"], [14, "select_option"], [15, "select_card"], [16, "select_chain"], [18, "select_place"], [19, "select_position"], [20, "select_tribute"], [21, "sort_chain"], [22, "select_counter"], [23, "select_sum"], [24, "select_disfield"], [25, "sort_card"], [26, "select_unselect_card"], [30, "confirm_decktop"], [31, "confirm_cards"], [32, "shuffle_deck"], [33, "shuffle_hand"], [34, "refresh_deck"], [35, "swap_grave_deck"], [36, "shuffle_set_card"], [37, "reverse_deck"], [38, "deck_top"], [39, "shuffle_extra"], [40, "new_turn"], [41, "new_phase"], [42, "confirm_extratop"], [50, "move"], [53, "pos_change"], [54, "set"], [55, "swap"], [56, "field_disabled"], [60, "summoning"], [61, "summoned"], [62, "spsummoning"], [63, "spsummoned"], [64, "flipsummoning"], [65, "flipsummoned"], [70, "chaining"], [71, "chained"], [72, "chain_solving"], [73, "chain_solved"], [74, "chain_end"], [75, "chain_negated"], [76, "chain_disabled"], [80, "card_selected"], [81, "random_selected"], [83, "become_target"], [90, "draw"], [91, "damage"], [92, "recover"], [93, "equip"], [94, "lpupdate"], [96, "card_target"], [97, "cancel_target"], [100, "pay_lpcost"], [101, "add_counter"], [102, "remove_counter"], [110, "attack"], [111, "battle"], [112, "attack_disabled"], [113, "damage_step_start"], [114, "damage_step_end"], [120, "missed_effect"], [121, "be_chain_target"], [122, "create_relation"], [123, "release_relation"], [130, "toss_coin"], [131, "toss_dice"], [132, "rock_paper_scissors"], [133, "hand_res"], [140, "announce_race"], [141, "announce_attrib"], [142, "announce_card"], [143, "announce_number"], [160, "card_hint"], [161, "tag_swap"], [162, "reload_field"], [163, "ai_name"], [164, "show_hint"], [165, "player_hint"], [170, "match_kill"], [180, "custom_msg"], [190, "remove_cards"]]);
var dt = N([[0, "select_battlecmd"], [1, "select_idlecmd"], [2, "select_effectyn"], [3, "select_yesno"], [4, "select_option"], [5, "select_card"], [6, "select_card_codes"], [7, "select_unselect_card"], [8, "select_chain"], [9, "select_disfield"], [10, "select_place"], [11, "select_position"], [12, "select_tribute"], [13, "select_counter"], [14, "select_sum"], [15, "sort_card"], [16, "announce_race"], [17, "announce_attrib"], [18, "announce_card"], [19, "announce_number"], [20, "rock_paper_scissors"]]);
var yt = N([[0, "select_chain"], [1, "select_battle"], [2, "to_m2"], [3, "to_ep"]]);
var bt = N([[0, "select_summon"], [1, "select_special_summon"], [2, "select_pos_change"], [3, "select_monster_set"], [4, "select_spell_set"], [5, "select_activate"], [6, "to_bp"], [7, "to_ep"], [8, "shuffle"]]);
var Pt = N([[u.CODE, "code"], [u.POSITION, "position"], [u.ALIAS, "alias"], [u.TYPE, "type"], [u.LEVEL, "level"], [u.RANK, "rank"], [u.ATTRIBUTE, "attribute"], [u.RACE, "race"], [u.ATTACK, "attack"], [u.DEFENSE, "defense"], [u.BASE_ATTACK, "base_attack"], [u.BASE_DEFENSE, "base_defense"], [u.REASON, "reason"], [u.REASON_CARD, "reason_card"], [u.EQUIP_CARD, "equip_card"], [u.TARGET_CARD, "target_card"], [u.OVERLAY_CARD, "overlay_card"], [u.COUNTERS, "counters"], [u.OWNER, "owner"], [u.STATUS, "status"], [u.IS_PUBLIC, "is_public"], [u.LSCALE, "lscale"], [u.RSCALE, "rscale"], [u.LINK, "link"], [u.IS_HIDDEN, "is_hidden"], [u.COVER, "cover"]]);
var xt = N([[b.OCG, "ocg"], [b.TCG, "tcg"], [b.ANIME, "anime"], [b.ILLEGAL, "illegal"], [b.VIDEO_GAME, "video_game"], [b.CUSTOM, "custom"], [b.SPEED, "speed"], [b.PRERELEASE, "prerelease"], [b.RUSH, "rush"], [b.LEGEND, "legend"], [b.HIDDEN, "hidden"]]);
var Mt = N([[w.END, "end"], [w.WAITING, "waiting"], [w.CONTINUE, "continue"]]);
var ht = N([[I.FACEUP_ATTACK, "faceup_attack"], [I.FACEDOWN_ATTACK, "facedown_attack"], [I.FACEUP_DEFENSE, "faceup_defense"], [I.FACEDOWN_DEFENSE, "facedown_defense"], [I.FACEUP, "faceup"], [I.FACEDOWN, "facedown"], [I.ATTACK, "attack"], [I.DEFENSE, "defense"]]);
var Ut = N([[L.DECK, "deck"], [L.HAND, "hand"], [L.MZONE, "mzone"], [L.SZONE, "szone"], [L.GRAVE, "grave"], [L.REMOVED, "removed"], [L.EXTRA, "extra"], [L.OVERLAY, "overlay"], [L.FZONE, "fzone"], [L.PZONE, "pzone"], [L.ONFIELD, "onfield"], [L.ALL, "all"]]);
var Ft = N([[C.MONSTER, "monster"], [C.SPELL, "spell"], [C.TRAP, "trap"], [C.NORMAL, "normal"], [C.EFFECT, "effect"], [C.FUSION, "fusion"], [C.RITUAL, "ritual"], [C.TRAPMONSTER, "trapmonster"], [C.SPIRIT, "spirit"], [C.UNION, "union"], [C.GEMINI, "gemini"], [C.TUNER, "tuner"], [C.SYNCHRO, "synchro"], [C.TOKEN, "token"], [C.MAXIMUM, "maximum"], [C.QUICKPLAY, "quickplay"], [C.CONTINUOUS, "continuous"], [C.EQUIP, "equip"], [C.FIELD, "field"], [C.COUNTER, "counter"], [C.FLIP, "flip"], [C.TOON, "toon"], [C.XYZ, "xyz"], [C.PENDULUM, "pendulum"], [C.SPSUMMON, "spsummon"], [C.LINK, "link"]]);
var Ht = N([[U.EARTH, "earth"], [U.WATER, "water"], [U.FIRE, "fire"], [U.WIND, "wind"], [U.LIGHT, "light"], [U.DARK, "dark"], [U.DIVINE, "divine"]]);
var kt = N([[A.WARRIOR, "warrior"], [A.SPELLCASTER, "spellcaster"], [A.FAIRY, "fairy"], [A.FIEND, "fiend"], [A.ZOMBIE, "zombie"], [A.MACHINE, "machine"], [A.AQUA, "aqua"], [A.PYRO, "pyro"], [A.ROCK, "rock"], [A.WINGEDBEAST, "winged_beast"], [A.PLANT, "plant"], [A.INSECT, "insect"], [A.THUNDER, "thunder"], [A.DRAGON, "dragon"], [A.BEAST, "beast"], [A.BEASTWARRIOR, "beast_warrior"], [A.DINOSAUR, "dinosaur"], [A.FISH, "fish"], [A.SEASERPENT, "sea_serpent"], [A.REPTILE, "reptile"], [A.PSYCHIC, "psychic"], [A.DIVINE, "divine"], [A.CREATORGOD, "creator_god"], [A.WYRM, "wyrm"], [A.CYBERSE, "cyberse"], [A.ILLUSION, "illusion"], [A.CYBORG, "cyborg"], [A.MAGICALKNIGHT, "magical_knight"], [A.HIGHDRAGON, "high_dragon"], [A.OMEGAPSYCHIC, "omega_psychic"], [A.CELESTIALWARRIOR, "celestial_warrior"], [A.GALAXY, "galaxy"]]);
var Bt = N([[M.BOTTOM_LEFT, "bottom_left"], [M.BOTTOM, "bottom"], [M.BOTTOM_RIGHT, "bottom_right"], [M.LEFT, "left"], [M.RIGHT, "right"], [M.TOP_LEFT, "top_left"], [M.TOP, "top"], [M.TOP_RIGHT, "top_right"]]);
var Gt = N([[K.SCISSORS, "scissors"], [K.ROCK, "rock"], [K.PAPER, "paper"]]);
var wt = N([[S.TEST_MODE, "test_mode"], [S.ATTACK_FIRST_TURN, "attack_first_turn"], [S.USE_TRAPS_IN_NEW_CHAIN, "use_traps_in_new_chain"], [S.SIX_STEP_BATLLE_STEP, "six_step_batlle_step"], [S.PSEUDO_SHUFFLE, "pseudo_shuffle"], [S.TRIGGER_WHEN_PRIVATE_KNOWLEDGE, "trigger_when_private_knowledge"], [S.SIMPLE_AI, "simple_ai"], [S.RELAY, "relay"], [S.OBSOLETE_IGNITION, "obsolete_ignition"], [S.FIRST_TURN_DRAW, "first_turn_draw"], [S.ONE_FACEUP_FIELD, "one_faceup_field"], [S.PZONE, "pzone"], [S.SEPARATE_PZONE, "separate_pzone"], [S.EMZONE, "emzone"], [S.FSX_MMZONE, "fsx_mmzone"], [S.TRAP_MONSTERS_NOT_USE_ZONE, "trap_monsters_not_use_zone"], [S.RETURN_TO_DECK_TRIGGERS, "return_to_extra_deck_triggers"], [S.TRIGGER_ONLY_IN_LOCATION, "trigger_only_in_location"], [S.SPSUMMON_ONCE_OLD_NEGATE, "spsummon_once_old_negate"], [S.CANNOT_SUMMON_OATH_OLD, "cannot_summon_oath_old"], [S.NO_STANDBY_PHASE, "no_standby_phase"], [S.NO_MAIN_PHASE_2, "no_main_phase_2"], [S.THREE_COLUMNS_FIELD, "three_columns_field"], [S.DRAW_UNTIL_5, "draw_until_5"], [S.NO_HAND_LIMIT, "no_hand_limit"], [S.UNLIMITED_SUMMONS, "unlimited_summons"], [S.INVERTED_QUICK_PRIORITY, "inverted_quick_priority"], [S.EQUIP_NOT_SENT_IF_MISSING_TARGET, "equip_not_sent_if_missing_target"], [S.ZERO_ATK_DESTROYED, "zero_atk_destroyed"], [S.STORE_ATTACK_REPLAYS, "store_attack_replays"], [S.SINGLE_CHAIN_IN_DAMAGE_SUBSTEP, "single_chain_in_damage_substep"], [S.CAN_REPOS_IF_NON_SUMPLAYER, "can_repos_if_non_sumplayer"], [S.TCG_SEGOC_NONPUBLIC, "tcg_segoc_nonpublic"], [S.TCG_SEGOC_FIRSTTRIGGER, "tcg_segoc_firsttrigger"], [S.MODE_SPEED, "mode_speed"], [S.MODE_RUSH, "mode_rush"], [S.MODE_GOAT, "mode_goat"], [S.MODE_MR2, "mode_mr2"], [S.MODE_MR3, "mode_mr3"], [S.MODE_MR4, "mode_mr4"], [S.MODE_MR5, "mode_mr5"]]);
var Kt = N([[B.ERROR, "error"], [B.FROM_SCRIPT, "from_script"], [B.FOR_DEBUG, "for_debug"], [B.UNDEFINED, "undefined"]]);
var vt = N([[x2.DRAW, "draw"], [x2.STANDBY, "standby"], [x2.MAIN1, "main1"], [x2.BATTLE_START, "battle_start"], [x2.BATTLE_STEP, "battle_step"], [x2.DAMAGE, "damage"], [x2.DAMAGE_CAL, "damage_cal"], [x2.BATTLE, "battle"], [x2.MAIN2, "main2"], [x2.END, "end"]]);
var Vt = N([[P.EVENT, "event"], [P.MESSAGE, "message"], [P.SELECTMSG, "selectmsg"], [P.OPSELECTED, "opselected"], [P.EFFECT, "effect"], [P.RACE, "race"], [P.ATTRIB, "attrib"], [P.CODE, "code"], [P.NUMBER, "number"], [P.CARD, "card"], [P.ZONE, "zone"]]);
var Wt = N([[f.DRAW_PHASE, "draw_phase"], [f.STANDBY_PHASE, "standby_phase"], [f.MAIN_END, "main_end"], [f.BATTLE_START, "battle_start"], [f.BATTLE_END, "battle_end"], [f.END_PHASE, "end_phase"], [f.SUMMON, "summon"], [f.SPSUMMON, "spsummon"], [f.FLIPSUMMON, "flipsummon"], [f.MSET, "mset"], [f.SSET, "sset"], [f.POS_CHANGE, "pos_change"], [f.ATTACK, "attack"], [f.DAMAGE_STEP, "damage_step"], [f.DAMAGE_CAL, "damage_cal"], [f.CHAIN_END, "chain_end"], [f.DRAW, "draw"], [f.DAMAGE, "damage"], [f.RECOVER, "recover"], [f.DESTROY, "destroy"], [f.REMOVE, "remove"], [f.TOHAND, "tohand"], [f.TODECK, "todeck"], [f.TOGRAVE, "tograve"], [f.BATTLE_PHASE, "battle_phase"], [f.EQUIP, "equip"], [f.BATTLE_STEP_END, "battle_step_end"], [f.BATTLED, "battled"]]);
var l = { ADD: 0x4000000000000000n, SUB: 0x4000000100000000n, MUL: 0x4000000200000000n, DIV: 0x4000000300000000n, AND: 0x4000000400000000n, OR: 0x4000000500000000n, NEG: 0x4000000600000000n, NOT: 0x4000000700000000n, BAND: 0x4000000800000000n, BOR: 0x4000000900000000n, BNOT: 0x4000001000000000n, BXOR: 0x4000001100000000n, LSHIFT: 0x4000001200000000n, RSHIFT: 0x4000001300000000n, ALLOW_ALIASES: 0x4000001400000000n, ALLOW_TOKENS: 0x4000001500000000n, ISCODE: 0x4000010000000000n, ISSETCARD: 0x4000010100000000n, ISTYPE: 0x4000010200000000n, ISRACE: 0x4000010300000000n, ISATTRIBUTE: 0x4000010400000000n, GETCODE: 0x4000010500000000n, GETSETCARD: 0x4000010600000000n, GETTYPE: 0x4000010700000000n, GETRACE: 0x4000010800000000n, GETATTRIBUTE: 0x4000010900000000n };
var nn = N([[l.ADD, "add"], [l.SUB, "sub"], [l.MUL, "mul"], [l.DIV, "div"], [l.AND, "and"], [l.OR, "or"], [l.NEG, "neg"], [l.NOT, "not"], [l.BAND, "band"], [l.BOR, "bor"], [l.BNOT, "bnot"], [l.BXOR, "bxor"], [l.LSHIFT, "lshift"], [l.RSHIFT, "rshift"], [l.ALLOW_ALIASES, "allow_aliases"], [l.ALLOW_TOKENS, "allow_tokens"], [l.ISCODE, "iscode"], [l.ISSETCARD, "issetcard"], [l.ISTYPE, "istype"], [l.ISRACE, "israce"], [l.ISATTRIBUTE, "isattribute"], [l.GETCODE, "getcode"], [l.GETSETCARD, "getsetcard"], [l.GETTYPE, "gettype"], [l.GETRACE, "getrace"], [l.GETATTRIBUTE, "getattribute"]]);
async function Ce(e2) {
  return e2?.sync ?? false ? await Te(e2 ?? {}) : await Re(e2 ?? {});
}
function se(e2, t) {
  let o = new Uint16Array([...t, 0]), s = e2._malloc(o.byteLength);
  return fe(V(e2.HEAP8), o, s), s;
}
async function Te({ ...e2 }) {
  let t = !e2.wasmBinary && !e2.locateFile, [o, s] = await Promise.all([De(), t ? Le() : e2.wasmBinary]);
  s && (e2.wasmBinary = s);
  let r = 0, O = /* @__PURE__ */ new Map(), c, a = (E, i2) => V(c.HEAP8, E, i2);
  return c = await o({ ...re(O), ...e2, handleDataReader(E, i2, T) {
    let { cardReader: R } = O.get(E), m = R(i2), d = m?.setcodes.length ? se(c, m.setcodes) : 0;
    W(a(T), { ptrSize: 4, ...m, setcodes: d });
  }, handleScriptReader(E, i2, T) {
    let { scriptReader: R } = O.get(E);
    return R(T);
  } }), { ...ae(c), createDuel(E) {
    let i2 = ++r;
    O.set(i2, { cardReader: E.cardReader, errorHandler: E.errorHandler, scriptReader: E.scriptReader });
    let T = c.stackSave(), R = c.stackAlloc(4), m = c.stackAlloc(104);
    if (Y(a(m), { ...E, ptrSize: 4, cardReader: 0, cardReaderPayload: i2, cardReaderDone: 0, cardReaderDonePayload: 0, errorHandler: 0, errorHandlerPayload: i2, scriptReader: 0, scriptReaderPayload: i2, enableUnsafeLibraries: true }), c._ocgapiCreateDuel(R, m) != 0) return null;
    let h = c.getValue(R, "i32");
    return c.stackRestore(T), { [D]: h };
  }, duelNewCard({ [D]: E }, i2) {
    let T = c.stackSave(), R = c.stackAlloc(24);
    q(a(R), i2), c._ocgapiDuelNewCard(E, R), c.stackRestore(T);
  }, startDuel({ [D]: E }) {
    c._ocgapiStartDuel(E);
  }, duelProcess({ [D]: E }) {
    return c._ocgapiDuelProcess(E);
  }, loadScript({ [D]: E }, i2, T) {
    let R = c.stackSave(), m = c.lengthBytesUTF8(T), d = c._malloc(m + 1);
    c.stringToUTF8(T, d, m + 1);
    let h = c.lengthBytesUTF8(i2), k = c.stackAlloc(h + 1);
    c.stringToUTF8(i2, k, h + 1);
    try {
      return c._ocgapiLoadScript(E, d, m, k) == 1;
    } finally {
      c._free(d), c.stackRestore(R);
    }
  } };
}
async function Re({ ...e2 }) {
  if (!("Suspending" in WebAssembly)) throw new Error("jspi not supported");
  let t = !e2.wasmBinary && !e2.locateFile, [o, s] = await Promise.all([Ne(), t ? me() : e2.wasmBinary]);
  s && (e2.wasmBinary = s);
  let r = 0, O = /* @__PURE__ */ new Map(), c, a = (E, i2) => V(c.HEAP8, E, i2);
  return c = await o({ ...re(O), ...e2, async handleDataReader(E, i2, T) {
    let { cardReader: R } = O.get(E), m = await R(i2), d = m?.setcodes.length ? se(c, m.setcodes) : 0;
    W(a(T), { ...m, ptrSize: 4, setcodes: d });
  }, async handleScriptReader(E, i2, T) {
    let { scriptReader: R } = O.get(E);
    return await R(T);
  } }), { ...ae(c), async createDuel(E) {
    let i2 = ++r;
    O.set(i2, { cardReader: E.cardReader, errorHandler: E.errorHandler, scriptReader: E.scriptReader });
    let T = c.stackSave(), R = c.stackAlloc(4), m = c.stackAlloc(104);
    Y(a(m), { ...E, ptrSize: 4, cardReader: 0, cardReaderPayload: i2, cardReaderDone: 0, cardReaderDonePayload: 0, errorHandler: 0, errorHandlerPayload: i2, scriptReader: 0, scriptReaderPayload: i2, enableUnsafeLibraries: true });
    try {
      if (await c._ocgapiCreateDuel(R, m) != 0) return null;
      let h = c.getValue(R, "i32");
      return { [D]: h };
    } finally {
      c.stackRestore(T);
    }
  }, async duelNewCard({ [D]: E }, i2) {
    let T = c.stackSave(), R = c.stackAlloc(24);
    q(a(R), i2);
    try {
      await c._ocgapiDuelNewCard(E, R);
    } finally {
      c.stackRestore(T);
    }
  }, async startDuel({ [D]: E }) {
    await c._ocgapiStartDuel(E);
  }, async duelProcess({ [D]: E }) {
    return await c._ocgapiDuelProcess(E);
  }, async loadScript({ [D]: E }, i2, T) {
    let R = c.stackSave(), m = c.lengthBytesUTF8(T), d = c._malloc(m + 1);
    c.stringToUTF8(T, d, m + 1);
    let h = c.lengthBytesUTF8(i2), k = c.stackAlloc(h + 1);
    c.stringToUTF8(i2, k, h + 1);
    try {
      return await c._ocgapiLoadScript(E, d, m, k) == 1;
    } finally {
      c._free(d), c.stackRestore(R);
    }
  } };
}
function re(e2) {
  return { print(t) {
    console.log(t);
  }, printErr(t) {
    console.error(t);
  }, handleLogHandler(t, o, s) {
    let { errorHandler: r } = e2.get(t);
    r?.(s, o);
  } };
}
function ae(e2) {
  let t = (o, s) => V(e2.HEAP8, o, s);
  return { getVersion() {
    let o = e2.stackSave(), s = e2.stackAlloc(4), r = e2.stackAlloc(4), O = e2.getValue(s, "i32");
    try {
      return e2._ocgapiGetVersion(s, r), [e2.getValue(s, "i32"), e2.getValue(r, "i32")];
    } finally {
      e2.stackRestore(o);
    }
  }, destroyDuel({ [D]: o }) {
    e2._ocgapiDestroyDuel(o);
  }, duelGetMessage({ [D]: o }) {
    let s = e2.stackSave(), r = e2.stackAlloc(4), O = e2._ocgapiDuelGetMessage(o, r), c = e2.getValue(r, "i32");
    e2.stackRestore(s);
    let a = new F(new DataView(e2.HEAP8.buffer, O, c)), E = [];
    for (; a.avail > 0; ) {
      let i2 = a.i32(), T = a.sub(i2), R = te(T);
      if (!R) {
        T.reset(), console.warn(`failed to parse a message: ${T.u8()}`);
        continue;
      }
      E.push(R);
    }
    return E;
  }, duelSetResponse({ [D]: o }, s) {
    let r = ce(s), O = e2.stackSave(), c = e2.stackAlloc(r.length);
    e2.HEAPU8.set(r, c);
    try {
      e2._ocgapiDuelSetResponse(o, c, r.length);
    } finally {
      e2.stackRestore(O);
    }
  }, duelQueryCount({ [D]: o }, s, r) {
    return e2._ocgapiDuelQueryCount(o, s, r);
  }, duelQuery({ [D]: o }, s) {
    let r = new H(24, true);
    r.u32(s.flags), r.u8(s.controller), r.u32(s.location), r.u32(s.sequence), r.u32(s.overlaySequence ?? 0);
    let O = e2.stackSave();
    try {
      let c = r.get(4), a = e2.stackAlloc(c.byteLength);
      e2.HEAP8.set(c, a);
      let E = e2.stackAlloc(4), i2 = e2._ocgapiDuelQuery(o, E, a), T = e2.getValue(E, "i32"), R = new F(t(i2, T));
      return Q(R);
    } finally {
      e2.stackRestore(O);
    }
  }, duelQueryLocation({ [D]: o }, s) {
    let r = new H(24, true);
    r.u32(s.flags), r.u8(s.controller), r.u32(s.location), r.u32(0), r.u32(0);
    let O = e2.stackSave();
    try {
      let c = r.get(4), a = e2.stackAlloc(c.byteLength);
      e2.HEAP8.set(c, a);
      let E = e2.stackAlloc(4), i2 = e2._ocgapiDuelQueryLocation(o, E, a), T = e2.getValue(E, "i32"), R = new F(t(i2, T));
      return j(R);
    } finally {
      e2.stackRestore(O);
    }
  }, duelQueryField({ [D]: o }) {
    let s = e2.stackSave();
    try {
      let r = e2.stackAlloc(4), O = e2._ocgapiDuelQueryField(o, r), c = e2.getValue(r, "i32"), a = new F(t(O, c));
      return v(a);
    } finally {
      e2.stackRestore(s);
    }
  } };
}
function V(e2, t = 0, o = -1) {
  return new DataView(e2.buffer, e2.byteOffset + t, o < 0 ? e2.length - t : o);
}
function fe(e2, t, o) {
  t instanceof Uint16Array ? t.forEach((s, r) => e2.setUint16(o + r * 2, s, true)) : t instanceof Uint32Array ? t.forEach((s, r) => e2.setUint32(o + r * 4, s, true)) : t instanceof BigUint64Array ? t.forEach((s, r) => e2.setBigUint64(o + r * 4, s, true)) : t instanceof Int16Array ? t.forEach((s, r) => e2.setInt16(o + r * 2, s, true)) : t instanceof Int32Array ? t.forEach((s, r) => e2.setInt32(o + r * 4, s, true)) : t instanceof BigInt64Array && t.forEach((s, r) => e2.setBigInt64(o + r * 4, s, true));
}
async function Ne() {
  return (await import("./ocgcore.jspi-ROQIC75H-IXITQNBQ.mjs")).default;
}
async function me() {
  return (await import("./ocgcore.jspi-KKT4KD4I-NW3TRPY5.mjs")).default.buffer;
}
async function De() {
  return (await import("./ocgcore.sync-MMMSWPBB-ORHC7O5I.mjs")).default;
}
async function Le() {
  return (await import("./ocgcore.sync-TYBCMZY7-5Y6V6VCF.mjs")).default.buffer;
}

// src/engine.ts
var OPPONENT_CARD = 89631139;
async function startEngine(data) {
  let memory = null;
  const instantiate = WebAssembly.instantiate;
  WebAssembly.instantiate = async (...args) => {
    const result = await instantiate.apply(WebAssembly, args);
    const instance = result.instance ?? result;
    memory = Object.values(instance.exports).find((value) => value instanceof WebAssembly.Memory) ?? null;
    return result;
  };
  let lib;
  try {
    lib = await Ce({ sync: true });
  } finally {
    WebAssembly.instantiate = instantiate;
  }
  if (!memory) throw new Error("\u6CA1\u62FF\u5230\u89C4\u5219\u5F15\u64CE\u7684\u5185\u5B58\uFF0C\u5B58\u6863\u529F\u80FD\u7528\u4E0D\u4E86");
  const heap = memory;
  const MARGIN = 1 << 20;
  let used = 0;
  const coverWrites = (memoryNow) => {
    const words = new Uint32Array(memoryNow.buffer, 0, memoryNow.length >> 2);
    let clean = used > 0;
    const near = Math.min(words.length, used + MARGIN >> 2);
    for (let index = used >> 2; index < near && clean; index++) if (words[index] !== 0) clean = false;
    for (let index = near; index < words.length && clean; index += 1024) if (words[index] !== 0) clean = false;
    if (clean) return;
    let top = words.length - 1;
    while (top > 0 && words[top] === 0) top--;
    used = Math.max(used, Math.min(memoryNow.length, (top + 1) * 4 + MARGIN));
  };
  const scripts = /* @__PURE__ */ new Map();
  const missingScripts = /* @__PURE__ */ new Set();
  const readScript = (name) => {
    if (!scripts.has(name)) {
      const file = scriptPath(name);
      if (!file) missingScripts.add(name);
      scripts.set(name, file ? readFileSync2(file, "utf8") : "");
    }
    return scripts.get(name);
  };
  const cardData = (code) => {
    const card = data.get(code);
    return card ? { ...card, race: BigInt(card.race) } : null;
  };
  return {
    newDuel(hand, main, extra) {
      const duel = lib.createDuel({
        flags: S.MODE_MR5,
        seed: [1n, 2n, 3n, 4n],
        team1: { drawCountPerTurn: 1, startingDrawCount: 0, startingLP: 8e3 },
        team2: { drawCountPerTurn: 1, startingDrawCount: 5, startingLP: 8e3 },
        cardReader: cardData,
        scriptReader: readScript,
        errorHandler: () => {
        }
      });
      if (!duel) throw new Error("\u89C4\u5219\u5F15\u64CE\u6CA1\u80FD\u5EFA\u7ACB\u5BF9\u5C40");
      for (const file of ["constant.lua", "utility.lua"]) lib.loadScript(duel, file, readScript(file));
      const add = (team, code, location) => lib.duelNewCard(duel, { team, duelist: 0, code, controller: team, location, sequence: 0, position: I.FACEDOWN_DEFENSE });
      hand.forEach((code) => add(0, code, L.HAND));
      main.forEach((code) => add(0, code, L.DECK));
      extra.forEach((code) => add(0, code, L.EXTRA));
      for (let i2 = 0; i2 < 40; i2++) add(1, OPPONENT_CARD, L.DECK);
      lib.startDuel(duel);
      return duel;
    },
    advance(duel, onMessage) {
      while (true) {
        const status = lib.duelProcess(duel);
        const messages = lib.duelGetMessage(duel).filter(Boolean);
        if (onMessage) messages.forEach(onMessage);
        if (status === w.END) return null;
        if (status === w.CONTINUE) continue;
        return messages[messages.length - 1] ?? null;
      }
    },
    respond: (duel, response) => lib.duelSetResponse(duel, response),
    cards: (duel, location) => lib.duelQueryLocation(duel, { controller: 0, location, flags: 3 }).filter(Boolean).filter((info) => info.code).map((info) => ({ code: info.code, position: info.position })),
    save: (into) => {
      const memoryNow = new Uint8Array(heap.buffer);
      coverWrites(memoryNow);
      if (!into || into.length !== used) return memoryNow.slice(0, used);
      into.set(memoryNow.subarray(0, used));
      return into;
    },
    load: (state2) => {
      const memoryNow = new Uint8Array(heap.buffer);
      memoryNow.set(state2);
      if (state2.length < used) memoryNow.fill(0, state2.length, used);
    },
    missingScripts
  };
}

// src/banlist.ts
import { existsSync as existsSync4 } from "node:fs";

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
  chunks.sort((a, b3) => Number(!a.includes("Fetch")) - Number(!b3.includes("Fetch")));
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
  const inEffect = changes.filter((change) => time(change) <= now).sort((a, b3) => time(b3) - time(a));
  const pending = changes.filter((change) => time(change) > now).sort((a, b3) => time(a) - time(b3));
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

// src/deck.ts
import { existsSync as existsSync5, readFileSync as readFileSync3 } from "node:fs";
import { basename } from "node:path";
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
  if (!text.includes("\n") && existsSync5(text)) {
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

// src/refs.ts
function parseKinds(words) {
  let match;
  if (words === "\u5361") return { kinds: [] };
  if (words === "\u9B54\u6CD5\xB7\u9677\u9631\u5361") return { kinds: ["\u9B54\u6CD5", "\u9677\u9631"] };
  if (match = words.match(/^(速攻|永续|场地|装备|仪式|通常)?魔法卡$/)) return { kinds: ["\u9B54\u6CD5"], subtype: match[1] };
  if (match = words.match(/^(永续|反击|通常)?陷阱卡$/)) return { kinds: ["\u9677\u9631"], subtype: match[1] };
  if (match = words.match(/^(融合|同调|超量|连接|仪式|灵摆|效果|通常)怪兽$/)) return { kinds: [match[1]] };
  if (/^调整(怪兽)?$/.test(words)) return { kinds: ["\u8C03\u6574"] };
  if (words === "\u602A\u517D") return { kinds: ["\u602A\u517D"] };
  return null;
}
function parseTarget(text) {
  let rest = text.trim();
  let level;
  const levelMatch = rest.match(/(\d+)星(以上|以下)?的?/);
  if (levelMatch) {
    const value = Number(levelMatch[1]);
    level = levelMatch[2] === "\u4EE5\u4E0A" ? [value, 99] : levelMatch[2] === "\u4EE5\u4E0B" ? [0, value] : [value, value];
    rest = rest.replace(levelMatch[0], "");
  }
  let mode = "archetype";
  let refs;
  const mentions = rest.match(/^有「([^」]+)」的卡名记述的(.*)$/);
  const contains = rest.match(/^名字带有((?:「[^」]+」(?:、|或)?)+)的(.*)$/);
  if (mentions) {
    mode = "mentions";
    refs = [mentions[1]];
    rest = mentions[2];
  } else if (contains) {
    mode = "nameContains";
    refs = [...contains[1].matchAll(/「([^」]+)」/g)].map((match) => match[1]);
    rest = contains[2];
  } else {
    const quoted = rest.match(/^((?:「[^」]+」、?)+)(.*)$/);
    if (!quoted) return null;
    refs = [...quoted[1].matchAll(/「([^」]+)」/g)].map((match) => match[1]);
    rest = quoted[2];
    if (rest === "") mode = "name";
  }
  if (rest === "") return { mode, refs, kinds: [], level };
  const kinds = parseKinds(rest);
  return kinds && { mode, refs, ...kinds, level };
}
var PLACEMENT = /(里侧|表侧)?(守备|攻击)表示$|(在|到)(自己|对方)?的?场上$|无视召唤条件$|在额外怪兽区域$/;
function parseObject(object) {
  let text = object.trim();
  while (PLACEMENT.test(text)) text = text.replace(PLACEMENT, "").trim();
  const excluded = [...text.matchAll(/「([^」]+)」以外的?/g)].map((match) => match[1]);
  text = text.replace(/「([^」]+)」以外的?/g, "").replace(/(最多)?\d+(只|张)(以内的?)?/, "").trim();
  if (!text.includes("\u300C")) return null;
  const targets = text.split("\u6216").map(parseTarget);
  return targets.every(Boolean) ? { excluded, targets } : null;
}
var PLACES = "(?:\u624B\u5361|\u5361\u7EC4|\u989D\u5916\u5361\u7EC4|\u5893\u5730|\u9664\u5916\u72B6\u6001)";
var REFERENCE = new RegExp(`(?:\u4ECE|\u628A)(${PLACES}(?:[\xB7\u3001]${PLACES})*)(?:\u628A|\u9009)?([^\uFF0C\u3002\uFF1B]*?)(\u52A0\u5165\u624B\u5361|\u7279\u6B8A\u53EC\u5524|\u9001\u53BB\u5893\u5730|\u7ED9\u5BF9\u65B9\u89C2\u770B|\u9664\u5916|\u5728\u81EA\u5DF1\u573A\u4E0A\u76D6\u653E|\u76D6\u653E)`, "g");
var SOURCE = new RegExp(`^\u4ECE(${PLACES}(?:[\xB7\u3001]${PLACES})*)(?:\u628A|\u9009)?(.*)$`);
function parseReferences(card) {
  const references = [];
  for (const part of card.descZh.split(/(?=[①②③④⑤⑥⑦⑧⑨])/)) {
    const effect = /^[①②③④⑤⑥⑦⑧⑨]/.test(part) ? part[0] : "";
    for (const sentence of part.split(/(?<=。)/)) {
      for (const match of sentence.matchAll(REFERENCE)) {
        const [first, ...others] = match[2].split(/或者?(?=从(?:手卡|卡组|额外卡组))/);
        const pieces = [[match[1], first], ...others.map((other) => other.match(SOURCE)?.slice(1, 3) ?? ["", ""])];
        const options = pieces.map(([from, object]) => {
          const sources = from.split(/[·、]/);
          const zones = [];
          if (sources.includes("\u5361\u7EC4")) zones.push("main");
          if (sources.includes("\u989D\u5916\u5361\u7EC4")) zones.push("extra");
          if (zones.length === 0 || !object.includes("\u300C")) return null;
          const parsed = parseObject(object);
          return parsed && { zones, ...parsed };
        });
        if (options.every(Boolean)) {
          references.push({ card, effect, text: sentence.trim().replace(/^[①②③④⑤⑥⑦⑧⑨]：/, ""), options });
        }
      }
    }
  }
  return references;
}
var names2 = (card) => [card.cn, card.md, card.sc, card.jp, card.en, ...card.aliases].filter(Boolean);
function hasName(card, name) {
  const target = norm(name);
  const treatedAs = card.descZh.match(/这个卡名在规则上当作「(.+?)」使用/);
  return names2(card).some((cardName) => norm(cardName) === target) || !!treatedAs && norm(treatedAs[1]) === target;
}
function matchesTarget(card, target, inArchetype) {
  const refMatch = {
    name: () => target.refs.some((ref) => hasName(card, ref)),
    archetype: () => target.refs.some((ref) => inArchetype(card, ref)),
    nameContains: () => target.refs.some((ref) => [card.cn, card.md, card.sc, card.jp].some((name) => name.includes(ref))),
    mentions: () => target.refs.some((ref) => card.descZh.includes(`\u300C${ref}\u300D`))
  }[target.mode]();
  if (!refMatch) return false;
  const { kinds } = zhKinds(card);
  if (target.kinds.length > 0 && !target.kinds.some((kind) => kinds.has(kind))) return false;
  if (target.subtype === "\u901A\u5E38" && [...kinds].some((kind) => !["\u9B54\u6CD5", "\u9677\u9631"].includes(kind))) return false;
  if (target.subtype && target.subtype !== "\u901A\u5E38" && !kinds.has(target.subtype)) return false;
  if (target.level && (card.level === null || card.level < target.level[0] || card.level > target.level[1])) return false;
  return true;
}
function missingTargets(deck, inArchetype) {
  const zones = { main: deck.main, extra: deck.extra };
  const sources = [...new Map([...deck.main, ...deck.extra].map(({ card }) => [card.id, card])).values()];
  const available = (source, option) => option.zones.flatMap((zone) => zones[zone]).reduce((sum, { card, count }) => {
    if (option.excluded.some((name) => hasName(card, name))) return sum;
    if (!option.targets.some((target) => matchesTarget(card, target, inArchetype))) return sum;
    return sum + count - (card.id === source.id ? 1 : 0);
  }, 0);
  return sources.flatMap(parseReferences).filter((reference) => {
    if (reference.options.some((option) => option.zones.every((zone) => zones[zone].length === 0))) return false;
    return reference.options.every((option) => available(reference.card, option) <= 0);
  });
}

// src/odds.ts
var KIND_WORDS = "\u602A\u517D|\u9B54\u6CD5|\u9677\u9631|\u8C03\u6574|\u540C\u8C03|\u878D\u5408|\u8D85\u91CF|\u8FDE\u63A5|\u7075\u6446|\u4EEA\u5F0F|\u6548\u679C|\u901A\u5E38|\u901F\u653B|\u6C38\u7EED|\u573A\u5730|\u88C5\u5907|\u53CD\u51FB";
var RACES = [
  "\u6218\u58EB",
  "\u9B54\u6CD5\u5E08",
  "\u5929\u4F7F",
  "\u6076\u9B54",
  "\u4E0D\u6B7B",
  "\u673A\u68B0",
  "\u6C34",
  "\u708E",
  "\u5CA9\u77F3",
  "\u9E1F\u517D",
  "\u690D\u7269",
  "\u6606\u866B",
  "\u96F7",
  "\u9F99",
  "\u517D",
  "\u517D\u6218\u58EB",
  "\u6050\u9F99",
  "\u9C7C",
  "\u6D77\u9F99",
  "\u722C\u866B\u7C7B",
  "\u5FF5\u52A8\u529B",
  "\u5E7B\u795E\u517D",
  "\u521B\u9020\u795E",
  "\u5E7B\u9F99",
  "\u7535\u5B50\u754C",
  "\u5E7B\u60F3\u9B54"
].sort((a, b3) => b3.length - a.length).join("|");
var GROUP_PARTS = [
  [/^「([^」]+)」以外的?/, (group, [, name]) => group.excluded.push(name)],
  [new RegExp(`^\u300C([^\u300D]+)\u300D(?=${KIND_WORDS}|\u5361)`), (group, [, name]) => group.archetypes.push(name)],
  [/^「([^」]+)」/, (group, [, name]) => group.names.push(name)],
  [/^(\d+)\s*[～~\-－]\s*(\d+)\s*星/, (group, [, low, high]) => group.level = [Number(low), Number(high)]],
  [/^(\d+)\s*星(以上|以下)?/, (group, [, value, side]) => {
    group.level = side === "\u4EE5\u4E0A" ? [Number(value), 99] : side === "\u4EE5\u4E0B" ? [0, Number(value)] : [Number(value), Number(value)];
  }],
  [/^攻(?:击力)?或守(?:备力)?\s*(?:是|为)?\s*(\d+)/, (group, [, value]) => group.atkOrDef = Number(value)],
  [/^攻(?:击力)?(?:和|与)?守(?:备力)?\s*都?(?:是|为)?\s*(\d+)/, (group, [, value]) => group.atk = group.def = Number(value)],
  [/^攻(?:击力)?\s*(?:是|为)?\s*(\d+)/, (group, [, value]) => group.atk = Number(value)],
  [/^守(?:备力)?\s*(?:是|为)?\s*(\d+)/, (group, [, value]) => group.def = Number(value)],
  [new RegExp(`^(${RACES})\u65CF`), (group, [, race]) => group.races.push(race)],
  [/^([光暗地水炎风神](?:[·、]?[光暗地水炎风神])*)(?:属性)?/, (group, [, attributes]) => {
    group.attributes.push(...attributes.replace(/[·、]/g, ""));
  }],
  [/^不能通常召唤的?/, (group) => group.kinds.push("\u7279\u6B8A\u53EC\u5524")],
  [new RegExp(`^(${KIND_WORDS})`), (group, [, kind]) => group.kinds.push(kind)],
  [/^(?:\d+(?:只|张)|其他的?|另一(?:只|张)的?|卡|的|是|[\s·、])/, () => {
  }]
];
function parseGroup(text, pool = []) {
  const group = { text: text.trim(), names: [], archetypes: [], excluded: [], kinds: [], races: [], attributes: [] };
  let rest = group.text;
  next: while (rest) {
    for (const [pattern, apply] of GROUP_PARTS) {
      const match = rest.match(pattern);
      if (match?.[0]) {
        apply(group, match);
        rest = rest.slice(match[0].length);
        continue next;
      }
    }
    const named = pool.length > 0 ? findCards(pool, group.text) : [];
    if (named.length > 0 && new Set(named.map((card) => card.cn)).size === 1) {
      return { ...group, names: [named[0].cn || named[0].en], kinds: [], races: [], attributes: [] };
    }
    throw new Error(`\u770B\u4E0D\u61C2"${rest}"\uFF08\u5728"${group.text}"\u91CC\uFF09`);
  }
  if (Object.values(group).every((value) => !Array.isArray(value) || value.length === 0) && group.level === void 0 && group.atk === void 0 && group.def === void 0 && group.atkOrDef === void 0) {
    throw new Error(`"${group.text}"\u6CA1\u6709\u5199\u662F\u4EC0\u4E48\u5361`);
  }
  return group;
}
function inGroup(card, group, inArchetype) {
  if (group.excluded.some((name) => hasName(card, name))) return false;
  if (group.names.length > 0 && !group.names.some((name) => hasName(card, name))) return false;
  if (group.archetypes.length > 0 && !group.archetypes.some((archetype) => inArchetype(card, archetype))) return false;
  const { kinds, race, attr } = zhKinds(card);
  const spellTrap = group.kinds.filter((kind) => kind === "\u9B54\u6CD5" || kind === "\u9677\u9631");
  if (spellTrap.length > 0 && !spellTrap.some((kind) => kinds.has(kind))) return false;
  if (group.kinds.some((kind) => kind !== "\u9B54\u6CD5" && kind !== "\u9677\u9631" && !kinds.has(kind))) return false;
  if (group.races.length > 0 && !group.races.includes(race)) return false;
  if (group.attributes.length > 0 && !group.attributes.includes(attr)) return false;
  if (group.level && (card.level === null || card.level < group.level[0] || card.level > group.level[1])) return false;
  if (group.atk !== void 0 && card.atk !== group.atk) return false;
  if (group.def !== void 0 && card.def !== group.def) return false;
  if (group.atkOrDef !== void 0 && card.atk !== group.atkOrDef && card.def !== group.atkOrDef) return false;
  return true;
}
var SPLIT = /[；;，,]/;
var state = (text) => text.replace(/\s/g, "");
var items = (text) => text.split(SPLIT).map((item) => item.trim()).filter(Boolean);
function deckCard(deck, name) {
  for (const [section, fromExtra] of [["main", false], ["extra", true]]) {
    const exact = deck[section].find((entry) => hasName(entry.card, name));
    if (exact) return { card: exact.card, fromExtra };
  }
  const target = norm(name);
  const partial = [...deck.main, ...deck.extra].filter(({ card }) => [card.cn, card.md, card.sc, card.jp, card.en].some((cardName) => cardName && norm(cardName).includes(target)));
  if (partial.length === 1) return { card: partial[0].card, fromExtra: deck.extra.includes(partial[0]) };
  if (partial.length > 1) throw new Error(`\u5BF9\u4E0A\u4E86\u597D\u51E0\u5F20\uFF1A${partial.slice(0, 3).map(({ card }) => `\u300C${card.cn || card.en}\u300D`).join("\u3001")}`);
  throw new Error(deck.side.some((entry) => hasName(entry.card, name)) ? "\u5728\u526F\u5361\u7EC4\u91CC\uFF0C\u6CA1\u6709\u7B97" : "\u4E3B\u5361\u7EC4\u548C\u989D\u5916\u5361\u7EC4\u91CC\u90FD\u6CA1\u6709\u8FD9\u5F20\u5361");
}
function parseRules(text, deck, pool) {
  const rules = { moves: [], second: [], problems: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[-*•]\s*/, "");
    if (!line || line.startsWith("#")) continue;
    const head = line.match(/^(.+?)\s*[：:]\s*(.*)$/);
    if (!head) {
      rules.problems.push(`\u770B\u4E0D\u61C2\u8FD9\u4E00\u884C\uFF1A"${line}"`);
      continue;
    }
    const [, name, body] = head;
    if (name === "\u540E\u624B") {
      rules.second.push(...items(body).map(state));
      continue;
    }
    try {
      const [needText, giveText, extra] = body.split(/→|->/);
      if (giveText === void 0 || extra !== void 0) throw new Error('\u8981\u5199\u6210"\u8981 \u2026 \u2192 \u2026"\uFF0C\u4E2D\u95F4\u4E00\u4E2A\u7BAD\u5934');
      const move = {
        ...deckCard(deck, name.replace(/^「(.*)」$/, "$1")),
        text: body.trim(),
        normalSummon: false,
        hold: [],
        discard: [],
        needs: [],
        search: [],
        gives: [],
        start: false
      };
      for (const need of items(needText.trim().replace(/^要/, ""))) {
        let match;
        if (/^通常?召唤?$|^通召$/.test(need)) move.normalSummon = true;
        else if (match = need.match(/^(?:手里)?(?:丢(?:掉|弃)?|素材)\s*(.+)$/)) move.discard.push(parseGroup(match[1], pool));
        else if (match = need.match(/^手里(?:另有|还有|有|另一(?:只|张))?\s*(.+)$/)) move.hold.push(parseGroup(match[1], pool));
        else move.needs.push(state(need));
      }
      for (const give of items(giveText)) {
        let match;
        if (state(give) === "\u80FD\u52A8") move.start = true;
        else if (match = give.match(/^(?:拿|检索)\s*(.+)$/)) move.search.push(parseGroup(match[1], pool));
        else move.gives.push(state(give));
      }
      if (move.fromExtra && (move.hold.length > 0 || move.discard.length > 0 || move.normalSummon)) {
        throw new Error("\u989D\u5916\u5361\u7EC4\u7684\u602A\u517D\u53EA\u80FD\u5199\u573A\u4E0A\u3001\u5893\u5730\u8FD9\u7C7B\u72B6\u6001\u5F53\u6761\u4EF6");
      }
      rules.moves.push(move);
    } catch (error) {
      rules.problems.push(`\u300C${name}\u300D\uFF1A${error instanceof Error ? error.message : error}`);
    }
  }
  const given = /* @__PURE__ */ new Set([...rules.second, ...rules.moves.flatMap((move) => move.gives)]);
  for (const need of new Set(rules.moves.flatMap((move) => move.needs))) {
    if (!given.has(need)) rules.problems.push(`\u72B6\u6001"${need}"\u6709\u5361\u8981\uFF0C\u4F46\u6CA1\u6709\u5361\u7ED9\uFF0C\u4E5F\u4E0D\u5728\u540E\u624B\u5047\u8BBE\u91CC\uFF08\u4E24\u8FB9\u8981\u5199\u5F97\u4E00\u6A21\u4E00\u6837\uFF09`);
  }
  if (!rules.moves.some((move) => move.start)) rules.problems.push('\u6CA1\u6709\u4E00\u884C\u5199\u4E86"\u80FD\u52A8"\uFF0C\u6240\u6709\u8D77\u624B\u90FD\u4F1A\u7B97\u6210\u4E0D\u80FD\u52A8');
  return rules;
}
function groupMatches(group, deck, inArchetype) {
  return deck.main.filter(({ card }) => inGroup(card, group, inArchetype));
}
var choose = /* @__PURE__ */ (() => {
  const table = [];
  return (n, k) => {
    if (k < 0 || k > n) return 0;
    table[n] ??= [];
    if (table[n][k] === void 0) {
      let value = 1;
      for (let i2 = 1; i2 <= k; i2++) value = value * (n - k + i2) / i2;
      table[n][k] = Math.round(value);
    }
    return table[n][k];
  };
})();
function solver(deck, rules, inArchetype) {
  const cardBits = /* @__PURE__ */ new Map();
  for (const move of rules.moves) if (!cardBits.has(move.card.id)) cardBits.set(move.card.id, 1 << cardBits.size);
  if (cardBits.size > 30) throw new Error("\u89C4\u5219\u6700\u591A\u5199 30 \u5F20\u5361");
  const relevant = [];
  const typeOf = /* @__PURE__ */ new Map();
  const groups = rules.moves.flatMap((move) => [...move.hold, ...move.discard, ...move.search]);
  for (const entry of deck.main) {
    if (rules.moves.some((move) => move.card.id === entry.card.id) || groups.some((group) => inGroup(entry.card, group, inArchetype))) {
      typeOf.set(entry.card.id, relevant.length);
      relevant.push(entry);
    }
  }
  const types = (group) => relevant.flatMap((entry, type) => inGroup(entry.card, group, inArchetype) ? [type] : []);
  const states = /* @__PURE__ */ new Map();
  const bits2 = (list) => list.reduce((mask, name) => {
    if (!states.has(name)) states.set(name, states.size);
    return mask | 1 << states.get(name);
  }, 0);
  const moves = rules.moves.filter((move) => move.fromExtra ? deck.extra.some((entry) => entry.card.id === move.card.id) : typeOf.has(move.card.id)).map((move) => ({
    bit: cardBits.get(move.card.id),
    type: move.fromExtra ? -1 : typeOf.get(move.card.id),
    normalSummon: move.normalSummon,
    hold: move.hold.map(types),
    discard: move.discard.map(types),
    search: move.search.map(types),
    needs: bits2(move.needs),
    gives: bits2(move.gives),
    start: move.start
  }));
  if (states.size + rules.second.length > 30) throw new Error("\u72B6\u6001\u6700\u591A 30 \u79CD");
  const secondFacts = bits2(rules.second);
  const starts = (hand, pile, facts, used, summoned, cap) => {
    let best = 0;
    const holds = (groups2, position) => {
      if (position === groups2.length) return true;
      return groups2[position].some((type) => {
        if (hand[type] === 0) return false;
        hand[type]--;
        const ok = holds(groups2, position + 1);
        hand[type]++;
        return ok;
      });
    };
    for (const move of moves) {
      if (best >= cap) break;
      if (used & move.bit || move.normalSummon && summoned || (facts & move.needs) !== move.needs) continue;
      if (move.type >= 0 && hand[move.type] === 0) continue;
      const search2 = (position) => {
        if (position === move.search.length) {
          const gain = move.start ? 1 : 0;
          return gain >= cap ? gain : gain + starts(hand, pile, facts | move.gives, used | move.bit, summoned || move.normalSummon, cap - gain);
        }
        let result = 0;
        for (const type of move.search[position]) {
          if (pile[type] === 0 || result >= cap) continue;
          pile[type]--;
          hand[type]++;
          result = Math.max(result, search2(position + 1));
          pile[type]++;
          hand[type]--;
        }
        return result;
      };
      const discard = (position) => {
        if (position === move.discard.length) return holds(move.hold, 0) ? search2(0) : 0;
        let result = 0;
        for (const type of move.discard[position]) {
          if (hand[type] === 0 || result >= cap) continue;
          hand[type]--;
          result = Math.max(result, discard(position + 1));
          hand[type]++;
        }
        return result;
      };
      if (move.type >= 0) hand[move.type]--;
      best = Math.max(best, discard(0));
      if (move.type >= 0) hand[move.type]++;
    }
    return best;
  };
  return { relevant, typeOf, secondFacts, starts };
}
function handOdds(deck, rules, inArchetype) {
  const { relevant, secondFacts, starts } = solver(deck, rules, inArchetype);
  const size = deck.main.reduce((sum, entry) => sum + entry.count, 0);
  const copies = relevant.map((entry) => entry.count);
  const others = size - copies.reduce((sum, count) => sum + count, 0);
  const tally = (handSize, facts) => {
    const totals = facts.map(() => ({ playable: 0, twoOrMore: 0 }));
    const hand = new Int8Array(copies.length);
    const pile = new Int8Array(copies.length);
    const visit = (type, left, weight) => {
      if (type === copies.length) {
        if (left > others) return;
        const share = weight * choose(others, left) / choose(size, handSize);
        facts.forEach((initial, index) => {
          const count = starts(hand, pile, initial, 0, false, 2);
          if (count >= 1) totals[index].playable += share;
          if (count >= 2) totals[index].twoOrMore += share;
        });
        return;
      }
      for (let count = 0; count <= Math.min(copies[type], left); count++) {
        hand[type] = count;
        pile[type] = copies[type] - count;
        visit(type + 1, left - count, weight * choose(copies[type], count));
      }
      hand[type] = 0;
      pile[type] = copies[type];
    };
    visit(0, handSize, 1);
    return totals;
  };
  const [first] = tally(5, [0]);
  const [second, secondAlone] = tally(6, rules.second.length > 0 ? [secondFacts, 0] : [0]);
  return { size, first, second, secondAlone: secondAlone ?? null };
}
function changeDeck(deck, change, pool) {
  const main = deck.main.map((entry) => ({ ...entry }));
  const labels = [];
  for (const item of items(change)) {
    const match = item.match(/^([+\-＋－−])\s*(\d+)\s*(.+)$/);
    if (!match) throw new Error(`\u6539\u52A8\u8981\u5199\u6210"-1 \u5361\u540D"\u6216"+1 \u5361\u540D"\uFF1A${item}`);
    const [, sign, digits, name] = match;
    const amount = Number(digits);
    if (sign === "+" || sign === "\uFF0B") {
      const inDeck = main.find((entry) => hasName(entry.card, name));
      const found = inDeck ? [inDeck.card] : findCards(pool, name);
      if (new Set(found.map((card) => card.cn || card.en)).size !== 1) throw new Error(`\u300C${name}\u300D\u6CA1\u6709\u5BF9\u4E0A\u552F\u4E00\u4E00\u5F20\u5361`);
      if (inDeck) inDeck.count += amount;
      else main.push({ card: found[0], count: amount });
      labels.push(`\uFF0B${amount}\u300C${found[0].cn || found[0].en}\u300D`);
    } else {
      const entry = main.find((candidate) => hasName(candidate.card, name)) ?? main.find((candidate) => norm(candidate.card.cn).includes(norm(name)));
      if (!entry || entry.count < amount) throw new Error(`\u4E3B\u5361\u7EC4\u91CC\u6CA1\u6709 ${amount} \u5F20\u300C${name}\u300D`);
      entry.count -= amount;
      labels.push(`\u2212${amount}\u300C${entry.card.cn || entry.card.en}\u300D`);
    }
  }
  return { deck: { ...deck, main: main.filter((entry) => entry.count > 0) }, label: labels.join(" ") };
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
  const names3 = cards.slice(0, max2).map((card) => `\u300C${card.cn || card.en}\u300D`).join("\u3001");
  return cards.length > max2 ? `${names3} \u7B49 ${cards.length} \u5F20` : names3;
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
    const sorted = [...pairs].sort((a, b3) => a.remaining.length - b3.remaining.length);
    for (const { first, second, remaining } of sorted) {
      lines.push(`  - ${lockName(first)} + ${lockName(second)}\uFF1A${remaining.length === 0 ? "\u989D\u5916\u5361\u7EC4\u4E00\u53EA\u90FD\u51FA\u4E0D\u6765" : `\u989D\u5916\u53EA\u5269${cardList(remaining)}`}`);
    }
  }
  return lines;
}
function formatMissing(missing) {
  if (missing.length === 0) return [];
  const lines = ["", "\u53EF\u80FD\u6CA1\u6709\u76EE\u6807\uFF08\u6309\u5361\u540D\u548C\u5B57\u6BB5\u5224\u65AD\uFF0C\u8BF7\u786E\u8BA4\uFF09\uFF1A"];
  for (const { card, effect, text, options } of missing) {
    const zones = new Set(options.flatMap((option) => option.zones));
    const where = zones.size === 2 ? "\u5361\u7EC4\u548C\u989D\u5916\u5361\u7EC4\u91CC\u90FD" : zones.has("extra") ? "\u989D\u5916\u5361\u7EC4\u91CC" : "\u5361\u7EC4\u91CC";
    lines.push(`  - \u300C${card.cn || card.en}\u300D${effect}\uFF1A${text} \u2192 ${where}\u6CA1\u6709\u7B26\u5408\u7684\u5361\uFF08\u8FD9\u5F20\u5361\u81EA\u5DF1\u4E0D\u7B97\uFF09`);
  }
  return lines;
}
function formatDeck(deck, issues, banlist, locks, missing) {
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
  lines.push(...formatLocks(locks.locks, locks.pairs), ...formatMissing(missing));
  lines.push("", "\u68C0\u67E5\uFF1A", ...issues.length > 0 ? issues.map((issue) => `  - ${issue}`) : ["  \u6CA1\u6709\u53D1\u73B0\u5F20\u6570\u3001\u7981\u9650\u6216\u5B9E\u88C5\u65B9\u9762\u7684\u95EE\u9898\u3002"]);
  lines.push(`\uFF08${banlistNote(banlist)}\uFF09`);
  return lines.join("\n");
}
var percent = (value) => `${(value * 100).toFixed(1)}%`;
function oddsLines(report, second, base) {
  const change = (value, before) => {
    if (before === void 0) return "";
    const points = (value - before) * 100;
    return `\uFF08${points >= 0 ? "+" : "\u2212"}${Math.abs(points).toFixed(1)}\uFF09`;
  };
  const line = (label, odds2, before, note = "") => `  ${label}\uFF1A${percent(odds2.playable)}${change(odds2.playable, before?.playable)}\uFF0C\u6709\u4E24\u4E2A\u4EE5\u4E0A\u52A8\u70B9 ${percent(odds2.twoOrMore)}${change(odds2.twoOrMore, before?.twoOrMore)}${note}`;
  return [
    line("\u5148\u624B 5 \u5F20", report.first, base?.first),
    line("\u540E\u624B 6 \u5F20", report.second, base?.second, report.secondAlone ? `\uFF08\u5047\u8BBE\uFF1A${second.join("\u3001")}\uFF09` : ""),
    ...report.secondAlone ? [line("\u540E\u624B 6 \u5F20\uFF0C\u4E0D\u9760\u5BF9\u65B9", report.secondAlone, base?.secondAlone ?? void 0)] : []
  ];
}
function formatOdds(deck, rules, report, changed, inArchetype) {
  const lines = [
    `\u5361\u7EC4\uFF1A${deck.name || "\uFF08\u6CA1\u6709\u540D\u5B57\uFF09"}\uFF08\u6765\u6E90\uFF1A${deck.source}\uFF09\uFF5C\u4E3B\u5361\u7EC4 ${report.size} \u5F20`,
    "",
    "\u80FD\u52A8\u7684\u6982\u7387\uFF08\u7167\u4E0B\u9762\u7684\u89C4\u5219\u63A8\uFF0C\u6240\u6709\u53EF\u80FD\u7684\u8D77\u624B\u9010\u4E00\u7CBE\u786E\u8BA1\u7B97\uFF09\uFF1A",
    ...oddsLines(report, rules.second)
  ];
  if (changed) lines.push("", `\u6539\u6210 ${changed.label} \u4EE5\u540E\uFF1A`, ...oddsLines(changed.report, rules.second, report));
  lines.push("", '\u89C4\u5219\uFF08\u5DE5\u5177\u8BFB\u5230\u7684\uFF1B\u80FD\u52A8\uFF1D\u63A8\u5F97\u51FA"\u80FD\u52A8"\uFF0C\u4E24\u4E2A\u4EE5\u4E0A\u52A8\u70B9\uFF1D\u80FD\u7528\u51FA\u4E24\u5F20\u4E0D\u540C\u7684\u5199\u4E86"\u80FD\u52A8"\u7684\u5361\uFF09\uFF1A');
  const count = (card) => deck.main.find((entry) => entry.card.id === card.id)?.count;
  const matched = (label, group) => {
    const entries = groupMatches(group, deck, inArchetype);
    const names3 = entries.slice(0, 8).map(({ card, count: count2 }) => `\u300C${card.cn || card.en}\u300D\xD7${count2}`).join("\u3001");
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    return `      ${label} ${group.text} \u2192 ${entries.length === 0 ? "\u4E3B\u5361\u7EC4\u91CC\u6CA1\u6709\u7B26\u5408\u7684\u5361" : `${names3}${entries.length > 8 ? " \u7B49" : ""}\uFF0C\u5171 ${total} \u5F20`}`;
  };
  for (const move of rules.moves) {
    lines.push(`  - \u300C${move.card.cn || move.card.en}\u300D${move.fromExtra ? "\uFF08\u989D\u5916\uFF09" : `\xD7${count(move.card)}`}\uFF1A${move.text}`);
    lines.push(
      ...move.hold.map((group) => matched("\u624B\u91CC", group)),
      ...move.discard.map((group) => matched("\u7528\u6389", group)),
      ...move.search.map((group) => matched("\u62FF", group))
    );
  }
  if (rules.second.length > 0) lines.push(`  - \u540E\u624B\uFF1A${rules.second.join("\u3001")}`);
  const problems = [...rules.problems];
  if (deck.unknown.length > 0) problems.push(`\u5361\u7EC4\u91CC\u6709 ${deck.unknown.length} \u884C\u6CA1\u8BA4\u51FA\u6765\uFF0C\u6CA1\u6709\u7B97\u8FDB\u53BB\uFF1A${deck.unknown.slice(0, 3).join("\uFF1B")}`);
  if (problems.length > 0) lines.push("", "\u8BF7\u68C0\u67E5\uFF1A", ...problems.map((problem) => `  - ${problem}`));
  return lines.join("\n");
}
var fieldText = (board) => {
  const monsters = board.field.map((card) => `\u300C${card.cn || card.en}\u300D`).join("\uFF0B") || "\uFF08\u6CA1\u6709\u602A\u517D\uFF09";
  return board.sets.length > 0 ? `${monsters}\uFF0C\u540E\u573A ${board.sets.map((card) => `\u300C${card.cn || card.en}\u300D`).join("")}` : monsters;
};
function routeLines(steps) {
  const lines = [];
  for (const step of steps) {
    if (lines.length === 0 || /^(通召|特召|发动|连锁发动)/.test(step)) lines.push(step);
    else lines[lines.length - 1] += ` \u2192 ${step}`;
  }
  return lines.map((line, index) => `    ${index + 1}. ${line}`);
}
function formatPlan(hand, result, problems, missing, missingScripts) {
  const lines = [`\u8D77\u624B\uFF1A${hand.map((card) => `\u300C${card.cn || card.en}\u300D`).join("")}\uFF08\u5148\u624B\uFF0C\u5BF9\u624B\u4E0D\u505A\u4EFB\u4F55\u4E8B\uFF1B\u6309\u7ED3\u675F\u9636\u6BB5\u5904\u7406\u5B8C\u3001\u5BF9\u624B\u56DE\u5408\u5F00\u59CB\u65F6\u7B97\uFF09`];
  const [best, ...others] = result.boards;
  if (!best) lines.push("", "\u6CA1\u6709\u627E\u5230\u4EFB\u4F55\u80FD\u505A\u7684\u52A8\u4F5C\u3002");
  else {
    lines.push("", `\u6700\u5927\u573A\uFF1A${fieldText(best)}`, `  \u4EF7\u503C ${best.value}`);
    for (const place of ["\u573A\u4E0A", "\u5893\u5730", "\u624B\u91CC", "\u5E26\u51FA"]) {
      const items2 = best.counted.filter((item) => item.place === place);
      if (items2.length === 0) continue;
      const text = items2.map(({ card, level, uses, value, ownTurn, via }) => `${via ? `\u300C${via.cn || via.en}\u300D\u2192` : ""}\u300C${card.cn || card.en}\u300D${level >= 0 ? LEVELS[level].name : ""}${uses > 1 ? `\xD7${uses}` : ""}${ownTurn ? "\uFF08\u53EA\u5728\u81EA\u5DF1\u56DE\u5408\u7528\uFF09" : ""} ${value}`).join("\u3001");
      lines.push(`  \u7B97\u8FDB\u53BB\u7684\uFF08${place === "\u5E26\u51FA" ? "\u5BF9\u624B\u56DE\u5408\u5E26\u51FA" : place}\uFF09\uFF1A${text}`);
    }
    lines.push("  \u8DEF\u7EBF\uFF1A", ...routeLines(best.steps));
    const alternatives = others.slice(0, 5);
    if (alternatives.length > 0) {
      lines.push("", "\u5176\u4ED6\u7684\u573A\uFF08\u6BCF\u79CD\u573A\u53EA\u5217\u6700\u597D\u7684\u4E00\u6761\u8DEF\u7EBF\uFF09\uFF1A", ...alternatives.map((board) => `  [${board.value}] ${fieldText(board)}`));
    }
  }
  lines.push("", "\u7B2C\u4E00\u6B65\u7684\u6BCF\u79CD\u9009\u62E9\uFF1A");
  for (const branch of result.branches) {
    const how = branch.complete ? `\u5168\u90E8\u641C\u5B8C\uFF08${branch.nodes} \u4E2A\u8282\u70B9\uFF09` : `\u641C\u4E86 ${branch.nodes} \u4E2A\u8282\u70B9\uFF0C\u5230\u65F6\u95F4\u6216\u8282\u70B9\u4E0A\u9650\u6CA1\u641C\u5B8C`;
    lines.push(`  ${branch.first || "\uFF08\u4E0D\u53D1\u52A8\uFF0C\u7EE7\u7EED\uFF09"}\uFF1A${how}\uFF0C\u6700\u597D ${branch.best ? `[${branch.best.value}] ${fieldText(branch.best)}` : "\u65E0"}`);
  }
  const weights = LEVELS.map((level) => `${level.name} ${level.weight}`).join("\u3001");
  lines.push(`\u5171 ${result.states} \u4E2A\u4E0D\u540C\u5C40\u9762\uFF0C${result.seconds.toFixed(1)} \u79D2\u3002\u4EF7\u503C\uFF1D\u5BF9\u624B\u56DE\u5408\u80FD\u7528\u7684\u6253\u65AD\u6309\u7EA7\u522B\u52A0\u6743\uFF08${weights}\uFF09\uFF0C\u4E58\u6B21\u6570\uFF1B\u53EA\u5728\u81EA\u5DF1\u56DE\u5408\u7528\u7684\u7B97 1\u3002`);
  const notes = [...problems];
  if (missing.length > 0) notes.push(`\u89C4\u5219\u5F15\u64CE\u8FD8\u6CA1\u6709\u8FD9\u4E9B\u5361\u7684\u6570\u636E\u6216\u811A\u672C\uFF0C\u7ED3\u679C\u53EF\u80FD\u4E0D\u5BF9\uFF1A${missing.map((card) => `\u300C${card.cn || card.en}\u300D`).join("\u3001")}`);
  if (missingScripts.length > 0) notes.push(`\u5F15\u64CE\u8981\u4E86\u4F46\u6CA1\u627E\u5230\u7684\u811A\u672C\uFF1A${missingScripts.join("\u3001")}`);
  if (notes.length > 0) lines.push("", "\u8BF7\u68C0\u67E5\uFF1A", ...notes.map((note) => `  - ${note}`));
  return lines.join("\n");
}

// src/cards.ts
import { existsSync as existsSync6, statSync as statSync2 } from "node:fs";
var YGOCDB_ZIP = "https://ygocdb.com/api/v0/cards.zip";
var YGOCDB_MD5 = "https://ygocdb.com/api/v0/cards.zip.md5";
var YGOPRODECK_ALL = "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes";
var YGOPRODECK_VERSION = "https://db.ygoprodeck.com/api/v7/checkDBVer.php";
var CARDS_CACHE = cachePath("cards.json");
var CHECKED_MARK = cachePath("cards_checked");
var CARDS_MAX_AGE = 7 * DAY;
var CHECK_INTERVAL = 3600;
var CACHE_VERSION = 3;
var YGOPRODECK_RARITY = { "Ultra Rare": "UR", "Super Rare": "SR", "Rare": "R", "Common": "N" };
function splitSetcode(setcode) {
  const codes = [];
  for (let rest = BigInt(setcode); rest > 0n; rest >>= 16n) codes.push(Number(rest & 0xffffn));
  return codes;
}
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
    setcodes: splitSetcode(cdb.data?.setcode ?? 0),
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
var memo2 = null;
function readCache() {
  if (!existsSync6(CARDS_CACHE)) return null;
  const mtimeMs = statSync2(CARDS_CACHE).mtimeMs;
  if (memo2?.mtimeMs !== mtimeMs) {
    const cache = readJson(CARDS_CACHE);
    if (cache.version !== CACHE_VERSION) return null;
    memo2 = { mtimeMs, cache };
  }
  return memo2.cache;
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
function allows(allowed, card, inArchetype) {
  const { kinds, race, attr } = zhKinds(card);
  if (allowed.kinds.length > 0 && !allowed.kinds.some((kind) => kinds.has(kind))) return false;
  if (allowed.archetypes.length > 0 && !allowed.archetypes.some((archetype) => inArchetype(card, archetype))) return false;
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
function analyzeLocks(deckCards, extraDeck, inArchetype) {
  const locks = deckCards.flatMap(parseLocks);
  const allowedBy = (lock) => lock.allowed === null ? null : lock.allowed === "none" ? [] : extraDeck.filter((card) => allows(lock.allowed, card, inArchetype));
  const reports = locks.map((lock) => {
    const allowed = allowedBy(lock);
    return { lock, blocked: allowed === null ? [] : extraDeck.filter((card) => !allowed.includes(card)) };
  });
  const pairs = [];
  for (let i2 = 0; i2 < locks.length; i2++) {
    for (let j2 = i2 + 1; j2 < locks.length; j2++) {
      const [first, second] = [locks[i2], locks[j2]];
      const [a, b3] = [allowedBy(first), allowedBy(second)];
      if (first.card.id === second.card.id || !a || !b3 || a.length === 0 || b3.length === 0) continue;
      const remaining = a.filter((card) => b3.includes(card));
      if (remaining.length < Math.min(a.length, b3.length)) pairs.push({ first, second, remaining });
    }
  }
  return { locks: reports, pairs };
}

// src/service.ts
var lookups = /* @__PURE__ */ new WeakMap();
function archetypesOf(cards) {
  if (!lookups.has(cards)) lookups.set(cards, archetypeLookup(cards));
  return lookups.get(cards);
}
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
async function loadDeck(input) {
  let cards = await loadCards();
  let deck = await readDeck(input, cards);
  if (deck.unknown.length > 0) {
    const fresh = await reloadIfSourcesChanged();
    if (fresh) {
      cards = fresh;
      deck = await readDeck(input, cards);
    }
  }
  return { cards, deck };
}
async function importDeck(input) {
  const banlist = await loadBanlist();
  const { cards, deck } = await loadDeck(input);
  const inArchetype = archetypesOf(cards);
  const locks = analyzeLocks(distinctCards(deck, ["main", "extra"]), distinctCards(deck, ["extra"]), inArchetype);
  return formatDeck(deck, checkDeck(deck, cards, banlist), banlist, locks, missingTargets(deck, inArchetype));
}
async function odds(input, rulesText, change) {
  const { cards, deck } = await loadDeck(input);
  const inArchetype = archetypesOf(cards);
  const rules = parseRules(rulesText, deck, cards);
  const report = handOdds(deck, rules, inArchetype);
  let changed = null;
  if (change) {
    const { deck: other, label } = changeDeck(deck, change, cards);
    changed = { label, report: handOdds(other, parseRules(rulesText, other, cards), inArchetype) };
  }
  return formatOdds(deck, rules, report, changed, inArchetype);
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

// src/plan.ts
import { availableParallelism } from "node:os";
import { Worker as Worker2, isMainThread, parentPort, workerData } from "node:worker_threads";
var LEVELS = [
  { name: "\u7B2C0\u7EA7", weight: 15 },
  // cannot be responded to, such as Super Polymerization
  { name: "\u7B2C\u4E00\u7EA7", weight: 10 },
  // negates any card's effect (三色康)
  { name: "1.5\u7EA7", weight: 6 },
  // between the two, such as Maxx "C"
  { name: "\u7B2C\u4E8C\u7EA7", weight: 4 },
  // a negation with a condition
  { name: "2.5\u7EA7", weight: 2 },
  // a negation with a very narrow condition, such as Stardust Dragon (destruction only)
  { name: "\u8F6F\u5EB7", weight: 2 },
  // a tax or lock on the opponent's effects, such as Raiho (discard for every effect)
  { name: "\u7B2C\u4E09\u7EA7", weight: 1 },
  // banish, destroy, send to the GY, return to the hand or Deck, change to face-down
  { name: "\u4FDD\u62A4", weight: 1 }
  // our cards cannot be targeted, destroyed or affected; only full immunity is worth more
];
var LEVEL_NAMES = {
  \u7B2C0\u7EA7: 0,
  \u7B2C\u96F6\u7EA7: 0,
  \u7B2C\u4E00\u7EA7: 1,
  "1.5\u7EA7": 2,
  "\u7B2C1.5\u7EA7": 2,
  \u7B2C\u4E8C\u7EA7: 3,
  "2.5\u7EA7": 4,
  "\u7B2C2.5\u7EA7": 4,
  \u8F6F\u5EB7: 5,
  \u7B2C\u4E09\u7EA7: 6,
  \u4FDD\u62A4: 7
};
var REACH_DEPTH = 5;
var OWN_TURN_VALUE = 1;
var REACH_ZONES = {
  \u5893\u5730: "grave",
  \u5361\u7EC4: "deck",
  \u989D\u5916: "extra",
  \u989D\u5916\u5361\u7EC4: "extra",
  \u624B\u91CC: "hand",
  \u624B\u5361: "hand",
  \u573A\u4E0A: "field"
};
function findCard(cards, name) {
  const exact = cards.find((card) => hasName(card, name));
  if (exact) return exact;
  const partial = cards.filter((card) => [card.cn, card.md, card.en].some((cardName) => cardName && norm(cardName).includes(norm(name))));
  if (partial.length === 1) return partial[0];
  throw new Error(partial.length > 1 ? `\u5BF9\u4E0A\u4E86\u597D\u51E0\u5F20\uFF1A${partial.slice(0, 3).map((card) => `\u300C${card.cn}\u300D`).join("\u3001")}` : "\u5361\u7EC4\u91CC\u6CA1\u6709\u8FD9\u5F20\u5361");
}
function parseTiers(text, deck, pool) {
  const cards = [...deck.main, ...deck.extra].map((entry) => entry.card);
  const tiers = { lines: [], problems: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[-*•]\s*/, "");
    if (!line || line.startsWith("#")) continue;
    const splits = [...line.matchAll(/[：:]/g)].map((match) => [line.slice(0, match.index).trim(), line.slice(match.index + 1).trim()]);
    const head = splits.find(([candidate]) => cards.some((card) => hasName(card, candidate))) ?? splits[0];
    if (!head) {
      tiers.problems.push(`\u770B\u4E0D\u61C2\u8FD9\u4E00\u884C\uFF1A"${line}"`);
      continue;
    }
    const [name, body] = head;
    try {
      const card = findCard(cards, name);
      if (tiers.lines.some((other) => other.card.id === card.id)) throw new Error("\u4E00\u5F20\u5361\u53EA\u5199\u4E00\u884C");
      const entry = { card, level: -1, uses: 1, where: "field", timing: "opponent", reach: null, besides: [], inExtra: [], inGrave: [] };
      for (const item of body.split(/[；;]/).map((part) => part.trim()).filter(Boolean)) {
        let match;
        if (match = item.match(/^(第0级|第零级|第一级|软康|第?1\.5级|第二级|第?2\.5级|第三级|保护)\s*(?:[×x*]\s*(\d+))?$/)) {
          if (entry.level >= 0) throw new Error("\u4E00\u5F20\u5361\u53EA\u6709\u4E00\u4E2A\u7EA7\u522B");
          entry.level = LEVEL_NAMES[match[1]];
          entry.uses = Number(match[2] ?? 1);
        } else if (match = item.match(/^要\s*(?:手里或场上)?另有\s*(.+)$/)) entry.besides.push(parseGroup(match[1], pool));
        else if (match = item.match(/^要\s*额外(?:卡组)?(?:还)?有\s*(.+)$/)) entry.inExtra.push(parseGroup(match[1], pool));
        else if (match = item.match(/^要\s*墓地(?:里)?有\s*(.+)$/)) entry.inGrave.push(parseGroup(match[1], pool));
        else if (match = item.match(/^回合外\s*(?:→|->)\s*(墓地|卡组|额外卡组|额外|手里|手卡|场上)\s*(.+)$/)) {
          entry.reach = { zone: REACH_ZONES[match[1]], group: parseGroup(match[2], pool), count: entry.reach?.count ?? 1 };
        } else if (match = item.match(/^带\s*(\d+)\s*(?:只|张)?$/)) {
          if (entry.reach) entry.reach.count = Number(match[1]);
          else throw new Error('"\u5E26 N \u53EA"\u8981\u5199\u5728"\u56DE\u5408\u5916 \u2192 \u2026"\u540E\u9762');
        } else if (item === "\u5728\u5893\u5730") entry.where = "grave";
        else if (item === "\u5728\u573A\u4E0A\u6216\u5893\u5730") entry.where = "any";
        else if (item === "\u5728\u624B\u91CC") entry.where = "hand";
        else if (item === "\u5728\u573A\u4E0A\u6216\u624B\u91CC") entry.where = "fieldOrHand";
        else if (item === "\u81EA\u5DF1\u56DE\u5408") entry.timing = "own";
        else if (item === "\u53EC\u5524\u65F6") entry.timing = "summon";
        else throw new Error(`\u770B\u4E0D\u61C2"${item}"\uFF0C\u8981\u5199\u4E00\u4E2A\u7EA7\u522B\uFF08\u7B2C0\u7EA7\u3001\u7B2C\u4E00\u7EA7\u3001\u8F6F\u5EB7\u30011.5\u7EA7\u3001\u7B2C\u4E8C\u7EA7\u30012.5\u7EA7\u3001\u7B2C\u4E09\u7EA7\u3001\u4FDD\u62A4\uFF0C\u53EF\u4EE5\u52A0\xD72\uFF09\u3001\u56DE\u5408\u5916 \u2192 <\u5728\u54EA> <\u5361>\u3001\u5E26 N \u53EA\u3001\u8981 \u53E6\u6709 <\u5361>\u3001\u8981 \u989D\u5916\u6709 <\u5361>\u3001\u8981 \u5893\u5730\u6709 <\u5361>\u3001\u5728\u624B\u91CC\u3001\u5728\u5893\u5730\u3001\u5728\u573A\u4E0A\u6216\u5893\u5730\u3001\u5728\u573A\u4E0A\u6216\u624B\u91CC\u3001\u81EA\u5DF1\u56DE\u5408\u3001\u53EC\u5524\u65F6`);
      }
      if (entry.level < 0 && !entry.reach) throw new Error("\u6CA1\u5199\u7EA7\u522B\uFF0C\u4E5F\u6CA1\u5199\u56DE\u5408\u5916\u80FD\u5E26\u51FA\u4EC0\u4E48");
      tiers.lines.push(entry);
    } catch (error) {
      tiers.problems.push(`\u300C${name}\u300D\uFF1A${error instanceof Error ? error.message : error}`);
    }
  }
  return tiers;
}
function resolveTiers(tiers, deckCards, inArchetype) {
  const ids = (group) => deckCards.filter((card) => inGroup(card, group, inArchetype)).map((card) => card.id);
  return tiers.lines.map(({ besides, inExtra, inGrave, reach, ...line }) => ({
    ...line,
    besides: besides.map(ids),
    inExtra: inExtra.map(ids),
    inGrave: inGrave.map(ids),
    reach: reach && { zone: reach.zone, ids: ids(reach.group), count: reach.count }
  }));
}
function boardOrder(a, b3) {
  return b3.value - a.value || a.steps.length - b3.steps.length;
}
var zoneKey = (card) => `${card.code}@${card.location}`;
var ATTRIBUTE_NAMES = { 1: "\u5730", 2: "\u6C34", 4: "\u708E", 8: "\u98CE", 16: "\u5149", 32: "\u6697", 64: "\u795E" };
function combinations(items2, size) {
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  const pick = (start, chosen) => {
    if (chosen.length === size) {
      const signature = chosen.map((index) => zoneKey(items2[index])).sort().join(",");
      if (!seen.has(signature)) {
        seen.add(signature);
        result.push([...chosen]);
      }
      return;
    }
    for (let index = start; index < items2.length && result.length < 40; index++) pick(index + 1, [...chosen, index]);
  };
  pick(0, []);
  return result;
}
var SEEN_SLOTS = 1 << 22;
function sharedSeen(table) {
  return (state2) => {
    let first = 2166136261, second = 2538058380;
    for (let index = 0; index < state2.length; index++) {
      const code = state2.charCodeAt(index);
      first = Math.imul(first ^ code, 16777619);
      second = Math.imul(second ^ code, 1540483477) ^ second >>> 15;
    }
    const key = BigInt.asIntN(64, BigInt(first >>> 0) << 32n | BigInt(second >>> 0 || 1));
    for (let slot = first & SEEN_SLOTS - 1; ; slot = slot + 1 & SEEN_SLOTS - 1) {
      const before = Atomics.compareExchange(table, slot, 0n, key);
      if (before === 0n) return false;
      if (before === key) return true;
    }
  };
}
function createSearcher(engine, setup, cardOf, lines, saveLimit, stopped = () => false, seenBefore) {
  const name = (code) => {
    const card = cardOf(code);
    return card ? card.cn || card.en : String(code);
  };
  const inHandValue = new Set(lines.filter((line) => line.where === "hand").map((line) => line.card.id));
  const valuedIds = new Set(lines.map((line) => line.card.id));
  const isHandTrap = (code) => {
    const card = cardOf(code);
    return card !== void 0 && inHandValue.has(card.id);
  };
  const T = Z;
  let selectionFloor = "";
  let drawn = /* @__PURE__ */ new Map();
  let handCounts = null;
  const fromDraw = (item) => {
    if (item.location !== L.HAND || !drawn.has(item.code)) return false;
    handCounts ??= engine.cards(duel, L.HAND).reduce((counts, info) => counts.set(info.code, (counts.get(info.code) ?? 0) + 1), /* @__PURE__ */ new Map());
    return (handCounts.get(item.code) ?? 0) <= drawn.get(item.code);
  };
  const optionsFor = (message, idleActives) => {
    if (message.player === 1) {
      if (message.type === z.SELECT_CHAIN) return [{ label: "", response: { type: T.SELECT_CHAIN, index: null } }];
      throw new Error(`\u5BF9\u624B\u8981\u505A\u9009\u62E9\uFF08${message.type}\uFF09\uFF0C\u8FD9\u79CD\u60C5\u51B5\u8FD8\u6CA1\u5904\u7406`);
    }
    switch (message.type) {
      case z.SELECT_IDLECMD: {
        const options = [];
        const seen = /* @__PURE__ */ new Set();
        const add = (items2, action, verb, id) => items2.forEach((item, index) => {
          if (verb === "\u53D1\u52A8" && isHandTrap(item.code) || fromDraw(item) || seen.has(verb + id(item))) return;
          seen.add(verb + id(item));
          options.push({ label: `${verb}\u300C${name(item.code)}\u300D`, response: { type: T.SELECT_IDLECMD, action, index } });
        });
        add(message.summons, oe.SELECT_SUMMON, "\u901A\u53EC", (item) => String(item.code));
        add(message.special_summons, oe.SELECT_SPECIAL_SUMMON, "\u7279\u53EC", (item) => String(item.code));
        add(message.activates, oe.SELECT_ACTIVATE, "\u53D1\u52A8", (item) => `${item.code}:${item.description}`);
        const priority = (option) => {
          const item = [message.summons, message.special_summons, message.activates][option.response.action === oe.SELECT_ACTIVATE ? 2 : option.response.action === oe.SELECT_SPECIAL_SUMMON ? 1 : 0][option.response.index];
          return valuedIds.has(cardOf(item.code)?.id ?? -1) ? 0 : 1;
        };
        return options.map((option, index) => ({ option, index })).sort((a, b3) => priority(a.option) - priority(b3.option) || a.index - b3.index).map((entry) => entry.option);
      }
      case z.SELECT_CHAIN: {
        const options = message.forced ? [] : [{ label: "", response: { type: T.SELECT_CHAIN, index: null } }];
        const seen = /* @__PURE__ */ new Set();
        message.selects.forEach((item, index) => {
          const id = `${item.code}:${item.description}`;
          if (isHandTrap(item.code) || fromDraw(item) || idleActives.has(id) || seen.has(id)) return;
          seen.add(id);
          options.push({ label: `\u8FDE\u9501\u53D1\u52A8\u300C${name(item.code)}\u300D`, response: { type: T.SELECT_CHAIN, index } });
        });
        return options.length > 0 ? options : [{ label: "", response: { type: T.SELECT_CHAIN, index: 0 } }];
      }
      case z.SELECT_EFFECTYN:
        return [{ label: `\u53D1\u52A8\u300C${name(message.code)}\u300D`, response: { type: T.SELECT_EFFECTYN, yes: true } }];
      case z.SELECT_YESNO:
        return [{ label: "", response: { type: T.SELECT_YESNO, yes: true } }];
      case z.SELECT_OPTION:
        return message.options.map((_, index) => ({ label: `\u9009\u7B2C ${index + 1} \u4E2A\u6548\u679C`, response: { type: T.SELECT_OPTION, index } }));
      case z.SELECT_CARD:
      case z.SELECT_TRIBUTE: {
        const type = message.type === z.SELECT_CARD ? T.SELECT_CARD : T.SELECT_TRIBUTE;
        const sizes = [.../* @__PURE__ */ new Set([Math.max(message.min, 1), message.max])].filter((size) => size <= message.selects.length);
        return sizes.flatMap((size) => combinations(message.selects, size)).slice(0, 40).map((indicies) => ({
          label: `\u9009 ${indicies.map((index) => name(message.selects[index].code)).join("\u3001")}`,
          response: { type, indicies }
        }));
      }
      case z.SELECT_UNSELECT_CARD: {
        const options = message.can_finish ? [{ label: "", response: { type: T.SELECT_UNSELECT_CARD, index: null } }] : [];
        const seen = /* @__PURE__ */ new Set();
        message.select_cards.forEach((item, index) => {
          if (seen.has(zoneKey(item)) || zoneKey(item) < selectionFloor) return;
          seen.add(zoneKey(item));
          options.push({ label: `\u9009 ${name(item.code)}`, response: { type: T.SELECT_UNSELECT_CARD, index } });
        });
        return options;
      }
      case z.SELECT_SUM: {
        const levels = (card) => [card.amount & 65535, card.amount >>> 16].filter(Boolean);
        const mustSums = message.selects_must.reduce((sums, card) => sums.flatMap((sum) => levels(card).map((level) => sum + level)), [0]);
        const options = [];
        for (let size = 1; size <= Math.min(message.selects.length, 6); size++) {
          for (const indicies of combinations(message.selects, size)) {
            const sums = indicies.reduce((all, index) => all.flatMap((sum) => levels(message.selects[index]).map((level) => sum + level)), mustSums);
            if (sums.includes(message.amount)) {
              options.push({ label: `\u9009 ${indicies.map((index) => name(message.selects[index].code)).join("\u3001")}`, response: { type: T.SELECT_SUM, indicies } });
            }
          }
        }
        return options;
      }
      case z.SELECT_PLACE:
      case z.SELECT_DISFIELD: {
        const mask = message.field_mask;
        let place = null;
        for (let sequence = 0; sequence < 7 && !place; sequence++) if (!(mask & 1 << sequence)) place = { player: 0, location: L.MZONE, sequence };
        for (let sequence = 0; sequence < 5 && !place; sequence++) if (!(mask & 1 << sequence + 8)) place = { player: 0, location: L.SZONE, sequence };
        const type = message.type === z.SELECT_PLACE ? T.SELECT_PLACE : T.SELECT_DISFIELD;
        return [{ label: "", response: { type, places: [place] } }];
      }
      case z.SELECT_POSITION: {
        const position = [I.FACEUP_ATTACK, I.FACEUP_DEFENSE, I.FACEDOWN_DEFENSE].find((option) => message.positions & option);
        return [{ label: "", response: { type: T.SELECT_POSITION, position } }];
      }
      case z.SORT_CARD:
      case z.SORT_CHAIN:
        return [{ label: "", response: { type: T.SORT_CARD, order: null } }];
      case z.ANNOUNCE_ATTRIB: {
        const bits2 = [1, 2, 4, 8, 16, 32, 64].filter((bit) => Number(message.available) & bit);
        if (message.count > 1) return [{ label: "", response: { type: T.ANNOUNCE_ATTRIB, attributes: bits2.slice(0, message.count) } }];
        return bits2.map((bit) => ({ label: `\u5BA3\u8A00${ATTRIBUTE_NAMES[bit]}\u5C5E\u6027`, response: { type: T.ANNOUNCE_ATTRIB, attributes: [bit] } }));
      }
      case z.ANNOUNCE_RACE: {
        const races = [];
        for (let bit = 1n; races.length < message.count && bit <= BigInt(message.available); bit <<= 1n) if (BigInt(message.available) & bit) races.push(bit);
        return [{ label: "", response: { type: T.ANNOUNCE_RACE, races } }];
      }
      case z.ANNOUNCE_NUMBER:
        return message.options.slice(0, 12).map((value) => ({ label: `\u5BA3\u8A00 ${value}`, response: { type: T.ANNOUNCE_NUMBER, value: Number(value) } }));
    }
    throw new Error(`\u89C4\u5219\u5F15\u64CE\u8981\u4E00\u79CD\u8FD8\u6CA1\u5904\u7406\u7684\u9009\u62E9\uFF08${message.type}\uFF09`);
  };
  const duel = engine.newDuel(setup.hand, setup.main, setup.extra);
  const copyLine = (line) => ({ ...line, steps: [...line.steps], activations: [...line.activations], drawn: new Map(line.drawn) });
  const toDecision = (line) => {
    while (true) {
      const message = engine.advance(duel, (event) => {
        if (event.type === z.CHAINING && event.controller === 0) line.activations.push(`${event.code}:${event.description}`);
        if (event.type === z.SUMMONING) line.normalSummoned = true;
        if (event.type === z.DRAW && event.player === 0) for (const card of event.drawn) line.drawn.set(card.code, (line.drawn.get(card.code) ?? 0) + 1);
      });
      handCounts = null;
      drawn = line.drawn;
      if (!message || message.type === z.SELECT_IDLECMD && message.player === 1) return null;
      if (message.type !== z.SELECT_UNSELECT_CARD) line.floor = "";
      selectionFloor = line.floor;
      const options = optionsFor(message, line.idleActives);
      if (message.type === z.SELECT_IDLECMD) line.idleActives = new Set(message.activates.map((item) => `${item.code}:${item.description}`));
      if (options.length === 1 && message.type !== z.SELECT_IDLECMD) {
        if (options[0].label) line.steps.push(options[0].label);
        engine.respond(duel, options[0].response);
        continue;
      }
      if (options.length === 0 && message.type !== z.SELECT_IDLECMD) return null;
      return { message, options };
    }
  };
  const choose2 = (line, message, option) => {
    if (option.label) line.steps.push(option.label);
    if (message.type === z.SELECT_UNSELECT_CARD && option.response.index !== null) line.floor = zoneKey(message.select_cards[option.response.index]);
    engine.respond(duel, option.response);
  };
  const valued = new Set(lines.filter((line) => line.where !== "hand").map((line) => line.card.id));
  const known = (codes) => codes.map((info) => cardOf(info.code)).filter((card) => card !== void 0);
  const autoAdvance = () => {
    let opponentTurn = false;
    while (true) {
      const message = engine.advance(duel, (event) => {
        if (event.type === z.NEW_TURN && event.player === 1) opponentTurn = true;
      });
      if (!message || opponentTurn || message.player === 1 && message.type === z.SELECT_IDLECMD) return null;
      if (message.type === z.SELECT_IDLECMD) return message;
      selectionFloor = "";
      const options = optionsFor(message, /* @__PURE__ */ new Set());
      const activate = message.type === z.SELECT_CHAIN ? options.find((option) => option.response.index !== null && [L.GRAVE, L.REMOVED].includes(message.selects[option.response.index].location)) : void 0;
      engine.respond(duel, (activate ?? options[0]).response);
    }
  };
  const evaluate = (idle, steps) => {
    let message = idle;
    for (let guard = 0; guard < 10 && message; guard++) {
      handCounts = null;
      const index = message.spell_sets.findIndex((item) => valued.has(cardOf(item.code)?.id ?? -1) && !fromDraw(item));
      if (index < 0) break;
      engine.respond(duel, { type: Z.SELECT_IDLECMD, action: oe.SELECT_SPELL_SET, index });
      message = autoAdvance();
    }
    if (message) {
      engine.respond(duel, { type: Z.SELECT_IDLECMD, action: oe.TO_EP, index: null });
      autoAdvance();
    }
    const field = known(engine.cards(duel, L.MZONE).filter((info) => info.position & I.FACEUP));
    const sets = known(engine.cards(duel, L.SZONE)).filter((card) => !zhKinds(card).kinds.has("\u602A\u517D"));
    const grave = known(engine.cards(duel, L.GRAVE));
    const hand = known(engine.cards(duel, L.HAND));
    const extra = known(engine.cards(duel, L.EXTRA));
    const notDrawn = [...hand];
    for (const [code, count] of drawn) {
      for (let i2 = 0; i2 < count; i2++) {
        const index = notDrawn.findIndex((card) => card === cardOf(code));
        if (index >= 0) notDrawn.splice(index, 1);
      }
    }
    const counted = [];
    const countedNames = /* @__PURE__ */ new Set();
    const onBoard = [...field, ...sets];
    const deckCards = known(engine.cards(duel, L.DECK));
    const zones = { grave, deck: deckCards, extra, hand: notDrawn, field: onBoard };
    const conditionsHold = (line, card) => {
      const others = [...onBoard, ...hand].filter((other) => other !== card);
      return line.besides.every((ids) => others.some((other) => ids.includes(other.id))) && line.inExtra.every((ids) => extra.some((other) => ids.includes(other.id))) && line.inGrave.every((ids) => grave.some((other) => ids.includes(other.id)));
    };
    const worth = (card, line, reached, depth, names3) => {
      const chain = [];
      let value2 = 0;
      if (line.level >= 0 && !(reached && line.timing === "own") && !(!reached && line.timing === "summon")) {
        value2 = line.timing === "own" ? OWN_TURN_VALUE : LEVELS[line.level].weight * line.uses;
      }
      if (line.reach && depth < REACH_DEPTH) {
        for (let picked = 0; picked < line.reach.count; picked++) {
          let best = null;
          const tried = /* @__PURE__ */ new Set();
          for (const other of zones[line.reach.zone]) {
            if (other === card || names3.has(other.id) || tried.has(other.id) || !line.reach.ids.includes(other.id)) continue;
            tried.add(other.id);
            const otherLine = lines.find((candidate) => candidate.card.id === other.id);
            if (!otherLine || !conditionsHold(otherLine, other)) continue;
            const trial = new Set(names3);
            trial.add(other.id);
            const result = worth(other, otherLine, true, depth + 1, trial);
            if (!best || result.value > best.value) best = { other, line: otherLine, trial, ...result };
          }
          if (!best || best.value <= 0) break;
          best.trial.forEach((id) => names3.add(id));
          const own = best.value - best.chain.reduce((sum, item) => sum + item.value, 0);
          chain.push({ card: best.other, level: best.line.level, uses: best.line.uses, place: "\u5E26\u51FA", value: own, ownTurn: false, via: card }, ...best.chain);
          value2 += best.value;
        }
      }
      return { value: value2, chain };
    };
    const consider = (cards, place, wheres) => {
      for (const card of new Set(cards)) {
        const line = lines.find((candidate) => candidate.card.id === card.id);
        if (!line || !wheres.includes(line.where) || countedNames.has(card.id)) continue;
        if (!conditionsHold(line, card)) continue;
        countedNames.add(card.id);
        const result = worth(card, line, false, 0, countedNames);
        const own = result.value - result.chain.reduce((sum, item) => sum + item.value, 0);
        if (own > 0 || result.chain.length > 0) {
          counted.push({ card, level: line.level, uses: line.uses, place, value: own, ownTurn: line.timing === "own" }, ...result.chain);
        }
      }
    };
    consider(onBoard, "\u573A\u4E0A", ["field", "any", "fieldOrHand"]);
    consider(grave, "\u5893\u5730", ["grave", "any"]);
    consider(notDrawn, "\u624B\u91CC", ["hand", "fieldOrHand"]);
    const value = counted.reduce((sum, item) => sum + item.value, 0);
    return { value, field, sets, counted, steps };
  };
  const local = /* @__PURE__ */ new Set();
  let states = 0;
  const alreadySeen = seenBefore ?? ((state2) => local.has(state2) || (local.add(state2), false));
  let found = /* @__PURE__ */ new Map();
  let nodes = 0;
  let budget = 0;
  let saves = 0;
  const buffers = [];
  const record = (board) => {
    const id = [...board.field, ...board.sets].map((card) => card.id).sort().join(",");
    const known2 = found.get(id);
    if (!known2 || boardOrder(board, known2) < 0) found.set(id, board);
  };
  let interrupted = false;
  const visit = (line, message, options, restore) => {
    if (nodes >= budget || interrupted) return;
    if (stopped()) {
      interrupted = true;
      return;
    }
    nodes++;
    const state2 = [L.MZONE, L.SZONE, L.HAND, L.GRAVE, L.REMOVED, L.EXTRA].map((location) => engine.cards(duel, location).map((info) => `${info.code}${info.position & I.FACEUP ? "u" : "d"}`).sort().join(",")).join("|") + `|${[...line.activations].sort().join(",")}|${line.normalSummoned}|${message.type}|${options.map((option) => option.label).join(";")}|${line.floor}`;
    if (alreadySeen(state2)) return;
    states++;
    const isIdle = message.type === z.SELECT_IDLECMD;
    let back = restore;
    let saved = false;
    if ((options.length > 1 || isIdle && options.length > 0) && saves < saveLimit) {
      const snapshot = engine.save(buffers[saves]);
      buffers[saves] = snapshot;
      saves++;
      saved = true;
      back = () => engine.load(snapshot);
    }
    if (isIdle) {
      drawn = line.drawn;
      record(evaluate(message, line.steps));
    }
    for (let index = 0; index < options.length && nodes < budget && !interrupted; index++) {
      if (index > 0 || isIdle) back();
      const child = copyLine(line);
      choose2(child, message, options[index]);
      const next = toDecision(child);
      if (!next) continue;
      const parentBack = back;
      const option = options[index];
      const childRestore = () => {
        parentBack();
        const replayed = copyLine(line);
        choose2(replayed, message, option);
        toDecision(replayed);
      };
      visit(child, next.message, next.options, childRestore);
    }
    if (saved) saves--;
  };
  const start = engine.save();
  const newLine = () => ({ steps: [], activations: [], normalSummoned: false, idleActives: /* @__PURE__ */ new Set(), drawn: /* @__PURE__ */ new Map(), floor: "" });
  const navigate = (path) => {
    engine.load(start);
    const line = newLine();
    let decision = toDecision(line);
    for (const index of path) {
      if (!decision) return null;
      choose2(line, decision.message, decision.options[index]);
      decision = toDecision(line);
    }
    return decision ? { line, ...decision } : null;
  };
  return {
    /** The first actions available from the opening hand. */
    firstChoices: () => navigate([])?.options.map((option) => option.label) ?? [],
    /** The number of choices at a node, and its board if it is a main phase decision. */
    expand(path) {
      const node = navigate(path);
      if (!node) return null;
      let board = null;
      if (node.message.type === z.SELECT_IDLECMD) {
        drawn = node.line.drawn;
        board = evaluate(node.message, node.line.steps);
      }
      return { count: node.options.length, board };
    },
    /** Search below a node with a budget of nodes; the boards found, best first. */
    explore(path, limit) {
      nodes = 0;
      budget = limit;
      interrupted = false;
      found = /* @__PURE__ */ new Map();
      const node = navigate(path);
      if (node) visit(node.line, node.message, node.options, () => {
        navigate(path);
      });
      return { nodes, complete: nodes < limit && !interrupted, boards: [...found.values()].sort(boardOrder).slice(0, 30) };
    },
    states: () => states
  };
}
function summarize(firsts, results, taskCounts, extraBoards, states, seconds) {
  const best = /* @__PURE__ */ new Map();
  const add = (board) => {
    const id = [...board.field, ...board.sets].map((card) => card.id).sort().join(",");
    const known = best.get(id);
    if (!known || boardOrder(board, known) < 0) best.set(id, board);
  };
  extraBoards.forEach(add);
  const branches = firsts.map((first, index) => {
    const mine = results.filter((result) => result.first === index);
    mine.forEach((result) => result.explored.boards.forEach(add));
    const boards = mine.flatMap((result) => result.explored.boards).sort(boardOrder);
    return {
      first,
      nodes: mine.reduce((sum, result) => sum + result.explored.nodes, 0),
      complete: mine.length === taskCounts[index] && mine.every((result) => result.explored.complete),
      best: boards[0] ?? null
    };
  });
  return { boards: [...best.values()].sort(boardOrder), branches, states, seconds };
}
function planHand(engine, setup, cardOf, lines, nodeLimit = 3e4) {
  const started = performance.now();
  const searcher = createSearcher(engine, setup, cardOf, lines, 64);
  const firsts = searcher.firstChoices();
  const share = Math.floor(nodeLimit / Math.max(firsts.length, 1));
  const results = firsts.map((_, first) => ({ first, explored: searcher.explore([first], share) }));
  return summarize(firsts, results, firsts.map(() => 1), [], searcher.states(), (performance.now() - started) / 1e3);
}
if (!isMainThread && workerData?.role === "plan-worker") void runWorker(workerData);
async function runWorker({ setup, cards, lines, saveLimit, shared, seen }) {
  const byCode = new Map(cards);
  const counters = new Int32Array(shared);
  const engine = await startEngine(await loadEngineData(Infinity));
  const stopped = () => Atomics.add(counters, 0, 1) >= 0 && Atomics.load(counters, 1) === 1;
  const searcher = createSearcher(engine, setup, (code) => byCode.get(code), lines, saveLimit, stopped, sharedSeen(new BigInt64Array(seen)));
  parentPort.on("message", (task) => {
    parentPort.postMessage({ id: task.id, explored: searcher.explore(task.path, Infinity), states: searcher.states() });
  });
  parentPort.postMessage({ ready: true });
}
async function planParallel(engine, setup, cardOf, cards, lines, limits, threads = Math.max(1, Math.min(availableParallelism() - 1, 8))) {
  const started = performance.now();
  const searcher = createSearcher(engine, setup, cardOf, lines, 8);
  const firsts = searcher.firstChoices();
  let frontier = firsts.map((_, first) => ({ first, path: [first] }));
  const extraBoards = [];
  for (let depth = 0; depth < 6 && frontier.length < threads * 12; depth++) {
    const next = [];
    for (const task of frontier) {
      const node = searcher.expand(task.path);
      if (!node) continue;
      if (node.board) extraBoards.push(node.board);
      for (let index = 0; index < node.count; index++) next.push({ first: task.first, path: [...task.path, index] });
    }
    if (next.length === 0) break;
    frontier = next;
  }
  const byFirst = firsts.map((_, first) => frontier.filter((task) => task.first === first));
  const queue = [];
  for (let round = 0; queue.length < frontier.length; round++) {
    for (const group of byFirst) if (group[round]) queue.push({ ...group[round], id: queue.length });
  }
  const taskCounts = byFirst.map((group) => group.length);
  const taskFirst = queue.map((task) => task.first);
  const results = [];
  let states = 0;
  const shared = new SharedArrayBuffer(8);
  const counters = new Int32Array(shared);
  const deadline = started + limits.seconds * 1e3;
  const watch = setInterval(() => {
    if (Atomics.load(counters, 0) >= limits.nodes || performance.now() >= deadline) Atomics.store(counters, 1, 1);
  }, 50);
  const workerSetup = {
    role: "plan-worker",
    setup,
    cards,
    lines,
    saveLimit: Math.max(8, Math.floor(128 / threads)),
    shared,
    seen: new SharedArrayBuffer(SEEN_SLOTS * 8)
  };
  try {
    await Promise.all(Array.from({ length: Math.min(threads, queue.length) }, () => new Promise((resolve, reject) => {
      const worker = new Worker2(new URL(import.meta.url), { workerData: workerSetup });
      let workerStates = 0;
      const next = () => {
        const task = Atomics.load(counters, 1) === 1 ? void 0 : queue.shift();
        if (task) worker.postMessage(task);
        else {
          states += workerStates;
          void worker.terminate().then(() => resolve());
        }
      };
      worker.on("message", (message) => {
        if (!message.ready) {
          results.push({ first: taskFirst[message.id], explored: message.explored });
          workerStates = message.states;
        }
        next();
      });
      worker.on("error", reject);
    })));
  } finally {
    clearInterval(watch);
  }
  return summarize(firsts, results, taskCounts, extraBoards, states, (performance.now() - started) / 1e3);
}
async function planText(input, handText, tiersText, limits) {
  const { cards, deck } = await loadDeck(input);
  const deckCards = [...deck.main, ...deck.extra].map((entry) => entry.card);
  let data = await loadEngineData();
  if (deckCards.some((card) => !engineKnows(card, data))) data = await loadEngineData(300);
  const missing = deckCards.filter((card) => !engineKnows(card, data));
  const code = (card) => [card.id, ...card.altIds].find((id) => data.has(id)) ?? card.id;
  const pile = deck.main.flatMap((entry) => Array(entry.count).fill(entry.card));
  const names3 = handText.split(/[,，、;；\n]/).map((part) => part.trim()).filter(Boolean);
  if (names3.length === 0 || names3.length > 6) throw new Error(`\u8D77\u624B\u8981\u5199 1\uFF5E6 \u5F20\u5361\uFF0C\u73B0\u5728\u662F ${names3.length} \u5F20`);
  const hand = names3.map((name) => {
    let index = pile.findIndex((card) => hasName(card, name));
    if (index < 0) {
      const partial = [...new Set(pile.filter((card) => [card.cn, card.md, card.en].some((cardName) => cardName && norm(cardName).includes(norm(name)))))];
      if (partial.length !== 1) throw new Error(`\u8D77\u624B\u91CC\u7684\u300C${name}\u300D${partial.length > 1 ? "\u5BF9\u4E0A\u4E86\u597D\u51E0\u5F20\u5361" : "\u4E0D\u5728\u4E3B\u5361\u7EC4\u91CC\uFF0C\u6216\u8005\u5DF2\u7ECF\u7528\u5B8C\u4E86\u5F20\u6570"}`);
      index = pile.indexOf(partial[0]);
    }
    return pile.splice(index, 1)[0];
  });
  const tiers = parseTiers(tiersText, deck, cards);
  const byCode = /* @__PURE__ */ new Map();
  for (const card of [...cards, ...deckCards]) for (const id of [code(card), card.id, ...card.altIds]) byCode.set(id, card);
  const engine = await startEngine(data);
  const setup = { hand: hand.map(code), main: pile.map(code), extra: deck.extra.flatMap((entry) => Array(entry.count).fill(code(entry.card))) };
  const lines = resolveTiers(tiers, deckCards, archetypesOf(cards));
  const result = await planParallel(engine, setup, (id) => byCode.get(id), [...byCode], lines, limits);
  const libraries = [...engine.missingScripts].filter((name) => !/^c\d+\.lua$/.test(name));
  return formatPlan(hand, result, tiers.problems, missing, libraries);
}

export {
  CONFIG_DIR,
  writeText,
  LEVELS,
  parseTiers,
  resolveTiers,
  boardOrder,
  SEEN_SLOTS,
  sharedSeen,
  planHand,
  planParallel,
  planText,
  lookup,
  search,
  importDeck,
  odds,
  banlistText,
  refresh
};
