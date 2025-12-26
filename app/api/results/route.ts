import { createClient } from "@/lib/supabase/server"

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      const isRateLimit = error?.message?.includes("Too Many") || error?.code === "429"
      const isLastAttempt = i === maxRetries - 1

      if (isRateLimit && !isLastAttempt) {
        const delay = baseDelay * Math.pow(2, i)
        console.log(`[v0] Rate limit hit, retrying in ${delay}ms (attempt ${i + 1}/${maxRetries})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }
  throw new Error("Max retries exceeded")
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId")
    const generationId = searchParams.get("generationId")

    if (!productId) {
      return Response.json({ error: "Product ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    if (generationId) {
      console.log("[v0] Fetching results for generation:", generationId)

      const pages = await retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from("generated_pages")
          .select("*")
          .eq("product_id", productId)
          .eq("generation_id", generationId)

        if (error) {
          console.error("[v0] Error fetching pages:", error)
          throw error
        }
        return data
      })

      const logs = await retryWithBackoff(async () => {
        const { data } = await supabase
          .from("agent_logs")
          .select("*")
          .eq("generation_id", generationId)
          .order("created_at", { ascending: true })
        return data || []
      })

      const questions = await retryWithBackoff(async () => {
        const { data } = await supabase.from("generated_questions").select("*").eq("generation_id", generationId)
        return data || []
      })

      console.log("[v0] Results fetched:", {
        pagesCount: pages?.length || 0,
        logsCount: logs?.length || 0,
        questionsCount: questions?.length || 0,
      })

      return Response.json({
        pages: pages || [],
        logs: logs || [],
        questions: questions || [],
      })
    }

    const generations = await retryWithBackoff(async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("generation_id, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data
    })

    // Group by generation_id and get the earliest timestamp for each
    const uniqueGenerations = Array.from(
      new Map(generations?.map((g) => [g.generation_id, g.created_at]) || []).entries(),
    ).map(([generation_id, created_at]) => ({
      generation_id,
      created_at,
    }))

    console.log("[v0] Available generations:", uniqueGenerations.length)

    return Response.json({
      generations: uniqueGenerations,
      hasHistory: uniqueGenerations.length > 0,
    })
  } catch (error) {
    console.error("[v0] Results API error:", error)
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        pages: [],
        logs: [],
        questions: [],
        generations: [],
        hasHistory: false,
      },
      { status: 200 },
    )
  }
}
