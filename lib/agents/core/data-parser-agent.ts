import { callGroqJSON } from "@/lib/groq-client"
import { z } from "zod"
import type { AgentContext, AgentResult, Product } from "../types"

const productSchema = z.object({
  name: z.string(),
  concentration: z.string(),
  skin_type: z.array(z.string()),
  key_ingredients: z.array(z.string()),
  benefits: z.array(z.string()),
  how_to_use: z.string(),
  side_effects: z.string(),
  price: z.string(),
})

/**
 * Data Parser Agent
 * Responsibility: Parse and validate raw product data into structured format
 * This agent ensures data integrity and normalization
 */
export async function dataParserAgent(context: AgentContext): Promise<AgentResult<Product>> {
  const startTime = Date.now()
  const agentName = "DataParserAgent"
  const agentRole = "Data Validation & Normalization"

  try {
    console.log("[v0] DataParserAgent: Parsing product data with AI validation")

    const prompt = `Validate and normalize this product data. Return a JSON object with these exact fields: name, concentration, skin_type (array), key_ingredients (array), benefits (array), how_to_use, side_effects, price.

Product: ${context.product.name}
Concentration: ${context.product.concentration}
Skin Type: ${context.product.skin_type.join(", ")}
Key Ingredients: ${context.product.key_ingredients.join(", ")}
Benefits: ${context.product.benefits.join(", ")}
How to Use: ${context.product.how_to_use}
Side Effects: ${context.product.side_effects}
Price: ${context.product.price}

Return the validated and normalized product data as JSON.`

    const { data, tokensUsed } = await callGroqJSON<Product>(prompt, "llama-3.3-70b-versatile")

    const executionTimeMs = Date.now() - startTime

    console.log("[v0] DataParserAgent: Validation complete", {
      tokensUsed,
      executionTimeMs,
    })

    return {
      agentName,
      agentRole,
      data: { ...context.product, ...data },
      tokensUsed,
      executionTimeMs,
      status: "success",
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    return {
      agentName,
      agentRole,
      data: context.product,
      tokensUsed: 0,
      executionTimeMs,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
