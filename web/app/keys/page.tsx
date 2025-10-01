"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Pencil, Trash2, Eye, Copy, Check } from "lucide-react"

interface UserKey {
  api: string
  name: string  // 改为 name
  credits: number
  billing_mode: string
  model: string[]
  created_at: string
}

interface UsageStats {
  summary: {
    totalRequests: number
    totalTokens: number
    totalPromptTokens: number
    totalCompletionTokens: number
    successRate: number
  }
  byModel: Array<{
    model: string
    requestCount: number
    totalTokens: number
    successRate: number
  }>
}

export default function KeysManagementPage() {
  const { toast } = useToast()
  const [apiKey, setApiKey] = useState("")
  const [keys, setKeys] = useState<UserKey[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showUsageDialog, setShowUsageDialog] = useState(false)
  const [selectedKey, setSelectedKey] = useState<UserKey | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // 表单状态
  const [formData, setFormData] = useState({
    alias: "",
    credits: 0,
    billing_mode: "token",
    models: [] as string[],
  })

  useEffect(() => {
    const savedKey = localStorage.getItem("uniapi_current_key")
    if (savedKey) {
      setApiKey(savedKey)
      loadKeys(savedKey)
    }
  }, [])

  const loadKeys = async (key: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/keys/manage?apiKey=${encodeURIComponent(key)}`)
      const data = await response.json()

      if (response.ok) {
        setKeys(data.keys)
      } else {
        toast({
          title: "加载失败",
          description: data.error || "无法加载用户 Keys",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "网络请求失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddKey = async () => {
    if (!formData.alias) {
      toast({
        title: "错误",
        description: "请输入别名",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/keys/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          alias: formData.alias,
          credits: formData.credits,
          billing_mode: formData.billing_mode,
          models: formData.models,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "创建成功",
          description: `新的 API Key 已创建`,
        })
        setShowAddDialog(false)
        setFormData({ alias: "", credits: 0, billing_mode: "token", models: [] })
        loadKeys(apiKey)
      } else {
        toast({
          title: "创建失败",
          description: data.error || "无法创建 Key",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "网络请求失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditKey = async () => {
    if (!selectedKey) return

    setLoading(true)
    try {
      const response = await fetch("/api/keys/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          targetKey: selectedKey.api,
          alias: formData.alias,
          credits: formData.credits,
          billing_mode: formData.billing_mode,
          models: formData.models,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "更新成功",
          description: "Key 信息已更新",
        })
        setShowEditDialog(false)
        setSelectedKey(null)
        loadKeys(apiKey)
      } else {
        toast({
          title: "更新失败",
          description: data.error || "无法更新 Key",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "网络请求失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteKey = async (targetKey: string) => {
    if (!confirm("确定要删除这个 Key 吗？")) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/keys/manage?apiKey=${encodeURIComponent(apiKey)}&targetKey=${encodeURIComponent(targetKey)}`,
        {
          method: "DELETE",
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "删除成功",
          description: "Key 已删除",
        })
        loadKeys(apiKey)
      } else {
        toast({
          title: "删除失败",
          description: data.error || "无法删除 Key",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "网络请求失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewUsage = async (key: UserKey) => {
    setSelectedKey(key)
    setShowUsageDialog(true)
    setLoading(true)

    try {
      const response = await fetch(
        `/api/keys/usage?apiKey=${encodeURIComponent(apiKey)}&targetKey=${encodeURIComponent(key.api)}&days=7`
      )
      const data = await response.json()

      if (response.ok) {
        setUsageStats(data)
      } else {
        toast({
          title: "查询失败",
          description: data.error || "无法查询使用记录",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "网络请求失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(text)
      setTimeout(() => setCopiedKey(null), 2000)
      toast({
        title: "已复制",
        description: "API Key 已复制到剪贴板",
      })
    } catch (error) {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "destructive",
      })
    }
  }

  const openAddDialog = () => {
    setFormData({ alias: "", credits: 0, billing_mode: "token", models: [] })
    setShowAddDialog(true)
  }

  const openEditDialog = (key: UserKey) => {
    setSelectedKey(key)
    setFormData({
      alias: key.name,  // 使用 name 字段
      credits: key.credits,
      billing_mode: key.billing_mode,
      models: key.model,
    })
    setShowEditDialog(true)
  }

  if (!apiKey) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>用户 Key 管理</CardTitle>
            <CardDescription>请先登录管理员账号</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">用户 Key 管理</h1>
          <p className="text-muted-foreground mt-2">管理和监控用户 API Keys</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          添加新 Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户 Keys 列表</CardTitle>
          <CardDescription>共 {keys.length} 个用户 Key</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && keys.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>余额</TableHead>
                  <TableHead>计费模式</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.api}>
                    <TableCell className="font-medium">{key.name || "未命名"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm">{key.api.substring(0, 20)}...</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(key.api)}
                        >
                          {copiedKey === key.api ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{key.credits}</TableCell>
                    <TableCell>{key.billing_mode === "token" ? "Token" : "次数"}</TableCell>
                    <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewUsage(key)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(key)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteKey(key.api)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 添加 Key 对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新的用户 Key</DialogTitle>
            <DialogDescription>创建一个新的 API Key 供用户使用</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="alias">名称 *</Label>
              <Input
                id="alias"
                placeholder="例如：张三"
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">用于识别此 Key 的名称，不会影响权限</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credits">余额</Label>
              <Input
                id="credits"
                type="number"
                placeholder="0"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_mode">计费模式</Label>
              <Select
                value={formData.billing_mode}
                onValueChange={(value) => setFormData({ ...formData, billing_mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token">Token 计费</SelectItem>
                  <SelectItem value="count">次数计费</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddKey} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑 Key 对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户 Key</DialogTitle>
            <DialogDescription>修改 Key 的配置信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-alias">名称</Label>
              <Input
                id="edit-alias"
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">用于识别此 Key 的名称</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-credits">余额</Label>
              <Input
                id="edit-credits"
                type="number"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-billing_mode">计费模式</Label>
              <Select
                value={formData.billing_mode}
                onValueChange={(value) => setFormData({ ...formData, billing_mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token">Token 计费</SelectItem>
                  <SelectItem value="count">次数计费</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEditKey} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 使用统计对话框 */}
      <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>使用统计</DialogTitle>
            <DialogDescription>
              {selectedKey?.name} - 最近 7 天的使用情况
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loading && !usageStats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : usageStats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">总请求数</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{usageStats.summary.totalRequests}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">总 Tokens</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{usageStats.summary.totalTokens.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">成功率</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(usageStats.summary.successRate * 100).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">输入/输出</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        {usageStats.summary.totalPromptTokens.toLocaleString()} /{" "}
                        {usageStats.summary.totalCompletionTokens.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">按模型统计</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>模型</TableHead>
                        <TableHead>请求数</TableHead>
                        <TableHead>总 Tokens</TableHead>
                        <TableHead>成功率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageStats.byModel.map((model) => (
                        <TableRow key={model.model}>
                          <TableCell className="font-medium">{model.model}</TableCell>
                          <TableCell>{model.requestCount}</TableCell>
                          <TableCell>{model.totalTokens.toLocaleString()}</TableCell>
                          <TableCell>{(model.successRate * 100).toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">暂无数据</div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowUsageDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

