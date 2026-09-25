'use strict';
/* 澄音 · 手机版（PWA）
 * 手机直接连 archive.org / Jamendo / LRCLIB（都支持跨域），不需要 PC。
 * 下载的歌存在 Cache Storage，离线可播；歌曲信息通过 Media Session 交给系统，CarPlay / 锁屏可以显示和控制。
 */
const VERSION = '0.1.0';
const TRACK_CACHE = 'cy-tracks-v1';

/* ---------------- 工具 ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const first = v => Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
function fmtTime(s) {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
const fmtMB = b => b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : (b / 1048576).toFixed(0) + ' MB';
let toastTimer;
function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (err ? ' err' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = ''), 2800);
}
function load(key, def) { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 空间满了也别崩 */ } }
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`网络错误 ${r.status}`);
  return r.json();
}

const P_ = d => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
const IC = {
  play: P_('M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z'),
  pause: P_('M6.5 5h4v14h-4zM13.5 5h4v14h-4z'),
  next: P_('M4 6.3v11.4a1 1 0 0 0 1.52.85L13 13.9v3.8a1 1 0 0 0 1.52.85l8-5.7a1 1 0 0 0 0-1.7l-8-5.7A1 1 0 0 0 13 6.3v3.8L5.52 5.45A1 1 0 0 0 4 6.3z'),
  prev: P_('M20 6.3v11.4a1 1 0 0 1-1.52.85L11 13.9v3.8a1 1 0 0 1-1.52.85l-8-5.7a1 1 0 0 1 0-1.7l8-5.7A1 1 0 0 1 11 6.3v3.8l7.48-4.65A1 1 0 0 1 20 6.3z'),
  repeat: P_('M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'),
  repeatOne: P_('M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z'),
  lyrics: P_('M4 5h16v2H4zm0 4h10v2H4zm0 4h16v2H4zm0 4h10v2H4z'),
  down: P_('M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z'),
  back: P_('M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z'),
  download: P_('M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z'),
  check: P_('M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'),
  search: P_('M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'),
  compass: P_('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19zM12 10.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z'),
  list: P_('M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z'),
  gear: P_('M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.67 8.48a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.05.24.25.42.49.42h3.84c.24 0 .45-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z'),
  note: P_('M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z'),
  close: P_('M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z'),
  trash: P_('M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'),
};
function paintIcons(root = document) { $$('i[data-ic]', root).forEach(i => (i.innerHTML = IC[i.dataset.ic] || '')); }

/* ---------------- 设置 / 本地数据 ---------------- */
const settings = Object.assign({ offlineOnly: false, jamendo: '' }, load('cy.settings', {}));
const saveSettings = () => save('cy.settings', settings);
// lib.albums：下载过的专辑（离线也能显示）；lib.saved：已缓存的曲目 url → 字节数
const lib = Object.assign({ albums: {}, saved: {} }, load('cy.lib', {}));
const saveLib = () => save('cy.lib', lib);

/* ---------------- 音源 ---------------- */
const SOURCES = [
  { id: 'lma', name: '现场录音', ph: '搜乐队，如 John Mayer、Grateful Dead', q: 'collection:etree',
    note: 'Live Music Archive：乐队允许录音并非商业交换' },
  { id: 'netlabels', name: '独立厂牌', ph: '搜艺人 / 专辑 / 风格', q: 'collection:netlabels', note: 'Creative Commons 授权' },
  { id: 'classical', name: '古典', ph: '搜作曲家 / 作品，如 Chopin、Goldberg',
    q: 'mediatype:audio AND subject:classical AND (licenseurl:*publicdomain* OR licenseurl:*creativecommons*)',
    note: '公有领域 / Creative Commons' },
  { id: 'jamendo', name: 'Jamendo', ph: '搜歌曲 / 艺人 / 风格', note: 'Creative Commons 授权' },
];
const SORTS = { downloads: 'downloads desc', date: 'publicdate desc', rating: 'avg_rating desc' };
const cleanQ = q => (q || '').replace(/[\\+\-!():^\[\]"{}~*?|&/]/g, ' ').trim();
const seconds = v => {
  v = String(v || '');
  if (v.includes(':')) return v.split(':').reduce((s, p) => s * 60 + (+p || 0), 0);
  return +v || 0;
};

async function iaSearch(src, q, hires, sort, page) {
  const s = SOURCES.find(x => x.id === src);
  const fmt = hires ? 'format:"24bit Flac"' : '(format:Flac OR format:"24bit Flac")';
  // stream_only / access-restricted：艺人只授权网页试听，拿不到文件
  let query = `${s.q} AND ${fmt} AND NOT collection:stream_only AND NOT access-restricted-item:true`;
  const w = cleanQ(q);
  if (w) query += ` AND (title:(${w}) OR creator:(${w}))`;
  const p = new URLSearchParams([['q', query], ['fl[]', 'identifier'], ['fl[]', 'title'], ['fl[]', 'creator'], ['fl[]', 'date'],
    ['sort[]', SORTS[sort] || SORTS.downloads], ['rows', '30'], ['page', String(page)], ['output', 'json']]);
  const r = (await getJSON('https://archive.org/advancedsearch.php?' + p)).response;
  return {
    total: r.numFound,
    items: r.docs.map(d => ({ id: d.identifier, title: first(d.title) || d.identifier, artist: first(d.creator),
      date: String(first(d.date)).slice(0, 10), cover: `https://archive.org/services/img/${d.identifier}` })),
  };
}

async function iaAlbum(id) {
  const meta = await getJSON('https://archive.org/metadata/' + enc(id));
  if (!meta.metadata) throw new Error('archive.org 上找不到这张专辑');
  const md = meta.metadata;
  // iPhone 能直接放 FLAC / MP3（放不了 SHN）。挑最全的无损版本；无损版本不全时退回完整的 MP3 版
  const groups = {};
  for (const f of meta.files || []) {
    if (f.private === 'true') continue;
    if (['24bit Flac', 'Flac', 'VBR MP3'].includes(f.format)) (groups[f.format] ||= []).push(f);
  }
  const ll = ['24bit Flac', 'Flac'].filter(k => groups[k]).sort((a, b) => groups[b].length - groups[a].length)[0];
  const mp3 = groups['VBR MP3'] || [];
  const fmt = ll && groups[ll].length >= mp3.length ? ll : (mp3.length ? 'VBR MP3' : ll);
  const files = (groups[fmt] || []).slice().sort((a, b) =>
    ((parseInt(first(a.track)) || 9999) - (parseInt(first(b.track)) || 9999)) || a.name.localeCompare(b.name));
  const artist = first(md.creator), title = first(md.title) || id;
  const cover = `https://archive.org/services/img/${id}`;
  const coll = [].concat(md.collection || []);
  const src = coll.includes('etree') ? SOURCES[0] : coll.includes('netlabels') ? SOURCES[1] : SOURCES[2];
  return {
    key: 'ia:' + id, id, title, artist, cover, date: String(first(md.date)).slice(0, 10), venue: first(md.venue),
    license: first(md.licenseurl), note: src.note, page: `https://archive.org/details/${id}`,
    tracks: files.map((f, i) => ({
      no: i + 1, title: first(f.title) || f.name.replace(/\.[^.]+$/, '').replace(/^.*\//, ''),
      artist: first(f.creator) || artist, album: title, cover, duration: seconds(first(f.length)),
      url: `https://archive.org/download/${enc(id)}/${f.name.split('/').map(enc).join('/')}`,
      size: +f.size || 0, hires: f.format === '24bit Flac', lossless: f.format !== 'VBR MP3',
      codec: f.format === 'VBR MP3' ? 'MP3' : 'FLAC', albumKey: 'ia:' + id,
    })),
  };
}

async function jamendoSearch(q, page) {
  if (!settings.jamendo) throw new Error('NOKEY');
  const p = new URLSearchParams({ client_id: settings.jamendo, format: 'json', limit: 40, offset: (page - 1) * 40,
    audiodlformat: 'flac', imagesize: 300, order: 'popularity_total' });
  if (q) p.set('search', q);
  const j = await getJSON('https://api.jamendo.com/v3.0/tracks/?' + p);
  if (j.headers?.status !== 'success') throw new Error('Jamendo：' + (j.headers?.error_message || '出错了'));
  return {
    total: j.headers.results_fullcount || j.results.length,
    tracks: j.results.map(t => {
      const dl = !!t.audiodownload_allowed && t.audiodownload;
      return { title: t.name, artist: t.artist_name, album: t.album_name, cover: t.album_image || t.image,
        duration: +t.duration || 0, url: dl ? t.audiodownload : t.audio, lossless: !!dl, codec: dl ? 'FLAC' : 'MP3',
        albumKey: 'jm:' + t.album_id, albumId: t.album_id };
    }),
  };
}

const lyrCache = {};
async function lrclib(t) {
  const key = t.title + '|' + t.artist;
  if (key in lyrCache) return lyrCache[key];
  let res = null;
  try {
    const p = new URLSearchParams({ track_name: t.title, artist_name: t.artist || '' });
    if (t.duration) p.set('duration', Math.round(t.duration));
    let j = null;
    const r = await fetch('https://lrclib.net/api/get?' + p);
    if (r.ok) j = await r.json();
    else {
      const lst = await getJSON('https://lrclib.net/api/search?' + new URLSearchParams({ track_name: t.title, artist_name: t.artist || '' }));
      j = lst.find(x => x.syncedLyrics) || lst[0] || null;
    }
    if (j) res = { synced: j.syncedLyrics, plain: j.plainLyrics };
  } catch { /* 没歌词 */ }
  return (lyrCache[key] = res);
}

/* ---------------- 离线下载 ---------------- */
const mimeOf = url => /\.mp3($|\?)/i.test(url) ? 'audio/mpeg' : /\.ogg($|\?)/i.test(url) ? 'audio/ogg' : 'audio/flac';
const DL = { queue: [], running: false, prog: {} }; // prog[url] = 0~1

function rememberAlbum(album) {
  const a = { ...album, tracks: album.tracks.map(t => ({ ...t })) };
  delete a.loading;
  lib.albums[a.key] = a;
  saveLib();
}

function queueDownload(album, tracks) {
  rememberAlbum(album);
  const todo = tracks.filter(t => !lib.saved[t.url] && !DL.queue.includes(t) && !(t.url in DL.prog));
  if (!todo.length) return toast('都已经下载好了');
  todo.forEach(t => (DL.prog[t.url] = 0));
  DL.queue.push(...todo);
  toast(`开始下载 ${todo.length} 首（建议连 Wi-Fi）`);
  navigator.storage?.persist?.();
  runDownloads();
  refreshDownloadUI();
}

async function runDownloads() {
  if (DL.running) return;
  DL.running = true;
  while (DL.queue.length) {
    const t = DL.queue.shift();
    try {
      await downloadOne(t);
    } catch (e) {
      toast(`《${t.title}》下载失败：${e.message}`, true);
    }
    delete DL.prog[t.url];
    refreshDownloadUI();
  }
  DL.running = false;
  estimateStorage();
}

async function downloadOne(t) {
  const res = await fetch(t.url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const total = +res.headers.get('Content-Length') || t.size || 0;
  let got = 0, last = 0;
  const count = n => {
    got += n;
    if (total) DL.prog[t.url] = got / total;
    if (Date.now() - last > 400) { last = Date.now(); refreshDownloadUI(); }
  };
  const headers = { 'Content-Type': mimeOf(t.url) };
  const cache = await caches.open(TRACK_CACHE);
  if (res.body && typeof TransformStream !== 'undefined') {
    // 边下边写进缓存，不把整首歌攒在内存里
    const body = res.body.pipeThrough(new TransformStream({ transform(chunk, ctl) { count(chunk.byteLength); ctl.enqueue(chunk); } }));
    await cache.put(t.url, new Response(body, { headers }));
  } else {
    const blob = await res.blob();
    count(blob.size);
    await cache.put(t.url, new Response(blob, { headers }));
  }
  lib.saved[t.url] = got;
  saveLib();
}

async function deleteAlbum(key) {
  const a = lib.albums[key];
  if (!a) return;
  const cache = await caches.open(TRACK_CACHE);
  for (const t of a.tracks) { await cache.delete(t.url); delete lib.saved[t.url]; }
  delete lib.albums[key];
  saveLib();
  estimateStorage();
}

// 启动时核对：系统可能清过缓存，别让界面显示"已下载"但其实没了
async function reconcileCache() {
  try {
    const keys = new Set((await (await caches.open(TRACK_CACHE)).keys()).map(r => r.url));
    let changed = false;
    for (const u of Object.keys(lib.saved)) if (!keys.has(u)) { delete lib.saved[u]; changed = true; }
    if (changed) { saveLib(); toast('系统清理过存储，部分已下载的歌需要重新下载', true); }
  } catch { /* 忽略 */ }
}

const storage = { usage: 0, quota: 0, persisted: false };
async function estimateStorage() {
  try {
    const e = await navigator.storage.estimate();
    storage.usage = e.usage || 0; storage.quota = e.quota || 0;
    storage.persisted = await navigator.storage.persisted?.() || false;
  } catch { /* 不支持 */ }
  if (S.tab === 'settings' && !S.stack.length) render();
}

/* ---------------- 播放器 ---------------- */
const audio = new Audio();
audio.preload = 'auto';
const P = { queue: [], idx: -1, repeat: 'off', next: null, curSrc: '', unlocked: false, resumeAt: 0 };

function makeSilence() {
  // 0.05 秒静音 WAV：第一次点击时先"解锁"播放器，之后异步取到的歌才能正常开播（iOS 限制）
  const n = 2205, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
const SILENCE = makeSilence();

async function srcFor(t) {
  if (lib.saved[t.url]) {
    const r = await (await caches.open(TRACK_CACHE)).match(t.url);
    if (r) return URL.createObjectURL(new Blob([await r.blob()], { type: mimeOf(t.url) }));
    delete lib.saved[t.url]; saveLib();
  }
  if (settings.offlineOnly) throw new Error('这首还没下载（设置里开了"只播已下载"）');
  return t.url;
}

function setSrc(src) {
  const old = P.curSrc;
  P.curSrc = src;
  audio.src = src;
  if (old && old.startsWith('blob:') && old !== src && old !== SILENCE && (!P.next || P.next.src !== old)) URL.revokeObjectURL(old);
}

function nextIndex(auto) {
  if (auto && P.repeat === 'one') return P.idx;
  if (P.idx + 1 < P.queue.length) return P.idx + 1;
  if (P.repeat === 'all' && P.queue.length) return 0;
  return null;
}

function unlock() {
  if (P.unlocked) return;
  P.unlocked = true;
  P.curSrc = SILENCE;
  audio.src = SILENCE;
  audio.play().catch(() => {});
}

async function playTracks(tracks, i = 0) {
  unlock();
  P.queue = tracks.map(t => ({ ...t }));
  P.next = null;
  await playAt(i);
}

async function playAt(i, startAt = 0) {
  unlock();
  if (i < 0 || i >= P.queue.length) return;
  P.idx = i;
  const t = P.queue[i];
  onTrackChange(t);
  let src;
  if (P.next && P.next.i === i) { src = P.next.src; P.next = null; }
  else {
    try { src = await srcFor(t); } catch (e) { toast(e.message, true); return; }
  }
  if (P.idx !== i) return; // 取文件期间用户又点了别的
  setSrc(src);
  P.resumeAt = 0;
  if (startAt > 1) audio.addEventListener('loadedmetadata', () => { audio.currentTime = startAt; }, { once: true });
  try { await audio.play(); } catch (e) { if (e.name !== 'AbortError') toast('播放失败：' + e.message, true); }
  prepareNext();
  saveState();
}

// 提前把下一首准备好：锁屏/CarPlay 时，这首一结束就能同步切过去（后台里再异步取文件容易被 iOS 卡住）
async function prepareNext() {
  const n = nextIndex(true);
  const old = P.next;
  P.next = null;
  if (old && old.src.startsWith('blob:') && old.src !== P.curSrc) URL.revokeObjectURL(old.src);
  if (n === null || n === P.idx) return;
  const t = P.queue[n];
  try {
    const src = await srcFor(t);
    if (nextIndex(true) === n && !P.next) P.next = { i: n, src };
    else if (src.startsWith('blob:')) URL.revokeObjectURL(src);
  } catch { /* 下一首没下载且开了只播已下载，到时候再提示 */ }
}

audio.addEventListener('ended', () => {
  if (P.curSrc === SILENCE) return;
  const n = nextIndex(true);
  if (n === null) { saveState(); return updatePlayState(); }
  if (n === P.idx) { audio.currentTime = 0; audio.play(); return; }
  if (P.next && P.next.i === n) {
    P.idx = n;
    const src = P.next.src;
    P.next = null;
    setSrc(src);
    audio.play().catch(() => {});
    onTrackChange(P.queue[n]);
    prepareNext();
    saveState();
  } else playAt(n);
});
audio.addEventListener('error', () => {
  if (!P.curSrc || P.curSrc === SILENCE) return;
  const t = P.queue[P.idx];
  toast(`《${t ? t.title : ''}》播放出错，可能是网络问题`, true);
});

function toggle() {
  if (!P.queue.length) return;
  if (P.curSrc === SILENCE || !P.curSrc) return playAt(Math.max(P.idx, 0), P.resumeAt);
  audio.paused ? audio.play().catch(() => {}) : audio.pause();
}
function next() { const n = nextIndex(false); if (n !== null) playAt(n); }
function prev() {
  if (audio.currentTime > 3 || P.idx <= 0) { audio.currentTime = 0; return; }
  playAt(P.idx - 1);
}

/* Media Session：锁屏、控制中心、CarPlay "正在播放"、方向盘按键都靠它 */
function setMediaSession(t) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title || '', artist: t.artist || '', album: t.album || '',
    artwork: t.cover ? [{ src: t.cover, sizes: '512x512' }] : [],
  });
}
if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  const h = (a, f) => { try { ms.setActionHandler(a, f); } catch { /* 不支持的动作 */ } };
  h('play', () => audio.play());
  h('pause', () => audio.pause());
  h('nexttrack', next);
  h('previoustrack', prev);
  h('seekto', e => { audio.currentTime = e.seekTime; });
  // 故意不设 seekforward/seekbackward：设了的话车机上会显示"快进 10 秒"而不是"下一首"
}
let lastPos = 0;
audio.addEventListener('timeupdate', () => {
  updateProgress();
  const now = Date.now();
  if (now - lastPos > 5000) {
    lastPos = now;
    saveState();
    try {
      if (audio.duration && isFinite(audio.duration))
        navigator.mediaSession?.setPositionState?.({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: 1 });
    } catch { /* 忽略 */ }
  }
});
['play', 'pause', 'playing', 'waiting'].forEach(ev => audio.addEventListener(ev, updatePlayState));

function saveState() {
  save('cy.state', { queue: P.queue, idx: P.idx, pos: audio.currentTime || P.resumeAt || 0, repeat: P.repeat });
}
function restoreState() {
  const st = load('cy.state', null);
  if (!st || !st.queue?.length) return;
  P.queue = st.queue; P.idx = st.idx; P.resumeAt = st.pos || 0; P.repeat = st.repeat || 'off';
  onTrackChange(P.queue[P.idx], true);
}

/* ---------------- 页面 ---------------- */
const S = {
  tab: 'discover',
  stacks: { discover: [], saved: [], queue: [], settings: [] }, // 每个标签页各自的返回栈
  get stack() { return this.stacks[this.tab]; },
  set stack(v) { this.stacks[this.tab] = v; },
  d: { src: 'lma', q: '', hires: false, sort: 'downloads', items: [], total: 0, page: 1, loading: false, token: 0, err: null },
  jam: { q: '', tracks: [], total: 0, page: 1, loading: false, err: null },
  lyr: { key: null, lines: [], plain: '', cur: -1, loading: false },
};

$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]'); if (!b) return;
  if (S.tab === b.dataset.tab && S.stack.length) S.stack = [];
  S.tab = b.dataset.tab;
  $$('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  render(true);
});

function push(page) { S.stack.push(page); render(true); }
function pop() { S.stack.pop(); render(true); }

function header(title, back) {
  $('#top').innerHTML = back
    ? `<div class="row"><button class="back" id="backBtn">${IC.back}返回</button></div>`
    : `<h1>${esc(title)}</h1>`;
  if (back) $('#backBtn').onclick = pop;
}

function render(scrollTop) {
  const v = $('#view');
  if (scrollTop) v.scrollTop = 0;
  const page = S.stack[S.stack.length - 1];
  if (page) { header('', true); return renderAlbum(v, page); }
  ({ discover: renderDiscover, saved: renderSaved, queue: renderQueue, settings: renderSettings })[S.tab](v);
}

/* 发现 */
function renderDiscover(v) {
  header('发现');
  const d = S.d, src = SOURCES.find(s => s.id === d.src);
  v.innerHTML = `
    <div class="chips">${SOURCES.map(s => `<button class="chip ${s.id === d.src ? 'on' : ''}" data-src="${s.id}">${s.name}</button>`).join('')}</div>
    <div class="search">${IC.search}<input id="q" type="search" enterkeyhint="search" placeholder="${esc(src.ph)}" value="${esc(d.src === 'jamendo' ? S.jam.q : d.q)}"></div>
    ${d.src !== 'jamendo' ? `<div class="opts">
      <select id="sort"><option value="downloads">最热门</option><option value="date">最新</option><option value="rating">评分最高</option></select>
      <label class="toggle"><input type="checkbox" id="hr" ${d.hires ? 'checked' : ''}>只看 24bit</label></div>` : ''}
    <div id="res"></div>`;
  $$('.chip', v).forEach(c => c.onclick = () => { if (d.src !== c.dataset.src) { d.src = c.dataset.src; d.items = []; d.err = null; renderDiscover(v); } });
  const q = $('#q', v);
  q.onkeydown = e => {
    if (e.key !== 'Enter') return;
    q.blur();
    if (d.src === 'jamendo') { S.jam.q = q.value.trim(); loadJam(true); } else { d.q = q.value.trim(); loadIA(true); }
  };
  if (d.src === 'jamendo') { if (!S.jam.tracks.length && !S.jam.err) loadJam(true); else drawJam(); return; }
  $('#sort', v).value = d.sort;
  $('#sort', v).onchange = e => { d.sort = e.target.value; loadIA(true); };
  $('#hr', v).onchange = e => { d.hires = e.target.checked; loadIA(true); };
  if (!d.items.length && !d.err) loadIA(true); else drawIA();
}

async function loadIA(reset) {
  const d = S.d, token = ++d.token;
  if (reset) { d.page = 1; d.items = []; } else d.page++;
  d.loading = true; d.err = null; drawIA();
  try {
    const r = await iaSearch(d.src, d.q, d.hires, d.sort, d.page);
    if (token !== d.token) return;
    d.items = d.items.concat(r.items); d.total = r.total;
  } catch (e) { if (token === d.token) d.err = e.message; }
  if (token !== d.token) return;
  d.loading = false; drawIA();
}

function drawIA() {
  const el = $('#res'); if (!el) return;
  const d = S.d;
  if (d.err && !d.items.length) { el.innerHTML = `<div class="empty"><b>加载失败</b>${esc(d.err)}<br>检查一下网络再试</div>`; return; }
  if (!d.items.length && !d.loading) { el.innerHTML = '<div class="empty"><b>没有找到</b>换个关键词试试</div>'; return; }
  el.innerHTML = `<div class="grid">${d.items.map((a, i) => `
      <div class="card" data-i="${i}">
        <div class="cover"><div class="ph">${IC.note}</div><img loading="lazy" src="${esc(a.cover)}" onerror="this.remove()">
          ${lib.albums['ia:' + a.id] ? `<span class="dl">${IC.check}</span>` : ''}</div>
        <div class="ct">${esc(a.title)}</div>
        <div class="cs">${esc([a.artist, a.date.slice(0, 4)].filter(Boolean).join(' · '))}</div>
      </div>`).join('')}</div>
    <div class="more">${d.loading ? '<div class="spinner"></div>' : d.items.length < d.total ? `<button class="btn" id="more">加载更多</button>` : ''}</div>`;
  el.onclick = e => {
    if (e.target.id === 'more') return loadIA(false);
    const c = e.target.closest('.card');
    if (c) openIA(d.items[+c.dataset.i]);
  };
}

async function openIA(a) {
  const saved = lib.albums['ia:' + a.id];
  const page = saved ? { ...saved } : { key: 'ia:' + a.id, title: a.title, artist: a.artist, cover: a.cover, tracks: [], loading: true };
  push(page);
  if (saved && !navigator.onLine) return;
  try {
    const full = await iaAlbum(a.id);
    Object.assign(page, full, { loading: false });
  } catch (e) {
    page.loading = false;
    if (!saved) page.err = e.message;
  }
  if (S.stack[S.stack.length - 1] === page) render();
}

async function loadJam(reset) {
  const j = S.jam;
  if (reset) { j.page = 1; j.tracks = []; } else j.page++;
  j.loading = true; j.err = null; drawJam();
  try { const r = await jamendoSearch(j.q, j.page); j.tracks = j.tracks.concat(r.tracks); j.total = r.total; }
  catch (e) { j.err = e.message; }
  j.loading = false; drawJam();
}

function drawJam() {
  const el = $('#res'); if (!el) return;
  const j = S.jam;
  if (j.err === 'NOKEY') {
    el.innerHTML = `<div class="empty"><b>需要一个免费的 Jamendo Client ID</b>在 devportal.jamendo.com 注册后新建一个应用就能拿到，<br>然后填到「设置」里。</div>`;
    return;
  }
  if (j.err) { el.innerHTML = `<div class="empty"><b>Jamendo 连不上</b>${esc(j.err)}</div>`; return; }
  if (!j.tracks.length) { el.innerHTML = j.loading ? '<div class="spinner"></div>' : '<div class="empty"><b>没有找到</b></div>'; return; }
  el.innerHTML = `<div class="actions"><button class="btn primary" id="jp">${IC.play}全部播放</button><button class="btn" id="jd">${IC.download}下载 FLAC</button></div>
    <div id="jt"></div><div class="more">${j.loading ? '<div class="spinner"></div>' : j.tracks.length < j.total ? '<button class="btn" id="jm">加载更多</button>' : ''}</div>`;
  trackList($('#jt'), j.tracks, true);
  $('#jp').onclick = () => playTracks(j.tracks, 0);
  $('#jd').onclick = () => {
    const ok = j.tracks.filter(t => t.lossless);
    if (!ok.length) return toast('这一页没有允许下载的 FLAC');
    queueDownload({ key: 'jm:search:' + (j.q || 'top'), title: j.q ? `Jamendo · ${j.q}` : 'Jamendo 精选', artist: 'Jamendo',
      cover: ok[0].cover, tracks: ok, note: 'Creative Commons 授权' }, ok);
  };
  const m = $('#jm'); if (m) m.onclick = () => loadJam(false);
}

/* 专辑页 */
function renderAlbum(v, a) {
  if (a.loading) { v.innerHTML = `<div class="album-head"><img class="album-cover" src="${esc(a.cover)}"><h2>${esc(a.title)}</h2></div><div class="spinner"></div>`; return; }
  if (a.err) { v.innerHTML = `<div class="empty"><b>打不开这张专辑</b>${esc(a.err)}</div>`; return; }
  const tr = a.tracks;
  const total = tr.reduce((s, t) => s + (t.duration || 0), 0);
  const size = tr.reduce((s, t) => s + (t.size || 0), 0);
  const q = tr.some(t => t.hires) ? '24bit FLAC' : tr[0]?.lossless ? 'FLAC 无损' : 'MP3';
  const lic = a.license ? `<a href="${esc(a.license)}" target="_blank" rel="noopener">${esc(licenseName(a.license))}</a>` : esc(a.note || '');
  v.innerHTML = `
    <div class="album-head">
      <img class="album-cover" src="${esc(a.cover || '')}" onerror="this.style.visibility='hidden'">
      <h2>${esc(a.title)}</h2>
      <div class="artist">${esc(a.artist || '')}</div>
      <div class="facts">${esc([a.date, a.venue].filter(Boolean).join(' · '))}<br>${tr.length} 首 · ${fmtTime(total)} · ${q}${size ? ' · ' + fmtMB(size) : ''}</div>
      <div class="lic">授权：${lic}</div>
    </div>
    <div class="actions">
      <button class="btn primary" id="ap">${IC.play}播放</button>
      <button class="btn" id="ad"></button>
    </div>
    <div class="dlbar" id="dlbar"></div>
    <div id="tl"></div>`;
  $('#ap').onclick = () => playTracks(tr, 0);
  trackList($('#tl'), tr, tr.some(t => t.artist !== a.artist));
  updateAlbumDownload(a);
}

function updateAlbumDownload(a) {
  const btn = $('#ad'); if (!btn) return;
  const tr = a.tracks;
  const saved = tr.filter(t => lib.saved[t.url]).length;
  const busy = tr.filter(t => t.url in DL.prog);
  if (saved === tr.length && tr.length) {
    btn.innerHTML = `${IC.trash}删除下载`; btn.className = 'btn danger'; btn.disabled = false;
    btn.onclick = async () => {
      if (!confirm('删除这张专辑的离线文件？（以后还能重新下载）')) return;
      await deleteAlbum(a.key); toast('已删除'); render();
    };
    $('#dlbar').textContent = '✓ 已全部下载，离线也能播放';
  } else if (busy.length) {
    const p = busy.reduce((s, t) => s + (DL.prog[t.url] || 0), 0);
    btn.innerHTML = `${IC.download}下载中…`; btn.className = 'btn'; btn.disabled = true;
    $('#dlbar').textContent = `已下载 ${saved}/${tr.length} 首 · 当前进度 ${Math.round((saved + p) / tr.length * 100)}%`;
  } else {
    btn.innerHTML = `${IC.download}${saved ? '下载剩余' : '下载'}`; btn.className = 'btn'; btn.disabled = false;
    btn.onclick = () => { queueDownload(a, tr); updateAlbumDownload(a); };
    $('#dlbar').textContent = saved ? `已下载 ${saved}/${tr.length} 首` : '';
  }
}

function licenseName(url) {
  const m = url.match(/licenses\/([a-z-]+)\/([\d.]+)/i);
  if (m) return `CC ${m[1].toUpperCase()} ${m[2]}`;
  if (/publicdomain/.test(url)) return '公有领域';
  return '查看授权';
}

function trackList(el, tracks, showArtist) {
  el.innerHTML = `<div class="tracks">${tracks.map((t, i) => `
    <div class="tr" data-i="${i}" data-url="${esc(t.url)}">
      <span class="n">${t.no || i + 1}</span>
      <span class="tt"><b>${esc(t.title)}</b><small>${qualityTag(t)}${showArtist ? esc(t.artist || '') : ''}<span class="st"></span></small></span>
      <span class="d">${fmtTime(t.duration)}</span>
    </div>`).join('')}</div>`;
  el.onclick = e => { const r = e.target.closest('.tr'); if (r) playTracks(tracks, +r.dataset.i); };
  markRows();
}
function qualityTag(t) {
  if (t.hires) return '<span class="tag hr">24bit</span>';
  if (t.lossless) return '<span class="tag ll">FLAC</span>';
  return `<span class="tag lossy">${t.codec || 'MP3'}</span>`;
}
function markRows() {
  const cur = P.queue[P.idx]?.url;
  $$('.tr[data-url]').forEach(r => {
    const u = r.dataset.url;
    r.classList.toggle('playing', u === cur);
    const st = $('.st', r);
    if (!st) return;
    st.innerHTML = lib.saved[u] ? IC.check : u in DL.prog ? `${Math.round(DL.prog[u] * 100)}%` : '';
  });
}

function refreshDownloadUI() {
  markRows();
  const page = S.stack[S.stack.length - 1];
  if (page && !page.loading) updateAlbumDownload(page);
  if (S.tab === 'saved' && !S.stack.length) render();
}

/* 已下载 */
function renderSaved(v) {
  header('已下载');
  const albums = Object.values(lib.albums).filter(a => a.tracks.some(t => lib.saved[t.url] || t.url in DL.prog));
  if (!albums.length) {
    v.innerHTML = `<div class="empty"><b>还没有下载</b>在专辑页点「下载」，<br>上车前在家连 Wi-Fi 下好，车上不耗流量、没信号也能听。</div>`;
    return;
  }
  const n = albums.reduce((s, a) => s + a.tracks.filter(t => lib.saved[t.url]).length, 0);
  v.innerHTML = `<p class="sub" style="margin:0 0 12px">${albums.length} 张专辑 · ${n} 首 · 占用 ${fmtMB(storage.usage)}</p>
    <div class="actions" style="margin-top:0"><button class="btn primary" id="sp">${IC.play}全部播放</button><button class="btn" id="ss">随机播放</button></div>
    <div class="grid" id="sg">${albums.map((a, i) => {
      const s = a.tracks.filter(t => lib.saved[t.url]).length;
      return `<div class="card" data-i="${i}"><div class="cover"><div class="ph">${IC.note}</div><img src="${esc(a.cover || '')}" onerror="this.remove()"></div>
        <div class="ct">${esc(a.title)}</div><div class="cs">${esc(a.artist || '')} · ${s === a.tracks.length ? s + ' 首' : `${s}/${a.tracks.length} 首`}</div></div>`;
    }).join('')}</div>`;
  const all = () => albums.flatMap(a => a.tracks.filter(t => lib.saved[t.url]));
  $('#sp').onclick = () => playTracks(all(), 0);
  $('#ss').onclick = () => playTracks(all().sort(() => Math.random() - .5), 0);
  $('#sg').onclick = e => { const c = e.target.closest('.card'); if (c) push({ ...albums[+c.dataset.i] }); };
}

/* 队列 */
function renderQueue(v) {
  header('播放队列');
  if (!P.queue.length) { v.innerHTML = '<div class="empty"><b>队列是空的</b>去「发现」挑张专辑吧</div>'; return; }
  v.innerHTML = `<p class="sub" style="margin:0 0 6px">${P.queue.length} 首</p><div id="ql"></div>`;
  trackList($('#ql'), P.queue, true);
  $('#ql').onclick = e => { const r = e.target.closest('.tr'); if (r) playAt(+r.dataset.i); };
}

/* 设置 */
function renderSettings(v) {
  header('设置');
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const pct = storage.quota ? Math.min(100, storage.usage / storage.quota * 100) : 0;
  v.innerHTML = `
    ${standalone ? '' : `<div class="install"><b>先把澄音添加到主屏幕</b><br>在 Safari 里点底部的「分享」按钮 → 「添加到主屏幕」。<br>从主屏幕打开后，下载的歌才能长期保存，锁屏和 CarPlay 控制也更稳定。</div>`}
    <h3 class="hint" style="margin:6px 4px 8px">播放</h3>
    <div class="group">
      <div class="item"><div class="l">只播已下载的歌<small>开启后不会用流量在线播放，适合开车用蜂窝数据时</small></div>
        <label class="switch"><input type="checkbox" id="off" ${settings.offlineOnly ? 'checked' : ''}><span></span></label></div>
    </div>
    <h3 class="hint" style="margin:6px 4px 8px">存储</h3>
    <div class="group">
      <div class="item"><div class="l">已用 ${fmtMB(storage.usage)}${storage.quota ? ` / 可用 ${fmtMB(storage.quota)}` : ''}
        <small>${storage.persisted ? '✓ 已获得持久存储，系统不会自动清理' : '还没获得持久存储：空间紧张时系统可能清理下载的歌'}</small>
        <div class="meter"><i style="width:${pct.toFixed(1)}%"></i></div></div></div>
      <div class="item"><div class="l">删除全部下载</div><button class="btn danger" id="clr">删除</button></div>
    </div>
    <h3 class="hint" style="margin:6px 4px 8px">Jamendo</h3>
    <div class="group">
      <div class="item"><input class="field" id="jam" placeholder="粘贴 Client ID（可不填）" value="${esc(settings.jamendo)}" autocomplete="off" autocapitalize="off"></div>
    </div>
    <p class="hint">
      曲库只收录授权明确的免费音乐：archive.org 的 Live Music Archive（乐队允许非商业交换的现场录音）、Netlabels 与古典音乐（Creative Commons / 公有领域），以及 Jamendo（Creative Commons）。歌词来自 LRCLIB。<br>
      在车上：用 CarPlay 的「正在播放」和方向盘按键控制。上车前在家用 Wi-Fi 下载好。<br>
      版本 ${VERSION}</p>`;
  $('#off').onchange = e => { settings.offlineOnly = e.target.checked; saveSettings(); prepareNext(); };
  $('#jam').onchange = e => { settings.jamendo = e.target.value.trim(); saveSettings(); S.jam = { ...S.jam, tracks: [], err: null }; toast('已保存'); };
  $('#clr').onclick = async () => {
    if (!confirm('删除所有下载的歌？')) return;
    await caches.delete(TRACK_CACHE);
    lib.albums = {}; lib.saved = {}; saveLib();
    toast('已全部删除'); estimateStorage();
  };
}

/* ---------------- 迷你播放条 + 正在播放 ---------------- */
paintIcons();
$('#miniNext').innerHTML = IC.next;
$('#npDown').innerHTML = IC.down; $('#npPrev').innerHTML = IC.prev; $('#npNext').innerHTML = IC.next; $('#npLyr').innerHTML = IC.lyrics;
$('#miniPlay').onclick = e => { e.stopPropagation(); toggle(); };
$('#miniNext').onclick = e => { e.stopPropagation(); next(); };
$('#mini').onclick = () => { $('#np').classList.remove('hidden'); updateLyricsView(true); };
$('#npDown').onclick = () => $('#np').classList.add('hidden');
$('#npPlay').onclick = toggle; $('#npNext').onclick = next; $('#npPrev').onclick = prev;
$('#npRepeat').onclick = () => {
  const o = ['off', 'all', 'one'];
  P.repeat = o[(o.indexOf(P.repeat) + 1) % 3];
  toast({ off: '循环：关闭', all: '循环：列表', one: '循环：单曲' }[P.repeat]);
  updatePlayState(); prepareNext(); saveState();
};
$('#npLyr').onclick = () => {
  const on = !$('.np-stage').classList.contains('lyr');
  $('.np-stage').classList.toggle('lyr', on);
  $('#npLyrics').classList.toggle('hidden', !on);
  $('#npLyr').classList.toggle('on', on);
  updateLyricsView(true);
};
// 下滑收起
(() => {
  let y0 = null;
  const np = $('#np');
  np.addEventListener('touchstart', e => { if (!e.target.closest('input, .np-lyrics')) y0 = e.touches[0].clientY; }, { passive: true });
  np.addEventListener('touchend', e => { if (y0 !== null && e.changedTouches[0].clientY - y0 > 90) np.classList.add('hidden'); y0 = null; });
})();

const seek = $('#npSeek');
let seeking = false;
seek.oninput = () => {
  seeking = true;
  seek.style.setProperty('--p', seek.value / 10 + '%');
  $('#npPos').textContent = fmtTime(seek.value / 1000 * (audio.duration || 0));
};
seek.onchange = () => {
  if (audio.duration) audio.currentTime = seek.value / 1000 * audio.duration;
  seeking = false;
};

function onTrackChange(t, restoring) {
  if (!t) return;
  $('#mini').classList.remove('hidden');
  $('#miniCover').src = t.cover || '';
  $('#miniTitle').textContent = t.title || '';
  $('#miniArtist').textContent = t.artist || '';
  $('#npCover').src = t.cover || '';
  $('#npBg').style.backgroundImage = t.cover ? `url("${t.cover.replace(/"/g, '%22')}")` : 'none';
  $('#npTitle').textContent = t.title || '';
  $('#npArtist').textContent = [t.artist, t.album].filter(Boolean).join(' — ');
  $('#npQ').textContent = t.hires ? '24bit FLAC · 无损' : t.lossless ? 'FLAC · 无损' : (t.codec || 'MP3');
  if (!restoring) setMediaSession(t);
  S.lyr.key = null;
  updateLyricsView();
  updatePlayState();
  markRows();
}

function updatePlayState() {
  const playing = !audio.paused && P.curSrc !== SILENCE;
  $('#miniPlay').innerHTML = playing ? IC.pause : IC.play;
  $('#npPlay').innerHTML = playing ? IC.pause : IC.play;
  $('#npRepeat').innerHTML = P.repeat === 'one' ? IC.repeatOne : IC.repeat;
  $('#npRepeat').classList.toggle('on', P.repeat !== 'off');
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
}

function updateProgress() {
  if (P.curSrc === SILENCE) return;
  const d = audio.duration && isFinite(audio.duration) ? audio.duration : (P.queue[P.idx]?.duration || 0);
  const pos = audio.currentTime || 0;
  $('#miniBar').style.width = d ? (pos / d * 100) + '%' : '0';
  if (!seeking) {
    seek.value = d ? pos / d * 1000 : 0;
    seek.style.setProperty('--p', (d ? pos / d * 100 : 0) + '%');
    $('#npPos').textContent = fmtTime(pos);
  }
  $('#npDur').textContent = fmtTime(d);
  highlightLyric(pos);
}

/* 歌词 */
function parseLrc(txt) {
  const out = [];
  for (const line of (txt || '').split(/\r?\n/)) {
    const ts = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!ts.length) continue;
    const text = line.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of ts) out.push({ t: +m[1] * 60 + +m[2], text });
  }
  return out.sort((a, b) => a.t - b.t);
}
async function updateLyricsView(force) {
  const t = P.queue[P.idx];
  const el = $('#npLyrics');
  if (!t || el.classList.contains('hidden') && !force) return;
  if (S.lyr.key === t.url) return;
  S.lyr = { key: t.url, lines: [], plain: '', cur: -1 };
  el.innerHTML = '<div class="none">正在找歌词…</div>';
  const r = await lrclib(t);
  if (S.lyr.key !== t.url) return;
  S.lyr.lines = r?.synced ? parseLrc(r.synced) : [];
  S.lyr.plain = r?.plain || '';
  if (S.lyr.lines.length) el.innerHTML = S.lyr.lines.map(l => `<p>${esc(l.text) || '♪'}</p>`).join('');
  else if (S.lyr.plain) el.innerHTML = S.lyr.plain.split(/\r?\n/).map(x => `<p class="on" style="font-size:17px;font-weight:500">${esc(x) || '&nbsp;'}</p>`).join('');
  else el.innerHTML = '<div class="none">没有找到歌词<br>现场录音和古典音乐大多没有歌词</div>';
}
function highlightLyric(pos) {
  const L = S.lyr;
  if (!L.lines.length || $('#npLyrics').classList.contains('hidden')) return;
  let i = -1;
  for (let k = 0; k < L.lines.length; k++) { if (L.lines[k].t <= pos + 0.25) i = k; else break; }
  if (i === L.cur) return;
  L.cur = i;
  const ps = $$('#npLyrics p');
  ps.forEach((p, k) => p.classList.toggle('on', k === i));
  if (ps[i]) ps[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ---------------- 启动 ---------------- */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
restoreState();
render();
reconcileCache().then(estimateStorage);
window.addEventListener('pagehide', saveState);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); });
