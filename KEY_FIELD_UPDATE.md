# 🔧 用户 Key 字段更新说明

## 问题描述

使用 `role` 字段作为用户别名会导致以下问题：

1. ❌ **计费管理加载失败**: `role` 字段在 uni-api 中有特殊含义（admin/user），不应该用作别名
2. ❌ **权限混淆**: 将别名存储在 `role` 字段会导致权限识别错误
3. ❌ **配置不规范**: 不符合 uni-api 的标准配置格式

## 解决方案

使用独立的 `name` 字段来存储用户 Key 的名称/别名。

### 配置格式对比

#### ❌ 错误的方式（使用 role）

```yaml
api_keys:
  - api: sk-xxx
    role: 张三  # ❌ 错误：role 应该只用于 admin
    model:
      - Claude-c/*
    preferences:
      billing_mode: count
      credits: 10
```

#### ✅ 正确的方式（使用 name）

```yaml
api_keys:
  - api: sk-Pkj60Yf8JFWxfgRmXQFWyGtWUddGZnmi3KlvowmRWpWpQxx
    role: admin  # ✅ 管理员 Key
  
  - api: sk-xxx
    name: 张三  # ✅ 正确：使用 name 字段作为名称
    model:
      - Claude-c/*
    preferences:
      billing_mode: count
      credits: 10
      created_at: 2025-10-01T21:05:36.347Z
```

## 字段说明

### `role` 字段
- **用途**: 仅用于标识管理员权限
- **可选值**: `admin` 或不设置
- **说明**: 如果设置为 `admin`，该 Key 拥有管理员权限；否则为普通用户

### `name` 字段
- **用途**: 用户 Key 的名称/别名
- **类型**: 字符串
- **说明**: 用于在管理界面中识别不同的用户，不影响权限

### `model` 字段
- **用途**: 该 Key 可以访问的模型列表
- **格式**: 
  - `["all"]` - 访问所有模型
  - `["Claude-c/*"]` - 访问 Claude-c provider 的所有模型
  - `["gpt-4", "claude-opus-4"]` - 访问指定模型

### `preferences` 字段
- **billing_mode**: 计费模式（`token` 或 `count`）
- **credits**: 余额
- **created_at**: 创建时间

## 修改内容

### 后端 API (`web/app/api/keys/manage/route.ts`)

1. **GET 请求** - 获取用户 Keys:
```typescript
// 修改前
alias: key.role || ""

// 修改后
name: key.name || ""
```

2. **POST 请求** - 创建新 Key:
```typescript
// 修改前
const newKeyConfig: any = {
  api: newApiKey,
  role: alias,  // ❌
  ...
}

// 修改后
const newKeyConfig: any = {
  api: newApiKey,
  name: alias,  // ✅
  ...
}
```

3. **PUT 请求** - 更新 Key:
```typescript
// 修改前
config.api_keys[keyIndex].role = alias

// 修改后
config.api_keys[keyIndex].name = alias
```

### 前端页面 (`web/app/keys/page.tsx`)

1. **接口定义**:
```typescript
interface UserKey {
  api: string
  name: string  // 改为 name
  credits: number
  billing_mode: string
  model: string[]
  created_at: string
}
```

2. **UI 文本更新**:
- 表头: "别名" → "名称"
- 表单标签: "别名 *" → "名称 *"
- 占位符: "例如：张三的Key" → "例如：张三"
- 添加说明: "用于识别此 Key 的名称，不会影响权限"

### 配置文件 (`uni-api/api.yaml`)

修复已存在的 Key，添加 `name` 字段：

```yaml
api_keys:
  - api: sk-Pkj60Yf8JFWxfgRmXQFWyGtWUddGZnmi3KlvowmRWpWpQxx
    role: admin
  
  - api: sk-pkhf60Yf0JGyJxgRmXqFQyTgWUd9GZnmi3KlvowmRWpWqrhy
    name: 用户1  # ✅ 添加 name 字段
    model:
      - Claude-c/*
    preferences:
      billing_mode: count
      credits: 10
      created_at: 2023-12-31T16:00:00.000Z
  
  - api: sk-DkcWyQkwyoY35jXb75aRVGGJvpNGGiq4IM6BLIm88
    name: 测试用户  # ✅ 添加 name 字段
    model:
      - Claude-c/*
    preferences:
      billing_mode: count
      credits: 11
      created_at: '2025-10-01T21:05:36.347Z'
```

## 影响范围

### ✅ 修复的问题

1. ✅ **计费管理正常加载**: 不再因为 `role` 字段混淆导致加载失败
2. ✅ **权限识别正确**: `role` 字段只用于 admin 标识
3. ✅ **配置更规范**: 符合 uni-api 的标准格式
4. ✅ **语义更清晰**: `name` 字段明确表示用户名称

### 📝 需要注意

1. **已存在的 Key**: 需要手动在 `api.yaml` 中添加 `name` 字段
2. **新创建的 Key**: 会自动使用 `name` 字段
3. **向后兼容**: 如果没有 `name` 字段，会显示为"未命名"

## 测试验证

### 1. 创建新 Key

```bash
curl -X POST http://localhost:3000/api/keys/manage \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "sk-Pkj60Yf8JFWxfgRmXQFWyGtWUddGZnmi3KlvowmRWpWpQxx",
    "alias": "新用户",
    "credits": 100,
    "billing_mode": "token",
    "models": ["Claude-c/*"]
  }'
```

### 2. 检查生成的配置

```bash
cat uni-api/api.yaml
```

应该看到：

```yaml
api_keys:
  - api: sk-新生成的Key
    name: 新用户  # ✅ 使用 name 字段
    model:
      - Claude-c/*
    preferences:
      billing_mode: token
      credits: 100
      created_at: 2025-10-01T21:05:36.347Z
```

### 3. 测试计费管理

1. 访问 http://localhost:3000
2. 进入"计费管理"页面
3. 应该能正常加载所有 Key 的计费信息

### 4. 测试 Key 管理

1. 进入"用户 Key 管理"页面
2. 应该能看到所有 Key 的名称
3. 创建、编辑、删除功能正常

## 迁移指南

如果你有已存在的使用 `role` 作为别名的 Key，需要手动迁移：

### 步骤 1: 备份配置

```bash
cp uni-api/api.yaml uni-api/api.yaml.backup
```

### 步骤 2: 修改配置

编辑 `uni-api/api.yaml`，将所有非 admin 的 Key 的 `role` 字段改为 `name`:

```yaml
# 修改前
- api: sk-xxx
  role: 张三  # ❌
  model: [...]

# 修改后
- api: sk-xxx
  name: 张三  # ✅
  model: [...]
```

### 步骤 3: 重启服务

```bash
./restart-services.sh
```

### 步骤 4: 验证

访问前端页面，检查：
- ✅ 计费管理页面正常加载
- ✅ Key 管理页面显示正确的名称
- ✅ 所有功能正常工作

## 总结

| 字段 | 用途 | 示例 | 说明 |
|------|------|------|------|
| `role` | 权限标识 | `admin` | 仅用于标识管理员 |
| `name` | 用户名称 | `张三` | 用于识别用户，不影响权限 |
| `model` | 模型权限 | `["Claude-c/*"]` | 该 Key 可访问的模型 |
| `preferences.billing_mode` | 计费模式 | `token` / `count` | Token 计费或次数计费 |
| `preferences.credits` | 余额 | `100` | 可用余额 |

---

**更新时间**: 2025-10-01  
**版本**: v1.1.0

