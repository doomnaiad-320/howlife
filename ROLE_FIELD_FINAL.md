# 🎯 Role 字段最终解决方案

## 问题发现

经过检查 uni-api 的源代码，发现：

1. ❌ **uni-api 不支持 `name` 字段** - 这是我之前的错误假设
2. ✅ **`role` 字段是正确的选择** - uni-api 原生支持
3. ✅ **`role` 可以是任意字符串** - 不仅限于 `admin`

## uni-api 的 Role 字段说明

根据 uni-api 的官方文档和源代码：

### Role 字段的作用

```yaml
api_keys:
  - api: sk-xxx
    role: admin  # 设置 API key 的别名，选填
```

**官方说明**：
> `role`: 设置 API key 的别名，选填。请求日志会显示该 API key 的别名。如果 role 为 admin，则仅有此 API key 可以请求 v1/stats,/v1/generate-api-key 端点。

### 源代码验证

在 `uni-api/main.py` 中：

```python
app.state.admin_api_key = []
for item in app.state.api_keys_db:
    if "admin" in item.get("role", ""):  # 检查 role 是否包含 "admin"
        app.state.admin_api_key.append(item.get("api"))
```

**关键发现**：
- ✅ `role` 可以是任意字符串（如 "张三"、"测试用户"）
- ✅ 只有包含 `"admin"` 的 `role` 才会被识别为管理员
- ✅ `role` 会显示在请求日志中

## 正确的配置格式

### ✅ 管理员 Key

```yaml
api_keys:
  - api: sk-Pkj60Yf8JFWxfgRmXQFWyGtWUddGZnmi3KlvowmRWpWpQxx
    role: admin  # 包含 "admin" 即为管理员
    model:
      - gpt-4o
      - claude-opus-4
```

### ✅ 普通用户 Key

```yaml
api_keys:
  - api: sk-xxx
    role: 张三  # ✅ 任意字符串，用作别名
    model:
      - Claude-c/*
    preferences:
      billing_mode: count
      credits: 100
      created_at: 2025-10-01T21:05:36.347Z
  
  - api: sk-yyy
    role: 测试用户  # ✅ 任意字符串
    model:
      - all
    preferences:
      billing_mode: token
      credits: 50
      created_at: 2025-10-01T21:05:36.347Z
```

### ❌ 错误的方式

```yaml
api_keys:
  - api: sk-xxx
    name: 张三  # ❌ uni-api 不支持 name 字段
    role: user  # ❌ 不要使用 "user"，直接用名字
```

## 修复内容

### 1. 后端 API (`web/app/api/keys/manage/route.ts`)

#### GET 请求 - 获取用户 Keys

```typescript
// 修复前
.filter((key: any) => key.role !== "admin")

// 修复后
.filter((key: any) => !key.role || !key.role.includes("admin"))
```

#### POST 请求 - 创建新 Key

```typescript
const newKeyConfig: any = {
  api: newApiKey,
  role: alias,  // ✅ 直接使用 role 字段
  model: models && models.length > 0 ? models : ["all"],
  preferences: {
    billing_mode: billing_mode || "token",
    credits: credits || 0,
    created_at: new Date().toISOString(),
  },
}
```

#### PUT 请求 - 更新 Key

```typescript
// 检查是否为管理员
if (config.api_keys[keyIndex].role && config.api_keys[keyIndex].role.includes("admin")) {
  return NextResponse.json({ error: "不能修改管理员 Key" }, { status: 403 })
}

// 更新 role
if (alias !== undefined) {
  config.api_keys[keyIndex].role = alias
}
```

#### DELETE 请求 - 删除 Key

```typescript
// 检查是否为管理员
if (config.api_keys[keyIndex].role && config.api_keys[keyIndex].role.includes("admin")) {
  return NextResponse.json({ error: "不能删除管理员 Key" }, { status: 403 })
}
```

### 2. 配置文件 (`uni-api/api.yaml`)

```yaml
api_keys:
  - api: sk-Pkj60Yf8JFWxfgRmXQFWyGtWUddGZnmi3KlvowmRWpWpQxx
    role: admin
  
  - api: sk-pkhf60Yf0JGyJxgRmXqFQyTgWUd9GZnmi3KlvowmRWpWqrhy
    role: 用户1  # ✅ 使用 role 字段
    model:
      - Claude-c/*
    preferences:
      billing_mode: count
      credits: 10
      created_at: 2023-12-31T16:00:00.000Z
  
  - api: sk-DkcWyQkwyoY35jXb75aRVGGJvpNGGiq4IM6BLIm88
    role: 测试用户  # ✅ 使用 role 字段
    model:
      - Claude-c/*
    preferences:
      billing_mode: count
      credits: 11
      created_at: 2025-10-01T21:05:36.347Z
```

## Role 字段的优势

### ✅ 原生支持

- uni-api 原生支持 `role` 字段
- 会显示在请求日志中
- 不需要额外的代码处理

### ✅ 灵活性

```yaml
# 可以使用任意字符串
role: 张三
role: 测试用户
role: 开发团队
role: 客户A
role: admin  # 特殊：管理员
```

### ✅ 权限控制

```python
# uni-api 源代码
if "admin" in item.get("role", ""):
    # 这是管理员
```

只要 `role` 包含 `"admin"`，就会被识别为管理员。

## 常见问题

### Q1: 可以使用 `role: user` 吗？

A: 可以，但不推荐。建议直接使用用户名称，如 `role: 张三`，这样更直观。

### Q2: `role` 字段是必填的吗？

A: 不是必填的。如果不设置 `role`，该 Key 就是普通用户，不会显示别名。

### Q3: 如何区分管理员和普通用户？

A: 
- 管理员：`role` 包含 `"admin"`（如 `role: admin`）
- 普通用户：`role` 不包含 `"admin"`（如 `role: 张三`）或不设置 `role`

### Q4: 可以有多个管理员吗？

A: 可以！所有 `role` 包含 `"admin"` 的 Key 都是管理员。

```yaml
api_keys:
  - api: sk-xxx
    role: admin
  
  - api: sk-yyy
    role: super-admin  # ✅ 也是管理员（包含 "admin"）
  
  - api: sk-zzz
    role: administrator  # ✅ 也是管理员（包含 "admin"）
```

### Q5: 之前创建的使用 `name` 字段的 Key 怎么办？

A: 需要手动修改 `api.yaml`，将 `name` 改为 `role`：

```yaml
# 修改前
- api: sk-xxx
  name: 张三  # ❌

# 修改后
- api: sk-xxx
  role: 张三  # ✅
```

## 测试验证

### 1. 创建新用户 Key

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
    role: 新用户  # ✅ 使用 role 字段
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
2. 应该能看到所有 Key 的名称（来自 `role` 字段）
3. 创建、编辑、删除功能正常

## 总结

| 字段 | 用途 | 示例 | 说明 |
|------|------|------|------|
| `role` | 用户别名 + 权限标识 | `张三` / `admin` | ✅ uni-api 原生支持 |
| `name` | ❌ 不支持 | - | uni-api 不识别此字段 |
| `model` | 模型权限 | `["Claude-c/*"]` | 该 Key 可访问的模型 |
| `preferences.billing_mode` | 计费模式 | `token` / `count` | Token 计费或次数计费 |
| `preferences.credits` | 余额 | `100` | 可用余额 |

### 关键要点

1. ✅ **使用 `role` 字段**作为用户别名
2. ✅ **`role` 可以是任意字符串**（如 "张三"、"测试用户"）
3. ✅ **只有包含 `"admin"` 的 `role` 才是管理员**
4. ❌ **不要使用 `name` 字段**（uni-api 不支持）
5. ✅ **日期时间不要加引号**（避免解析错误）

---

**更新时间**: 2025-10-02  
**版本**: v1.2.0 (最终版本)

