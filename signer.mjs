// Оракул GiftLoan v2. Без внешних библиотек: нужен только Node.js 18+.
// Запуск (Windows, чёрное окно):
//   cd C:\Users\Владелец\giftloan
//   set SIGNER_SEED=ваши_64_hex_символа
//   node signer.mjs
// Проверка без сети: node signer.mjs --selftest
//
// Что делает:
//   POST /floor  {nft}                              -> {eligible, floor, basis, reason}
//   POST /quote  {nft, borrower, termDays, ltvBps}  -> {principalNano, repayNano, termDays, expiresAt, sig}
// Подпись ed25519 ставится на хэш ячейки:
//   [адрес пула][адрес NFT][адрес заёмщика][coins principal][uint16 term][uint32 exp]
// Это ровно то, что проверяет GiftLoanPool.LoanRequest.

import http from 'node:http';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ====== НАСТРОЙКИ ======
const POOL_ADDRESS = process.env.POOL_ADDRESS || 'EQA1_3bfycnsCmtrmOA6ig6grVX4leWzC7waOmzi4QrUSLZP';
const PORT = Number(process.env.PORT || 8787);
const MAX_LOAN_NANO = BigInt(Math.round(Number(process.env.MAX_LOAN_GRAM || '100000') * 1e9));
const FLOOR_DISCOUNT_BPS = 9000n;   
const MAX_LTV_BPS = 4000;           
const MIN_LTV_BPS = 100;
const QUOTE_TTL_SEC = 300;          
const TERMS = { 1: 50n, 7: 150n, 14: 440n, 21: 960n, 31: 1990n };

// Новый источник цен от Portal Market
const FLOORS_URL = 'https://portal-market.com/api/partners';
const FLOORS_TTL_MS = 5 * 60 * 1000; // Кэш на 5 минут для соблюдения лимита 1 RPS
const MAX_PRICE_AGE_HOURS = Number(process.env.MAX_PRICE_AGE_HOURS || '12'); 
const MAX_FETCH_AGE_MS = 30 * 60 * 1000;   
const RATE_LIMIT_PER_MIN = 40;

const COLLECTION_WHITELIST = process.env.COLLECTION_WHITELIST || '';
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const PORTAL_API_KEY = process.env.PORTAL_API_KEY || ''; // Ключ подтянется из Render


// ====== КЛЮЧ ======
function loadKey() {
  const seedHex = (process.env.SIGNER_SEED || '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(seedHex)) {
    console.error('SIGNER_SEED не задан или не 64 hex-символа. Введите: set SIGNER_SEED=...');
    process.exit(1);
  }
  const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const priv = crypto.createPrivateKey({ key: Buffer.concat([pkcs8Prefix, Buffer.from(seedHex, 'hex')]), format: 'der', type: 'pkcs8' });
  const x = crypto.createPublicKey(priv).export({ format: 'jwk' }).x;
  const pubHex = Buffer.from(x, 'base64url').toString('hex');
  return { priv, pubHex };
}

// ====== АДРЕСА И ЯЧЕЙКИ (минимальная реализация TON) ======
function parseAddress(s) {
  s = String(s).trim();
  let wc, hash;
  const raw = s.match(/^(-?\d+):([0-9a-fA-F]{64})$/);
  if (raw) {
    wc = Number(raw[1]);
    hash = Buffer.from(raw[2], 'hex');
  } else {
    const b = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (b.length !== 36) throw new Error('bad address');
    const crc = crc16(b.subarray(0, 34));
    if (((crc >> 8) & 255) !== b[34] || (crc & 255) !== b[35]) throw new Error('bad address checksum');
    wc = b.readInt8(1);
    hash = b.subarray(2, 34);
  }
  return { wc, hash: Buffer.from(hash) };
}
function crc16(buf) {
  let crc = 0;
  for (const byte of buf) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
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
  // хэш обычной ячейки без ссылок
  hash() {
    const n = this.bits.length;
    const padded = this.bits.slice();
    if (n % 8) { padded.push(1); while (padded.length % 8) padded.push(0); }
    const data = Buffer.alloc(padded.length / 8);
    padded.forEach((bit, i) => { if (bit) data[i >> 3] |= 0x80 >> (i & 7); });
    const d1 = 0;
    const d2 = Math.ceil(n / 8) + Math.floor(n / 8);
    return crypto.createHash('sha256').update(Buffer.concat([Buffer.from([d1, d2]), data])).digest();
  }
}

function quoteHash(pool, nft, borrower, principal, term, exp) {
  return new Bits().address(pool).address(nft).address(borrower).coins(principal).uint(term, 16).uint(exp, 32).hash();
}

// ====== ЦЕНЫ ======
const normalizeKey = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const pickBestFloor = e => {
  const v = [e.floor_price_ton, e.getgems_price_ton, e.tgmrkt_price_ton, e.portal_price_ton].map(Number).filter(x => x > 0 && isFinite(x));
  return v.length ? Math.min(...v) : null;
};
let floors = {};
let floorsAt = 0;          // когда оракул в последний раз успешно скачал цены (мс)
let floorsSourceAt = null; // когда сами цены обновили в источнике (мс), null — неизвестно

// Возраст данных: сначала ищем метку времени в самом файле, затем дату последнего коммита файла.
const TIME_KEYS = ['updated_at', 'last_updated', 'lastUpdated', 'updatedAt', 'timestamp', 'generated_at', 'generatedAt', 'date'];
function parseTime(v) {
  if (typeof v === 'number' && isFinite(v) && v > 0) return v > 1e12 ? v : v * 1000;
  if (typeof v === 'string' && v.trim()) { const t = Date.parse(v); return isNaN(t) ? null : t; }
  return null;
}
function sourceTimeFromData(data) {
  for (const k of TIME_KEYS) { const t = parseTime(data && data[k]); if (t) return t; }
  return null;
}
async function sourceTimeFromGithub() {
  try {
    const r = await fetch(FLOORS_COMMITS_URL, { headers: { 'User-Agent': 'giftloan-oracle', Accept: 'application/vnd.github+json' } });
    if (!r.ok) return null;
    const arr = await r.json();
    return parseTime(arr && arr[0] && arr[0].commit && arr[0].commit.committer && arr[0].commit.committer.date);
  } catch { return null; }
}
// Не выдаём займы по устаревшим ценам.
function assertFreshPrices() {
  if (Date.now() - floorsAt > MAX_FETCH_AGE_MS)
    throw new HttpError(503, 'Цены не обновлялись больше 30 минут, займы временно приостановлены');
}

async function loadFloors() {
  if (Date.now() - floorsAt < FLOORS_TTL_MS && Object.keys(floors).length) return;
  
    const headers = { 'User-Agent': 'giftloan-oracle' };
  if (PORTAL_API_KEY) {
    // Пробуем стандартный Bearer схема авторизации
    headers['Authorization'] = PORTAL_API_KEY.trim();
  }


    const r = await fetch(FLOORS_URL, { headers, cache: 'no-cache' });
  
  // Отладочный вывод для логов Render
  console.log('Portal Market status:', r.status);
  const textBody = await r.text();
  console.log('Portal Market body:', textBody.slice(0, 300));

  if (!r.ok) throw new Error('Portal Market HTTP ' + r.status);
  
  const data = JSON.parse(textBody);
  const map = {};


  const items = Array.isArray(data) ? data : (data.items || data.collections || []);

  for (const item of items) {
    const price = Number(item.floor_price || item.floorPrice || item.price);
    const name = normalizeKey(item.name || item.collection_name || item.title);

    if (price > 0 && isFinite(price) && name) {
      map[name] = price;
    }
  }

  if (!Object.keys(map).length) throw new Error('Portal Market returned empty floors');

    floors = map;
  floorsAt = Date.now();
  floorsSourceAt = Date.now();

  console.log('Цены подарков обновлены:', Object.keys(map).length, 'коллекций');
}

const floorLookup = name => {
  const k = normalizeKey(name);

  const v = floors[k] ?? floors[k.replace(/s$/, '')];
  return v > 0 ? v : null;
};

// ====== БЕЛЫЙ СПИСОК КОЛЛЕКЦИЙ ======
const allowedCollections = new Set();
for (const a of COLLECTION_WHITELIST.split(',').map(x => x.trim()).filter(Boolean)) {
  try { const p = parseAddress(a); allowedCollections.add(p.wc + ':' + p.hash.toString('hex')); }
  catch { console.error('COLLECTION_WHITELIST: неверный адрес', a); process.exit(1); }
}
function collectionAllowed(rawAddr) {
  try { const p = parseAddress(rawAddr); return allowedCollections.has(p.wc + ':' + p.hash.toString('hex')); }
  catch { return false; }
}

// ====== ДАННЫЕ NFT ======
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
      const r = await fetch('https://tonapi.io' + pq, {
        headers: TONAPI_KEY ? { Authorization: 'Bearer ' + TONAPI_KEY } : {}
      });
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
    if (!Object.keys(floors).length) throw new HttpError(503, 'Источник цен недоступен');
  }
  assertFreshPrices();
  if (!allowedCollections.size) throw new HttpError(503, 'Оракул не настроен: не задан COLLECTION_WHITELIST');
  const nft = await fetchNft(toFriendly(addr));
  if (!nft.collection?.address || !collectionAllowed(nft.collection.address))
    return { addr, nft, eligible: false, reason: 'эта коллекция не входит в список принимаемых' };
  const collection = nft.collection?.name;
  const name = nft.metadata?.name;
  const floor = floorLookup(collection) ?? floorLookup(String(name || '').replace(/\s*#\d+$/, ''));
  if (!floor) return { addr, nft, eligible: false, reason: 'коллекции «' + (collection || '?') + '» нет в источнике цен' };
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
  if (!TERMS[term]) throw new HttpError(400, 'Срок должен быть 1, 7, 14, 21 или 31 день');
  if (!Number.isInteger(ltv) || ltv < MIN_LTV_BPS || ltv > MAX_LTV_BPS) throw new HttpError(400, 'LTV должен быть от 1% до 40%');
  let borrower;
  try { borrower = parseAddress(body.borrower); } catch { throw new HttpError(400, 'Неверный адрес заёмщика'); }

  const p = await priceNft(body.nft);
  if (!p.eligible) throw new HttpError(422, p.reason);

  // подарок должен принадлежать заёмщику (не стоять на продаже и т.п.)
  const ownerRaw = p.nft.owner?.address;
  if (!ownerRaw || !sameAddr(parseAddress(ownerRaw), borrower)) throw new HttpError(422, 'Этот NFT не принадлежит указанному кошельку');

  const floorNano = BigInt(Math.floor(p.floor * 1e9));
  let principal = floorNano * FLOOR_DISCOUNT_BPS / 10000n * BigInt(ltv) / 10000n;
  if (principal > MAX_LOAN_NANO) principal = MAX_LOAN_NANO;   // не выше лимита пула
  if (principal <= 0n) throw new HttpError(422, 'Сумма займа слишком мала');

  // та же формула, что в контракте
  const interest = (principal * TERMS[term] + 9999n) / 10000n;
  const repay = principal + interest;
  const exp = Math.floor(Date.now() / 1000) + QUOTE_TTL_SEC;

  const h = quoteHash(parseAddress(POOL_ADDRESS), p.addr, borrower, principal, term, exp);
  const sig = crypto.sign(null, h, key.priv);
  return {
    principalNano: principal.toString(),
    repayNano: repay.toString(),
    termDays: term,
    expiresAt: exp,
    floor: p.floor,
    sig: sig.toString('base64')
  };
}

// ====== STATEINIT ХРАНИЛИЩА (для создания хранилища и отправки NFT одной транзакцией) ======
// Данные считает вспомогательный скрипт escrow_init.ts через ts-node (тот же способ, что у prepare_deploy.ts).
// Первый запрос по новому NFT занимает несколько секунд, потом ответ берётся из памяти.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const initCache = new Map();
let initRunning = 0;
function runEscrowInit(nftFriendly) {
  if (initCache.has(nftFriendly)) return initCache.get(nftFriendly);
  if (initCache.size > 300) initCache.delete(initCache.keys().next().value);
  const p = new Promise((resolve, reject) => {
    if (initRunning >= 2) return reject(new HttpError(429, 'too many requests'));
    initRunning++;
    // Аргументы передаём массивом, без shell (на Linux/Render). Shell нужен только на Windows для npx.cmd.
    const safe = /^[\w:-]+$/;
    if (!safe.test(POOL_ADDRESS) || !safe.test(nftFriendly)) { initRunning--; return reject(new HttpError(400, 'Неверный адрес')); }
    const isWin = process.platform === 'win32';
    const args = ['-y', 'ts-node', '-T', '-D', '5011', 'escrow_init.ts', POOL_ADDRESS, nftFriendly];
    execFile(isWin ? 'npx.cmd' : 'npx', args, { cwd: HERE, shell: isWin, timeout: 90000, windowsHide: true }, (err, stdout, stderr) => {
      initRunning--;
      if (err) { console.error('escrow_init:', String(stderr || err).slice(0, 500)); return reject(new HttpError(500, 'не удалось посчитать хранилище (см. окно оракула)')); }
      const line = String(stdout).split(/\r?\n/).reverse().find(l => l.trim().startsWith('{'));
      try { resolve(JSON.parse(line)); } catch { reject(new HttpError(500, 'неожиданный ответ escrow_init')); }
    });
  });
  initCache.set(nftFriendly, p);
  p.catch(() => initCache.delete(nftFriendly));
  return p;
}

async function handleEscrow(body) {
  const p = await priceNft(body.nft);                 // только для NFT, которые оракул готов оценить
  if (!p.eligible) throw new HttpError(422, p.reason);
  const r = await runEscrowInit(toFriendly(p.addr));
  if (!r.stateInit || !r.address) throw new HttpError(500, 'пустой ответ escrow_init');
  return { address: r.address, stateInit: r.stateInit };
}

// ====== СЕРВЕР ======
const hits = new Map();
function rateLimited(ip, limit = RATE_LIMIT_PER_MIN) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 60000) hits.delete(k);
  return arr.length > limit;
}

function startServer(key) {
  const server = http.createServer(async (req, res) => {
    const send = (code, obj) => {
      res.writeHead(code, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOW_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(JSON.stringify(obj));
    };
    // берём ПРАВЫЙ адрес: его добавил прокси хостинга, левые клиент может подделать
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
    if (req.method === 'GET' && req.url === '/status') {
      const now = Date.now();
      return send(200, {
        collections: Object.keys(floors).length,
        lastFetchAgeMin: floorsAt ? Math.round((now - floorsAt) / 60000) : null,
        sourceAgeHours: floorsSourceAt ? Number(((now - floorsSourceAt) / 3600000).toFixed(2)) : null,
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
  server.listen(PORT, () => console.log('Оракул слушает http://localhost:' + PORT));
}

// ====== САМОПРОВЕРКА (без сети и без денег) ======
function selftest() {
  let ok = true;
  const check = (name, cond) => { console.log((cond ? 'OK   ' : 'FAIL ') + name); if (!cond) ok = false; };
  const empty = new Bits().hash().toString('hex');
  check('хэш пустой ячейки', empty === '96a296d224f285c67bee93c30f8a309157f0daa35dc5b87e410b78630a09cfc7');
  const a = parseAddress(POOL_ADDRESS);
  check('адрес пула разбирается и собирается обратно', toFriendly(a) === POOL_ADDRESS.replace(/=+$/, '') || toFriendly(a) === POOL_ADDRESS);
  const seed = '00'.repeat(32);
  process.env.SIGNER_SEED = seed;
  const k = loadKey();
  check('ключ из нулевого seed (эталон ed25519)', k.pubHex === '3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29');
  const h = quoteHash(a, a, a, 1500000000n, 14, 1800000000);
  const sig = crypto.sign(null, h, k.priv);
  check('подпись проверяется', crypto.verify(null, h, crypto.createPublicKey(k.priv), sig));
  const calc = (p, t) => (p * TERMS[t] + 9999n) / 10000n;
  check('проценты 1 день от 1 GRAM = 0.005 GRAM', calc(1000000000n, 1) === 5000000n);
  check('проценты 14 дней от 1 GRAM = 0.044 GRAM', calc(1000000000n, 14) === 44000000n);
  check('проценты 31 день от 1 GRAM = 0.199 GRAM', calc(1000000000n, 31) === 199000000n);
  allowedCollections.add('0:' + 'ab'.repeat(32));
  check('белый список: свой адрес проходит', collectionAllowed('0:' + 'ab'.repeat(32)));
  check('белый список: чужой адрес не проходит', !collectionAllowed('0:' + 'cd'.repeat(32)));
  check('белый список: мусор не проходит', !collectionAllowed('abc'));
  allowedCollections.clear();
  check('сроки ровно 1/7/14/21/31', Object.keys(TERMS).join() === '1,7,14,21,31');
  // защита от устаревших цен
  check('время: секунды и миллисекунды', parseTime(1700000000) === 1700000000000 && parseTime(1700000000000) === 1700000000000);
  check('время: ISO-строка', parseTime('2026-10-28T00:00:00Z') === Date.UTC(2026, 9, 28));
  check('время: из данных файла', sourceTimeFromData({ updated_at: '2026-10-28T00:00:00Z' }) === Date.UTC(2026, 9, 28) && sourceTimeFromData({}) === null);
  const fails = fn => { try { fn(); return false; } catch (e) { return e && e.code === 503; } };
  floorsAt = Date.now(); floorsSourceAt = Date.now() - 1 * 3600000;
  check('свежие цены проходят', !fails(assertFreshPrices));
  floorsSourceAt = Date.now() - (MAX_PRICE_AGE_HOURS + 1) * 3600000;
  check('источник старше лимита блокирует', fails(assertFreshPrices));
  floorsSourceAt = null;
  check('возраст источника неизвестен — не блокирует', !fails(assertFreshPrices));
  floorsAt = Date.now() - MAX_FETCH_AGE_MS - 1000; floorsSourceAt = Date.now();
  check('давно не обновляли цены — блокирует', fails(assertFreshPrices));
  process.exit(ok ? 0 : 1);
}

if (process.argv.includes('--selftest')) selftest();
else {
  const key = loadKey();
  console.log('Пул         :', POOL_ADDRESS);
  console.log('signerKey   : 0x' + key.pubHex.slice(0, 8) + '…' + key.pubHex.slice(-4), '(должно быть 0x8bb34f1b…ba30)');
  console.log('Лимит займа :', Number(MAX_LOAN_NANO) / 1e9, 'GRAM');
  startServer(key);
}
