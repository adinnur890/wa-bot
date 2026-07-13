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

  async getTrack(query, options = {}) {
    const accessToken = options.accessToken || this.apiKey || process.env.SPOTIFY_ACCESS_TOKEN || ""
    if (!accessToken) {
      throw new Error("Spotify access token is required")
    }

    const response = await this.get(`${this.baseURL}/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {})
      }
    })

    const track = response?.tracks?.items?.[0]
    if (!track) {
      throw new Error("Track not found")
    }

    return {
      title: track.name || "Unknown",
      artist: track.artists?.[0]?.name || "Unknown",
      duration: this.formatDuration(track.duration_ms),
      thumbnail: track.album?.images?.[0]?.url || "",
      downloadLink: track.external_urls?.spotify || ""
    }
  }

  formatDuration(durationMs) {
    const totalSeconds = Math.floor((Number(durationMs) || 0) / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, "0")}`
  }
}
