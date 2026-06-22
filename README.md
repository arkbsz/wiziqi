# Gomoku 五子棋项目

一个支持本地对战、联机对战、安卓安装包封装和云服务器部署的五子棋项目。

## 1. 项目简介

本项目包含以下能力：

- 本地双人对战
- 联机房间对战
- 安卓 APK 打包
- 云服务器部署
- 中文界面与移动端适配

## 2. 当前版本

- 项目版本：`1.1.0`
- 安卓版本名：`1.1.0`
- 安卓版本号：`2`

## 3. 目录结构

### 前端

- `public/`
  - 网页资源
  - 游戏逻辑
  - 联机页面

### 安卓

- `android/`
  - Android 容器工程
  - WebView 加载前端资源
  - APK 打包配置

### 服务端

- `server.js`
  - 本地 / 云服务器联机服务

### 云部署

- `ecosystem.config.cjs`
  - pm2 进程配置

- `DEPLOY_CN_SERVER.md`
  - 国内云服务器部署说明

## 4. 主要功能

### 游戏功能

- 19x19 棋盘
- 坐标轴显示
- 二次确认落子
- 胜负判定
- 本地重开

### 联机功能

- 创建房间
- 加入房间
- 房间号对战
- 棋盘同步
- 重开同步
- 离开房间

### 安卓功能

- WebView 容器运行
- 本地资源加载
- 默认联机地址注入
- Android 新版本兼容

## 5. 本地开发

### 安装依赖

```bash
npm install
```

### 启动本地联机服务

```bash
node server.js
```

服务启动后默认地址：

```text
http://localhost:4000
```

健康检查：

```text
http://localhost:4000/health
```

## 6. 安卓打包

进入 Android 目录：

```bash
cd android
```

命令行打包：

```bash
java -classpath "gradle/wrapper/gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain clean assembleDebug --no-daemon
```

如果当前工程启用了新的构建目录，APK 可能生成在：

- `tmp_android_build/app/outputs/apk/debug/app-debug.apk`

## 7. 联机默认地址

当前默认联机地址可在以下位置修改：

- `public/game.js`
- `public/index.html`
- `android/app/src/main/java/com/gomoku/game/MainActivity.java`

## 8. 部署到云服务器

部署说明见：

- [DEPLOY_CN_SERVER.md](C:/Users/bsz/Documents/5z7/gomoku/DEPLOY_CN_SERVER.md)

## 9. 版本管理

版本管理说明见：

- [VERSIONING.md](C:/Users/bsz/Documents/5z7/gomoku/VERSIONING.md)

版本变更记录见：

- [CHANGELOG.md](C:/Users/bsz/Documents/5z7/gomoku/CHANGELOG.md)

发布前检查清单见：

- [RELEASE_CHECKLIST.md](C:/Users/bsz/Documents/5z7/gomoku/RELEASE_CHECKLIST.md)

项目工作树见：

- [PROJECT_WORK_TREE.md](C:/Users/bsz/Documents/5z7/gomoku/PROJECT_WORK_TREE.md)

## 10. 后续建议

后续扩展建议优先级：

1. 稳定云服务器联机
2. 整理正式发布包
3. 清理调试产物
4. 新增 AI 对战
5. 新增战绩和匹配系统
