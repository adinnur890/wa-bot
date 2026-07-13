import { BaseService } from "./base.service.js"

export class TranslateService extends BaseService {
  constructor(options = {}) {
    super({
      name: "TranslateService",
      timeout: options.timeout || 20000,
      retries: options.retries ?? 2,
      apiKey: options.apiKey || "",
      ...options
    })
  }

  async translate(text, options = {}) {
    return this.post(options.endpoint || "", {
      ...options,
      body: JSON.stringify({ q: text, ...options.bodyParams })
    })
  }
}
