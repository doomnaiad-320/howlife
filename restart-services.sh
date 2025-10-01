#!/bin/bash

# ============================================
# Uni-API 重启服务脚本
# ============================================

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}[INFO]${NC} 重启 Uni-API 服务..."
echo ""

# 停止服务
./stop-services.sh

# 等待一下
sleep 2

# 启动服务
echo ""
echo -e "${BLUE}[INFO]${NC} 启动服务..."
echo ""

# 创建日志目录
mkdir -p logs

# 启动后端服务
echo -e "${BLUE}[INFO]${NC} 启动后端服务 (端口 8000)..."
cd uni-api
source .venv/bin/activate
nohup python main.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
cd ..
echo -e "${GREEN}[SUCCESS]${NC} 后端服务已启动 (PID: $BACKEND_PID)"

# 等待后端启动
sleep 3

# 启动前端服务
echo -e "${BLUE}[INFO]${NC} 启动前端服务 (端口 3000)..."
cd web
if [ -f "pnpm-lock.yaml" ]; then
    nohup pnpm dev > ../logs/frontend.log 2>&1 &
else
    nohup npm run dev > ../logs/frontend.log 2>&1 &
fi
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
cd ..
echo -e "${GREEN}[SUCCESS]${NC} 前端服务已启动 (PID: $FRONTEND_PID)"

# 等待服务完全启动
sleep 5

echo ""
echo -e "${GREEN}[SUCCESS]${NC} =========================================="
echo -e "${GREEN}[SUCCESS]${NC} 🎉 服务重启完成！"
echo -e "${GREEN}[SUCCESS]${NC} =========================================="
echo ""
echo -e "${GREEN}后端服务:${NC} http://localhost:8000"
echo -e "${GREEN}前端服务:${NC} http://localhost:3000"
echo ""

