import { BaseService } from "./base.service.js"

export class SpotifyService extends BaseService {
  constructor(options = {}) {
    super({
      name: "SpotifyService",
      baseURL: options.baseURL || "https://api.spotify.com/v1",
      timeout: options.timeout || 15000,
      retries: options.retries ?? 2,
      apiKey: options.apiKey || "",
      ...options
    })
  }

  async search(query, options = {}) {
    const params = new URLSearchParams({ q: query, type: options.type || "track" })
    return this.get(`${this.baseURL}/search?${params.toString()}`, options)
  }
}
