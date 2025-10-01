# uni-api-howlife

[![GitHub](https://img.shields.io/badge/GitHub-doomnaiad--320%2Fhowlife-blue?logo=github)](https://github.com/doomnaiad-320/howlife)

一个用于统一管理多家大模型服务商的全栈方案，包含 FastAPI 后端 **uni-api** 与 Next.js 前端管理面板。通过单一配置文件即可聚合不同渠道、统一 OpenAI 格式接口，并实时查看调用统计与渠道健康状态。

## 📦 仓库地址

- **GitHub**: https://github.com/doomnaiad-320/howlife.git

```bash
# 克隆仓库
git clone https://github.com/doomnaiad-320/howlife.git
cd howlife
```

## 仓库结构

| 路径 | 说明 |
| --- | --- |
| `uni-api/` | FastAPI 实现的聚合 API，支持多渠道负载均衡、限流、计费、工具调用等能力。详情见子目录内的 README。 |
| `web/` | 面向 uni-api 的可视化面板，提供配置管理、统计分析、渠道连通性测试等功能。 |

## 功能亮点

### uni-api 后端
- 将 OpenAI/Anthropic/Gemini/Vertex/Azure/Groq/OpenRouter 等渠道统一成 OpenAI 协议。
- 支持按渠道或 API Key 的轮询、加权、冷却与重试策略，提升可用性。
- 细粒度模型权限、限流、超时与价格配置，覆盖计费与风控场景。
- 统计数据库与审核接口，方便长期运营与合规管理。

### 管理面板（web）
- 图形化管理 `api.yaml` 配置，提供 YAML 语法校验与片段预览。
- 多维度统计（模型、渠道、时间），包含请求量、Token、耗时与成功率。
- API Key 角色鉴权，管理员可查看全局数据，普通用户仅能查看自身。
- 渠道连通性测试与日志检索，帮助快速定位问题。

## 快速开始

### 🚀 方式一：一键安装启动（推荐）

本项目提供了自动化脚本，可以一键安装所有依赖并启动服务：

```bash
# 给脚本添加执行权限
chmod +x setup-and-start.sh

# 运行安装和启动脚本
./setup-and-start.sh
```

脚本会自动完成：
- ✅ 检测并安装 Python 3.11+ 和 Node.js 18+
- ✅ 创建 Python 虚拟环境
- ✅ 安装所有后端依赖
- ✅ 安装所有前端依赖
- ✅ 检查配置文件
- ✅ 启动后端服务（端口 8000）
- ✅ 启动前端服务（端口 3000）

**管理脚本**：
```bash
./stop-services.sh      # 停止所有服务
./restart-services.sh   # 重启所有服务
./view-logs.sh          # 查看日志
```

详细的安装和使用指南请参考：[SETUP_README.md](SETUP_README.md)

---

### 🐳 方式二：Docker Compose 部署

#### 1. 准备配置与数据目录
1. 在仓库根目录创建 `config/` 与 `data/` 目录：
   ```bash
   mkdir -p config data
   cp uni-api/api.yaml config/api.yaml # 根据需要修改
   ```
2. 确保 `config/api.yaml` 中已经配置好各渠道的凭据与模型列表。

#### 2. 使用 Docker Compose 启动一体化环境

在仓库根目录创建 `docker-compose.yml`（如尚未创建），内容示例：

```yaml
services:
  uni-api:
    image: yym68686/uni-api:latest
    container_name: uni-api
    restart: unless-stopped
    environment:
      CONFIG_URL: ""  # 如需远程拉取配置，可填入直链；为空则使用挂载文件
    ports:
      - "8001:8000"
    volumes:
      - ./config/api.yaml:/home/api.yaml:ro
      - ./data:/home/data

  dashboard:
    build:
      context: ./web
    container_name: uni-api-dashboard
    depends_on:
      - uni-api
    environment:
      NODE_ENV: production
      PORT: 3000
      API_YAML_PATH: /data/api.yaml
      STATS_DB_TYPE: sqlite  # 如使用 Postgres，可改为 postgres 并补全环境变量
      STATS_DB_PATH: /data/stats.db
    ports:
      - "3000:3000"
    volumes:
      - ./config/api.yaml:/data/api.yaml:ro
      - ./data:/data:ro
    restart: unless-stopped
```

> 若更倾向于使用预构建镜像，可将 `dashboard` 服务的 `build` 字段替换为 `image: ghcr.io/melosbot/uni-api-status:latest`。

启动：
```bash
docker compose up -d
```

服务启动后：
- 后端接口：`http://localhost:8001/v1/chat/completions`
- 管理面板：`http://localhost:3000`

首次运行时 uni-api 会在 `./data` 目录内生成 `stats.db` 统计数据库；请确保面板对该目录具有只读权限。

---

### 🛠️ 方式三：本地开发

#### uni-api（FastAPI 后端）
- 依赖：Python 3.11+、uv 或 pip。
- 建议使用 [uv](https://github.com/astral-sh/uv) 以同步 `uv.lock`：
  ```bash
  cd uni-api
  pip install --upgrade uv
  uv sync
  uv run uvicorn main:app --host 0.0.0.0 --port 8000
  ```
- 也可以参考 `uni-api/README.md` 使用 Docker、PEX、Koyeb 等方式部署。

#### web（Next.js 管理面板）
- 依赖：Node.js 18+、pnpm。
- 开发流程：
  ```bash
  cd web
  pnpm install
  cp .env.example .env.local  # 如存在示例文件
  # 设置 API_YAML_PATH / STATS_DB_* 等环境变量
  pnpm dev
  ```
- 构建生产包：`pnpm build && pnpm start`。

#### 共享统计数据库
- 使用 SQLite 时，请确保面板与后端共享同一个 `stats.db` 文件及其 `-shm/-wal` 文件。
- 使用 Postgres 时，在两个服务中配置一致的 `DB_*` 与 `STATS_DB_*` 环境变量。

## 📚 更多资料

- **一键安装指南**: [SETUP_README.md](SETUP_README.md)
- **后端详细文档**: `uni-api/README.md`、`uni-api/README_CN.md`
- **统计与计费说明**: `uni-api/docs/count_billing_guide.md`
- **管理面板说明**: `web/README.md`

## 🔗 相关链接

- **GitHub 仓库**: https://github.com/doomnaiad-320/howlife
- **问题反馈**: https://github.com/doomnaiad-320/howlife/issues

## 🤝 贡献

如需扩展或提交修改，请在对应子项目的 README 中查看贡献指南与许可证信息。

---

**Made with ❤️ by Howlife Team**
