import { callGroqJSON } from "@/lib/groq-client"
import type { AgentStateType } from "../state"
import type { ComparisonPage, Product } from "../types"
import crypto from "crypto"

/**
 * Comparison Template Agent Node (LangGraph)
 * Responsibility: Generate fictional competitor and create comparison page
 */
export async function comparisonTemplateNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now()
  const agentName = "ComparisonTemplateAgent"
  const agentRole = "Competitor Generation & Comparison Analysis"

  console.log("[v0] LangGraph: ComparisonTemplateAgent starting")

  try {
    const product = state.parsedProduct

    // First: Generate fictional competitor
    const competitorPrompt = `You are a product analyst. Create a FICTIONAL competitor product to ${product?.name}.

Original Product:
- Name: ${product?.name}
- Concentration: ${product?.concentration}
- Ingredients: ${product?.key_ingredients?.join(", ")}
- Price: ${product?.price}

Create a fictional competitor with similar properties but different brand. Return JSON:
{
  "id": "[valid UUID without any prefix]",
  "name": "Fictional Brand [Product Type]",
  "concentration": "Similar concentration",
  "skin_type": ["Similar skin types"],
  "key_ingredients": ["3-4 ingredients, some overlap"],
  "benefits": ["Similar benefits"],
  "how_to_use": "Similar usage",
  "side_effects": "Similar warnings",
  "price": "Price 10-20% different"
}

IMPORTANT: The "id" must be a valid UUID format like "43a21f6e-4e3c-4d8e-9c2a-51f4b5c6d7e8" without any prefixes.`

    const { data: competitor, tokensUsed: competitorTokens } = await callGroqJSON<Product>(
      competitorPrompt,
      "llama-3.3-70b-versatile",
    )

    if (
      !competitor.id ||
      competitor.id.includes("comp-") ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(competitor.id)
    ) {
      competitor.id = crypto.randomUUID()
    }

    // Second: Create comparison page
    const comparisonPrompt = `You are a product comparison specialist. Create a detailed comparison page between these two products.

Product A: ${product?.name}
- Concentration: ${product?.concentration}
- Ingredients: ${product?.key_ingredients?.join(", ")}
- Benefits: ${product?.benefits?.join(", ")}
- Price: ${product?.price}

Product B: ${competitor.name}
- Concentration: ${competitor.concentration}
- Ingredients: ${competitor.key_ingredients?.join(", ")}
- Benefits: ${competitor.benefits?.join(", ")}
- Price: ${competitor.price}

Return JSON with this structure:
{
  "title": "Product Comparison: [A] vs [B]",
  "productA": {
    "name": "...",
    "concentration": "...",
    "price": "...",
    "ingredients": [...],
    "benefits": [...],
    "strengths": ["3-4 key strengths"]
  },
  "productB": {
    "name": "...",
    "concentration": "...",
    "price": "...",
    "ingredients": [...],
    "benefits": [...],
    "strengths": ["3-4 key strengths"]
  },
  "comparison": [
    { "aspect": "Price", "productA": "...", "productB": "...", "winner": "A|B|Tie" },
    { "aspect": "Concentration", "productA": "...", "productB": "...", "winner": "A|B|Tie" },
    { "aspect": "Ingredients", "productA": "...", "productB": "...", "winner": "A|B|Tie" },
    { "aspect": "Effectiveness", "productA": "...", "productB": "...", "winner": "A|B|Tie" }
  ],
  "recommendation": {
    "bestFor": {
      "Budget-conscious": "A|B",
      "Sensitive skin": "A|B",
      "Maximum results": "A|B"
    },
    "summary": "Overall recommendation (2 sentences)"
  }
}`

    const { data: comparison, tokensUsed: comparisonTokens } = await callGroqJSON<ComparisonPage>(
      comparisonPrompt,
      "llama-3.3-70b-versatile",
    )

    const executionTimeMs = Date.now() - startTime
    const totalTokens = competitorTokens + comparisonTokens

    console.log("[v0] LangGraph: ComparisonTemplateAgent complete", { totalTokens })

    return {
      competitorProduct: competitor,
      comparisonPage: comparison,
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
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    console.error("[v0] LangGraph: ComparisonTemplateAgent error", error)

    return {
      errors: [...state.errors, `ComparisonTemplateAgent: ${error instanceof Error ? error.message : "Unknown error"}`],
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
    }
  }
}
