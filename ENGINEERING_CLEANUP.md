# 工程清理记录

本文件记录项目在工程层面做过的整理，方便后续继续维护。

## 1. 本轮清理目标

本轮清理主要针对以下问题：

- 默认联机地址分散在多个位置
- 前端与 Android assets 存在重复资源
- 项目根目录保留了过多调试产物
- 部分文档存在编码问题
- service worker 缓存版本需要同步刷新

## 2. 本轮已完成清理

### 2.1 默认联机地址收敛

已收敛位置：

- `public/game.js`
- `public/index.html`
- `android/app/src/main/java/com/gomoku/game/MainActivity.java`

当前默认联机地址：

```text
http://121.36.35.180:4000
```

### 2.2 服务器地址逻辑简化

已做调整：

- 去掉不必要的 `localStorage` 服务器地址记忆依赖
- 明确改为运行时统一计算默认地址
- 浏览器和 Android 走同一套收敛逻辑

### 2.3 重复素材清理

已删除未被引用的重复中文命名素材：

- `封面.png`
- `封面动图.gif`
- `获胜.png`

保留实际代码引用的文件：

- `cover.png`
- `cover_anim.gif`
- `win.png`

### 2.4 文档编码修复

已重写并修复：

- `DEPLOY_CN_SERVER.md`

### 2.5 Service Worker 缓存刷新

已更新：

- `public/sw.js`

缓存版本：

- `gomoku-v6 -> gomoku-v7`

目的：

- 避免旧缓存继续持有旧的前端逻辑和资源

### 2.6 Git 跟踪清理

已停止跟踪本地调试与临时文件：

- `1`
- `backmenu.png`
- `gomoku.zip`
- `tmp_ws_test.js`

## 3. 当前工程约定

### 3.1 前端正式资源目录

- `public/`

### 3.2 Android 运行资源目录

- `android/app/src/main/assets/public/`

说明：

- Android 资源目录应与 `public/` 保持同步

### 3.3 默认联机地址修改入口

后续若服务器地址变化，需要优先检查：

- `public/game.js`
- `public/index.html`
- `android/app/src/main/java/com/gomoku/game/MainActivity.java`

## 4. 后续建议继续清理的方向

### 4.1 资源命名统一

建议以后统一使用英文文件名，避免中英文双份并存。

### 4.2 根目录产物归档

建议未来建立单独目录：

- `releases/`：正式 APK
- `docs-assets/`：文档截图
- `tmp/`：临时脚本

### 4.3 前端配置抽离

后续可考虑把默认地址、版本号、环境配置进一步抽到统一配置文件。

### 4.4 云服务器地址区分

后续如果存在：

- 本地开发环境
- 测试环境
- 生产环境

建议引入环境区分配置，而不是继续手动替换地址。
