import { z } from "zod"
import type { AgentContext, AgentResult, ComparisonPage, ComparisonProduct } from "../types"
import { callGroqJSON } from "@/lib/groq-client"

const comparisonProductSchema = z.object({
  name: z.string(),
  concentration: z.string(),
  key_ingredients: z.array(z.string()),
  benefits: z.array(z.string()),
  price: z.string(),
})

const comparisonPageSchema = z.object({
  title: z.string(),
  productA: z.object({
    name: z.string(),
    concentration: z.string(),
    ingredients: z.array(z.string()),
    benefits: z.array(z.string()),
    price: z.string(),
    strengths: z.array(z.string()),
  }),
  productB: z.object({
    name: z.string(),
    concentration: z.string(),
    ingredients: z.array(z.string()),
    benefits: z.array(z.string()),
    price: z.string(),
    strengths: z.array(z.string()),
  }),
  comparison: z.array(
    z.object({
      aspect: z.string(),
      productA: z.string(),
      productB: z.string(),
      winner: z.enum(["A", "B", "Tie"]),
    }),
  ),
  recommendation: z.object({
    bestFor: z.record(z.enum(["A", "B"])),
    summary: z.string(),
  }),
})

/**
 * Comparison Template Agent
 * Responsibility: Generate a fictional competitor and create comparison page
 * Demonstrates AI-generated content for competitive analysis
 */
export async function comparisonTemplateAgent(
  context: AgentContext,
): Promise<AgentResult<{ comparisonProduct: ComparisonProduct; comparisonPage: ComparisonPage }>> {
  const startTime = Date.now()
  const agentName = "ComparisonTemplateAgent"
  const agentRole = "Comparison Page Generation"

  try {
    console.log("[v0] ComparisonTemplateAgent: Generating competitor product with AI")

    const productPrompt = `Create a realistic fictional competitor product for this Vitamin C serum. Return JSON with: name, concentration, key_ingredients (array), benefits (array), price.

Current Product:
- Name: ${context.product.name}
- Concentration: ${context.product.concentration}
- Ingredients: ${context.product.key_ingredients.join(", ")}
- Benefits: ${context.product.benefits.join(", ")}
- Price: ${context.product.price}

Generate a different brand with similar but distinct ingredients and different price point.`

    const { data: productB, tokensUsed: productTokens } = await callGroqJSON<{
      name: string
      concentration: string
      key_ingredients: string[]
      benefits: string[]
      price: string
    }>(productPrompt, "llama-3.3-70b-versatile")

    console.log("[v0] ComparisonTemplateAgent: Generating comparison page with AI")

    const comparisonPrompt = `Create a detailed comparison page. Return JSON with: title, productA (name/concentration/ingredients/benefits/price/strengths arrays), productB (same structure), comparison (array with aspect/productA/productB/winner), recommendation (bestFor object and summary).

Product A (${context.product.name}):
- Concentration: ${context.product.concentration}
- Ingredients: ${context.product.key_ingredients.join(", ")}
- Benefits: ${context.product.benefits.join(", ")}
- Price: ${context.product.price}

Product B (${productB.name}):
- Concentration: ${productB.concentration}
- Ingredients: ${productB.key_ingredients.join(", ")}
- Benefits: ${productB.benefits.join(", ")}
- Price: ${productB.price}

Be objective and fair.`

    const { data: comparison, tokensUsed: comparisonTokens } = await callGroqJSON<ComparisonPage>(
      comparisonPrompt,
      "llama-3.3-70b-versatile",
    )

    const executionTimeMs = Date.now() - startTime
    const totalTokens = productTokens + comparisonTokens

    console.log("[v0] ComparisonTemplateAgent: Comparison page generated", {
      tokensUsed: totalTokens,
      executionTimeMs,
    })

    const comparisonProduct: ComparisonProduct = {
      id: crypto.randomUUID(),
      ...productB,
    }

    return {
      agentName,
      agentRole,
      data: {
        comparisonProduct,
        comparisonPage: comparison,
      },
      tokensUsed: totalTokens,
      executionTimeMs,
      status: "success",
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    return {
      agentName,
      agentRole,
      data: {} as { comparisonProduct: ComparisonProduct; comparisonPage: ComparisonPage },
      tokensUsed: 0,
      executionTimeMs,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
