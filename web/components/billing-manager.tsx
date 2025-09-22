"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Loader2, DollarSign, Hash, Settings, Plus } from "lucide-react"

interface ApiKeyState {
  billing_mode: string
  credits: number
  count_credits?: number
  total_cost: number
  enabled: boolean
  cost_details?: any
}

interface BillingManagerProps {
  apiKey: string
  role: string
}

export function BillingManager({ apiKey, role }: BillingManagerProps) {
  const [apiKeysStates, setApiKeysStates] = useState<Record<string, ApiKeyState>>({})
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState<string>("")
  const [creditAmount, setCreditAmount] = useState<string>("")
  const [countAmount, setCountAmount] = useState<string>("")
  const [billingMode, setBillingMode] = useState<string>("token")
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  // 加载API密钥状态
  const loadApiKeysStates = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/billing/states", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to load API keys states")
      }

      const data = await response.json()
      setApiKeysStates(data.api_keys_states || {})
      
      // 设置默认选中的密钥
      const keys = Object.keys(data.api_keys_states || {})
      if (keys.length > 0 && !selectedKey) {
        setSelectedKey(keys[0])
      }
    } catch (error) {
      console.error("Error loading API keys states:", error)
      toast({
        title: "错误",
        description: "加载API密钥状态失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 添加余额
  const addCredits = async () => {
    if (!selectedKey || !creditAmount) return

    try {
      setUpdating(true)
      const response = await fetch("/api/billing/add-credits", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paid_key: selectedKey,
          amount: parseFloat(creditAmount),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add credits")
      }

      toast({
        title: "成功",
        description: `已为密钥添加 $${creditAmount} 余额`,
      })

      setCreditAmount("")
      await loadApiKeysStates()
    } catch (error) {
      console.error("Error adding credits:", error)
      toast({
        title: "错误",
        description: "添加余额失败",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  // 添加余额（次数计费模式下也是添加金额余额）
  const addCountCredits = async () => {
    if (!selectedKey || !countAmount) return

    try {
      setUpdating(true)
      // 次数计费模式下，我们仍然使用 add-credits API 来添加金额余额
      const response = await fetch("/api/billing/add-credits", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paid_key: selectedKey,
          amount: parseFloat(countAmount),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add credits")
      }

      toast({
        title: "成功",
        description: `已为密钥添加 $${countAmount} 余额`,
      })

      setCountAmount("")
      await loadApiKeysStates()
    } catch (error) {
      console.error("Error adding credits:", error)
      toast({
        title: "错误",
        description: "添加余额失败",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  // 设置计费模式
  const setBillingModeForKey = async () => {
    if (!selectedKey) return

    try {
      setUpdating(true)
      const response = await fetch("/api/billing/set-mode", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paid_key: selectedKey,
          billing_mode: billingMode,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to set billing mode")
      }

      toast({
        title: "成功",
        description: `已设置计费模式为 ${billingMode}`,
      })

      await loadApiKeysStates()
    } catch (error) {
      console.error("Error setting billing mode:", error)
      toast({
        title: "错误",
        description: "设置计费模式失败",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    if (role === "admin") {
      loadApiKeysStates()
    }
  }, [apiKey, role])

  if (role !== "admin") {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">仅管理员可以访问计费管理功能</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">加载计费信息中...</p>
        </CardContent>
      </Card>
    )
  }

  const selectedKeyState = selectedKey ? apiKeysStates[selectedKey] : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            计费管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API密钥选择 */}
          <div className="space-y-2">
            <Label>选择API密钥</Label>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger>
                <SelectValue placeholder="选择要管理的API密钥" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(apiKeysStates).map((key) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {key.substring(0, 8)}...{key.substring(key.length - 4)}
                      </span>
                      <Badge variant={apiKeysStates[key].enabled ? "default" : "destructive"}>
                        {apiKeysStates[key].enabled ? "启用" : "禁用"}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 当前状态显示 */}
          {selectedKeyState && (
            <div className="space-y-4">
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>计费模式</Label>
                  <Badge variant="outline">
                    {selectedKeyState.billing_mode === "token" ? "按Token计费" :
                     selectedKeyState.billing_mode === "count" ? "按次数计费" : "混合计费"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>余额</Label>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span>${selectedKeyState.credits}</span>
                  </div>
                </div>
                {selectedKeyState.billing_mode === "count" && (
                  <div className="space-y-2">
                    <Label>计费模式</Label>
                    <div className="flex items-center gap-1">
                      <Hash className="w-4 h-4" />
                      <span>按次数计费 (每次 $0.04)</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>总消费</Label>
                <span>${selectedKeyState.total_cost.toFixed(6)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作面板 */}
      {selectedKeyState && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 余额管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                余额管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>添加余额 (美元)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="输入金额"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                  <Button
                    onClick={addCredits}
                    disabled={updating || !creditAmount}
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    添加
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 余额管理（次数计费模式下也是金额） */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                余额管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>添加余额</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="输入金额 (美元)"
                    value={countAmount}
                    onChange={(e) => setCountAmount(e.target.value)}
                  />
                  <Button
                    onClick={addCountCredits}
                    disabled={updating || !countAmount}
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    添加
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  次数计费模式下，每次请求扣除 $0.04
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 计费模式设置 */}
      {selectedKeyState && (
        <Card>
          <CardHeader>
            <CardTitle>计费模式设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>选择计费模式</Label>
              <Select value={billingMode} onValueChange={setBillingMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token">按Token计费</SelectItem>
                  <SelectItem value="count">按次数计费</SelectItem>
                  <SelectItem value="hybrid">混合计费</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={setBillingModeForKey}
              disabled={updating || billingMode === selectedKeyState.billing_mode}
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              设置计费模式
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
