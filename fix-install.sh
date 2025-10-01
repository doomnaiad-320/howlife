#!/bin/bash

# ============================================
# 修复安装问题的脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
log_info "=========================================="
log_info "修复 Uni-API 安装问题"
log_info "=========================================="
echo ""

# 检查 Python 版本
log_info "检查 Python 版本..."
PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
log_info "当前 Python 版本: $PYTHON_VERSION"

# 进入后端目录
cd uni-api

# 激活虚拟环境（如果存在）
if [ -d ".venv" ]; then
    log_info "激活虚拟环境..."
    source .venv/bin/activate
else
    log_info "创建虚拟环境..."
    python3 -m venv .venv
    source .venv/bin/activate
fi

# 升级 pip 和安装工具
log_info "升级 pip 和安装工具..."
pip install --upgrade pip setuptools wheel

# 直接安装依赖包
log_info "安装 Python 依赖包..."
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

log_success "后端依赖安装完成！"

cd ..

# 安装前端依赖
log_info "=========================================="
log_info "安装前端依赖"
log_info "=========================================="

cd web

if [ -f "pnpm-lock.yaml" ]; then
    if ! command -v pnpm &> /dev/null; then
        log_info "安装 pnpm..."
        npm install -g pnpm
    fi
    log_info "使用 pnpm 安装依赖..."
    pnpm install
else
    log_info "使用 npm 安装依赖..."
    npm install
fi

log_success "前端依赖安装完成！"

cd ..

echo ""
log_success "=========================================="
log_success "✅ 所有依赖安装完成！"
log_success "=========================================="
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo "  1. 检查配置文件: uni-api/api.yaml"
echo "  2. 启动服务: ./restart-services.sh"
echo ""

