import { callGroq } from "@/lib/groq-client"
import type { AgentStateType } from "../state"

/**
 * Answer Generator Agent Node (LangGraph)
 * Responsibility: Generate AI-powered answers for all questions
 */
export async function answerGeneratorNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now()
  const agentName = "AnswerGeneratorAgent"
  const agentRole = "Answer Generation & Content Creation"

  console.log("[v0] LangGraph: AnswerGeneratorAgent starting", {
    questionsToAnswer: state.questions.length,
  })

  try {
    const product = state.parsedProduct

    if (!state.questions || state.questions.length === 0) {
      throw new Error("No questions available to generate answers")
    }

    let totalTokens = 0
    const answers: Array<{ question: string; answer: string; category: string }> = []

    // Generate answers for each question
    for (const q of state.questions) {
      if (!q.question || !q.category) {
        console.warn("[v0] Skipping invalid question:", q)
        continue
      }

      const prompt = `You are an expert product consultant. Answer this question about ${product?.name} comprehensively and accurately.

Product Details:
- Name: ${product?.name}
- Concentration: ${product?.concentration}
- Skin Types: ${product?.skin_type?.join(", ")}
- Ingredients: ${product?.key_ingredients?.join(", ")}
- Benefits: ${product?.benefits?.join(", ")}
- Usage: ${product?.how_to_use}
- Side Effects: ${product?.side_effects}
- Price: ${product?.price}

Question: ${q.question}
Category: ${q.category}

Provide a detailed, helpful answer (2-4 sentences). Be informative and accurate.`

      try {
        const { content, tokensUsed } = await callGroq(
          [
            {
              role: "system",
              content: "You are an expert product consultant providing detailed, accurate answers.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          "llama-3.1-8b-instant",
        )
        totalTokens += tokensUsed

        answers.push({
          question: q.question,
          answer: content,
          category: q.category,
        })
      } catch (error) {
        console.error("[v0] Failed to generate answer for question:", q.question, error)
        // Continue to next question instead of failing completely
      }
    }

    if (answers.length === 0) {
      throw new Error("Failed to generate any answers - all API calls failed")
    }

    const executionTimeMs = Date.now() - startTime

    const avgAnswerLength =
      answers.length > 0 ? Math.round(answers.reduce((sum, a) => sum + a.answer.length, 0) / answers.length) : 0

    console.log("[v0] LangGraph: AnswerGeneratorAgent complete", {
      answersGenerated: answers.length,
      totalTokens,
    })

    return {
      answers,
      agentLogs: [
        ...state.agentLogs,
        {
          agentName,
          role: agentRole,
          tokensUsed: totalTokens,
          executionTimeMs,
          status: "success",
        },
      ],
      memory: {
        ...state.memory,
        answersGenerated: answers.length,
        avgAnswerLength,
      },
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    console.error("[v0] LangGraph: AnswerGeneratorAgent error", error)

    return {
      answers: [],
      errors: [...state.errors, `AnswerGeneratorAgent: ${error instanceof Error ? error.message : "Unknown error"}`],
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
