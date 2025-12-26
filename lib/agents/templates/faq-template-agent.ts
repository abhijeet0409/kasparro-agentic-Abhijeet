import { callGroqJSON } from "@/lib/groq-client"
import { z } from "zod"
import type { AgentContext, AgentResult, FAQPage, Question } from "../types"

const faqPageSchema = z.object({
  title: z.string(),
  description: z.string(),
  faqs: z.array(
    z.object({
      category: z.string(),
      question: z.string(),
      answer: z.string(),
    }),
  ),
})

/**
 * FAQ Template Agent
 * Responsibility: Structure Q&As into a formatted FAQ page
 * Applies content logic and template rules
 */
export async function faqTemplateAgent(context: AgentContext, questions: Question[]): Promise<AgentResult<FAQPage>> {
  const startTime = Date.now()
  const agentName = "FAQTemplateAgent"
  const agentRole = "FAQ Page Assembly & Formatting"

  try {
    console.log("[v0] FAQTemplateAgent: Assembling FAQ page with AI")

    const selectedQuestions = questions.slice(0, Math.max(5, questions.length))

    const prompt = `Create a professional FAQ page structure for this product. Return JSON with: title, description, and faqs array (each with category, question, answer).

Product: ${context.product.name}

Questions and Answers:
${selectedQuestions.map((q) => `Category: ${q.category}\nQ: ${q.question}\nA: ${q.answer}`).join("\n\n")}

Return JSON format: {"title": "...", "description": "...", "faqs": [{"category": "...", "question": "...", "answer": "..."}]}`

    const { data, tokensUsed } = await callGroqJSON<FAQPage>(prompt, "llama-3.3-70b-versatile")

    const executionTimeMs = Date.now() - startTime

    console.log("[v0] FAQTemplateAgent: FAQ page assembled", {
      faqCount: data.faqs.length,
      tokensUsed,
      executionTimeMs,
    })

    return {
      agentName,
      agentRole,
      data,
      tokensUsed,
      executionTimeMs,
      status: "success",
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime

    const fallbackPage: FAQPage = {
      title: `Frequently Asked Questions - ${context.product.name}`,
      description: `Find answers to common questions about ${context.product.name}.`,
      faqs: questions.slice(0, 5).map((q) => ({
        category: q.category,
        question: q.question,
        answer: q.answer || "Answer not available",
      })),
    }

    return {
      agentName,
      agentRole,
      data: fallbackPage,
      tokensUsed: 0,
      executionTimeMs,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
