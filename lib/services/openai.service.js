import { BaseService } from "./base.service.js"

export class OpenAIService extends BaseService {
  constructor(options = {}) {
    super({
      name: "OpenAIService",
      baseURL: options.baseURL || "https://api.openai.com/v1",
      timeout: options.timeout || 20000,
      retries: options.retries ?? 2,
      apiKey: options.apiKey || "",
      ...options
    })
  }

  async chat(prompt, options = {}) {
    return this.post(`${this.baseURL}/chat/completions`, {
      ...options,
      body: JSON.stringify({
        model: options.model || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      })
    })
  }
}
