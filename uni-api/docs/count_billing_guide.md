# 次数计费功能使用指南

## 概述

次数计费功能允许您按API请求次数而不是token数量来计费。这对于某些使用场景更加公平和透明，特别是当您的应用主要关心请求次数而不是token消耗时。

## 功能特性

- **灵活计费模式**: 支持纯token计费、纯次数计费和混合计费
- **模型特定价格**: 可为不同模型设置不同的次数价格
- **实时监控**: 通过Web界面实时查看次数使用情况
- **余额管理**: 支持次数余额充值和管理
- **向后兼容**: 完全兼容现有的token计费系统

## 配置说明

### 1. 基础配置

在 `api.yaml` 中配置次数计费：

```yaml
preferences:
  # 启用次数计费功能
  count_billing:
    enabled: true
    default_count_price: 0.001  # 默认每次请求价格（美元）
    model_count_prices:
      gpt-4: 0.01
      gpt-4o: 0.008
      claude-3: 0.005
      claude-opus: 0.015
      gemini: 0.003
      default: 0.001

  # 模型价格配置（支持混合计费）
  model_price:
    # 纯token计费
    claude-3-5-sonnet: 0.12,0.48
    
    # 纯次数计费
    gpt-4o-mini: 0.001
    
    # 混合计费（同时支持token和次数）
    gpt-4o:
      token_price: 1,2
      count_price: 0.01
    
    default: 1,2
```

### 2. API密钥配置

为API密钥设置计费模式：

```yaml
api_keys:
  # Token计费用户
  - api: sk-token-user-key
    preferences:
      billing_mode: token
      credits: 10.0
      created_at: 2024-01-01T00:00:00+08:00

  # 次数计费用户
  - api: sk-count-user-key
    preferences:
      billing_mode: count
      count_credits: 1000  # 1000次请求
      created_at: 2024-01-01T00:00:00+08:00

  # 混合计费用户
  - api: sk-hybrid-user-key
    preferences:
      billing_mode: hybrid
      credits: 5.0        # token计费余额
      count_credits: 500  # 次数计费余额
      created_at: 2024-01-01T00:00:00+08:00
```

## API接口

### 1. 查看API密钥状态

```bash
curl -X GET "http://localhost:8000/v1/api_keys_states" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

响应示例：
```json
{
  "api_keys_states": {
    "sk-count-user-key": {
      "billing_mode": "count",
      "credits": -1,
      "count_credits": 1000,
      "total_cost": 0.05,
      "enabled": true,
      "cost_details": {
        "billing_details": [
          {
            "model": "gpt-4o",
            "cost": 0.05,
            "cost_type": "count",
            "request_count": 5
          }
        ]
      }
    }
  }
}
```

### 2. 添加次数余额

```bash
curl -X POST "http://localhost:8000/v1/add_count_credits?paid_key=sk-count-user-key&amount=100" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

### 3. 设置计费模式

```bash
curl -X POST "http://localhost:8000/v1/set_billing_mode?paid_key=sk-user-key&billing_mode=count" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

### 4. 查看使用统计

```bash
curl -X GET "http://localhost:8000/v1/token_usage?api_key_param=sk-count-user-key" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY"
```

## Web界面使用

### 1. 计费管理

1. 使用管理员API密钥登录Web界面
2. 点击"计费管理"选项卡
3. 选择要管理的API密钥
4. 查看当前计费模式和余额状态
5. 添加次数或设置计费模式

### 2. 统计查看

在"统计信息"页面可以看到：
- 总请求次数
- 剩余次数（次数计费用户）
- 已使用次数
- 计费详情

## 计费逻辑说明

### Token计费
- 基于输入和输出token数量计费
- 价格格式：`"输入价格,输出价格"`（美元/百万token）
- 适合token消耗差异较大的场景

### 次数计费
- 每次API请求固定费用
- 不考虑token数量
- 适合请求频率稳定的场景

### 混合计费
- 优先使用次数计费（如果配置了count_price）
- 回退到token计费（如果没有count_price）
- 灵活适应不同模型的计费需求

## 最佳实践

1. **选择合适的计费模式**
   - 高频小请求：使用次数计费
   - 大文本处理：使用token计费
   - 多样化需求：使用混合计费

2. **价格设置建议**
   - 根据模型成本和使用模式设置合理价格
   - 考虑用户接受度和竞争力
   - 定期评估和调整价格策略

3. **监控和管理**
   - 定期检查用户余额和使用情况
   - 设置合理的余额预警机制
   - 及时处理用户充值和计费问题

## 故障排除

### 常见问题

1. **次数计费不生效**
   - 检查 `count_billing.enabled` 是否为 true
   - 确认API密钥的 `billing_mode` 设置正确
   - 验证模型价格配置

2. **余额计算错误**
   - 检查 `created_at` 时间设置
   - 确认价格配置格式正确
   - 查看后端日志获取详细错误信息

3. **Web界面显示异常**
   - 确认后端API正常运行
   - 检查网络连接和API密钥权限
   - 查看浏览器控制台错误信息

### 调试方法

1. 查看后端日志：
```bash
docker logs uniapi
```

2. 测试计费计算：
```bash
cd uni-api
python3 test/test_count_billing.py
```

3. 验证API响应：
```bash
curl -X GET "http://localhost:8000/v1/api_keys_states" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" | jq
```
