import { createClient } from "@/lib/supabase/server"
import type { Product, AgentContext } from "./types"
import { dataParserAgent } from "./core/data-parser-agent"
import { questionGeneratorAgent } from "./core/question-generator-agent"
import { answerGeneratorAgent } from "./core/answer-generator-agent"
import { faqTemplateAgent } from "./templates/faq-template-agent"
import { productTemplateAgent } from "./templates/product-template-agent"
import { comparisonTemplateAgent } from "./templates/comparison-template-agent"

/**
 * Agent Orchestrator
 * Coordinates the execution of multiple agents in a structured workflow
 * Manages state, logs execution, and handles errors
 */
export async function orchestrateContentGeneration(productId: string) {
  const executionId = crypto.randomUUID()
  const supabase = await createClient()

  console.log("[v0] Orchestrator: Starting content generation", { executionId, productId })

  try {
    // Fetch product data from database
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single()

    if (productError || !product) {
      throw new Error("Product not found")
    }

    // Create agent context
    const context: AgentContext = {
      executionId,
      product: product as Product,
      startTime: Date.now(),
    }

    // AGENT 1: Data Parser Agent
    const parsedResult = await dataParserAgent(context)
    await logAgentExecution(supabase, executionId, parsedResult)

    if (parsedResult.status === "error") {
      throw new Error(`Data parsing failed: ${parsedResult.errorMessage}`)
    }

    // Update context with validated product data
    context.product = parsedResult.data

    // AGENT 2: Question Generator Agent
    const questionsResult = await questionGeneratorAgent(context)
    await logAgentExecution(supabase, executionId, questionsResult)

    if (questionsResult.status === "error" || questionsResult.data.length === 0) {
      throw new Error(`Question generation failed: ${questionsResult.errorMessage}`)
    }

    // Store generated questions in database
    const questionsToInsert = questionsResult.data.map((q) => ({
      product_id: productId,
      category: q.category,
      question: q.question,
      answer: null,
    }))

    await supabase.from("generated_questions").insert(questionsToInsert)

    // AGENT 3: Answer Generator Agent
    const answersResult = await answerGeneratorAgent(context, questionsResult.data)
    await logAgentExecution(supabase, executionId, answersResult)

    if (answersResult.status === "error") {
      throw new Error(`Answer generation failed: ${answersResult.errorMessage}`)
    }

    // Update questions with answers
    for (const q of answersResult.data) {
      await supabase
        .from("generated_questions")
        .update({ answer: q.answer })
        .eq("product_id", productId)
        .eq("question", q.question)
    }

    // AGENT 4: FAQ Template Agent
    const faqResult = await faqTemplateAgent(context, answersResult.data)
    await logAgentExecution(supabase, executionId, faqResult)

    if (faqResult.status === "success") {
      await supabase.from("generated_pages").insert({
        product_id: productId,
        page_type: "faq",
        content: faqResult.data,
        agent_metadata: {
          executionId,
          tokensUsed: faqResult.tokensUsed,
          executionTimeMs: faqResult.executionTimeMs,
        },
      })
    }

    // AGENT 5: Product Template Agent
    const productResult = await productTemplateAgent(context)
    await logAgentExecution(supabase, executionId, productResult)

    if (productResult.status === "success") {
      await supabase.from("generated_pages").insert({
        product_id: productId,
        page_type: "product",
        content: productResult.data,
        agent_metadata: {
          executionId,
          tokensUsed: productResult.tokensUsed,
          executionTimeMs: productResult.executionTimeMs,
        },
      })
    }

    // AGENT 6: Comparison Template Agent
    const comparisonResult = await comparisonTemplateAgent(context)
    await logAgentExecution(supabase, executionId, comparisonResult)

    if (comparisonResult.status === "success") {
      // Store the fictional competitor product
      await supabase.from("comparison_products").insert({
        id: comparisonResult.data.comparisonProduct.id,
        name: comparisonResult.data.comparisonProduct.name,
        concentration: comparisonResult.data.comparisonProduct.concentration,
        key_ingredients: comparisonResult.data.comparisonProduct.key_ingredients,
        benefits: comparisonResult.data.comparisonProduct.benefits,
        price: comparisonResult.data.comparisonProduct.price,
      })

      // Store the comparison page
      await supabase.from("generated_pages").insert({
        product_id: productId,
        page_type: "comparison",
        content: comparisonResult.data.comparisonPage,
        agent_metadata: {
          executionId,
          comparisonProductId: comparisonResult.data.comparisonProduct.id,
          tokensUsed: comparisonResult.tokensUsed,
          executionTimeMs: comparisonResult.executionTimeMs,
        },
      })
    }

    const totalExecutionTime = Date.now() - context.startTime

    console.log("[v0] Orchestrator: Content generation complete", {
      executionId,
      totalExecutionTime,
      agentsExecuted: 6,
    })

    return {
      success: true,
      executionId,
      totalExecutionTime,
      results: {
        faq: faqResult.status === "success",
        product: productResult.status === "success",
        comparison: comparisonResult.status === "success",
      },
    }
  } catch (error) {
    console.error("[v0] Orchestrator: Execution failed", error)

    return {
      success: false,
      executionId,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function logAgentExecution(
  supabase: Awaited<ReturnType<typeof createClient>>,
  executionId: string,
  result: {
    agentName: string
    agentRole: string
    data: unknown
    tokensUsed: number
    executionTimeMs: number
    status: string
    errorMessage?: string
  },
) {
  await supabase.from("agent_logs").insert({
    execution_id: executionId,
    agent_name: result.agentName,
    agent_role: result.agentRole,
    input_data: {},
    output_data: result.data,
    tokens_used: result.tokensUsed,
    execution_time_ms: result.executionTimeMs,
    status: result.status,
    error_message: result.errorMessage,
  })
}
