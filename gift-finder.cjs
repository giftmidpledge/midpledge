/**
 * gift-finder.js — поиск реального номера подарка по ВСЕМ выпущенным подаркам Telegram.
 *
 * Данные: https://nft.fragment.com/gift/<slug>-<номер>.json (модель / фон / узор каждого выпущенного подарка).
 * Сервер постепенно обходит номера коллекции (1..выпуск), складывает атрибуты в индекс на диске
 * и по запросу отдаёт номер подарка с нужной комбинацией.
 *
 * Node 18+, без зависимостей.
 *
 * Запуск отдельно:   PORT=8787 node gift-finder.js
 * Подключение в Express (ваш оракул):
 *     const finder = require('./gift-finder');
 *     app.get('/gift-find', finder.expressHandler);
 *
 * GET /gift-find?gift=Algorithm%20Cup&model=Gold&backdrop=Feldgrau&symbol=Puzzle
 * → { ok, num, slug, url, model, backdrop, symbol, match: "full"|"partial", crawled, supply, complete }
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const DATA_DIR = process.env.GIFT_INDEX_DIR || path.join(__dirname, 'gift-index');
const FRAGMENT = 'https://nft.fragment.com/gift/';
const CONCURRENCY = parseInt(process.env.GIFT_CONCURRENCY || '16', 10);
const REQUEST_BUDGET_MS = parseInt(process.env.GIFT_BUDGET_MS || '15000', 10); // сколько ждём ответа на один запрос
const MAX_SUPPLY = 5000000;

fs.mkdirSync(DATA_DIR, { recursive: true });

const slugOf = (name) => String(name || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
const keyOf = (s) => String(s == null ? '' : s)
  .replace(/\s*\(\s*\d+(?:[.,]\d+)?\s*%\s*\)\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// сопоставление названий атрибутов: без регистра, пробелов, апострофов, дефисов и «(1.5%)» в конце
const normAttr = (s) => keyOf(s).replace(/[^\p{L}\p{N}]/gu, '');

// ---- разбор JSON подарка Fragment (терпимо к разным форматам) ----
function pickAttr(j, keys) {
  if (!j || typeof j !== 'object') return null;
  for (const k of keys) {
    const v = j[k];
    if (v != null && typeof v !== 'object' && v !== '') return String(v);
  }
  const arr = j.attributes || j.attrs || j.traits;
  if (Array.isArray(arr)) {
    for (const a of arr) {
      const t = String((a && (a.type || a.trait_type || a.name || a.key)) || '').toLowerCase();
      if (keys.includes(t) && a.value != null) return String(a.value);
    }
  } else if (arr && typeof arr === 'object') {
    for (const k of keys) { const v = arr[k]; if (v != null && typeof v !== 'object') return String(v); }
  }
  return null;
}
const clean = (v) => (v == null ? null : String(v).replace(/\s*\(\s*\d+(?:[.,]\d+)?\s*%\s*\)\s*$/, '').trim());

// 'ok' | 'missing' | 'retry'
async function fetchGift(slug, n) {
  let r;
  try {
    r = await fetch(`${FRAGMENT}${slug}-${n}.json`, { signal: AbortSignal.timeout(10000) });
  } catch (e) { return { st: 'retry' }; }
  if (r.status === 404) return { st: 'missing' };
  if (r.status === 429 || r.status >= 500) return { st: 'retry', wait: 1500 };
  if (!r.ok) return { st: 'retry' };
  try {
    const j = await r.json();
    const model = clean(pickAttr(j, ['model'])), backdrop = clean(pickAttr(j, ['backdrop', 'background'])), symbol = clean(pickAttr(j, ['symbol', 'pattern']));
    if (!model && !backdrop && !symbol) return { st: 'missing' };
    return { st: 'ok', model, backdrop, symbol };
  } catch (e) { return { st: 'retry' }; }
}

// ---- индекс коллекции ----
class Collection {
  constructor(name) {
    this.name = name;
    this.slug = slugOf(name);
    this.file = path.join(DATA_DIR, this.slug);
    this.supply = 0;
    this.cursor = 1;                 // следующий номер для обхода
    this.dict = { model: [], backdrop: [], symbol: [] };   // индекс -> название (индексы с 1, 0 = нет данных)
    this.rev = { model: new Map(), backdrop: new Map(), symbol: new Map() };
    this.cap = 0;
    this.rows = new Uint16Array(0);  // по 3 значения на номер
    this.complete = false;
    this.running = false;
    this.dirty = 0;
    this.load();
  }
  load() {
    try {
      const meta = JSON.parse(fs.readFileSync(this.file + '.json', 'utf8'));
      this.supply = meta.supply; this.cursor = meta.cursor; this.complete = !!meta.complete;
      this.dict = meta.dict;
      for (const t of ['model', 'backdrop', 'symbol']) this.dict[t].forEach((v, i) => { if (v != null) this.rev[t].set(keyOf(v), i); });
      const buf = fs.readFileSync(this.file + '.bin');
      this.rows = new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2).slice();
      this.cap = this.rows.length / 3;
    } catch (e) { /* нового индекса ещё нет */ }
    if (!this.dict.model.length) for (const t of ['model', 'backdrop', 'symbol']) this.dict[t] = [null];
  }
  save() {
    try {
      fs.writeFileSync(this.file + '.json', JSON.stringify({ supply: this.supply, cursor: this.cursor, complete: this.complete, dict: this.dict }));
      fs.writeFileSync(this.file + '.bin', Buffer.from(this.rows.buffer, this.rows.byteOffset, this.rows.byteLength));
      this.dirty = 0;
    } catch (e) { console.warn('[gift-finder] save', e.message); }
  }
  ensureCap(n) {
    if (n < this.cap) return;
    const ncap = Math.max(n + 1, Math.ceil(this.cap * 1.5), 1024);
    const nr = new Uint16Array(ncap * 3);
    nr.set(this.rows);
    this.rows = nr; this.cap = ncap;
  }
  idx(type, value) {
    if (!value) return 0;
    const k = keyOf(value);
    let i = this.rev[type].get(k);
    if (i == null) { i = this.dict[type].length; this.dict[type].push(value); this.rev[type].set(k, i); }
    return i;
  }
  put(n, g) {
    this.ensureCap(n);
    this.rows[n * 3] = this.idx('model', g.model);
    this.rows[n * 3 + 1] = this.idx('backdrop', g.backdrop);
    this.rows[n * 3 + 2] = this.idx('symbol', g.symbol);
  }
  async probe(n) {
    for (let t = 0; t < 3; t++) {
      const r = await fetchGift(this.slug, n);
      if (r.st === 'ok') return r;
      if (r.st === 'missing') return null;
      await sleep(r.wait || 500);
    }
    return undefined; // недоступно
  }
  // выпуск коллекции: наибольший существующий номер (экспонента + бинарный поиск)
  async findSupply() {
    if (this.supply) return this.supply;
    const first = await this.probe(1);
    if (!first) return 0;
    let lo = 1, hi = 2;
    while (hi <= MAX_SUPPLY) {
      const r = await this.probe(hi);
      if (r) { lo = hi; hi *= 2; } else break;
    }
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      const r = await this.probe(mid);
      if (r) lo = mid; else hi = mid;
    }
    // хвост: после lo могут быть единичные «дыры» (сожжённые) — проверим немного вперёд
    let top = lo;
    for (let k = 1; k <= 20; k++) { const r = await this.probe(lo + k); if (r) top = lo + k; }
    this.supply = top;
    this.ensureCap(top);
    this.save();
    return top;
  }
  // фоновый обход: продолжается и после ответа на запрос
  async crawl() {
    if (this.running || this.complete) return;
    this.running = true;
    try {
      if (!(await this.findSupply())) return;
      while (this.cursor <= this.supply) {
        const batch = [];
        for (let k = 0; k < CONCURRENCY && this.cursor + k <= this.supply; k++) batch.push(this.cursor + k);
        const res = await Promise.all(batch.map(async (n) => [n, await fetchGift(this.slug, n)]));
        let retry = 0, wait = 0;
        for (const [n, r] of res) {
          if (r.st === 'ok') this.put(n, r);
          else if (r.st === 'retry') { retry++; wait = Math.max(wait, r.wait || 300); }
        }
        if (retry > res.length / 2) { await sleep(wait + 500); continue; } // нас душат — повторяем пачку
        this.cursor += batch.length;
        this.dirty += batch.length;
        if (this.dirty >= 2000) this.save();
      }
      this.complete = true;
      this.save();
    } catch (e) {
      console.warn('[gift-finder] crawl', this.name, e.message);
    } finally { this.running = false; }
  }
  // лучший найденный подарок среди уже проиндексированных
  search(want) {
    const wm = want.model ? this.lookup('model', want.model) : null;
    const wb = want.backdrop ? this.lookup('backdrop', want.backdrop) : null;
    const ws = want.symbol ? this.lookup('symbol', want.symbol) : null;
    const full = (want.model ? 4 : 0) + (want.backdrop ? 2 : 0) + (want.symbol ? 1 : 0);
    let best = 0, bestN = 0, count = 0;
    const last = Math.min(this.cursor - 1, this.supply);
    for (let n = 1; n <= last; n++) {
      const m = this.rows[n * 3], b = this.rows[n * 3 + 1], s = this.rows[n * 3 + 2];
      if (!m && !b && !s) continue;
      const sc = (wm != null && m === wm ? 4 : 0) + (wb != null && b === wb ? 2 : 0) + (ws != null && s === ws ? 1 : 0);
      if (sc > best) { best = sc; bestN = n; count = 1; if (sc === full) { /* считаем дальше только для выбора случайного */ } }
      else if (sc === best && sc > 0) {
        count++;
        if (Math.random() < 1 / count) bestN = n;          // случайный из равных
      }
    }
    return { n: bestN, score: best, full };
  }
  // все проиндексированные подарки, подходящие под фильтры (для каталога): { items: [{n, model, backdrop, symbol}], total }
  list(want, offset, limit) {
    const wm = this.lookup('model', want.model), wb = this.lookup('backdrop', want.backdrop), ws = this.lookup('symbol', want.symbol);
    // значение фильтра, которого в индексе нет (ещё не встретилось или называется иначе) → подходящих подарков пока нет
    const unknown = [];
    if (want.model && wm == null) unknown.push('model');
    if (want.backdrop && wb == null) unknown.push('backdrop');
    if (want.symbol && ws == null) unknown.push('symbol');
    if (unknown.length) return { items: [], total: 0, unknown };
    const qm = want.q ? String(want.q).toLowerCase() : '';
    const only = want.num > 0 ? want.num : 0;
    const last = Math.min(this.cursor - 1, this.supply);
    const items = [];
    let total = 0;
    for (let n = only || 1; n <= (only ? Math.min(only, last) : last); n++) {
      const m = this.rows[n * 3], b = this.rows[n * 3 + 1], s = this.rows[n * 3 + 2];
      if (!m && !b && !s) continue;
      if (wm != null && m !== wm) continue;
      if (wb != null && b !== wb) continue;
      if (ws != null && s !== ws) continue;
      if (qm && !String(this.dict.model[m] || '').toLowerCase().includes(qm)) continue;
      total++;
      if (total > offset && items.length < limit) items.push({ n, ...this.info(n) });
    }
    return { items, total };
  }
  // индекс значения атрибута по названию (устойчиво к регистру/пробелам/знакам); undefined — такого значения в индексе нет
  lookup(type, value) {
    if (!value) return null;
    const exact = this.rev[type].get(keyOf(value));
    if (exact != null) return exact;
    const k = normAttr(value);
    if (!k) return undefined;
    const arr = this.dict[type];
    for (let i = 1; i < arr.length; i++) if (arr[i] != null && normAttr(arr[i]) === k) return i;
    return undefined;
  }
  info(n) {
    return {
      model: this.dict.model[this.rows[n * 3]] || null,
      backdrop: this.dict.backdrop[this.rows[n * 3 + 1]] || null,
      symbol: this.dict.symbol[this.rows[n * 3 + 2]] || null,
    };
  }
}

const cache = new Map();
function getCollection(name) {
  const slug = slugOf(name);
  if (!slug || String(name).length > 64 || slug.length > 48) return null;
  if (!cache.has(slug) && cache.size >= 400) return null;
  if (!cache.has(slug)) cache.set(slug, new Collection(name));
  return cache.get(slug);
}

async function find(q) {
  const col = getCollection(q.gift);
  if (!col) return { ok: false, error: 'gift required' };
  const want = { model: q.model || '', backdrop: q.backdrop || '', symbol: q.symbol || '' };
  col.crawl();                                   // не ждём: обход идёт в фоне
  const t0 = Date.now();
  for (;;) {
    const r = col.search(want);
    const done = col.complete || (!col.running && col.cursor > col.supply);
    if (r.n && (r.score >= r.full || done || Date.now() - t0 > REQUEST_BUDGET_MS)) {
      return {
        ok: true, num: r.n, slug: col.slug, url: `https://t.me/nft/${String(q.gift).replace(/[^A-Za-z0-9]/g, '')}-${r.n}`,
        match: r.score >= r.full ? 'full' : 'partial', ...col.info(r.n),
        crawled: Math.min(col.cursor - 1, col.supply), supply: col.supply, complete: !!done,
      };
    }
    if (done || Date.now() - t0 > REQUEST_BUDGET_MS) {
      return { ok: false, error: col.supply ? 'not found yet' : 'collection not found on Fragment',
        crawled: Math.min(col.cursor - 1, col.supply), supply: col.supply, complete: !!done };
    }
    if (!col.running) col.crawl();
    await sleep(400);
  }
}

// Список ВСЕХ существующих подарков коллекции (с номерами) по фильтрам. Индекс собирается в фоне, поэтому
// отдаём то, что уже проиндексировано, плюс прогресс (crawled из supply). GET /gift-list?gift=&model=&backdrop=&symbol=&q=&num=&offset=&limit=
async function list(q) {
  const col = getCollection(q.gift);
  if (!col) return { ok: false, error: 'gift required' };
  col.crawl();
  const t0 = Date.now();
  while (!col.supply && col.running && Date.now() - t0 < 8000) await sleep(300);   // ждём, пока станет известен выпуск
  if (!col.supply) return { ok: false, error: 'collection not found on Fragment' };
  const want = { model: q.model || '', backdrop: q.backdrop || '', symbol: q.symbol || '', q: q.q || '', num: parseInt(q.num, 10) || 0 };
  const offset = Math.max(0, parseInt(q.offset, 10) || 0);
  const limit = Math.min(300, Math.max(1, parseInt(q.limit, 10) || 60));
  if (!col.running && !col.complete) col.crawl();
  const r = col.list(want, offset, limit);
  const out = {
    ok: true, gift: String(q.gift), items: r.items, total: r.total,
    crawled: Math.min(col.cursor - 1, col.supply), supply: col.supply, complete: !!col.complete,
  };
  if (r.unknown) {   // для диагностики: какие значения фильтра индекс не знает и какие названия в нём есть
    out.unknown = r.unknown;
    out.have = {};
    for (const t of r.unknown) out.have[t] = col.dict[t].filter(Boolean).slice(0, 60);
  }
  return out;
}

function send(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}
async function expressHandler(req, res) {
  try {
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    const out = await find(q);
    send(res, out.ok ? 200 : 404, out);
  } catch (e) { send(res, 500, { ok: false, error: String(e && e.message || e) }); }
}

module.exports = { find, list, expressHandler };

if (require.main === module) {
  const port = parseInt(process.env.PORT || '8787', 10);
  http.createServer((req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); return res.end(); }
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/gift-find') return expressHandler({ query: Object.fromEntries(u.searchParams) }, res);
    send(res, 404, { ok: false });
  }).listen(port, () => console.log('gift-finder on :' + port));
  process.on('SIGINT', () => { for (const c of cache.values()) c.save(); process.exit(0); });
}
