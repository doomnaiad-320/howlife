# 更新日志

## [1.6.82] - 2025-10-02

### 新增功能

#### 🚀 一键安装脚本
- **setup-and-start.sh**: 自动安装所有依赖并启动服务
  - 自动检测操作系统（macOS/Linux）
  - 自动安装 Python 3.11+ 和 Node.js 18+
  - 创建 Python 虚拟环境
  - 安装所有后端和前端依赖
  - 自动启动后端（8000端口）和前端（3000端口）服务
  - 生成日志文件和进程 PID 文件

#### 🛠️ 服务管理脚本
- **stop-services.sh**: 停止所有运行的服务
  - 优雅停止后端和前端进程
  - 清理残留进程
  - 删除 PID 文件

- **restart-services.sh**: 重启所有服务
  - 先停止现有服务
  - 重新启动后端和前端
  - 显示服务状态

- **view-logs.sh**: 交互式日志查看器
  - 实时查看后端/前端日志
  - 查看最近100行日志
  - 同时查看两个日志

#### 📚 文档更新
- **SETUP_README.md**: 详细的安装和使用指南
  - 系统要求说明
  - 快速开始指南
  - 管理脚本使用说明
  - 故障排除指南
  - 手动安装步骤

- **README.md**: 更新主文档
  - 添加仓库地址和徽章
  - 添加一键安装说明
  - 重新组织文档结构
  - 添加相关链接

#### 🔧 配置文件
- **.gitignore**: Git 忽略规则
  - 忽略日志文件
  - 忽略进程 PID 文件
  - 忽略虚拟环境
  - 忽略数据库文件
  - 忽略临时文件

- **VERSION**: 版本信息文件

### 修复

#### 🐛 Provider 管理界面
- 修复输入密钥后不展示已有 Provider 配置的问题
  - 统一 localStorage key 为 `uniapi_current_key`
  - 修复前端和主页面的 localStorage 不一致问题
  - 移除调试代码

#### 🔒 统一错误信息输出
- 实现统一的错误处理机制
  - 对用户显示友好的统一错误信息
  - 在日志中记录详细的原始错误信息
  - 保护上游敏感信息不泄露
  - 创建 `create_unified_error_response()` 函数
  - 更新所有错误处理点

### 变更

#### 📦 仓库地址更新
- 更新 Git remote 地址
  - 旧地址: `https://github.com/doomnaiad-320/howlife-.git`
  - 新地址: `https://github.com/doomnaiad-320/howlife.git`

#### 🎨 前端改进
- Provider 管理页面优化
  - 添加 Enter 键快速确认
  - 添加加载状态显示
  - 改进用户体验

### 技术细节

#### 后端 (uni-api)
- Python 3.11+
- FastAPI
- SQLAlchemy
- httpx
- ruamel.yaml

#### 前端 (web)
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Radix UI

### 文件结构

```
howlife/
├── setup-and-start.sh      # 一键安装启动脚本
├── stop-services.sh         # 停止服务脚本
├── restart-services.sh      # 重启服务脚本
├── view-logs.sh            # 查看日志脚本
├── commit-changes.sh       # Git 提交脚本
├── README.md               # 主文档
├── SETUP_README.md         # 安装指南
├── CHANGELOG.md            # 更新日志
├── VERSION                 # 版本信息
├── .gitignore              # Git 忽略规则
├── logs/                   # 日志目录
│   ├── backend.log         # 后端日志
│   ├── frontend.log        # 前端日志
│   ├── backend.pid         # 后端进程 PID
│   └── frontend.pid        # 前端进程 PID
├── uni-api/                # 后端代码
└── web/                    # 前端代码
```

### 使用说明

#### 快速开始

```bash
# 克隆仓库
git clone https://github.com/doomnaiad-320/howlife.git
cd howlife

# 一键安装和启动
chmod +x setup-and-start.sh
./setup-and-start.sh
```

#### 服务管理

```bash
# 停止服务
./stop-services.sh

# 重启服务
./restart-services.sh

# 查看日志
./view-logs.sh
```

#### 访问服务

- 前端界面: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

### 贡献者

- Howlife Team

### 许可证

MIT License

---

**完整的更新内容请查看 Git 提交历史**

