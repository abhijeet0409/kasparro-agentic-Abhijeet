import { type AgentStateType, reduceState } from "./state"
import { dataParserNode } from "./agents/data-parser-node"
import { questionGeneratorNode } from "./agents/question-generator-node"
import { answerGeneratorNode } from "./agents/answer-generator-node"
import { faqTemplateNode } from "./agents/faq-template-node"
import { productTemplateNode } from "./agents/product-template-node"
import { comparisonTemplateNode } from "./agents/comparison-template-node"
import { persistenceNode } from "./agents/persistence-node"

/**
 * Custom LangGraph-inspired Graph Implementation
 * Implements StateGraph, conditional edges, and agent orchestration
 */

type NodeFunction = (state: AgentStateType) => Promise<Partial<AgentStateType>>
type ConditionalEdgeFunction = (state: AgentStateType) => string
type EdgeMap = Record<string, string>

class CustomStateGraph {
  private nodes: Map<string, NodeFunction> = new Map()
  private edges: Map<string, string> = new Map()
  private conditionalEdges: Map<string, { condition: ConditionalEdgeFunction; edgeMap: EdgeMap }> = new Map()
  private entryPoint: string | null = null

  addNode(name: string, fn: NodeFunction) {
    this.nodes.set(name, fn)
    console.log(`[v0] CustomStateGraph: Added node "${name}"`)
  }

  setEntryPoint(name: string) {
    this.entryPoint = name
    console.log(`[v0] CustomStateGraph: Set entry point to "${name}"`)
  }

  addEdge(from: string, to: string) {
    this.edges.set(from, to)
    console.log(`[v0] CustomStateGraph: Added edge "${from}" -> "${to}"`)
  }

  addConditionalEdges(from: string, condition: ConditionalEdgeFunction, edgeMap: EdgeMap) {
    this.conditionalEdges.set(from, { condition, edgeMap })
    console.log(`[v0] CustomStateGraph: Added conditional edges from "${from}"`, Object.keys(edgeMap))
  }

  compile() {
    console.log("[v0] CustomStateGraph: Compiling graph...")
    return {
      invoke: async (initialState: AgentStateType): Promise<AgentStateType> => {
        console.log("[v0] CustomStateGraph: Starting graph execution")
        let currentState = initialState
        let currentNode = this.entryPoint

        if (!currentNode) {
          throw new Error("No entry point set")
        }

        const visitedNodes: string[] = []
        let iterations = 0
        const maxIterations = 20 // Prevent infinite loops

        while (currentNode && currentNode !== "END" && iterations < maxIterations) {
          iterations++
          visitedNodes.push(currentNode)

          console.log(`[v0] CustomStateGraph: Executing node "${currentNode}" (iteration ${iterations})`)

          const nodeFn = this.nodes.get(currentNode)
          if (!nodeFn) {
            throw new Error(`Node "${currentNode}" not found`)
          }

          try {
            // Execute node and merge updates into state
            const updates = await nodeFn(currentState)
            currentState = reduceState(currentState, updates)

            console.log(`[v0] CustomStateGraph: Node "${currentNode}" completed successfully`)

            // Determine next node
            const conditionalEdge = this.conditionalEdges.get(currentNode)
            if (conditionalEdge) {
              const nextNodeKey = conditionalEdge.condition(currentState)
              currentNode = conditionalEdge.edgeMap[nextNodeKey] || nextNodeKey
              console.log(
                `[v0] CustomStateGraph: Conditional routing from "${visitedNodes[visitedNodes.length - 1]}" to "${currentNode}"`,
              )
            } else {
              currentNode = this.edges.get(currentNode) || "END"
              console.log(
                `[v0] CustomStateGraph: Direct edge from "${visitedNodes[visitedNodes.length - 1]}" to "${currentNode}"`,
              )
            }
          } catch (error) {
            console.error(`[v0] CustomStateGraph: Node "${currentNode}" failed:`, error)
            currentState = reduceState(currentState, {
              errors: [`Node "${currentNode}" failed: ${error instanceof Error ? error.message : "Unknown error"}`],
            })
            currentNode = "END"
          }
        }

        if (iterations >= maxIterations) {
          console.warn("[v0] CustomStateGraph: Max iterations reached, terminating")
          currentState = reduceState(currentState, {
            errors: ["Graph execution exceeded maximum iterations"],
          })
        }

        console.log("[v0] CustomStateGraph: Graph execution complete", {
          visitedNodes,
          iterations,
          finalNode: currentNode,
        })

        return currentState
      },
    }
  }
}

// Routing functions
function routeAfterDataParser(state: AgentStateType): "questionGenerator" | "END" {
  console.log("[v0] LangGraph: Routing after data parser", {
    hasParsedProduct: !!state.parsedProduct,
    errors: state.errors?.length || 0,
  })

  if ((state.errors?.length || 0) > 0 && (state.retryCount || 0) >= 3) {
    return "END"
  }

  if (!state.parsedProduct) {
    return "END"
  }

  return "questionGenerator"
}

function routeAfterAnswers(state: AgentStateType): "faqTemplate" | "END" {
  console.log("[v0] LangGraph: Routing after answers", {
    answersCount: state.answers?.length || 0,
    errors: state.errors?.length || 0,
  })

  if ((state.errors?.length || 0) > 0 && (state.retryCount || 0) >= 3) {
    return "END"
  }

  if ((state.answers?.length || 0) === 0) {
    return "END"
  }

  return "faqTemplate"
}

export function createContentGenerationGraph() {
  console.log("[v0] LangGraph: Creating custom StateGraph")

  const workflow = new CustomStateGraph()

  // Add all agent nodes
  workflow.addNode("dataParser", dataParserNode)
  workflow.addNode("questionGenerator", questionGeneratorNode)
  workflow.addNode("answerGenerator", answerGeneratorNode)
  workflow.addNode("faqTemplate", faqTemplateNode)
  workflow.addNode("productTemplate", productTemplateNode)
  workflow.addNode("comparisonTemplate", comparisonTemplateNode)
  workflow.addNode("persistence", persistenceNode)

  // Set entry point
  workflow.setEntryPoint("dataParser")

  // Add conditional edges
  workflow.addConditionalEdges("dataParser", routeAfterDataParser, {
    questionGenerator: "questionGenerator",
    END: "END",
  })

  workflow.addEdge("questionGenerator", "answerGenerator")

  workflow.addConditionalEdges("answerGenerator", routeAfterAnswers, {
    faqTemplate: "faqTemplate",
    END: "END",
  })

  // Sequential template generation
  workflow.addEdge("faqTemplate", "productTemplate")
  workflow.addEdge("productTemplate", "comparisonTemplate")
  workflow.addEdge("comparisonTemplate", "persistence")
  workflow.addEdge("persistence", "END")

  console.log("[v0] LangGraph: Graph creation complete, compiling...")
  return workflow.compile()
}
