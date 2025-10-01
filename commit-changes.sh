#!/bin/bash

# ============================================
# Git 提交脚本
# ============================================

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}=========================================="
echo -e "准备提交更改到 Git"
echo -e "==========================================${NC}"
echo ""

# 显示当前状态
echo -e "${BLUE}[INFO]${NC} 当前 Git 状态："
git status

echo ""
read -p "是否要提交这些更改？(y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 添加所有新文件和修改
    echo -e "${BLUE}[INFO]${NC} 添加文件到暂存区..."
    git add .gitignore
    git add SETUP_README.md
    git add VERSION
    git add README.md
    git add setup-and-start.sh
    git add stop-services.sh
    git add restart-services.sh
    git add view-logs.sh
    git add commit-changes.sh
    
    # 提交
    echo -e "${BLUE}[INFO]${NC} 提交更改..."
    git commit -m "feat: 添加一键安装脚本和更新仓库地址

- 添加自动安装和启动脚本 (setup-and-start.sh)
- 添加服务管理脚本 (stop/restart/view-logs)
- 更新 README.md，添加仓库地址和一键安装说明
- 添加详细的安装指南 (SETUP_README.md)
- 更新 git remote 地址为 https://github.com/doomnaiad-320/howlife.git
- 添加 .gitignore 文件
- 添加版本信息文件"
    
    echo ""
    echo -e "${GREEN}[SUCCESS]${NC} 提交完成！"
    echo ""
    echo -e "${YELLOW}下一步：${NC}"
    echo "  git push origin main"
    echo ""
else
    echo -e "${YELLOW}[INFO]${NC} 取消提交"
fi

