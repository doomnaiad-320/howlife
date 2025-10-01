#!/bin/bash

# ============================================
# Uni-API 停止服务脚本
# ============================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
log_info "=========================================="
log_info "停止 Uni-API 服务"
log_info "=========================================="
echo ""

# 停止后端服务
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        log_info "停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        sleep 2
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            log_warning "强制停止后端服务..."
            kill -9 $BACKEND_PID
        fi
        log_success "后端服务已停止"
    else
        log_warning "后端服务未运行"
    fi
    rm logs/backend.pid
else
    log_warning "未找到后端服务 PID 文件"
fi

# 停止前端服务
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        log_info "停止前端服务 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        sleep 2
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            log_warning "强制停止前端服务..."
            kill -9 $FRONTEND_PID
        fi
        log_success "前端服务已停止"
    else
        log_warning "前端服务未运行"
    fi
    rm logs/frontend.pid
else
    log_warning "未找到前端服务 PID 文件"
fi

# 额外清理：查找并停止可能的残留进程
log_info "检查残留进程..."

# 查找 Python main.py 进程
PYTHON_PIDS=$(pgrep -f "python.*main.py" || true)
if [ ! -z "$PYTHON_PIDS" ]; then
    log_warning "发现残留的后端进程，正在清理..."
    echo "$PYTHON_PIDS" | xargs kill -9 2>/dev/null || true
fi

# 查找 Next.js 进程
NEXT_PIDS=$(pgrep -f "next dev" || true)
if [ ! -z "$NEXT_PIDS" ]; then
    log_warning "发现残留的前端进程，正在清理..."
    echo "$NEXT_PIDS" | xargs kill -9 2>/dev/null || true
fi

echo ""
log_success "所有服务已停止"
echo ""

