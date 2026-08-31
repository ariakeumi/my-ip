// my-ip — Cloudflare Worker IP 检测工具
//   curl https://<name>.<subdomain>.workers.dev/ip     -> 纯文本 IP
//   curl https://<name>.<subdomain>.workers.dev/json   -> JSON 详情
//   浏览器打开根路径 /                                  -> 精美 WEB UI
// 数据来源: Cloudflare 请求头 CF-Connecting-IP 与 request.cf(地理位置/ASN 等)

const COUNTRY_NAMES = {
  CN: "中国", US: "美国", JP: "日本", KR: "韩国", SG: "新加坡", HK: "中国香港",
  TW: "中国台湾", MO: "中国澳门", GB: "英国", DE: "德国", FR: "法国", RU: "俄罗斯",
  CA: "加拿大", AU: "澳大利亚", IN: "印度", ID: "印度尼西亚", MY: "马来西亚",
  TH: "泰国", VN: "越南", PH: "菲律宾", BR: "巴西", MX: "墨西哥", IT: "意大利",
  ES: "西班牙", NL: "荷兰", SE: "瑞典", CH: "瑞士", AT: "奥地利", BE: "比利时",
  PT: "葡萄牙", PL: "波兰", UA: "乌克兰", TR: "土耳其", AE: "阿联酋", SA: "沙特",
  IL: "以色列", EG: "埃及", ZA: "南非", NG: "尼日利亚", AR: "阿根廷", CL: "智利",
  CO: "哥伦比亚", NZ: "新西兰", IE: "爱尔兰", NO: "挪威", DK: "丹麦", FI: "芬兰",
  CZ: "捷克", GR: "希腊", HU: "匈牙利", RO: "罗马尼亚", LU: "卢森堡", LI: "列支敦士登",
  IS: "冰岛", EE: "爱沙尼亚", LV: "拉脱维亚", LT: "立陶宛", SI: "斯洛文尼亚",
  HR: "克罗地亚", SK: "斯洛伐克", BG: "保加利亚", RS: "塞尔维亚", PK: "巴基斯坦",
  BD: "孟加拉", LK: "斯里兰卡", NP: "尼泊尔", MM: "缅甸", KH: "柬埔寨", LA: "老挝",
  KZ: "哈萨克斯坦", UZ: "乌兹别克斯坦", UA: "乌克兰", GE: "格鲁吉亚", AM: "亚美尼亚",
  AZ: "阿塞拜疆", QA: "卡塔尔", KW: "科威特", BH: "巴林", OM: "阿曼", JO: "约旦",
  LB: "黎巴嫩", SY: "叙利亚", IQ: "伊拉克", IR: "伊朗", AF: "阿富汗",
  PA: "巴拿马", CR: "哥斯达黎加", PE: "秘鲁", VE: "委内瑞拉", UY: "乌拉圭",
  PY: "巴拉圭", BO: "玻利维亚", EC: "厄瓜多尔", CU: "古巴", DO: "多米尼加",
  PR: "波多黎各", JM: "牙买加", TT: "特立尼达", GH: "加纳", KE: "肯尼亚",
  ET: "埃塞俄比亚", TZ: "坦桑尼亚", MA: "摩洛哥", DZ: "阿尔及利亚", TN: "突尼斯",
  LY: "利比亚", SD: "苏丹", YE: "也门", MM: "缅甸", FJ: "斐济", PG: "巴布亚",
  MZ: "莫桑比克", AO: "安哥拉", ZW: "津巴布韦", CM: "喀麦隆", CI: "科特迪瓦",
  SN: "塞内加尔", UG: "乌干达", RW: "卢旺达", BN: "文莱", TL: "东帝汶",
  MT: "马耳他", CY: "塞浦路斯", MC: "摩纳哥", AD: "安道尔", SM: "圣马力诺",
  VA: "梵蒂冈", XK: "科索沃"
};

function countryName(code) {
  return (code && COUNTRY_NAMES[code.toUpperCase()]) || "";
}

function flagEmoji(code) {
  if (!code || code.length !== 2) return "🌐";
  return code.toUpperCase().replace(/./g, function (c) {
    return String.fromCodePoint(127397 + c.charCodeAt(0));
  });
}

function collect(request) {
  const cf = request.cf || {};
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim() ||
    request.headers.get("X-Real-IP") ||
    "";

  return {
    ip: ip || "未知",
    country: cf.country || "",
    countryName: countryName(cf.country),
    continent: cf.continent || "",
    city: cf.city || "",
    region: cf.region || "",
    regionCode: cf.regionCode || "",
    postalCode: cf.postalCode || "",
    metroCode: cf.metroCode || "",
    latitude: cf.latitude != null ? cf.latitude : "",
    longitude: cf.longitude != null ? cf.longitude : "",
    timezone: cf.timezone || "",
    asn: cf.asn ? "AS" + cf.asn : "",
    asOrganization: cf.asOrganization || "",
    colo: cf.colo || "",
    httpProtocol: cf.httpProtocol || "",
    tlsVersion: cf.tlsVersion || "",
    tlsCipher: cf.tlsCipher || "",
    clientTcpRtt: cf.clientTcpRtt != null ? cf.clientTcpRtt : "",
    isEUCountry: cf.isEUCountry != null ? cf.isEUCountry : "",
    userAgent: request.headers.get("User-Agent") || "",
    timestamp: new Date().toISOString(),
  };
}

function jsonRes(data, pretty) {
  const body = pretty ? JSON.stringify(data, null, 2) + "\n" : JSON.stringify(data);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function textRes(text, contentType) {
  return new Response(text, {
    headers: {
      "Content-Type": (contentType || "text/plain") + "; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function renderHTML(data) {
  const safeData = JSON.stringify(data).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌍</text></svg>">
<meta name="description" content="通过 Cloudflare 全球边缘网络检测你的公网 IP 与地理位置">
<title>My IP · 公网 IP 检测</title>
<style>
:root{
  --bg:#f4f6ff; --ink:#1b2240; --muted:#5d6590; --line:rgba(30,41,90,.10);
  --glass:rgba(255,255,255,.78); --c1:#0ea5e9; --c2:#6366f1; --c3:#a855f7;
}
*{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  min-height:100vh; color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Segoe UI",sans-serif;
  background:
    radial-gradient(1100px 600px at 15% -10%, rgba(99,102,241,.14), transparent 60%),
    radial-gradient(900px 560px at 110% 8%, rgba(14,165,233,.12), transparent 55%),
    radial-gradient(800px 700px at 50% 115%, rgba(168,85,247,.10), transparent 60%),
    var(--bg);
  overflow-x:hidden;
}
.grid-bg{
  position:fixed; inset:0; z-index:0; pointer-events:none; opacity:.5;
  background-image:
    linear-gradient(rgba(30,41,90,.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30,41,90,.045) 1px, transparent 1px);
  background-size:44px 44px;
  -webkit-mask-image:radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%);
          mask-image:radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%);
}
.orb{position:fixed;border-radius:50%;filter:blur(70px);opacity:.35;z-index:0;pointer-events:none;animation:drift 18s ease-in-out infinite alternate}
.orb.a{width:340px;height:340px;top:-80px;left:-60px;background:radial-gradient(circle,rgba(99,102,241,.55),transparent 70%)}
.orb.b{width:300px;height:300px;top:20%;right:-80px;background:radial-gradient(circle,rgba(14,165,233,.5),transparent 70%);animation-delay:-6s}
.orb.c{width:360px;height:360px;bottom:-120px;left:30%;background:radial-gradient(circle,rgba(168,85,247,.5),transparent 70%);animation-delay:-12s}
@keyframes drift{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(40px,-30px,0) scale(1.12)}}

.wrap{position:relative;z-index:1;max-width:880px;margin:0 auto;padding:56px 20px 72px}
.head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:26px}
.brand{display:flex;align-items:center;gap:12px}
.logo{
  width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex:none;
  background:linear-gradient(135deg,var(--c1),var(--c2) 55%,var(--c3));
  box-shadow:0 6px 24px rgba(99,102,241,.45);
}
.logo svg{width:24px;height:24px}
.brand h1{font-size:19px;font-weight:800;letter-spacing:.5px}
.brand p{font-size:12px;color:var(--muted);margin-top:2px}
.pill{
  display:inline-flex;align-items:center;gap:7px;font-size:12px;color:#0369a1;
  background:rgba(14,165,233,.10);border:1px solid rgba(14,165,233,.30);
  padding:6px 12px;border-radius:999px;white-space:nowrap;
}
.pill .dot{width:7px;height:7px;border-radius:50%;background:#22d3ee;box-shadow:0 0 10px #22d3ee;animation:blink 1.6s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}

.card{
  background:var(--glass);border:1px solid var(--line);border-radius:22px;
  backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  box-shadow:0 18px 50px rgba(30,41,90,.10);padding:26px;
  animation:rise .7s cubic-bezier(.22,1,.36,1) both;
}
@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}

.ip-card{text-align:center;padding:38px 26px 32px;position:relative;overflow:hidden}
.ip-card::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(500px 200px at 50% 0%, rgba(99,102,241,.12), transparent 70%);
}
.ip-label{font-size:13px;color:var(--muted);letter-spacing:4px;text-transform:uppercase}
.ip-flag{font-size:26px;margin-top:14px;line-height:1}
.ip-value{
  font-size:clamp(30px,7vw,58px);font-weight:800;letter-spacing:2px;margin-top:8px;
  background:linear-gradient(120deg,#0284c7,#4f46e5 45%,#9333ea);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  word-break:break-all;font-family:"SF Mono",ui-monospace,Menlo,Consolas,monospace;
}
.ip-location{font-size:15px;color:#3a4470;margin-top:10px}
.ip-location .sep{color:#a3aacd;margin:0 6px}
.actions{display:flex;gap:10px;justify-content:center;margin-top:22px;flex-wrap:wrap}
.btn{
  display:inline-flex;align-items:center;gap:8px;cursor:pointer;border:none;
  font-size:14px;font-weight:600;padding:11px 20px;border-radius:12px;color:#fff;
  transition:transform .15s ease,box-shadow .2s ease,filter .2s ease;
}
.btn.primary{background:linear-gradient(135deg,var(--c1),var(--c2));box-shadow:0 8px 24px rgba(34,211,238,.28)}
.btn.ghost{background:rgba(30,41,90,.05);border:1px solid var(--line);color:#3a4470}
.btn:hover{transform:translateY(-2px);filter:brightness(1.08)}
.btn:active{transform:translateY(0)}
.btn svg{width:16px;height:16px}

.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
.item{
  background:rgba(255,255,255,.6);border:1px solid var(--line);border-radius:14px;
  padding:14px 16px;animation:rise .6s cubic-bezier(.22,1,.36,1) both;
}
.item .k{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px}
.item .k .ico{font-size:13px}
.item .v{font-size:14.5px;margin-top:7px;font-weight:600;color:#1b2240;word-break:break-all;line-height:1.45}
.item .sub{font-size:11.5px;color:#8a93bd;margin-top:3px}

.loc-card{display:flex;align-items:center;gap:24px;margin-top:14px;padding:22px 26px}
.globe-wrap{flex:none;position:relative;width:190px;height:190px}
.globe-wrap canvas{width:100%;height:100%;display:block}
.loc-side{flex:1;min-width:0}
.loc-title{font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px}
.loc-title .flag{font-size:22px}
.loc-desc{font-size:13.5px;color:var(--muted);margin-top:6px;line-height:1.6}
.loc-stats{display:flex;gap:18px;margin-top:16px;flex-wrap:wrap}
.loc-stat .n{font-size:19px;font-weight:800;background:linear-gradient(120deg,#0284c7,#9333ea);-webkit-background-clip:text;background-clip:text;color:transparent;font-family:ui-monospace,Menlo,monospace}
.loc-stat .t{font-size:11.5px;color:var(--muted);margin-top:2px}


.foot{text-align:center;margin-top:26px;font-size:12px;color:#8a93bd;line-height:1.8}
.foot .tags{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:6px}
.tag{font-size:11px;color:#5d6590;border:1px solid var(--line);border-radius:999px;padding:3px 10px}

@media(max-width:680px){
  .wrap{padding:28px 14px 56px}
  .grid{grid-template-columns:repeat(2,1fr)}
  .loc-card{flex-direction:column;text-align:center;gap:14px}
  .loc-stats{justify-content:center}
  .globe-wrap{width:150px;height:150px}
  .head{flex-direction:column;align-items:flex-start}
}
@media(max-width:420px){.grid{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>
<script>window.__DATA__ = ${safeData};</script>
<div class="grid-bg"></div>
<div class="orb a"></div><div class="orb b"></div><div class="orb c"></div>

<div class="wrap">
  <div class="head">
    <div class="brand">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      </div>
      <div><h1>My IP</h1><p>通过 Cloudflare 全球网络检测</p></div>
    </div>
    <div class="pill"><span class="dot"></span>Cloudflare 节点</div>
  </div>

  <div class="card ip-card" style="animation-delay:0s">
    <div class="ip-label">你的公网 IP</div>
    <div class="ip-flag" id="flagEmoji"></div>
    <div class="ip-value" id="ipDisplay">--</div>
    <div class="ip-location" id="ipLocation"><span class="sep">·</span></div>
    <div class="actions">
      <button class="btn primary" id="copyBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>复制 IP</span>
      </button>
      <button class="btn ghost" id="refreshBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        <span>重新检测</span>
      </button>
    </div>
  </div>

  <div class="card loc-card" style="animation-delay:.1s">
    <div class="globe-wrap"><canvas id="globe" width="380" height="380"></canvas></div>
    <div class="loc-side">
      <div class="loc-title"><span class="flag" id="locFlag"></span><span id="locTitle">正在定位…</span></div>
      <div class="loc-desc" id="locDesc">通过 Cloudflare 边缘节点获取地理位置</div>
      <div class="loc-stats" id="locStats"></div>
    </div>
  </div>

  <div class="card" style="animation-delay:.2s">
    <div class="grid" id="infoGrid"></div>
  </div>

  <div class="foot">
    <div>数据基于 Cloudflare <code style="font-size:inherit">CF-Connecting-IP</code> 与 <code style="font-size:inherit">request.cf</code> 边缘信息</div>
    <div class="tags"><span class="tag" id="tagTime"></span><span class="tag" id="tagColo"></span></div>
  </div>
</div>

<script>
(function(){
  var D = window.__DATA__;
  if (!D) { document.title = "My IP · 加载失败"; return; }

  document.getElementById("ipDisplay").textContent = D.ip;
  var flag = document.getElementById("flagEmoji");
  var locFlag = document.getElementById("locFlag");
  flag.textContent = D.country ? D.country.replace(/./g, function(c){return String.fromCodePoint(127397+c.charCodeAt(0))}) : "🌐";
  locFlag.innerHTML = flag.textContent;

  var locParts = [];
  if (D.city) locParts.push(D.city);
  if (D.region) locParts.push(D.region);
  if (D.countryName) locParts.push(D.countryName);
  else if (D.country) locParts.push(D.country);
  document.getElementById("ipLocation").innerHTML = (locParts.length ? locParts.join(" · ") : "未知位置") + " <span class='sep'>·</span> " + D.timezone;

  document.getElementById("locTitle").textContent = D.city || D.region || D.countryName || "未知位置";
  var desc = "地理位置由 Cloudflare 边缘网络基于 " + D.ip + " 推断";
  if (D.asOrganization) desc += " · " + D.asOrganization;
  document.getElementById("locDesc").textContent = desc;

  var stats = [
    {n: D.country || "——", t: "国家/地区"},
    {n: D.asn || "——", t: "ASN"},
    {n: D.timezone || "——", t: "时区"},
  ];
  var sHtml = "";
  for (var i = 0; i < stats.length; i++) {
    if (stats[i].n && stats[i].n !== "——") {
      sHtml += "<div class='loc-stat'><div class='n'>" + esc(stats[i].n) + "</div><div class='t'>" + esc(stats[i].t) + "</div></div>";
    }
  }
  document.getElementById("locStats").innerHTML = sHtml;

  var infoFields = [
    {k: "IP 地址", v: D.ip, ico: "🌐"},
    {k: "国家", v: (D.countryName || D.country || "——") + (D.country ? " (" + D.country + ")" : ""), ico: "🗺️"},
    {k: "城市", v: D.city || "——", ico: "🏙️"},
    {k: "地区", v: D.region || "——", sub: D.regionCode || "", ico: "📍"},
    {k: "邮政编码", v: D.postalCode || "——", ico: "📮"},
    {k: "纬度", v: D.latitude || "——", ico: "🌐"},
    {k: "经度", v: D.longitude || "——", ico: "🌐"},
    {k: "时区", v: D.timezone || "——", ico: "🕐"},
    {k: "ASN", v: D.asn || "——", sub: D.asOrganization || "", ico: "🏢"},
    {k: "Cloudflare 节点", v: D.colo || "——", ico: "☁️"},
    {k: "HTTP 协议", v: D.httpProtocol || "——", ico: "📡"},
    {k: "TLS 版本", v: D.tlsVersion || "——", ico: "🔒"},
    {k: "TLS 加密套件", v: D.tlsCipher || "——", ico: "🔐"},
    {k: "TCP RTT", v: D.clientTcpRtt ? D.clientTcpRtt + " ms" : "——", ico: "📶"},
    {k: "欧盟地区", v: D.isEUCountry === "true" || D.isEUCountry === true ? "是" : D.isEUCountry === "false" || D.isEUCountry === false ? "否" : "——", ico: "🇪🇺"},
    {k: "大陆", v: D.continent || "——", ico: "🌍"},
    {k: "User-Agent", v: D.userAgent || "——", ico: "🖥️"},
    {k: "检测时间", v: D.timestamp ? D.timestamp.replace("T", " ").replace(/\.\d+Z/, " UTC") : "——", ico: "⏰"},
  ];
  var gridHtml = "";
  for (var i = 0; i < infoFields.length; i++) {
    var f = infoFields[i];
    var delay = (i * 0.04).toFixed(2);
    var sub = f.sub ? "<div class='sub'>" + esc(f.sub) + "</div>" : "";
    gridHtml += "<div class='item' style='animation-delay:" + delay + "s'>";
    gridHtml += "<div class='k'><span class='ico'>" + f.ico + "</span>" + esc(f.k) + "</div>";
    gridHtml += "<div class='v'>" + esc(f.v) + "</div>" + sub + "</div>";
  }
  document.getElementById("infoGrid").innerHTML = gridHtml;

  document.getElementById("tagTime").textContent = "检测时间: " + (D.timestamp ? D.timestamp.replace("T", " ").replace(/\..+/, "") : "——");
  document.getElementById("tagColo").textContent = "Cloudflare 节点: " + (D.colo || "——");

  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var canvas = document.getElementById("globe");
  var ctx = canvas.getContext("2d");
  var R = 175;
  var lat = D.latitude != null && D.latitude !== "" ? parseFloat(D.latitude) : null;
  var lng = D.longitude != null && D.longitude !== "" ? parseFloat(D.longitude) : null;

  function drawGlobe() {
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    var cx = w / 2, cy = h / 2;

    // outer glow
    var g = ctx.createRadialGradient(cx, cy, R-10, cx, cy, R+18);
    g.addColorStop(0, "rgba(99,102,241,.15)");
    g.addColorStop(1, "rgba(99,102,241,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R+18, 0, Math.PI * 2);
    ctx.fill();

    // globe circle
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.closePath();

    var grad = ctx.createRadialGradient(cx-30, cy-30, 10, cx, cy, R);
    grad.addColorStop(0, "rgba(224, 231, 255, .95)");
    grad.addColorStop(0.6, "rgba(199, 210, 254, .97)");
    grad.addColorStop(1, "rgba(165, 180, 252, .98)");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "rgba(99,102,241,.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // grid lines
    ctx.strokeStyle = "rgba(99,102,241,.2)";
    ctx.lineWidth = .8;
    for (var i = 0; i < 8; i++) {
      var angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
      ctx.stroke();
    }
    for (var r = 0.2; r <= 1; r += 0.25) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // equator highlight
    ctx.strokeStyle = "rgba(14,165,233,.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // prime meridian
    ctx.strokeStyle = "rgba(14,165,233,.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.stroke();

    // marker
    if (lat != null && lng != null) {
      var mx = cx + (lng / 180) * R;
      var my = cy - (lat / 90) * R;
      var d = Math.sqrt((mx-cx)*(mx-cx) + (my-cy)*(my-cy));
      if (d > R) {
        mx = cx + (mx-cx)/d * R * 0.92;
        my = cy + (my-cy)/d * R * 0.92;
      }

      // pulse ring
      ctx.beginPath();
      ctx.arc(mx, my, 14, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14,165,233,.2)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx, my, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14,165,233,.4)";
      ctx.fill();

      // dot
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#0ea5e9";
      ctx.fill();
      ctx.shadowColor = "#0ea5e9";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  drawGlobe();

  // copy IP
  document.getElementById("copyBtn").addEventListener("click", function() {
    var t = this.querySelector("span");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(D.ip).then(function() {
        t.textContent = "已复制!";
        setTimeout(function() { t.textContent = "复制 IP"; }, 1800);
      });
    } else {
      var ta = document.createElement("textarea");
      ta.value = D.ip; ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      t.textContent = "已复制!";
      setTimeout(function() { t.textContent = "复制 IP"; }, 1800);
    }
  });

  // refresh
  document.getElementById("refreshBtn").addEventListener("click", function() {
    location.reload();
  });

})();
</script>
</body>
</html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const data = collect(request);

    if (path === "/ip" || path === "/ip/") {
      return textRes(data.ip + "\n");
    }
    if (path === "/json" || path === "/json/") {
      return jsonRes(data, true);
    }
    if (path === "/" ) {
      return new Response(renderHTML(data), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }
    if (path === "/robots.txt") {
      return textRes("User-agent: *\nAllow: /\n");
    }
    if (path === "/favicon.ico" || path === "/favicon.svg") {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌍</text></svg>',
        { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" } }
      );
    }

    return new Response("404 Not Found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
