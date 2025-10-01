#!/bin/bash

# ============================================
# Uni-API 自动安装和启动脚本
# ============================================

set -e  # 遇到错误立即退出

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

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    else
        OS="unknown"
    fi
    log_info "检测到操作系统: $OS"
}

# 检查并安装 Homebrew (仅 macOS)
install_homebrew() {
    if [[ "$OS" == "macos" ]]; then
        if ! command -v brew &> /dev/null; then
            log_warning "未检测到 Homebrew，正在安装..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            log_success "Homebrew 安装完成"
        else
            log_success "Homebrew 已安装"
        fi
    fi
}

# 检查并安装 Python 3.11+
install_python() {
    log_info "检查 Python 版本..."
    
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
        REQUIRED_VERSION="3.11"
        
        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
            log_success "Python $PYTHON_VERSION 已安装"
            PYTHON_CMD="python3"
            return
        fi
    fi
    
    log_warning "需要安装 Python 3.11 或更高版本"
    
    if [[ "$OS" == "macos" ]]; then
        brew install python@3.11
        PYTHON_CMD="python3.11"
    elif [[ "$OS" == "linux" ]]; then
        sudo apt-get update
        sudo apt-get install -y python3.11 python3.11-venv python3-pip
        PYTHON_CMD="python3.11"
    fi
    
    log_success "Python 安装完成"
}

# 检查并安装 Node.js 和 npm
install_nodejs() {
    log_info "检查 Node.js 版本..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            log_success "Node.js $(node --version) 已安装"
            return
        fi
    fi
    
    log_warning "需要安装 Node.js 18 或更高版本"
    
    if [[ "$OS" == "macos" ]]; then
        brew install node
    elif [[ "$OS" == "linux" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    log_success "Node.js 安装完成"
}

# 安装后端依赖
install_backend_deps() {
    log_info "=========================================="
    log_info "安装后端依赖 (uni-api)"
    log_info "=========================================="
    
    cd uni-api
    
    # 创建虚拟环境
    if [ ! -d ".venv" ]; then
        log_info "创建 Python 虚拟环境..."
        $PYTHON_CMD -m venv .venv
        log_success "虚拟环境创建完成"
    else
        log_success "虚拟环境已存在"
    fi
    
    # 激活虚拟环境
    log_info "激活虚拟环境..."
    source .venv/bin/activate
    
    # 升级 pip
    log_info "升级 pip..."
    pip install --upgrade pip
    
    # 安装依赖
    log_info "安装 Python 依赖包..."
    pip install -e .
    
    log_success "后端依赖安装完成"
    
    cd ..
}

# 安装前端依赖
install_frontend_deps() {
    log_info "=========================================="
    log_info "安装前端依赖 (web)"
    log_info "=========================================="
    
    cd web
    
    # 检查是否使用 pnpm
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
    
    log_success "前端依赖安装完成"
    
    cd ..
}

# 检查配置文件
check_config() {
    log_info "=========================================="
    log_info "检查配置文件"
    log_info "=========================================="
    
    if [ ! -f "uni-api/api.yaml" ]; then
        log_error "配置文件 uni-api/api.yaml 不存在！"
        log_info "请创建配置文件或从样板复制："
        log_info "  cp uni-api/样板.yaml uni-api/api.yaml"
        exit 1
    fi
    
    log_success "配置文件检查通过"
}

# 启动服务
start_services() {
    log_info "=========================================="
    log_info "启动服务"
    log_info "=========================================="
    
    # 创建日志目录
    mkdir -p logs
    
    # 启动后端服务
    log_info "启动后端服务 (端口 8000)..."
    cd uni-api
    source .venv/bin/activate
    nohup python main.py > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid
    cd ..
    log_success "后端服务已启动 (PID: $BACKEND_PID)"
    
    # 等待后端启动
    sleep 3
    
    # 启动前端服务
    log_info "启动前端服务 (端口 3000)..."
    cd web
    if [ -f "pnpm-lock.yaml" ]; then
        nohup pnpm dev > ../logs/frontend.log 2>&1 &
    else
        nohup npm run dev > ../logs/frontend.log 2>&1 &
    fi
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    cd ..
    log_success "前端服务已启动 (PID: $FRONTEND_PID)"
    
    # 等待服务完全启动
    log_info "等待服务启动..."
    sleep 5
    
    # 检查服务状态
    log_info "检查服务状态..."
    
    if curl -s http://localhost:8000/v1/models > /dev/null 2>&1; then
        log_success "后端服务运行正常 ✓"
    else
        log_warning "后端服务可能未正常启动，请检查日志: logs/backend.log"
    fi
    
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log_success "前端服务运行正常 ✓"
    else
        log_warning "前端服务可能未正常启动，请检查日志: logs/frontend.log"
    fi
}

# 显示服务信息
show_info() {
    echo ""
    log_success "=========================================="
    log_success "🎉 所有服务已启动！"
    log_success "=========================================="
    echo ""
    echo -e "${GREEN}后端服务:${NC} http://localhost:8000"
    echo -e "${GREEN}前端服务:${NC} http://localhost:3000"
    echo ""
    echo -e "${YELLOW}日志文件:${NC}"
    echo -e "  后端: logs/backend.log"
    echo -e "  前端: logs/frontend.log"
    echo ""
    echo -e "${YELLOW}进程 PID:${NC}"
    echo -e "  后端: $(cat logs/backend.pid 2>/dev/null || echo '未知')"
    echo -e "  前端: $(cat logs/frontend.pid 2>/dev/null || echo '未知')"
    echo ""
    echo -e "${BLUE}停止服务:${NC}"
    echo -e "  ./stop-services.sh"
    echo ""
    echo -e "${BLUE}查看日志:${NC}"
    echo -e "  tail -f logs/backend.log"
    echo -e "  tail -f logs/frontend.log"
    echo ""
}

# 主函数
main() {
    echo ""
    log_info "=========================================="
    log_info "Uni-API 自动安装和启动脚本"
    log_info "=========================================="
    echo ""
    
    # 检测操作系统
    detect_os
    
    # 安装系统依赖
    if [[ "$OS" == "macos" ]]; then
        install_homebrew
    fi
    
    # 安装 Python 和 Node.js
    install_python
    install_nodejs
    
    # 安装项目依赖
    install_backend_deps
    install_frontend_deps
    
    # 检查配置
    check_config
    
    # 启动服务
    start_services
    
    # 显示信息
    show_info
}

# 运行主函数
main

