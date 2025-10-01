# Uni-API 自动安装和启动指南

本项目提供了一套完整的自动化脚本，用于快速安装依赖并启动 Uni-API 服务。

## � 仓库地址

- **GitHub**: https://github.com/doomnaiad-320/howlife.git

```bash
# 克隆仓库
git clone https://github.com/doomnaiad-320/howlife.git
cd howlife
```

## �📋 系统要求

- **操作系统**: macOS 或 Linux
- **Python**: 3.11 或更高版本（脚本会自动安装）
- **Node.js**: 18 或更高版本（脚本会自动安装）
- **磁盘空间**: 至少 2GB 可用空间

## 🚀 快速开始

### 1. 首次安装和启动

```bash
# 给脚本添加执行权限
chmod +x setup-and-start.sh stop-services.sh restart-services.sh view-logs.sh

# 运行安装和启动脚本
./setup-and-start.sh
```

这个脚本会自动完成以下操作：

1. ✅ 检测操作系统
2. ✅ 安装 Homebrew（仅 macOS）
3. ✅ 安装 Python 3.11+
4. ✅ 安装 Node.js 18+
5. ✅ 创建 Python 虚拟环境
6. ✅ 安装后端依赖（FastAPI、httpx 等）
7. ✅ 安装前端依赖（Next.js、React 等）
8. ✅ 检查配置文件
9. ✅ 启动后端服务（端口 8000）
10. ✅ 启动前端服务（端口 3000）

### 2. 访问服务

安装完成后，你可以访问：

- **前端界面**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

## 🛠️ 管理脚本

### 停止服务

```bash
./stop-services.sh
```

这会停止所有正在运行的前端和后端服务。

### 重启服务

```bash
./restart-services.sh
```

这会先停止服务，然后重新启动。

### 查看日志

```bash
./view-logs.sh
```

提供交互式菜单，可以选择查看：
- 后端日志（实时）
- 前端日志（实时）
- 后端日志（最后100行）
- 前端日志（最后100行）
- 同时查看两个日志

或者直接使用命令：

```bash
# 查看后端日志
tail -f logs/backend.log

# 查看前端日志
tail -f logs/frontend.log
```

## 📁 文件结构

```
uni-api-howlife/
├── setup-and-start.sh      # 主安装和启动脚本
├── stop-services.sh         # 停止服务脚本
├── restart-services.sh      # 重启服务脚本
├── view-logs.sh            # 查看日志脚本
├── logs/                   # 日志目录
│   ├── backend.log         # 后端日志
│   ├── frontend.log        # 前端日志
│   ├── backend.pid         # 后端进程 PID
│   └── frontend.pid        # 前端进程 PID
├── uni-api/                # 后端代码
│   ├── .venv/              # Python 虚拟环境
│   ├── main.py             # 后端入口
│   ├── api.yaml            # 配置文件
│   └── pyproject.toml      # Python 依赖配置
└── web/                    # 前端代码
    ├── package.json        # Node.js 依赖配置
    └── ...
```

## ⚙️ 配置文件

### 首次运行前

确保 `uni-api/api.yaml` 配置文件存在。如果不存在，可以从样板复制：

```bash
cp uni-api/样板.yaml uni-api/api.yaml
```

然后编辑 `uni-api/api.yaml` 配置你的 API Keys 和 Providers。

### 配置示例

```yaml
providers:
  - provider: Claude-c
    base_url: https://api.howlife.cc/v1/chat/completions
    api: sk-your-api-key-here
    model:
      - Howlife:claude-opus-4: claude-opus-4

api_keys:
  - api: sk-your-admin-key-here
    role: admin
```

## 🔧 手动安装（可选）

如果你想手动安装依赖，可以按照以下步骤：

### 后端

```bash
cd uni-api

# 创建虚拟环境
python3 -m venv .venv

# 激活虚拟环境
source .venv/bin/activate

# 安装依赖
pip install -e .

# 启动服务
python main.py
```

### 前端

```bash
cd web

# 安装依赖（使用 npm）
npm install

# 或使用 pnpm
pnpm install

# 启动开发服务器
npm run dev
# 或
pnpm dev
```

## 🐛 故障排除

### 问题：端口已被占用

如果看到 "Address already in use" 错误：

```bash
# 查找占用端口的进程
lsof -i :8000  # 后端端口
lsof -i :3000  # 前端端口

# 停止进程
kill -9 <PID>
```

### 问题：Python 版本不兼容

确保使用 Python 3.11 或更高版本：

```bash
python3 --version
```

如果版本过低，脚本会自动安装正确的版本。

### 问题：依赖安装失败

尝试清理并重新安装：

```bash
# 后端
cd uni-api
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -e .

# 前端
cd web
rm -rf node_modules
npm install
```

### 问题：服务无法启动

检查日志文件：

```bash
cat logs/backend.log
cat logs/frontend.log
```

## 📝 开发模式

如果你想在开发模式下运行（可以看到实时输出）：

### 后端

```bash
cd uni-api
source .venv/bin/activate
python main.py
```

### 前端

```bash
cd web
npm run dev
```

## 🔄 更新依赖

### 更新后端依赖

```bash
cd uni-api
source .venv/bin/activate
pip install --upgrade -e .
```

### 更新前端依赖

```bash
cd web
npm update
# 或
pnpm update
```

## 📊 性能监控

查看服务状态：

```bash
# 检查进程
ps aux | grep "python main.py"
ps aux | grep "next dev"

# 检查端口
lsof -i :8000
lsof -i :3000

# 检查资源使用
top -p $(cat logs/backend.pid)
```

## 🆘 获取帮助

如果遇到问题：

1. 查看日志文件：`./view-logs.sh`
2. 检查配置文件：`uni-api/api.yaml`
3. 重启服务：`./restart-services.sh`
4. 查看进程状态：`ps aux | grep -E "python|next"`

## 📄 许可证

请参考项目的 LICENSE 文件。

---

**祝你使用愉快！** 🎉

