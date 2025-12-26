import { createClient } from "@/lib/supabase/server"
import { createContentGenerationGraph } from "./graph"
import { createInitialState } from "./state"
import type { Product } from "./types"
import crypto from "crypto"

/**
 * LangGraph Orchestrator
 * Entry point for the multi-agent content generation system
 * Uses LangGraph for state management, agent coordination, and conditional execution
 */
export async function orchestrateWithLangGraph(productId: string) {
  const executionId = crypto.randomUUID()
  const startTime = Date.now()

  console.log("[v0] LangGraph: Starting content generation", { executionId, productId })

  try {
    const supabase = await createClient()

    // Fetch product from database with retry logic
    let product = null
    let productError = null

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase.from("products").select("*").eq("id", productId).single()

      if (data) {
        product = data
        break
      }

      productError = error

      if (attempt < 2) {
        console.log(`[v0] Product fetch attempt ${attempt + 1} failed, retrying...`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    if (productError || !product) {
      console.error("[v0] LangGraph: Product not found", {
        productId,
        error: productError,
        errorMessage: productError?.message,
      })
      throw new Error(`Product not found: ${productId}. Please select a product from the list and try again.`)
    }

    console.log("[v0] LangGraph: Product loaded", { productId, productName: product.name })

    const initialState = createInitialState(executionId, productId, product as Product)

    // Create and run the graph
    console.log("[v0] LangGraph: Creating graph")
    const graph = createContentGenerationGraph()

    console.log("[v0] LangGraph: Invoking graph with initial state")
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Graph execution timeout after 5 minutes")), 300000),
    )

    const finalState = await Promise.race([graph.invoke(initialState), timeoutPromise])

    const totalExecutionTime = Date.now() - startTime

    const hasErrors = finalState.errors && finalState.errors.length > 0

    console.log("[v0] LangGraph: Content generation complete", {
      executionId,
      totalExecutionTime,
      errors: finalState.errors?.length || 0,
      agentLogs: finalState.agentLogs?.length || 0,
      questionsGenerated: finalState.questions?.length || 0,
      answersGenerated: finalState.answers?.length || 0,
      hasErrors,
    })

    return {
      success: !hasErrors || finalState.faqPage !== null || finalState.productPage !== null,
      executionId,
      totalExecutionTime,
      results: {
        faq: finalState.faqPage !== null,
        product: finalState.productPage !== null,
        comparison: finalState.comparisonPage !== null,
      },
      agentLogs: finalState.agentLogs || [],
      errors: finalState.errors || [],
      memory: finalState.memory || {},
      generated: {
        questions: finalState.questions?.length || 0,
        answers: finalState.answers?.length || 0,
        pages: {
          faq: !!finalState.faqPage,
          product: !!finalState.productPage,
          comparison: !!finalState.comparisonPage,
        },
      },
    }
  } catch (error) {
    console.error("[v0] LangGraph: Orchestration failed", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error("[v0] LangGraph: Error details", { errorMessage, errorStack })

    return {
      success: false,
      executionId,
      totalExecutionTime: Date.now() - startTime,
      error: errorMessage,
      errors: [errorMessage],
      agentLogs: [],
      results: {
        faq: false,
        product: false,
        comparison: false,
      },
      generated: {
        questions: 0,
        answers: 0,
        pages: {
          faq: false,
          product: false,
          comparison: false,
        },
      },
    }
  }
}
