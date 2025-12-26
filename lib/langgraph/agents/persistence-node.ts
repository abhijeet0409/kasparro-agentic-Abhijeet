import { createAdminClient } from "@/lib/supabase/server"
import type { AgentStateType } from "../state"

/**
 * Persistence Agent Node (LangGraph)
 * Responsibility: Save all generated content to Supabase
 * This runs in parallel after template agents complete
 */
export async function persistenceNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now()
  const agentName = "PersistenceAgent"
  const agentRole = "Database Storage & Finalization"

  console.log("[v0] PersistenceAgent: Starting database saves")

  try {
    const supabase = createAdminClient()

    // Save questions
    if (state.questions.length > 0) {
      const questionsToInsert = state.questions.map((q) => ({
        product_id: state.productId,
        generation_id: state.generationId,
        category: q.category,
        question: q.question,
        answer: state.answers.find((a) => a.question === q.question)?.answer || null,
      }))

      const { error: questionsError } = await supabase.from("generated_questions").insert(questionsToInsert)
      if (questionsError) {
        console.error("[v0] PersistenceAgent: Failed to save questions", questionsError)
        throw new Error(`Failed to save questions: ${questionsError.message}`)
      }
      console.log("[v0] PersistenceAgent: Saved questions", { count: questionsToInsert.length })
    }

    // Save FAQ page
    if (state.faqPage) {
      const { error: faqError } = await supabase.from("generated_pages").insert({
        product_id: state.productId,
        generation_id: state.generationId,
        page_type: "faq",
        content: state.faqPage,
        agent_metadata: {
          executionId: state.executionId,
          agentLogs: state.agentLogs,
        },
      })
      if (faqError) {
        console.error("[v0] PersistenceAgent: Failed to save FAQ page", faqError)
        throw new Error(`Failed to save FAQ page: ${faqError.message}`)
      }
      console.log("[v0] PersistenceAgent: Saved FAQ page")
    }

    // Save Product page
    if (state.productPage) {
      const { error: productError } = await supabase.from("generated_pages").insert({
        product_id: state.productId,
        generation_id: state.generationId,
        page_type: "product",
        content: state.productPage,
        agent_metadata: {
          executionId: state.executionId,
          agentLogs: state.agentLogs,
        },
      })
      if (productError) {
        console.error("[v0] PersistenceAgent: Failed to save product page", productError)
        throw new Error(`Failed to save product page: ${productError.message}`)
      }
      console.log("[v0] PersistenceAgent: Saved product page")
    }

    // Save Comparison page and competitor
    if (state.comparisonPage && state.competitorProduct) {
      // Save competitor first
      const { error: competitorError } = await supabase.from("comparison_products").upsert({
        id: state.competitorProduct.id,
        name: state.competitorProduct.name,
        concentration: state.competitorProduct.concentration,
        key_ingredients: state.competitorProduct.key_ingredients,
        benefits: state.competitorProduct.benefits,
        price: state.competitorProduct.price,
      })
      if (competitorError) {
        console.error("[v0] PersistenceAgent: Failed to save competitor", competitorError)
        throw new Error(`Failed to save competitor: ${competitorError.message}`)
      }
      console.log("[v0] PersistenceAgent: Saved competitor product")

      // Save comparison page
      const { error: comparisonError } = await supabase.from("generated_pages").insert({
        product_id: state.productId,
        generation_id: state.generationId,
        page_type: "comparison",
        content: state.comparisonPage,
        agent_metadata: {
          executionId: state.executionId,
          competitorProductId: state.competitorProduct.id,
          agentLogs: state.agentLogs,
        },
      })
      if (comparisonError) {
        console.error("[v0] PersistenceAgent: Failed to save comparison page", comparisonError)
        throw new Error(`Failed to save comparison page: ${comparisonError.message}`)
      }
      console.log("[v0] PersistenceAgent: Saved comparison page")
    }

    // Save agent logs
    for (const log of state.agentLogs) {
      const { error: logError } = await supabase.from("agent_logs").insert({
        execution_id: state.executionId,
        generation_id: state.generationId,
        agent_name: log.agentName,
        agent_role: log.role,
        tokens_used: log.tokensUsed,
        execution_time_ms: log.executionTimeMs,
        status: log.status,
        error_message: log.errorMessage,
      })
      if (logError) {
        console.error("[v0] PersistenceAgent: Failed to save agent log", logError)
        // Don't throw here - continue saving other logs
      }
    }

    const executionTimeMs = Date.now() - startTime

    console.log("[v0] PersistenceAgent: All data saved successfully", { executionTimeMs })

    return {
      agentLogs: [
        ...state.agentLogs,
        {
          agentName,
          role: agentRole,
          tokensUsed: 0,
          executionTimeMs,
          status: "success",
        },
      ],
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    console.error("[v0] PersistenceAgent: Critical error", error)

    return {
      errors: [...state.errors, `PersistenceAgent: ${error instanceof Error ? error.message : "Unknown error"}`],
      agentLogs: [
        ...state.agentLogs,
        {
          agentName,
          role: agentRole,
          tokensUsed: 0,
          executionTimeMs,
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      ],
    }
  }
}
