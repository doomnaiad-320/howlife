import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import yaml from "js-yaml"

export async function POST(request: NextRequest) {
  try {
    const { apiKey, provider, base_url, api, model } = await request.json()

    if (!apiKey || !provider || !base_url || !api) {
      return NextResponse.json(
        {
          success: false,
          message: "缺少必要参数",
        },
        { status: 400 },
      )
    }

    // Validate API key first
    const apiYamlPath = process.env.API_YAML_PATH || "/app/data/api.yaml"

    if (!fs.existsSync(apiYamlPath)) {
      return NextResponse.json(
        {
          success: false,
          message: "配置文件未找到",
        },
        { status: 500 },
      )
    }

    const yamlContent = fs.readFileSync(apiYamlPath, "utf8")
    const config = yaml.load(yamlContent) as any

    if (!config.api_keys || !Array.isArray(config.api_keys)) {
      return NextResponse.json(
        {
          success: false,
          message: "配置文件格式错误",
        },
        { status: 500 },
      )
    }

    const keyEntry = config.api_keys.find((entry: any) => entry.api === apiKey)

    if (!keyEntry) {
      return NextResponse.json(
        {
          success: false,
          message: "未授权",
        },
        { status: 403 },
      )
    }

    // 首先测试 /v1/models 端点获取可用模型
    let modelsUrl = base_url
    if (!modelsUrl.endsWith('/')) {
      modelsUrl += '/'
    }

    // 处理不同的 base_url 格式
    if (modelsUrl.includes('/chat/completions')) {
      modelsUrl = modelsUrl.replace('/chat/completions', '/models')
    } else if (modelsUrl.includes('/v1/messages')) {
      modelsUrl = modelsUrl.replace('/v1/messages', '/v1/models')
    } else if (!modelsUrl.includes('/models')) {
      modelsUrl += 'v1/models'
    }

    const startTime = Date.now()
    let availableModels: string[] = []
    let modelsError = null

    try {
      // 测试获取模型列表
      const modelsResponse = await fetch(modelsUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api}`,
        },
        signal: AbortSignal.timeout(30000), // 30s timeout
      })

      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json()
        if (modelsData.data && Array.isArray(modelsData.data)) {
          availableModels = modelsData.data.map((model: any) => model.id || model.name).filter(Boolean)
        }
      } else {
        modelsError = `获取模型列表失败: ${modelsResponse.status} ${modelsResponse.statusText}`
      }
    } catch (error: any) {
      modelsError = `获取模型列表失败: ${error.message}`
    }

    // 如果指定了模型或有可用模型，测试聊天完成
    const testModel = model || (availableModels.length > 0 ? availableModels[0] : "gpt-3.5-turbo")

    if (testModel) {
      try {
        // 确定聊天完成端点
        let chatUrl = base_url
        if (!chatUrl.includes('/chat/completions') && !chatUrl.includes('/v1/messages')) {
          chatUrl = chatUrl.replace(/\/+$/, '') + '/v1/chat/completions'
        }

        // 准备请求头
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        }

        if (chatUrl.includes("/v1/messages")) {
          // Anthropic format
          headers["x-api-key"] = api
          headers["anthropic-version"] = "2023-06-01"
        } else {
          // OpenAI format
          headers["Authorization"] = `Bearer ${api}`
        }

        const testPayload = {
          model: testModel,
          messages: [
            {
              role: "user",
              content: "Hello",
            },
          ],
          max_tokens: 10,
        }

        const chatResponse = await fetch(chatUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(30000), // 30s timeout
        })

        const responseTime = (Date.now() - startTime) / 1000

        if (chatResponse.ok) {
          return NextResponse.json({
            success: true,
            message: "连接测试成功",
            availableModels,
            testedModel: testModel,
            responseTime,
          })
        } else {
          const errorData = await chatResponse.text()
          return NextResponse.json({
            success: false,
            message: `聊天测试失败: ${chatResponse.status} ${chatResponse.statusText}`,
            details: errorData.substring(0, 200),
            availableModels,
            modelsError,
            responseTime,
          })
        }
      } catch (chatError: any) {
        const responseTime = (Date.now() - startTime) / 1000

        if (chatError.name === "TimeoutError") {
          return NextResponse.json({
            success: false,
            message: "聊天测试超时(30s)",
            availableModels,
            modelsError,
            responseTime,
          })
        }

        return NextResponse.json({
          success: false,
          message: `聊天测试失败: ${chatError.message}`,
          availableModels,
          modelsError,
          responseTime,
        })
      }
    } else {
      // 只返回模型列表结果
      const responseTime = (Date.now() - startTime) / 1000
      return NextResponse.json({
        success: availableModels.length > 0,
        message: availableModels.length > 0 ? "成功获取模型列表" : (modelsError || "未能获取模型列表"),
        availableModels,
        modelsError,
        responseTime,
      })
    }
  } catch (error) {
    console.error("Error testing provider:", error)
    return NextResponse.json(
      {
        success: false,
        message: "内部服务器错误",
      },
      { status: 500 },
    )
  }
}
