import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const apiKey = authHeader.substring(7)
    const { paid_key, amount } = await request.json()

    if (!paid_key || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    const apiUrl = process.env.UNI_API_URL || "http://localhost:8000"

    // 调用后端API添加余额
    const response = await fetch(`${apiUrl}/v1/add_credits?paid_key=${encodeURIComponent(paid_key)}&amount=${amount}`, {
      method: "POST",
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
    console.error("Error adding credits:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
