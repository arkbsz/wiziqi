# 版本管理说明

为了方便以后继续更新功能、界面和联机服务，项目建议采用下面这套版本管理方式。

## 1. 版本号规则

采用三段式版本号：

`主版本.次版本.修订版本`

例如：

- `1.0.0`
- `1.1.0`
- `1.1.1`
- `2.0.0`

含义如下：

- 主版本：有较大改版、架构变化、联机方案大改时升级
- 次版本：新增功能、界面升级、模块扩展时升级
- 修订版本：修 bug、修兼容性、修地址、修文案时升级

## 2. 当前建议规则

### 2.1 修 bug

例如：

- 修复联机超时
- 修复按钮无反应
- 修复中文乱码
- 修复棋盘显示异常

版本号变化：

- `1.1.0 -> 1.1.1`

### 2.2 加新功能

例如：

- 新增 AI 对战
- 新增战绩记录
- 新增匹配大厅
- 新增用户昵称系统

版本号变化：

- `1.1.0 -> 1.2.0`

### 2.3 大改架构

例如：

- 从本地服务器切到云服务器
- 从内存房间改成数据库房间
- 大幅重做 UI 和交互结构

版本号变化：

- `1.1.0 -> 2.0.0`

## 3. 每次更新时要改哪里

### 3.1 前端版本

文件：

- `package.json`

修改：

- `version`

### 3.2 安卓版本

文件：

- `android/app/build.gradle`

修改：

- `versionCode`
- `versionName`

规则：

- 每发一个新的 APK，`versionCode` 必须递增
- `versionName` 与项目版本号保持一致

示例：

- `versionCode 2`
- `versionName '1.1.0'`

## 4. Git 分支建议

建议保留这些分支：

- `main`：稳定可发布版本
- `dev`：日常开发版本
- `feature/xxx`：单个新功能开发
- `fix/xxx`：单个问题修复

示例：

- `feature/ai-mode`
- `feature/rank-system`
- `fix/online-timeout`
- `fix/android-compatibility`

## 5. Git 提交建议

建议提交信息保持清晰。

格式示例：

- `feat: add AI mode`
- `feat: redesign online lobby`
- `fix: resolve create room timeout`
- `fix: update default server address`
- `docs: add deploy guide`
- `refactor: simplify room sync flow`

## 6. 发布建议流程

每次发布新版本建议按这个流程：

1. 在开发分支完成修改
2. 本地测试网页功能
3. 安卓模拟器测试
4. 真机测试
5. 更新 `CHANGELOG.md`
6. 更新版本号
7. 打 APK
8. 合并到 `main`
9. 打 Git tag

## 7. Git Tag 建议

每次正式版本打一个 tag：

```bash
git tag v1.1.0
git push origin v1.1.0
```

这样以后可以快速回到任意稳定版本。

## 8. 文件管理建议

以下内容不要长期提交进仓库：

- APK 文件
- ZIP 压缩包
- 临时截图
- 模拟器调试截图
- 构建缓存目录
- 临时测试脚本

这些已经建议通过 `.gitignore` 管理。

## 9. 推荐工作方式

以后每次更新项目时，建议这样做：

1. 先新建功能分支
2. 做功能或修复
3. 测试通过后更新版本号
4. 更新 changelog
5. 合并到 main
6. 打包 APK

## 10. 当前版本

当前项目版本建议为：

- 项目版本：`1.1.0`
- 安卓版本名：`1.1.0`
- 安卓版本号：`2`
