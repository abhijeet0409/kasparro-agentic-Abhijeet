import { callGroqJSON } from "@/lib/groq-client"
import type { AgentStateType } from "../state"
import type { ProductPage } from "../types"

/**
 * Product Template Agent Node (LangGraph)
 * Responsibility: Create comprehensive product landing page
 */
export async function productTemplateNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now()
  const agentName = "ProductTemplateAgent"
  const agentRole = "Product Page Creation & Content Assembly"

  console.log("[v0] LangGraph: ProductTemplateAgent starting")

  try {
    const product = state.parsedProduct

    const prompt = `You are a product marketing specialist. Create a compelling product landing page for this product.

Product: ${product?.name}
Concentration: ${product?.concentration}
Skin Types: ${product?.skin_type?.join(", ")}
Ingredients: ${product?.key_ingredients?.join(", ")}
Benefits: ${product?.benefits?.join(", ")}
Usage: ${product?.how_to_use}
Side Effects: ${product?.side_effects}
Price: ${product?.price}

Return JSON with this structure:
{
  "title": "[Product Name]",
  "tagline": "A catchy tagline (5-10 words)",
  "description": "Compelling product description (2-3 sentences)",
  "keyFeatures": [
    { "title": "Feature name", "description": "Feature benefit" }
  ],
  "ingredients": [
    { "name": "Ingredient", "benefit": "What it does" }
  ],
  "usage": {
    "title": "How to Use",
    "steps": ["Step 1", "Step 2", "Step 3"],
    "tips": ["Tip 1", "Tip 2"]
  },
  "safety": {
    "warnings": ["Warning 1", "Warning 2"],
    "sideEffects": ["Side effect details"]
  },
  "pricing": {
    "price": "${product?.price}",
    "valueProposition": "Why it's worth it (1 sentence)"
  }
}`

    const { data, tokensUsed } = await callGroqJSON<ProductPage>(prompt, "llama-3.3-70b-versatile")

    const executionTimeMs = Date.now() - startTime

    console.log("[v0] LangGraph: ProductTemplateAgent complete", { tokensUsed })

    return {
      productPage: data,
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
    console.error("[v0] LangGraph: ProductTemplateAgent error", error)
    console.log("[v0] Creating fallback product page")

    const product = state.parsedProduct
    const fallbackProductPage: ProductPage = {
      title: product?.name || "Product",
      tagline: `Premium ${product?.category || "skincare"} solution`,
      description: `${product?.name} is a ${product?.concentration} formula designed for ${product?.skin_type?.join(", ")} skin types. ${product?.benefits?.[0] || "Experience the benefits of advanced skincare."}`,
      keyFeatures: (product?.benefits || []).slice(0, 4).map((benefit) => ({
        title: benefit.split(":")[0] || benefit,
        description: benefit.split(":")[1] || benefit,
      })),
      ingredients: (product?.key_ingredients || []).map((ing) => ({
        name: ing,
        benefit: "Key active ingredient for optimal results",
      })),
      usage: {
        title: "How to Use",
        steps: product?.how_to_use
          ? [product.how_to_use]
          : ["Apply to clean skin", "Use as directed", "For best results, use daily"],
        tips: ["Perform a patch test before first use", "Store in a cool, dry place"],
      },
      safety: {
        warnings: ["For external use only", "Avoid contact with eyes"],
        sideEffects: product?.side_effects ? [product.side_effects] : ["Discontinue use if irritation occurs"],
      },
      pricing: {
        price: product?.price || "$0.00",
        valueProposition: "Quality skincare at an accessible price",
      },
    }

    const executionTimeMs = Date.now() - startTime

    return {
      productPage: fallbackProductPage,
      errors: [
        ...state.errors,
        `ProductTemplateAgent used fallback: ${error instanceof Error ? error.message : "Unknown error"}`,
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
