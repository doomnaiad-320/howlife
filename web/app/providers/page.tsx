"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Edit, Trash2, TestTube, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ModelPrice {
  tokenPrice: string
  countPrice: number
}

interface ModelConfig {
  originalName: string  // A输入框：原始模型名称
  displayName: string   // B输入框：显示模型名称
  tokenPrice: string
  countPrice: number
}

interface Provider {
  provider: string
  base_url: string
  api: string
  model?: any[]
  modelPrices?: Record<string, ModelPrice>
}

interface TestResult {
  success: boolean
  message: string
  availableModels?: string[]
  testedModel?: string
  responseTime?: number
  details?: string
  modelsError?: string
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  
  const { toast } = useToast()

  // 表单状态
  const [formData, setFormData] = useState({
    provider: "",
    base_url: "",
    api: "",
    models: [] as ModelConfig[]
  })

  useEffect(() => {
    const savedApiKey = localStorage.getItem("uniapi_current_key")
    if (savedApiKey) {
      setApiKey(savedApiKey)
      fetchProviders(savedApiKey)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchProviders = async (key: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/providers/manage?apiKey=${encodeURIComponent(key)}`)
      const data = await response.json()

      if (response.ok) {
        setProviders(data.providers || [])
      } else {
        toast({
          title: "获取 Providers 失败",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "网络错误",
        description: "无法连接到服务器",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testProvider = async (provider: Provider) => {
    const key = provider.provider
    setTesting(prev => ({ ...prev, [key]: true }))

    try {
      const response = await fetch("/api/providers/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          provider: provider.provider,
          base_url: provider.base_url,
          api: provider.api,
          model: provider.model?.[0] ? 
            (typeof provider.model[0] === "string" ? provider.model[0] : Object.values(provider.model[0])[0]) : 
            undefined
        }),
      })

      const result = await response.json()
      setTestResults(prev => ({ ...prev, [key]: result }))

      toast({
        title: result.success ? "测试成功" : "测试失败",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      })
    } catch (error) {
      const errorResult = {
        success: false,
        message: "网络错误",
      }
      setTestResults(prev => ({ ...prev, [key]: errorResult }))
      
      toast({
        title: "测试失败",
        description: "网络错误",
        variant: "destructive",
      })
    } finally {
      setTesting(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!apiKey) {
      toast({
        title: "错误",
        description: "请先输入 API Key",
        variant: "destructive",
      })
      return
    }

    try {
      // 构建模型映射数组
      const models = formData.models.length > 0 ?
        formData.models
          .filter(m => m.originalName && m.displayName)
          .map(m => {
            if (m.originalName === m.displayName) {
              // 如果原始名称和显示名称相同，直接使用字符串
              return m.displayName
            } else {
              // 如果不同，使用对象映射格式
              return { [m.originalName]: m.displayName }
            }
          }) :
        undefined

      // 构建模型价格配置（使用显示名称作为key）
      const modelPrices: Record<string, ModelPrice> = {}
      formData.models.forEach(model => {
        if (model.displayName && (model.tokenPrice || model.countPrice > 0)) {
          modelPrices[model.displayName] = {
            tokenPrice: model.tokenPrice || "1,2",
            countPrice: model.countPrice || 0.001
          }
        }
      })

      const providerData = {
        provider: formData.provider,
        base_url: formData.base_url,
        api: formData.api,
        ...(models && { model: models }),
        ...(Object.keys(modelPrices).length > 0 && { modelPrices })
      }

      const url = editingProvider ? "/api/providers/manage" : "/api/providers/manage"
      const method = editingProvider ? "PUT" : "POST"
      const body = editingProvider ? 
        { apiKey, originalProvider: editingProvider.provider, provider: providerData } :
        { apiKey, provider: providerData }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "成功",
          description: result.message,
        })
        setIsDialogOpen(false)
        resetForm()
        fetchProviders(apiKey)
      } else {
        toast({
          title: "操作失败",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "网络错误",
        description: "无法连接到服务器",
        variant: "destructive",
      })
    }
  }

  const deleteProvider = async (providerName: string) => {
    if (!confirm(`确定要删除 Provider "${providerName}" 吗？`)) {
      return
    }

    try {
      const response = await fetch(`/api/providers/manage?apiKey=${encodeURIComponent(apiKey)}&provider=${encodeURIComponent(providerName)}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "删除成功",
          description: result.message,
        })
        fetchProviders(apiKey)
      } else {
        toast({
          title: "删除失败",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "网络错误",
        description: "无法连接到服务器",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      provider: "",
      base_url: "",
      api: "",
      models: []
    })
    setEditingProvider(null)
  }

  const openEditDialog = (provider: Provider) => {
    setEditingProvider(provider)

    // 构建模型配置数组
    const modelConfigs: ModelConfig[] = []
    if (provider.model) {
      provider.model.forEach(m => {
        let originalName = ""
        let displayName = ""

        if (typeof m === "string") {
          originalName = m
          displayName = m
        } else if (typeof m === "object") {
          const [original, display] = Object.entries(m)[0]
          originalName = original
          displayName = display as string
        }

        const prices = provider.modelPrices?.[displayName]
        modelConfigs.push({
          originalName,
          displayName,
          tokenPrice: prices?.tokenPrice || "1,2",
          countPrice: prices?.countPrice || 0.001
        })
      })
    }

    setFormData({
      provider: provider.provider,
      base_url: provider.base_url,
      api: provider.api,
      models: modelConfigs
    })
    setIsDialogOpen(true)
  }

  if (!apiKey) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Provider 管理</CardTitle>
            <CardDescription>请先输入 API Key 以访问 Provider 管理功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="输入您的 API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && apiKey && !loading) {
                    localStorage.setItem("uniapi_current_key", apiKey)
                    fetchProviders(apiKey)
                  }
                }}
              />
              <Button
                onClick={() => {
                  localStorage.setItem("uniapi_current_key", apiKey)
                  fetchProviders(apiKey)
                }}
                disabled={!apiKey || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    验证中...
                  </>
                ) : (
                  "确认"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">


      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Provider 管理</h1>
          <p className="text-muted-foreground">管理您的 AI 服务提供商配置</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              添加 Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProvider ? "编辑" : "添加"} Provider</DialogTitle>
              <DialogDescription>
                配置新的 AI 服务提供商，包括基本信息和模型价格设置
              </DialogDescription>
            </DialogHeader>

            {!editingProvider && providers.length > 0 && (
              <div className="mb-6">
                <Label className="text-base font-medium">现有 Providers</Label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-32 overflow-y-auto">
                  {providers.map((provider) => (
                    <div key={provider.provider} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{provider.provider}</p>
                        <p className="text-xs text-muted-foreground truncate">{provider.base_url}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(provider)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => testProvider(provider)}
                          disabled={testing[provider.provider]}
                        >
                          {testing[provider.provider] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <TestTube className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider 名称 *</Label>
                  <Input
                    id="provider"
                    value={formData.provider}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                    placeholder="例如: OpenAI, Claude, Gemini"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api">API Key *</Label>
                  <Input
                    id="api"
                    type="password"
                    value={formData.api}
                    onChange={(e) => setFormData(prev => ({ ...prev, api: e.target.value }))}
                    placeholder="sk-..."
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="base_url">Base URL *</Label>
                <Input
                  id="base_url"
                  value={formData.base_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                  placeholder="https://api.openai.com/v1/chat/completions"
                  required
                />
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-medium">模型配置</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          models: [...prev.models, { originalName: "", displayName: "", tokenPrice: "1,2", countPrice: 0.001 }]
                        }))
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      添加模型
                    </Button>
                  </div>

                  {formData.models.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                      <p className="text-muted-foreground mb-4">暂无模型配置</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        添加模型配置或留空将自动从 /v1/models 端点获取可用模型
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            models: [{ originalName: "", displayName: "", tokenPrice: "1,2", countPrice: 0.001 }]
                          }))
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        添加第一个模型
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.models.map((model, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <Label className="font-medium">模型 {index + 1}</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  models: prev.models.filter((_, i) => i !== index)
                                }))
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm">原始模型名称 (A) *</Label>
                                <Input
                                  value={model.originalName}
                                  onChange={(e) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      models: prev.models.map((m, i) =>
                                        i === index ? { ...m, originalName: e.target.value } : m
                                      )
                                    }))
                                  }}
                                  placeholder="例如: Howlife:claude-opus-4"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Provider 提供的原始模型名称
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">显示模型名称 (B) *</Label>
                                <Input
                                  value={model.displayName}
                                  onChange={(e) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      models: prev.models.map((m, i) =>
                                        i === index ? { ...m, displayName: e.target.value } : m
                                      )
                                    }))
                                  }}
                                  placeholder="例如: claude-opus-4"
                                />
                                <p className="text-xs text-muted-foreground">
                                  用户看到的模型名称
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm">Token 价格 (输入,输出)</Label>
                                <Input
                                  value={model.tokenPrice}
                                  onChange={(e) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      models: prev.models.map((m, i) =>
                                        i === index ? { ...m, tokenPrice: e.target.value } : m
                                      )
                                    }))
                                  }}
                                  placeholder="1,2"
                                />
                                <p className="text-xs text-muted-foreground">
                                  美元/百万 tokens，留空使用默认值
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm">次数价格</Label>
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={model.countPrice}
                                  onChange={(e) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      models: prev.models.map((m, i) =>
                                        i === index ? { ...m, countPrice: parseFloat(e.target.value) || 0 } : m
                                      )
                                    }))
                                  }}
                                  placeholder="0.001"
                                />
                                <p className="text-xs text-muted-foreground">
                                  美元/次请求，设为0使用token计费
                                </p>
                              </div>
                            </div>

                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-1">配置预览:</p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p><strong>映射:</strong> {model.originalName || "未设置"} → {model.displayName || "未设置"}</p>
                                <p><strong>计费:</strong> {model.countPrice > 0 ?
                                  `次数计费 $${model.countPrice}/次请求` :
                                  `Token计费 $${model.tokenPrice}/百万tokens`
                                }</p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingProvider ? "更新" : "添加"} Provider
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6">
          {providers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <p className="text-muted-foreground mb-4">暂无 Provider 配置</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加第一个 Provider
                </Button>
              </CardContent>
            </Card>
          ) : (
            providers.map((provider) => (
              <Card key={provider.provider}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {provider.provider}
                        {testResults[provider.provider] && (
                          testResults[provider.provider].success ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )
                        )}
                      </CardTitle>
                      <CardDescription>{provider.base_url}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testProvider(provider)}
                        disabled={testing[provider.provider]}
                      >
                        {testing[provider.provider] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                        测试
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(provider)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteProvider(provider.provider)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">API Key</Label>
                      <p className="text-sm text-muted-foreground">
                        {provider.api.substring(0, 8)}...{provider.api.substring(provider.api.length - 4)}
                      </p>
                    </div>
                    
                    {provider.model && provider.model.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">配置的模型</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {provider.model.map((model, index) => (
                            <Badge key={index} variant="secondary">
                              {typeof model === "string" ? model : Object.values(model)[0] as string}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {provider.modelPrices && Object.keys(provider.modelPrices).length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">价格配置</Label>
                        <div className="space-y-2 mt-2">
                          {Object.entries(provider.modelPrices).map(([modelName, prices]) => (
                            <div key={modelName} className="flex justify-between items-center p-2 bg-muted rounded">
                              <span className="text-sm font-medium">{modelName}</span>
                              <div className="text-xs text-muted-foreground">
                                Token: ${prices.tokenPrice} | 次数: ${prices.countPrice}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {testResults[provider.provider] && (
                      <Alert className={testResults[provider.provider].success ? "border-green-200" : "border-red-200"}>
                        <AlertDescription>
                          <div className="space-y-2">
                            <p>{testResults[provider.provider].message}</p>
                            {testResults[provider.provider].responseTime && (
                              <p className="text-sm">响应时间: {testResults[provider.provider].responseTime?.toFixed(2)}s</p>
                            )}
                            {testResults[provider.provider].availableModels && testResults[provider.provider].availableModels!.length > 0 && (
                              <div>
                                <p className="text-sm font-medium">可用模型:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {testResults[provider.provider].availableModels!.slice(0, 5).map((model, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {model}
                                    </Badge>
                                  ))}
                                  {testResults[provider.provider].availableModels!.length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{testResults[provider.provider].availableModels!.length - 5} 更多
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
