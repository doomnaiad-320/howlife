import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 })
    }

    try {
      // 修复：由于request_id关联问题，我们使用时间窗口和模型匹配来关联成功/失败统计
      const results = await query(
        `
        SELECT
          r.model,
          COUNT(*) as requests,
          COALESCE(
            (SELECT COUNT(*) FROM channel_stats c
             WHERE c.model = r.model
             AND c.api_key = r.api_key
             AND c.success = true
             AND datetime(c.timestamp) BETWEEN datetime(MIN(r.timestamp), '-5 minutes') AND datetime(MAX(r.timestamp), '+5 minutes')
            ), 0
          ) as successes,
          COALESCE(
            (SELECT COUNT(*) FROM channel_stats c
             WHERE c.model = r.model
             AND c.api_key = r.api_key
             AND c.success = false
             AND datetime(c.timestamp) BETWEEN datetime(MIN(r.timestamp), '-5 minutes') AND datetime(MAX(r.timestamp), '+5 minutes')
            ), 0
          ) as failures,
          COALESCE(SUM(r.total_tokens), 0) as totalTokens,
          COALESCE(SUM(r.prompt_tokens), 0) as promptTokens,
          COALESCE(SUM(r.completion_tokens), 0) as completionTokens,
          COALESCE(AVG(r.process_time), 0) as avgProcessTime,
          COALESCE(AVG(r.first_response_time), 0) as avgFirstResponseTime
        FROM request_stats r
        WHERE r.api_key = $1 AND r.endpoint = 'POST /v1/chat/completions'
        GROUP BY r.model
        ORDER BY requests DESC
      `,
        [apiKey],
      )

      // 处理结果，计算成功率
      const processedResults = results.map((row: any) => {
        const successes = parseInt(row.successes)
        const failures = parseInt(row.failures)
        const total = successes + failures
        const successRate = total > 0 ? successes / total : 0

        return {
          model: row.model,
          requests: parseInt(row.requests),
          successes: successes,
          failures: failures,
          successRate: successRate,
          totalTokens: parseInt(row.totalTokens),
          promptTokens: parseInt(row.promptTokens),
          completionTokens: parseInt(row.completionTokens),
          avgProcessTime: parseFloat(row.avgProcessTime),
          avgFirstResponseTime: parseFloat(row.avgFirstResponseTime),
        }
      })

      return NextResponse.json(processedResults)
    } catch (dbError) {
      throw dbError
    }
  } catch (error) {
    console.error("Error fetching model stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
