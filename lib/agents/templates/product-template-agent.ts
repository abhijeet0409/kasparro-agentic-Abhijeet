import { z } from "zod"
import type { AgentContext, AgentResult, ProductPage } from "../types"
import { callGroqJSON } from "@/lib/groq-client"

const productPageSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  description: z.string(),
  keyFeatures: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
  ingredients: z.array(
    z.object({
      name: z.string(),
      benefit: z.string(),
    }),
  ),
  usage: z.object({
    title: z.string(),
    steps: z.array(z.string()),
    tips: z.array(z.string()),
  }),
  safety: z.object({
    warnings: z.array(z.string()),
    sideEffects: z.array(z.string()),
  }),
  pricing: z.object({
    price: z.string(),
    valueProposition: z.string(),
  }),
})

/**
 * Product Template Agent
 * Responsibility: Create a comprehensive product description page
 * Uses content logic blocks to structure product information
 */
export async function productTemplateAgent(context: AgentContext): Promise<AgentResult<ProductPage>> {
  const startTime = Date.now()
  const agentName = "ProductTemplateAgent"
  const agentRole = "Product Page Generation"

  try {
    console.log("[v0] ProductTemplateAgent: Generating product page with AI")

    const prompt = `Create a compelling product page. Return JSON with: title, tagline, description, keyFeatures (array with title/description), ingredients (array with name/benefit), usage (title/steps/tips arrays), safety (warnings/sideEffects arrays), pricing (price/valueProposition).

Product Information:
- Name: ${context.product.name}
- Concentration: ${context.product.concentration}
- Skin Type: ${context.product.skin_type.join(", ")}
- Ingredients: ${context.product.key_ingredients.join(", ")}
- Benefits: ${context.product.benefits.join(", ")}
- Usage: ${context.product.how_to_use}
- Side Effects: ${context.product.side_effects}
- Price: ${context.product.price}

Make it professional and persuasive.`

    const { data, tokensUsed } = await callGroqJSON<ProductPage>(prompt, "llama-3.3-70b-versatile")

    const executionTimeMs = Date.now() - startTime

    console.log("[v0] ProductTemplateAgent: Product page generated", {
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
    return {
      agentName,
      agentRole,
      data: {} as ProductPage,
      tokensUsed: 0,
      executionTimeMs,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
