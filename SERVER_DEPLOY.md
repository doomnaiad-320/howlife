# 🚀 服务器部署指南

本指南将帮助你在服务器上部署 Uni-API 项目。

## 📋 服务器要求

- **操作系统**: Linux (Ubuntu 20.04+, Debian 10+, CentOS 7+)
- **Python**: 3.11 或更高版本
- **Node.js**: 18 或更高版本
- **内存**: 至少 2GB RAM
- **磁盘**: 至少 5GB 可用空间
- **网络**: 需要访问外网（安装依赖）

## 🎯 快速部署

### 1. 克隆项目

```bash
# 使用 SSH
git clone git@github.com:doomnaiad-320/howlife.git
cd howlife

# 或使用 HTTPS
git clone https://github.com/doomnaiad-320/howlife.git
cd howlife
```

### 2. 运行安装脚本

```bash
# 给脚本添加执行权限
chmod +x *.sh

# 运行安装脚本
./setup-and-start.sh
```

脚本会自动：
- ✅ 安装 Python 3.11+ 和 Node.js 18+
- ✅ 创建虚拟环境
- ✅ 安装所有依赖
- ✅ **自动配置环境变量（使用绝对路径）**
- ✅ 启动服务

### 3. 配置 API Keys

```bash
# 编辑配置文件
nano uni-api/api.yaml

# 或使用 vim
vim uni-api/api.yaml
```

添加你的 API Keys 和 Providers 配置。

### 4. 重启服务

```bash
./restart-services.sh
```

## 🔧 环境变量配置

### 自动配置（推荐）

安装脚本会自动创建 `web/.env.local` 文件，内容如下：

```bash
# 假设项目在 /root/howlife
STATS_DB_PATH=/root/howlife/uni-api/data/stats.db
API_YAML_PATH=/root/howlife/uni-api/api.yaml
STATS_DB_TYPE=sqlite
NODE_ENV=production
PORT=3000
```

### 手动配置

如果需要手动配置，运行：

```bash
./setup-env.sh
```

或手动创建 `web/.env.local`：

```bash
# 获取项目路径
PROJECT_ROOT=$(pwd)

# 创建配置文件
cat > web/.env.local << EOF
STATS_DB_PATH=$PROJECT_ROOT/uni-api/data/stats.db
API_YAML_PATH=$PROJECT_ROOT/uni-api/api.yaml
STATS_DB_TYPE=sqlite
NODE_ENV=production
PORT=3000
EOF
```

## 📁 目录结构

部署后的目录结构：

```
/root/howlife/                          # 项目根目录
├── uni-api/                            # 后端
│   ├── .venv/                          # Python 虚拟环境
│   ├── data/                           # 数据目录
│   │   └── stats.db                    # 统计数据库
│   ├── api.yaml                        # 配置文件
│   └── main.py                         # 后端入口
├── web/                                # 前端
│   ├── .env.local                      # 环境配置（自动生成）
│   ├── node_modules/                   # 依赖
│   └── ...
├── logs/                               # 日志目录
│   ├── backend.log                     # 后端日志
│   ├── frontend.log                    # 前端日志
│   ├── backend.pid                     # 后端进程 PID
│   └── frontend.pid                    # 前端进程 PID
└── *.sh                                # 管理脚本
```

## 🌐 访问服务

### 本地访问

```bash
# 后端 API
curl http://localhost:8000/docs

# 前端界面
curl http://localhost:3000
```

### 外网访问

#### 方案一：使用 Nginx 反向代理（推荐）

1. 安装 Nginx：

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS
sudo yum install nginx
```

2. 配置 Nginx：

```bash
sudo nano /etc/nginx/sites-available/howlife
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. 启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/howlife /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 方案二：直接开放端口

```bash
# 开放防火墙端口
sudo ufw allow 3000
sudo ufw allow 8000
```

## 🔐 安全配置

### 1. 使用 HTTPS

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

### 2. 配置防火墙

```bash
# 只允许必要的端口
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 3. 限制 API 访问

在 `uni-api/api.yaml` 中配置 API Key 权限。

## 🔄 服务管理

### 启动服务

```bash
./restart-services.sh
```

### 停止服务

```bash
./stop-services.sh
```

### 查看日志

```bash
# 使用日志查看器
./view-logs.sh

# 或直接查看
tail -f logs/backend.log
tail -f logs/frontend.log
```

### 查看服务状态

```bash
# 检查进程
ps aux | grep "python main.py"
ps aux | grep "next dev"

# 检查端口
netstat -tlnp | grep 8000
netstat -tlnp | grep 3000
```

## 🚀 使用 PM2 管理服务（推荐）

PM2 可以让服务在后台持续运行，并在崩溃时自动重启。

### 1. 安装 PM2

```bash
npm install -g pm2
```

### 2. 创建 PM2 配置文件

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'uni-api-backend',
      cwd: './uni-api',
      script: '.venv/bin/python',
      args: 'main.py',
      interpreter: 'none',
      env: {
        PYTHONUNBUFFERED: '1'
      }
    },
    {
      name: 'uni-api-frontend',
      cwd: './web',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
EOF
```

### 3. 使用 PM2 管理

```bash
# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 停止服务
pm2 stop all

# 重启服务
pm2 restart all

# 设置开机自启
pm2 startup
pm2 save
```

## 📊 监控和维护

### 查看资源使用

```bash
# 使用 htop
htop

# 使用 PM2 监控
pm2 monit
```

### 定期备份

```bash
# 备份配置文件
cp uni-api/api.yaml uni-api/api.yaml.backup

# 备份数据库
cp uni-api/data/stats.db uni-api/data/stats.db.backup
```

### 更新代码

```bash
# 拉取最新代码
git pull origin main

# 重新安装依赖（如果有更新）
./fix-install.sh

# 重启服务
./restart-services.sh
```

## 🐛 故障排除

### 问题 1: 端口被占用

```bash
# 查找占用端口的进程
lsof -i :8000
lsof -i :3000

# 停止进程
kill -9 <PID>
```

### 问题 2: 依赖安装失败

```bash
# 使用修复脚本
./fix-install.sh
```

详细的故障排除请参考：[INSTALL_FIX.md](INSTALL_FIX.md)

### 问题 3: 服务无法启动

```bash
# 查看日志
cat logs/backend.log
cat logs/frontend.log

# 检查配置
cat web/.env.local
cat uni-api/api.yaml
```

### 问题 4: 环境变量路径错误

```bash
# 重新配置环境变量
./setup-env.sh

# 或手动检查
cat web/.env.local
```

## 📚 相关文档

- [README.md](README.md) - 项目说明
- [SETUP_README.md](SETUP_README.md) - 详细安装指南
- [INSTALL_FIX.md](INSTALL_FIX.md) - 安装问题修复
- [CHANGELOG.md](CHANGELOG.md) - 更新日志

## 🆘 获取帮助

- **GitHub Issues**: https://github.com/doomnaiad-320/howlife/issues
- **查看日志**: `./view-logs.sh`
- **检查状态**: `pm2 status` 或 `ps aux | grep -E "python|next"`

---

**祝你部署顺利！** 🎉

