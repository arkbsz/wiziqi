# 五子棋项目部署到国内云服务器

适用场景：

- 两个手机不在同一个局域网
- 不想每次都在电脑上启动本地服务器
- 希望长期稳定联机

推荐平台：

- 腾讯云轻量应用服务器
- 阿里云 ECS / 轻量应用服务器
- 华为云 ECS

建议配置：

- 2 核 2G
- Ubuntu 22.04
- 公网 IP

## 一、购买服务器

建议优先选择：

1. 低配云服务器
2. Ubuntu 22.04
3. 带公网 IP

如果只是五子棋联机，这个项目非常小，低配就足够。

## 二、开放端口

需要放行：

- `22`：SSH
- `80`：HTTP
- `443`：HTTPS
- `4000`：Node 服务直连测试用

如果后面配 Nginx 反向代理，正式使用通常走 `80/443`。

## 三、上传项目

把整个 `gomoku` 项目上传到服务器，例如：

```bash
scp -r gomoku root@你的服务器公网IP:/root/
```

或者先上传到 GitHub，再在服务器上拉取：

```bash
git clone 你的仓库地址
```

## 四、安装运行环境

登录服务器后执行：

```bash
apt update
apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
```

检查版本：

```bash
node -v
npm -v
pm2 -v
```

## 五、安装项目依赖

进入项目目录：

```bash
cd /root/gomoku
npm install
```

## 六、启动服务

项目里已经准备好了 `pm2` 配置文件：

- `ecosystem.config.cjs`

启动命令：

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

查看状态：

```bash
pm2 status
pm2 logs gomoku-server
```

健康检查：

```bash
curl http://127.0.0.1:4000/health
```

正常会返回类似：

```json
{"name":"gomoku-local","status":"ok","transport":"http-polling"}
```

## 七、直接用公网 IP 测试

如果你先不配域名，可以先让手机这样连接：

```text
http://你的服务器公网IP:4000
```

例如：

```text
http://123.56.78.90:4000
```

这一步通常就已经能实现跨网络联机。

## 八、推荐正式方案：Nginx + 域名

安装 Nginx：

```bash
apt install -y nginx
```

新建配置：

```bash
nano /etc/nginx/sites-available/gomoku
```

填入：

```nginx
server {
    listen 80;
    server_name 你的域名;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/gomoku /etc/nginx/sites-enabled/gomoku
nginx -t
systemctl restart nginx
```

后续可再配 HTTPS：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d 你的域名
```

## 九、手机里怎么填

如果你现在直接用公网 IP：

```text
http://你的服务器公网IP:4000
```

如果你已经配好域名和 HTTPS：

```text
https://你的域名
```

## 十、安卓 APK 需要修改的地方

当前 Android 默认联机地址写在：

- `android/app/src/main/java/com/gomoku/game/MainActivity.java`

如果你要正式切到国内云服务器，改这里并重新打包：

```java
return "http://你的服务器公网IP:4000";
```

或者：

```java
return "https://你的域名";
```

## 十一、国内服务器特别注意

1. 如果只是先用公网 IP 测试，通常可以先跑，不一定立刻需要备案。
2. 如果长期绑定国内域名并稳定提供服务，通常需要 ICP 备案。
3. 如果后面上应用商店，APP 备案和合规也可能要补。

## 十二、最推荐的实际路线

最省事路线：

1. 买一台低配国内云服务器
2. Ubuntu 22.04
3. 上传项目
4. `npm install`
5. `pm2 start ecosystem.config.cjs`
6. 手机先连 `http://公网IP:4000`
7. 确认联机没问题后，再决定要不要配域名和 HTTPS

这样最快。
