import { callGroqJSON } from "@/lib/groq-client"
import type { AgentStateType } from "../state"

/**
 * Question Generator Agent Node (LangGraph)
 * Responsibility: Generate 15+ categorized questions
 */
export async function questionGeneratorNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now()
  const agentName = "QuestionGeneratorAgent"
  const agentRole = "Question Generation & Categorization"

  console.log("[v0] LangGraph: QuestionGeneratorAgent starting")

  try {
    const product = state.parsedProduct

    const prompt = `You are a question generation specialist. Generate EXACTLY 15 diverse, categorized questions about this product.

Product: ${product?.name}
Concentration: ${product?.concentration}
Skin Types: ${product?.skin_type?.join(", ")}
Ingredients: ${product?.key_ingredients?.join(", ")}
Benefits: ${product?.benefits?.join(", ")}

Categories: Informational, Safety, Usage, Purchase, Comparison, Ingredients, Benefits, Side Effects, Results

Return JSON: {
  "questions": [
    { "id": "q1", "category": "Informational", "question": "..." },
    ...15 total questions...
  ]
}`

    const { data, tokensUsed } = await callGroqJSON<{
      questions: Array<{ id: string; category: string; question: string }>
    }>(prompt, "llama-3.3-70b-versatile")

    const executionTimeMs = Date.now() - startTime

    console.log("[v0] LangGraph: QuestionGeneratorAgent complete", {
      questionsGenerated: data.questions.length,
      tokensUsed,
    })

    return {
      questions: data.questions,
      agentLogs: [
        ...state.agentLogs,
        {
          agentName,
          role: agentRole,
          tokensUsed,
          executionTimeMs,
          status: "success",
        },
      ],
      memory: {
        ...state.memory,
        questionsGenerated: data.questions.length,
        questionCategories: [...new Set(data.questions.map((q) => q.category))],
      },
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    console.error("[v0] LangGraph: QuestionGeneratorAgent error", error)

    return {
      errors: [...state.errors, `QuestionGeneratorAgent: ${error instanceof Error ? error.message : "Unknown error"}`],
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
      retryCount: state.retryCount + 1,
    }
  }
}
