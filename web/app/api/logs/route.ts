// 文件名: api.logs.router.tsx
// 备注：这是一个完整的替换文件内容。请直接用以下内容覆盖 api.logs.router.tsx 文件。
// 修改内容：
// 1. 修正了状态筛选逻辑，使其正确处理前端发送的 'true' 或 'false' 字符串。

import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// 定义从数据库返回的日志行的数据结构
interface LogRow {
  timestamp: string
  success: boolean
  model: string
  provider: string
  processTime: number
  firstResponseTime: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  text: string
}

// 辅助函数，用于安全地将字符串 'true'/'false' 转换为布尔值
function parseBoolean(value: string | null): boolean | null {
    if (value === null || value === undefined) {
        return null;
    }
    const lowerCaseValue = value.toLowerCase();
    if (lowerCaseValue === 'true') {
        return true;
    }
    if (lowerCaseValue === 'false') {
        return false;
    }
    return null; // 或者根据需要抛出错误或返回默认值
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get("apiKey")
    const page = Number.parseInt(searchParams.get("page") || "1")
    // 增加对 limit 的校验，防止过大或无效值
    const rawLimit = searchParams.get("limit") || "30"; // 默认值改为 30，与前端一致
    const limit = Math.min(Math.max(1, Number.parseInt(rawLimit)), 100); // 限制在 1 到 100 之间
    const model = searchParams.get("model")
    const provider = searchParams.get("provider")
    const statusParam = searchParams.get("status") // 获取原始 status 参数 ('true' or 'false')

    if (!apiKey) {
      return NextResponse.json({ error: "API Key is required" }, { status: 400 })
    }

    try {
      // 使用参数化查询以防止 SQL 注入
      let whereClauses: string[] = ["r.api_key = $1", "r.endpoint = $2"]
      const params: (string | number | boolean)[] = [apiKey, "POST /v1/chat/completions"]
      let paramIndex = 3;

      if (model) {
        whereClauses.push(`r.model = $${paramIndex++}`)
        params.push(model)
      }

      if (provider) {
        whereClauses.push(`r.provider = $${paramIndex++}`)
        params.push(provider)
      }

      // **修正状态筛选逻辑**
      // 由于我们现在使用子查询获取success状态，状态筛选需要在外层进行
      // 这里先记录状态筛选条件，稍后在查询中应用
      const successStatus = parseBoolean(statusParam);
      
      const whereClause = `WHERE ${whereClauses.join(" AND ")}`;

      const offset = (page - 1) * limit

      // 为了检查是否有下一页，多查询一条记录
      const queryLimit = limit + 1;

      // 简化查询，先获取基础数据，然后在应用层处理成功状态
      const sql = `
        SELECT
          r.timestamp,
          1 as success,  -- 临时设为成功，稍后在应用层处理
          r.model,
          r.provider,
          r.process_time as processTime,
          r.first_response_time as firstResponseTime,
          r.prompt_tokens as promptTokens,
          r.completion_tokens as completionTokens,
          r.total_tokens as totalTokens,
          r.text,
          r.request_id
        FROM request_stats r
        ${whereClause}
        ORDER BY r.timestamp DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      const finalParams = [...params, queryLimit, offset];

      let results: any[] = await query(sql, finalParams);

      // 为每个结果查找对应的成功状态
      const processedResults: LogRow[] = await Promise.all(
        results.map(async (row) => {
          try {
            // 查找最近时间匹配的channel_stats记录
            const channelResults = await query(
              `SELECT success FROM channel_stats
               WHERE model = $1 AND provider = $2 AND api_key = $3
               AND datetime(timestamp) BETWEEN datetime($4, '-5 minutes') AND datetime($4, '+5 minutes')
               ORDER BY ABS(julianday(timestamp) - julianday($4)) ASC
               LIMIT 1`,
              [row.model, row.provider, row.api_key, row.timestamp]
            );

            const success = channelResults.length > 0 ? channelResults[0].success : true;

            return {
              ...row,
              success: Boolean(success)
            };
          } catch (error) {
            // 如果查询失败，默认为成功
            return {
              ...row,
              success: true
            };
          }
        })
      );

      // 应用状态筛选（如果指定了状态）
      let filteredResults = processedResults;
      if (successStatus !== null) {
        filteredResults = processedResults.filter(row => row.success === successStatus);
      }

      // 判断是否有下一页
      const hasNextPage = filteredResults.length > limit
      // 如果有下一页，截取所需数量的日志
      const logs = hasNextPage ? filteredResults.slice(0, limit) : filteredResults

      return NextResponse.json({ logs, hasNextPage })

    } catch (dbError) {
      console.error("Database query error:", dbError);
      // 返回更具体的数据库错误信息（生产环境中可能需要屏蔽细节）
      return NextResponse.json({ error: "Database query failed", details: (dbError as Error).message }, { status: 500 })
    }
  } catch (error) {
    console.error("Error fetching logs:", error)
    // 确保即使在顶层 catch 中，也能处理已知错误类型
    if (error instanceof Error) {
        return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
    }
    // 处理未知错误
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}