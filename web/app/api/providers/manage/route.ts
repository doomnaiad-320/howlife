import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import yaml from "js-yaml"

const API_YAML_PATH = process.env.API_YAML_PATH || "uni-api/api.yaml"

// 验证 API Key 权限
async function validateApiKey(apiKey: string) {
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

  // 检查是否有管理员权限
  if (apiKeyConfig.role !== "admin") {
    throw new Error("权限不足，需要管理员权限")
  }

  return config
}

// 验证 Provider 配置
function validateProviderConfig(provider: any) {
  const errors: string[] = []

  if (!provider.provider || typeof provider.provider !== "string") {
    errors.push("Provider 名称是必填项")
  }

  if (!provider.base_url || typeof provider.base_url !== "string") {
    errors.push("Base URL 是必填项")
  }

  if (!provider.api || typeof provider.api !== "string") {
    errors.push("API Key 是必填项")
  }

  // 验证 base_url 格式
  if (provider.base_url) {
    try {
      new URL(provider.base_url)
    } catch {
      errors.push("Base URL 格式无效")
    }
  }

  return errors
}

// GET - 获取所有 providers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 })
    }

    const config = await validateApiKey(apiKey)

    const providers = config.providers || []
    const providersWithPricing = providers.map((provider: any) => {
      // 获取模型价格配置
      const modelPrices: any = {}
      const globalModelPrice = config.preferences?.model_price || {}
      const countBilling = config.preferences?.count_billing || {}

      if (provider.model && Array.isArray(provider.model)) {
        provider.model.forEach((modelEntry: any) => {
          let modelName = ""
          let originalName = ""

          if (typeof modelEntry === "string") {
            modelName = modelEntry
            originalName = modelEntry
          } else if (typeof modelEntry === "object") {
            const [original, display] = Object.entries(modelEntry)[0]
            originalName = original as string
            modelName = display as string
          }

          if (modelName) {
            // 获取 token 价格
            const tokenPrice = globalModelPrice[modelName] || globalModelPrice.default || "1,2"

            // 获取次数价格
            const countPrice = countBilling.model_count_prices?.[modelName] || countBilling.default_count_price || 0.001

            modelPrices[modelName] = {
              tokenPrice,
              countPrice,
              originalName // 添加原始名称用于映射
            }
          }
        })
      }

      return {
        ...provider,
        modelPrices
      }
    })

    return NextResponse.json({ providers: providersWithPricing })
  } catch (error: any) {
    console.error("Error fetching providers:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - 添加新 provider
export async function POST(request: NextRequest) {
  try {
    const { apiKey, provider } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 })
    }

    const config = await validateApiKey(apiKey)

    // 验证 provider 配置
    const validationErrors = validateProviderConfig(provider)
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(", ") }, { status: 400 })
    }

    // 检查 provider 名称是否已存在
    const existingProvider = config.providers?.find((p: any) => p.provider === provider.provider)
    if (existingProvider) {
      return NextResponse.json({ error: "Provider 名称已存在" }, { status: 400 })
    }

    // 添加新 provider
    if (!config.providers) {
      config.providers = []
    }

    const newProvider = {
      provider: provider.provider,
      base_url: provider.base_url,
      api: provider.api,
      ...(provider.model && { model: provider.model })
    }

    config.providers.push(newProvider)

    // 更新模型价格配置
    if (provider.modelPrices) {
      if (!config.preferences) {
        config.preferences = {}
      }
      if (!config.preferences.model_price) {
        config.preferences.model_price = {}
      }
      if (!config.preferences.count_billing) {
        config.preferences.count_billing = {
          enabled: true,
          default_count_price: 0.001,
          model_count_prices: {}
        }
      }

      Object.entries(provider.modelPrices).forEach(([modelName, prices]: [string, any]) => {
        // 智能计费模式选择逻辑
        if (prices.countPrice > 0) {
          // 次数计费模式：次数价格 > 0
          config.preferences.count_billing.model_count_prices[modelName] = prices.countPrice
          // 同时保留token价格作为备用
          if (prices.tokenPrice) {
            config.preferences.model_price[modelName] = prices.tokenPrice
          }
        } else if (prices.tokenPrice) {
          // Token计费模式：次数价格为0，只使用token价格
          config.preferences.model_price[modelName] = prices.tokenPrice
          // 确保次数价格不存在或为0
          if (config.preferences.count_billing.model_count_prices[modelName]) {
            delete config.preferences.count_billing.model_count_prices[modelName]
          }
        }
      })
    }

    // 保存配置文件
    const yamlContent = yaml.dump(config, { 
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    })
    fs.writeFileSync(API_YAML_PATH, yamlContent, "utf8")

    return NextResponse.json({
      success: true,
      message: "Provider 添加成功",
      provider: newProvider
    })
  } catch (error: any) {
    console.error("Error adding provider:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - 更新 provider
export async function PUT(request: NextRequest) {
  try {
    const { apiKey, originalProvider, provider } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 })
    }

    const config = await validateApiKey(apiKey)

    // 验证 provider 配置
    const validationErrors = validateProviderConfig(provider)
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: validationErrors.join(", ") }, { status: 400 })
    }

    // 查找要更新的 provider
    const providerIndex = config.providers?.findIndex((p: any) => p.provider === originalProvider)
    if (providerIndex === -1) {
      return NextResponse.json({ error: "Provider 不存在" }, { status: 404 })
    }

    // 如果更改了 provider 名称，检查新名称是否已存在
    if (provider.provider !== originalProvider) {
      const existingProvider = config.providers?.find((p: any) => p.provider === provider.provider)
      if (existingProvider) {
        return NextResponse.json({ error: "Provider 名称已存在" }, { status: 400 })
      }
    }

    // 更新 provider
    const updatedProvider = {
      provider: provider.provider,
      base_url: provider.base_url,
      api: provider.api,
      ...(provider.model && { model: provider.model })
    }

    config.providers[providerIndex] = updatedProvider

    // 更新模型价格配置
    if (provider.modelPrices) {
      if (!config.preferences) {
        config.preferences = {}
      }
      if (!config.preferences.model_price) {
        config.preferences.model_price = {}
      }
      if (!config.preferences.count_billing) {
        config.preferences.count_billing = {
          enabled: true,
          default_count_price: 0.001,
          model_count_prices: {}
        }
      }

      Object.entries(provider.modelPrices).forEach(([modelName, prices]: [string, any]) => {
        // 智能计费模式选择逻辑
        if (prices.countPrice > 0) {
          // 次数计费模式：次数价格 > 0
          config.preferences.count_billing.model_count_prices[modelName] = prices.countPrice
          // 同时保留token价格作为备用
          if (prices.tokenPrice) {
            config.preferences.model_price[modelName] = prices.tokenPrice
          }
        } else if (prices.tokenPrice) {
          // Token计费模式：次数价格为0，只使用token价格
          config.preferences.model_price[modelName] = prices.tokenPrice
          // 确保次数价格不存在或为0
          if (config.preferences.count_billing.model_count_prices[modelName]) {
            delete config.preferences.count_billing.model_count_prices[modelName]
          }
        }
      })
    }

    // 保存配置文件
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    })
    fs.writeFileSync(API_YAML_PATH, yamlContent, "utf8")

    return NextResponse.json({
      success: true,
      message: "Provider 更新成功",
      provider: updatedProvider
    })
  } catch (error: any) {
    console.error("Error updating provider:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - 删除 provider
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")
    const providerName = searchParams.get("provider")

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 })
    }

    if (!providerName) {
      return NextResponse.json({ error: "Provider name is required" }, { status: 400 })
    }

    const config = await validateApiKey(apiKey)

    // 查找要删除的 provider
    const providerIndex = config.providers?.findIndex((p: any) => p.provider === providerName)
    if (providerIndex === -1) {
      return NextResponse.json({ error: "Provider 不存在" }, { status: 404 })
    }

    // 删除 provider
    config.providers.splice(providerIndex, 1)

    // 保存配置文件
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    })
    fs.writeFileSync(API_YAML_PATH, yamlContent, "utf8")

    return NextResponse.json({
      success: true,
      message: "Provider 删除成功"
    })
  } catch (error: any) {
    console.error("Error deleting provider:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
