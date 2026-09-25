# 澄音 · 手机版

一个 iPhone 上用的免费无损音乐播放器（网页 App / PWA）。**只收录授权明确的免费音乐**：

| 频道 | 来源 | 授权 |
|---|---|---|
| 现场录音 | [Live Music Archive](https://archive.org/details/etree) | 乐队允许录音并非商业交换 |
| 独立厂牌 | [archive.org Netlabels](https://archive.org/details/netlabels) | Creative Commons |
| 古典 | archive.org 上声明为公有领域 / CC 的古典音乐（含 Musopen 全集） | 公有领域 / CC |
| Jamendo | [Jamendo API](https://developer.jamendo.com/)（需要自己的免费 Client ID） | Creative Commons |

歌词来自 [LRCLIB](https://lrclib.net)。

## 安装
用 iPhone 的 Safari 打开网址 → 点「分享」→「添加到主屏幕」，然后从主屏幕打开。

## 功能
- 搜索、浏览专辑，在线播放 FLAC 无损（有 24bit 的会标出来）
- 下载到手机离线听（保存在浏览器的 Cache Storage，会申请持久存储）
- 锁屏 / 控制中心 / **CarPlay「正在播放」** / 方向盘按键：显示歌名封面，可切歌暂停（通过 Media Session）
- 自动预先准备下一首，锁屏和车上也能自动切歌
- 断点续播、单曲 / 列表循环、同步歌词

## 实现
纯静态页面，没有服务器、没有账号、不收集任何数据：手机直接请求 archive.org / Jamendo / LRCLIB 的公开接口（都支持跨域）。

- `app.js`：音源、下载、播放器、界面
- `sw.js`：离线打开 App、缓存封面
- `index.html` / `style.css` / `manifest.webmanifest` / `icons/`
