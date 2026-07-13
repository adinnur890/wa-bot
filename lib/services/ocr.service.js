import { BaseService } from "./base.service.js"

export class OCRService extends BaseService {
  constructor(options = {}) {
    super({
      name: "OCRService",
      timeout: options.timeout || 20000,
      retries: options.retries ?? 2,
      apiKey: options.apiKey || "",
      ...options
    })
  }

  async extract(url, options = {}) {
    return this.post(url, options)
  }
}
