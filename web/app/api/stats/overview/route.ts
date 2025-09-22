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
      const results = await query(
        `
        SELECT
          COUNT(*) as requests,
          COALESCE(SUM(total_tokens), 0) as totalTokens,
          COALESCE(SUM(prompt_tokens), 0) as promptTokens,
          COALESCE(SUM(completion_tokens), 0) as completionTokens,
          COALESCE(AVG(process_time), 0) as avgProcessTime,
          COALESCE(AVG(first_response_time), 0) as avgFirstResponseTime
        FROM request_stats
        WHERE api_key = $1 AND endpoint = 'POST /v1/chat/completions'
      `,
        [apiKey],
      )

      const stats = results[0] || {
        requests: 0,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        avgProcessTime: 0,
        avgFirstResponseTime: 0,
      }

      // 获取计费信息
      try {
        const apiUrl = process.env.UNI_API_URL || "http://localhost:8000"
        const billingResponse = await fetch(`${apiUrl}/v1/token_usage?api_key_param=${encodeURIComponent(apiKey)}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        })

        if (billingResponse.ok) {
          const billingData = await billingResponse.json()
          const queryDetails = billingData.query_details || {}

          // 添加计费信息到统计数据
          stats.billingMode = queryDetails.billing_mode
          stats.credits = queryDetails.credits
          stats.countCredits = queryDetails.count_credits
          stats.totalCost = queryDetails.total_cost
          stats.totalRequests = queryDetails.total_requests
          stats.balance = queryDetails.balance
          stats.countBalance = queryDetails.count_balance
        }
      } catch (billingError) {
        console.warn("Failed to fetch billing info:", billingError)
        // 计费信息获取失败不影响基础统计
      }

      return NextResponse.json(stats)
    } catch (dbError) {
      throw dbError
    }
  } catch (error) {
    console.error("Error fetching overview stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
