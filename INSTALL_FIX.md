# 🔧 安装问题修复指南

## 问题描述

在运行 `setup-and-start.sh` 时遇到以下错误：

```
error: Multiple top-level packages discovered in a flat-layout: ['core', 'static'].
```

## 问题原因

这是因为 `pyproject.toml` 文件缺少包发现配置，导致 setuptools 无法正确识别项目结构。

## 🚀 快速修复方案

### 方案一：使用修复脚本（推荐）

```bash
# 运行修复脚本
chmod +x fix-install.sh
./fix-install.sh
```

这个脚本会：
1. ✅ 创建/激活 Python 虚拟环境
2. ✅ 升级 pip 和安装工具
3. ✅ 直接安装所有依赖包（不使用 editable 模式）
4. ✅ 安装前端依赖

### 方案二：手动修复

#### 1. 修复后端依赖

```bash
cd uni-api

# 激活虚拟环境
source .venv/bin/activate

# 升级安装工具
pip install --upgrade pip setuptools wheel

# 直接安装依赖包
pip install \
    aiofiles>=24.1.0 \
    aiosqlite>=0.21.0 \
    asyncpg>=0.30.0 \
    certifi==2025.1.31 \
    cryptography==43.0.3 \
    fastapi>=0.116.1 \
    greenlet>=3.2.4 \
    httpx-socks==0.9.2 \
    "httpx[http2]>=0.27.2" \
    pillow>=11.3.0 \
    pytest>=8.4.1 \
    python-multipart>=0.0.20 \
    ruamel-yaml>=0.18.15 \
    sqlalchemy>=2.0.43 \
    uvicorn>=0.35.0 \
    watchfiles>=1.1.0

cd ..
```

#### 2. 安装前端依赖

```bash
cd web

# 使用 npm
npm install

# 或使用 pnpm
pnpm install

cd ..
```

#### 3. 启动服务

```bash
# 使用重启脚本
./restart-services.sh

# 或手动启动
# 后端
cd uni-api
source .venv/bin/activate
python main.py &

# 前端
cd web
npm run dev &
```

## 📝 技术细节

### 修改的文件

**uni-api/pyproject.toml**

添加了以下配置：

```toml
[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[tool.setuptools]
py-modules = ["main", "utils"]

[tool.setuptools.packages.find]
include = ["core*"]
```

这告诉 setuptools：
- 主模块是 `main.py` 和 `utils.py`
- 包含 `core` 目录作为包
- 不包含 `static` 目录

### 为什么不使用 `pip install -e .`

`pip install -e .` (editable 模式) 需要正确的包结构配置。由于项目使用了 flat-layout（平面布局），有多个顶级目录（`core`, `static`），setuptools 无法自动识别。

**解决方案**：
1. 直接安装依赖包（不使用 editable 模式）
2. 或者重构项目为 src-layout

## ✅ 验证安装

### 检查后端依赖

```bash
cd uni-api
source .venv/bin/activate
python -c "import fastapi, httpx, sqlalchemy; print('后端依赖正常')"
```

### 检查前端依赖

```bash
cd web
npm list --depth=0
```

### 启动服务

```bash
# 后端
cd uni-api
source .venv/bin/activate
python main.py
# 应该看到: Uvicorn running on http://0.0.0.0:8000

# 前端（新终端）
cd web
npm run dev
# 应该看到: ready - started server on 0.0.0.0:3000
```

## 🔍 常见问题

### Q1: 虚拟环境激活失败

**问题**：`source .venv/bin/activate` 报错

**解决**：
```bash
# 删除旧的虚拟环境
rm -rf uni-api/.venv

# 重新创建
cd uni-api
python3 -m venv .venv
source .venv/bin/activate
```

### Q2: pip 安装速度慢

**解决**：使用国内镜像源

```bash
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple \
    aiofiles aiosqlite asyncpg certifi==2025.1.31 ...
```

### Q3: npm 安装失败

**解决**：
```bash
cd web

# 清理缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules

# 重新安装
npm install
```

### Q4: 端口被占用

**问题**：`Address already in use`

**解决**：
```bash
# 查找占用端口的进程
lsof -i :8000  # 后端
lsof -i :3000  # 前端

# 停止进程
kill -9 <PID>

# 或使用停止脚本
./stop-services.sh
```

## 📚 相关文档

- [SETUP_README.md](SETUP_README.md) - 完整安装指南
- [README.md](README.md) - 项目说明
- [CHANGELOG.md](CHANGELOG.md) - 更新日志

## 🆘 获取帮助

如果以上方法都无法解决问题：

1. 查看日志文件：
   ```bash
   ./view-logs.sh
   ```

2. 检查 Python 版本：
   ```bash
   python3 --version  # 需要 3.11+
   ```

3. 检查 Node.js 版本：
   ```bash
   node --version  # 需要 18+
   ```

4. 提交 Issue：
   https://github.com/doomnaiad-320/howlife/issues

---

**修复完成后，记得运行测试！** ✅

