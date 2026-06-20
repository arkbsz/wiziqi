# Render Free 部署说明

这个项目可以直接部署到 Render Free，部署完成后会得到一个固定公网地址，网页端可直接联机，Android APK 也可以填这个地址联机。

## 1. 上传代码

把 [gomoku](C:/Users/bsz/Documents/5z7/gomoku) 整个项目上传到 GitHub 仓库。

## 2. 在 Render 创建服务

1. 打开 [Render Dashboard](https://dashboard.render.com/)
2. 选择 `New +`
3. 选择 `Blueprint`
4. 连接你的 GitHub 仓库
5. Render 会自动识别项目里的 [render.yaml](C:/Users/bsz/Documents/5z7/gomoku/render.yaml)
6. 确认创建

## 3. 等待部署完成

部署成功后会得到类似下面的公网地址：

```text
https://gomoku-online.onrender.com
```

对应联机地址是：

```text
wss://gomoku-online.onrender.com
```

## 4. 网页端如何用

直接打开 Render 分配的网址即可。  
网页版会自动把当前域名当作联机服务器地址，一般不用再手动输入。

## 5. Android APK 如何用

在联机界面的“服务器地址”里输入：

```text
wss://你的-render-域名
```

例如：

```text
wss://gomoku-online.onrender.com
```

填一次后会保存在本机，下次不用重复输入。

## 6. Free 版注意事项

- 15 分钟没访问后会休眠
- 第一次重新进入可能要等几十秒唤醒
- 服务重启后，正在进行的房间会消失

这不影响轻量测试和偶尔联机，但不适合长期稳定挂机。
