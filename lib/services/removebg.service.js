import { BaseService } from "./base.service.js"

export class RemoveBgService extends BaseService {
  constructor(options = {}) {
    super({
      name: "RemoveBgService",
      timeout: options.timeout || 30000,
      retries: options.retries ?? 2,
      apiKey: options.apiKey || "",
      ...options
    })
  }

  async removeBackground(imageUrl, options = {}) {
    return this.post(options.endpoint || "", {
      ...options,
      body: JSON.stringify({ image_url: imageUrl, ...options.bodyParams })
    })
  }
}
