import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const apiKey = authHeader.substring(7)
    const apiUrl = process.env.UNI_API_URL || "http://localhost:8000"

    // 调用后端API获取API密钥状态
    const response = await fetch(`${apiUrl}/v1/api_keys_states`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Backend API error: ${response.status} ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching API keys states:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
