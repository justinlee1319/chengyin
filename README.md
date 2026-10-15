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
- **我的曲库**：和自己电脑上的澄音 PC 版配对，在家里 Wi-Fi 下把电脑曲库里的歌下载到手机离线听（PC 端按设置转成 16/44.1 FLAC 或 AAC 256）。也可以在家直接在线播

## 实现
纯静态页面，没有服务器、没有账号、不收集任何数据：手机直接请求 archive.org / Jamendo / LRCLIB 的公开接口（都支持跨域）。

「我的曲库」只连局域网里你自己的电脑：PC 版用自己生成的根证书提供 https（iPhone 不允许 https 页面访问 http 内网地址），手机信任一次证书、用 6 位配对码换一个令牌。下载的歌用固定的本站地址（`pc/track/格式/id`）存在 Cache Storage 里，电脑换 IP 也不影响；封面由 `sw.js` 缓存，离线时锁屏 / CarPlay 也有封面。

- `app.js`：音源、下载、播放器、界面
- `sw.js`：离线打开 App、缓存封面
- `index.html` / `style.css` / `manifest.webmanifest` / `icons/`
