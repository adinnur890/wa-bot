import { BaseService } from "./base.service.js"

export class GeminiService extends BaseService {
  constructor(options = {}) {
    super({
      name: "GeminiService",
      baseURL: options.baseURL || "https://generativelanguage.googleapis.com/v1beta",
      timeout: options.timeout || 20000,
      retries: options.retries ?? 2,
      apiKey: options.apiKey || "",
      ...options
    })
  }

  async chat(prompt, options = {}) {
    const url = `${this.baseURL}/models/gemini-pro:generateContent?key=${this.apiKey}`
    return this.post(url, {
      ...options,
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
  }
}
