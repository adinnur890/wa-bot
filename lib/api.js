import axios from "axios"

const DEFAULT_BASE_URL = process.env.NOVA_API_URL || process.env.API_URL || "http://localhost:3100/api/v1"
const DEFAULT_TIMEOUT = 60000

const isValidUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value)
const isDataUri = (value) => typeof value === "string" && /^data:(audio|video|image)\/[a-z0-9.+-]+;base64,/i.test(value)
const isBase64 = (value) => typeof value === "string" && /^[A-Za-z0-9+/=\s]+$/.test(value)

export class ApiClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || DEFAULT_BASE_URL
    this.client = axios.create({ baseURL: this.baseURL, timeout: options.timeout || DEFAULT_TIMEOUT })
  }

  async get(path, params = {}) {
    const response = await this.client.get(path, { params })
    return response.data
  }

  async play(query) {
    return this.get("/play", { q: query })
  }

  async ytmp3(url) {
    return this.get("/ytmp3", { url })
  }

  async fetchMedia(source) {
    if (!source) throw new Error("Media source is missing")
    if (Buffer.isBuffer(source)) return source

    const value = String(source).trim()
    if (!value) throw new Error("Media source is empty")

    if (isDataUri(value)) {
      const [, base64] = value.split(",", 2)
      return Buffer.from(base64 || "", "base64")
    }

    if (isValidUrl(value)) {
      const response = await axios.get(value, { responseType: "arraybuffer", timeout: DEFAULT_TIMEOUT })
      return Buffer.from(response.data)
    }

    if (value.length > 100 && isBase64(value)) {
      return Buffer.from(value.replace(/\s+/g, ""), "base64")
    }

    throw new Error("Unsupported media source")
  }
}

export const api = new ApiClient()
