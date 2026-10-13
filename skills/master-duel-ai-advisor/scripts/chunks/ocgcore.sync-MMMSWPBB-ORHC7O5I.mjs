#!/usr/bin/env node
import {
  o
} from "./chunk-KT3BCFM7.mjs";
import {
  n
} from "./chunk-5P7U5YBU.mjs";

// node_modules/@n1xx1/ocgcore-wasm/dist/ocgcore.sync-MMMSWPBB.js
var me = (async function(Hr = {}) {
  var cr, a = Hr, pr, J, Gr = new Promise((r, e) => {
    pr = r, J = e;
  }), Qr = o, q = "", vr;
  try {
    q = new URL(".", Qr).href;
  } catch {
  }
  vr = async (r) => {
    if (r = await fetch(r, { credentials: "same-origin" }), r.ok) return r.arrayBuffer();
    throw Error(r.status + " : " + r.url);
  };
  var b = console.log.bind(console), $ = console.error.bind(console), _, L, yr = false, g, y, j, E, D, dr, H, mr, gr = false;
  function Rr() {
    var r = L.buffer;
    a.HEAP8 = g = new Int8Array(r), j = new Int16Array(r), a.HEAPU8 = y = new Uint8Array(r), new Uint16Array(r), E = new Int32Array(r), D = new Uint32Array(r), dr = new Float32Array(r), mr = new Float64Array(r), H = new BigInt64Array(r), new BigUint64Array(r);
  }
  var I = 0, V = null;
  function z(r) {
    throw a.onAbort?.(r), r = "Aborted(" + r + ")", $(r), yr = true, r += ". Build with -sASSERTIONS for more info.", gr && pe(), r = new WebAssembly.RuntimeError(r), J(r), r;
  }
  var rr;
  async function Kr(r) {
    if (!_) try {
      var e = await vr(r);
      return new Uint8Array(e);
    } catch {
    }
    if (r == rr && _) r = new Uint8Array(_);
    else throw "both async and sync fetching of the wasm failed";
    return r;
  }
  async function Jr(r, e) {
    try {
      var t = await Kr(r);
      return await WebAssembly.instantiate(t, e);
    } catch (n2) {
      $(`failed to asynchronously prepare wasm: ${n2}`), z(n2);
    }
  }
  async function qr(r) {
    var e = rr;
    if (!_ && typeof WebAssembly.instantiateStreaming == "function") try {
      var t = fetch(e, { credentials: "same-origin" });
      return await WebAssembly.instantiateStreaming(t, r);
    } catch (n2) {
      $(`wasm streaming compile failed: ${n2}`), $("falling back to ArrayBuffer instantiation");
    }
    return Jr(e, r);
  }
  var Nr = (r) => {
    for (; 0 < r.length; ) r.shift()(a);
  }, Ar = [], Pr = [], br = () => {
    var r = a.preRun.shift();
    Pr.push(r);
  }, Or = typeof TextDecoder < "u" ? new TextDecoder() : void 0, d = (r, e = 0) => {
    for (var t = e + NaN, n2 = e; r[n2] && !(n2 >= t); ) ++n2;
    if (16 < n2 - e && r.buffer && Or) return Or.decode(r.subarray(e, n2));
    for (t = ""; e < n2; ) {
      var o2 = r[e++];
      if (o2 & 128) {
        var i = r[e++] & 63;
        if ((o2 & 224) == 192) t += String.fromCharCode((o2 & 31) << 6 | i);
        else {
          var f = r[e++] & 63;
          o2 = (o2 & 240) == 224 ? (o2 & 15) << 12 | i << 6 | f : (o2 & 7) << 18 | i << 12 | f << 6 | r[e++] & 63, 65536 > o2 ? t += String.fromCharCode(o2) : (o2 -= 65536, t += String.fromCharCode(55296 | o2 >> 10, 56320 | o2 & 1023));
        }
      } else t += String.fromCharCode(o2);
    }
    return t;
  }, Sr = (r, e) => {
    for (var t = 0, n2 = r.length - 1; 0 <= n2; n2--) {
      var o2 = r[n2];
      o2 === "." ? r.splice(n2, 1) : o2 === ".." ? (r.splice(n2, 1), t++) : t && (r.splice(n2, 1), t--);
    }
    if (e) for (; t; t--) r.unshift("..");
    return r;
  }, Er = (r) => {
    var e = r.charAt(0) === "/", t = r.slice(-1) === "/";
    return (r = Sr(r.split("/").filter((n2) => !!n2), !e).join("/")) || e || (r = "."), r && t && (r += "/"), (e ? "/" : "") + r;
  }, Dr = (r) => {
    var e = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(r).slice(1);
    return r = e[0], e = e[1], !r && !e ? "." : (e && (e = e.slice(0, -1)), r + e);
  }, G = (r) => r && r.match(/([^\/]+|\/)\/*$/)[1], re = () => (r) => crypto.getRandomValues(r), Ur = (r) => {
    (Ur = re())(r);
  }, ee = (...r) => {
    for (var e = "", t = false, n2 = r.length - 1; -1 <= n2 && !t; n2--) {
      if (t = 0 <= n2 ? r[n2] : "/", typeof t != "string") throw new TypeError("Arguments to path.resolve must be strings");
      if (!t) return "";
      e = t + "/" + e, t = t.charAt(0) === "/";
    }
    return e = Sr(e.split("/").filter((o2) => !!o2), !t).join("/"), (t ? "/" : "") + e || ".";
  }, er = [], tr = (r) => {
    for (var e = 0, t = 0; t < r.length; ++t) {
      var n2 = r.charCodeAt(t);
      127 >= n2 ? e++ : 2047 >= n2 ? e += 2 : 55296 <= n2 && 57343 >= n2 ? (e += 4, ++t) : e += 3;
    }
    return e;
  }, nr = (r, e, t, n2) => {
    if (!(0 < n2)) return 0;
    var o2 = t;
    n2 = t + n2 - 1;
    for (var i = 0; i < r.length; ++i) {
      var f = r.charCodeAt(i);
      if (55296 <= f && 57343 >= f) {
        var h = r.charCodeAt(++i);
        f = 65536 + ((f & 1023) << 10) | h & 1023;
      }
      if (127 >= f) {
        if (t >= n2) break;
        e[t++] = f;
      } else {
        if (2047 >= f) {
          if (t + 1 >= n2) break;
          e[t++] = 192 | f >> 6;
        } else {
          if (65535 >= f) {
            if (t + 2 >= n2) break;
            e[t++] = 224 | f >> 12;
          } else {
            if (t + 3 >= n2) break;
            e[t++] = 240 | f >> 18, e[t++] = 128 | f >> 12 & 63;
          }
          e[t++] = 128 | f >> 6 & 63;
        }
        e[t++] = 128 | f & 63;
      }
    }
    return e[t] = 0, t - o2;
  }, kr = [];
  function Tr(r, e) {
    kr[r] = { input: [], output: [], aa: e }, ur(r, te);
  }
  var te = { open(r) {
    var e = kr[r.node.ka];
    if (!e) throw new u(43);
    r.R = e, r.seekable = false;
  }, close(r) {
    r.R.aa.ia(r.R);
  }, ia(r) {
    r.R.aa.ia(r.R);
  }, read(r, e, t, n2) {
    if (!r.R || !r.R.aa.va) throw new u(60);
    for (var o2 = 0, i = 0; i < n2; i++) {
      try {
        var f = r.R.aa.va(r.R);
      } catch {
        throw new u(29);
      }
      if (f === void 0 && o2 === 0) throw new u(6);
      if (f == null) break;
      o2++, e[t + i] = f;
    }
    return o2 && (r.node.ca = Date.now()), o2;
  }, write(r, e, t, n2) {
    if (!r.R || !r.R.aa.ra) throw new u(60);
    try {
      for (var o2 = 0; o2 < n2; o2++) r.R.aa.ra(r.R, e[t + o2]);
    } catch {
      throw new u(29);
    }
    return n2 && (r.node.V = r.node.T = Date.now()), o2;
  } }, ne = { va() {
    r: {
      if (!er.length) {
        var r = null;
        if (typeof window < "u" && typeof window.prompt == "function" && (r = window.prompt("Input: "), r !== null && (r += `
`)), !r) {
          var e = null;
          break r;
        }
        e = Array(tr(r) + 1), r = nr(r, e, 0, e.length), e.length = r, er = e;
      }
      e = er.shift();
    }
    return e;
  }, ra(r, e) {
    e === null || e === 10 ? (b(d(r.output)), r.output = []) : e != 0 && r.output.push(e);
  }, ia(r) {
    0 < r.output?.length && (b(d(r.output)), r.output = []);
  }, Da() {
    return { Na: 25856, Pa: 5, Ma: 191, Oa: 35387, La: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
  }, Ea() {
    return 0;
  }, Fa() {
    return [24, 80];
  } }, oe = { ra(r, e) {
    e === null || e === 10 ? ($(d(r.output)), r.output = []) : e != 0 && r.output.push(e);
  }, ia(r) {
    0 < r.output?.length && ($(d(r.output)), r.output = []);
  } }, s = { Y: null, $() {
    return s.createNode(null, "/", 16895, 0);
  }, createNode(r, e, t, n2) {
    if ((t & 61440) === 24576 || (t & 61440) === 4096) throw new u(63);
    return s.Y || (s.Y = { dir: { node: { ba: s.N.ba, Z: s.N.Z, fa: s.N.fa, ja: s.N.ja, Aa: s.N.Aa, na: s.N.na, la: s.N.la, sa: s.N.sa, ma: s.N.ma }, stream: { X: s.O.X } }, file: { node: { ba: s.N.ba, Z: s.N.Z }, stream: { X: s.O.X, read: s.O.read, write: s.O.write, xa: s.O.xa, za: s.O.za } }, link: { node: { ba: s.N.ba, Z: s.N.Z, ga: s.N.ga }, stream: {} }, ta: { node: { ba: s.N.ba, Z: s.N.Z }, stream: se } }), t = Mr(r, e, t, n2), v(t.mode) ? (t.N = s.Y.dir.node, t.O = s.Y.dir.stream, t.P = {}) : (t.mode & 61440) === 32768 ? (t.N = s.Y.file.node, t.O = s.Y.file.stream, t.S = 0, t.P = null) : (t.mode & 61440) === 40960 ? (t.N = s.Y.link.node, t.O = s.Y.link.stream) : (t.mode & 61440) === 8192 && (t.N = s.Y.ta.node, t.O = s.Y.ta.stream), t.ca = t.V = t.T = Date.now(), r && (r.P[e] = t, r.ca = r.V = r.T = t.ca), t;
  }, Ta(r) {
    return r.P ? r.P.subarray ? r.P.subarray(0, r.S) : new Uint8Array(r.P) : new Uint8Array(0);
  }, N: { ba(r) {
    var e = {};
    return e.Qa = (r.mode & 61440) === 8192 ? r.id : 1, e.Va = r.id, e.mode = r.mode, e.Wa = 1, e.uid = 0, e.Ua = 0, e.ka = r.ka, v(r.mode) ? e.size = 4096 : (r.mode & 61440) === 32768 ? e.size = r.S : (r.mode & 61440) === 40960 ? e.size = r.link.length : e.size = 0, e.ca = new Date(r.ca), e.V = new Date(r.V), e.T = new Date(r.T), e.Ba = 4096, e.Ka = Math.ceil(e.size / e.Ba), e;
  }, Z(r, e) {
    for (var t of ["mode", "atime", "mtime", "ctime"]) e[t] != null && (r[t] = e[t]);
    e.size !== void 0 && (e = e.size, r.S != e && (e == 0 ? (r.P = null, r.S = 0) : (t = r.P, r.P = new Uint8Array(e), t && r.P.set(t.subarray(0, Math.min(e, r.S))), r.S = e)));
  }, fa() {
    throw s.ua;
  }, ja(r, e, t, n2) {
    return s.createNode(r, e, t, n2);
  }, Aa(r, e, t) {
    try {
      var n2 = x(e, t);
    } catch {
    }
    if (n2) {
      if (v(r.mode)) for (var o2 in n2.P) throw new u(55);
      ar(n2);
    }
    delete r.parent.P[r.name], e.P[t] = r, r.name = t, e.T = e.V = r.parent.T = r.parent.V = Date.now();
  }, na(r, e) {
    delete r.P[e], r.T = r.V = Date.now();
  }, la(r, e) {
    var t = x(r, e), n2;
    for (n2 in t.P) throw new u(55);
    delete r.P[e], r.T = r.V = Date.now();
  }, sa(r) {
    return [".", "..", ...Object.keys(r.P)];
  }, ma(r, e, t) {
    return r = s.createNode(r, e, 41471, 0), r.link = t, r;
  }, ga(r) {
    if ((r.mode & 61440) !== 40960) throw new u(28);
    return r.link;
  } }, O: { read(r, e, t, n2, o2) {
    var i = r.node.P;
    if (o2 >= r.node.S) return 0;
    if (r = Math.min(r.node.S - o2, n2), 8 < r && i.subarray) e.set(i.subarray(o2, o2 + r), t);
    else for (n2 = 0; n2 < r; n2++) e[t + n2] = i[o2 + n2];
    return r;
  }, write(r, e, t, n2, o2, i) {
    if (e.buffer === g.buffer && (i = false), !n2) return 0;
    if (r = r.node, r.V = r.T = Date.now(), e.subarray && (!r.P || r.P.subarray)) {
      if (i) return r.P = e.subarray(t, t + n2), r.S = n2;
      if (r.S === 0 && o2 === 0) return r.P = e.slice(t, t + n2), r.S = n2;
      if (o2 + n2 <= r.S) return r.P.set(e.subarray(t, t + n2), o2), n2;
    }
    i = o2 + n2;
    var f = r.P ? r.P.length : 0;
    if (f >= i || (i = Math.max(i, f * (1048576 > f ? 2 : 1.125) >>> 0), f != 0 && (i = Math.max(i, 256)), f = r.P, r.P = new Uint8Array(i), 0 < r.S && r.P.set(f.subarray(0, r.S), 0)), r.P.subarray && e.subarray) r.P.set(e.subarray(t, t + n2), o2);
    else for (i = 0; i < n2; i++) r.P[o2 + i] = e[t + i];
    return r.S = Math.max(r.S, o2 + n2), n2;
  }, X(r, e, t) {
    if (t === 1 ? e += r.position : t === 2 && (r.node.mode & 61440) === 32768 && (e += r.node.S), 0 > e) throw new u(28);
    return e;
  }, xa(r, e, t, n2, o2) {
    if ((r.node.mode & 61440) !== 32768) throw new u(43);
    if (r = r.node.P, o2 & 2 || !r || r.buffer !== g.buffer) {
      if (n2 = true, z(), o2 = void 0, !o2) throw new u(48);
      r && ((0 < t || t + e < r.length) && (r.subarray ? r = r.subarray(t, t + e) : r = Array.prototype.slice.call(r, t, t + e)), g.set(r, o2));
    } else n2 = false, o2 = r.byteOffset;
    return { Ya: o2, Ja: n2 };
  }, za(r, e, t, n2) {
    return s.O.write(r, e, 0, n2, t, false), 0;
  } } }, ie = (r, e) => {
    var t = 0;
    return r && (t |= 365), e && (t |= 146), t;
  }, or = null, $r = {}, C = [], ae = 1, U = null, Ir = false, Cr = true, xr = {}, u = class {
    constructor(r) {
      n(this, "name", "ErrnoError");
      this.U = r;
    }
  }, ue = class {
    constructor() {
      n(this, "ha", {});
      n(this, "node", null);
    }
    get flags() {
      return this.ha.flags;
    }
    set flags(r) {
      this.ha.flags = r;
    }
    get position() {
      return this.ha.position;
    }
    set position(r) {
      this.ha.position = r;
    }
  }, fe = class {
    constructor(r, e, t, n2) {
      n(this, "N", {});
      n(this, "O", {});
      n(this, "da", null);
      r || (r = this), this.parent = r, this.$ = r.$, this.id = ae++, this.name = e, this.mode = t, this.ka = n2, this.ca = this.V = this.T = Date.now();
    }
    get read() {
      return (this.mode & 365) === 365;
    }
    set read(r) {
      r ? this.mode |= 365 : this.mode &= -366;
    }
    get write() {
      return (this.mode & 146) === 146;
    }
    set write(r) {
      r ? this.mode |= 146 : this.mode &= -147;
    }
  };
  function k(r, e = {}) {
    if (!r) throw new u(44);
    e.pa ?? (e.pa = true), r.charAt(0) === "/" || (r = "//" + r);
    var t = 0;
    r: for (; 40 > t; t++) {
      r = r.split("/").filter((h) => !!h);
      for (var n2 = or, o2 = "/", i = 0; i < r.length; i++) {
        var f = i === r.length - 1;
        if (f && e.parent) break;
        if (r[i] !== ".") if (r[i] === "..") if (o2 = Dr(o2), n2 === n2.parent) {
          r = o2 + "/" + r.slice(i + 1).join("/");
          continue r;
        } else n2 = n2.parent;
        else {
          o2 = Er(o2 + "/" + r[i]);
          try {
            n2 = x(n2, r[i]);
          } catch (h) {
            if (h?.U === 44 && f && e.Ha) return { path: o2 };
            throw h;
          }
          if (!n2.da || f && !e.pa || (n2 = n2.da.root), (n2.mode & 61440) === 40960 && (!f || e.oa)) {
            if (!n2.N.ga) throw new u(52);
            n2 = n2.N.ga(n2), n2.charAt(0) === "/" || (n2 = Dr(o2) + "/" + n2), r = n2 + "/" + r.slice(i + 1).join("/");
            continue r;
          }
        }
      }
      return { path: o2, node: n2 };
    }
    throw new u(32);
  }
  function Wr(r) {
    for (var e; ; ) {
      if (r === r.parent) return r = r.$.ya, e ? r[r.length - 1] !== "/" ? `${r}/${e}` : r + e : r;
      e = e ? `${r.name}/${e}` : r.name, r = r.parent;
    }
  }
  function ir(r, e) {
    for (var t = 0, n2 = 0; n2 < e.length; n2++) t = (t << 5) - t + e.charCodeAt(n2) | 0;
    return (r + t >>> 0) % U.length;
  }
  function ar(r) {
    var e = ir(r.parent.id, r.name);
    if (U[e] === r) U[e] = r.ea;
    else for (e = U[e]; e; ) {
      if (e.ea === r) {
        e.ea = r.ea;
        break;
      }
      e = e.ea;
    }
  }
  function x(r, e) {
    var t = v(r.mode) ? (t = B(r, "x")) ? t : r.N.fa ? 0 : 2 : 54;
    if (t) throw new u(t);
    for (t = U[ir(r.id, e)]; t; t = t.ea) {
      var n2 = t.name;
      if (t.parent.id === r.id && n2 === e) return t;
    }
    return r.N.fa(r, e);
  }
  function Mr(r, e, t, n2) {
    return r = new fe(r, e, t, n2), e = ir(r.parent.id, r.name), r.ea = U[e], U[e] = r;
  }
  function v(r) {
    return (r & 61440) === 16384;
  }
  function _r(r) {
    var e = ["r", "w", "rw"][r & 3];
    return r & 512 && (e += "w"), e;
  }
  function B(r, e) {
    if (Cr) return 0;
    if (!e.includes("r") || r.mode & 292) {
      if (e.includes("w") && !(r.mode & 146) || e.includes("x") && !(r.mode & 73)) return 2;
    } else return 2;
    return 0;
  }
  function jr(r, e) {
    if (!v(r.mode)) return 54;
    try {
      return x(r, e), 20;
    } catch {
    }
    return B(r, "wx");
  }
  function Vr(r, e, t) {
    try {
      var n2 = x(r, e);
    } catch (o2) {
      return o2.U;
    }
    if (r = B(r, "wx")) return r;
    if (t) {
      if (!v(n2.mode)) return 54;
      if (n2 === n2.parent || Wr(n2) === "/") return 10;
    } else if (v(n2.mode)) return 31;
    return 0;
  }
  function N(r) {
    if (r = C[r], !r) throw new u(8);
    return r;
  }
  function zr(r, e = -1) {
    if (r = Object.assign(new ue(), r), e == -1) r: {
      for (e = 0; 4096 >= e; e++) if (!C[e]) break r;
      throw new u(33);
    }
    return r.W = e, C[e] = r;
  }
  function Br(r, e = -1) {
    return r = zr(r, e), r.O?.Sa?.(r), r;
  }
  function Fr(r, e) {
    var t = void 0, n2 = t ? null : r;
    if (t ?? (t = r.N.Z), !t) throw new u(63);
    t(n2, e);
  }
  var se = { open(r) {
    r.O = $r[r.node.ka].O, r.O.open?.(r);
  }, X() {
    throw new u(70);
  } };
  function ur(r, e) {
    $r[r] = { O: e };
  }
  function Xr(r, e) {
    var t = e === "/";
    if (t && or) throw new u(10);
    if (!t && e) {
      var n2 = k(e, { pa: false });
      if (e = n2.path, n2 = n2.node, n2.da) throw new u(10);
      if (!v(n2.mode)) throw new u(54);
    }
    e = { type: r, Xa: {}, ya: e, Ga: [] }, r = r.$(e), r.$ = e, e.root = r, t ? or = r : n2 && (n2.da = e, n2.$ && n2.$.Ga.push(e));
  }
  function fr(r, e, t) {
    var n2 = k(r, { parent: true }).node;
    if (r = G(r), !r) throw new u(28);
    if (r === "." || r === "..") throw new u(20);
    var o2 = jr(n2, r);
    if (o2) throw new u(o2);
    if (!n2.N.ja) throw new u(63);
    return n2.N.ja(n2, r, e, t);
  }
  function A(r) {
    return fr(r, 16895, 0);
  }
  function Q(r, e, t) {
    typeof t > "u" && (t = e, e = 438), fr(r, e | 8192, t);
  }
  function sr(r, e) {
    if (!ee(r)) throw new u(44);
    var t = k(e, { parent: true }).node;
    if (!t) throw new u(44);
    e = G(e);
    var n2 = jr(t, e);
    if (n2) throw new u(n2);
    if (!t.N.ma) throw new u(63);
    t.N.ma(t, e, r);
  }
  function K(r, e, t = 438) {
    if (r === "") throw new u(44);
    if (typeof e == "string") {
      var n2 = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[e];
      if (typeof n2 > "u") throw Error(`Unknown file open mode: ${e}`);
      e = n2;
    }
    if (t = e & 64 ? t & 4095 | 32768 : 0, typeof r == "object") n2 = r;
    else {
      var o2 = r.endsWith("/");
      r = k(r, { oa: !(e & 131072), Ha: true }), n2 = r.node, r = r.path;
    }
    var i = false;
    if (e & 64) if (n2) {
      if (e & 128) throw new u(20);
    } else {
      if (o2) throw new u(31);
      n2 = fr(r, t | 511, 0), i = true;
    }
    if (!n2) throw new u(44);
    if ((n2.mode & 61440) === 8192 && (e &= -513), e & 65536 && !v(n2.mode)) throw new u(54);
    if (!i && (o2 = n2 ? (n2.mode & 61440) === 40960 ? 32 : v(n2.mode) && (_r(e) !== "r" || e & 576) ? 31 : B(n2, _r(e)) : 44)) throw new u(o2);
    if (e & 512 && !i) {
      if (o2 = n2, o2 = typeof o2 == "string" ? k(o2, { oa: true }).node : o2, v(o2.mode)) throw new u(31);
      if ((o2.mode & 61440) !== 32768) throw new u(28);
      var f = B(o2, "w");
      if (f) throw new u(f);
      Fr(o2, { size: 0, timestamp: Date.now() });
    }
    return e &= -131713, o2 = zr({ node: n2, path: Wr(n2), flags: e, seekable: true, position: 0, O: n2.O, Ia: [], error: false }), o2.O.open && o2.O.open(o2), i && (t &= 511, n2 = typeof n2 == "string" ? k(n2, { oa: true }).node : n2, Fr(n2, { mode: t & 4095 | n2.mode & -4096, T: Date.now(), Ra: void 0 })), !a.logReadFiles || e & 1 || r in xr || (xr[r] = 1), o2;
  }
  function Yr(r) {
    if (r.W === null) throw new u(8);
    r.qa && (r.qa = null);
    try {
      r.O.close && r.O.close(r);
    } catch (e) {
      throw e;
    } finally {
      C[r.W] = null;
    }
    r.W = null;
  }
  function Zr(r, e, t) {
    if (r.W === null) throw new u(8);
    if (!r.seekable || !r.O.X) throw new u(70);
    if (t != 0 && t != 1 && t != 2) throw new u(28);
    r.position = r.O.X(r, e, t), r.Ia = [];
  }
  function T(r, e, t) {
    r = Er("/dev/" + r);
    var n2 = ie(!!e, !!t);
    T.wa ?? (T.wa = 64);
    var o2 = T.wa++ << 8 | 0;
    ur(o2, { open(i) {
      i.seekable = false;
    }, close() {
      t?.buffer?.length && t(10);
    }, read(i, f, h, c) {
      for (var l = 0, m = 0; m < c; m++) {
        try {
          var p = e();
        } catch {
          throw new u(29);
        }
        if (p === void 0 && l === 0) throw new u(6);
        if (p == null) break;
        l++, f[h + m] = p;
      }
      return l && (i.node.ca = Date.now()), l;
    }, write(i, f, h, c) {
      for (var l = 0; l < c; l++) try {
        t(f[h + l]);
      } catch {
        throw new u(29);
      }
      return c && (i.node.V = i.node.T = Date.now()), l;
    } }), Q(r, n2, o2);
  }
  var P = {};
  function Lr(r, e) {
    if (e.charAt(0) === "/") return e;
    if (r = r === -100 ? "/" : N(r).path, e.length == 0) throw new u(44);
    return r + "/" + e;
  }
  var F = void 0, O = () => {
    var r = E[+F >> 2];
    return F += 4, r;
  };
  U = Array(4096), Xr(s, "/"), A("/tmp"), A("/home"), A("/home/web_user"), (function() {
    A("/dev"), ur(259, { read: () => 0, write: (n2, o2, i, f) => f, X: () => 0 }), Q("/dev/null", 259), Tr(1280, ne), Tr(1536, oe), Q("/dev/tty", 1280), Q("/dev/tty1", 1536);
    var r = new Uint8Array(1024), e = 0, t = () => (e === 0 && (Ur(r), e = r.byteLength), r[--e]);
    T("random", t), T("urandom", t), A("/dev/shm"), A("/dev/shm/tmp");
  })(), (function() {
    A("/proc");
    var r = A("/proc/self");
    A("/proc/self/fd"), Xr({ $() {
      var e = Mr(r, "fd", 16895, 73);
      return e.O = { X: s.O.X }, e.N = { fa(t, n2) {
        t = +n2;
        var o2 = N(t);
        return t = { parent: null, $: { ya: "fake" }, N: { ga: () => o2.path }, id: t + 1 }, t.parent = t;
      }, sa() {
        return Array.from(C.entries()).filter(([, t]) => t).map(([t]) => t.toString());
      } }, e;
    } }, "/proc/self/fd");
  })(), s.ua = new u(44), s.ua.stack = "<generic error, no stack>", a.print && (b = a.print), a.printErr && ($ = a.printErr), a.wasmBinary && (_ = a.wasmBinary), a.stackSave = () => de(), a.stackRestore = (r) => ve(r), a.stackAlloc = (r) => ye(r), a.getValue = function(r, e = "i8") {
    switch (e.endsWith("*") && (e = "*"), e) {
      case "i1":
        return g[r];
      case "i8":
        return g[r];
      case "i16":
        return j[r >> 1];
      case "i32":
        return E[r >> 2];
      case "i64":
        return H[r >> 3];
      case "float":
        return dr[r >> 2];
      case "double":
        return mr[r >> 3];
      case "*":
        return D[r >> 2];
      default:
        z(`invalid type for getValue: ${e}`);
    }
  }, a.stringToUTF8 = (r, e, t) => nr(r, y, e, t), a.lengthBytesUTF8 = tr;
  var le = { q: (r, e, t, n2) => z(`Assertion failed: ${r ? d(y, r) : ""}, at: ` + [e ? e ? d(y, e) : "" : "unknown filename", t, n2 ? n2 ? d(y, n2) : "" : "unknown function"]), n: function(r, e) {
    try {
      var t = N(r);
      if (t.W === e) return -28;
      if (0 > e || 4096 <= e) return -8;
      var n2 = C[e];
      return n2 && Yr(n2), Br(t, e).W;
    } catch (o2) {
      if (typeof P > "u" || o2.name !== "ErrnoError") throw o2;
      return -o2.U;
    }
  }, a: function(r, e, t) {
    F = t;
    try {
      var n2 = N(r);
      switch (e) {
        case 0:
          var o2 = O();
          if (0 > o2) break;
          for (; C[o2]; ) o2++;
          return Br(n2, o2).W;
        case 1:
        case 2:
          return 0;
        case 3:
          return n2.flags;
        case 4:
          return o2 = O(), n2.flags |= o2, 0;
        case 12:
          return o2 = O(), j[o2 + 0 >> 1] = 2, 0;
        case 13:
        case 14:
          return 0;
      }
      return -28;
    } catch (i) {
      if (typeof P > "u" || i.name !== "ErrnoError") throw i;
      return -i.U;
    }
  }, e: function(r, e, t) {
    F = t;
    try {
      var n2 = N(r);
      switch (e) {
        case 21509:
          return n2.R ? 0 : -59;
        case 21505:
          if (!n2.R) return -59;
          if (n2.R.aa.Da) {
            r = [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            var o2 = O();
            E[o2 >> 2] = 25856, E[o2 + 4 >> 2] = 5, E[o2 + 8 >> 2] = 191, E[o2 + 12 >> 2] = 35387;
            for (var i = 0; 32 > i; i++) g[o2 + i + 17] = r[i] || 0;
          }
          return 0;
        case 21510:
        case 21511:
        case 21512:
          return n2.R ? 0 : -59;
        case 21506:
        case 21507:
        case 21508:
          if (!n2.R) return -59;
          if (n2.R.aa.Ea) for (o2 = O(), r = [], i = 0; 32 > i; i++) r.push(g[o2 + i + 17]);
          return 0;
        case 21519:
          return n2.R ? (o2 = O(), E[o2 >> 2] = 0) : -59;
        case 21520:
          return n2.R ? -28 : -59;
        case 21531:
          if (o2 = O(), !n2.O.Ca) throw new u(59);
          return n2.O.Ca(n2, e, o2);
        case 21523:
          return n2.R ? (n2.R.aa.Fa && (i = [24, 80], o2 = O(), j[o2 >> 1] = i[0], j[o2 + 2 >> 1] = i[1]), 0) : -59;
        case 21524:
          return n2.R ? 0 : -59;
        case 21515:
          return n2.R ? 0 : -59;
        default:
          return -28;
      }
    } catch (f) {
      if (typeof P > "u" || f.name !== "ErrnoError") throw f;
      return -f.U;
    }
  }, c: function(r, e, t, n2) {
    F = n2;
    try {
      e = e ? d(y, e) : "", e = Lr(r, e);
      var o2 = n2 ? O() : 0;
      return K(e, t, o2).W;
    } catch (i) {
      if (typeof P > "u" || i.name !== "ErrnoError") throw i;
      return -i.U;
    }
  }, l: function(r, e, t) {
    try {
      if (e = e ? d(y, e) : "", e = Lr(r, e), t) if (t === 512) {
        var n2 = e, o2 = k(n2, { parent: true }).node, i = G(n2), f = x(o2, i), h = Vr(o2, i, true);
        if (h) throw new u(h);
        if (!o2.N.la) throw new u(63);
        if (f.da) throw new u(10);
        o2.N.la(o2, i), ar(f);
      } else return -28;
      else {
        if (o2 = e, n2 = k(o2, { parent: true }).node, !n2) throw new u(44);
        var c = G(o2), l = x(n2, c), m = Vr(n2, c, false);
        if (m) throw new u(m);
        if (!n2.N.na) throw new u(63);
        if (l.da) throw new u(10);
        n2.N.na(n2, c), ar(l);
      }
      return 0;
    } catch (p) {
      if (typeof P > "u" || p.name !== "ErrnoError") throw p;
      return -p.U;
    }
  }, h: () => z(""), g: function(r, e, t) {
    return 0 <= r && 3 >= r ? (H[t >> 3] = BigInt(Math.round(1e6 * (r === 0 ? Date.now() : performance.now()))), 0) : 28;
  }, f: () => Date.now(), k: (r) => {
    var e = y.length;
    if (r >>>= 0, 2147483648 < r) return false;
    for (var t = 1; 4 >= t; t *= 2) {
      var n2 = e * (1 + 0.2 / t);
      n2 = Math.min(n2, r + 100663296);
      r: {
        n2 = (Math.min(2147483648, 65536 * Math.ceil(Math.max(r, n2) / 65536)) - L.buffer.byteLength + 65535) / 65536 | 0;
        try {
          L.grow(n2), Rr();
          var o2 = 1;
          break r;
        } catch {
        }
        o2 = void 0;
      }
      if (o2) return true;
    }
    return false;
  }, b: function(r) {
    try {
      var e = N(r);
      return Yr(e), 0;
    } catch (t) {
      if (typeof P > "u" || t.name !== "ErrnoError") throw t;
      return t.U;
    }
  }, o: function(r, e, t, n2) {
    try {
      r: {
        var o2 = N(r);
        r = e;
        for (var i, f = e = 0; f < t; f++) {
          var h = D[r >> 2], c = D[r + 4 >> 2];
          r += 8;
          var l = o2, m = h, p = c, R = i, wr = g;
          if (0 > p || 0 > R) throw new u(28);
          if (l.W === null) throw new u(8);
          if ((l.flags & 2097155) === 1) throw new u(8);
          if (v(l.node.mode)) throw new u(31);
          if (!l.O.read) throw new u(28);
          var X = typeof R < "u";
          if (!X) R = l.position;
          else if (!l.seekable) throw new u(70);
          var Y = l.O.read(l, wr, m, p, R);
          X || (l.position += Y);
          var S = Y;
          if (0 > S) {
            var Z = -1;
            break r;
          }
          if (e += S, S < c) break;
          typeof i < "u" && (i += S);
        }
        Z = e;
      }
      return D[n2 >> 2] = Z, 0;
    } catch (W) {
      if (typeof P > "u" || W.name !== "ErrnoError") throw W;
      return W.U;
    }
  }, m: function(r, e, t, n2) {
    e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e);
    try {
      if (isNaN(e)) return 61;
      var o2 = N(r);
      return Zr(o2, e, t), H[n2 >> 3] = BigInt(o2.position), o2.qa && e === 0 && t === 0 && (o2.qa = null), 0;
    } catch (i) {
      if (typeof P > "u" || i.name !== "ErrnoError") throw i;
      return i.U;
    }
  }, d: function(r, e, t, n2) {
    try {
      r: {
        var o2 = N(r);
        r = e;
        for (var i, f = e = 0; f < t; f++) {
          var h = D[r >> 2], c = D[r + 4 >> 2];
          r += 8;
          var l = o2, m = h, p = c, R = i, wr = g;
          if (0 > p || 0 > R) throw new u(28);
          if (l.W === null) throw new u(8);
          if ((l.flags & 2097155) === 0) throw new u(8);
          if (v(l.node.mode)) throw new u(31);
          if (!l.O.write) throw new u(28);
          l.seekable && l.flags & 1024 && Zr(l, 0, 2);
          var X = typeof R < "u";
          if (!X) R = l.position;
          else if (!l.seekable) throw new u(70);
          var Y = l.O.write(l, wr, m, p, R, void 0);
          X || (l.position += Y);
          var S = Y;
          if (0 > S) {
            var Z = -1;
            break r;
          }
          if (e += S, S < c) break;
          typeof i < "u" && (i += S);
        }
        Z = e;
      }
      return D[n2 >> 2] = Z, 0;
    } catch (W) {
      if (typeof P > "u" || W.name !== "ErrnoError") throw W;
      return W.U;
    }
  }, i: function(r, e, t) {
    try {
      a.handleDataReader(r, e, t);
    } catch (n2) {
      console.warn(n2);
    }
  }, p: function(r, e, t) {
    a.handleLogHandler(r, e ? d(y, e) : "", t);
  }, j: function(r, e, t) {
    try {
      let n2 = a.handleScriptReader(r, e, t ? d(y, t) : "");
      if (n2) {
        let o2 = tr(n2), i = ce(o2 + 1);
        nr(n2, y, i, o2 + 1);
        try {
          return he(e, i, o2, t);
        } finally {
          we(i);
        }
      }
      return 0;
    } catch (n2) {
      return console.warn(n2), 0;
    }
  } }, w = await (async function() {
    function r(n2) {
      return w = n2.exports, L = w.r, Rr(), I--, a.monitorRunDependencies?.(I), I == 0 && V && (n2 = V, V = null, n2()), w;
    }
    I++, a.monitorRunDependencies?.(I);
    var e = { a: le };
    if (a.instantiateWasm) return new Promise((n2) => {
      a.instantiateWasm(e, (o2, i) => {
        n2(r(o2, i));
      });
    });
    rr ?? (rr = a.locateFile ? a.locateFile ? a.locateFile("ocgcore.sync.wasm", q) : q + "ocgcore.sync.wasm" : new URL("ocgcore.sync.wasm", o).href);
    try {
      var t = await qr(e);
      return r(t.instance);
    } catch (n2) {
      return J(n2), Promise.reject(n2);
    }
  })(), we = a._free = w.t;
  a.__Z21ocgcore_lua_api_checkPvPKc = w.u, a._ocgapiGetVersion = w.v, a._ocgapiCreateDuel = w.w, a._ocgapiDestroyDuel = w.x, a._ocgapiDuelNewCard = w.y, a._ocgapiStartDuel = w.z, a._ocgapiDuelProcess = w.A, a._ocgapiDuelGetMessage = w.B, a._ocgapiDuelSetResponse = w.C;
  var he = a._ocgapiLoadScript = w.D;
  a._ocgapiDuelQueryCount = w.E, a._ocgapiDuelQuery = w.F, a._ocgapiDuelQueryLocation = w.G, a._ocgapiDuelQueryField = w.H;
  var ce = a._malloc = w.I, pe = w.J, ve = w.K, ye = w.L, de = w.M;
  function lr() {
    function r() {
      if (a.calledRun = true, !yr) {
        if (gr = true, !a.noFSInit && !Ir) {
          var e, t;
          Ir = true, e ?? (e = a.stdin), t ?? (t = a.stdout), n2 ?? (n2 = a.stderr), e ? T("stdin", e) : sr("/dev/tty", "/dev/stdin"), t ? T("stdout", null, t) : sr("/dev/tty", "/dev/stdout"), n2 ? T("stderr", null, n2) : sr("/dev/tty1", "/dev/stderr"), K("/dev/stdin", 0), K("/dev/stdout", 1), K("/dev/stderr", 1);
        }
        if (w.s(), Cr = false, pr(a), a.onRuntimeInitialized?.(), a.postRun) for (typeof a.postRun == "function" && (a.postRun = [a.postRun]); a.postRun.length; ) {
          var n2 = a.postRun.shift();
          Ar.push(n2);
        }
        Nr(Ar);
      }
    }
    if (0 < I) V = lr;
    else {
      if (a.preRun) for (typeof a.preRun == "function" && (a.preRun = [a.preRun]); a.preRun.length; ) br();
      Nr(Pr), 0 < I ? V = lr : a.setStatus ? (a.setStatus("Running..."), setTimeout(() => {
        setTimeout(() => a.setStatus(""), 1), r();
      }, 1)) : r();
    }
  }
  if (a.preInit) for (typeof a.preInit == "function" && (a.preInit = [a.preInit]); 0 < a.preInit.length; ) a.preInit.shift()();
  return lr(), cr = Gr, cr;
});
var ge = me;
export {
  ge as default
};
