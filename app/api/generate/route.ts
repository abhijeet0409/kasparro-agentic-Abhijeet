import { orchestrateWithLangGraph } from "@/lib/langgraph/orchestrator"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { productId } = await req.json()

    if (!productId) {
      return Response.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Verify product exists
    const supabase = await createClient()
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .single()

    if (productError || !product) {
      return Response.json({ error: "Product not found" }, { status: 404 })
    }

    console.log("[v0] API: Starting orchestration for product", productId)
    const result = await orchestrateWithLangGraph(productId)
    console.log("[v0] API: Orchestration complete", { success: result.success })

    // Always return 200 OK with JSON
    return Response.json(result, { status: 200 })
  } catch (error) {
    console.error("[v0] API: Fatal error in generate route:", error)
    console.error("[v0] API: Error stack:", error instanceof Error ? error.stack : "No stack")

    // Always return valid JSON, never let Next.js return HTML error page
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        errors: [error instanceof Error ? error.message : "Unknown error occurred"],
        executionId: crypto.randomUUID(),
        totalExecutionTime: 0,
        results: {
          faq: false,
          product: false,
          comparison: false,
        },
        agentLogs: [],
        generated: {
          questions: 0,
          answers: 0,
          pages: { faq: false, product: false, comparison: false },
        },
      },
      { status: 200 }, // Return 200 so frontend can parse JSON
    )
  }
}
