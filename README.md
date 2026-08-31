# My IP · Cloudflare Worker IP 检测工具

一个部署在 Cloudflare Workers 上的 IP 检测服务：`curl` 即可返回访问者公网 IP，
浏览器打开则呈现一个精美 WEB UI，展示访问者 IP、国家、城市、经纬度、ASN、时区等
信息，全部基于 Cloudflare 边缘网络（`CF-Connecting-IP` 与 `request.cf`）实时获取。

## 端点

| 路由 | 说明 |
| --- | --- |
| `GET /` | 精美 WEB UI，展示 IP 与地理位置 |
| `GET /ip` | 纯文本 IP（适合 curl / 脚本） |
| `GET /json` | JSON 全量字段（含地理位置 / ASN / 时区等） |
| `GET /robots.txt` | 允许抓取 |
| 其他 | `404` |

```bash
curl https://<你的worker域名>.workers.dev/ip        # -> 203.0.113.7
curl https://<你的worker域名>.workers.dev/json      # -> 完整 JSON
```

## 项目结构

```
my-ip/
├── wrangler.toml      # Worker 配置（名称、入口、兼容性日期）
├── package.json       # 脚本与 wrangler 依赖
├── src/
│   └── index.js       # Worker 逻辑 + 内嵌 WEB UI（单文件，无需构建）
└── README.md
```

单文件实现，无任何构建步骤，依赖仅 `wrangler`。

## 本地运行

```bash
npm install        # 安装 wrangler
npm run dev        # 启动本地开发服务器，默认 http://localhost:8787
```

> 本地运行时 `request.cf` 无真实地理数据，`/json` 大多数字段为空属正常现象，
> 部署到 Cloudflare 后由边缘节点填充。

## 部署

```bash
npm run deploy     # = wrangler deploy
```

首次运行会引导登录 Cloudflare 账号。默认部署在 `<name>.<子域>.workers.dev`。

### 绑定自定义域名

在 `wrangler.toml` 中加入路由（示例，`api.example.com` 需先在 Cloudflare 接入）：

```toml
routes = [{ pattern = "api.example.com", zone_name = "example.com" }]
```

然后再次 `npm run deploy`，即可通过自定义域名访问。

## 数据来源

- 公网 IP：请求头 `CF-Connecting-IP`（Cloudflare 边缘注入的访问者真实 IP）。
- 地理位置 / 网络信息：`request.cf`，包括 `country`、`city`、`region`、
  `latitude`、`longitude`、`timezone`、`asn`、`asOrganization`、`colo`、
  `httpProtocol`、`tlsVersion`、`tlsCipher`、`clientTcpRtt`、`isEUCountry` 等。

## 说明

- 免费套餐即可使用，国家 / 时区 / ASN / 经纬度等字段通常均可获取；
  部分深度字段（如城市级别定位精度）与 Cloudflare 套餐及边缘配置有关。
- 所有接口返回均带 `Cache-Control: no-store`，保证每次返回最新结果。
- `/json` 与 `/ip` 已附带 `Access-Control-Allow-Origin: *`，可直接跨域调用。
