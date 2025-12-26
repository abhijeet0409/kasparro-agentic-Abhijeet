import { callGroqJSON } from "@/lib/groq-client"
import { z } from "zod"
import type { AgentContext, AgentResult, Question } from "../types"

const questionsSchema = z.object({
  questions: z.array(
    z.object({
      category: z.enum([
        "Informational",
        "Safety",
        "Usage",
        "Purchase",
        "Comparison",
        "Ingredients",
        "Results",
        "Suitability",
      ]),
      question: z.string(),
    }),
  ),
})

/**
 * Question Generator Agent
 * Responsibility: Generate diverse, categorized questions about the product
 * Uses AI to create natural, user-focused questions (minimum 15)
 */
export async function questionGeneratorAgent(context: AgentContext): Promise<AgentResult<Question[]>> {
  const startTime = Date.now()
  const agentName = "QuestionGeneratorAgent"
  const agentRole = "FAQ Question Generation"

  try {
    console.log("[v0] QuestionGeneratorAgent: Generating questions with AI")

    const prompt = `Generate at least 15 diverse, natural questions that real customers would ask about this product. Return a JSON object with a "questions" array. Each question should have "category" (one of: Informational, Safety, Usage, Purchase, Comparison, Ingredients, Results, Suitability) and "question" fields.

Product Information:
- Name: ${context.product.name}
- Concentration: ${context.product.concentration}
- Skin Type: ${context.product.skin_type.join(", ")}
- Ingredients: ${context.product.key_ingredients.join(", ")}
- Benefits: ${context.product.benefits.join(", ")}
- Usage: ${context.product.how_to_use}
- Side Effects: ${context.product.side_effects}
- Price: ${context.product.price}

Generate questions that sound natural and conversational, not robotic. Return as JSON with format: {"questions": [{"category": "...", "question": "..."}]}`

    const { data, tokensUsed } = await callGroqJSON<{ questions: Array<{ category: string; question: string }> }>(
      prompt,
      "llama-3.3-70b-versatile",
    )

    const questions: Question[] = data.questions.map((q, idx) => ({
      id: `q${idx + 1}`,
      category: q.category as Question["category"],
      question: q.question,
    }))

    const executionTimeMs = Date.now() - startTime

    console.log("[v0] QuestionGeneratorAgent: Generated questions", {
      count: questions.length,
      tokensUsed,
      executionTimeMs,
    })

    return {
      agentName,
      agentRole,
      data: questions,
      tokensUsed,
      executionTimeMs,
      status: "success",
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    return {
      agentName,
      agentRole,
      data: [],
      tokensUsed: 0,
      executionTimeMs,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
