export interface Product {
  id: string
  name: string
  concentration: string
  skin_type: string[]
  key_ingredients: string[]
  benefits: string[]
  how_to_use: string
  side_effects: string
  price: string
}

export interface Question {
  id: string
  category: string
  question: string
  answer?: string
}

export interface AgentMetrics {
  tokensUsed: number
  executionTimeMs: number
  status: "success" | "error" | "skipped"
  errorMessage?: string
}

export interface FAQPage {
  title: string
  description: string
  faqs: Array<{
    category: string
    question: string
    answer: string
  }>
}

export interface ProductPage {
  title: string
  tagline: string
  description: string
  keyFeatures: Array<{
    title: string
    description: string
  }>
  ingredients: Array<{
    name: string
    benefit: string
  }>
  usage: {
    title: string
    steps: string[]
    tips: string[]
  }
  safety: {
    warnings: string[]
    sideEffects: string[]
  }
  pricing: {
    price: string
    valueProposition: string
  }
}

export interface ComparisonPage {
  title: string
  productA: {
    name: string
    concentration: string
    price: string
    ingredients: string[]
    benefits: string[]
    strengths: string[]
  }
  productB: {
    name: string
    concentration: string
    price: string
    ingredients: string[]
    benefits: string[]
    strengths: string[]
  }
  comparison: Array<{
    aspect: string
    productA: string
    productB: string
    winner: "A" | "B" | "Tie"
  }>
  recommendation: {
    bestFor: Record<string, "A" | "B">
    summary: string
  }
}
