import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import yaml from "js-yaml"
import crypto from "crypto"

const API_YAML_PATH = process.env.API_YAML_PATH || "uni-api/api.yaml"

// 验证管理员权限
async function validateAdminKey(apiKey: string) {
  if (!fs.existsSync(API_YAML_PATH)) {
    throw new Error("配置文件未找到")
  }

  const yamlContent = fs.readFileSync(API_YAML_PATH, "utf8")
  const config = yaml.load(yamlContent) as any

  if (!config.api_keys || !Array.isArray(config.api_keys)) {
    throw new Error("配置文件格式错误")
  }

  const apiKeyConfig = config.api_keys.find((key: any) => key.api === apiKey)
  if (!apiKeyConfig) {
    throw new Error("无效的 API Key")
  }

  if (apiKeyConfig.role !== "admin") {
    throw new Error("权限不足，需要管理员权限")
  }

  return config
}

// 生成随机 API Key
function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32)
  const base64 = randomBytes.toString("base64").replace(/[+/=]/g, "")
  return `sk-${base64.substring(0, 48)}`
}

// GET - 获取所有用户 Keys
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")

    if (!apiKey) {
      return NextResponse.json({ error: "需要提供 API Key" }, { status: 400 })
    }

    const config = await validateAdminKey(apiKey)

    // 返回所有非管理员的 API Keys
    const userKeys = config.api_keys
      .filter((key: any) => !key.role || !key.role.includes("admin"))
      .map((key: any) => ({
        api: key.api,
        name: key.role || "",  // role 字段用作别名（非 admin 时）
        credits: key.preferences?.credits || 0,
        billing_mode: key.preferences?.billing_mode || "token",
        model: key.model || [],
        created_at: key.preferences?.created_at || new Date().toISOString(),
      }))

    return NextResponse.json({ keys: userKeys })
  } catch (error: any) {
    console.error("获取用户 Keys 失败:", error)
    return NextResponse.json({ error: error.message || "获取失败" }, { status: 500 })
  }
}

// POST - 创建新的用户 Key
export async function POST(request: NextRequest) {
  try {
    const { apiKey, alias, credits, billing_mode, models } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: "需要提供管理员 API Key" }, { status: 400 })
    }

    if (!alias) {
      return NextResponse.json({ error: "需要提供别名" }, { status: 400 })
    }

    const config = await validateAdminKey(apiKey)

    // 生成新的 API Key
    const newApiKey = generateApiKey()

    // 创建新的 Key 配置
    const newKeyConfig: any = {
      api: newApiKey,
      role: alias,  // role 字段用作别名（非 admin）
      model: models && models.length > 0 ? models : ["all"],
      preferences: {
        billing_mode: billing_mode || "token",
        credits: credits || 0,
        created_at: new Date().toISOString(),
      },
    }

    // 添加到配置
    config.api_keys.push(newKeyConfig)

    // 保存配置
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false,
    })

    fs.writeFileSync(API_YAML_PATH, yamlContent, "utf8")

    return NextResponse.json({
      success: true,
      key: {
        api: newApiKey,
        alias: alias,
        credits: credits || 0,
        billing_mode: billing_mode || "token",
        model: newKeyConfig.model,
        created_at: newKeyConfig.preferences.created_at,
      },
    })
  } catch (error: any) {
    console.error("创建用户 Key 失败:", error)
    return NextResponse.json({ error: error.message || "创建失败" }, { status: 500 })
  }
}

// PUT - 更新用户 Key
export async function PUT(request: NextRequest) {
  try {
    const { apiKey, targetKey, alias, credits, billing_mode, models } = await request.json()

    if (!apiKey || !targetKey) {
      return NextResponse.json({ error: "需要提供 API Key" }, { status: 400 })
    }

    const config = await validateAdminKey(apiKey)

    // 查找要更新的 Key
    const keyIndex = config.api_keys.findIndex((key: any) => key.api === targetKey)

    if (keyIndex === -1) {
      return NextResponse.json({ error: "未找到目标 Key" }, { status: 404 })
    }

    // 不允许修改管理员 Key
    if (config.api_keys[keyIndex].role && config.api_keys[keyIndex].role.includes("admin")) {
      return NextResponse.json({ error: "不能修改管理员 Key" }, { status: 403 })
    }

    // 更新配置
    if (alias !== undefined) {
      config.api_keys[keyIndex].role = alias  // role 字段用作别名
    }

    if (models !== undefined) {
      config.api_keys[keyIndex].model = models.length > 0 ? models : ["all"]
    }

    if (!config.api_keys[keyIndex].preferences) {
      config.api_keys[keyIndex].preferences = {}
    }

    if (credits !== undefined) {
      config.api_keys[keyIndex].preferences.credits = credits
    }

    if (billing_mode !== undefined) {
      config.api_keys[keyIndex].preferences.billing_mode = billing_mode
    }

    // 保存配置
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false,
    })

    fs.writeFileSync(API_YAML_PATH, yamlContent, "utf8")

    return NextResponse.json({
      success: true,
      key: {
        api: targetKey,
        alias: config.api_keys[keyIndex].role,  // role 字段用作别名
        credits: config.api_keys[keyIndex].preferences?.credits || 0,
        billing_mode: config.api_keys[keyIndex].preferences?.billing_mode || "token",
        model: config.api_keys[keyIndex].model,
      },
    })
  } catch (error: any) {
    console.error("更新用户 Key 失败:", error)
    return NextResponse.json({ error: error.message || "更新失败" }, { status: 500 })
  }
}

// DELETE - 删除用户 Key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")
    const targetKey = searchParams.get("targetKey")

    if (!apiKey || !targetKey) {
      return NextResponse.json({ error: "需要提供 API Key" }, { status: 400 })
    }

    const config = await validateAdminKey(apiKey)

    // 查找要删除的 Key
    const keyIndex = config.api_keys.findIndex((key: any) => key.api === targetKey)

    if (keyIndex === -1) {
      return NextResponse.json({ error: "未找到目标 Key" }, { status: 404 })
    }

    // 不允许删除管理员 Key
    if (config.api_keys[keyIndex].role && config.api_keys[keyIndex].role.includes("admin")) {
      return NextResponse.json({ error: "不能删除管理员 Key" }, { status: 403 })
    }

    // 删除 Key
    config.api_keys.splice(keyIndex, 1)

    // 保存配置
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false,
    })

    fs.writeFileSync(API_YAML_PATH, yamlContent, "utf8")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("删除用户 Key 失败:", error)
    return NextResponse.json({ error: error.message || "删除失败" }, { status: 500 })
  }
}

