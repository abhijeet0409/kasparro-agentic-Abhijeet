"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Sparkles, FileText, Package, Scale, History, Clock } from "lucide-react"

interface Product {
  id: string
  name: string
  concentration: string
  price: string
  skin_type?: string[]
}

interface GenerationResult {
  success: boolean
  executionId?: string
  totalExecutionTime?: number
  error?: string
  results: { faq: boolean; product: boolean; comparison: boolean }
  agentLogs: AgentLog[]
  errors: string[]
  generated: { questions: number; answers: number; pages: { faq: boolean; product: boolean; comparison: boolean } }
}

interface AgentLog {
  id: string
  agent_name: string
  agent_role: string
  tokens_used: number
  execution_time_ms: number
  status: string
  created_at: string
}

interface Page {
  id: string
  page_type: string
  content: Record<string, unknown>
  created_at: string
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pages, setPages] = useState<Page[]>([])
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showContent, setShowContent] = useState(false)
  const [generations, setGenerations] = useState<Array<{ generation_id: string; created_at: string }>>([])
  const [selectedGeneration, setSelectedGeneration] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("products").select("*").order("name")

    if (data && data.length > 0) {
      setProducts(data as Product[])
    }
  }

  const handleProductSelect = async (product: Product) => {
    setSelectedProduct(product)
    setShowContent(false)
    setShowHistory(false)
    await loadGenerations(product.id)
  }

  const loadGenerations = async (productId?: string) => {
    try {
      const response = await fetch(`/api/results?productId=${productId || ""}`)
      const data = await response.json()
      if (data.generations) {
        setGenerations(data.generations)
      }
    } catch (error) {
      console.error("Failed to load generations:", error)
    }
  }

  const handleGenerate = async () => {
    if (!selectedProduct) return

    setIsGenerating(true)
    setError(null)
    setShowContent(true)

    console.log("[v0] Starting generation for product:", selectedProduct.id)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct.id }),
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response content-type:", response.headers.get("content-type"))

      if (!response.ok) {
        if (response.headers.get("content-type")?.includes("application/json")) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Generation failed")
        } else {
          const errorText = await response.text()
          console.error("[v0] Non-JSON response:", errorText)
          throw new Error(`Server returned ${response.status}: ${errorText}`)
        }
      }

      const data = await response.json()
      console.log("[v0] Generation result:", data)

      if (data.success) {
        setResult(data)
        await loadResults(data.executionId)
        await loadGenerations(selectedProduct.id)
      } else {
        const errorMsg = data.error || "Generation failed"
        if (errorMsg.includes("Product not found")) {
          throw new Error(`${errorMsg} Please refresh and select a product from the list again.`)
        }
        throw new Error(errorMsg)
      }
    } catch (err) {
      console.error("[v0] Generation error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  const loadGeneration = async (generationId: string) => {
    if (!selectedProduct) return

    try {
      const response = await fetch(`/api/results?productId=${selectedProduct.id}&generationId=${generationId}`)
      const data = await response.json()

      if (data.pages) {
        setPages(data.pages)
        setLogs(data.logs || [])
        setSelectedGeneration(generationId)
        setShowContent(true)
        setShowHistory(false)
      }
    } catch (error) {
      console.error("Failed to load generation:", error)
    }
  }

  const loadResults = async (genId?: string) => {
    if (!selectedProduct) return

    try {
      // If no generation ID provided, get the latest one first
      if (!genId) {
        const historyResponse = await fetch(`/api/results?productId=${selectedProduct.id}`)
        if (!historyResponse.ok) {
          console.error("[v0] Failed to fetch history:", historyResponse.statusText)
          return
        }

        const historyData = await historyResponse.json()

        if (historyData.error) {
          console.error("[v0] Error from API:", historyData.error)
          setPages([])
          setLogs([])
          return
        }

        if (historyData.generations && historyData.generations.length > 0) {
          // Load the most recent generation
          genId = historyData.generations[0].generation_id
        } else {
          // No generations found
          setPages([])
          setLogs([])
          return
        }
      }

      // Now fetch the specific generation's content
      const response = await fetch(`/api/results?productId=${selectedProduct.id}&generationId=${genId}`)

      if (!response.ok) {
        console.error("[v0] Failed to fetch results:", response.statusText)
        return
      }

      const data = await response.json()

      if (data.error) {
        console.error("[v0] Error from API:", data.error)
        return
      }

      console.log("[v0] Loaded results:", {
        generationId: genId,
        pagesCount: data.pages?.length,
        logsCount: data.logs?.length,
      })

      if (data.pages) {
        setPages(data.pages)
      }
      if (data.logs) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error("[v0] Failed to load results:", error)
    }
  }

  useEffect(() => {
    if (selectedProduct) {
      loadResults()
      loadGenerations(selectedProduct.id)
    }
  }, [selectedProduct])

  useEffect(() => {
    if (selectedProduct && showContent) {
      loadResults()
    }
  }, [selectedProduct, showContent])

  const faqPage = pages.find((p) => p.page_type === "faq")
  const productPage = pages.find((p) => p.page_type === "product")
  const comparisonPage = pages.find((p) => p.page_type === "comparison")

  const totalTokens = logs.reduce((sum, log) => sum + (log.tokens_used || 0), 0)
  const totalTime = logs.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Package className="w-12 h-12 text-blue-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              LangGraph Multi-Agent System
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Production-grade agentic system using LangGraph, state management, conditional routing, and Groq AI
          </p>
        </div>

        {/* Product Selection */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              <CardTitle>Select Product</CardTitle>
            </div>
            <CardDescription>Choose a product to generate AI-powered content for</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No products found. Please run the seed script first:</p>
                <code className="block mt-2 p-2 bg-muted rounded">scripts/002_seed_product_data.sql</code>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg ${
                      selectedProduct?.id === product.id
                        ? "border-blue-600 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-blue-400"
                    }`}
                  >
                    <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{product.concentration}</p>
                    <p className="text-lg font-semibold text-blue-600">{product.price}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {product.skin_type?.slice(0, 2).map((type) => (
                        <span key={type} className="text-xs px-2 py-1 bg-gray-100 rounded">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedProduct && !showContent && !showHistory && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Selected Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Product Name</p>
                  <p className="text-lg font-semibold">{selectedProduct.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Concentration</p>
                  <p className="text-lg font-semibold">{selectedProduct.concentration}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Price</p>
                  <p className="text-lg font-semibold">{selectedProduct.price}</p>
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-6">
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  size="lg"
                  className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {isGenerating ? (
                    <>
                      <Spinner className="mr-2" />
                      Generating Content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2" />
                      Generate New Content
                    </>
                  )}
                </Button>

                {generations.length > 0 && !isGenerating && (
                  <Button
                    onClick={() => setShowHistory(true)}
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 py-6"
                  >
                    <History className="mr-2" />
                    View History ({generations.length})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {showHistory && selectedProduct && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generation History</CardTitle>
                  <CardDescription>View all previous content generations for {selectedProduct.name}</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setShowHistory(false)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generations.map((gen) => (
                  <Card
                    key={gen.generation_id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => loadGeneration(gen.generation_id)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {new Date(gen.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(gen.created_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedProduct && showContent && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                <CardTitle>Generated Content Pages</CardTitle>
              </div>
              <CardDescription>Machine-readable JSON outputs from agent collaboration</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="faq" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="faq">FAQ Page</TabsTrigger>
                  <TabsTrigger value="product">Product Page</TabsTrigger>
                  <TabsTrigger value="comparison">Comparison Page</TabsTrigger>
                </TabsList>

                <TabsContent value="faq" className="mt-6">
                  {faqPage ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{(faqPage.content as { title: string }).title}</h3>
                        <p className="text-muted-foreground">
                          {(faqPage.content as { description: string }).description}
                        </p>
                      </div>
                      <div className="space-y-4">
                        {(
                          (
                            faqPage.content as {
                              faqs: Array<{ category: string; question: string; answer: string }>
                            }
                          ).faqs || []
                        ).map((faq, idx) => (
                          <Card key={idx}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-lg">{faq.question}</CardTitle>
                                <Badge variant="outline">{faq.category}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-muted-foreground">{faq.answer}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <details className="mt-6">
                        <summary className="cursor-pointer font-semibold mb-2">View JSON Output</summary>
                        <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs">
                          {JSON.stringify(faqPage.content, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No FAQ page generated yet</p>
                  )}
                </TabsContent>

                <TabsContent value="product" className="mt-6">
                  {productPage ? (
                    <div className="space-y-6">
                      <div className="text-center">
                        <h3 className="text-3xl font-bold mb-2">{(productPage.content as { title: string }).title}</h3>
                        <p className="text-xl text-blue-600 mb-4">
                          {(productPage.content as { tagline: string }).tagline}
                        </p>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                          {(productPage.content as { description: string }).description}
                        </p>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle>Key Features</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(
                              (
                                productPage.content as {
                                  keyFeatures: Array<{ title: string; description: string }>
                                }
                              ).keyFeatures || []
                            ).map((feature, idx) => (
                              <div key={idx} className="p-4 border rounded-lg">
                                <h4 className="font-semibold mb-2">{feature.title}</h4>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <details className="mt-6">
                        <summary className="cursor-pointer font-semibold mb-2">View JSON Output</summary>
                        <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs">
                          {JSON.stringify(productPage.content, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No product page generated yet</p>
                  )}
                </TabsContent>

                <TabsContent value="comparison" className="mt-6">
                  {comparisonPage ? (
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold text-center">
                        {(comparisonPage.content as { title: string }).title}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>
                              {(comparisonPage.content as { productA: { name: string } }).productA.name}
                            </CardTitle>
                            <CardDescription>Product A</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-lg font-semibold mb-2">
                              {(comparisonPage.content as { productA: { price: string } }).productA.price}
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                              {
                                (comparisonPage.content as { productA: { concentration: string } }).productA
                                  .concentration
                              }
                            </p>
                            <h4 className="font-semibold mb-2">Strengths:</h4>
                            <ul className="text-sm space-y-1">
                              {(
                                (comparisonPage.content as { productA: { strengths: string[] } }).productA.strengths ||
                                []
                              ).map((s, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <Sparkles className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>
                              {(comparisonPage.content as { productB: { name: string } }).productB.name}
                            </CardTitle>
                            <CardDescription>Product B (AI-Generated Competitor)</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-lg font-semibold mb-2">
                              {(comparisonPage.content as { productB: { price: string } }).productB.price}
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                              {
                                (comparisonPage.content as { productB: { concentration: string } }).productB
                                  .concentration
                              }
                            </p>
                            <h4 className="font-semibold mb-2">Strengths:</h4>
                            <ul className="text-sm space-y-1">
                              {(
                                (comparisonPage.content as { productB: { strengths: string[] } }).productB.strengths ||
                                []
                              ).map((s, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <Sparkles className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>

                      <details className="mt-6">
                        <summary className="cursor-pointer font-semibold mb-2">View JSON Output</summary>
                        <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs">
                          {JSON.stringify(comparisonPage.content, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No comparison page generated yet</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {!showContent && !isGenerating && !showHistory && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ready to Generate Content</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Click {generations.length > 0 ? '"View History"' : "the button above"} to start the multi-agent pipeline
                and create AI-powered pages.
                {generations.length > 0 && " Or view your previous results."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
