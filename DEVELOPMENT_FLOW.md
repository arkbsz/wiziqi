# 标准开发流程

这份文档用于规范后续功能开发、界面更新、联机服务修改和 APK 发布流程。

## 1. 日常开发原则

后续所有新功能、界面优化、联机修复，建议都不要直接在 `main` 上改。

推荐分支使用方式：

- `main`：稳定可发布版本
- `dev`：日常开发主线
- `feature/xxx`：新功能
- `fix/xxx`：问题修复

## 2. 开发新功能的标准流程

### 第一步：切到开发分支

```bash
git checkout dev
git pull origin dev
```

### 第二步：创建功能分支

例如开发 AI 模式：

```bash
git checkout -b feature/ai-mode
```

例如修复联机超时：

```bash
git checkout -b fix/online-timeout
```

## 3. 开发过程中建议

### 3.1 小步提交

不要积累太多改动再一次性提交。

建议：

- 功能完成一块就提交
- 修复一个问题就提交
- 文档更新单独提交

### 3.2 提交信息格式

推荐格式：

- `feat: add AI mode`
- `feat: redesign game screen`
- `fix: resolve room join timeout`
- `fix: update default server url`
- `docs: update release notes`
- `refactor: simplify polling sync`

## 4. 功能完成后的流程

### 第一步：本地检查

发布前至少检查：

- 网页本地运行正常
- 本地对战正常
- 联机创建房间正常
- 联机加入房间正常
- 中文显示正常
- 安卓打包正常

### 第二步：提交代码

```bash
git add .
git commit -m "feat: add xxx"
```

### 第三步：推送分支

```bash
git push origin feature/xxx
```

或：

```bash
git push origin fix/xxx
```

## 5. 合并到 dev

功能测试通过后，切回 `dev`：

```bash
git checkout dev
git pull origin dev
git merge feature/xxx
git push origin dev
```

如果是修复分支：

```bash
git checkout dev
git pull origin dev
git merge fix/xxx
git push origin dev
```

## 6. 发布到 main

当 `dev` 上功能稳定，准备正式发版时：

```bash
git checkout main
git pull origin main
git merge dev
git push origin main
```

## 7. 版本号更新规则

### 修复类

- `1.1.0 -> 1.1.1`

适用于：

- 联机 bug
- 中文乱码
- 按钮失效
- 安卓兼容性问题

### 新功能类

- `1.1.0 -> 1.2.0`

适用于：

- AI 模式
- 排行榜
- 匹配大厅
- 用户系统

### 大版本类

- `1.1.0 -> 2.0.0`

适用于：

- 架构重构
- 服务端重做
- 房间持久化升级
- 界面体系重做

## 8. 每次发版必须同步修改的地方

### 前端版本

文件：

- `package.json`

修改：

- `version`

### 安卓版本

文件：

- `android/app/build.gradle`

修改：

- `versionCode`
- `versionName`

要求：

- `versionCode` 每次发 APK 都要递增
- `versionName` 跟项目版本一致

## 9. 每次发版要更新的文档

### 必更

- `CHANGELOG.md`

### 建议同步

- `README.md`
- `PROJECT_WORK_TREE.md`
- `RELEASE_CHECKLIST.md`

## 10. 正式发版流程

### 第一步：更新版本号

### 第二步：更新 changelog

### 第三步：打包 APK

### 第四步：安装到模拟器测试

### 第五步：真机测试

### 第六步：合并到 main

### 第七步：打 tag

例如：

```bash
git tag v1.1.1
git push origin v1.1.1
```

## 11. 云服务器更新流程

当云服务器部署的是本项目联机服务，服务端更新建议流程：

### 本地完成修改后

```bash
git push origin main
```

### 服务器执行

```bash
cd /root/gomoku
git pull
npm install
pm2 restart gomoku-server
```

### 验证

```bash
pm2 status
curl http://127.0.0.1:4000/health
```

## 12. 安卓 APK 更新流程

### 修改默认联机地址或前端资源后

1. 同步 `public` 到 Android assets
2. 重新打包 APK
3. 卸载旧版或覆盖安装新版
4. 验证本地与联机功能

## 13. 推荐以后优先扩展的方向

建议优先顺序：

1. 稳定云服务器联机
2. 清理调试文件
3. 正式发布版打包
4. AI 对战
5. 用户昵称
6. 战绩记录
7. 匹配大厅
