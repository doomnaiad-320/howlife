import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import yaml from "js-yaml"
import { query } from "@/lib/db"

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

// GET - 获取指定 Key 的使用统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")
    const targetKey = searchParams.get("targetKey")
    const days = parseInt(searchParams.get("days") || "7")

    if (!apiKey) {
      return NextResponse.json({ error: "需要提供管理员 API Key" }, { status: 400 })
    }

    if (!targetKey) {
      return NextResponse.json({ error: "需要提供目标 Key" }, { status: 400 })
    }

    await validateAdminKey(apiKey)

    // 查询使用统计
    const stats = await query(
      `
      SELECT
        r.model,
        COUNT(*) as request_count,
        COALESCE(SUM(r.prompt_tokens), 0) as total_prompt_tokens,
        COALESCE(SUM(r.completion_tokens), 0) as total_completion_tokens,
        COALESCE(SUM(r.total_tokens), 0) as total_tokens,
        COALESCE(AVG(r.process_time), 0) as avg_process_time,
        COALESCE(AVG(r.first_response_time), 0) as avg_first_response_time,
        MIN(r.timestamp) as first_request,
        MAX(r.timestamp) as last_request
      FROM request_stats r
      WHERE r.api_key = ?
        AND r.timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY r.model
      ORDER BY request_count DESC
      `,
      [targetKey, days]
    )

    // 查询成功率
    const successStats = await query(
      `
      SELECT
        c.model,
        COUNT(*) as total,
        SUM(CASE WHEN c.success = 1 THEN 1 ELSE 0 END) as successes
      FROM channel_stats c
      WHERE c.api_key = ?
        AND c.timestamp >= datetime('now', '-' || ? || ' days')
      GROUP BY c.model
      `,
      [targetKey, days]
    )

    // 合并统计数据
    const successMap = new Map(
      successStats.map((s: any) => [
        s.model,
        {
          total: parseInt(s.total),
          successes: parseInt(s.successes),
        },
      ])
    )

    const processedStats = stats.map((row: any) => {
      const successData = successMap.get(row.model) || { total: 0, successes: 0 }
      const successRate = successData.total > 0 ? successData.successes / successData.total : 0

      return {
        model: row.model,
        requestCount: parseInt(row.request_count),
        totalPromptTokens: parseInt(row.total_prompt_tokens),
        totalCompletionTokens: parseInt(row.total_completion_tokens),
        totalTokens: parseInt(row.total_tokens),
        avgProcessTime: parseFloat(row.avg_process_time),
        avgFirstResponseTime: parseFloat(row.avg_first_response_time),
        successRate: successRate,
        firstRequest: row.first_request,
        lastRequest: row.last_request,
      }
    })

    // 查询总体统计
    const totalStats = await query(
      `
      SELECT
        COUNT(*) as total_requests,
        COALESCE(SUM(r.total_tokens), 0) as total_tokens,
        COALESCE(SUM(r.prompt_tokens), 0) as total_prompt_tokens,
        COALESCE(SUM(r.completion_tokens), 0) as total_completion_tokens
      FROM request_stats r
      WHERE r.api_key = ?
        AND r.timestamp >= datetime('now', '-' || ? || ' days')
      `,
      [targetKey, days]
    )

    const totalSuccessStats = await query(
      `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN c.success = 1 THEN 1 ELSE 0 END) as successes
      FROM channel_stats c
      WHERE c.api_key = ?
        AND c.timestamp >= datetime('now', '-' || ? || ' days')
      `,
      [targetKey, days]
    )

    const total = totalStats[0] || {}
    const totalSuccess = totalSuccessStats[0] || { total: 0, successes: 0 }
    const overallSuccessRate =
      parseInt(totalSuccess.total) > 0
        ? parseInt(totalSuccess.successes) / parseInt(totalSuccess.total)
        : 0

    return NextResponse.json({
      targetKey,
      days,
      summary: {
        totalRequests: parseInt(total.total_requests) || 0,
        totalTokens: parseInt(total.total_tokens) || 0,
        totalPromptTokens: parseInt(total.total_prompt_tokens) || 0,
        totalCompletionTokens: parseInt(total.total_completion_tokens) || 0,
        successRate: overallSuccessRate,
      },
      byModel: processedStats,
    })
  } catch (error: any) {
    console.error("查询使用统计失败:", error)
    return NextResponse.json({ error: error.message || "查询失败" }, { status: 500 })
  }
}

