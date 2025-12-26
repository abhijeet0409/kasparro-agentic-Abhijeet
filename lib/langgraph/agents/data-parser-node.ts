import { callGroqJSON } from "@/lib/groq-client"
import type { AgentStateType } from "../state"
import type { Product } from "../types"

/**
 * Data Parser Agent Node (LangGraph)
 * Responsibility: Parse and validate raw product data
 * This is the entry point of the graph
 */
export async function dataParserNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const startTime = Date.now()
  const agentName = "DataParserAgent"
  const agentRole = "Data Validation & Normalization"

  console.log("[v0] LangGraph: DataParserAgent starting", { executionId: state.executionId })

  try {
    const prompt = `You are a data validation agent. Parse and normalize this product data into structured JSON.

Product: ${state.rawProduct?.name}
Concentration: ${state.rawProduct?.concentration}
Skin Type: ${state.rawProduct?.skin_type?.join(", ")}
Key Ingredients: ${state.rawProduct?.key_ingredients?.join(", ")}
Benefits: ${state.rawProduct?.benefits?.join(", ")}
How to Use: ${state.rawProduct?.how_to_use}
Side Effects: ${state.rawProduct?.side_effects}
Price: ${state.rawProduct?.price}

Return a clean JSON object with: name, concentration, skin_type (array), key_ingredients (array), benefits (array), how_to_use, side_effects, price.`

    const { data, tokensUsed } = await callGroqJSON<Product>(prompt, "llama-3.3-70b-versatile")

    const executionTimeMs = Date.now() - startTime

    console.log("[v0] LangGraph: DataParserAgent complete", { tokensUsed, executionTimeMs })

    return {
      parsedProduct: { ...state.rawProduct, ...data } as Product,
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
      memory: {
        ...state.memory,
        lastParseTimestamp: Date.now(),
        productValidated: true,
      },
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    console.error("[v0] LangGraph: DataParserAgent error", error)

    return {
      errors: [...state.errors, `DataParserAgent: ${error instanceof Error ? error.message : "Unknown error"}`],
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
