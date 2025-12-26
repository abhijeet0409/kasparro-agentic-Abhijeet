import { callGroq } from "@/lib/groq-client"
import type { AgentContext, AgentResult, Question } from "../types"

/**
 * Answer Generator Agent
 * Responsibility: Generate accurate, helpful answers to questions
 * Uses AI reasoning to provide informative responses based on product data
 */
export async function answerGeneratorAgent(
  context: AgentContext,
  questions: Question[],
): Promise<AgentResult<Question[]>> {
  const startTime = Date.now()
  const agentName = "AnswerGeneratorAgent"
  const agentRole = "FAQ Answer Generation"

  try {
    console.log("[v0] AnswerGeneratorAgent: Generating answers with AI")

    const productInfo = `
Product: ${context.product.name}
Concentration: ${context.product.concentration}
Skin Type: ${context.product.skin_type.join(", ")}
Ingredients: ${context.product.key_ingredients.join(", ")}
Benefits: ${context.product.benefits.join(", ")}
Usage: ${context.product.how_to_use}
Side Effects: ${context.product.side_effects}
Price: ${context.product.price}
`

    let totalTokens = 0
    const answeredQuestions: Question[] = []

    for (const question of questions) {
      const { content, tokensUsed } = await callGroq(
        [
          {
            role: "system",
            content: "You are a knowledgeable skincare expert. Provide clear, concise answers (2-4 sentences).",
          },
          {
            role: "user",
            content: `Answer this customer question about the product with accurate, helpful information. Base your answer ONLY on the provided product data.

${productInfo}

Question (${question.category}): ${question.question}`,
          },
        ],
        "llama-3.1-8b-instant",
        { max_tokens: 200 },
      )

      answeredQuestions.push({
        ...question,
        answer: content.trim(),
      })

      totalTokens += tokensUsed
    }

    const executionTimeMs = Date.now() - startTime

    console.log("[v0] AnswerGeneratorAgent: Generated answers", {
      count: answeredQuestions.length,
      tokensUsed: totalTokens,
      executionTimeMs,
    })

    return {
      agentName,
      agentRole,
      data: answeredQuestions,
      tokensUsed: totalTokens,
      executionTimeMs,
      status: "success",
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    return {
      agentName,
      agentRole,
      data: questions,
      tokensUsed: 0,
      executionTimeMs,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
