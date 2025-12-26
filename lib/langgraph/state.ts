import type { Product } from "./types"

/**
 * Custom LangGraph-inspired State Management
 * Implements state reducers and annotations without external dependencies
 */

export type AgentStateType = {
  // Execution metadata
  executionId: string
  generationId: string
  productId: string
  startTime: number

  // Product data
  rawProduct: Product | null
  parsedProduct: Product | null

  // Generated content (accumulated)
  questions: Array<{ id: string; category: string; question: string; answer?: string }>
  answers: Array<{ question: string; answer: string; category: string }>

  // Template outputs
  faqPage: Record<string, unknown> | null
  productPage: Record<string, unknown> | null
  comparisonPage: Record<string, unknown> | null
  competitorProduct: Product | null

  // Agent execution tracking
  agentLogs: Array<{
    agentName: string
    role: string
    tokensUsed: number
    executionTimeMs: number
    status: string
    errorMessage?: string
  }>

  // Error handling
  errors: string[]
  retryCount: number

  // Conditional routing
  shouldGenerateFAQ: boolean
  shouldGenerateProduct: boolean
  shouldGenerateComparison: boolean

  // Agent memory
  memory: Record<string, unknown>
}

/**
 * State Reducer - Merges new state updates with existing state
 * Implements array accumulation for questions, answers, agentLogs, and errors
 */
export function reduceState(existingState: AgentStateType, updates: Partial<AgentStateType>): AgentStateType {
  return {
    ...existingState,
    ...updates,
    // Array fields use accumulation (append) instead of replacement
    questions: [...existingState.questions, ...(updates.questions || [])],
    answers: [...existingState.answers, ...(updates.answers || [])],
    agentLogs: [...existingState.agentLogs, ...(updates.agentLogs || [])],
    errors: [...existingState.errors, ...(updates.errors || [])],
    // Memory uses object merge
    memory: { ...existingState.memory, ...(updates.memory || {}) },
  }
}

/**
 * Create initial state with default values
 */
export function createInitialState(executionId: string, productId: string, rawProduct: Product): AgentStateType {
  return {
    executionId,
    generationId: executionId, // Use same ID for simplicity
    productId,
    startTime: Date.now(),
    rawProduct,
    parsedProduct: null,
    questions: [],
    answers: [],
    faqPage: null,
    productPage: null,
    comparisonPage: null,
    competitorProduct: null,
    agentLogs: [],
    errors: [],
    retryCount: 0,
    shouldGenerateFAQ: true,
    shouldGenerateProduct: true,
    shouldGenerateComparison: true,
    memory: {},
  }
}
