# Multi-Agent Content Generation System with LangGraph

## Problem Statement
Build a modular, extensible multi-agent system that automatically generates structured content pages (FAQ, Product, Comparison) from product data using AI agents, state management, and template-based generation.

## Solution Overview
This system uses **LangGraph** for agent orchestration with proper state management, conditional routing, and agent memory. It features 7 specialized agents that collaborate through a state graph to generate machine-readable JSON outputs.

## System Architecture

### LangGraph State Management
The system uses LangGraph's `StateGraph` with a shared state object that flows through all agents:

```typescript
AgentState = {
  executionId, productId, startTime,
  rawProduct, parsedProduct,
  questions, answers,
  faqPage, productPage, comparisonPage, competitorProduct,
  agentLogs, errors, retryCount,
  shouldGenerateFAQ, shouldGenerateProduct, shouldGenerateComparison,
  memory
}
```

### Agent Nodes (7 Total)
1. **DataParserAgent** - Validates and normalizes product data
2. **QuestionGeneratorAgent** - Generates 15+ categorized questions
3. **AnswerGeneratorAgent** - Creates AI-powered answers
4. **FAQTemplateAgent** - Formats FAQ page structure
5. **ProductTemplateAgent** - Assembles product landing page
6. **ComparisonTemplateAgent** - Generates fictional competitor & comparison
7. **PersistenceAgent** - Saves all outputs to Supabase

### Graph Execution Flow
```
START → DataParser → QuestionGenerator → AnswerGenerator
                                             ↓
                                    [Parallel Execution]
                                             ↓
                   ┌─────────────────────────┼─────────────────────────┐
                   ↓                         ↓                         ↓
              FAQTemplate              ProductTemplate         ComparisonTemplate
                   └─────────────────────────┬─────────────────────────┘
                                             ↓
                                      Persistence
                                             ↓
                                           END
```

### Conditional Edges
- After DataParser: Routes to QuestionGenerator or ERROR based on validation
- After AnswerGenerator: Routes to templates or ERROR based on answer count
- Retry logic: Up to 3 retries for failed agents

### Agent Memory
Each agent stores execution metadata in state.memory:
- `lastParseTimestamp`, `productValidated`
- `questionsGenerated`, `questionCategories`
- `answersGenerated`, `avgAnswerLength`

### Technology Stack
- **Framework**: LangGraph (v0.2.31) - State-based agent orchestration
- **LLM**: Groq API (llama-3.3-70b-versatile, llama-3.1-8b-instant)
- **Database**: Supabase PostgreSQL with RLS
- **Frontend**: Next.js 16 + React 19
- **Type Safety**: TypeScript + Zod schemas

### Key Features
- ✅ Framework-based graph execution (LangGraph)
- ✅ Proper state management with shared memory
- ✅ Conditional routing and branching logic
- ✅ Parallel execution of template agents
- ✅ Agent memory and context persistence
- ✅ Retry mechanisms for error recovery
- ✅ Token tracking and performance metrics
- ✅ Machine-readable JSON outputs
- ✅ Real database persistence

### Extensibility
Adding new agents:
1. Create node function in `/lib/langgraph/agents/`
2. Add node to graph in `/lib/langgraph/graph.ts`
3. Define routing logic with conditional edges
4. Update state type if new fields needed

## Scopes & Assumptions
- Single product input (GlowBoost Vitamin C Serum)
- No external research (AI generates from product data only)
- 15+ questions generated across diverse categories
- Fictional competitor product (AI-generated, not real)
- JSON outputs stored in Supabase
- All agents log execution to database

## Output Examples
- `faq.json` - 5+ categorized Q&As with answers
- `product_page.json` - Complete landing page structure
- `comparison_page.json` - Product A vs B analysis
