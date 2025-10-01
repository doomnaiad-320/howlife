#!/bin/bash

# ============================================
# Uni-API 查看日志脚本
# ============================================

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}=========================================="
echo -e "Uni-API 日志查看器"
echo -e "==========================================${NC}"
echo ""
echo "请选择要查看的日志："
echo ""
echo "  1) 后端日志 (实时)"
echo "  2) 前端日志 (实时)"
echo "  3) 后端日志 (最后100行)"
echo "  4) 前端日志 (最后100行)"
echo "  5) 同时查看两个日志 (实时)"
echo "  6) 退出"
echo ""
read -p "请输入选项 (1-6): " choice

case $choice in
    1)
        echo -e "${GREEN}查看后端日志 (按 Ctrl+C 退出)${NC}"
        tail -f logs/backend.log
        ;;
    2)
        echo -e "${GREEN}查看前端日志 (按 Ctrl+C 退出)${NC}"
        tail -f logs/frontend.log
        ;;
    3)
        echo -e "${GREEN}后端日志 (最后100行)${NC}"
        tail -n 100 logs/backend.log
        ;;
    4)
        echo -e "${GREEN}前端日志 (最后100行)${NC}"
        tail -n 100 logs/frontend.log
        ;;
    5)
        echo -e "${GREEN}同时查看两个日志 (按 Ctrl+C 退出)${NC}"
        tail -f logs/backend.log logs/frontend.log
        ;;
    6)
        echo "退出"
        exit 0
        ;;
    *)
        echo -e "${YELLOW}无效的选项${NC}"
        exit 1
        ;;
esac

