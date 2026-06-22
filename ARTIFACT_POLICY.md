# 项目产物管理说明

为了避免仓库越来越乱，项目中的文件分为三类：

## 1. 必须进入 Git 的文件

这些文件属于项目源码或长期文档，必须纳入版本管理：

- 前端源码
- 安卓工程源码
- 服务端源码
- 配置文件
- 部署文档
- 版本管理文档
- 发布流程文档

示例：

- `public/`
- `android/`
- `server.js`
- `package.json`
- `README.md`
- `CHANGELOG.md`

## 2. 默认不进入 Git 的文件

这些文件只用于本地调试、临时打包或中间构建，不建议进入仓库：

- APK 文件
- ZIP 压缩包
- 构建缓存
- 模拟器截图
- 临时测试脚本
- 临时占位文件

示例：

- `*.apk`
- `*.zip`
- `tmp_android_build/`
- `android/build/`
- `android/app/build/`
- `emulator-*.png`
- `tmp_ws_test.js`

## 3. 可以本地保留，但不纳入仓库的文件

这些文件对个人调试可能有帮助，但不应该影响版本管理：

- 调试截图
- 临时导出图片
- 本地备份压缩包
- 调试时生成的说明图片

例如：

- `backmenu.png`
- `gomoku.zip`
- `gomoku-huawei-server.apk`

## 4. 发布包管理建议

正式打出来的 APK 建议这样管理：

### 4.1 本地命名规则

建议格式：

- `gomoku-v1.1.1.apk`
- `gomoku-v1.2.0.apk`
- `gomoku-v1.2.0-huawei.apk`

### 4.2 不提交到 Git

APK 体积大，而且属于编译产物，不建议提交到仓库。

### 4.3 推荐存放方式

可选方案：

- 本地单独文件夹
- 网盘
- 云盘
- GitHub Release

## 5. 推荐新增目录

如果后面文件越来越多，建议在项目外或项目根目录外另建：

- `releases/`：存放正式 APK
- `docs-assets/`：存放文档截图
- `tmp/`：存放临时调试文件

如果放在项目根目录内，也建议默认加入 `.gitignore`。

## 6. 每次提交前检查

提交前建议检查：

```bash
git status
```

重点看有没有这些不该提交的文件：

- 新 APK
- ZIP 包
- 截图
- 调试文件
- 构建缓存

## 7. 当前规则

当前项目已建议忽略：

- `*.apk`
- `*.zip`
- `tmp_android_build/`
- `tmp_apk/`
- `android/build/`
- `android/app/build/`
- `node_modules/`
- `backmenu.png`
- `tmp_ws_test.js`
- `1`

## 8. 后续维护建议

以后每做完一轮开发，建议：

1. 打包 APK 后单独保存
2. 不把 APK 提交进 Git
3. 调试截图只留本地
4. 提交前先看 `git status`
5. 保持仓库只保存源码和长期文档
