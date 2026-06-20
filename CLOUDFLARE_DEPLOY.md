# Cloudflare Free 部署说明

这个项目已经新增了 Cloudflare Workers + Durable Objects 联机服务，适合五子棋这种轻量房间对战。

## 一、Cloudflare 费用

- 可以先用 `Cloudflare Free`
- 对少量玩家、偶尔联机，通常够用
- 不需要像之前那样每次手动开本地服务器和公网隧道

## 二、首次部署前准备

1. 注册并登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 打开 [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
3. 确认账号能创建 Worker

## 三、在本机安装依赖

在项目目录运行：

```powershell
cd C:\Users\bsz\Documents\5z7\gomoku
pnpm install
```

## 四、登录 Cloudflare

```powershell
pnpm exec wrangler login
```

浏览器会弹出授权页面，确认即可。

## 五、部署 Worker

```powershell
pnpm run cf:deploy
```

部署成功后，终端会给你一个类似下面的地址：

```text
https://gomoku-online.<your-subdomain>.workers.dev
```

对应联机地址填写：

```text
wss://gomoku-online.<your-subdomain>.workers.dev
```

## 六、网页端和 APK 怎么用

### 网页端

如果以后把网页也部署到公网，联机地址填上面的 `wss://...workers.dev` 即可。

### Android APK

进入联机界面，在“服务器地址”里填：

```text
wss://gomoku-online.<your-subdomain>.workers.dev
```

填一次后会保存在手机本地。

## 七、当前项目里的相关文件

- Worker 入口：
  [cloudflare/worker.mjs](C:/Users/bsz/Documents/5z7/gomoku/cloudflare/worker.mjs)
- Cloudflare 配置：
  [wrangler.toml](C:/Users/bsz/Documents/5z7/gomoku/wrangler.toml)
- 前端联机逻辑：
  [public/game.js](C:/Users/bsz/Documents/5z7/gomoku/public/game.js)

## 八、注意事项

- 房间号仍然是 4 位数字
- 房间状态保存在 Durable Object 中
- 服务端升级或重新部署时，正在进行中的房间可能会中断
