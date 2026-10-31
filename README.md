# MC-MOTD-API (Cloudflare Worker)

基于 Cloudflare Workers 的 Minecraft Java 版服务器 MOTD 查询 API。
是 [mcmotd/mcmotdapi](https://github.com/mcmotd/mcmotdapi)（Express 版）的 Workers 重写版，可以直接部署，无需服务器。

## 与原版的差异

| 功能 | 原版 (Express) | Worker 版 |
| --- | --- | --- |
| Java 版状态查询 | ✅ | ✅ 使用 `cloudflare:sockets` TCP |
| Bedrock 版状态查询 | ✅ (UDP) | ❌ Workers 无法发送 UDP，已移除 |
| SRV 记录解析 | Node `dns` | ✅ 改用 Cloudflare DNS-over-HTTPS |
| 状态缓存 | SQLite | ✅ Cache API（按数据中心缓存，尽力而为） |
| 状态图片 | PNG (node-canvas) | ✅ SVG（Workers 不支持 node-canvas） |
| 访问统计 / 管理员统计 | SQLite | ❌ 未移植（需要 D1，可自行添加） |
| 前端页面 | Vue 3 | ✅ 由 Workers Static Assets 托管，同域访问 |
| 配置文件 | `config/*.json` | ✅ 前端配置在 `src/config/front.json`，运行参数在 `wrangler.toml` 的 `[vars]`，账号走 Secrets |

## 部署

需要 Node.js 18+ 和一个 Cloudflare 账号。

```bash
npm install

# 设置管理员账号（仅 /api/login 使用，可选）
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD

# 构建前端并部署（deploy 会先执行 build:front）
npm run deploy
```

本地开发：

```bash
cp .dev.vars.example .dev.vars   # 修改其中的账号密码
npm run dev
```

## 前端

`front/` 是原项目的 Vue 3 前端源码。`npm run deploy` 会先执行 `build:front`，把 `front/dist` 交给 Workers Static Assets 托管。

- 前端配置（标题、页脚、菜单等）位于 `src/config/front.json`，可直接修改，`/api/config` 会返回它。
- 管理后台（`/admin`）依赖的统计接口 `/api/admin/stats` 未移植，打开后会报错。

## 通过 Cloudflare Git 集成部署

在 Cloudflare 控制台 **Workers & Pages → 创建 → 导入 Git 仓库**，连接本仓库后，在构建设置里填写：

| 设置 | 值 |
| --- | --- |
| 构建命令 (Build command) | `npm run build` |
| 部署命令 (Deploy command) | `npx wrangler deploy` |

之后每次推送到 `main` 分支，Cloudflare 都会自动构建前端并部署 Worker。

管理员账号（`ADMIN_USERNAME` / `ADMIN_PASSWORD`）需要在控制台的 Worker 设置里添加为加密变量，或用 `npx wrangler secret put` 配置。

## 配置

非敏感配置在 `wrangler.toml` 的 `[vars]` 中：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `QUERY_TIMEOUT_MS` | `3000` | 单次 TCP 查询超时（毫秒） |
| `JAVA_DEFAULT_PORT` | `25565` | 未指定端口时使用的 Java 端口 |
| `CACHE_ENABLED` | `true` | 是否启用缓存 |
| `CACHE_TTL_SECONDS` | `60` | 状态缓存时长（秒） |
| `SRV_TTL_SECONDS` | `600` | SRV 解析结果缓存时长（秒） |

敏感配置（Secrets）：`ADMIN_USERNAME`、`ADMIN_PASSWORD`。

## API

### `GET /api/status`

返回 JSON。地址二选一：`host`（支持 `域名:端口`、`[IPv6]:端口`）或 `ip` + `port`。

| 参数 | 说明 |
| --- | --- |
| `host` | 服务器地址，可带端口 |
| `ip` / `port` | 地址与端口（二选一） |
| `stype` | `auto`（默认）或 `je`。`be` 会返回错误（不支持） |
| `srv` | `true` 时强制使用 SRV 解析结果（仅 Java） |
| `icon` | 服务器离线/无图标时使用的图标 URL |

```bash
curl "https://<your-worker>.workers.dev/api/status?host=play.example.com:25565"
```

在线响应示例：

```json
{
  "type": "Java",
  "status": "online",
  "host": "play.example.com:25565",
  "motd": "...",
  "pureMotd": "...",
  "version": "1.20.4",
  "protocol": 765,
  "players": { "online": 3, "max": 20, "sample": "Steve, Alex" },
  "mod_info": null,
  "icon": "data:image/png;base64,...",
  "delay": 42
}
```

离线响应：

```json
{ "status": "offline", "host": "play.example.com:25565", "error": "无法连接到服务器，它可能已离线或地址/端口不正确。" }
```

### `GET /api/status_img`

返回 `image/svg+xml` 状态卡片，参数与 `/api/status` 相同。
可直接用于 `<img src="...">`、Markdown 等。

```html
<img src="https://<your-worker>.workers.dev/api/status_img?host=play.example.com:25565" alt="server status">
```

> 注意：原版返回 PNG，部分平台（如某些聊天软件的图片预览）不支持 SVG。如需 PNG，需要在外部服务中转换。

### `POST /api/login`

```json
{ "username": "admin", "password": "..." }
```

账号信息来自 Secrets 中的 `ADMIN_USERNAME` / `ADMIN_PASSWORD`，比对使用常数时间比较。

## 已知限制

- Workers 的 TCP 出站连接会受 Cloudflare 的网络策略限制，个别地址可能无法连接。
- Cache API 不是全局共享缓存，同一地址在不同数据中心可能各自查询一次。
- Bedrock 版需要 UDP，只能通过其它服务或保留原 Express 版本实现。

## 许可证

BSD-2-Clause
