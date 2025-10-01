#!/bin/bash

# ============================================
# 环境配置脚本
# 自动生成 .env.local 文件
# ============================================

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo ""
log_info "=========================================="
log_info "配置环境变量"
log_info "=========================================="
echo ""

# 获取项目根目录的绝对路径
PROJECT_ROOT=$(cd "$(dirname "$0")" && pwd)

log_info "项目根目录: $PROJECT_ROOT"

# 配置文件路径
ENV_FILE="$PROJECT_ROOT/web/.env.local"

# 创建 .env.local 文件
log_info "创建 web/.env.local 文件..."

cat > "$ENV_FILE" << EOF
# Uni-API 环境配置
# 自动生成于 $(date)

# 数据库路径
STATS_DB_PATH=$PROJECT_ROOT/uni-api/data/stats.db

# API 配置文件路径
API_YAML_PATH=$PROJECT_ROOT/uni-api/api.yaml

# 数据库类型 (sqlite 或 postgres)
STATS_DB_TYPE=sqlite

# 如果使用 PostgreSQL，取消注释以下配置
# STATS_DB_TYPE=postgres
# STATS_DB_HOST=localhost
# STATS_DB_PORT=5432
# STATS_DB_NAME=uniapi
# STATS_DB_USER=postgres
# STATS_DB_PASSWORD=your_password

# Node 环境
NODE_ENV=production

# 前端端口
PORT=3000
EOF

log_success "环境配置文件已创建: $ENV_FILE"

echo ""
log_info "配置内容："
echo "----------------------------------------"
cat "$ENV_FILE"
echo "----------------------------------------"
echo ""

# 确保数据目录存在
log_info "检查数据目录..."
mkdir -p "$PROJECT_ROOT/uni-api/data"
log_success "数据目录已就绪"

echo ""
log_success "=========================================="
log_success "✅ 环境配置完成！"
log_success "=========================================="
echo ""
echo -e "${YELLOW}配置信息：${NC}"
echo "  项目根目录: $PROJECT_ROOT"
echo "  配置文件: $ENV_FILE"
echo "  数据库路径: $PROJECT_ROOT/uni-api/data/stats.db"
echo "  API配置: $PROJECT_ROOT/uni-api/api.yaml"
echo ""

