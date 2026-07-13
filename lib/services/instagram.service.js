import { BaseService } from "./base.service.js"

export class InstagramService extends BaseService {
  constructor(options = {}) {
    super({
      name: "InstagramService",
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
