import { BaseService } from "./base.service.js"

export class TikTokService extends BaseService {
  constructor(options = {}) {
    super({
      name: "TikTokService",
      timeout: options.timeout || 20000,
      retries: options.retries ?? 2,
      apiKey: options.apiKey || "",
      ...options
    })
  }

  async fetch(url, options = {}) {
    return this.get(url, options)
  }
}
