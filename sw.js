/* Service Worker：没网也能打开 App；专辑封面缓存起来，离线时锁屏 / CarPlay 也有封面。
 * 音频文件不经过这里（下载的歌由 app.js 存在 cy-tracks-v1 里）。 */
const SHELL = 'cy-shell-v3';
const COVERS = 'cy-covers-v1';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('cy-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const isCover = url => /archive\.org\/services\/img\//.test(url) || /usercontent\.jamendo\.com/.test(url);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 自己的页面文件：先用缓存秒开，同时后台更新（下次打开就是新版本）
  if (url.origin === location.origin) {
    e.respondWith(caches.open(SHELL).then(async c => {
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // 封面：缓存优先
  if (isCover(req.url)) {
    e.respondWith(caches.open(COVERS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r.ok || r.type === 'opaque') c.put(req, r.clone());
        return r;
      } catch {
        return hit || Response.error();
      }
    }));
  }
});
