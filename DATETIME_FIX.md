# 🔧 日期时间格式修复说明

## 问题描述

后端启动失败，错误信息：

```
AttributeError: 'SingleQuotedScalarString' object has no attribute 'astimezone'
```

### 错误原因

在 `api.yaml` 中，`created_at` 字段使用了带引号的字符串格式：

```yaml
created_at: '2025-10-01T21:05:36.347Z'  # ❌ 错误：带引号
```

uni-api 的代码期望 `created_at` 是一个日期时间对象，而不是字符串。当 YAML 解析器遇到带引号的值时，会将其解析为 `SingleQuotedScalarString` 对象，导致无法调用 `.astimezone()` 方法。

## 解决方案

### 1. 修复 `api.yaml` 中的日期格式

**修改前**:
```yaml
preferences:
  billing_mode: count
  credits: 11
  created_at: '2025-10-01T21:05:36.347Z'  # ❌ 带引号
```

**修改后**:
```yaml
preferences:
  billing_mode: count
  credits: 11
  created_at: 2025-10-01T21:05:36.347Z  # ✅ 不带引号
```

### 2. 修复 YAML 生成代码

在 `web/app/api/keys/manage/route.ts` 中，添加 YAML 选项防止自动加引号：

**修改前**:
```typescript
const yamlContent = yaml.dump(config, {
  indent: 2,
  lineWidth: -1,
  noRefs: true,
})
```

**修改后**:
```typescript
const yamlContent = yaml.dump(config, {
  indent: 2,
  lineWidth: -1,
  noRefs: true,
  quotingType: '"',
  forceQuotes: false,  // ✅ 防止自动加引号
})
```

## 修改的文件

### 1. `uni-api/api.yaml`

```yaml
api_keys:
  - api: sk-DkcWyQkwyoY35jXb75aRVGGJvpNGGiq4IM6BLIm88
    name: 测试用户
    model:
      - Claude-c/*
    preferences:
      billing_mode: count
      credits: 11
      created_at: 2025-10-01T21:05:36.347Z  # ✅ 移除引号
```

### 2. `web/app/api/keys/manage/route.ts`

修改了 3 处 `yaml.dump()` 调用：

1. **POST 请求** - 创建新 Key (第 105 行)
2. **PUT 请求** - 更新 Key (第 177 行)
3. **DELETE 请求** - 删除 Key (第 231 行)

所有位置都添加了：
```typescript
quotingType: '"',
forceQuotes: false,
```

## YAML 日期时间格式说明

### ✅ 正确的格式

YAML 支持 ISO 8601 日期时间格式，**不需要引号**：

```yaml
# 完整格式（带时区）
created_at: 2025-10-01T21:05:36.347Z

# 带时区偏移
created_at: 2025-10-01T21:05:36+08:00

# 不带毫秒
created_at: 2025-10-01T21:05:36Z

# 日期格式
created_at: 2025-10-01
```

### ❌ 错误的格式

```yaml
# 带单引号 - 会被解析为字符串
created_at: '2025-10-01T21:05:36.347Z'

# 带双引号 - 会被解析为字符串
created_at: "2025-10-01T21:05:36.347Z"
```

## js-yaml 库选项说明

### `quotingType`
- **类型**: `'"'` | `"'"`
- **说明**: 指定引号类型（双引号或单引号）
- **默认**: `'`

### `forceQuotes`
- **类型**: `boolean`
- **说明**: 是否强制为所有字符串添加引号
- **默认**: `false`
- **推荐**: `false`（让 YAML 自动判断）

### 其他常用选项

```typescript
yaml.dump(config, {
  indent: 2,              // 缩进空格数
  lineWidth: -1,          // 不限制行宽
  noRefs: true,           // 不使用引用
  quotingType: '"',       // 使用双引号
  forceQuotes: false,     // 不强制加引号
  sortKeys: false,        // 不排序键
  noCompatMode: false,    // YAML 1.2 兼容模式
})
```

## 测试验证

### 1. 检查后端启动

```bash
tail -f logs/backend.log
```

应该看到：
```
INFO:     Application startup complete.
```

### 2. 测试创建新 Key

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

### 3. 检查生成的 YAML

```bash
cat uni-api/api.yaml
```

应该看到：
```yaml
api_keys:
  - api: sk-xxx
    name: 新用户
    model:
      - Claude-c/*
    preferences:
      billing_mode: token
      credits: 100
      created_at: 2025-10-01T21:05:36.347Z  # ✅ 不带引号
```

### 4. 测试计费管理

1. 访问 http://localhost:3000
2. 进入"计费管理"页面
3. 应该能正常加载所有 Key 的计费信息

## 常见问题

### Q1: 为什么日期不能带引号？

A: uni-api 的代码期望 `created_at` 是一个 Python `datetime` 对象。当 YAML 解析器遇到不带引号的 ISO 8601 格式日期时，会自动将其解析为 `datetime` 对象。如果带引号，则会被解析为字符串。

### Q2: 如何确保新创建的 Key 不会有引号？

A: 在 `yaml.dump()` 时设置 `forceQuotes: false`，让 YAML 库自动判断是否需要引号。对于日期时间格式，YAML 会自动识别并不加引号。

### Q3: 已存在的 Key 怎么办？

A: 需要手动编辑 `api.yaml`，移除 `created_at` 字段的引号。

### Q4: 如何批量修复？

可以使用以下命令：

```bash
# 备份
cp uni-api/api.yaml uni-api/api.yaml.backup

# 移除 created_at 的引号
sed -i '' "s/created_at: '[^']*'/created_at: \$(echo \$0 | tr -d \"'\")/g" uni-api/api.yaml
```

或者手动编辑更安全。

## 相关错误

如果遇到类似错误：

```python
AttributeError: 'str' object has no attribute 'astimezone'
AttributeError: 'SingleQuotedScalarString' object has no attribute 'astimezone'
AttributeError: 'DoubleQuotedScalarString' object has no attribute 'astimezone'
```

都是因为日期字段被解析为字符串而不是日期对象。解决方法：移除引号。

## 总结

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 后端启动失败 | `created_at` 带引号 | 移除引号 |
| 新 Key 自动加引号 | `yaml.dump()` 默认行为 | 设置 `forceQuotes: false` |
| 计费管理加载失败 | 后端未启动 | 修复日期格式后重启 |

### 修复步骤

1. ✅ 修复 `api.yaml` 中的日期格式（移除引号）
2. ✅ 修复 `yaml.dump()` 配置（添加 `forceQuotes: false`）
3. ✅ 重启服务
4. ✅ 测试功能

---

**更新时间**: 2025-10-02  
**版本**: v1.1.1

