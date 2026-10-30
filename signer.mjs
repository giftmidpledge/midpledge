// Оракул GiftLoan v2. Финальная версия (escrow_init.js).
import http from 'node:http';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ====== НАСТРОЙКИ ======
const POOL_ADDRESS = process.env.POOL_ADDRESS || 'EQA1_3bfycnsCmtrmOA6ig6grVX4leWzC7waOmzi4QrUSLZP';
const PORT = Number(process.env.PORT || 10000);
const MAX_LOAN_NANO = BigInt(Math.round(Number(process.env.MAX_LOAN_GRAM || '100000') * 1e9));
const FLOOR_DISCOUNT_BPS = 9000n;   
const MAX_LTV_BPS = 4000;           
const MIN_LTV_BPS = 100;
const QUOTE_TTL_SEC = 300;          
const TERMS = { 1: 50n, 7: 150n, 14: 440n, 21: 960n, 31: 1990n };

const FLOORS_URL = 'https://portal-market.com/partners/collections/preview';
const FLOORS_TTL_MS = 5 * 60 * 1000;
const MAX_PRICE_AGE_HOURS = Number(process.env.MAX_PRICE_AGE_HOURS || '12'); 
const MAX_FETCH_AGE_MS = Number(process.env.MAX_FETCH_AGE_HOURS || '3') * 3600 * 1000;
const RATE_LIMIT_PER_MIN = 40;

const COLLECTION_WHITELIST = process.env.COLLECTION_WHITELIST || '';
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const PORTAL_API_KEY = (process.env.PORTAL_API_KEY || '').trim();

// ====== КЛЮЧ ======
function loadKey() {
  const seedHex = (process.env.SIGNER_SEED || '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(seedHex)) {
    console.error('SIGNER_SEED не задан или не 64 hex-символа.');
    process.exit(1);
  }
  const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const priv = crypto.createPrivateKey({ key: Buffer.concat([pkcs8Prefix, Buffer.from(seedHex, 'hex')]), format: 'der', type: 'pkcs8' });
  const x = crypto.createPublicKey(priv).export({ format: 'jwk' }).x;
  const pubHex = Buffer.from(x, 'base64url').toString('hex');
  return { priv, pubHex };
}

// ====== АДРЕСА ======
function parseAddress(s) {
  s = String(s).trim();
  let wc, hash;
  const raw = s.match(/^(-?\d+):([0-9a-fA-F]{64})$/);
  if (raw) { wc = Number(raw[1]); hash = Buffer.from(raw[2], 'hex'); }
  else {
    const b = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (b.length !== 36) throw new Error('bad address');
    const crc = crc16(b.subarray(0, 34));
    if (((crc >> 8) & 255) !== b[34] || (crc & 255) !== b[35]) throw new Error('bad address checksum');
    wc = b.readInt8(1); hash = b.subarray(2, 34);
  }
  return { wc, hash: Buffer.from(hash) };
}
function crc16(buf) {
  let crc = 0;
  for (const byte of buf) { crc ^= byte << 8; for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff; }
  return crc;
}
function toFriendly(addr) {
  const b = Buffer.alloc(36);
  b[0] = 0x11; b.writeInt8(addr.wc, 1); addr.hash.copy(b, 2);
  const crc = crc16(b.subarray(0, 34));
  b[34] = crc >> 8; b[35] = crc & 255;
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}
const sameAddr = (a, b) => a.wc === b.wc && a.hash.equals(b.hash);

class Bits {
  constructor() { this.bits = []; }
  uint(v, n) { v = BigInt(v); for (let i = n - 1; i >= 0; i--) this.bits.push(Number((v >> BigInt(i)) & 1n)); return this; }
  address(a) { this.uint(0b10, 2).uint(0, 1).uint(BigInt.asUintN(8, BigInt(a.wc)), 8); for (const byte of a.hash) this.uint(byte, 8); return this; }
  coins(v) { v = BigInt(v); let len = 0; while ((v >> BigInt(8 * len)) > 0n) len++; this.uint(len, 4); if (len) this.uint(v, 8 * len); return this; }
  hash() {
    const n = this.bits.length; const padded = this.bits.slice();
    if (n % 8) { padded.push(1); while (padded.length % 8) padded.push(0); }
    const data = Buffer.alloc(padded.length / 8);
    padded.forEach((bit, i) => { if (bit) data[i >> 3] |= 0x80 >> (i & 7); });
    return crypto.createHash('sha256').update(Buffer.concat([Buffer.from([0, Math.ceil(n / 8) + Math.floor(n / 8)]), data])).digest();
  }
}
function quoteHash(pool, nft, borrower, principal, term, exp) {
  return new Bits().address(pool).address(nft).address(borrower).coins(principal).uint(term, 16).uint(exp, 32).hash();
}

// ====== ЦЕНЫ ======
const normalizeKey = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
let floors = {};
let floorsList = [];
let floorsAt = 0;
let floorsSourceAt = null;

function assertFreshPrices() {
  if (MAX_FETCH_AGE_MS > 0 && Date.now() - floorsAt > MAX_FETCH_AGE_MS)
    throw new HttpError(503, 'Цены не обновлялись слишком долго');
}

async function loadFloors() {
  if (Date.now() - floorsAt < FLOORS_TTL_MS && Object.keys(floors).length) return;
  if (!PORTAL_API_KEY) {
    console.error('КРИТИЧЕСКАЯ ОШИБКА: PORTAL_API_KEY пуст!');
    throw new Error('PORTAL_API_KEY не задан в Render Environment');
  }

  console.log('--> Запрашиваю цены у Portal Market...');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const r = await fetch(FLOORS_URL, {
      headers: { 'User-Agent': 'giftloan-oracle', Authorization: 'partners ' + PORTAL_API_KEY },
      cache: 'no-cache',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log('<-- Portal Market ответил статусом:', r.status);

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.error('ОШИБКА ОТВЕТА PORTAL:', t);
      throw new Error('Portal Market HTTP ' + r.status + ' ' + t.slice(0, 100));
    }
    
    const data = await r.json();
    const items = Array.isArray(data) ? data : (data.collections || data.results || data.items || []);

    const map = {};
    for (const item of items) {
      const price = Number(item.floor_price) || Number(item.floor_price_ton);
      if (!(price > 0) || !isFinite(price)) continue;
      for (const raw of [item.name, item.short_name]) {
        const key = normalizeKey(raw);
        if (key) map[key] = price;
      }
    }
    
    if (!Object.keys(map).length) throw new Error('Portal Market returned empty floors (нет цен)');

    floorsList = items.filter(i => (Number(i.floor_price) || Number(i.floor_price_ton)) > 0).map(i => ({ 
      name: i.name, short_name: i.short_name, floor: Number(i.floor_price) || Number(i.floor_price_ton) 
    }));
    
    floors = map;
    floorsAt = Date.now();
    floorsSourceAt = Date.now();
    console.log('✅ Цены подарков обновлены:', Object.keys(map).length, 'ключей из', items.length, 'коллекций');
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      console.error('КРИТИЧЕСКАЯ ОШИБКА: Portal Market не ответил за 15 секунд!');
      throw new Error('Таймаут подключения к Portal Market');
    }
    console.error('КРИТИЧЕСКАЯ ОШИБКА при загрузке цен:', e.message);
    throw e;
  }
}

const singular = s => s.replace(/ies$/, 'y').replace(/s$/, '');
const floorLookup = name => {
  const k = normalizeKey(name);
  if (!k) return null;
  if (floors[k] > 0) return floors[k];
  const base = singular(k);
  for (const [mapKey, price] of Object.entries(floors)) {
    if (price > 0 && singular(mapKey) === base) return price;
  }
  return null;
};

// ====== БЕЛЫЙ СПИСОК ======
const allowedCollections = new Set();
for (const a of COLLECTION_WHITELIST.split(',').map(x => x.trim()).filter(Boolean)) {
  try { const p = parseAddress(a); allowedCollections.add(p.wc + ':' + p.hash.toString('hex')); }
  catch { console.error('ОШИБКА В COLLECTION_WHITELIST: неверный адрес', a); }
}
function collectionAllowed(rawAddr) {
  try { const p = parseAddress(rawAddr); return allowedCollections.has(p.wc + ':' + p.hash.toString('hex')); }
  catch { return false; }
}

// ====== TONAPI ======
const TONAPI_KEY = process.env.TONAPI_KEY || '';
const TON_GAP_MS = Number(process.env.TONAPI_GAP_MS || (TONAPI_KEY ? 350 : 1100));
const TONAPI_ALLOWED = /^\/v2\/(accounts\/[\w:-]+(\/(nfts|events))?|blockchain\/accounts\/[\w:-]+\/methods\/\w+|nfts\/[\w:-]+)(\?[\w=&%.:+-]*)?$/;
const tonCache = new Map();
let tonChain = Promise.resolve();
let tonLast = 0;
const sleepMs = ms => new Promise(r => setTimeout(r, ms));

function tonUpstream(pq) {
  const run = tonChain.then(async () => {
    for (let i = 0; i < 3; i++) {
      const wait = tonLast + TON_GAP_MS - Date.now();
      if (wait > 0) await sleepMs(wait);
      tonLast = Date.now();
      const r = await fetch('https://tonapi.io' + pq, { headers: TONAPI_KEY ? { Authorization: 'Bearer ' + TONAPI_KEY } : {} });
      if (r.status === 429) { await sleepMs(1500 * (i + 1)); continue; }
      return { status: r.status, text: await r.text() };
    }
    return { status: 429, text: JSON.stringify({ error: 'TonAPI rate limit' }) };
  });
  tonChain = run.catch(() => {});
  return run;
}
function tonGetCached(pq) {
  const ttl = pq.includes('/methods/escrowAddress') ? 600000 : 3000;
  const hit = tonCache.get(pq);
  if (hit && Date.now() - hit.t < hit.ttl) return hit.p;
  const p = tonUpstream(pq);
  tonCache.set(pq, { t: Date.now(), ttl, p });
  p.then(v => { if (v.status >= 429) tonCache.delete(pq); }, () => tonCache.delete(pq));
  if (tonCache.size > 500) tonCache.delete(tonCache.keys().next().value);
  return p;
}
async function fetchNft(nftFriendly) {
  const r = await tonGetCached('/v2/nfts/' + nftFriendly);
  if (r.status === 404) throw new HttpError(404, 'NFT не найден');
  if (r.status !== 200) throw new HttpError(502, 'TonAPI недоступен (' + r.status + ')');
  return JSON.parse(r.text);
}

class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

async function priceNft(nftStr) {
  let addr;
  try { addr = parseAddress(nftStr); } catch { throw new HttpError(400, 'Неверный адрес NFT'); }
  try { await loadFloors(); } catch (e) {
    if (!Object.keys(floors).length) throw new HttpError(503, 'Цены не загружены: ' + e.message);
  }
  assertFreshPrices();
  if (!allowedCollections.size) throw new HttpError(503, 'Не задан COLLECTION_WHITELIST');
  const nft = await fetchNft(toFriendly(addr));
  if (!nft.collection?.address || !collectionAllowed(nft.collection.address))
    return { addr, nft, eligible: false, reason: 'Коллекция не в списке принимаемых' };
  const collection = nft.collection?.name;
  const name = nft.metadata?.name;
  const floor = floorLookup(collection) ?? floorLookup(String(name || '').replace(/\s*#\d+$/, ''));
  if (!floor) return { addr, nft, eligible: false, reason: 'Коллекции «' + (collection || '?') + '» нет в источнике цен' };
  return { addr, nft, eligible: true, floor, basis: 'collection' };
}

// ====== ОБРАБОТЧИКИ ======
async function handleFloor(body) {
  const p = await priceNft(body.nft);
  if (!p.eligible) return { eligible: false, reason: p.reason };
  return { eligible: true, floor: p.floor, basis: p.basis };
}

async function handleQuote(body, key) {
  const term = Number(body.termDays);
  const ltv = Number(body.ltvBps);
  if (!TERMS[term]) throw new HttpError(400, 'Неверный срок');
  if (!Number.isInteger(ltv) || ltv < MIN_LTV_BPS || ltv > MAX_LTV_BPS) throw new HttpError(400, 'Неверный LTV');
  let borrower;
  try { borrower = parseAddress(body.borrower); } catch { throw new HttpError(400, 'Неверный адрес заёмщика'); }

  const p = await priceNft(body.nft);
  if (!p.eligible) throw new HttpError(422, p.reason);

  const ownerRaw = p.nft.owner?.address;
  if (!ownerRaw || !sameAddr(parseAddress(ownerRaw), borrower)) throw new HttpError(422, 'NFT не принадлежит заёмщику');

  const floorNano = BigInt(Math.floor(p.floor * 1e9));
  let principal = floorNano * FLOOR_DISCOUNT_BPS / 10000n * BigInt(ltv) / 10000n;
  if (principal > MAX_LOAN_NANO) principal = MAX_LOAN_NANO;
  if (principal <= 0n) throw new HttpError(422, 'Сумма слишком мала');

  const interest = (principal * TERMS[term] + 9999n) / 10000n;
  const repay = principal + interest;
  const exp = Math.floor(Date.now() / 1000) + QUOTE_TTL_SEC;

  const h = quoteHash(parseAddress(POOL_ADDRESS), p.addr, borrower, principal, term, exp);
  const sig = crypto.sign(null, h, key.priv);
  return { principalNano: principal.toString(), repayNano: repay.toString(), termDays: term, expiresAt: exp, floor: p.floor, sig: sig.toString('base64') };
}

// ====== STATEINIT ======
const HERE = path.dirname(fileURLToPath(import.meta.url));
const initCache = new Map();
let initRunning = 0;
function runEscrowInit(nftFriendly) {
  if (initCache.has(nftFriendly)) return initCache.get(nftFriendly);
  if (initCache.size > 300) initCache.delete(initCache.keys().next().value);
  const p = new Promise((resolve, reject) => {
    if (initRunning >= 2) return reject(new HttpError(429, 'too many requests'));
    initRunning++;
    const safe = /^[\w:-]+$/;
    if (!safe.test(POOL_ADDRESS) || !safe.test(nftFriendly)) { initRunning--; return reject(new HttpError(400, 'Неверный адрес')); }
    
    // ИСПРАВЛЕНИЕ: Используем escrow_init.js и обычный node вместо ts-node
    const escrowPath = path.join(HERE, 'escrow_init.js');
    const args = ['--import', 'tsx', escrowPath, POOL_ADDRESS, nftFriendly];
    
    execFile(process.execPath, args, { cwd: HERE, timeout: 90000, windowsHide: true }, (err, stdout, stderr) => {
      initRunning--;
      if (err) { console.error('escrow_init error:', String(stderr || err).slice(-500)); return reject(new HttpError(500, 'Ошибка escrow_init')); }
      const line = String(stdout).split(/\r?\n/).reverse().find(l => l.trim().startsWith('{'));
      try { resolve(JSON.parse(line)); } catch { reject(new HttpError(500, 'Неожиданный ответ escrow_init')); }
    });
  });
  initCache.set(nftFriendly, p);
  p.catch(() => initCache.delete(nftFriendly));
  return p;
}

async function handleEscrow(body) {
  const p = await priceNft(body.nft);
  if (!p.eligible) throw new HttpError(422, p.reason);
  const r = await runEscrowInit(toFriendly(p.addr));
  if (!r.stateInit || !r.address) throw new HttpError(500, 'Пустой ответ escrow_init');
  return { address: r.address, stateInit: r.stateInit };
}

// ====== СЕРВЕР ======
const hits = new Map();
function rateLimited(ip, limit = RATE_LIMIT_PER_MIN) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 60000) hits.delete(k);
  return arr.length > limit;
}

function startServer(key) {
  const server = http.createServer(async (req, res) => {
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOW_ORIGIN, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
      res.end(JSON.stringify(obj));
    };
    const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean);
    const ip = xff.length ? xff[xff.length - 1] : req.socket.remoteAddress;
    if (req.method === 'OPTIONS') return send(204, {});
    
    if (req.method === 'GET' && req.url.startsWith('/tonapi/')) {
      if (rateLimited('t' + ip, 300)) return send(429, { error: 'too many requests' });
      const pq = req.url.slice(7);
      if (!TONAPI_ALLOWED.test(pq)) return send(403, { error: 'forbidden' });
      try {
        const r = await tonGetCached(pq);
        res.writeHead(r.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ALLOW_ORIGIN });
        return res.end(r.text);
      } catch (e) { return send(502, { error: 'TonAPI недоступен' }); }
    }
    
    if (req.method === 'GET' && req.url === '/floors') {
      if (rateLimited('f' + ip, 120)) return send(429, { error: 'too many requests' });
      try { await loadFloors(); } catch (e) { if (!floorsList.length) return send(503, { error: 'Цены недоступны' }); }
      return send(200, { collections: floorsList, updatedAt: floorsAt });
    }
    
    if (req.method === 'GET' && req.url === '/status') {
      const now = Date.now();
      let loadError = null;
      try { await loadFloors(); } catch (e) { loadError = String(e.message || e).slice(0, 200); }
      return send(200, {
        loadError,
        collections: Object.keys(floors).length,
        lastFetchAgeMin: floorsAt ? Math.round((now - floorsAt) / 60000) : null,
        maxPriceAgeHours: MAX_PRICE_AGE_HOURS
      });
    }
    
    if (req.method !== 'POST') return send(404, { error: 'not found' });
    if (rateLimited(ip)) return send(429, { error: 'too many requests' });

    try {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 10000) throw new HttpError(413, 'слишком большой запрос'); }
      let body;
      try { body = JSON.parse(raw || '{}'); } catch { throw new HttpError(400, 'некорректный JSON'); }
      if (req.url === '/floor') return send(200, await handleFloor(body));
      if (req.url === '/quote') return send(200, await handleQuote(body, key));
      if (req.url === '/escrow') return send(200, await handleEscrow(body));
      return send(404, { error: 'not found' });
    } catch (e) {
      if (e instanceof HttpError) return send(e.code, { error: e.message });
      console.error(e);
      return send(500, { error: 'внутренняя ошибка оракула' });
    }
  });
  server.listen(PORT, () => console.log('Оракул слушает порт ' + PORT));
}

// ====== ЗАПУСК ======
const key = loadKey();
console.log('Пул         :', POOL_ADDRESS);
console.log('signerKey   : 0x' + key.pubHex.slice(0, 8) + '…' + key.pubHex.slice(-4));
console.log('Лимит займа :', Number(MAX_LOAN_NANO) / 1e9, 'GRAM');

// СРАЗУ СЛУШАЕМ ПОРТ (чтобы Render не убил контейнер)
startServer(key);

// Асинхронно грузим цены в фоне
(async () => {
  for (let i = 0; i < 5; i++) {
    try {
      await loadFloors();
      break;
    } catch (e) {
      console.log(`Попытка ${i+1} не удалась. Ждем...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
})();

setInterval(() => {
  loadFloors().catch(e => console.error('Фоновое обновление:', e.message));
}, FLOORS_TTL_MS);
