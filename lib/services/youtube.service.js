import { BaseService } from "./base.service.js"

export class YouTubeService extends BaseService {
  constructor(options = {}) {
    super({
      name: "YouTubeService",
      baseURL: options.baseURL || "https://www.googleapis.com/youtube/v3",
      timeout: options.timeout || 20000,
      retries: options.retries ?? 2,
      apiKey: options.apiKey || "",
      ...options
    })
  }

  async download(videoId, options = {}) {
    return this.get(`${this.baseURL}/videos?id=${videoId}`, options)
  }
}
