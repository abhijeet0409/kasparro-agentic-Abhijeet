import { callGroqJSON } from "@/lib/groq-client"
import type { AgentStateType } from "../state"
import type { FAQPage } from "../types"

/**
 * FAQ Template Agent Node (LangGraph)
 * Responsibility: Format Q&As into structured FAQ page
 */
export async function faqTemplateNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now()
  const agentName = "FAQTemplateAgent"
  const agentRole = "FAQ Page Assembly & Formatting"

  console.log("[v0] LangGraph: FAQTemplateAgent starting")

  try {
    const categories = [...new Set(state.answers.map((a) => a.category))]
    const selectedAnswers = categories
      .flatMap((cat) => state.answers.filter((a) => a.category === cat))
      .slice(0, 10)
      .filter(Boolean)

    if (selectedAnswers.length === 0) {
      console.log("[v0] No answers available, creating fallback FAQ from questions")
      const fallbackFAQ: FAQPage = {
        title: `Frequently Asked Questions - ${state.parsedProduct?.name || "Product"}`,
        description: "Common questions about this product. Answers are being generated.",
        faqs: state.questions.slice(0, 10).map((q) => ({
          category: q.category,
          question: q.question,
          answer: "Answer pending. Please check back later or contact customer support for details.",
        })),
      }

      return {
        faqPage: fallbackFAQ,
        agentLogs: [
          ...state.agentLogs,
          {
            agentName,
            role: agentRole,
            tokensUsed: 0,
            executionTimeMs: Date.now() - startTime,
            status: "success",
          },
        ],
      }
    }

    const prompt = `You are a content formatting specialist. Create a structured FAQ page from these Q&As.

Product: ${state.parsedProduct?.name}

Q&As:
${selectedAnswers.map((a, i) => `${i + 1}. [${a.category}] Q: ${a.question}\n   A: ${a.answer}`).join("\n\n")}

Return JSON with this structure:
{
  "title": "Frequently Asked Questions - [Product Name]",
  "description": "A brief intro (1 sentence)",
  "faqs": [
    { "category": "...", "question": "...", "answer": "..." }
  ]
}`

    const { data, tokensUsed } = await callGroqJSON<FAQPage>(prompt, "llama-3.3-70b-versatile")

    const executionTimeMs = Date.now() - startTime

    console.log("[v0] LangGraph: FAQTemplateAgent complete", { tokensUsed })

    return {
      faqPage: data,
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
    }
  } catch (error) {
    console.error("[v0] LangGraph: FAQTemplateAgent error", error)
    console.log("[v0] Creating fallback FAQ page")

    const fallbackFAQ: FAQPage = {
      title: `Frequently Asked Questions - ${state.parsedProduct?.name || "Product"}`,
      description: `Common questions about ${state.parsedProduct?.name || "this product"}.`,
      faqs: state.answers.slice(0, 10).map((a) => ({
        category: a.category,
        question: a.question,
        answer: a.answer,
      })),
    }

    const executionTimeMs = Date.now() - startTime

    return {
      faqPage: fallbackFAQ,
      errors: [
        ...state.errors,
        `FAQTemplateAgent used fallback: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
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
  }
}
