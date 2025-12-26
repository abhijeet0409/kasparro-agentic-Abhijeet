interface GroqResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function callGroq(
  messages: Array<{ role: string; content: string }>,
  model = "llama-3.3-70b-versatile",
  options: {
    temperature?: number
    max_tokens?: number
    response_format?: { type: string }
  } = {},
): Promise<{ content: string; tokensUsed: number }> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens,
          ...(options.response_format && { response_format: options.response_format }),
        }),
      })

      if (!response.ok) {
        let errorMessage: string
        const contentType = response.headers.get("content-type")

        if (contentType && contentType.includes("application/json")) {
          try {
            const error = await response.json()
            errorMessage = error.error?.message || JSON.stringify(error)
          } catch {
            errorMessage = await response.text()
          }
        } else {
          errorMessage = await response.text()
        }

        if (response.status === 429 && attempt < 3) {
          console.log(`[v0] Rate limited, retrying in ${attempt * 2}s...`)
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000))
          continue
        }

        throw new Error(`Groq API error (${response.status}): ${errorMessage}`)
      }

      let data: GroqResponse
      try {
        data = await response.json()
      } catch (parseError) {
        const text = await response.text()
        throw new Error(`Failed to parse Groq response as JSON. Response: ${text.substring(0, 200)}`)
      }

      if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error(`Invalid Groq response structure: ${JSON.stringify(data).substring(0, 200)}`)
      }

      if (!data.choices[0].message || !data.choices[0].message.content) {
        throw new Error(`Missing content in Groq response: ${JSON.stringify(data).substring(0, 200)}`)
      }

      if (!data.usage || typeof data.usage.total_tokens !== "number") {
        console.warn("[v0] Missing usage data in Groq response, defaulting to 0 tokens")
        data.usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      }

      return {
        content: data.choices[0].message.content,
        tokensUsed: data.usage.total_tokens,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt === 3) break
      console.log(`[v0] Attempt ${attempt} failed, retrying...`)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  throw lastError || new Error("Failed after 3 attempts")
}

export async function callGroqJSON<T>(
  prompt: string,
  model = "llama-3.3-70b-versatile",
): Promise<{ data: T; tokensUsed: number }> {
  const { content, tokensUsed } = await callGroq(
    [
      {
        role: "system",
        content: "You are a helpful assistant. Always respond with valid JSON only, no other text.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model,
    {
      response_format: { type: "json_object" },
      temperature: 0.7,
    },
  )

  try {
    const data = JSON.parse(content) as T
    return { data, tokensUsed }
  } catch (parseError) {
    throw new Error(`Failed to parse LLM response as JSON. Content: ${content.substring(0, 200)}`)
  }
}
